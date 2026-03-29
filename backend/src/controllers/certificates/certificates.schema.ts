import { z } from "zod";

export const createCertificateSchema = z
  .object({
    projectId: z.string().uuid(),
    contractorId: z.string().uuid(),
    periodStart: z.string().datetime(),
    periodEnd: z.string().datetime(),
    notes: z.string().max(1000).optional(),
  })
  .refine((d) => new Date(d.periodEnd) > new Date(d.periodStart), {
    message: "La fecha de fin debe ser posterior a la de inicio",
    path: ["periodEnd"],
  });

export const updateCertificateSchema = z.object({
  periodStart: z.string().datetime().optional(),
  periodEnd: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
});

export const updateCertificateItemSchema = z.object({
  currentQuantity: z.coerce.number().min(0, "La cantidad no puede ser negativa"),
});

export const rejectCertificateSchema = z.object({
  reason: z.string().min(1, "El motivo es obligatorio").max(500),
});

export const generatePaymentSchema = z
  .object({
    mode: z.enum(["FULL", "BY_ITEMS"]),
    itemIds: z.array(z.string().uuid()).optional(),
  })
  .refine(
    (d) => d.mode === "FULL" || (d.itemIds && d.itemIds.length > 0),
    { message: "Debe seleccionar al menos una partida", path: ["itemIds"] }
  );

export type CreateCertificateInput = z.infer<typeof createCertificateSchema>;
export type UpdateCertificateInput = z.infer<typeof updateCertificateSchema>;
export type UpdateCertificateItemInput = z.infer<typeof updateCertificateItemSchema>;
export type RejectCertificateInput = z.infer<typeof rejectCertificateSchema>;
export type GeneratePaymentInput = z.infer<typeof generatePaymentSchema>;
