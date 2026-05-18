import { z } from "zod";
import { PaymentMethod } from "../../generated/prisma/enums.js";

export const createPurchaseSchema = z.object({
  materialId: z.string().uuid(),
  projectId: z.string().uuid().optional().nullable(),
  quantity: z.coerce.number().positive("La cantidad debe ser mayor a 0"),
  unitPrice: z.coerce.number().nonnegative("El precio no puede ser negativo"),
  supplier: z.string().optional().nullable(),
  invoiceRef: z.string().optional().nullable(),
  purchaseDate: z.coerce.date().optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional().nullable(),
  bank: z.string().max(100).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updatePurchaseSchema = createPurchaseSchema.partial();

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
export type UpdatePurchaseInput = z.infer<typeof updatePurchaseSchema>;
