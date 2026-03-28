import prisma from "../config/prisma.js";

// ============================================================================
// TIPOS PÚBLICOS
// ============================================================================

export interface CashFlowPeriod {
  /** "YYYY-MM" */
  period: string;
  /** Pagos ejecutados (status = PAID, agrupados por paidAt) */
  paid: number;
  /** Pagos con fecha de vencimiento (PENDING/OVERDUE, agrupados por dueDate) */
  scheduled: number;
  /** Pagos estimados por el modelo predictivo (balance no programado) */
  predicted: number;
  /** Acumulado total de salidas: paid + scheduled + predicted hasta este mes */
  cumulative: number;
}

export interface CashFlowResult {
  periods: CashFlowPeriod[];
  totals: {
    paid: number;
    scheduled: number;
    predicted: number;
    /** Balance no programado: acordado - comprometido, sin fecha de vencimiento */
    unscheduledBalance: number;
  };
  generatedAt: string;
}

export interface PaymentPrediction {
  contractorId:   string;
  contractorName: string;
  budgetItemId:   string;
  budgetItemName: string;
  agreedPrice:    number;
  committed:      number;
  /** agreed_price − committed: lo que todavía falta programar */
  unscheduledBalance: number;

  /** Fecha estimada del próximo pago — null si no hay base histórica */
  predictedDate: string | null;
  /** Intervalo promedio entre pagos históricos, en días enteros */
  avgDaysBetweenPayments: number | null;
  lastPaymentDate: string | null;
  paidCount: number;
  /**
   * Confianza del modelo:
   *   high   — ≥3 pagos históricos con intervalo estable
   *   medium — 1-2 pagos históricos
   *   none   — sin historial
   */
  confidence: "high" | "medium" | "none";
  confidenceReason: string;
}

export interface PaymentPredictionsResult {
  predictions:      PaymentPrediction[];
  totalUnscheduled: number;
  generatedAt:      string;
}

export type AlertSeverity = "critical" | "high" | "medium";

export type AlertType =
  | "OVERDUE_PAYMENT"
  | "LONG_OVERDUE"
  | "UNSCHEDULED_BALANCE"
  | "HIGH_COMMITMENT_RATE";

export interface DebtAlert {
  type:            AlertType;
  severity:        AlertSeverity;
  contractorId:    string;
  contractorName:  string;
  budgetItemId:    string;
  budgetItemName:  string;
  amount:          number;
  message:         string;
  metadata:        Record<string, unknown>;
}

export interface DebtAlertsResult {
  alerts:        DebtAlert[];
  criticalCount: number;
  highCount:     number;
  mediumCount:   number;
  /** Suma de montos en alertas critical + high */
  totalAtRisk:   number;
  generatedAt:   string;
}

// ============================================================================
// TIPOS INTERNOS (filas de raw SQL — snake_case de PostgreSQL)
// ============================================================================

interface CashFlowRow {
  period: string;
  type:   "PAID" | "SCHEDULED";
  amount: string;
}

interface AssignmentMatrixRow {
  contractor_id:               string;
  contractor_name:             string;
  budget_item_id:              string;
  budget_item_name:            string;
  agreed_price:                string;
  committed:                   string;
  paid_total:                  string;
  scheduled_pending:           string;
  paid_count:                  bigint;
  last_paid_at:                Date | null;
  first_paid_at:               Date | null;
  avg_days_between_payments:   string | null;
}

interface OverdueGroupRow {
  contractor_id:    string;
  contractor_name:  string;
  budget_item_id:   string;
  budget_item_name: string;
  total_overdue:    string;
  days_max:         number;
  payment_count:    bigint;
}

// ============================================================================
// FLUJO DE CAJA PROYECTADO
// ============================================================================

/**
 * Construye el flujo de caja proyectado de un proyecto.
 *
 * Tres series de datos — todo en paralelo (2 queries):
 *
 *   paid      — Salidas reales agrupadas por mes de paidAt
 *   scheduled — Compromisos futuros agrupados por mes de dueDate
 *   predicted — Balance no programado distribuido en fechas futuras
 *               usando el intervalo histórico de cada contratista
 *
 * Algoritmo de predicción:
 *   predictedDate = lastPaidAt + avgDaysBetweenPayments
 *   Si la fecha resultante es pasada → proyectar desde hoy + avgDays
 *   Si no hay historial              → hoy + 30 días (confianza "none")
 */
