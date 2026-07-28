import { Request, Response } from "express";
import prisma from "../../config/prisma.js";
import {
  applyAPUComposition,
  writeAPUComposition,
  finalizeAPUCost,
  calcMaterialSubtotal,
  APUCompositionError,
  type APUCompositionMaterial,
} from "../../services/apu.service.js";
import { normalizeName } from "../../utils/text.js";
import type { Prisma } from "../../generated/prisma/client.js";
import type { MeasurementUnit } from "../../generated/prisma/enums.js";
import type {
  ApplyAPUTemplateInput,
  ManualAPUInput,
  UpdateAPUTemplateInput,
} from "./apu-templates.schema.js";

function routeParam(req: Request, key: string): string {
  const v = req.params[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return String(v[0]);
  return String(v);
}

/** Devuelve la partida con los Decimal ya convertidos a number. */
async function serializeBudgetItem(budgetItemId: string) {
  const item = await prisma.budgetItem.findUnique({ where: { id: budgetItemId } });
  if (!item) return null;
  return {
    ...item,
    quantity: Number(item.quantity),
    costUnitPrice: Number(item.costUnitPrice),
    saleUnitPrice: Number(item.saleUnitPrice),
    costSubtotal: Number(item.costSubtotal),
    saleSubtotal: Number(item.saleSubtotal),
  };
}

/** GET /api/apu-templates — lista plantillas con filtros opcionales por rubro/search */
export async function listAPUTemplates(req: Request, res: Response) {
  const { search, rubro, isActive } = req.query;

  const where: any = {};
  if (rubro && typeof rubro === "string") where.rubro = rubro;
  if (isActive !== undefined) where.isActive = isActive === "true";
  if (search && typeof search === "string") {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { rubro: { contains: search, mode: "insensitive" } },
    ];
  }

  const templates = await prisma.aPUTemplate.findMany({
    where,
    orderBy: [{ rubro: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { materials: true, labor: true } },
    },
  });

  res.json(
    templates.map((t) => ({
      id: t.id,
      rubro: t.rubro,
      name: t.name,
      unit: t.unit,
      description: t.description,
      isActive: t.isActive,
      materialsCount: t._count.materials,
      laborCount: t._count.labor,
    }))
  );
}

/** GET /api/apu-templates/rubros — lista de rubros únicos con conteo */
export async function listAPURubros(_req: Request, res: Response) {
  const grouped = await prisma.aPUTemplate.groupBy({
    by: ["rubro"],
    _count: { rubro: true },
    where: { isActive: true },
    orderBy: { rubro: "asc" },
  });
  res.json(grouped.map((g) => ({ rubro: g.rubro, count: g._count.rubro })));
}

/**
 * Detalle de una plantilla con precios vigentes del catálogo y totales.
 * Devuelve null si no existe.
 */
