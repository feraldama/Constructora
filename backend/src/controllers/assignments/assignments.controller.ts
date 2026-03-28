import { Request, Response } from "express";
import prisma from "../../config/prisma.js";
import type { CreateAssignmentInput, UpdateAssignmentInput } from "./assignments.schema.js";
import {
  getAssignmentFinancials,
  getProjectAssignmentsSummary,
  getProjectContractorStats,
  getProjectItemCosts,
} from "../../services/assignments.service.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function routeParam(req: Request, key: string): string {
  const v = req.params[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return String(v[0]);
  return String(v);
}

function queryParam(req: Request, key: string): string | undefined {
  const v = req.query[key];
  return typeof v === "string" ? v : undefined;
}

/** Verifica que el usuario autenticado sea miembro del proyecto. */
async function assertMember(
  userId: string,
  projectId: string,
  res: Response
): Promise<boolean> {
  const m = await prisma.projectMember.findFirst({
    where: { userId, projectId },
  });
  if (!m) {
    res.status(403).json({ error: "Sin acceso a este proyecto" });
    return false;
  }
  return true;
}

/**
 * Calcula la suma de assignedQuantity de todas las asignaciones de una partida,
 * excluyendo opcionalmente una asignación (útil al actualizar).
 */
async function getTotalAssigned(
  budgetItemId: string,
  excludeAssignmentId?: string
): Promise<number> {
  const result = await prisma.contractorAssignment.aggregate({
    where: {
      budgetItemId,
      ...(excludeAssignmentId ? { id: { not: excludeAssignmentId } } : {}),
    },
    _sum: { assignedQuantity: true },
  });
  return Number(result._sum.assignedQuantity ?? 0);
}

// ─── Raw-query type para el listado enriquecido ───────────────────────────────

interface AssignmentRow {
  id: string;
  contractor_id: string;
  budget_item_id: string;
  assigned_quantity: string;
  agreed_price: string;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  contractor_name: string;
  contractor_email: string | null;
  contractor_phone: string | null;
  contractor_is_active: boolean;
  budget_item_name: string;
  category_name: string;
  project_id: string;
  total_paid: string;
  total_pending: string;
}

function serializeRow(r: AssignmentRow) {
  const agreedPrice = Number(r.agreed_price);
  const totalPaid = Number(r.total_paid);
  const totalPending = Number(r.total_pending);
  const remaining = agreedPrice - totalPaid - totalPending;

  return {
    id: r.id,
    contractorId: r.contractor_id,
    budgetItemId: r.budget_item_id,
    assignedQuantity: Number(r.assigned_quantity),
    agreedPrice,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    contractor: {
      id: r.contractor_id,
      name: r.contractor_name,
      email: r.contractor_email,
      phone: r.contractor_phone,
      isActive: r.contractor_is_active,
    },
    budgetItem: {
      id: r.budget_item_id,
      name: r.budget_item_name,
      categoryName: r.category_name,
      projectId: r.project_id,
    },
    financials: {
      totalPaid,
      totalPending,
      remaining,
      paidPercent:
        agreedPrice > 0 ? Math.round((totalPaid / agreedPrice) * 100) : 0,
    },
  };
}

// ─── SQL compartido ───────────────────────────────────────────────────────────

const ENRICHED_SELECT = `
  SELECT
    ca.id,
    ca.contractor_id,
    ca.budget_item_id,
    ca.assigned_quantity,
    ca.agreed_price,
    ca.notes,
    ca.created_at,
    ca.updated_at,
    c.name        AS contractor_name,
    c.email       AS contractor_email,
    c.phone       AS contractor_phone,
    c.is_active   AS contractor_is_active,
    bi.name       AS budget_item_name,
    cat.name      AS category_name,
    cat.project_id,
    COALESCE(SUM(CASE WHEN p.status = 'PAID'                     THEN p.amount END), 0) AS total_paid,
    COALESCE(SUM(CASE WHEN p.status IN ('PENDING','OVERDUE')     THEN p.amount END), 0) AS total_pending
  FROM contractor_assignments ca
  INNER JOIN contractors  c   ON c.id   = ca.contractor_id
  INNER JOIN budget_items bi  ON bi.id  = ca.budget_item_id
  INNER JOIN categories   cat ON cat.id = bi.category_id
  LEFT  JOIN payments     p   ON p.contractor_id  = ca.contractor_id
                              AND p.budget_item_id = ca.budget_item_id
`;

