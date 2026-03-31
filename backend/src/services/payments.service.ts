import prisma from "../config/prisma.js";
import type { Prisma } from "../generated/prisma/client.js";
import { markOverduePayments as _markOverdue } from "./payment-state.service.js";
// Re-exportar para backward compatibility: callers importan desde payments.service
export { markOverduePayments } from "./payment-state.service.js";
type Decimal = Prisma.Decimal;

// Alias interno para poder llamarla en este mismo módulo
const markOverduePayments = _markOverdue;

// ============================================================================
// TIPOS
// ============================================================================

export interface ContractorDebt {
  contractorId: string;
  contractorName: string;
  totalAgreed: number;
  totalPaid: number;
  totalPending: number;
  remaining: number;
}

export interface ContractorPaymentSummary {
  contractorId:   string;
  contractorName: string;
  paid:           number;
  pending:        number;
  overdue:        number;
  totalCount:     number;
}

export interface MonthlyPaymentSummary {
  /** Formato "YYYY-MM" */
  month:      string;
  paid:       number;
  pending:    number;
  overdue:    number;
  totalCount: number;
}

export interface DashboardSummary {
  // ── Totales globales ───────────────────────────────────────────────────────
  totalPaid:      number;
  totalPending:   number;
  totalOverdue:   number;
  totalCancelled: number;

  // ── Contadores operativos ──────────────────────────────────────────────────
  overdueCount:     number;
  upcomingDueCount: number;

  // ── Desgloses ──────────────────────────────────────────────────────────────
  porContratista: ContractorPaymentSummary[];
  porMes:         MonthlyPaymentSummary[];

  // ── Feed reciente ──────────────────────────────────────────────────────────
  recentPayments: {
    id: string;
    amount: Decimal;
    status: string;
    paidAt: Date | null;
    createdAt: Date;
    contractor: { id: string; name: string };
    project: { id: string; name: string };
  }[];
}

// ============================================================================
// CONTEXTO FINANCIERO DE UNA ASIGNACIÓN
// ============================================================================

/**
 * Cuadro financiero completo de un ContractorAssignment.
 *
 * Semántica de campos:
 *
 *   totalAcordado   — El monto TOTAL pactado en el contrato.
 *                     Se almacena directamente en contractor_assignments.agreed_price.
 *                     ⚠️  NO es precio unitario. La fórmula correcta es:
 *                         totalAcordado = agreedPrice  (directo)
 *                     El precio unitario implícito se puede derivar como:
 *                         precioUnitario = totalAcordado / assignedQuantity
 *
 *   totalPagado     — Suma de pagos con status = PAID.
 *                     Dinero que ya salió de la cuenta.
 *
 *   totalPendiente  — Suma de pagos con status = PENDING.
 *                     Comprometido pero todavía no ejecutado.
 *
 *   totalVencido    — Suma de pagos con status = OVERDUE.
 *                     Comprometido, vencido, sin ejecutar.
 *
 *   committed       — totalPagado + totalPendiente + totalVencido.
 *                     Todo lo que ya está "ocupado" del presupuesto.
 *
 *   saldoDisponible — totalAcordado - committed.
 *                     Cuánto se puede todavía comprometer con un nuevo pago.
 *                     Este es el tope para PARTIAL payments.
 *
 *   saldoPendiente  — totalAcordado - totalPagado.
 *                     Deuda real: lo que el contratista aún no recibió en efectivo
 *                     (incluye programados y vencidos).
 */
export interface AssignmentFinancialContext {
  contractorId:     string;
  budgetItemId:     string;
  assignedQuantity: number;
  /** Monto total acordado — campo directo, no multiplicar por cantidad */
  totalAcordado:    number;
  /** totalAcordado / assignedQuantity — solo informativo */
  precioUnitario:   number;

  totalPagado:      number;
  totalPendiente:   number;
  totalVencido:     number;
  committed:        number;

  saldoDisponible:  number;
  saldoPendiente:   number;

  porcentajePagado:        number;
  porcentajeComprometido:  number;
  estaPagoCompleto:        boolean;
  /** committed > totalAcordado — no debería pasar, pero se detecta */
  estaComprometidoEnExceso: boolean;
}

