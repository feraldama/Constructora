import { z } from "zod";
import { MeasurementUnit, MaterialCategory } from "../../generated/prisma/enums.js";

export const createMaterialSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  unit: z.nativeEnum(MeasurementUnit),
  unitPrice: z.coerce.number().nonnegative("El precio no puede ser negativo"),
  category: z.nativeEnum(MaterialCategory).optional().default("OTHER"),
  brand: z.string().optional().nullable(),
  supplier: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateMaterialSchema = createMaterialSchema.partial();

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;
export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>;