// ─── POST /api/assignments ────────────────────────────────────────────────────

export async function createAssignment(req: Request, res: Response): Promise<void> {
  const body = req.body as CreateAssignmentInput;
  const userId = req.user!.userId;

  // 1. Traer la partida para obtener projectId y quantity
  const budgetItem = await prisma.budgetItem.findUnique({
    where: { id: body.budgetItemId },
    include: { category: { select: { projectId: true } } },
  });
  if (!budgetItem) {
    res.status(404).json({ error: "Partida no encontrada" });
    return;
  }
  const projectId = budgetItem.category.projectId;

  // 2. Verificar acceso al proyecto
  if (!(await assertMember(userId, projectId, res))) return;

  // 3. Verificar que el contratista exista y esté activo
  const contractor = await prisma.contractor.findUnique({
    where: { id: body.contractorId },
    select: { id: true, name: true, isActive: true },
  });
  if (!contractor) {
    res.status(404).json({ error: "Contratista no encontrado" });
    return;
  }
  if (!contractor.isActive) {
    res.status(400).json({ error: "El contratista está inactivo y no puede ser asignado" });
    return;
  }

  // 4. Detectar duplicado antes de tocar la DB (mejor mensaje de error que la excepción de unique)
  const exists = await prisma.contractorAssignment.findUnique({
    where: {
      contractorId_budgetItemId: {
        contractorId: body.contractorId,
        budgetItemId: body.budgetItemId,
      },
    },
  });
  if (exists) {
    res.status(409).json({
      error: "Este contratista ya está asignado a esa partida",
      assignmentId: exists.id,
    });
    return;
  }

  // 5. Validar que la cantidad asignada no supere la cantidad total de la partida
  const itemQuantity = Number(budgetItem.quantity);
  const alreadyAssigned = await getTotalAssigned(body.budgetItemId);
  const remaining = itemQuantity - alreadyAssigned;
  if (body.assignedQuantity > remaining) {
    res.status(400).json({
      error: `La cantidad asignada (${body.assignedQuantity}) supera la disponible en la partida (${remaining} de ${itemQuantity})`,
      available: remaining,
      itemQuantity,
      alreadyAssigned,
    });
    return;
  }

  // 6. Crear la asignación
  const assignment = await prisma.contractorAssignment.create({
    data: {
      contractorId: body.contractorId,
      budgetItemId: body.budgetItemId,
      assignedQuantity: body.assignedQuantity,
      agreedPrice: body.agreedPrice,
      notes: body.notes,
    },
  });

  // 7. Vincular contratista al proyecto si no estaba (upsert seguro)
  await prisma.projectContractor.upsert({
    where: {
      projectId_contractorId: { projectId, contractorId: body.contractorId },
    },
    create: { projectId, contractorId: body.contractorId },
    update: {},
  });

  // 8. Registrar actividad
  await prisma.activityLog.create({
    data: {
      userId,
      projectId,
      action: "CREATE_ASSIGNMENT",
      entityType: "ContractorAssignment",
      entityId: assignment.id,
      metadata: {
        contractorId: body.contractorId,
        contractorName: contractor.name,
        budgetItemId: body.budgetItemId,
        budgetItemName: budgetItem.name,
        assignedQuantity: body.assignedQuantity,
        agreedPrice: body.agreedPrice,
      },
    },
  });

  res.status(201).json({
    ...assignment,
    assignedQuantity: Number(assignment.assignedQuantity),
    agreedPrice: Number(assignment.agreedPrice),
  });
}

// ─── PATCH /api/assignments/:assignmentId ─────────────────────────────────────

