import { Request, Response } from "express";
import prisma from "../../config/prisma.js";
import { recalcAPU, refreshMaterialPrices, calcMaterialSubtotal } from "../../services/apu.service.js";
import type {
  AddAPUMaterialInput,
  UpdateAPUMaterialInput,
  AddAPULaborInput,
  UpdateAPULaborInput,
} from "./apu.schema.js";

function routeParam(req: Request, key: string): string {
  const v = req.params[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return String(v[0]);
  return String(v);
}

/** Verificar que el budgetItem existe y devolver el projectId */
async function getItemProjectId(itemId: string, res: Response): Promise<string | null> {
  const item = await prisma.budgetItem.findUnique({
    where: { id: itemId },
    include: { category: { select: { projectId: true } } },
  });
  if (!item) {
    res.status(404).json({ error: "Partida no encontrada" });
    return null;
  }
  return item.category.projectId;
}

/** GET /api/budget-items/:itemId/apu */
export async function getAPU(req: Request, res: Response) {
  const itemId = routeParam(req, "itemId");

  const item = await prisma.budgetItem.findUnique({ where: { id: itemId } });
  if (!item) {
    res.status(404).json({ error: "Partida no encontrada" });
    return;
  }

  const [materials, labor] = await Promise.all([
    prisma.budgetItemMaterial.findMany({
      where: { budgetItemId: itemId },
      include: { material: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.budgetItemLabor.findMany({
      where: { budgetItemId: itemId },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const totalMaterials = materials.reduce((s, m) => s + Number(m.subtotal), 0);
  const totalLabor = labor.reduce((s, l) => s + Number(l.costPerUnit), 0);

  res.json({
    materials: materials.map((m) => ({
      ...m,
      consumptionPerUnit: Number(m.consumptionPerUnit),
      wastePercent: Number(m.wastePercent),
      unitCost: Number(m.unitCost),
      subtotal: Number(m.subtotal),
      material: {
        ...m.material,
        unitPrice: Number(m.material.unitPrice),
        presentationQty: Number(m.material.presentationQty),
      },
    })),
    labor: labor.map((l) => ({
      ...l,
      costPerUnit: Number(l.costPerUnit),
    })),
    totalMaterials: Math.round(totalMaterials * 100) / 100,
    totalLabor: Math.round(totalLabor * 100) / 100,
    totalCost: Math.round((totalMaterials + totalLabor) * 100) / 100,
  });
}

/** POST /api/budget-items/:itemId/apu/materials */
export async function addAPUMaterial(req: Request, res: Response) {
  const itemId = routeParam(req, "itemId");
  const body = req.body as AddAPUMaterialInput;

  const projectId = await getItemProjectId(itemId, res);
  if (!projectId) return;

  // Obtener precio actual del material
  const material = await prisma.material.findUnique({ where: { id: body.materialId } });
  if (!material) {
    res.status(404).json({ error: "Material no encontrado" });
    return;
  }

  const unitCost = Number(material.unitPrice) / (Number(material.presentationQty) || 1);
  const subtotal = calcMaterialSubtotal(body.consumptionPerUnit, body.wastePercent ?? 0, unitCost);

  const line = await prisma.budgetItemMaterial.create({
    data: {
      budgetItemId: itemId,
      materialId: body.materialId,
      consumptionPerUnit: body.consumptionPerUnit,
      wastePercent: body.wastePercent ?? 0,
      unitCost,
      subtotal,
    },
    include: { material: true },
  });

  await prisma.activityLog.create({
    data: {
      userId: req.user!.userId,
      projectId,
      action: "ADD_APU_MATERIAL",
      entityType: "BudgetItemMaterial",
      entityId: line.id,
      metadata: { budgetItemId: itemId, materialName: material.name },
    },
  });

  await recalcAPU(itemId);

  res.status(201).json({
    ...line,
    consumptionPerUnit: Number(line.consumptionPerUnit),
    wastePercent: Number(line.wastePercent),
    unitCost: Number(line.unitCost),
    subtotal: Number(line.subtotal),
    material: { ...line.material, unitPrice: Number(line.material.unitPrice), presentationQty: Number(line.material.presentationQty) },
  });
}

/** PATCH /api/budget-items/:itemId/apu/materials/:apuMaterialId */
export async function updateAPUMaterial(req: Request, res: Response) {
  const itemId = routeParam(req, "itemId");
  const apuMaterialId = routeParam(req, "apuMaterialId");
  const body = req.body as UpdateAPUMaterialInput;

  const existing = await prisma.budgetItemMaterial.findUnique({
    where: { id: apuMaterialId },
  });
  if (!existing || existing.budgetItemId !== itemId) {
    res.status(404).json({ error: "Línea APU no encontrada" });
    return;
  }

  const consumption = body.consumptionPerUnit ?? Number(existing.consumptionPerUnit);
  const waste = body.wastePercent ?? Number(existing.wastePercent);
  const unitCost = Number(existing.unitCost);
  const subtotal = calcMaterialSubtotal(consumption, waste, unitCost);

  const updated = await prisma.budgetItemMaterial.update({
    where: { id: apuMaterialId },
    data: {
      consumptionPerUnit: body.consumptionPerUnit,
      wastePercent: body.wastePercent,
      subtotal,
    },
    include: { material: true },
  });

  await recalcAPU(itemId);

  res.json({
    ...updated,
    consumptionPerUnit: Number(updated.consumptionPerUnit),
    wastePercent: Number(updated.wastePercent),
    unitCost: Number(updated.unitCost),
    subtotal: Number(updated.subtotal),
    material: { ...updated.material, unitPrice: Number(updated.material.unitPrice), presentationQty: Number(updated.material.presentationQty) },
  });
}

/** DELETE /api/budget-items/:itemId/apu/materials/:apuMaterialId */
export async function deleteAPUMaterial(req: Request, res: Response) {
  const itemId = routeParam(req, "itemId");
  const apuMaterialId = routeParam(req, "apuMaterialId");

  const existing = await prisma.budgetItemMaterial.findUnique({
    where: { id: apuMaterialId },
    include: { material: { select: { name: true } } },
  });
  if (!existing || existing.budgetItemId !== itemId) {
    res.status(404).json({ error: "Línea APU no encontrada" });
    return;
  }

  const projectId = await getItemProjectId(itemId, res);
  if (!projectId) return;

  await prisma.budgetItemMaterial.delete({ where: { id: apuMaterialId } });

  await prisma.activityLog.create({
    data: {
      userId: req.user!.userId,
      projectId,
      action: "REMOVE_APU_MATERIAL",
      entityType: "BudgetItemMaterial",
      entityId: apuMaterialId,
      metadata: { budgetItemId: itemId, materialName: existing.material.name },
    },
  });

  await recalcAPU(itemId);
  res.status(204).end();
}

/** POST /api/budget-items/:itemId/apu/labor */
export async function addAPULabor(req: Request, res: Response) {
  const itemId = routeParam(req, "itemId");
  const body = req.body as AddAPULaborInput;

  const projectId = await getItemProjectId(itemId, res);
  if (!projectId) return;

  const line = await prisma.budgetItemLabor.create({
    data: {
      budgetItemId: itemId,
      description: body.description,
      costPerUnit: body.costPerUnit,
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: req.user!.userId,
      projectId,
      action: "ADD_APU_LABOR",
      entityType: "BudgetItemLabor",
      entityId: line.id,
      metadata: { budgetItemId: itemId, description: body.description },
    },
  });

  await recalcAPU(itemId);

  res.status(201).json({
    ...line,
    costPerUnit: Number(line.costPerUnit),
  });
}

/** PATCH /api/budget-items/:itemId/apu/labor/:apuLaborId */
export async function updateAPULabor(req: Request, res: Response) {
  const itemId = routeParam(req, "itemId");
  const apuLaborId = routeParam(req, "apuLaborId");
  const body = req.body as UpdateAPULaborInput;

  const existing = await prisma.budgetItemLabor.findUnique({
    where: { id: apuLaborId },
  });
  if (!existing || existing.budgetItemId !== itemId) {
    res.status(404).json({ error: "Línea de mano de obra no encontrada" });
    return;
  }

  const updated = await prisma.budgetItemLabor.update({
    where: { id: apuLaborId },
    data: body,
  });

  await recalcAPU(itemId);

  res.json({
    ...updated,
    costPerUnit: Number(updated.costPerUnit),
  });
}

/** DELETE /api/budget-items/:itemId/apu/labor/:apuLaborId */
export async function deleteAPULabor(req: Request, res: Response) {
  const itemId = routeParam(req, "itemId");
  const apuLaborId = routeParam(req, "apuLaborId");

  const existing = await prisma.budgetItemLabor.findUnique({
    where: { id: apuLaborId },
  });
  if (!existing || existing.budgetItemId !== itemId) {
    res.status(404).json({ error: "Línea de mano de obra no encontrada" });
    return;
  }

  const projectId = await getItemProjectId(itemId, res);
  if (!projectId) return;

  await prisma.budgetItemLabor.delete({ where: { id: apuLaborId } });

  await prisma.activityLog.create({
    data: {
      userId: req.user!.userId,
      projectId,
      action: "REMOVE_APU_LABOR",
      entityType: "BudgetItemLabor",
      entityId: apuLaborId,
      metadata: { budgetItemId: itemId, description: existing.description },
    },
  });

  await recalcAPU(itemId);
  res.status(204).end();
}

/** POST /api/budget-items/:itemId/apu/refresh-prices */
export async function refreshAPUPrices(req: Request, res: Response) {
  const itemId = routeParam(req, "itemId");

  const projectId = await getItemProjectId(itemId, res);
  if (!projectId) return;

  await refreshMaterialPrices(itemId);

  await prisma.activityLog.create({
    data: {
      userId: req.user!.userId,
      projectId,
      action: "REFRESH_APU_PRICES",
      entityType: "BudgetItem",
      entityId: itemId,
    },
  });

  res.json({ message: "Precios actualizados desde catálogo" });
}
