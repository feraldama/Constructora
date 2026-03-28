import { z } from "zod";

// ── Crear asignación ────────────────────────────────────────────────────────
export const createAssignmentSchema = z.object({
  contractorId: z.string().uuid("contractorId debe ser un UUID"),
  budgetItemId: z.string().uuid("budgetItemId debe ser un UUID"),
  assignedQuantity: z.coerce
    .number()
    .positive("La cantidad asignada debe ser mayor a 0"),
  agreedPrice: z.coerce
    .number()
    .nonnegative("El precio acordado no puede ser negativo"),
  notes: z.string().max(1000).optional(),
});

// ── Actualizar asignación ───────────────────────────────────────────────────
// Solo los campos editables post-creación. contractorId y budgetItemId son
// inmutables — si cambian, hay que eliminar y crear una nueva asignación.
export const updateAssignmentSchema = z
  .object({
    assignedQuantity: z.coerce
      .number()
      .positive("La cantidad asignada debe ser mayor a 0")
      .optional(),
    agreedPrice: z.coerce
      .number()
      .nonnegative("El precio acordado no puede ser negativo")
      .optional(),
    notes: z.string().max(1000).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Debes enviar al menos un campo para actualizar",
  });

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>;
