import { Request, Response } from "express";
import prisma from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { CreatePaymentInput, UpdatePaymentInput, paymentFiltersSchema } from "./payments.schema.js";
import {
  validatePaymentAmount,
  getRemainingDebt,
  getAssignmentFinancialContext,
  markOverduePayments,
  getDashboardSummary,
  getContractorDebts,
  recalcBudgetSummary,
  checkDuplicatePayment,
  type AssignmentFinancialContext,
} from "../../services/payments.service.js";
import {
  getProjectedCashFlow,
  getPaymentPredictions,
  getCriticalDebtAlerts,
} from "../../services/cash-flow.service.js";
import {
  resolveInitialStatus,
  resolvePaidAt,
  validateTransition,
  type PaymentStatus,
} from "../../services/payment-state.service.js";

// ============================================================================
// HELPERS INTERNOS
// ============================================================================

/**
 * Error tipado para lanzar dentro de transacciones Prisma.
 * Permite transmitir statusCode y payload extra hasta el catch del controller.
 */
class PaymentError extends Error {
  constructor(
    message:                           string,
    public readonly statusCode:        number,
    public readonly payload?:          Record<string, unknown>
  ) {
    super(message);
    this.name = "PaymentError";
  }
}

/**
 * Valida la coherencia temporal de las fechas de un pago.
 *
 * Reglas:
 *   1. paymentDate no puede ser futura (tolerancia de 10 min por desfase de reloj)
 *   2. paymentDate no puede ser anterior a hace 10 años
 *   3. dueDate no puede exceder 5 años en el futuro
 *   4. dueDate no puede ser anterior a paymentDate (si ambas están presentes)
 *
 * Devuelve el primer error encontrado, o null si todo es coherente.
 */
