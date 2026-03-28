import { z } from "zod";
import { MeasurementUnit } from "../../generated/prisma/enums.js";

export const createCategorySchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
});

export const createBudgetItemSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  unit: z.nativeEnum(MeasurementUnit).optional(),
  quantity: z.coerce.number().nonnegative().optional(),
  unitPrice: z.coerce.number().nonnegative().optional(),
  sortOrder: z.number().int().optional(),
});

export const updateBudgetItemSchema = z.object({
  /** Permite "" para partidas en borrador (min(1) rechazaba guardados y el debounce podía cancelarse antes del PATCH) */
  name: z.string().max(500).optional(),
  description: z.string().optional().nullable(),
  unit: z.nativeEnum(MeasurementUnit).optional(),
  quantity: z.coerce.number().nonnegative().optional(),
  unitPrice: z.coerce.number().nonnegative().optional(),
  sortOrder: z.number().int().optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreateBudgetItemInput = z.infer<typeof createBudgetItemSchema>;
export type UpdateBudgetItemInput = z.infer<typeof updateBudgetItemSchema>;