/**
 * Construye el contexto financiero completo de una asignación.
 *
 * Estrategia: 2 queries en paralelo
 *   1. findUnique  → datos del contrato (assignedQuantity + agreedPrice)
 *   2. groupBy     → 1 scan de payments, totales por estado
 *
 * Si el ContractorAssignment no existe, devuelve null.
 *
 * @param excludePaymentId  Excluir un pago del cálculo (útil al re-validar en update).
 */
export async function getAssignmentFinancialContext(
  contractorId: string,
  budgetItemId: string,
  excludePaymentId?: string
): Promise<AssignmentFinancialContext | null> {
  // ── Query 1: contrato ──────────────────────────────────────────────────────
  const assignment = await prisma.contractorAssignment.findUnique({
    where: { contractorId_budgetItemId: { contractorId, budgetItemId } },
    select: { agreedPrice: true, assignedQuantity: true },
  });

  if (!assignment) return null;

  const totalAcordado    = Number(assignment.agreedPrice);
  const assignedQuantity = Number(assignment.assignedQuantity);

  // ── Query 2: pagos agrupados por estado (1 scan) ───────────────────────────
  const byStatus = await prisma.payment.groupBy({
    by: ["status"],
    where: {
      contractorId,
      budgetItemId,
      status: { not: "CANCELLED" },
      ...(excludePaymentId ? { id: { not: excludePaymentId } } : {}),
    },
    _sum: { amount: true },
  });

  const sumFor = (status: string) =>
    Number(byStatus.find((r) => r.status === status)?._sum.amount ?? 0);

  const totalPagado    = sumFor("PAID");
  const totalPendiente = sumFor("PENDING");
  const totalVencido   = sumFor("OVERDUE");
  const committed      = totalPagado + totalPendiente + totalVencido;

  const saldoDisponible = totalAcordado - committed;
  const saldoPendiente  = totalAcordado - totalPagado;

  return {
    contractorId,
    budgetItemId,
    assignedQuantity,
    totalAcordado,
    precioUnitario:
      assignedQuantity > 0
        ? Math.round((totalAcordado / assignedQuantity) * 100) / 100
        : 0,
    totalPagado,
    totalPendiente,
    totalVencido,
    committed,
    saldoDisponible,
    saldoPendiente,
    porcentajePagado:
      totalAcordado > 0 ? Math.round((totalPagado / totalAcordado) * 100) : 0,
    porcentajeComprometido:
      totalAcordado > 0 ? Math.round((committed / totalAcordado) * 100) : 0,
    estaPagoCompleto: saldoPendiente <= 0,
    estaComprometidoEnExceso: committed > totalAcordado,
  };
}

/**
 * Alias liviano — retorna solo lo necesario para validar un monto.
 * Llama a getAssignmentFinancialContext internamente.
 */
export async function getRemainingDebt(
  contractorId: string,
  budgetItemId: string,
  excludePaymentId?: string
): Promise<{ remaining: number; agreedPrice: number; committed: number } | null> {
  const ctx = await getAssignmentFinancialContext(contractorId, budgetItemId, excludePaymentId);
  if (!ctx) return null;
  return {
    remaining:   ctx.saldoDisponible,
    agreedPrice: ctx.totalAcordado,
    committed:   ctx.committed,
  };
}

// ============================================================================
// VALIDACIÓN DE MONTO
// ============================================================================

export interface PaymentValidationResult {
  valid: boolean;
  /** Presente solo cuando valid = false */
  error?: string;
  /** Siempre presente cuando existe el assignment */
  financialContext?: AssignmentFinancialContext;
}

/**
 * Valida que `amount` no exceda el saldo disponible de la asignación.
 *
 * La regla es:
 *   committed + amount ≤ totalAcordado
 *   ↔  amount ≤ saldoDisponible
 *
 * Usar `committed` (PAID + PENDING + OVERDUE) — no solo PAID — evita
 * sobre-comprometer el presupuesto con pagos en cola.
 *
 * Devuelve siempre `financialContext` para que el cliente pueda mostrar
 * el estado completo sin una segunda llamada.
 */
