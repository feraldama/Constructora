import { z } from "zod";

export const createPaymentSchema = z.object({
  projectId: z.string().uuid(),
  contractorId: z.string().uuid(),
  budgetItemId: z.string().uuid().optional(),
  amount: z.number().positive("El monto debe ser mayor a 0"),
  description: z.string().optional(),
  invoiceNumber: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  // Tipo de pago
  paymentType: z.enum(["PARTIAL", "TOTAL"]).default("PARTIAL"),
});

export const updatePaymentSchema = z.object({
  amount: z.number().positive().optional(),
  status: z.enum(["PENDING", "PAID", "OVERDUE", "CANCELLED"]).optional(),
  description: z.string().optional(),
  invoiceNumber: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  paidAt: z.string().datetime().optional(),
});

export const paymentFiltersSchema = z.object({
  projectId: z.string().uuid().optional(),
  contractorId: z.string().uuid().optional(),
  status: z.enum(["PENDING", "PAID", "OVERDUE", "CANCELLED"]).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
export type PaymentFiltersInput = z.infer<typeof paymentFiltersSchema>;