export async function updateAssignment(req: Request, res: Response): Promise<void> {
  const assignmentId = routeParam(req, "assignmentId");
  const body = req.body as UpdateAssignmentInput;
  const userId = req.user!.userId;

  // 1. Traer asignación con contexto de proyecto
  const existing = await prisma.contractorAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      budgetItem: {
        include: { category: { select: { projectId: true } } },
      },
      contractor: { select: { name: true } },
    },
  });
  if (!existing) {
    res.status(404).json({ error: "Asignación no encontrada" });
    return;
  }
  const projectId = existing.budgetItem.category.projectId;

  // 2. Verificar acceso
  if (!(await assertMember(userId, projectId, res))) return;

  // 3. Si se actualiza la cantidad, validar que no supere la disponible
  if (body.assignedQuantity !== undefined) {
    const itemQuantity = Number(existing.budgetItem.quantity);
    const alreadyAssigned = await getTotalAssigned(existing.budgetItemId, assignmentId);
    const remaining = itemQuantity - alreadyAssigned;
    if (body.assignedQuantity > remaining) {
      res.status(400).json({
        error: `La cantidad (${body.assignedQuantity}) supera la disponible (${remaining} de ${itemQuantity})`,
        available: remaining,
        itemQuantity,
        alreadyAssigned,
      });
      return;
    }
  }

  // 4. Actualizar
  const updated = await prisma.contractorAssignment.update({
    where: { id: assignmentId },
    data: body,
  });

  // 5. Registrar actividad
  await prisma.activityLog.create({
    data: {
      userId,
      projectId,
      action: "UPDATE_ASSIGNMENT",
      entityType: "ContractorAssignment",
      entityId: assignmentId,
      metadata: { changes: body, contractorName: existing.contractor.name },
    },
  });

  res.json({
    ...updated,
    assignedQuantity: Number(updated.assignedQuantity),
    agreedPrice: Number(updated.agreedPrice),
  });
}

// ─── DELETE /api/assignments/:assignmentId ────────────────────────────────────

export async function deleteAssignment(req: Request, res: Response): Promise<void> {
  const assignmentId = routeParam(req, "assignmentId");
  const userId = req.user!.userId;

  // 1. Traer asignación
  const existing = await prisma.contractorAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      budgetItem: {
        include: { category: { select: { projectId: true } } },
      },
      contractor: { select: { name: true } },
    },
  });
  if (!existing) {
    res.status(404).json({ error: "Asignación no encontrada" });
    return;
  }
  const projectId = existing.budgetItem.category.projectId;

  // 2. Verificar acceso
  if (!(await assertMember(userId, projectId, res))) return;

  // 3. Bloquear si tiene pagos activos (PENDING o PAID)
  //    PAID: ya se pagó, no se puede deshacer sin anular el pago primero.
  //    PENDING: hay un compromiso financiero registrado.
  const activePayments = await prisma.payment.count({
    where: {
      contractorId: existing.contractorId,
      budgetItemId: existing.budgetItemId,
      status: { in: ["PENDING", "PAID"] },
    },
  });
  if (activePayments > 0) {
    res.status(409).json({
      error: `No se puede eliminar la asignación: tiene ${activePayments} pago${activePayments > 1 ? "s" : ""} activo${activePayments > 1 ? "s" : ""} (PENDING o PAID). Cancelá los pagos primero.`,
      activePayments,
    });
    return;
  }

  // 4. Eliminar (los pagos CANCELLED/OVERDUE quedan huérfanos de budgetItemId → onDelete: SetNull los limpia)
  await prisma.contractorAssignment.delete({ where: { id: assignmentId } });

  // 5. Registrar actividad
  await prisma.activityLog.create({
    data: {
      userId,
      projectId,
      action: "DELETE_ASSIGNMENT",
      entityType: "ContractorAssignment",
      entityId: assignmentId,
      metadata: {
        contractorName: existing.contractor.name,
        budgetItemName: existing.budgetItem.name,
        agreedPrice: Number(existing.agreedPrice),
      },
    },
  });

  res.status(204).send();
}

// ─── GET /api/assignments?budgetItemId=X ─────────────────────────────────────

export async function listByBudgetItem(req: Request, res: Response): Promise<void> {
  const budgetItemId = queryParam(req, "budgetItemId");
  const userId = req.user!.userId;

  if (!budgetItemId) {
    res.status(400).json({ error: "Se requiere el parámetro budgetItemId" });
    return;
  }

  // Verificar acceso al proyecto de la partida
  const budgetItem = await prisma.budgetItem.findUnique({
    where: { id: budgetItemId },
    include: { category: { select: { projectId: true } } },
  });
  if (!budgetItem) {
    res.status(404).json({ error: "Partida no encontrada" });
    return;
  }
  if (!(await assertMember(userId, budgetItem.category.projectId, res))) return;

  const rows = await prisma.$queryRawUnsafe<AssignmentRow[]>(
    `${ENRICHED_SELECT}
     WHERE ca.budget_item_id = $1
     GROUP BY ca.id, c.id, bi.id, cat.id
     ORDER BY ca.created_at ASC`,
    budgetItemId
  );

  // Calcular cuánta cantidad total tiene la partida y cuánto ya está asignado
  const itemQuantity = Number(budgetItem.quantity);
  const totalAssigned = rows.reduce((s, r) => s + Number(r.assigned_quantity), 0);

  res.json({
    budgetItem: {
      id: budgetItem.id,
      name: budgetItem.name,
      quantity: itemQuantity,
      totalAssigned,
      availableQuantity: itemQuantity - totalAssigned,
    },
    assignments: rows.map(serializeRow),
  });
}