export async function validatePaymentAmount(
  contractorId: string,
  budgetItemId: string,
  amount: number,
  excludePaymentId?: string
): Promise<PaymentValidationResult> {
  const ctx = await getAssignmentFinancialContext(contractorId, budgetItemId, excludePaymentId);

  if (!ctx) {
    return {
      valid: false,
      error: "El contratista no tiene asignada esta partida",
    };
  }

  if (amount > ctx.saldoDisponible) {
    return {
      valid: false,
      error: "El pago excede el monto acordado",
      financialContext: ctx,
    };
  }

  return { valid: true, financialContext: ctx };
}

// ============================================================================
// DETECCIÓN DE PAGOS DUPLICADOS
// ============================================================================

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  /** Presente solo si isDuplicate = true */
  existing?: { id: string; createdAt: Date; amount: number; status: string };
}

/**
 * Detecta pagos sospechosamente duplicados.
 *
 * Un pago se considera duplicado si ya existe otro con el mismo
 * (contractorId, budgetItemId, projectId, amount) creado dentro
 * de la ventana `withinMinutes` y con estado distinto a CANCELLED.
 *
 * Casos reales que esto evita:
 *   - Doble clic en el botón "Crear pago"
 *   - Reintento automático del cliente HTTP sin idempotency key
 *   - Importación duplicada de un comprobante de pago
 *
 * @param withinMinutes  Ventana de tiempo en minutos (default: 5)
 * @param excludeId      Excluir un pago específico (útil en updates)
 */
export async function checkDuplicatePayment(
  contractorId:  string,
  budgetItemId:  string,
  projectId:     string,
  amount:        number,
  withinMinutes  = 5,
  excludeId?:    string
): Promise<DuplicateCheckResult> {
  const since = new Date(Date.now() - withinMinutes * 60 * 1_000);

  const existing = await prisma.payment.findFirst({
    where: {
      contractorId,
      budgetItemId,
      projectId,
      amount,
      status:    { not: "CANCELLED" },
      createdAt: { gte: since },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, createdAt: true, amount: true, status: true },
    orderBy: { createdAt: "desc" },
  });

  if (!existing) return { isDuplicate: false };

  return {
    isDuplicate: true,
    existing: {
      id:        existing.id,
      createdAt: existing.createdAt,
      amount:    Number(existing.amount),
      status:    existing.status,
    },
  };
}

// markOverduePayments vive en payment-state.service.ts y se re-exporta al inicio.

// ============================================================================
// DEUDA POR CONTRATISTA
// ============================================================================

/**
 * Calcula la deuda restante de cada contratista en un proyecto.
 *
 * Una sola query SQL con dos CTEs — sin N+1.
 *   - assignment_totals : 1 scan de contractor_assignments
 *   - payment_totals    : 1 scan de payments
 */
export async function getContractorDebts(projectId: string): Promise<ContractorDebt[]> {
  type Row = {
    contractor_id:   string;
    contractor_name: string;
    total_agreed:    string;
    total_paid:      string;
    total_pending:   string;
  };

  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `WITH assignment_totals AS (
       SELECT ca.contractor_id, SUM(ca.agreed_price) AS total_agreed
       FROM   contractor_assignments ca
       INNER JOIN budget_items bi  ON bi.id  = ca.budget_item_id
       INNER JOIN categories   cat ON cat.id = bi.category_id
       WHERE  cat.project_id = $1
       GROUP  BY ca.contractor_id
     ),
     payment_totals AS (
       SELECT
         contractor_id,
         COALESCE(SUM(CASE WHEN status = 'PAID'    THEN amount END), 0) AS paid,
         COALESCE(SUM(CASE WHEN status IN ('PENDING','OVERDUE') THEN amount END), 0) AS pending
       FROM   payments
       WHERE  project_id = $1 AND status != 'CANCELLED'
       GROUP  BY contractor_id
     )
     SELECT
       c.id                             AS contractor_id,
       c.name                           AS contractor_name,
       COALESCE(at.total_agreed, 0)     AS total_agreed,
       COALESCE(pt.paid,         0)     AS total_paid,
       COALESCE(pt.pending,      0)     AS total_pending
     FROM contractors c
     INNER JOIN project_contractors pc ON pc.contractor_id = c.id AND pc.project_id = $1
     LEFT  JOIN assignment_totals   at ON at.contractor_id = c.id
     LEFT  JOIN payment_totals      pt ON pt.contractor_id = c.id
     ORDER BY total_agreed DESC NULLS LAST`,
    projectId
  );

  return rows.map((r) => {
    const totalAgreed  = Number(r.total_agreed);
    const totalPaid    = Number(r.total_paid);
    const totalPending = Number(r.total_pending);
    return {
      contractorId:   r.contractor_id,
      contractorName: r.contractor_name,
      totalAgreed,
      totalPaid,
      totalPending,
      remaining: totalAgreed - totalPaid - totalPending,
    };
  });
}