export async function getProjectedCashFlow(projectId: string): Promise<CashFlowResult> {
  const [cashFlowRows, matrixRows] = await Promise.all([

    // ── Serie temporal: PAID por paidAt + PENDING/OVERDUE por dueDate ────────
    prisma.$queryRaw<CashFlowRow[]>`
      SELECT
        TO_CHAR(DATE_TRUNC('month', ref_date), 'YYYY-MM') AS period,
        type,
        SUM(amount)::text                                 AS amount
      FROM (
        SELECT paid_at  AS ref_date, 'PAID'      AS type, amount
          FROM payments
         WHERE project_id = ${projectId}
           AND status = 'PAID'
           AND paid_at IS NOT NULL
        UNION ALL
        SELECT due_date AS ref_date, 'SCHEDULED' AS type, amount
          FROM payments
         WHERE project_id = ${projectId}
           AND status IN ('PENDING', 'OVERDUE')
           AND due_date IS NOT NULL
      ) sub
      GROUP BY DATE_TRUNC('month', ref_date), type
      ORDER BY DATE_TRUNC('month', ref_date), type
    `,

    // ── Matriz de asignaciones con cadencia histórica ─────────────────────────
    loadAssignmentMatrix(projectId),
  ]);

  // ── Construir mapa de periodos ────────────────────────────────────────────
  const periodMap = new Map<string, { paid: number; scheduled: number; predicted: number }>();

  for (const row of cashFlowRows) {
    const e = periodMap.get(row.period) ?? { paid: 0, scheduled: 0, predicted: 0 };
    if (row.type === "PAID")      e.paid      += Number(row.amount);
    if (row.type === "SCHEDULED") e.scheduled += Number(row.amount);
    periodMap.set(row.period, e);
  }

  // ── Distribuir balance no programado en meses futuros ────────────────────
  const now = new Date();
  let totalUnscheduled = 0;

  for (const row of matrixRows) {
    const unscheduled = Number(row.agreed_price) - Number(row.committed);
    if (unscheduled <= 0) continue;

    totalUnscheduled += unscheduled;

    // Solo los balances sin ningún pago programado (scheduled_pending = 0)
    if (Number(row.scheduled_pending) > 0) continue;

    const avgDays    = row.avg_days_between_payments ? Number(row.avg_days_between_payments) : null;
    const lastPaidAt = row.last_paid_at ? new Date(row.last_paid_at) : null;
    const predicted  = calcPredictedDate(lastPaidAt, avgDays);

    if (predicted > now) {
      const period = toPeriod(predicted);
      const e = periodMap.get(period) ?? { paid: 0, scheduled: 0, predicted: 0 };
      e.predicted += unscheduled;
      periodMap.set(period, e);
    }
  }

  // ── Ordenar y calcular acumulado ─────────────────────────────────────────
  let cumulative = 0;
  const periods: CashFlowPeriod[] = [...periodMap.keys()]
    .sort()
    .map((period) => {
      const d = periodMap.get(period)!;
      cumulative += d.paid + d.scheduled + d.predicted;
      return { period, ...d, cumulative };
    });

  const totals = periods.reduce(
    (acc, p) => ({
      paid:               acc.paid      + p.paid,
      scheduled:          acc.scheduled + p.scheduled,
      predicted:          acc.predicted + p.predicted,
      unscheduledBalance: totalUnscheduled,
    }),
    { paid: 0, scheduled: 0, predicted: 0, unscheduledBalance: 0 }
  );

  return { periods, totals, generatedAt: now.toISOString() };
}

// ============================================================================
// PREDICCIÓN DE PAGOS FUTUROS
// ============================================================================

/**
 * Genera predicciones de pago para cada asignación con balance no programado.
 *
 * Modelo:
 *   - Calcula el intervalo promedio entre pagos históricos: (último - primero) / (n-1)
 *   - Proyecta el próximo pago: último_pago + intervalo_promedio
 *   - Si la fecha proyectada es pasada: hoy + intervalo_promedio
 *   - Sin historial: hoy + 30 días, confidence = "none"
 *
 * Confianza:
 *   high   — ≥3 pagos, intervalo entre 7 y 365 días
 *   medium — 1-2 pagos
 *   none   — sin historial
 */
