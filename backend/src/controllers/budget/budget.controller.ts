import { Request, Response } from "express";
import prisma from "../../config/prisma.js";
import { recalcBudgetSummary } from "../../services/payments.service.js";
import type {
  CreateCategoryInput,
  CreateBudgetItemInput,
  UpdateBudgetItemInput,
  CreateExpenseInput,
  UpdateExpenseInput,
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
  costUnitPrice: unknown;
  saleUnitPrice: unknown;
  costSubtotal: unknown;
  saleSubtotal: unknown;
  sortOrder: number;
}) {
  const quantity = Number(row.quantity);
  const costUnitPrice = Number(row.costUnitPrice);
  const saleUnitPrice = Number(row.saleUnitPrice);
  const costSubtotal = Number(row.costSubtotal);
  const saleSubtotal = Number(row.saleSubtotal);
  return {
    id: row.id,
    categoryId: row.categoryId,
    name: row.name,
    description: row.description,
    unit: row.unit,
    quantity,
    costUnitPrice,
    saleUnitPrice,
    costSubtotal,
    saleSubtotal,
    grossProfit: saleSubtotal - costSubtotal,
    marginPercent: saleSubtotal > 0
      ? Math.round(((saleSubtotal - costSubtotal) / saleSubtotal) * 10000) / 100
      : 0,
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
  const costUnitPrice = body.costUnitPrice ?? 0;
  const saleUnitPrice = body.saleUnitPrice ?? 0;
  const costSubtotal = quantity * costUnitPrice;
  const saleSubtotal = quantity * saleUnitPrice;

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
      costUnitPrice,
      saleUnitPrice,
      costSubtotal,
      saleSubtotal,
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
  const costUnitPrice = body.costUnitPrice !== undefined ? body.costUnitPrice : Number(existing.costUnitPrice);
  const saleUnitPrice = body.saleUnitPrice !== undefined ? body.saleUnitPrice : Number(existing.saleUnitPrice);
  const costSubtotal = quantity * costUnitPrice;
  const saleSubtotal = quantity * saleUnitPrice;

  const item = await prisma.budgetItem.update({
    where: { id: itemId },
    data: {
      ...body,
      costSubtotal,
      saleSubtotal,
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

// ============================================================================
// GASTOS ADICIONALES
// ============================================================================

// GET /api/projects/:projectId/expenses
export async function listExpenses(req: Request, res: Response): Promise<void> {
  const projectId = routeParam(req, "projectId");
  if (!(await assertMember(req.user!.userId, projectId, res))) return;

  const expenses = await prisma.projectExpense.findMany({
    where: { projectId },
    orderBy: { expenseDate: "desc" },
  });

  res.json(expenses.map((e) => ({ ...e, amount: Number(e.amount) })));
}

// POST /api/projects/:projectId/expenses
export async function createExpense(req: Request, res: Response): Promise<void> {
  const projectId = routeParam(req, "projectId");
  if (!(await assertMember(req.user!.userId, projectId, res))) return;

  const body = req.body as CreateExpenseInput;

  const expense = await prisma.projectExpense.create({
    data: {
      projectId,
      description: body.description,
      amount: body.amount,
      expenseType: body.expenseType,
      expenseDate: body.expenseDate ? new Date(body.expenseDate) : new Date(),
      invoiceRef: body.invoiceRef,
      notes: body.notes,
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: req.user!.userId,
      projectId,
      action: "CREATE_EXPENSE",
      entityType: "ProjectExpense",
      entityId: expense.id,
      metadata: { description: body.description, amount: body.amount, expenseType: body.expenseType },
    },
  });

  await recalcBudgetSummary(projectId);
  res.status(201).json({ ...expense, amount: Number(expense.amount) });
}

// PATCH /api/expenses/:expenseId
export async function updateExpense(req: Request, res: Response): Promise<void> {
  const expenseId = routeParam(req, "expenseId");
  const body = req.body as UpdateExpenseInput;

  const existing = await prisma.projectExpense.findUnique({
    where: { id: expenseId },
  });
  if (!existing) {
    res.status(404).json({ error: "Gasto no encontrado" });
    return;
  }
  if (!(await assertMember(req.user!.userId, existing.projectId, res))) return;

  const expense = await prisma.projectExpense.update({
    where: { id: expenseId },
    data: {
      ...body,
      expenseDate: body.expenseDate ? new Date(body.expenseDate) : undefined,
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: req.user!.userId,
      projectId: existing.projectId,
      action: "UPDATE_EXPENSE",
      entityType: "ProjectExpense",
      entityId: expenseId,
      metadata: { changes: body },
    },
  });

  await recalcBudgetSummary(existing.projectId);
  res.json({ ...expense, amount: Number(expense.amount) });
}

// DELETE /api/expenses/:expenseId
export async function deleteExpense(req: Request, res: Response): Promise<void> {
  const expenseId = routeParam(req, "expenseId");

  const existing = await prisma.projectExpense.findUnique({
    where: { id: expenseId },
  });
  if (!existing) {
    res.status(404).json({ error: "Gasto no encontrado" });
    return;
  }
  if (!(await assertMember(req.user!.userId, existing.projectId, res))) return;

  await prisma.projectExpense.delete({ where: { id: expenseId } });

  await prisma.activityLog.create({
    data: {
      userId: req.user!.userId,
      projectId: existing.projectId,
      action: "DELETE_EXPENSE",
      entityType: "ProjectExpense",
      entityId: expenseId,
      metadata: { description: existing.description },
    },
  });

  await recalcBudgetSummary(existing.projectId);
  res.status(204).send();
}
