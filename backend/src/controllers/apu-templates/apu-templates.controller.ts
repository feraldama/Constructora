import { Request, Response } from "express";
import prisma from "../../config/prisma.js";
import { recalcAPU, calcMaterialSubtotal } from "../../services/apu.service.js";
import type { ApplyAPUTemplateInput } from "./apu-templates.schema.js";

function routeParam(req: Request, key: string): string {
  const v = req.params[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return String(v[0]);
  return String(v);
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

/** GET /api/apu-templates/:id — detalle con materiales y mano de obra */
export async function getAPUTemplate(req: Request, res: Response) {
  const id = routeParam(req, "id");
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
  if (!t) {
    res.status(404).json({ error: "Plantilla no encontrada" });
    return;
  }

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

  res.json({
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
  });
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

  // Determinar BudgetItem destino
  let targetItemId: string;
  let projectId: string;

  if (body.budgetItemId) {
    const target = await prisma.budgetItem.findUnique({
      where: { id: body.budgetItemId },
      include: { category: { select: { projectId: true } } },
    });
    if (!target) {
      res.status(404).json({ error: "Partida destino no encontrada" });
      return;
    }
    targetItemId = target.id;
    projectId = target.category.projectId;

    if (body.replaceExisting) {
      await prisma.budgetItemMaterial.deleteMany({ where: { budgetItemId: targetItemId } });
      await prisma.budgetItemLabor.deleteMany({ where: { budgetItemId: targetItemId } });
    }
  } else {
    // crear nuevo BudgetItem en categoryId
    const cat = await prisma.category.findUnique({ where: { id: body.categoryId! } });
    if (!cat) {
      res.status(404).json({ error: "Categoría no encontrada" });
      return;
    }
    projectId = cat.projectId;
    const last = await prisma.budgetItem.findFirst({
      where: { categoryId: cat.id },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const created = await prisma.budgetItem.create({
      data: {
        categoryId: cat.id,
        name: body.name ?? template.name,
        unit: template.unit,
        quantity: body.quantity ?? 0,
        sortOrder: (last?.sortOrder ?? 0) + 1,
      },
    });
    targetItemId = created.id;
  }

  // Crear líneas APU de material
  if (template.materials.length > 0) {
    const matIds = template.materials.map((m) => m.materialId);
    const mats = await prisma.material.findMany({
      where: { id: { in: matIds } },
      select: { id: true, unitPrice: true, presentationQty: true },
    });
    const priceMap = new Map(mats.map((m) => [m.id, m]));

    for (const tm of template.materials) {
      const mat = priceMap.get(tm.materialId);
      if (!mat) continue;
      const unitCost = Number(mat.unitPrice) / (Number(mat.presentationQty) || 1);
      const cons = Number(tm.consumptionPerUnit);
      const waste = Number(tm.wastePercent);
      const subtotal = calcMaterialSubtotal(cons, waste, unitCost);

      // Si ya existe la línea para este material en el item destino (no
      // replaceExisting), saltamos el insert para no chocar contra @@unique.
      const existing = await prisma.budgetItemMaterial.findUnique({
        where: { budgetItemId_materialId: { budgetItemId: targetItemId, materialId: tm.materialId } },
      });
      if (existing) continue;

      await prisma.budgetItemMaterial.create({
        data: {
          budgetItemId: targetItemId,
          materialId: tm.materialId,
          consumptionPerUnit: cons,
          wastePercent: waste,
          unitCost,
          subtotal,
        },
      });
    }
  }

  // Crear líneas de mano de obra
  if (template.labor.length > 0) {
    await prisma.budgetItemLabor.createMany({
      data: template.labor.map((l) => ({
        budgetItemId: targetItemId,
        description: l.description,
        costPerUnit: Number(l.costPerUnit),
      })),
    });
  }

  await recalcAPU(targetItemId);

  // Auto-completar P.U. Venta con el margen default (30%) si no fue seteado
  // manualmente. Misma regla que budget.controller.ts:208 para createItem.
  const afterRecalc = await prisma.budgetItem.findUniqueOrThrow({
    where: { id: targetItemId },
    select: { costUnitPrice: true, saleUnitPrice: true, quantity: true },
  });
  if (Number(afterRecalc.saleUnitPrice) === 0 && Number(afterRecalc.costUnitPrice) > 0) {
    const saleUnitPrice = Math.round(Number(afterRecalc.costUnitPrice) * 1.3 * 100) / 100;
    const saleSubtotal = Math.round(saleUnitPrice * Number(afterRecalc.quantity) * 100) / 100;
    await prisma.budgetItem.update({
      where: { id: targetItemId },
      data: { saleUnitPrice, saleSubtotal },
    });
  }

  await prisma.activityLog.create({
    data: {
      userId: req.user!.userId,
      projectId,
      action: "APPLY_APU_TEMPLATE",
      entityType: "BudgetItem",
      entityId: targetItemId,
      metadata: { templateId: id, templateName: template.name },
    },
  });

  const result = await prisma.budgetItem.findUnique({ where: { id: targetItemId } });
  res.status(201).json({
    budgetItemId: targetItemId,
    item: result && {
      ...result,
      quantity: Number(result.quantity),
      costUnitPrice: Number(result.costUnitPrice),
      saleUnitPrice: Number(result.saleUnitPrice),
      costSubtotal: Number(result.costSubtotal),
      saleSubtotal: Number(result.saleSubtotal),
    },
  });
}
