import { Request, Response } from "express";
import prisma from "../../config/prisma.js";
import type { CreateProgressEntryInput, UpdateProgressEntryInput } from "./progress.schema.js";

function routeParam(req: Request, key: string): string {
  const v = req.params[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return String(v[0]);
  return String(v);
}

async function assertMember(userId: string, projectId: string, res: Response): Promise<boolean> {
  const m = await prisma.projectMember.findFirst({
    where: { userId, projectId },
  });
  if (!m) {
    res.status(403).json({ error: "Sin acceso a este proyecto" });
    return false;
  }
  return true;
}

async function getProjectIdFromBudgetItem(budgetItemId: string): Promise<string | null> {
  const item = await prisma.budgetItem.findUnique({
    where: { id: budgetItemId },
    select: { category: { select: { projectId: true } } },
  });
  return item?.category.projectId ?? null;
}

async function getCumulativeQuantity(budgetItemId: string, excludeId?: string): Promise<number> {
  const result = await prisma.progressEntry.aggregate({
    where: {
      budgetItemId,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    _sum: { quantity: true },
  });
  return Number(result._sum.quantity ?? 0);
}

// GET /api/budget-items/:budgetItemId/progress
export async function listProgressEntries(req: Request, res: Response): Promise<void> {
  const budgetItemId = routeParam(req, "budgetItemId");

  const item = await prisma.budgetItem.findUnique({
    where: { id: budgetItemId },
    select: { quantity: true, category: { select: { projectId: true } } },
  });
  if (!item) {
    res.status(404).json({ error: "Partida no encontrada" });
    return;
  }
  if (!(await assertMember(req.user!.userId, item.category.projectId, res))) return;

  const entries = await prisma.progressEntry.findMany({
    where: { budgetItemId },
    orderBy: { date: "desc" },
    include: {
      recordedBy: { select: { firstName: true, lastName: true } },
    },
  });

  const budgetedQuantity = Number(item.quantity);
  const cumulativeQuantity = entries.reduce((sum, e) => sum + Number(e.quantity), 0);

  res.json({
    entries: entries.map((e) => ({
      id: e.id,
      budgetItemId: e.budgetItemId,
      quantity: Number(e.quantity),
      date: e.date,
      notes: e.notes,
      recordedBy: e.recordedBy,
      createdAt: e.createdAt,
    })),
    budgetedQuantity,
    cumulativeQuantity,
    percent: budgetedQuantity > 0 ? Math.round((cumulativeQuantity / budgetedQuantity) * 100) : 0,
  });
}

// POST /api/budget-items/:budgetItemId/progress
export async function createProgressEntry(req: Request, res: Response): Promise<void> {
  const budgetItemId = routeParam(req, "budgetItemId");
  const body = req.body as CreateProgressEntryInput;

  const item = await prisma.budgetItem.findUnique({
    where: { id: budgetItemId },
    select: { quantity: true, name: true, category: { select: { projectId: true } } },
  });
  if (!item) {
    res.status(404).json({ error: "Partida no encontrada" });
    return;
  }
  const projectId = item.category.projectId;
  if (!(await assertMember(req.user!.userId, projectId, res))) return;

  const budgetedQty = Number(item.quantity);
  const currentCumulative = await getCumulativeQuantity(budgetItemId);
  const newCumulative = currentCumulative + body.quantity;
  const exceedsBudget = newCumulative > budgetedQty;

  const entry = await prisma.progressEntry.create({
    data: {
      budgetItemId,
      quantity: body.quantity,
      date: body.date ? new Date(body.date) : new Date(),
      notes: body.notes,
      recordedById: req.user!.userId,
    },
    include: {
      recordedBy: { select: { firstName: true, lastName: true } },
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: req.user!.userId,
      projectId,
      action: "CREATE_PROGRESS_ENTRY",
      entityType: "ProgressEntry",
      entityId: entry.id,
      metadata: {
        budgetItemName: item.name,
        quantity: body.quantity,
        cumulativeQuantity: newCumulative,
        budgetedQuantity: budgetedQty,
      },
    },
  });

  res.status(201).json({
    id: entry.id,
    budgetItemId: entry.budgetItemId,
    quantity: Number(entry.quantity),
    date: entry.date,
    notes: entry.notes,
    recordedBy: entry.recordedBy,
    createdAt: entry.createdAt,
    cumulativeQuantity: newCumulative,
    exceedsBudget,
  });
}

// PATCH /api/progress-entries/:entryId
export async function updateProgressEntry(req: Request, res: Response): Promise<void> {
  const entryId = routeParam(req, "entryId");
  const body = req.body as UpdateProgressEntryInput;

  const existing = await prisma.progressEntry.findUnique({
    where: { id: entryId },
    include: {
      budgetItem: { select: { quantity: true, name: true, category: { select: { projectId: true } } } },
    },
  });
  if (!existing) {
    res.status(404).json({ error: "Registro de avance no encontrado" });
    return;
  }
  const projectId = existing.budgetItem.category.projectId;
  if (!(await assertMember(req.user!.userId, projectId, res))) return;

  if (body.quantity !== undefined) {
    const budgetedQty = Number(existing.budgetItem.quantity);
    const othersCumulative = await getCumulativeQuantity(existing.budgetItemId, entryId);
    const newCumulative = othersCumulative + body.quantity;
    if (newCumulative > budgetedQty * 1.5) {
      res.status(400).json({
        error: "La cantidad total excede el 150% de lo presupuestado",
        cumulativeQuantity: newCumulative,
        budgetedQuantity: budgetedQty,
      });
      return;
    }
  }

  const entry = await prisma.progressEntry.update({
    where: { id: entryId },
    data: {
      ...(body.quantity !== undefined ? { quantity: body.quantity } : {}),
      ...(body.date ? { date: new Date(body.date) } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
    },
    include: {
      recordedBy: { select: { firstName: true, lastName: true } },
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: req.user!.userId,
      projectId,
      action: "UPDATE_PROGRESS_ENTRY",
      entityType: "ProgressEntry",
      entityId: entryId,
      metadata: { changes: body },
    },
  });

  res.json({
    id: entry.id,
    budgetItemId: entry.budgetItemId,
    quantity: Number(entry.quantity),
    date: entry.date,
    notes: entry.notes,
    recordedBy: entry.recordedBy,
    createdAt: entry.createdAt,
  });
}

// DELETE /api/progress-entries/:entryId
export async function deleteProgressEntry(req: Request, res: Response): Promise<void> {
  const entryId = routeParam(req, "entryId");

  const existing = await prisma.progressEntry.findUnique({
    where: { id: entryId },
    include: {
      budgetItem: { select: { name: true, category: { select: { projectId: true } } } },
    },
  });
  if (!existing) {
    res.status(404).json({ error: "Registro de avance no encontrado" });
    return;
  }
  const projectId = existing.budgetItem.category.projectId;
  if (!(await assertMember(req.user!.userId, projectId, res))) return;

  await prisma.progressEntry.delete({ where: { id: entryId } });

  await prisma.activityLog.create({
    data: {
      userId: req.user!.userId,
      projectId,
      action: "DELETE_PROGRESS_ENTRY",
      entityType: "ProgressEntry",
      entityId: entryId,
      metadata: { budgetItemName: existing.budgetItem.name, quantity: Number(existing.quantity) },
    },
  });

  res.status(204).send();
}

// GET /api/projects/:projectId/progress
export async function getProjectProgress(req: Request, res: Response): Promise<void> {
  const projectId = routeParam(req, "projectId");
  if (!(await assertMember(req.user!.userId, projectId, res))) return;

  const categories = await prisma.category.findMany({
    where: { projectId },
    select: {
      budgetItems: {
        select: {
          id: true,
          name: true,
          unit: true,
          quantity: true,
          saleSubtotal: true,
          progressEntries: {
            select: { quantity: true },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  const items = categories.flatMap((c) =>
    c.budgetItems.map((bi) => {
      const budgetedQuantity = Number(bi.quantity);
      const measuredQuantity = bi.progressEntries.reduce((sum, e) => sum + Number(e.quantity), 0);
      const percent = budgetedQuantity > 0
        ? Math.round(Math.min(measuredQuantity / budgetedQuantity, 1) * 100)
        : 0;
      return {
        budgetItemId: bi.id,
        name: bi.name,
        unit: bi.unit,
        budgetedQuantity,
        measuredQuantity,
        percent,
        saleSubtotal: Number(bi.saleSubtotal),
      };
    })
  );

  // Progreso ponderado por saleSubtotal
  const totalWeight = items.reduce((sum, i) => sum + i.saleSubtotal, 0);
  const weightedProgress = totalWeight > 0
    ? items.reduce((sum, i) => {
        const itemProgress = i.budgetedQuantity > 0
          ? Math.min(i.measuredQuantity / i.budgetedQuantity, 1)
          : 0;
        return sum + itemProgress * i.saleSubtotal;
      }, 0) / totalWeight * 100
    : 0;

  res.json({
    items,
    overallPercent: Math.round(weightedProgress),
    totalItems: items.length,
    itemsWithProgress: items.filter((i) => i.measuredQuantity > 0).length,
  });
}