async function serializeTemplateDetail(id: string) {
  const t = await prisma.aPUTemplate.findUnique({
    where: { id },
    include: {
      materials: {
        include: { material: true },
        orderBy: { createdAt: "asc" },
      },
      labor: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!t) return null;

  const materials = t.materials.map((m) => {
    const cons = Number(m.consumptionPerUnit);
    const waste = Number(m.wastePercent);
    const unitCost =
      Number(m.material.unitPrice) / (Number(m.material.presentationQty) || 1);
    return {
      id: m.id,
      materialId: m.materialId,
      material: {
        id: m.material.id,
        name: m.material.name,
        unit: m.material.unit,
        unitPrice: Number(m.material.unitPrice),
        presentationQty: Number(m.material.presentationQty),
        category: m.material.category,
      },
      consumptionPerUnit: cons,
      wastePercent: waste,
      unitCost: Math.round(unitCost * 100) / 100,
      subtotal: calcMaterialSubtotal(cons, waste, unitCost),
    };
  });
  const labor = t.labor.map((l) => ({
    id: l.id,
    description: l.description,
    costPerUnit: Number(l.costPerUnit),
  }));

  const totalMaterials = Math.round(materials.reduce((s, m) => s + m.subtotal, 0) * 100) / 100;
  const totalLabor = Math.round(labor.reduce((s, l) => s + l.costPerUnit, 0) * 100) / 100;

  return {
    id: t.id,
    rubro: t.rubro,
    name: t.name,
    unit: t.unit,
    description: t.description,
    isActive: t.isActive,
    materials,
    labor,
    totalMaterials,
    totalLabor,
    totalCost: Math.round((totalMaterials + totalLabor) * 100) / 100,
  };
}

/** GET /api/apu-templates/:id — detalle con materiales y mano de obra */
export async function getAPUTemplate(req: Request, res: Response) {
  const detail = await serializeTemplateDetail(routeParam(req, "id"));
  if (!detail) {
    res.status(404).json({ error: "Plantilla no encontrada" });
    return;
  }
  res.json(detail);
}

/**
 * Proyecto (y unidad) de destino de una composición, según venga apuntada a
 * una partida existente o a una categoría.
 */
async function resolveTarget(target: {
  budgetItemId?: string;
  categoryId?: string;
}): Promise<{ projectId: string; unit: MeasurementUnit }> {
  if (target.budgetItemId) {
    const item = await prisma.budgetItem.findUnique({
      where: { id: target.budgetItemId },
      select: { unit: true, category: { select: { projectId: true } } },
    });
    if (!item) throw new APUCompositionError(404, "Partida destino no encontrada");
    return { projectId: item.category.projectId, unit: item.unit };
  }
  const category = await prisma.category.findUnique({
    where: { id: target.categoryId! },
    select: { projectId: true },
  });
  if (!category) throw new APUCompositionError(404, "Categoría no encontrada");
  return { projectId: category.projectId, unit: "M2" };
}

/** Verifica que el usuario sea miembro del proyecto antes de tocar su presupuesto. */
async function assertMember(userId: string, projectId: string): Promise<void> {
  const member = await prisma.projectMember.findFirst({
    where: { userId, projectId },
    select: { id: true },
  });
  if (!member) throw new APUCompositionError(403, "Sin acceso a este proyecto");
}

/** Traduce los errores de negocio de la composición a la respuesta HTTP. */
function handleCompositionError(e: unknown, res: Response): void {
  if (e instanceof APUCompositionError) {
    res.status(e.status).json({ error: e.message });
    return;
  }
  throw e;
}

/** POST /api/apu-templates/:id/apply — crea/actualiza un BudgetItem desde la plantilla */
export async function applyAPUTemplate(req: Request, res: Response) {
  const id = routeParam(req, "id");
  const body = req.body as ApplyAPUTemplateInput;

  const template = await prisma.aPUTemplate.findUnique({
    where: { id },
    include: { materials: true, labor: true },
  });
  if (!template) {
    res.status(404).json({ error: "Plantilla no encontrada" });
    return;
  }

  try {
    const { projectId } = await resolveTarget(body);
    await assertMember(req.user!.userId, projectId);

    const result = await applyAPUComposition({
      budgetItemId: body.budgetItemId,
      categoryId: body.categoryId,
      name: body.name ?? template.name,
      unit: template.unit,
      quantity: body.quantity,
      materials: template.materials.map((m) => ({
        materialId: m.materialId,
        consumptionPerUnit: Number(m.consumptionPerUnit),
        wastePercent: Number(m.wastePercent),
      })),
      labor: template.labor.map((l) => ({
        description: l.description,
        costPerUnit: Number(l.costPerUnit),
      })),
      replaceExisting: body.replaceExisting,
      // Si la partida ya tiene línea para el material, se preserva la cargada.
      onDuplicateMaterial: "skip",
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        projectId: result.projectId,
        action: "APPLY_APU_TEMPLATE",
        entityType: "BudgetItem",
        entityId: result.budgetItemId,
        metadata: { templateId: id, templateName: template.name },
      },
    });

    res.status(201).json({
      budgetItemId: result.budgetItemId,
      item: await serializeBudgetItem(result.budgetItemId),
    });
  } catch (e) {
    handleCompositionError(e, res);
  }
}

/**
 * POST /api/apu-templates/manual — carga manual de un subrubro completo
 * (materiales + mano de obra) sobre una categoría o una partida existente,
 * sin usar una plantilla del catálogo. Con `saveAsTemplate` la composición
 * queda además guardada como plantilla reutilizable.
 */
export async function createManualAPU(req: Request, res: Response) {
  const body = req.body as ManualAPUInput;
  const name = body.name.trim();

  try {
    // 1. Proyecto destino + permisos
    const target = await resolveTarget(body);
    const unit = body.budgetItemId ? target.unit : (body.unit ?? "M2");
    await assertMember(req.user!.userId, target.projectId);

    // 2. Todo en una sola transacción: alta de materiales nuevos, plantilla
    //    opcional y líneas del APU. Si algo falla, no queda nada a medio crear.
    const { composition, templateId, createdMaterialIds, reactivatedMaterialIds } =
      await prisma.$transaction(async (tx) => {
        const resolvedMaterials = await resolveManualMaterials(tx, body.materials);

        const templateId = body.saveAsTemplate
          ? await createTemplateFromComposition(tx, {
              rubro: body.rubro!.trim(),
              name,
              unit,
              description: body.description ?? null,
              materials: resolvedMaterials.lines,
              labor: body.labor,
            })
          : null;

        const composition = await writeAPUComposition(tx, {
          budgetItemId: body.budgetItemId,
          categoryId: body.categoryId,
          name,
          unit,
          quantity: body.quantity,
          description: body.description ?? null,
          materials: resolvedMaterials.lines,
          labor: body.labor,
          replaceExisting: body.replaceExisting,
          // Carga manual: los valores tipeados por el usuario mandan sobre lo existente.
          onDuplicateMaterial: "update",
        });

        return {
          composition,
          templateId,
          createdMaterialIds: resolvedMaterials.createdMaterialIds,
          reactivatedMaterialIds: resolvedMaterials.reactivatedMaterialIds,
        };
      });

    // 3. Recalcular costos ya con la composición confirmada
    await finalizeAPUCost(composition.budgetItemId);

    await prisma.activityLog.create({
      data: {
        userId: req.user!.userId,
        projectId: composition.projectId,
        action: "CREATE_MANUAL_APU",
        entityType: "BudgetItem",
        entityId: composition.budgetItemId,
        metadata: {
          name,
          materials: body.materials.length,
          labor: body.labor.length,
          createdMaterials: createdMaterialIds.length,
          reactivatedMaterials: reactivatedMaterialIds.length,
          savedAsTemplate: !!templateId,
          templateId,
        },
      },
    });

    res.status(201).json({
      budgetItemId: composition.budgetItemId,
      templateId,
      createdMaterialIds,
      reactivatedMaterialIds,
      item: await serializeBudgetItem(composition.budgetItemId),
    });
  } catch (e) {
    handleCompositionError(e, res);
  }
}

/** Violación de índice único de Prisma. */
function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";
}

