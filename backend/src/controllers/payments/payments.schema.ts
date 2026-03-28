import { z } from "zod";

// ─── Enums (espejados del schema de Prisma para Zod) ─────────────────────────

const paymentMethodValues = ["CASH", "BANK_TRANSFER", "CHECK", "OTHER"] as const;
const paymentStatusValues = ["PENDING", "PAID", "OVERDUE", "CANCELLED"] as const;

// ─── Crear pago ──────────────────────────────────────────────────────────────

export const createPaymentSchema = z
  .object({
    projectId:     z.string().uuid("projectId inválido"),
    contractorId:  z.string().uuid("contractorId inválido"),
    budgetItemId:  z.string().uuid("budgetItemId inválido"),

    amount:        z.number().positive("El monto debe ser mayor a 0"),

    /**
     * Fecha en que se realizó el pago (ej: transferencia confirmada).
     * Si se provee, el pago se crea directamente en estado PAID.
     * Si se omite, el pago queda en PENDING.
     */
    paymentDate:   z.string().datetime({ message: "paymentDate debe ser ISO 8601" }).optional(),

    /** Fecha límite de vencimiento. Requerida para pagos PENDING. */
    dueDate:       z.string().datetime({ message: "dueDate debe ser ISO 8601" }).optional(),

    paymentMethod: z.enum(paymentMethodValues).optional(),
    description:   z.string().max(500).optional(),
    invoiceNumber: z.string().max(100).optional(),

    /** PARTIAL: monto exacto. TOTAL: salda toda la deuda restante (ignora amount). */
    paymentType:   z.enum(["PARTIAL", "TOTAL"]).default("PARTIAL"),
  })
  .refine(
    (d) => d.paymentType === "TOTAL" || d.paymentDate || d.dueDate,
    {
      message: "Se requiere paymentDate (pago realizado) o dueDate (pago programado)",
      path: ["dueDate"],
    }
  );

// ─── Actualizar pago ─────────────────────────────────────────────────────────

export const updatePaymentSchema = z
  .object({
    amount:        z.number().positive().optional(),
    status:        z.enum(paymentStatusValues).optional(),
    paymentMethod: z.enum(paymentMethodValues).optional(),
    description:   z.string().max(500).optional(),
    invoiceNumber: z.string().max(100).optional(),
    dueDate:       z.string().datetime().optional(),
    paidAt:        z.string().datetime().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "Se requiere al menos un campo para actualizar",
  });

// ─── Filtros de listado ───────────────────────────────────────────────────────

const orderByValues   = ["createdAt", "dueDate", "paidAt", "amount"] as const;
const dateFieldValues = ["createdAt", "dueDate", "paidAt"]           as const;
const orderValues     = ["asc", "desc"]                              as const;

/**
 * status puede llegar como string simple ("PENDING") o lista CSV ("PENDING,OVERDUE").
 * Normalización: siempre devuelve string[] después del transform.
 */
const statusFilter = z
  .union([
    z.enum(paymentStatusValues),
    z.string().transform((v) =>
      v
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter((s) => (paymentStatusValues as readonly string[]).includes(s))
    ),
  ])
  .optional();

export const paymentFiltersSchema = z.object({
  projectId:    z.string().uuid().optional(),
  contractorId: z.string().uuid().optional(),
  budgetItemId: z.string().uuid().optional(),

  /** Estado(s) — uno o varios separados por coma: "PENDING,OVERDUE" */
  status:       statusFilter,

  /** Campo de fecha a usar para el filtro dateFrom/dateTo */
  dateField:    z.enum(dateFieldValues).default("createdAt"),
  dateFrom:     z.string().datetime().optional(),
  dateTo:       z.string().datetime().optional(),

  /** Filtros de monto */
  amountMin:    z.coerce.number().nonnegative().optional(),
  amountMax:    z.coerce.number().positive().optional(),

  /** Ordenamiento */
  orderBy:      z.enum(orderByValues).default("createdAt"),
  order:        z.enum(orderValues).default("desc"),

  /** Paginación */
  page:         z.coerce.number().int().positive().default(1),
  limit:        z.coerce.number().int().positive().max(100).default(20),
});

// ─── Tipos inferidos ─────────────────────────────────────────────────────────

export type CreatePaymentInput  = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput  = z.infer<typeof updatePaymentSchema>;
export type PaymentFiltersInput = z.infer<typeof paymentFiltersSchema>;
