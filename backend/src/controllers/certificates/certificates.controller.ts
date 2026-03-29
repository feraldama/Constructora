import { Request, Response } from "express";
import prisma from "../../config/prisma.js";
import { recalcBudgetSummary } from "../../services/payments.service.js";
import type {
  CreateCertificateInput,
  UpdateCertificateInput,
  UpdateCertificateItemInput,
  RejectCertificateInput,
} from "./certificates.schema.js";

function routeParam(req: Request, key: string): string {
  const v = req.params[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return String(v[0]);
  return String(v);
}

async function assertMember(userId: string, projectId: string, res: Response): Promise<boolean> {
  const m = await prisma.projectMember.findFirst({ where: { userId, projectId } });
  if (!m) {
    res.status(403).json({ error: "Sin acceso a este proyecto" });
    return false;
  }
  return true;
}

async function assertEditorOrAdmin(userId: string, projectId: string, res: Response): Promise<boolean> {
  const m = await prisma.projectMember.findFirst({
    where: { userId, projectId, role: { in: ["ADMIN", "EDITOR"] } },
  });
  if (!m) {
    res.status(403).json({ error: "Se requiere rol ADMIN o EDITOR" });
    return false;
  }
  return true;
}

// GET /api/certificates?projectId=X&contractorId=Y&status=Z
export async function listCertificates(req: Request, res: Response): Promise<void> {
  const projectId = req.query.projectId as string | undefined;
  if (!projectId) {
    res.status(400).json({ error: "projectId es requerido" });
    return;
  }
  if (!(await assertMember(req.user!.userId, projectId, res))) return;

  const where: Record<string, unknown> = { projectId };
  if (req.query.contractorId) where.contractorId = req.query.contractorId;
  if (req.query.status) where.status = req.query.status;

  const certificates = await prisma.certificate.findMany({
    where,
    orderBy: { certificateNumber: "desc" },
    include: {
      contractor: { select: { name: true } },
      _count: { select: { items: true } },
    },
  });

  res.json(
    certificates.map((c) => ({
      id: c.id,
      projectId: c.projectId,
      contractorId: c.contractorId,
      contractorName: c.contractor.name,
      certificateNumber: c.certificateNumber,
      periodStart: c.periodStart,
      periodEnd: c.periodEnd,
      status: c.status,
      totalAmount: Number(c.totalAmount),
      itemCount: c._count.items,
      submittedAt: c.submittedAt,
      approvedAt: c.approvedAt,
      createdAt: c.createdAt,
    }))
  );
}

// GET /api/certificates/:id
export async function getCertificate(req: Request, res: Response): Promise<void> {
  const id = routeParam(req, "id");

  const cert = await prisma.certificate.findUnique({
    where: { id },
    include: {
      contractor: { select: { name: true } },
      project: { select: { name: true } },
      items: {
        include: {
          budgetItem: {
            select: { name: true, unit: true, quantity: true, category: { select: { name: true } } },
          },
        },
        orderBy: { budgetItem: { sortOrder: "asc" } },
      },
      payments: { select: { id: true, amount: true, status: true, createdAt: true } },
    },
  });

  if (!cert) {
    res.status(404).json({ error: "Certificación no encontrada" });
    return;
  }
  if (!(await assertMember(req.user!.userId, cert.projectId, res))) return;

  res.json({
    id: cert.id,
    projectId: cert.projectId,
    projectName: cert.project.name,
    contractorId: cert.contractorId,
    contractorName: cert.contractor.name,
    certificateNumber: cert.certificateNumber,
    periodStart: cert.periodStart,
    periodEnd: cert.periodEnd,
    status: cert.status,
    notes: cert.notes,
    totalAmount: Number(cert.totalAmount),
    submittedAt: cert.submittedAt,
    approvedAt: cert.approvedAt,
    rejectedAt: cert.rejectedAt,
    rejectionReason: cert.rejectionReason,
    createdAt: cert.createdAt,
    items: cert.items.map((i) => ({
      id: i.id,
      budgetItemId: i.budgetItemId,
      budgetItemName: i.budgetItem.name,
      categoryName: i.budgetItem.category.name,
      unit: i.budgetItem.unit,
      budgetedQuantity: Number(i.budgetItem.quantity),
      previousQuantity: Number(i.previousQuantity),
      currentQuantity: Number(i.currentQuantity),
      accumulatedQuantity: Number(i.accumulatedQuantity),
      unitPrice: Number(i.unitPrice),
      currentAmount: Number(i.currentAmount),
    })),
    payments: cert.payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      status: p.status,
      createdAt: p.createdAt,
    })),
  });
}