export async function getPaymentPredictions(
  projectId: string
): Promise<PaymentPredictionsResult> {
  const matrixRows = await loadAssignmentMatrix(projectId);
  const predictions: PaymentPrediction[] = [];

  for (const row of matrixRows) {
    const agreedPrice  = Number(row.agreed_price);
    const committed    = Number(row.committed);
    const unscheduled  = agreedPrice - committed;

    if (unscheduled < 0.01) continue; // ignorar diferencias de centavos

    const paidCount  = Number(row.paid_count);
    const avgDays    = row.avg_days_between_payments ? Number(row.avg_days_between_payments) : null;
    const lastPaidAt = row.last_paid_at ? new Date(row.last_paid_at) : null;

    const { predictedDate, confidence, confidenceReason } = buildPrediction(
      lastPaidAt,
      avgDays,
      paidCount
    );

    predictions.push({
      contractorId:   row.contractor_id,
      contractorName: row.contractor_name,
      budgetItemId:   row.budget_item_id,
      budgetItemName: row.budget_item_name,
      agreedPrice,
      committed,
      unscheduledBalance:     unscheduled,
      predictedDate:          predictedDate ? predictedDate.toISOString().split("T")[0] : null,
      avgDaysBetweenPayments: avgDays !== null ? Math.round(avgDays) : null,
      lastPaymentDate:        lastPaidAt ? lastPaidAt.toISOString().split("T")[0] : null,
      paidCount,
      confidence,
      confidenceReason,
    });
  }

  predictions.sort((a, b) => b.unscheduledBalance - a.unscheduledBalance);

  return {
    predictions,
    totalUnscheduled: predictions.reduce((s, p) => s + p.unscheduledBalance, 0),
    generatedAt:      new Date().toISOString(),
  };
}

// ============================================================================
// ALERTAS AUTOMÁTICAS DE DEUDA CRÍTICA
// ============================================================================

/**
 * Genera alertas accionables sobre la situación financiera del proyecto.
 *
 * Tipos:
 *
 *   LONG_OVERDUE          — pago vencido hace >30 días        → critical
 *   OVERDUE_PAYMENT       — pago vencido                      → high
 *   UNSCHEDULED_BALANCE   — balance sin programar + demora    → critical/high/medium
 *   HIGH_COMMITMENT_RATE  — >90% comprometido sin pagar       → medium
 *
 * UNSCHEDULED_BALANCE escala según cuánto tiempo pasó desde el último pago
 * en relación al intervalo promedio histórico:
 *   > 2× intervalo → critical
 *   > 1× intervalo → high
 *   cualquier otro → medium
 *
 * Threshold mínimo para UNSCHEDULED_BALANCE: $5.000 Y >10% del total acordado.
 * Ajustar ALERT_THRESHOLD según el tamaño típico de los proyectos.
 */
