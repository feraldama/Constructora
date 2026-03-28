import prisma from "../config/prisma.js";

// ============================================================================
// MÁQUINA DE ESTADOS DE PAGOS
// ============================================================================
//
//  Estados válidos:
//
//    PENDING ──────────────► PAID       (confirmación manual o paymentDate al crear)
//    PENDING ──────────────► OVERDUE    (automático: dueDate < ahora)
//    PENDING ──────────────► CANCELLED  (cancelación manual)
//    OVERDUE ──────────────► PAID       (pago tardío — siempre válido)
//    OVERDUE ──────────────► CANCELLED  (cancelación de pago vencido)
//    PAID    — terminal —   sin salida  (el dinero salió, no se revierte por aquí)
//    CANCELLED — terminal — sin salida  (cancelado, crear uno nuevo si es necesario)
//
//  OVERDUE ──────────────► PENDING  ✗  (no se puede "des-vencer")
//  PAID    ──────────────► *        ✗  (terminal)
//  CANCELLED ──────────► *          ✗  (terminal)
//
// ============================================================================

export type PaymentStatus = "PENDING" | "PAID" | "OVERDUE" | "CANCELLED";

// Mapa de transiciones válidas
const VALID_TRANSITIONS: Readonly<Record<PaymentStatus, readonly PaymentStatus[]>> = {
  PENDING:   ["PAID", "OVERDUE", "CANCELLED"],
  OVERDUE:   ["PAID", "CANCELLED"],
  PAID:      [],         // terminal
  CANCELLED: [],         // terminal
};

// ─── Validación de transición ─────────────────────────────────────────────────

export interface TransitionResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Verifica si la transición `from → to` es válida según la máquina de estados.
 * No hace I/O — es una función pura.
 */
export function validateTransition(
  from: PaymentStatus,
  to: PaymentStatus
): TransitionResult {
  if (from === to) {
    return { allowed: true }; // sin cambio — siempre OK
  }

  const allowed = (VALID_TRANSITIONS[from] as readonly string[]).includes(to);

  if (!allowed) {
    const isTerminal = VALID_TRANSITIONS[from].length === 0;
    return {
      allowed: false,
      reason: isTerminal
        ? `El estado ${from} es terminal y no admite cambios`
        : `La transición ${from} → ${to} no está permitida. Transiciones válidas desde ${from}: ${VALID_TRANSITIONS[from].join(", ") || "ninguna"}`,
    };
  }

  return { allowed: true };
}

// ─── Estado inicial al crear ─────────────────────────────────────────────────

export interface InitialStatusResult {
  status: PaymentStatus;
  /** Setear en payments.paidAt cuando status = PAID */
  paidAt: Date | null;
}

/**
 * Determina el estado inicial de un pago en el momento de su creación.
 *
 * Reglas (en orden de prioridad):
 *   1. Si se provee `paymentDate` → PAID  (el pago ya se realizó)
 *   2. Si `dueDate` < ahora        → OVERDUE (se creó ya vencido — dato histórico)
 *   3. Resto                       → PENDING
 *
 * @param paymentDate  ISO string — fecha en que se realizó el pago (opcional)
 * @param dueDate      ISO string — fecha de vencimiento (opcional)
 */
export function resolveInitialStatus(
  paymentDate?: string,
  dueDate?: string
): InitialStatusResult {
  if (paymentDate) {
    return { status: "PAID", paidAt: new Date(paymentDate) };
  }

  if (dueDate && new Date(dueDate) < new Date()) {
    return { status: "OVERDUE", paidAt: null };
  }

  return { status: "PENDING", paidAt: null };
}

// ─── Efecto secundario al confirmar pago ─────────────────────────────────────

/**
 * Metadatos que el controller debe aplicar cuando la transición destino es PAID.
 * Si el usuario ya proveyó `paidAt`, se respeta. Si no, se usa ahora.
 */
export function resolvePaidAt(existingPaidAt?: string | null): Date {
  return existingPaidAt ? new Date(existingPaidAt) : new Date();
}

// ============================================================================
// ACTUALIZACIÓN AUTOMÁTICA DE ESTADOS
// ============================================================================

export interface MarkOverdueResult {
  /** Cantidad de pagos actualizados */
  count: number;
  /** Timestamp de ejecución */
  executedAt: Date;
}

/**
 * Marca como OVERDUE todos los pagos PENDING cuyo dueDate ya pasó.
 *
 * Un único `updateMany` — O(n) donde n = pagos vencidos no procesados.
 * PostgreSQL usa el índice `[status, dueDate]` definido en schema.prisma.
 *
 * Diseñado para correr frecuentemente (cron de 1–5 min) con bajo costo
 * cuando no hay nada que actualizar (0 rows affected = scan mínimo).
 */
export async function markOverduePayments(): Promise<MarkOverdueResult> {
  const now = new Date();

  const result = await prisma.payment.updateMany({
    where: {
      status:  "PENDING",
      dueDate: { lt: now },
    },
    data: { status: "OVERDUE" },
  });

  return { count: result.count, executedAt: now };
}

// ============================================================================
// RESUMEN DE ESTADO POR PROYECTO
// ============================================================================

export interface PaymentStatusSummary {
  projectId: string;
  pending:   number;
  paid:      number;
  overdue:   number;
  cancelled: number;
  total:     number;
}

/**
 * Cuenta los pagos por estado en un proyecto.
 * Un único `groupBy` — sin N+1.
 */
export async function getPaymentStatusSummary(
  projectId: string
): Promise<PaymentStatusSummary> {
  const rows = await prisma.payment.groupBy({
    by:    ["status"],
    where: { projectId },
    _count: { id: true },
  });

  const get = (s: string) =>
    rows.find((r) => r.status === s)?._count.id ?? 0;

  const pending   = get("PENDING");
  const paid      = get("PAID");
  const overdue   = get("OVERDUE");
  const cancelled = get("CANCELLED");

  return {
    projectId,
    pending,
    paid,
    overdue,
    cancelled,
    total: pending + paid + overdue + cancelled,
  };
}