// POST /api/certificates
export async function createCertificate(req: Request, res: Response): Promise<void> {
  const body = req.body as CreateCertificateInput;
  if (!(await assertMember(req.user!.userId, body.projectId, res))) return;

  // Get contractor assignments for this project
  const assignments = await prisma.contractorAssignment.findMany({
    where: {
      contractorId: body.contractorId,
      budgetItem: { category: { projectId: body.projectId } },
    },
    include: {
      budgetItem: { select: { id: true, name: true } },
    },
  });

  if (assignments.length === 0) {
    res.status(400).json({ error: "El contratista no tiene partidas asignadas en este proyecto" });
    return;
  }

  // Calculate next certificate number
  const maxNum = await prisma.certificate.aggregate({
    where: { projectId: body.projectId },
    _max: { certificateNumber: true },
  });
  const certificateNumber = (maxNum._max.certificateNumber ?? 0) + 1;

  // For each assignment, calculate previousQuantity from approved certificates
  const itemsData = await Promise.all(
    assignments.map(async (a) => {
      const prevResult = await prisma.certificateItem.aggregate({
        where: {
          budgetItemId: a.budgetItemId,
          certificate: {
            contractorId: body.contractorId,
            projectId: body.projectId,
            status: "APPROVED",
          },
        },
        _sum: { currentQuantity: true },
      });
      const previousQuantity = Number(prevResult._sum.currentQuantity ?? 0);
      const assignedQty = Number(a.assignedQuantity);
      const unitPrice = assignedQty > 0 ? Number(a.agreedPrice) / assignedQty : 0;

      return {
        budgetItemId: a.budgetItemId,
        previousQuantity,
        currentQuantity: 0,
        accumulatedQuantity: previousQuantity,
        unitPrice: Math.round(unitPrice * 100) / 100,
        currentAmount: 0,
      };
    })
  );

  const cert = await prisma.certificate.create({
    data: {
      projectId: body.projectId,
      contractorId: body.contractorId,
      certificateNumber,
      periodStart: new Date(body.periodStart),
      periodEnd: new Date(body.periodEnd),
      notes: body.notes,
      totalAmount: 0,
      items: { create: itemsData },
    },
    include: {
      contractor: { select: { name: true } },
      _count: { select: { items: true } },
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: req.user!.userId,
      projectId: body.projectId,
      action: "CREATE_CERTIFICATE",
      entityType: "Certificate",
      entityId: cert.id,
      metadata: { certificateNumber, contractorName: cert.contractor.name },
    },
  });

  res.status(201).json({
    id: cert.id,
    certificateNumber: cert.certificateNumber,
    status: cert.status,
    totalAmount: 0,
    itemCount: cert._count.items,
  });
}

// PATCH /api/certificate-items/:itemId
export async function updateCertificateItem(req: Request, res: Response): Promise<void> {
  const itemId = routeParam(req, "itemId");
  const body = req.body as UpdateCertificateItemInput;

  const item = await prisma.certificateItem.findUnique({
    where: { id: itemId },
    include: {
      certificate: { select: { id: true, projectId: true, status: true, contractorId: true } },
      budgetItem: { select: { quantity: true } },
    },
  });
  if (!item) {
    res.status(404).json({ error: "Item de certificación no encontrado" });
    return;
  }
  if (item.certificate.status !== "DRAFT") {
    res.status(409).json({ error: "Solo se pueden editar certificaciones en estado BORRADOR" });
    return;
  }
  if (!(await assertMember(req.user!.userId, item.certificate.projectId, res))) return;

  const previousQty = Number(item.previousQuantity);
  const accumulated = previousQty + body.currentQuantity;
  const currentAmount = Math.round(body.currentQuantity * Number(item.unitPrice) * 100) / 100;

  await prisma.certificateItem.update({
    where: { id: itemId },
    data: {
      currentQuantity: body.currentQuantity,
      accumulatedQuantity: accumulated,
      currentAmount,
    },
  });

  // Recalculate certificate total
  const total = await prisma.certificateItem.aggregate({
    where: { certificateId: item.certificate.id },
    _sum: { currentAmount: true },
  });
  await prisma.certificate.update({
    where: { id: item.certificate.id },
    data: { totalAmount: Number(total._sum.currentAmount ?? 0) },
  });

  res.json({
    id: itemId,
    currentQuantity: body.currentQuantity,
    accumulatedQuantity: accumulated,
    currentAmount,
    certificateTotal: Number(total._sum.currentAmount ?? 0),
  });
}

