import { Request, Response } from "express";
import prisma from "../../config/prisma.js";
import { CreateContractorInput, UpdateContractorInput } from "./contractors.schema.js";
import {
  getContractorFinancialSummary,
  getContractorAssignments,
  getContractorPaymentsGrouped,
} from "../../services/contractors.service.js";

function queryString(val: unknown): string | undefined {
  if (typeof val === "string") return val;
  return undefined;
}

function paramId(req: Request): string {
  const id = req.params.id;
  return typeof id === "string" ? id : String(id);
}

// ============================================================================
// GET /api/contractors — Listar con filtros
// ============================================================================
export async function listContractors(req: Request, res: Response): Promise<void> {
  const search = queryString(req.query.search);
  const isActiveParam = queryString(req.query.isActive);
  const projectId = queryString(req.query.projectId);
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  const where: Record<string, unknown> = {};
  if (search) where.name = { contains: search, mode: "insensitive" };
  if (isActiveParam !== undefined) where.isActive = isActiveParam === "true";
  if (projectId) where.projects = { some: { projectId } };

  const skip = (page - 1) * limit;

  const [contractors, total] = await Promise.all([
    prisma.contractor.findMany({
      where,
      include: {
        _count: { select: { projects: true, assignments: true, payments: true } },
      },
      orderBy: { name: "asc" },
      skip,
      take: limit,
    }),
    prisma.contractor.count({ where }),
  ]);

  res.json({
    data: contractors,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// ============================================================================
// GET /api/contractors/:id — Detalle completo con resumen financiero
// ============================================================================
export async function getContractor(req: Request, res: Response): Promise<void> {
  const id = paramId(req);

  // 3 queries en paralelo: datos base + financiero + asignaciones
  const [contractor, financial, assignments] = await Promise.all([
    prisma.contractor.findUnique({
      where: { id },
      include: {
        projects: {
          include: {
            project: { select: { id: true, name: true, status: true } },
          },
        },
      },
    }),
    getContractorFinancialSummary(id),
    getContractorAssignments(id),
  ]);

  if (!contractor) {
    res.status(404).json({ error: "Contratista no encontrado" });
    return;
  }

  res.json({
    ...contractor,
    financial,
    assignments,
  });
}

// ============================================================================
// POST /api/contractors — Crear
// ============================================================================
export async function createContractor(req: Request, res: Response): Promise<void> {
  const data: CreateContractorInput = req.body;

  const contractor = await prisma.contractor.create({
    data: {
      name: data.name,
      contactName: data.contactName,
      email: data.email,
      phone: data.phone,
      taxId: data.taxId,
      address: data.address,
      notes: data.notes,
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: req.user?.userId,
      action: "CREATE_CONTRACTOR",
      entityType: "Contractor",
      entityId: contractor.id,
      metadata: { name: data.name },
    },
  });

  res.status(201).json(contractor);
}

// ============================================================================
// PATCH /api/contractors/:id — Actualizar
// ============================================================================
export async function updateContractor(req: Request, res: Response): Promise<void> {
  const data: UpdateContractorInput = req.body;
  const id = paramId(req);

  const existing = await prisma.contractor.findUnique({ where: { id } });

  if (!existing) {
    res.status(404).json({ error: "Contratista no encontrado" });
    return;
  }

  const contractor = await prisma.contractor.update({
    where: { id },
    data,
  });

  await prisma.activityLog.create({
    data: {
      userId: req.user?.userId,
      action: "UPDATE_CONTRACTOR",
      entityType: "Contractor",
      entityId: contractor.id,
      metadata: { changes: data },
    },
  });

  res.json(contractor);
}

// ============================================================================
// DELETE /api/contractors/:id — Soft delete
// ============================================================================
export async function deleteContractor(req: Request, res: Response): Promise<void> {
  const id = paramId(req);
  const existing = await prisma.contractor.findUnique({ where: { id } });

  if (!existing) {
    res.status(404).json({ error: "Contratista no encontrado" });
    return;
  }

  await prisma.contractor.update({
    where: { id },
    data: { isActive: false },
  });

  await prisma.activityLog.create({
    data: {
      userId: req.user?.userId,
      action: "DELETE_CONTRACTOR",
      entityType: "Contractor",
      entityId: id,
      metadata: { name: existing.name },
    },
  });

  res.status(204).send();
}

// ============================================================================
// GET /api/contractors/:id/financial — Resumen financiero completo
// ============================================================================
export async function getFinancialSummary(req: Request, res: Response): Promise<void> {
  const summary = await getContractorFinancialSummary(paramId(req));

  if (!summary) {
    res.status(404).json({ error: "Contratista no encontrado" });
    return;
  }

  res.json(summary);
}

// ============================================================================
// GET /api/contractors/:id/assignments — Partidas asignadas con progreso
// ============================================================================
export async function getAssignments(req: Request, res: Response): Promise<void> {
  const id = paramId(req);
  const projectId = queryString(req.query.projectId);

  const exists = await prisma.contractor.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!exists) {
    res.status(404).json({ error: "Contratista no encontrado" });
    return;
  }

  const assignments = await getContractorAssignments(id, projectId);
  res.json(assignments);
}

// ============================================================================
// GET /api/contractors/:id/payments — Historial agrupado por proyecto
// ============================================================================
export async function getPaymentsGrouped(req: Request, res: Response): Promise<void> {
  const id = paramId(req);

  const exists = await prisma.contractor.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!exists) {
    res.status(404).json({ error: "Contratista no encontrado" });
    return;
  }

  const grouped = await getContractorPaymentsGrouped(id);
  res.json(grouped);
}
