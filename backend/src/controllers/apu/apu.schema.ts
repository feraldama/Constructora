import { z } from "zod";

export const addAPUMaterialSchema = z.object({
  materialId: z.string().uuid("ID de material inválido"),
  consumptionPerUnit: z.coerce.number().positive("El consumo debe ser mayor a 0"),
  wastePercent: z.coerce.number().nonnegative().max(100).optional().default(0),
});

export const updateAPUMaterialSchema = z.object({
  consumptionPerUnit: z.coerce.number().positive("El consumo debe ser mayor a 0").optional(),
  wastePercent: z.coerce.number().nonnegative().max(100).optional(),
});

export const addAPULaborSchema = z.object({
  description: z.string().min(1, "La descripción es requerida"),
  costPerUnit: z.coerce.number().nonnegative("El costo no puede ser negativo"),
});

export const updateAPULaborSchema = z.object({
  description: z.string().min(1).optional(),
  costPerUnit: z.coerce.number().nonnegative().optional(),
});

export type AddAPUMaterialInput = z.infer<typeof addAPUMaterialSchema>;
export type UpdateAPUMaterialInput = z.infer<typeof updateAPUMaterialSchema>;
export type AddAPULaborInput = z.infer<typeof addAPULaborSchema>;
export type UpdateAPULaborInput = z.infer<typeof updateAPULaborSchema>;
