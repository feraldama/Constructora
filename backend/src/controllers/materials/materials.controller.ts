import { Request, Response } from "express";
import prisma from "../../config/prisma.js";
import { propagateMaterialPriceChange } from "../../services/apu.service.js";
import { normalizeName } from "../../utils/text.js";
import type { CreateMaterialInput, UpdateMaterialInput } from "./materials.schema.js";
import type { MaterialCategory } from "../../generated/prisma/enums.js";

function routeParam(req: Request, key: string): string {
  const v = req.params[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return String(v[0]);
  return String(v);
}

function serializeMaterial(m: any) {
  return {
    ...m,
    unitPrice: Number(m.unitPrice),
    presentationQty: Number(m.presentationQty),
  };
}

/** GET /api/materials */
export async function listMaterials(req: Request, res: Response) {
  const { search, category, isActive } = req.query;

  const where: any = {};
  if (search && typeof search === "string") {
    where.name = { contains: search, mode: "insensitive" };
  }
  if (category && typeof category === "string") {
    where.category = category as MaterialCategory;
  }
  if (isActive !== undefined) {
    where.isActive = isActive === "true";
  }

  const materials = await prisma.material.findMany({
    where,
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  res.json(materials.map(serializeMaterial));
}

/** GET /api/materials/:id */
export async function getMaterial(req: Request, res: Response) {
  const id = routeParam(req, "id");
  const material = await prisma.material.findUnique({ where: { id } });
  if (!material) {
    res.status(404).json({ error: "Material no encontrado" });
    return;
  }
  res.json(serializeMaterial(material));
}

/**
 * Busca un material con el mismo nombre normalizado (sin distinguir mayúsculas,
 * acentos ni espacios de más). El catálogo es global y alimenta todos los APU:
 * los duplicados por diferencias de tipeo terminan en dos precios distintos
 * para el mismo insumo.
 */
async function findByNormalizedName(
  name: string,
  excludeId?: string
): Promise<{ id: string; name: string; isActive: boolean } | null> {
  const target = normalizeName(name);
  const candidates = await prisma.material.findMany({
    select: { id: true, name: true, isActive: true },
  });
  return (
    candidates.find((m) => m.id !== excludeId && normalizeName(m.name) === target) ?? null
  );
}

/** POST /api/materials */
export async function createMaterial(req: Request, res: Response) {
  const { allowDuplicateName, ...body } = req.body as CreateMaterialInput;

  const duplicated = await findByNormalizedName(body.name);
  if (duplicated && !allowDuplicateName) {
    res.status(409).json({
      error: `Ya existe el material «${duplicated.name}»${duplicated.isActive ? "" : " (desactivado)"} en el catálogo. Usá ese, o confirmá para crear otro con el mismo nombre.`,
      duplicateMaterialId: duplicated.id,
      duplicateMaterialName: duplicated.name,
    });
    return;
  }

  const material = await prisma.material.create({
    data: {
      name: body.name.replace(/\s+/g, " ").trim(),
      unit: body.unit,
      unitPrice: body.unitPrice,
      presentationQty: body.presentationQty,
      category: body.category,
      brand: body.brand,
      supplier: body.supplier,
      notes: body.notes,
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: req.user!.userId,
      action: "CREATE_MATERIAL",
      entityType: "Material",
      entityId: material.id,
      metadata: { name: body.name, category: body.category },
    },
  });

  res.status(201).json(serializeMaterial(material));
}

/** PATCH /api/materials/:id */
export async function updateMaterial(req: Request, res: Response) {
  const id = routeParam(req, "id");
  const { allowDuplicateName, ...body } = req.body as UpdateMaterialInput;

  const existing = await prisma.material.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: "Material no encontrado" });
    return;
  }

  // Renombrar hacia un nombre que ya usa otro material del catálogo
  if (body.name !== undefined && normalizeName(body.name) !== normalizeName(existing.name)) {
    const duplicated = await findByNormalizedName(body.name, id);
    if (duplicated && !allowDuplicateName) {
      res.status(409).json({
        error: `Ya existe el material «${duplicated.name}»${duplicated.isActive ? "" : " (desactivado)"} en el catálogo. Cambiá el nombre, o confirmá para tener dos con el mismo.`,
        duplicateMaterialId: duplicated.id,
        duplicateMaterialName: duplicated.name,
      });
      return;
    }
  }

  const material = await prisma.material.update({
    where: { id },
    data: {
      ...body,
      ...(body.name !== undefined ? { name: body.name.replace(/\s+/g, " ").trim() } : {}),
    },
  });

  // Si cambió el precio o la presentación, propagar a los APUs que usan
  // este material para mantener consistencia con BudgetItem.costUnitPrice.
  const priceChanged =
    body.unitPrice !== undefined &&
    Number(body.unitPrice) !== Number(existing.unitPrice);
  const presentationChanged =
    body.presentationQty !== undefined &&
    Number(body.presentationQty) !== Number(existing.presentationQty);
  if (priceChanged || presentationChanged) {
    await propagateMaterialPriceChange(id);
  }

  await prisma.activityLog.create({
    data: {
      userId: req.user!.userId,
      action: "UPDATE_MATERIAL",
      entityType: "Material",
      entityId: id,
      metadata: { changes: body },
    },
  });

  res.json(serializeMaterial(material));
}

/** DELETE /api/materials/:id */
export async function deleteMaterial(req: Request, res: Response) {
  const id = routeParam(req, "id");

  const existing = await prisma.material.findUnique({
    where: { id },
    include: { _count: { select: { budgetItemMaterials: true } } },
  });
  if (!existing) {
    res.status(404).json({ error: "Material no encontrado" });
    return;
  }

  if (existing._count.budgetItemMaterials > 0) {
    // Soft-delete: marcar como inactivo
    await prisma.material.update({
      where: { id },
      data: { isActive: false },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        action: "DEACTIVATE_MATERIAL",
        entityType: "Material",
        entityId: id,
        metadata: { name: existing.name, reason: "En uso en APU" },
      },
    });

    res.json({ message: "Material desactivado (en uso en análisis de precios)" });
    return;
  }

  await prisma.material.delete({ where: { id } });

  await prisma.activityLog.create({
    data: {
      userId: req.user!.userId,
      action: "DELETE_MATERIAL",
      entityType: "Material",
      entityId: id,
      metadata: { name: existing.name },
    },
  });

  res.status(204).end();
}