export async function getCriticalDebtAlerts(
  projectId: string
): Promise<DebtAlertsResult> {
  const ALERT_THRESHOLD = 5_000;

  const [matrixRows, overdueRows] = await Promise.all([
    loadAssignmentMatrix(projectId),

    // Pagos OVERDUE agrupados por contratista + partida
    prisma.$queryRaw<OverdueGroupRow[]>`
      SELECT
        p.contractor_id,
        c.name                                         AS contractor_name,
        p.budget_item_id,
        bi.name                                        AS budget_item_name,
        SUM(p.amount)::text                            AS total_overdue,
        MAX(EXTRACT(DAY FROM NOW() - p.due_date))::int AS days_max,
        COUNT(*)                                       AS payment_count
      FROM  payments p
      INNER JOIN contractors  c  ON c.id  = p.contractor_id
      INNER JOIN budget_items bi ON bi.id = p.budget_item_id
      WHERE p.project_id = ${projectId}
        AND p.status = 'OVERDUE'
      GROUP BY p.contractor_id, c.name, p.budget_item_id, bi.name
      ORDER BY days_max DESC
    `,
  ]);

  const alerts: DebtAlert[] = [];
  const now = new Date();

  // ── 1. Alertas de pagos vencidos ──────────────────────────────────────────
  for (const row of overdueRows) {
    const daysMax = Number(row.days_max);
    const amount  = Number(row.total_overdue);
    const count   = Number(row.payment_count);
    const isLong  = daysMax > 30;

    alerts.push({
      type:            isLong ? "LONG_OVERDUE" : "OVERDUE_PAYMENT",
      severity:        isLong ? "critical" : "high",
      contractorId:    row.contractor_id,
      contractorName:  row.contractor_name,
      budgetItemId:    row.budget_item_id,
      budgetItemName:  row.budget_item_name,
      amount,
      message: isLong
        ? `${row.contractor_name} tiene $${fmt(amount)} vencido hace ${daysMax} días en "${row.budget_item_name}"`
        : `${row.contractor_name} tiene ${count} pago${count !== 1 ? "s" : ""} vencido${count !== 1 ? "s" : ""} ($${fmt(amount)}) en "${row.budget_item_name}"`,
      metadata: { daysOverdue: daysMax, paymentCount: count },
    });
  }

  // ── 2. Alertas desde la matriz de asignaciones ────────────────────────────
  for (const row of matrixRows) {
    const agreedPrice    = Number(row.agreed_price);
    const committed      = Number(row.committed);
    const paidTotal      = Number(row.paid_total);
    const scheduledPending = Number(row.scheduled_pending);
    const unscheduled    = agreedPrice - committed;
    const commitRate     = agreedPrice > 0 ? committed / agreedPrice : 0;
    const avgDays        = row.avg_days_between_payments ? Number(row.avg_days_between_payments) : null;
    const lastPaidAt     = row.last_paid_at ? new Date(row.last_paid_at) : null;
    const daysSinceLast  = lastPaidAt
      ? Math.floor((now.getTime() - lastPaidAt.getTime()) / 86_400_000)
      : null;

    // ── 2a. Balance no programado significativo ───────────────────────────
    if (
      unscheduled > ALERT_THRESHOLD &&
      scheduledPending === 0 &&
      unscheduled / agreedPrice > 0.1
    ) {
      let severity: AlertSeverity = "medium";
      if (avgDays !== null && daysSinceLast !== null) {
        if (daysSinceLast > avgDays * 2) severity = "critical";
        else if (daysSinceLast > avgDays) severity = "high";
      }

      const delay = daysSinceLast !== null
        ? ` (último pago hace ${daysSinceLast} días)`
        : "";

      alerts.push({
        type:            "UNSCHEDULED_BALANCE",
        severity,
        contractorId:    row.contractor_id,
        contractorName:  row.contractor_name,
        budgetItemId:    row.budget_item_id,
        budgetItemName:  row.budget_item_name,
        amount:          unscheduled,
        message:         `${row.contractor_name} tiene $${fmt(unscheduled)} sin programar en "${row.budget_item_name}"${delay}`,
        metadata: {
          agreedPrice,
          committed,
          unscheduledBalance:     unscheduled,
          commitmentRate:         Math.round(commitRate * 100),
          daysSinceLastPayment:   daysSinceLast,
          avgDaysBetweenPayments: avgDays !== null ? Math.round(avgDays) : null,
        },
      });
    }

    // ── 2b. Compromiso alto sin completar el pago ─────────────────────────
    if (commitRate > 0.9 && commitRate < 1.0 && paidTotal < agreedPrice * 0.9) {
      alerts.push({
        type:            "HIGH_COMMITMENT_RATE",
        severity:        "medium",
        contractorId:    row.contractor_id,
        contractorName:  row.contractor_name,
        budgetItemId:    row.budget_item_id,
        budgetItemName:  row.budget_item_name,
        amount:          committed,
        message:         `${row.contractor_name}: ${Math.round(commitRate * 100)}% comprometido ($${fmt(committed)} de $${fmt(agreedPrice)}) en "${row.budget_item_name}"`,
        metadata: {
          agreedPrice,
          committed,
          paidTotal,
          commitmentRate: Math.round(commitRate * 100),
        },
      });
    }
  }

  // ── Ordenar: critical primero, luego por monto ───────────────────────────
  const RANK: Record<AlertSeverity, number> = { critical: 0, high: 1, medium: 2 };
  alerts.sort((a, b) => RANK[a.severity] - RANK[b.severity] || b.amount - a.amount);

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const highCount     = alerts.filter((a) => a.severity === "high").length;
  const mediumCount   = alerts.filter((a) => a.severity === "medium").length;
  const totalAtRisk   = alerts
    .filter((a) => a.severity !== "medium")
    .reduce((s, a) => s + a.amount, 0);

  return {
    alerts,
    criticalCount,
    highCount,
    mediumCount,
    totalAtRisk,
    generatedAt: now.toISOString(),
  };
}

// ============================================================================
// HELPERS INTERNOS
// ============================================================================

/**
 * Carga la matriz financiera de todas las asignaciones del proyecto.
 *
 * 1 scan de contractor_assignments + 1 JOIN payments (LEFT).
 * Incluye cadencia histórica de pagos por contratista/partida.
 *
 * Reutilizada por getPaymentPredictions y getCriticalDebtAlerts.
 */
