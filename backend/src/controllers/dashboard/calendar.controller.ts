import { Request, Response } from "express";
import prisma from "../../config/prisma.js";

function queryString(val: unknown): string | undefined {
  if (typeof val === "string") return val;
  return undefined;
}

export interface CalendarEvent {
  id: string;
  type: "PAYMENT_DUE" | "PAYMENT_PAID" | "CERTIFICATE" | "PROJECT_START" | "PROJECT_END";
  title: string;
  date: string;
  color: string;
  meta?: Record<string, unknown>;
}

// GET /api/dashboard/calendar?projectId=X&from=2026-01-01&to=2026-12-31
export async function getCalendarEvents(req: Request, res: Response): Promise<void> {
  const projectId = queryString(req.query.projectId);
  const from = queryString(req.query.from);
  const to = queryString(req.query.to);

  if (!projectId) {
    res.status(400).json({ error: "projectId es requerido" });
    return;
  }

  // Verify membership
  const member = await prisma.projectMember.findFirst({
    where: { userId: req.user!.userId, projectId },
  });
  if (!member) {
    res.status(403).json({ error: "Sin acceso a este proyecto" });
    return;
  }

  const dateFrom = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const dateTo = to ? new Date(to) : new Date(new Date().getFullYear(), new Date().getMonth() + 2, 0);

  const events: CalendarEvent[] = [];

  // 1. Payments with due dates
  const payments = await prisma.payment.findMany({
    where: {
      projectId,
      OR: [
        { dueDate: { gte: dateFrom, lte: dateTo } },
        { paidAt: { gte: dateFrom, lte: dateTo } },
      ],
    },
    select: {
      id: true,
      amount: true,
      status: true,
      dueDate: true,
      paidAt: true,
      description: true,
      contractor: { select: { name: true } },
    },
  });

  for (const p of payments) {
    if (p.dueDate && p.status !== "PAID") {
      events.push({
        id: `pay-due-${p.id}`,
        type: "PAYMENT_DUE",
        title: `Vto. pago — ${p.contractor.name}`,
        date: p.dueDate.toISOString(),
        color: p.status === "OVERDUE" ? "#ef4444" : "#eab308",
        meta: { paymentId: p.id, amount: Number(p.amount), status: p.status },
      });
    }
    if (p.paidAt) {
      events.push({
        id: `pay-paid-${p.id}`,
        type: "PAYMENT_PAID",
        title: `Pago realizado — ${p.contractor.name}`,
        date: p.paidAt.toISOString(),
        color: "#22c55e",
        meta: { paymentId: p.id, amount: Number(p.amount) },
      });
    }
  }

  // 2. Certificates (approved/submitted)
  const certificates = await prisma.certificate.findMany({
    where: {
      projectId,
      status: { in: ["SUBMITTED", "APPROVED"] },
      periodEnd: { gte: dateFrom, lte: dateTo },
    },
    select: {
      id: true,
      certificateNumber: true,
      periodStart: true,
      periodEnd: true,
      status: true,
      totalAmount: true,
      contractor: { select: { name: true } },
    },
  });

  for (const c of certificates) {
    events.push({
      id: `cert-${c.id}`,
      type: "CERTIFICATE",
      title: `Cert. #${c.certificateNumber} — ${c.contractor.name}`,
      date: c.periodEnd.toISOString(),
      color: c.status === "APPROVED" ? "#3b82f6" : "#8b5cf6",
      meta: { certificateId: c.id, amount: Number(c.totalAmount), status: c.status },
    });
  }

  // 3. Project milestones
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { name: true, startDate: true, estimatedEnd: true, actualEnd: true },
  });

  if (project?.startDate && project.startDate >= dateFrom && project.startDate <= dateTo) {
    events.push({
      id: `proj-start-${projectId}`,
      type: "PROJECT_START",
      title: `Inicio — ${project.name}`,
      date: project.startDate.toISOString(),
      color: "#6366f1",
    });
  }

  const endDate = project?.actualEnd ?? project?.estimatedEnd;
  if (endDate && endDate >= dateFrom && endDate <= dateTo) {
    events.push({
      id: `proj-end-${projectId}`,
      type: "PROJECT_END",
      title: `${project?.actualEnd ? "Fin real" : "Fin estimado"} — ${project?.name}`,
      date: endDate.toISOString(),
      color: "#6366f1",
    });
  }

  // Sort by date
  events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  res.json(events);
}