function validatePaymentDates(paymentDate?: string, dueDate?: string): string | null {
  const now = new Date();

  if (paymentDate) {
    const pd = new Date(paymentDate);
    if (pd.getTime() > now.getTime() + 10 * 60 * 1_000) {
      return "paymentDate no puede ser una fecha futura";
    }
    const maxPast = new Date(now);
    maxPast.setFullYear(now.getFullYear() - 10);
    if (pd < maxPast) {
      return "paymentDate es demasiado antigua (más de 10 años)";
    }
  }

  if (dueDate) {
    const dd = new Date(dueDate);
    const maxFuture = new Date(now);
    maxFuture.setFullYear(now.getFullYear() + 5);
    if (dd > maxFuture) {
      return "dueDate es demasiado lejana (más de 5 años en el futuro)";
    }
    if (paymentDate) {
      const pd = new Date(paymentDate);
      if (dd < pd) {
        return "dueDate no puede ser anterior a paymentDate";
      }
    }
  }

  return null;
}

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
  // ── 1. Validar query params ────────────────────────────────────────────────
  const parsed = paymentFiltersSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Parámetros inválidos", details: parsed.error.flatten() });
    return;
  }

  const {
    projectId,
    contractorId,
    budgetItemId,
    status,
    dateField,
    dateFrom,
    dateTo,
    amountMin,
    amountMax,
    orderBy,
    order,
    page,
    limit,
  } = parsed.data;

  // ── 2. Construir where tipado ──────────────────────────────────────────────
  const where: Prisma.PaymentWhereInput = {};

  // Acceso: si no se filtra por proyecto, restringir a proyectos del usuario
  if (projectId) {
    where.projectId = projectId;
  } else {
    where.project = {
      members: { some: { userId: req.user!.userId } },
    };
  }

  if (contractorId) where.contractorId = contractorId;
  if (budgetItemId) where.budgetItemId = budgetItemId;

  // Status: uno o varios (CSV "PENDING,OVERDUE" normalizado a string[] por el schema)
  if (status) {
    // status was validated by the Zod schema against paymentStatusValues
    // Cast via unknown to satisfy the strict Prisma enum type
    const statuses = (Array.isArray(status) ? status : [status]) as unknown as import("../../generated/prisma/client.js").PaymentStatus[];
    where.status = statuses.length === 1 ? statuses[0] : { in: statuses };
  }

  // Rango de fechas sobre el campo elegido
  if (dateFrom || dateTo) {
    const range: Prisma.DateTimeNullableFilter = {};
    if (dateFrom) range.gte = new Date(dateFrom);
    if (dateTo)   range.lte = new Date(dateTo);
    (where as Record<string, unknown>)[dateField] = range;
  }

  // Rango de monto
  if (amountMin !== undefined || amountMax !== undefined) {
    const amountRange: Prisma.DecimalFilter = {};
    if (amountMin !== undefined) amountRange.gte = amountMin;
    if (amountMax !== undefined) amountRange.lte = amountMax;
    where.amount = amountRange;
  }

  // ── 3. Ordenamiento dinámico ───────────────────────────────────────────────
  // dueDate y paidAt son nullable — poner nulls al final en ambas direcciones
  type SortDir = "asc" | "desc";
  const nullableFields = new Set(["dueDate", "paidAt"]);
  const orderByClause: Prisma.PaymentOrderByWithRelationInput = nullableFields.has(orderBy)
    ? { [orderBy]: { sort: order as SortDir, nulls: "last" } }
    : { [orderBy]: order as SortDir };

  const skip = (page - 1) * limit;

  // ── 4. Consulta paralela: lista + total + resumen por estado ──────────────
  const [payments, total, byStatus] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        contractor: { select: { id: true, name: true } },
        budgetItem: { select: { id: true, name: true, unit: true } },
        project:    { select: { id: true, name: true } },
        _count:     { select: { attachments: true } },
      },
      orderBy: orderByClause,
      skip,
      take: limit,
    }),
    prisma.payment.count({ where }),
    prisma.payment.groupBy({
      by: ["status"],
      where,
      _sum:   { amount: true },
      _count: { _all: true },
    }),
  ]);

  // ── 5. Construir summary ───────────────────────────────────────────────────
  const summary = Object.fromEntries(
    byStatus.map((r) => [
      r.status,
      { count: r._count._all, total: Number(r._sum.amount ?? 0) },
    ])
  );

  res.json({
    data: payments,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    summary,
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
// POST /api/payments — Crear pago
// ============================================================================
export async function createPayment(req: Request, res: Response): Promise<void> {
  const data: CreatePaymentInput = req.body;

  // ── 1. Acceso al proyecto ──────────────────────────────────────────────────
  const member = await prisma.projectMember.findFirst({
    where: { userId: req.user!.userId, projectId: data.projectId },
  });
  if (!member) {
    res.status(403).json({ error: "Sin acceso a este proyecto" });
    return;
  }

  // ── 2. Existencia de contratista y partida (paralelo) ─────────────────────
  const [contractor, budgetItem] = await Promise.all([
    prisma.contractor.findUnique({
      where:  { id: data.contractorId },
      select: { id: true, name: true, isActive: true },
    }),
    prisma.budgetItem.findUnique({
      where:  { id: data.budgetItemId },
      select: { id: true, name: true, category: { select: { projectId: true } } },
    }),
  ]);

  if (!contractor)         { res.status(404).json({ error: "Contratista no encontrado" }); return; }
  if (!contractor.isActive){ res.status(400).json({ error: "El contratista está inactivo" }); return; }
  if (!budgetItem)         { res.status(404).json({ error: "Partida no encontrada" }); return; }
  if (budgetItem.category.projectId !== data.projectId) {
    res.status(400).json({ error: "La partida no pertenece a este proyecto" });
    return;
  }

  // ── 3. Validación de fechas coherentes ────────────────────────────────────
  const dateError = validatePaymentDates(data.paymentDate, data.dueDate);
  if (dateError) {
    res.status(400).json({ error: dateError });
    return;
  }

  // ── 4. Detección de duplicados sospechosos ────────────────────────────────
  // Solo aplica para PARTIAL (TOTAL calcula el monto en el momento, no hay "mismo monto")
  if (data.paymentType === "PARTIAL") {
    const dup = await checkDuplicatePayment(
      data.contractorId,
      data.budgetItemId,
      data.projectId,
      data.amount
    );
    if (dup.isDuplicate) {
      res.status(409).json({
        error: "Pago duplicado: ya existe un pago idéntico creado hace menos de 5 minutos",
        existing: dup.existing,
        hint: "Si es intencional, espera unos minutos o usa un monto diferente",
      });
      return;
    }
  }

  // ── 5. Transacción con bloqueo de fila ────────────────────────────────────
  //
  // Problema sin transacción:
  //   Req A lee saldoDisponible = 5 000  →  crea pago de 5 000
  //   Req B lee saldoDisponible = 5 000  →  crea pago de 5 000  ← SOBRE-COMPROMISO
  //
  // Solución — SELECT … FOR UPDATE sobre contractor_assignments:
  //   Req A adquiere el lock  →  Req B bloquea y espera
  //   Req A re-valida, crea el pago y hace commit  →  lock liberado
  //   Req B adquiere el lock  →  re-lee pagos (ya ve el de Req A)  →  saldo = 0  →  error
  //
  type LockRow = { contractor_id: string; agreed_price: string };

  let payment: Awaited<ReturnType<typeof prisma.payment.create>>;
  let saldoAntes: number;

  try {
    ({ payment, saldoAntes } = await prisma.$transaction(
      async (tx) => {
        // a. Bloqueo exclusivo de la fila de asignación
        const locked = await tx.$queryRaw<LockRow[]>`
          SELECT contractor_id, agreed_price
          FROM   contractor_assignments
          WHERE  contractor_id = ${data.contractorId}
            AND  budget_item_id = ${data.budgetItemId}
          FOR UPDATE
        `;

        if (locked.length === 0) {
          throw new PaymentError(
            "El contratista no tiene asignada esta partida",
            409
          );
        }

        // b. Re-validar contexto financiero dentro de la TX
        //    (lecturas usan el cliente de TX → ven el estado bloqueado)
        const totalAcordado = Number(locked[0].agreed_price);

        const byStatus = await tx.payment.groupBy({
          by:    ["status"],
          where: {
            contractorId: data.contractorId,
            budgetItemId: data.budgetItemId,
            status:       { not: "CANCELLED" },
          },
          _sum: { amount: true },
        });

        const sumFor = (s: string) =>
          Number(byStatus.find((r) => r.status === s)?._sum.amount ?? 0);

        const committed      = sumFor("PAID") + sumFor("PENDING") + sumFor("OVERDUE");
        const saldoDisponible = totalAcordado - committed;

        // c. Determinar monto según tipo de pago
        let paymentAmount: number;
        if (data.paymentType === "TOTAL") {
          if (saldoDisponible <= 0) {
            throw new PaymentError(
              "No hay saldo disponible para saldar",
              400,
              { totalAcordado, committed, saldoDisponible }
            );
          }
          paymentAmount = saldoDisponible;
        } else {
          if (data.amount > saldoDisponible) {
            throw new PaymentError(
              "El pago excede el monto acordado",
              400,
              { totalAcordado, committed, saldoDisponible, requested: data.amount }
            );
          }
          paymentAmount = data.amount;
        }

        // d. Estado inicial
        const { status, paidAt: resolvedPaidAt } = resolveInitialStatus(
          data.paymentDate,
          data.dueDate
        );

        // e. Crear el pago dentro de la transacción
        const created = await tx.payment.create({
          data: {
            projectId:     data.projectId,
            contractorId:  data.contractorId,
            budgetItemId:  data.budgetItemId,
            amount:        paymentAmount,
            status,
            paymentMethod: data.paymentMethod,
            description:   data.description,
            invoiceNumber: data.invoiceNumber,
            dueDate:       data.dueDate ? new Date(data.dueDate) : undefined,
            paidAt:        resolvedPaidAt ?? undefined,
          },
          include: {
            contractor: { select: { id: true, name: true } },
            budgetItem: { select: { id: true, name: true } },
            project:    { select: { id: true, name: true } },
          },
        });

        return { payment: created, saldoAntes: saldoDisponible };
      },
      { isolationLevel: "ReadCommitted", timeout: 15_000 }
    ));
  } catch (err) {
    if (err instanceof PaymentError) {
      res.status(err.statusCode).json({ error: err.message, ...err.payload });
      return;
    }
    throw err;
  }

  // ── 6. Post-transacción: operaciones idempotentes ─────────────────────────
  //    recalcBudgetSummary y activityLog no necesitan estar en la TX
  //    (son datos derivados / audit trail — toleran eventual consistency)
  const [, financialContextAfter] = await Promise.all([
    recalcBudgetSummary(data.projectId),
    getAssignmentFinancialContext(data.contractorId, data.budgetItemId),
  ]);

  await prisma.activityLog.create({
    data: {
      userId:     req.user?.userId,
      projectId:  data.projectId,
      action:     "CREATE_PAYMENT",
      entityType: "Payment",
      entityId:   payment.id,
      metadata: {
        amount:        Number(payment.amount),
        paymentType:   data.paymentType,
        paymentMethod: data.paymentMethod,
        status:        payment.status,
        contractorId:   data.contractorId,
        contractorName: contractor.name,
        budgetItemId:   data.budgetItemId,
        budgetItemName: budgetItem.name,
        saldoAntes,
        saldoDespues: financialContextAfter?.saldoDisponible ?? 0,
      },
    },
  });

  // ── 7. Respuesta ───────────────────────────────────────────────────────────
  res.status(201).json({ payment, financialContext: financialContextAfter });
}

// ============================================================================
// PATCH /api/payments/:id — Actualizar pago
// ============================================================================
export async function updatePayment(req: Request, res: Response): Promise<void> {
  const data: UpdatePaymentInput = req.body;
  const paymentId = paramId(req);

  const existing = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!existing) {
    res.status(404).json({ error: "Pago no encontrado" });
    return;
  }

  // ── Validar transición de estado (antes de cualquier escritura) ───────────
  if (data.status && data.status !== existing.status) {
    const transition = validateTransition(
      existing.status as PaymentStatus,
      data.status     as PaymentStatus
    );
    if (!transition.allowed) {
      res.status(400).json({ error: transition.reason });
      return;
    }
  }

  // ── Validar fechas coherentes ──────────────────────────────────────────────
  const dateError = validatePaymentDates(
    data.paidAt  ?? undefined,
    data.dueDate ?? undefined
  );
  if (dateError) {
    res.status(400).json({ error: dateError });
    return;
  }

  // ── ¿Cambia el monto? ──────────────────────────────────────────────────────
  const amountChanges =
    data.amount !== undefined && data.amount !== Number(existing.amount);

  if (amountChanges && !existing.budgetItemId) {
    res.status(400).json({
      error: "Este pago no tiene partida asociada; el monto no puede modificarse",
    });
    return;
  }

  // ── Transacción ───────────────────────────────────────────────────────────
  //
  // Si el monto cambia → SELECT FOR UPDATE para serializar contra createPayment
  //   concurrente sobre la misma asignación (mismo race condition que en create).
  //
  // Si solo cambia el estado / descripción → transacción sin lock
  //   (actualización atómica del registro + recalc).
  //
  let payment: Awaited<ReturnType<typeof prisma.payment.update>>;

  try {
    payment = await prisma.$transaction(
      async (tx) => {
        if (amountChanges) {
          // a. Lock de la fila de asignación
          type LockRow = { agreed_price: string };
          const locked = await tx.$queryRaw<LockRow[]>`
            SELECT agreed_price
            FROM   contractor_assignments
            WHERE  contractor_id  = ${existing.contractorId}
              AND  budget_item_id = ${existing.budgetItemId!}
            FOR UPDATE
          `;
          if (locked.length === 0) {
            throw new PaymentError("Asignación no encontrada", 409);
          }

          // b. Re-validar saldo disponible excluyendo el pago que se edita
          const totalAcordado = Number(locked[0].agreed_price);

          const byStatus = await tx.payment.groupBy({
            by:    ["status"],
            where: {
              contractorId: existing.contractorId,
              budgetItemId: existing.budgetItemId!,
              status:       { not: "CANCELLED" },
              id:           { not: paymentId },          // excluir el propio pago
            },
            _sum: { amount: true },
          });

          const sumFor = (s: string) =>
            Number(byStatus.find((r) => r.status === s)?._sum.amount ?? 0);

          const committed       = sumFor("PAID") + sumFor("PENDING") + sumFor("OVERDUE");
          const saldoDisponible = totalAcordado - committed;

          if (data.amount! > saldoDisponible) {
            throw new PaymentError(
              "El nuevo monto excede el saldo disponible de la asignación",
              400,
              { totalAcordado, committed, saldoDisponible, requested: data.amount }
            );
          }
        }

        // c. Construir objeto de actualización
        const updateData: Record<string, unknown> = { ...data };
        if (data.status === "PAID")      updateData.paidAt  = resolvePaidAt(data.paidAt);
        if (data.status === "CANCELLED") updateData.paidAt  = null;
        if (data.dueDate)                updateData.dueDate = new Date(data.dueDate);

        // d. Actualizar el pago dentro de la TX
        return tx.payment.update({
          where: { id: paymentId },
          data:  updateData,
          include: {
            contractor: { select: { id: true, name: true } },
            project:    { select: { id: true, name: true } },
          },
        });
      },
      { isolationLevel: "ReadCommitted", timeout: 15_000 }
    );
  } catch (err) {
    if (err instanceof PaymentError) {
      res.status(err.statusCode).json({ error: err.message, ...err.payload });
      return;
    }
    throw err;
  }

  // ── Post-transacción ───────────────────────────────────────────────────────
  await recalcBudgetSummary(existing.projectId);

  await prisma.activityLog.create({
    data: {
      userId:     req.user?.userId,
      projectId:  existing.projectId,
      action:     "UPDATE_PAYMENT",
      entityType: "Payment",
      entityId:   payment.id,
      metadata:   { changes: data, previousStatus: existing.status },
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
// GET /api/payments/assignment-context — Contexto financiero pre-pago
// ============================================================================
/**
 * Devuelve el cuadro financiero actual de un ContractorAssignment.
 * Usar antes de crear un pago para mostrar al usuario el estado completo:
 *   totalAcordado, totalPagado, saldoDisponible, etc.
 *
 * Query params: contractorId, budgetItemId
 */
export async function assignmentContext(req: Request, res: Response): Promise<void> {
  const contractorId = queryString(req.query.contractorId);
  const budgetItemId = queryString(req.query.budgetItemId);

  if (!contractorId || !budgetItemId) {
    res.status(400).json({ error: "Se requieren contractorId y budgetItemId" });
    return;
  }

  // Verificar que el usuario tenga acceso al proyecto de la partida
  const budgetItem = await prisma.budgetItem.findUnique({
    where: { id: budgetItemId },
    select: { category: { select: { projectId: true } } },
  });
  if (!budgetItem) {
    res.status(404).json({ error: "Partida no encontrada" });
    return;
  }
  const member = await prisma.projectMember.findFirst({
    where: { userId: req.user!.userId, projectId: budgetItem.category.projectId },
  });
  if (!member) {
    res.status(403).json({ error: "Sin acceso a este proyecto" });
    return;
  }

  const ctx = await getAssignmentFinancialContext(contractorId, budgetItemId);
  if (!ctx) {
    res.status(404).json({
      error: "El contratista no tiene asignada esta partida",
    });
    return;
  }

  res.json(ctx);
}

// ============================================================================
// POST /api/payments/mark-overdue — Marcar vencidos manualmente
// ============================================================================
export async function triggerMarkOverdue(_req: Request, res: Response): Promise<void> {
  const count = await markOverduePayments();
  res.json({ updated: count });
}

// ============================================================================
// GET /api/payments/cash-flow — Flujo de caja proyectado
// ============================================================================
/**
 * Devuelve tres series de datos mensuales:
 *   paid      — salidas reales (PAID, por paidAt)
 *   scheduled — compromisos futuros (PENDING/OVERDUE, por dueDate)
 *   predicted — balance no programado distribuido por modelo predictivo
 *
 * Query param: projectId (requerido)
 */
export async function projectedCashFlow(req: Request, res: Response): Promise<void> {
  const projectId = queryString(req.query.projectId);
  if (!projectId) {
    res.status(400).json({ error: "projectId es requerido" });
    return;
  }

  const result = await getProjectedCashFlow(projectId);
  res.json(result);
}

// ============================================================================
// GET /api/payments/predictions — Predicciones de pagos futuros
// ============================================================================
/**
 * Por cada asignación con balance no programado devuelve:
 *   predictedDate          — fecha estimada del próximo pago
 *   avgDaysBetweenPayments — intervalo histórico usado como base
 *   confidence             — high / medium / none
 *   confidenceReason       — explicación legible del nivel de confianza
 *
 * Query param: projectId (requerido)
 */
export async function paymentPredictions(req: Request, res: Response): Promise<void> {
  const projectId = queryString(req.query.projectId);
  if (!projectId) {
    res.status(400).json({ error: "projectId es requerido" });
    return;
  }

  const result = await getPaymentPredictions(projectId);
  res.json(result);
}

// ============================================================================
// GET /api/payments/debt-alerts — Alertas automáticas de deuda crítica
// ============================================================================
/**
 * Genera alertas priorizadas por severidad:
 *   critical — pagos vencidos >30 días o balance retrasado >2× intervalo
 *   high     — pagos vencidos o balance retrasado >1× intervalo
 *   medium   — balance sin programar o compromiso >90%
 *
 * Incluye totalAtRisk (suma de critical + high) para mostrar en el dashboard.
 *
 * Query param: projectId (requerido)
 */
export async function debtAlerts(req: Request, res: Response): Promise<void> {
  const projectId = queryString(req.query.projectId);
  if (!projectId) {
    res.status(400).json({ error: "projectId es requerido" });
    return;
  }

  const result = await getCriticalDebtAlerts(projectId);
  res.json(result);
}