// ─── GET /api/assignments?contractorId=X&projectId=Y ─────────────────────────

export async function listByContractor(req: Request, res: Response): Promise<void> {
  const contractorId = queryParam(req, "contractorId");
  const projectId = queryParam(req, "projectId");
  const userId = req.user!.userId;

  if (!contractorId) {
    res.status(400).json({ error: "Se requiere el parámetro contractorId" });
    return;
  }

  // Si se filtra por proyecto, verificar acceso. Si no, devolver todos los proyectos accesibles.
  if (projectId) {
    if (!(await assertMember(userId, projectId, res))) return;
  }

  const whereClause = projectId
    ? "WHERE ca.contractor_id = $1 AND cat.project_id = $2"
    : `WHERE ca.contractor_id = $1
       AND cat.project_id IN (
         SELECT project_id FROM project_members WHERE user_id = $2
       )`;

  const param2 = projectId ?? userId;

  const rows = await prisma.$queryRawUnsafe<AssignmentRow[]>(
    `${ENRICHED_SELECT}
     ${whereClause}
     GROUP BY ca.id, c.id, bi.id, cat.id
     ORDER BY cat.project_id, ca.created_at ASC`,
    contractorId,
    param2
  );

  res.json(rows.map(serializeRow));
}

// ─── GET /api/assignments — dispatcher ───────────────────────────────────────
// Un único handler que delega según los query params presentes.

export async function listAssignments(req: Request, res: Response): Promise<void> {
  const budgetItemId = queryParam(req, "budgetItemId");
  const contractorId = queryParam(req, "contractorId");

  if (budgetItemId) return listByBudgetItem(req, res);
  if (contractorId) return listByContractor(req, res);

  res.status(400).json({
    error: "Especificá budgetItemId o contractorId como query param",
  });
}

// ─── GET /api/assignments/:assignmentId ──────────────────────────────────────

export async function getAssignment(req: Request, res: Response): Promise<void> {
  const assignmentId = routeParam(req, "assignmentId");
  const userId = req.user!.userId;

  const detail = await getAssignmentFinancials(assignmentId);
  if (!detail) {
    res.status(404).json({ error: "Asignación no encontrada" });
    return;
  }

  if (!(await assertMember(userId, detail.budgetItem.projectId, res))) return;

  res.json(detail);
}

// ─── GET /api/assignments/project/:projectId/summary ─────────────────────────

export async function getProjectSummary(req: Request, res: Response): Promise<void> {
  const projectId = routeParam(req, "projectId");
  const userId = req.user!.userId;

  if (!(await assertMember(userId, projectId, res))) return;

  const summary = await getProjectAssignmentsSummary(projectId);
  res.json(summary);
}

// ─── GET /api/assignments/project/:projectId/contractors ─────────────────────
// Queries 1-3: deuda por contratista, total pagado, ranking por costo

export async function getProjectContractors(req: Request, res: Response): Promise<void> {
  const projectId = routeParam(req, "projectId");
  const userId = req.user!.userId;

  if (!(await assertMember(userId, projectId, res))) return;

  const stats = await getProjectContractorStats(projectId);
  res.json(stats);
}

// ─── GET /api/assignments/project/:projectId/items ───────────────────────────
// Query 4: costos por partida con varianza vs presupuesto

export async function getProjectItems(req: Request, res: Response): Promise<void> {
  const projectId = routeParam(req, "projectId");
  const userId = req.user!.userId;

  if (!(await assertMember(userId, projectId, res))) return;

  const costs = await getProjectItemCosts(projectId);
  res.json(costs);
}