/**
 * Resuelve las líneas de material de una carga manual dentro de la transacción:
 * reusa el material del catálogo cuando el nombre ya existe (sin distinguir
 * mayúsculas ni acentos), crea los que faltan y reactiva los desactivados.
 */
async function resolveManualMaterials(
  tx: Prisma.TransactionClient,
  lines: ManualAPUInput["materials"]
): Promise<{
  lines: APUCompositionMaterial[];
  createdMaterialIds: string[];
  reactivatedMaterialIds: string[];
}> {
  if (lines.length === 0) {
    return { lines: [], createdMaterialIds: [], reactivatedMaterialIds: [] };
  }

  // Catálogo completo (incluye inactivos): así un nombre que ya existe pero
  // está desactivado reusa ese material en lugar de crear un duplicado.
  const catalog = await tx.material.findMany({
    select: { id: true, name: true, isActive: true },
  });
  const byId = new Map(catalog.map((m) => [m.id, m]));
  const byName = new Map(catalog.map((m) => [normalizeName(m.name), m]));

  const resolved: APUCompositionMaterial[] = [];
  const createdMaterialIds: string[] = [];
  const toReactivate = new Set<string>();

  for (const line of lines) {
    let materialId: string;

    if (line.materialId) {
      const existing = byId.get(line.materialId);
      if (!existing) {
        throw new APUCompositionError(
          400,
          `Material inexistente en el catálogo: ${line.materialId}`
        );
      }
      materialId = existing.id;
      if (!existing.isActive) toReactivate.add(existing.id);
    } else {
      const draft = line.newMaterial!;
      const existing = byName.get(normalizeName(draft.name));
      if (existing) {
        materialId = existing.id;
        if (!existing.isActive) toReactivate.add(existing.id);
      } else {
        const created = await tx.material.create({
          data: {
            // Se guarda con espacios colapsados: el catálogo es global y los
            // nombres se comparan normalizados.
            name: draft.name.replace(/\s+/g, " ").trim(),
            unit: draft.unit,
            unitPrice: draft.unitPrice,
            presentationQty: draft.presentationQty,
            category: draft.category,
          },
          select: { id: true, name: true, isActive: true },
        });
        byId.set(created.id, created);
        byName.set(normalizeName(created.name), created);
        materialId = created.id;
        createdMaterialIds.push(created.id);
      }
    }

    resolved.push({
      materialId,
      consumptionPerUnit: line.consumptionPerUnit,
      wastePercent: line.wastePercent,
    });
  }

  // Un nombre "nuevo" puede terminar apuntando al mismo material que otra fila
  const ids = resolved.map((l) => l.materialId);
  if (new Set(ids).size !== ids.length) {
    throw new APUCompositionError(400, "Hay materiales repetidos en la composición");
  }

  if (toReactivate.size > 0) {
    await tx.material.updateMany({
      where: { id: { in: [...toReactivate] } },
      data: { isActive: true },
    });
  }

  return { lines: resolved, createdMaterialIds, reactivatedMaterialIds: [...toReactivate] };
}

