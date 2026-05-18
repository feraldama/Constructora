import { Request, Response } from "express";
import prisma from "../../config/prisma.js";
import { propagateMaterialPriceChange } from "../../services/apu.service.js";
import type { CreatePurchaseInput, UpdatePurchaseInput } from "./purchases.schema.js";

function routeParam(req: Request, key: string): string {
  const v = req.params[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return String(v[0]);
  return String(v);
}

function serialize(p: any) {
  return {
    ...p,
    quantity: Number(p.quantity),
    unitPrice: Number(p.unitPrice),
    totalAmount: Number(p.totalAmount),
  };
}

/** GET /api/purchases — lista con filtros */
export async function listPurchases(req: Request, res: Response) {
  const { materialId, projectId, from, to, page = "1", limit = "50" } = req.query;
  const where: any = {};
  if (materialId && typeof materialId === "string") where.materialId = materialId;
  if (projectId && typeof projectId === "string") where.projectId = projectId;
  if (from || to) {
    where.purchaseDate = {};
    if (from) where.purchaseDate.gte = new Date(String(from));
    if (to) where.purchaseDate.lte = new Date(String(to));
  }
  const take = Math.max(1, Math.min(200, parseInt(String(limit), 10) || 50));
  const skip = (Math.max(1, parseInt(String(page), 10) || 1) - 1) * take;

  const [items, total] = await Promise.all([
    prisma.purchase.findMany({
      where,
      orderBy: [{ purchaseDate: "desc" }, { createdAt: "desc" }],
      include: {
        material: { select: { id: true, name: true, unit: true } },
        project: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
      skip,
      take,
    }),
    prisma.purchase.count({ where }),
  ]);

  res.json({
    data: items.map(serialize),
    pagination: { page: skip / take + 1, limit: take, total },
  });
}

/** GET /api/purchases/:id */
export async function getPurchase(req: Request, res: Response) {
  const id = routeParam(req, "id");
  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: {
      material: true,
      project: { select: { id: true, name: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  if (!purchase) {
    res.status(404).json({ error: "Compra no encontrada" });
    return;
  }
  res.json(serialize(purchase));
}

/** POST /api/purchases — registra compra y actualiza Material.unitPrice */
export async function createPurchase(req: Request, res: Response) {
  const body = req.body as CreatePurchaseInput;

  const material = await prisma.material.findUnique({ where: { id: body.materialId } });
  if (!material) {
    res.status(404).json({ error: "Material no encontrado" });
    return;
  }

  const totalAmount = Math.round(body.quantity * body.unitPrice * 100) / 100;

  const purchase = await prisma.purchase.create({
    data: {
      materialId: body.materialId,
      projectId: body.projectId ?? null,
      createdById: req.user!.userId,
      quantity: body.quantity,
      unitPrice: body.unitPrice,
      totalAmount,
      supplier: body.supplier ?? null,
      invoiceRef: body.invoiceRef ?? null,
      purchaseDate: body.purchaseDate ?? new Date(),
      paymentMethod: body.paymentMethod ?? null,
      bank: body.bank ?? null,
      notes: body.notes ?? null,
    },
    include: {
      material: { select: { id: true, name: true, unit: true } },
      project: { select: { id: true, name: true } },
    },
  });

  // Política de precio: tomar el precio de la última compra como nuevo
  // unitPrice del catálogo, sin importar la fecha. Si la compra es retroactiva
  // y el catálogo ya tiene un precio más reciente, se respeta ese.
  const latest = await prisma.purchase.findFirst({
    where: { materialId: body.materialId },
    orderBy: [{ purchaseDate: "desc" }, { createdAt: "desc" }],
    select: { unitPrice: true, id: true },
  });
  let affectedItems = 0;
  if (latest && latest.id === purchase.id) {
    await prisma.material.update({
      where: { id: body.materialId },
      data: { unitPrice: body.unitPrice },
    });
    affectedItems = await propagateMaterialPriceChange(body.materialId);
  }

  await prisma.activityLog.create({
    data: {
      userId: req.user!.userId,
      projectId: body.projectId ?? null,
      action: "CREATE_PURCHASE",
      entityType: "Purchase",
      entityId: purchase.id,
      metadata: {
        materialId: body.materialId,
        materialName: material.name,
        unitPrice: body.unitPrice,
        quantity: body.quantity,
        affectedBudgetItems: affectedItems,
      },
    },
  });

  res.status(201).json({ ...serialize(purchase), affectedBudgetItems: affectedItems });
}

/** PATCH /api/purchases/:id */
export async function updatePurchase(req: Request, res: Response) {
  const id = routeParam(req, "id");
  const body = req.body as UpdatePurchaseInput;

  const existing = await prisma.purchase.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: "Compra no encontrada" });
    return;
  }

  const quantity = body.quantity ?? Number(existing.quantity);
  const unitPrice = body.unitPrice ?? Number(existing.unitPrice);
  const totalAmount = Math.round(quantity * unitPrice * 100) / 100;

  const purchase = await prisma.purchase.update({
    where: { id },
    data: {
      quantity: body.quantity,
      unitPrice: body.unitPrice,
      totalAmount,
      projectId: body.projectId,
      supplier: body.supplier,
      invoiceRef: body.invoiceRef,
      purchaseDate: body.purchaseDate,
      paymentMethod: body.paymentMethod,
      bank: body.bank,
      notes: body.notes,
    },
  });

  // Si la compra editada sigue siendo la más reciente del material, propagar
  const latest = await prisma.purchase.findFirst({
    where: { materialId: existing.materialId },
    orderBy: [{ purchaseDate: "desc" }, { createdAt: "desc" }],
    select: { id: true, unitPrice: true },
  });
  if (latest && latest.id === purchase.id) {
    await prisma.material.update({
      where: { id: existing.materialId },
      data: { unitPrice: Number(latest.unitPrice) },
    });
    await propagateMaterialPriceChange(existing.materialId);
  }

  res.json(serialize(purchase));
}

/** DELETE /api/purchases/:id */
export async function deletePurchase(req: Request, res: Response) {
  const id = routeParam(req, "id");
  const existing = await prisma.purchase.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: "Compra no encontrada" });
    return;
  }
  const wasLatest = await prisma.purchase
    .findFirst({
      where: { materialId: existing.materialId },
      orderBy: [{ purchaseDate: "desc" }, { createdAt: "desc" }],
      select: { id: true },
    })
    .then((p) => p?.id === id);

  await prisma.purchase.delete({ where: { id } });

  if (wasLatest) {
    // Después de borrar, la nueva "última compra" define el precio
    const newLatest = await prisma.purchase.findFirst({
      where: { materialId: existing.materialId },
      orderBy: [{ purchaseDate: "desc" }, { createdAt: "desc" }],
      select: { unitPrice: true },
    });
    if (newLatest) {
      await prisma.material.update({
        where: { id: existing.materialId },
        data: { unitPrice: Number(newLatest.unitPrice) },
      });
      await propagateMaterialPriceChange(existing.materialId);
    }
  }

  await prisma.activityLog.create({
    data: {
      userId: req.user!.userId,
      projectId: existing.projectId,
      action: "DELETE_PURCHASE",
      entityType: "Purchase",
      entityId: id,
    },
  });

  res.status(204).end();
}
