import { z } from "zod";

/** Aplicar una plantilla APU a un BudgetItem existente o crear uno nuevo. */
export const applyAPUTemplateSchema = z
  .object({
    // Opción A: crear un nuevo BudgetItem en una categoría dada
    categoryId: z.string().uuid().optional(),
    // Opción B: aplicar a un BudgetItem ya creado
    budgetItemId: z.string().uuid().optional(),
    // Sobrescribir el nombre (opcional)
    name: z.string().min(1).optional(),
    quantity: z.coerce.number().nonnegative().optional().default(0),
    // Si true, reemplaza líneas APU existentes en el item destino
    replaceExisting: z.boolean().optional().default(false),
  })
  .refine((d) => d.categoryId || d.budgetItemId, {
    message: "Se requiere categoryId o budgetItemId",
  });

export type ApplyAPUTemplateInput = z.infer<typeof applyAPUTemplateSchema>;
