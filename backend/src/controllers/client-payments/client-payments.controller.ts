import { Request, Response } from "express";
import prisma from "../../config/prisma.js";
import { recalcBudgetSummary } from "../../services/payments.service.js";
import type { CreateClientPaymentInput, UpdateClientPaymentInput } from "./client-payments.schema.js";

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

function serializePayment(p: any) {
  return {
    ...p,
    amount: Number(p.amount),
  };
}

/** GET /api/projects/:projectId/client-payments */
export async function listClientPayments(req: Request, res: Response) {
  const projectId = routeParam(req, "projectId");
  if (!(await assertMember(req.user!.userId, projectId, res))) return;

  const payments = await prisma.clientPayment.findMany({
    where: { projectId },
    orderBy: { paymentDate: "desc" },
  });

  res.json(payments.map(serializePayment));
}

/** GET /api/projects/:projectId/client-payments/summary */
export async function clientPaymentSummary(req: Request, res: Response) {
  const projectId = routeParam(req, "projectId");
  if (!(await assertMember(req.user!.userId, projectId, res))) return;

  const [totalResult, byConcept, budgetSummary] = await Promise.all([
    prisma.clientPayment.aggregate({
      where: { projectId },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.clientPayment.groupBy({
      by: ["concept"],
      where: { projectId },
      _sum: { amount: true },
    }),
    prisma.budgetSummary.findUnique({ where: { projectId } }),
  ]);

  const totalCollected = Number(totalResult._sum.amount ?? 0);
  const totalBudgeted = Number(budgetSummary?.totalRevenue ?? 0);

  res.json({
    totalCollected,
    totalBudgeted,
    pendingBalance: totalBudgeted - totalCollected,
    count: totalResult._count,
    byConcept: byConcept.map((g) => ({
      concept: g.concept,
      total: Number(g._sum.amount ?? 0),
    })),
  });
}

/** POST /api/projects/:projectId/client-payments */
export async function createClientPayment(req: Request, res: Response) {
  const projectId = routeParam(req, "projectId");
  const body = req.body as CreateClientPaymentInput;
  if (!(await assertMember(req.user!.userId, projectId, res))) return;

  const payment = await prisma.clientPayment.create({
    data: {
      projectId,
      amount: body.amount,
      paymentDate: new Date(body.paymentDate),
      paymentMethod: body.paymentMethod,
      concept: body.concept,
      reference: body.reference,
      notes: body.notes,
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: req.user!.userId,
      projectId,
      action: "CREATE_CLIENT_PAYMENT",
      entityType: "ClientPayment",
      entityId: payment.id,
      metadata: { amount: body.amount, concept: body.concept },
    },
  });

  await recalcBudgetSummary(projectId);

  res.status(201).json(serializePayment(payment));
}

/** PATCH /api/projects/:projectId/client-payments/:paymentId */
export async function updateClientPayment(req: Request, res: Response) {
  const projectId = routeParam(req, "projectId");
  const paymentId = routeParam(req, "paymentId");
  const body = req.body as UpdateClientPaymentInput;
  if (!(await assertMember(req.user!.userId, projectId, res))) return;

  const existing = await prisma.clientPayment.findUnique({ where: { id: paymentId } });
  if (!existing || existing.projectId !== projectId) {
    res.status(404).json({ error: "Cobro no encontrado" });
    return;
  }

  const updated = await prisma.clientPayment.update({
    where: { id: paymentId },
    data: {
      ...body,
      paymentDate: body.paymentDate ? new Date(body.paymentDate) : undefined,
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: req.user!.userId,
      projectId,
      action: "UPDATE_CLIENT_PAYMENT",
      entityType: "ClientPayment",
      entityId: paymentId,
      metadata: { changes: body },
    },
  });

  await recalcBudgetSummary(projectId);

  res.json(serializePayment(updated));
}

/** DELETE /api/projects/:projectId/client-payments/:paymentId */
export async function deleteClientPayment(req: Request, res: Response) {
  const projectId = routeParam(req, "projectId");
  const paymentId = routeParam(req, "paymentId");
  if (!(await assertMember(req.user!.userId, projectId, res))) return;

  const existing = await prisma.clientPayment.findUnique({ where: { id: paymentId } });
  if (!existing || existing.projectId !== projectId) {
    res.status(404).json({ error: "Cobro no encontrado" });
    return;
  }

  await prisma.clientPayment.delete({ where: { id: paymentId } });

  await prisma.activityLog.create({
    data: {
      userId: req.user!.userId,
      projectId,
      action: "DELETE_CLIENT_PAYMENT",
      entityType: "ClientPayment",
      entityId: paymentId,
      metadata: { amount: Number(existing.amount) },
    },
  });

  await recalcBudgetSummary(projectId);

  res.status(204).end();
}