// ============================================================================
// DASHBOARD SUMMARY
// ============================================================================

// Raw-query row types (snake_case — así las devuelve PostgreSQL)
interface ContractorRow {
  contractor_id:   string;
  contractor_name: string;
  paid:            string;
  pending:         string;
  overdue:         string;
  total_count:     bigint;
}

interface MonthRow {
  month:       string;
  paid:        string;
  pending:     string;
  overdue:     string;
  total_count: bigint;
}

/**
 * Genera el resumen completo de pagos para el dashboard.
 *
 * Estrategia — 4 queries en paralelo (un único round-trip a la DB):
 *   1. groupBy status     → totales globales + overdueCount (derivado)
 *   2. raw SQL contratista → desglose por contratista (1 scan con JOIN)
 *   3. raw SQL mensual    → desglose por mes (1 scan con DATE_TRUNC)
 *   4. count upcoming     → pagos PENDING que vencen en 7 días
 *   5. findMany recientes → últimos 5 pagos (feed)
 *
 * Sin llamada a markOverduePayments() — el cron job la ejecuta cada minuto.
 */
export async function getDashboardSummary(projectId: string): Promise<DashboardSummary> {
  const now     = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [byStatus, porContratista, porMes, upcomingDueCount, recentPayments] =
    await Promise.all([

      // ── 1. Totales globales por estado ────────────────────────────────────
      prisma.payment.groupBy({
        by:    ["status"],
        where: { projectId },
        _sum:  { amount: true },
        _count: { _all: true },
      }),

      // ── 2. Desglose por contratista ───────────────────────────────────────
      // 1 scan de payments + 1 JOIN a contractors, agrupado en SQL
      prisma.$queryRaw<ContractorRow[]>`
        SELECT
          c.id                                                                    AS contractor_id,
          c.name                                                                  AS contractor_name,
          COALESCE(SUM(CASE WHEN p.status = 'PAID'    THEN p.amount END), 0)    AS paid,
          COALESCE(SUM(CASE WHEN p.status = 'PENDING' THEN p.amount END), 0)    AS pending,
          COALESCE(SUM(CASE WHEN p.status = 'OVERDUE' THEN p.amount END), 0)    AS overdue,
          COUNT(*)                                                                AS total_count
        FROM payments p
        INNER JOIN contractors c ON c.id = p.contractor_id
        WHERE p.project_id = ${projectId}
          AND p.status != 'CANCELLED'
        GROUP BY c.id, c.name
        ORDER BY paid DESC
      `,

      // ── 3. Desglose por mes ───────────────────────────────────────────────
      // DATE_TRUNC agrupa todos los meses con actividad (sin límite artificial)
      prisma.$queryRaw<MonthRow[]>`
        SELECT
          TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM')                   AS month,
          COALESCE(SUM(CASE WHEN status = 'PAID'    THEN amount END), 0)        AS paid,
          COALESCE(SUM(CASE WHEN status = 'PENDING' THEN amount END), 0)        AS pending,
          COALESCE(SUM(CASE WHEN status = 'OVERDUE' THEN amount END), 0)        AS overdue,
          COUNT(*)                                                                AS total_count
        FROM payments
        WHERE project_id = ${projectId}
          AND status != 'CANCELLED'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at) ASC
      `,

      // ── 4. Próximos a vencer (7 días) ─────────────────────────────────────
      prisma.payment.count({
        where: {
          projectId,
          status:  "PENDING",
          dueDate: { gte: now, lte: in7Days },
        },
      }),

      // ── 5. Feed de últimos pagos ──────────────────────────────────────────
      prisma.payment.findMany({
        where:   { projectId },
        orderBy: { createdAt: "desc" },
        take:    5,
        select: {
          id: true, amount: true, status: true,
          paidAt: true, createdAt: true,
          contractor: { select: { id: true, name: true } },
          project:    { select: { id: true, name: true } },
        },
      }),
    ]);

  // ── Derivar totales globales del groupBy ──────────────────────────────────
  const sumFor   = (s: string) => Number(byStatus.find((r) => r.status === s)?._sum.amount  ?? 0);
  const countFor = (s: string) =>        byStatus.find((r) => r.status === s)?._count._all  ?? 0;

  return {
    totalPaid:      sumFor("PAID"),
    totalPending:   sumFor("PENDING"),
    totalOverdue:   sumFor("OVERDUE"),
    totalCancelled: sumFor("CANCELLED"),

    overdueCount:     countFor("OVERDUE"),
    upcomingDueCount,

    porContratista: porContratista.map((r) => ({
      contractorId:   r.contractor_id,
      contractorName: r.contractor_name,
      paid:           Number(r.paid),
      pending:        Number(r.pending),
      overdue:        Number(r.overdue),
      totalCount:     Number(r.total_count),
    })),

    porMes: porMes.map((r) => ({
      month:      r.month,
      paid:       Number(r.paid),
      pending:    Number(r.pending),
      overdue:    Number(r.overdue),
      totalCount: Number(r.total_count),
    })),

    recentPayments,
  };
}

