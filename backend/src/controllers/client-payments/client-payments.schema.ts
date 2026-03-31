import { z } from "zod";
import { PaymentMethod, ClientPaymentConcept } from "../../generated/prisma/enums.js";

export const createClientPaymentSchema = z.object({
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  paymentDate: z.string().datetime({ offset: true }).or(z.string().min(1)),
  paymentMethod: z.nativeEnum(PaymentMethod).optional().nullable(),
  concept: z.nativeEnum(ClientPaymentConcept).optional().default("PROGRESS"),
  reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateClientPaymentSchema = createClientPaymentSchema.partial();

export type CreateClientPaymentInput = z.infer<typeof createClientPaymentSchema>;
export type UpdateClientPaymentInput = z.infer<typeof updateClientPaymentSchema>;
