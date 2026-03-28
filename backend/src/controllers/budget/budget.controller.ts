import { Request, Response } from "express";
import prisma from "../../config/prisma.js";
import { recalcBudgetSummary } from "../../services/payments.service.js";
import type {
  CreateCategoryInput,
  CreateBudgetItemInput,
  UpdateBudgetItemInput,
} from "./budget.schema.js";

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

function serializeItem(row: {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  unit: string;
  quantity: unknown;
  unitPrice: unknown;
  subtotal: unknown;
  sortOrder: number;
}) {
  const quantity = Number(row.quantity);
  const unitPrice = Number(row.unitPrice);
  return {
    id: row.id,
    categoryId: row.categoryId,
    name: row.name,
    description: row.description,
    unit: row.unit,
    quantity,
    unitPrice,
    subtotal: Number(row.subtotal),
    sortOrder: row.sortOrder,
  };
}

// GET /api/projects/:projectId/budget
export async function getProjectBudget(req: Request, res: Response): Promise<void> {
  const projectId = routeParam(req, "projectId");
  if (!(await assertMember(req.user!.userId, projectId, res))) return;

  const categories = await prisma.category.findMany({
    where: { projectId },
    include: {
      budgetItems: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { sortOrder: "asc" },
  });

  res.json({
    categories: categories.map((c) => ({
      id: c.id,
      projectId: c.projectId,
      name: c.name,
      description: c.description,
      sortOrder: c.sortOrder,
      items: c.budgetItems.map(serializeItem),
    })),
  });
}

// POST /api/projects/:projectId/categories
export async function createCategory(req: Request, res: Response): Promise<void> {
  const projectId = routeParam(req, "projectId");
  if (!(await assertMember(req.user!.userId, projectId, res))) return;

  const body = req.body as CreateCategoryInput;

  const maxOrder = await prisma.category.aggregate({
    where: { projectId },
    _max: { sortOrder: true },
  });
  const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  const category = await prisma.category.create({
    data: {
      projectId,
      name: body.name,
      description: body.description,
      sortOrder,
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: req.user!.userId,
      projectId,
      action: "CREATE_BUDGET_CATEGORY",
      entityType: "Category",
      entityId: category.id,
      metadata: { name: body.name },
    },
  });

  await recalcBudgetSummary(projectId);

  res.status(201).json({
    id: category.id,
    projectId: category.projectId,
    name: category.name,
    description: category.description,
    sortOrder: category.sortOrder,
    items: [],
  });
}

// DELETE /api/projects/:projectId/categories/:categoryId
export async function deleteCategory(req: Request, res: Response): Promise<void> {
  const projectId = routeParam(req, "projectId");
  const categoryId = routeParam(req, "categoryId");
  if (!(await assertMember(req.user!.userId, projectId, res))) return;

  const existing = await prisma.category.findFirst({
    where: { id: categoryId, projectId },
  });
  if (!existing) {
    res.status(404).json({ error: "Categoría no encontrada" });
    return;
  }

  await prisma.category.delete({ where: { id: categoryId } });

  await prisma.activityLog.create({
    data: {
      userId: req.user!.userId,
      projectId,
      action: "DELETE_BUDGET_CATEGORY",
      entityType: "Category",
      entityId: categoryId,
      metadata: { name: existing.name },
    },
  });

  await recalcBudgetSummary(projectId);
  res.status(204).send();
}

// POST /api/categories/:categoryId/budget-items
export async function createBudgetItem(req: Request, res: Response): Promise<void> {
  const categoryId = routeParam(req, "categoryId");
  const body = req.body as CreateBudgetItemInput;

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { projectId: true },
  });
  if (!category) {
    res.status(404).json({ error: "Categoría no encontrada" });
    return;
  }
  if (!(await assertMember(req.user!.userId, category.projectId, res))) return;

  const name = body.name ?? "";
  const unit = body.unit ?? "M2";
  const quantity = body.quantity ?? 0;
  const unitPrice = body.unitPrice ?? 0;
  const subtotal = quantity * unitPrice;

  let sortOrder = body.sortOrder;
  if (sortOrder === undefined) {
    const maxSort = await prisma.budgetItem.aggregate({
      where: { categoryId },
      _max: { sortOrder: true },
    });
    sortOrder = (maxSort._max.sortOrder ?? -1) + 1;
  }

  const item = await prisma.budgetItem.create({
    data: {
      categoryId,
      name,
      description: body.description,
      unit,
      quantity,
      unitPrice,
      subtotal,
      sortOrder,
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: req.user!.userId,
      projectId: category.projectId,
      action: "CREATE_BUDGET_ITEM",
      entityType: "BudgetItem",
      entityId: item.id,
      metadata: { name, categoryId },
    },
  });

  await recalcBudgetSummary(category.projectId);
  res.status(201).json(serializeItem(item));
}

// PATCH /api/budget-items/:itemId
export async function updateBudgetItem(req: Request, res: Response): Promise<void> {
  const itemId = routeParam(req, "itemId");
  const body = req.body as UpdateBudgetItemInput;

  const existing = await prisma.budgetItem.findUnique({
    where: { id: itemId },
    include: { category: { select: { projectId: true } } },
  });
  if (!existing) {
    res.status(404).json({ error: "Partida no encontrada" });
    return;
  }
  const projectId = existing.category.projectId;
  if (!(await assertMember(req.user!.userId, projectId, res))) return;

  const quantity = body.quantity !== undefined ? body.quantity : Number(existing.quantity);
  const unitPrice = body.unitPrice !== undefined ? body.unitPrice : Number(existing.unitPrice);
  const subtotal = quantity * unitPrice;

  const item = await prisma.budgetItem.update({
    where: { id: itemId },
    data: {
      ...body,
      subtotal,
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: req.user!.userId,
      projectId,
      action: "UPDATE_BUDGET_ITEM",
      entityType: "BudgetItem",
      entityId: item.id,
      metadata: { changes: body },
    },
  });

  await recalcBudgetSummary(projectId);
  res.json(serializeItem(item));
}

// DELETE /api/budget-items/:itemId
export async function deleteBudgetItem(req: Request, res: Response): Promise<void> {
  const itemId = routeParam(req, "itemId");

  const existing = await prisma.budgetItem.findUnique({
    where: { id: itemId },
    include: { category: { select: { projectId: true, id: true } } },
  });
  if (!existing) {
    res.status(404).json({ error: "Partida no encontrada" });
    return;
  }
  const projectId = existing.category.projectId;
  if (!(await assertMember(req.user!.userId, projectId, res))) return;

  await prisma.budgetItem.delete({ where: { id: itemId } });

  await prisma.activityLog.create({
    data: {
      userId: req.user!.userId,
      projectId,
      action: "DELETE_BUDGET_ITEM",
      entityType: "BudgetItem",
      entityId: itemId,
      metadata: { name: existing.name },
    },
  });

  await recalcBudgetSummary(projectId);
  res.status(204).send();
}