/** Guarda la composición como plantilla APU reutilizable. */
async function createTemplateFromComposition(
  tx: Prisma.TransactionClient,
  data: {
    rubro: string;
    name: string;
    unit: MeasurementUnit;
    description: string | null;
    materials: APUCompositionMaterial[];
    labor: { description: string; costPerUnit: number }[];
  }
): Promise<string> {
  const maxSort = await tx.aPUTemplate.aggregate({
    where: { rubro: data.rubro },
    _max: { sortOrder: true },
  });

  try {
    const template = await tx.aPUTemplate.create({
      data: {
        rubro: data.rubro,
        name: data.name,
        unit: data.unit,
        description: data.description,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
        materials: {
          create: data.materials.map((m) => ({
            materialId: m.materialId,
            consumptionPerUnit: m.consumptionPerUnit,
            wastePercent: m.wastePercent ?? 0,
          })),
        },
        labor: {
          create: data.labor.map((l) => ({
            description: l.description,
            costPerUnit: l.costPerUnit ?? 0,
          })),
        },
      },
      select: { id: true },
    });
    return template.id;
  } catch (e) {
    // @@unique([rubro, name]): ya existía, o se guardó lo mismo en paralelo
    if (isUniqueViolation(e)) {
      throw new APUCompositionError(
        409,
        `Ya existe una plantilla «${data.name}» en el rubro «${data.rubro}». Cambiá el nombre o desmarcá "Guardar como plantilla".`
      );
    }
    throw e;
  }
}

/**
 * PATCH /api/apu-templates/:id — corrige una plantilla del catálogo: datos
 * (rubro, nombre, unidad, descripción), estado activo y, si vienen, reemplaza
 * la composición de materiales y/o mano de obra.
 *
 * No toca los presupuestos: las partidas ya creadas conservan sus líneas APU
 * (la plantilla es un molde, no una referencia viva).
 */