// PATCH /api/certificates/:id
export async function updateCertificate(req: Request, res: Response): Promise<void> {
  const id = routeParam(req, "id");
  const body = req.body as UpdateCertificateInput;

  const cert = await prisma.certificate.findUnique({ where: { id } });
  if (!cert) { res.status(404).json({ error: "Certificación no encontrada" }); return; }
  if (cert.status !== "DRAFT") {
    res.status(409).json({ error: "Solo se pueden editar certificaciones en estado BORRADOR" });
    return;
  }
  if (!(await assertMember(req.user!.userId, cert.projectId, res))) return;

  const updated = await prisma.certificate.update({
    where: { id },
    data: {
      ...(body.periodStart ? { periodStart: new Date(body.periodStart) } : {}),
      ...(body.periodEnd ? { periodEnd: new Date(body.periodEnd) } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: req.user!.userId,
      projectId: cert.projectId,
      action: "UPDATE_CERTIFICATE",
      entityType: "Certificate",
      entityId: id,
      metadata: { changes: body },
    },
  });

  res.json({ id: updated.id, status: updated.status });
}

// DELETE /api/certificates/:id
export async function deleteCertificate(req: Request, res: Response): Promise<void> {
  const id = routeParam(req, "id");

  const cert = await prisma.certificate.findUnique({ where: { id } });
  if (!cert) { res.status(404).json({ error: "Certificación no encontrada" }); return; }
  if (cert.status !== "DRAFT") {
    res.status(409).json({ error: "Solo se pueden eliminar certificaciones en estado BORRADOR" });
    return;
  }
  if (!(await assertMember(req.user!.userId, cert.projectId, res))) return;

  await prisma.certificate.delete({ where: { id } });

  await prisma.activityLog.create({
    data: {
      userId: req.user!.userId,
      projectId: cert.projectId,
      action: "DELETE_CERTIFICATE",
      entityType: "Certificate",
      entityId: id,
      metadata: { certificateNumber: cert.certificateNumber },
    },
  });

  res.status(204).send();
}

// POST /api/certificates/:id/submit
export async function submitCertificate(req: Request, res: Response): Promise<void> {
  const id = routeParam(req, "id");

  const cert = await prisma.certificate.findUnique({
    where: { id },
    include: { items: { select: { currentQuantity: true } } },
  });
  if (!cert) { res.status(404).json({ error: "Certificación no encontrada" }); return; }
  if (cert.status !== "DRAFT") {
    res.status(409).json({ error: "Solo se pueden enviar certificaciones en estado BORRADOR" });
    return;
  }
  if (!(await assertMember(req.user!.userId, cert.projectId, res))) return;

  const hasItems = cert.items.some((i) => Number(i.currentQuantity) > 0);
  if (!hasItems) {
    res.status(400).json({ error: "Debe haber al menos una partida con cantidad mayor a 0" });
    return;
  }

  await prisma.certificate.update({
    where: { id },
    data: { status: "SUBMITTED", submittedAt: new Date() },
  });

  await prisma.activityLog.create({
    data: {
      userId: req.user!.userId,
      projectId: cert.projectId,
      action: "SUBMIT_CERTIFICATE",
      entityType: "Certificate",
      entityId: id,
      metadata: { certificateNumber: cert.certificateNumber, totalAmount: Number(cert.totalAmount) },
    },
  });

  res.json({ id, status: "SUBMITTED" });
}

// POST /api/certificates/:id/approve
export async function approveCertificate(req: Request, res: Response): Promise<void> {
  const id = routeParam(req, "id");

  const cert = await prisma.certificate.findUnique({ where: { id } });
  if (!cert) { res.status(404).json({ error: "Certificación no encontrada" }); return; }
  if (cert.status !== "SUBMITTED") {
    res.status(409).json({ error: "Solo se pueden aprobar certificaciones en estado ENVIADA" });
    return;
  }
  if (!(await assertEditorOrAdmin(req.user!.userId, cert.projectId, res))) return;

  await prisma.certificate.update({
    where: { id },
    data: { status: "APPROVED", approvedAt: new Date() },
  });

  await prisma.activityLog.create({
    data: {
      userId: req.user!.userId,
      projectId: cert.projectId,
      action: "APPROVE_CERTIFICATE",
      entityType: "Certificate",
      entityId: id,
      metadata: { certificateNumber: cert.certificateNumber },
    },
  });

  res.json({ id, status: "APPROVED" });
}

// POST /api/certificates/:id/reject
export async function rejectCertificate(req: Request, res: Response): Promise<void> {
  const id = routeParam(req, "id");
  const body = req.body as RejectCertificateInput;

  const cert = await prisma.certificate.findUnique({ where: { id } });
  if (!cert) { res.status(404).json({ error: "Certificación no encontrada" }); return; }
  if (cert.status !== "SUBMITTED") {
    res.status(409).json({ error: "Solo se pueden rechazar certificaciones en estado ENVIADA" });
    return;
  }
  if (!(await assertEditorOrAdmin(req.user!.userId, cert.projectId, res))) return;

  await prisma.certificate.update({
    where: { id },
    data: { status: "REJECTED", rejectedAt: new Date(), rejectionReason: body.reason },
  });

  await prisma.activityLog.create({
    data: {
      userId: req.user!.userId,
      projectId: cert.projectId,
      action: "REJECT_CERTIFICATE",
      entityType: "Certificate",
      entityId: id,
      metadata: { certificateNumber: cert.certificateNumber, reason: body.reason },
    },
  });

  res.json({ id, status: "REJECTED" });
}

// POST /api/certificates/:id/resubmit
export async function resubmitCertificate(req: Request, res: Response): Promise<void> {
  const id = routeParam(req, "id");

  const cert = await prisma.certificate.findUnique({ where: { id } });
  if (!cert) { res.status(404).json({ error: "Certificación no encontrada" }); return; }
  if (cert.status !== "REJECTED") {
    res.status(409).json({ error: "Solo se pueden reenviar certificaciones rechazadas" });
    return;
  }
  if (!(await assertMember(req.user!.userId, cert.projectId, res))) return;

  await prisma.certificate.update({
    where: { id },
    data: { status: "DRAFT", rejectedAt: null, rejectionReason: null, submittedAt: null },
  });

  await prisma.activityLog.create({
    data: {
      userId: req.user!.userId,
      projectId: cert.projectId,
      action: "RESUBMIT_CERTIFICATE",
      entityType: "Certificate",
      entityId: id,
      metadata: { certificateNumber: cert.certificateNumber },
    },
  });

  res.json({ id, status: "DRAFT" });
}

// POST /api/certificates/:id/generate-payment
export async function generatePayment(req: Request, res: Response): Promise<void> {
  const id = routeParam(req, "id");

  const cert = await prisma.certificate.findUnique({
    where: { id },
    include: { payments: { select: { id: true } }, contractor: { select: { name: true } } },
  });
  if (!cert) { res.status(404).json({ error: "Certificación no encontrada" }); return; }
  if (cert.status !== "APPROVED") {
    res.status(409).json({ error: "Solo se pueden generar pagos de certificaciones aprobadas" });
    return;
  }
  if (!(await assertEditorOrAdmin(req.user!.userId, cert.projectId, res))) return;

  if (cert.payments.length > 0) {
    res.status(409).json({ error: "Ya existe un pago generado para esta certificación" });
    return;
  }

  const payment = await prisma.payment.create({
    data: {
      projectId: cert.projectId,
      contractorId: cert.contractorId,
      certificateId: cert.id,
      amount: cert.totalAmount,
      status: "PENDING",
      description: `Certificación #${cert.certificateNumber} — ${cert.contractor.name}`,
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: req.user!.userId,
      projectId: cert.projectId,
      action: "GENERATE_CERTIFICATE_PAYMENT",
      entityType: "Payment",
      entityId: payment.id,
      metadata: { certificateNumber: cert.certificateNumber, amount: Number(cert.totalAmount) },
    },
  });

  await recalcBudgetSummary(cert.projectId);

  res.status(201).json({
    paymentId: payment.id,
    amount: Number(payment.amount),
    status: payment.status,
  });
}