// ============================================================================
// ACTUALIZAR BUDGET SUMMARY
// ============================================================================

/**
 * Recalcula el BudgetSummary de un proyecto después de un pago.
 */
export async function recalcBudgetSummary(projectId: string): Promise<void> {
  const [itemTotals, paymentTotals, expenseTotal, clientPaymentTotal] = await Promise.all([
    prisma.budgetItem.aggregate({
      where: { category: { projectId } },
      _sum: { costSubtotal: true, saleSubtotal: true },
    }),
    prisma.payment.groupBy({
      by: ["status"],
      where: { projectId },
      _sum: { amount: true },
    }),
    prisma.projectExpense.aggregate({
      where: { projectId },
      _sum: { amount: true },
    }),
    prisma.clientPayment.aggregate({
      where: { projectId },
      _sum: { amount: true },
    }),
  ]);

  const totalRevenue = Number(itemTotals._sum.saleSubtotal ?? 0);
  const totalCostItems = Number(itemTotals._sum.costSubtotal ?? 0);
  const totalExpenses = Number(expenseTotal._sum.amount ?? 0);
  const totalClientPayments = Number(clientPaymentTotal._sum.amount ?? 0);

  const paidTotal = Number(
    paymentTotals.find((t) => t.status === "PAID")?._sum.amount ?? 0
  );
  const pendingTotal =
    Number(paymentTotals.find((t) => t.status === "PENDING")?._sum.amount ?? 0) +
    Number(paymentTotals.find((t) => t.status === "OVERDUE")?._sum.amount ?? 0);

  // Costo real ejecutado = pagos realizados + gastos adicionales
  const actualCost = paidTotal + totalExpenses;
  const grossProfit = totalRevenue - totalCostItems - totalExpenses;
  const profitMargin =
    totalRevenue > 0
      ? Math.round((grossProfit / totalRevenue) * 10000) / 100
      : 0;
  // Flujo de caja = cobros del cliente - pagos a contratistas - gastos
  const cashFlow = totalClientPayments - paidTotal - totalExpenses;

  const data = {
    estimatedTotal: totalCostItems,
    actualTotal: actualCost,
    totalPaid: paidTotal,
    totalPending: pendingTotal,
    totalRevenue,
    totalCostItems,
    totalExpenses,
    grossProfit,
    profitMargin,
    totalClientPayments,
    cashFlow,
    lastCalculatedAt: new Date(),
  };

  await prisma.budgetSummary.upsert({
    where: { projectId },
    create: { projectId, ...data },
    update: data,
  });
}