export async function updateAPUTemplate(req: Request, res: Response) {
  const id = routeParam(req, "id");
  const body = req.body as UpdateAPUTemplateInput;

  const existing = await prisma.aPUTemplate.findUnique({
    where: { id },
    select: { id: true, rubro: true, name: true },
  });
  if (!existing) {
    res.status(404).json({ error: "Plantilla no encontrada" });
    return;
  }

  // Los materiales referenciados tienen que existir
  if (body.materials && body.materials.length > 0) {
    const ids = [...new Set(body.materials.map((m) => m.materialId))];
    const encontrados = await prisma.material.count({ where: { id: { in: ids } } });
    if (encontrados !== ids.length) {
      res.status(400).json({ error: "La plantilla referencia materiales que no existen" });
      return;
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.aPUTemplate.update({
        where: { id },
        data: {
          ...(body.rubro !== undefined ? { rubro: body.rubro.trim() } : {}),
          ...(body.name !== undefined ? { name: body.name.trim() } : {}),
          ...(body.unit !== undefined ? { unit: body.unit } : {}),
          ...(body.description !== undefined ? { description: body.description } : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        },
      });

      if (body.materials) {
        await tx.aPUTemplateMaterial.deleteMany({ where: { templateId: id } });
        if (body.materials.length > 0) {
          await tx.aPUTemplateMaterial.createMany({
            data: body.materials.map((m) => ({
              templateId: id,
              materialId: m.materialId,
              consumptionPerUnit: m.consumptionPerUnit,
              wastePercent: m.wastePercent,
            })),
          });
        }
      }

      if (body.labor) {
        await tx.aPUTemplateLabor.deleteMany({ where: { templateId: id } });
        if (body.labor.length > 0) {
          await tx.aPUTemplateLabor.createMany({
            data: body.labor.map((l) => ({
              templateId: id,
              description: l.description,
              costPerUnit: l.costPerUnit,
            })),
          });
        }
      }
    });
  } catch (e) {
    if (isUniqueViolation(e)) {
      const rubro = body.rubro?.trim() ?? existing.rubro;
      const name = body.name?.trim() ?? existing.name;
      res.status(409).json({
        error: `Ya existe otra plantilla «${name}» en el rubro «${rubro}».`,
      });
      return;
    }
    throw e;
  }

  await prisma.activityLog.create({
    data: {
      userId: req.user!.userId,
      action: body.isActive === false ? "DEACTIVATE_APU_TEMPLATE" : "UPDATE_APU_TEMPLATE",
      entityType: "APUTemplate",
      entityId: id,
      metadata: {
        cambios: Object.keys(body),
        materiales: body.materials?.length,
        manoDeObra: body.labor?.length,
      },
    },
  });

  res.json(await serializeTemplateDetail(id));
}

/**
 * DELETE /api/apu-templates/:id — elimina una plantilla del catálogo.
 *
 * Es seguro: las partidas copian las líneas al aplicarse, así que ningún
 * presupuesto queda apuntando a la plantilla. Las líneas de la plantilla se
 * borran en cascada.
 */
export async function deleteAPUTemplate(req: Request, res: Response) {
  const id = routeParam(req, "id");

  const existing = await prisma.aPUTemplate.findUnique({
    where: { id },
    select: { rubro: true, name: true },
  });
  if (!existing) {
    res.status(404).json({ error: "Plantilla no encontrada" });
    return;
  }

  await prisma.aPUTemplate.delete({ where: { id } });

  await prisma.activityLog.create({
    data: {
      userId: req.user!.userId,
      action: "DELETE_APU_TEMPLATE",
      entityType: "APUTemplate",
      entityId: id,
      metadata: { rubro: existing.rubro, name: existing.name },
    },
  });

  res.status(204).end();
}
