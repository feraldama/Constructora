import { Request, Response } from "express";
import prisma from "../../config/prisma.js";
import { CreatePaymentInput, UpdatePaymentInput } from "./payments.schema.js";
import {
  validatePaymentAmount,
  markOverduePayments,
  getDashboardSummary,
  getContractorDebts,
  recalcBudgetSummary,
} from "../../services/payments.service.js";

function queryString(val: unknown): string | undefined {
  if (typeof val === "string") return val;
  return undefined;
}

function paramId(req: Request): string {
  const id = req.params.id;
  return typeof id === "string" ? id : String(id);
}

// ============================================================================
// GET /api/payments — Listar con filtros avanzados
// ============================================================================
export async function listPayments(req: Request, res: Response): Promise<void> {
  const projectId = queryString(req.query.projectId);
  const contractorId = queryString(req.query.contractorId);
  const status = queryString(req.query.status);
  const dateFrom = queryString(req.query.dateFrom);
  const dateTo = queryString(req.query.dateTo);
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  // Marcar vencidos antes de listar
  await markOverduePayments();

  const where: Record<string, unknown> = {};
  if (projectId) where.projectId = projectId;
  if (contractorId) where.contractorId = contractorId;
  if (status) where.status = status;

  // Filtro por rango de fechas
  if (dateFrom || dateTo) {
    const createdAt: Record<string, Date> = {};
    if (dateFrom) createdAt.gte = new Date(dateFrom);
    if (dateTo) createdAt.lte = new Date(dateTo);
    where.createdAt = createdAt;
  }

  const skip = (page - 1) * limit;

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        contractor: { select: { id: true, name: true } },
        budgetItem: { select: { id: true, name: true, unit: true } },
        project: { select: { id: true, name: true } },
        _count: { select: { attachments: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.payment.count({ where }),
  ]);

  res.json({
    data: payments,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// ============================================================================
// GET /api/payments/:id — Detalle
// ============================================================================
export async function getPayment(req: Request, res: Response): Promise<void> {
  const payment = await prisma.payment.findUnique({
    where: { id: paramId(req) },
    include: {
      contractor: true,
      budgetItem: true,
      project: { select: { id: true, name: true } },
      attachments: true,
    },
  });

  if (!payment) {
    res.status(404).json({ error: "Pago no encontrado" });
    return;
  }

  res.json(payment);
}

// ============================================================================
// POST /api/payments — Crear pago (parcial o total)
// ============================================================================
export async function createPayment(req: Request, res: Response): Promise<void> {
  const data: CreatePaymentInput = req.body;

  // Si es pago TOTAL, calcular el monto restante automáticamente
  let paymentAmount = data.amount;

  if (data.paymentType === "TOTAL") {
    const validation = await validatePaymentAmount(
      data.contractorId,
      data.projectId,
      Infinity, // forzar para obtener maxAllowed
      data.budgetItemId
    );
    if (validation.maxAllowed !== undefined && validation.maxAllowed > 0) {
      paymentAmount = validation.maxAllowed;
    }
    // Si no hay asignación, usar el monto enviado
  }

  // Validar que no exceda el monto acordado
  const validation = await validatePaymentAmount(
    data.contractorId,
    data.projectId,
    paymentAmount,
    data.budgetItemId
  );

  if (!validation.valid) {
    res.status(400).json({
      error: validation.error,
      maxAllowed: validation.maxAllowed,
    });
    return;
  }

  const payment = await prisma.payment.create({
    data: {
      projectId: data.projectId,
      contractorId: data.contractorId,
      budgetItemId: data.budgetItemId,
      amount: paymentAmount,
      description: data.description,
      invoiceNumber: data.invoiceNumber,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      status: "PENDING",
    },
    include: {
      contractor: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
  });

  // Actualizar resumen del presupuesto
  await recalcBudgetSummary(data.projectId);

  await prisma.activityLog.create({
    data: {
      userId: req.user?.userId,
      projectId: data.projectId,
      action: "CREATE_PAYMENT",
      entityType: "Payment",
      entityId: payment.id,
      metadata: {
        amount: paymentAmount,
        paymentType: data.paymentType,
        contractorId: data.contractorId,
      },
    },
  });

  res.status(201).json(payment);
}

// ============================================================================
// PATCH /api/payments/:id — Actualizar pago
// ============================================================================
export async function updatePayment(req: Request, res: Response): Promise<void> {
  const data: UpdatePaymentInput = req.body;

  const existing = await prisma.payment.findUnique({
    where: { id: paramId(req) },
  });

  if (!existing) {
    res.status(404).json({ error: "Pago no encontrado" });
    return;
  }

  // Si se cambia el monto, validar que no exceda
  if (data.amount && data.amount !== Number(existing.amount)) {
    const validation = await validatePaymentAmount(
      existing.contractorId,
      existing.projectId,
      data.amount,
      existing.budgetItemId ?? undefined,
      existing.id // excluir el pago actual del cálculo
    );

    if (!validation.valid) {
      res.status(400).json({
        error: validation.error,
        maxAllowed: validation.maxAllowed,
      });
      return;
    }
  }

  const updateData: Record<string, unknown> = { ...data };

  // Si se marca como PAID, registrar fecha automáticamente
  if (data.status === "PAID" && !data.paidAt) {
    updateData.paidAt = new Date();
  }

  // Si se cancela, limpiar fecha de pago
  if (data.status === "CANCELLED") {
    updateData.paidAt = null;
  }

  if (data.dueDate) updateData.dueDate = new Date(data.dueDate);
  if (data.paidAt) updateData.paidAt = new Date(data.paidAt);

  const payment = await prisma.payment.update({
    where: { id: paramId(req) },
    data: updateData,
    include: {
      contractor: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
  });

  // Recalcular resumen
  await recalcBudgetSummary(existing.projectId);

  await prisma.activityLog.create({
    data: {
      userId: req.user?.userId,
      projectId: existing.projectId,
      action: "UPDATE_PAYMENT",
      entityType: "Payment",
      entityId: payment.id,
      metadata: { changes: data, previousStatus: existing.status },
    },
  });

  res.json(payment);
}

// ============================================================================
// DELETE /api/payments/:id
// ============================================================================
export async function deletePayment(req: Request, res: Response): Promise<void> {
  const existing = await prisma.payment.findUnique({
    where: { id: paramId(req) },
  });

  if (!existing) {
    res.status(404).json({ error: "Pago no encontrado" });
    return;
  }

  if (existing.status === "PAID") {
    res.status(400).json({ error: "No se puede eliminar un pago ya realizado" });
    return;
  }

  await prisma.payment.delete({ where: { id: paramId(req) } });
  await recalcBudgetSummary(existing.projectId);

  await prisma.activityLog.create({
    data: {
      userId: req.user?.userId,
      projectId: existing.projectId,
      action: "DELETE_PAYMENT",
      entityType: "Payment",
      entityId: paramId(req),
    },
  });

  res.status(204).send();
}

// ============================================================================
// GET /api/payments/summary — Resumen para dashboard
// ============================================================================
export async function paymentSummary(req: Request, res: Response): Promise<void> {
  const projectId = queryString(req.query.projectId);

  if (!projectId) {
    res.status(400).json({ error: "projectId es requerido" });
    return;
  }

  const summary = await getDashboardSummary(projectId);
  res.json(summary);
}

// ============================================================================
// GET /api/payments/debts — Deuda por contratista en un proyecto
// ============================================================================
export async function contractorDebts(req: Request, res: Response): Promise<void> {
  const projectId = queryString(req.query.projectId);

  if (!projectId) {
    res.status(400).json({ error: "projectId es requerido" });
    return;
  }

  const debts = await getContractorDebts(projectId);
  res.json(debts);
}

// ============================================================================
// POST /api/payments/mark-overdue — Marcar vencidos manualmente
// ============================================================================
export async function triggerMarkOverdue(_req: Request, res: Response): Promise<void> {
  const count = await markOverduePayments();
  res.json({ updated: count });
}