async function loadAssignmentMatrix(projectId: string): Promise<AssignmentMatrixRow[]> {
  return prisma.$queryRaw<AssignmentMatrixRow[]>`
    SELECT
      ca.contractor_id,
      c.name                                                                       AS contractor_name,
      bi.id                                                                        AS budget_item_id,
      bi.name                                                                      AS budget_item_name,
      ca.agreed_price::text                                                        AS agreed_price,

      COALESCE(SUM(CASE WHEN p.status != 'CANCELLED' THEN p.amount END), 0)::text AS committed,
      COALESCE(SUM(CASE WHEN p.status = 'PAID'       THEN p.amount END), 0)::text AS paid_total,
      COALESCE(SUM(CASE WHEN p.status IN ('PENDING','OVERDUE')
                        THEN p.amount END), 0)::text                              AS scheduled_pending,

      COUNT(CASE WHEN p.status = 'PAID' THEN 1 END)                               AS paid_count,
      MAX(CASE WHEN p.status = 'PAID'   THEN p.paid_at END)                       AS last_paid_at,
      MIN(CASE WHEN p.status = 'PAID'   THEN p.paid_at END)                       AS first_paid_at,

      -- Intervalo promedio entre pagos: (último - primero) / (n - 1) días
      CASE
        WHEN COUNT(CASE WHEN p.status = 'PAID' THEN 1 END) > 1
        THEN (
          EXTRACT(EPOCH FROM (
            MAX(CASE WHEN p.status = 'PAID' THEN p.paid_at END) -
            MIN(CASE WHEN p.status = 'PAID' THEN p.paid_at END)
          )) / 86400.0
          / NULLIF(COUNT(CASE WHEN p.status = 'PAID' THEN 1 END) - 1, 0)
        )::text
        ELSE NULL
      END                                                                          AS avg_days_between_payments

    FROM contractor_assignments ca
    INNER JOIN contractors  c   ON c.id  = ca.contractor_id
    INNER JOIN budget_items bi  ON bi.id = ca.budget_item_id
    INNER JOIN categories   cat ON cat.id = bi.category_id
    LEFT  JOIN payments     p   ON p.contractor_id  = ca.contractor_id
                               AND p.budget_item_id = ca.budget_item_id
    WHERE cat.project_id = ${projectId}
    GROUP BY ca.contractor_id, c.name, bi.id, bi.name, ca.agreed_price
    ORDER BY (
      ca.agreed_price
      - COALESCE(SUM(CASE WHEN p.status != 'CANCELLED' THEN p.amount END), 0)
    ) DESC NULLS LAST
  `;
}

/** Proyecta la próxima fecha de pago. Si cae en el pasado, desplaza desde hoy. */
function calcPredictedDate(lastPaidAt: Date | null, avgDays: number | null): Date {
  const interval = avgDays ?? 30;
  const base     = lastPaidAt ?? new Date();
  const candidate = new Date(base.getTime() + interval * 86_400_000);
  return candidate < new Date()
    ? new Date(Date.now() + interval * 86_400_000)
    : candidate;
}

/** Construye la predicción con nivel de confianza para una asignación. */
function buildPrediction(
  lastPaidAt: Date | null,
  avgDays:    number | null,
  paidCount:  number
): {
  predictedDate:    Date | null;
  confidence:       "high" | "medium" | "none";
  confidenceReason: string;
} {
  if (paidCount >= 3 && avgDays !== null && avgDays >= 7 && avgDays <= 365) {
    return {
      predictedDate:    calcPredictedDate(lastPaidAt, avgDays),
      confidence:       "high",
      confidenceReason: `Basado en ${paidCount} pagos históricos — intervalo promedio: ${Math.round(avgDays)} días`,
    };
  }

  if (paidCount >= 1 && lastPaidAt !== null) {
    const interval = avgDays ?? 30;
    return {
      predictedDate:    calcPredictedDate(lastPaidAt, interval),
      confidence:       "medium",
      confidenceReason: paidCount === 1
        ? "Solo 1 pago histórico; usando intervalo predeterminado de 30 días"
        : `Basado en ${paidCount} pagos — intervalo estimado: ${Math.round(interval)} días`,
    };
  }

  return {
    predictedDate:    new Date(Date.now() + 30 * 86_400_000),
    confidence:       "none",
    confidenceReason: "Sin historial de pagos — estimación predeterminada: 30 días",
  };
}

/** Formatea una Date como "YYYY-MM" para agrupar por mes. */
function toPeriod(date: Date): string {
  return date.toISOString().substring(0, 7);
}

/** Formatea un número como moneda (sin decimales). */
function fmt(n: number): string {
  return n.toLocaleString("es-AR", { maximumFractionDigits: 0 });
}
