import { z } from "zod";
import { MeasurementUnit, MaterialCategory } from "../../generated/prisma/enums.js";

export const createMaterialSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  /** Confirma la creación aunque ya exista otro material con el mismo nombre */
  allowDuplicateName: z.boolean().optional().default(false),
  unit: z.nativeEnum(MeasurementUnit),
  unitPrice: z.coerce.number().nonnegative("El precio no puede ser negativo"),
  presentationQty: z.coerce.number().positive("La presentación debe ser mayor a 0").optional().default(1),
  category: z.nativeEnum(MaterialCategory).optional().default("OTHER"),
  brand: z.string().optional().nullable(),
  supplier: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

/**
 * PATCH parcial: se define campo por campo y SIN `.default()`.
 *
 * `createMaterialSchema.partial()` no sirve acá: Zod sigue aplicando los
 * defaults de las claves ausentes, así que un PATCH que no mande
 * `presentationQty`/`category` los reescribía a 1 / OTHER — y `presentationQty`
 * divide el precio para el costo unitario de todos los APU que usan el material.
 */
export const updateMaterialSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").optional(),
  unit: z.nativeEnum(MeasurementUnit).optional(),
  unitPrice: z.coerce.number().nonnegative("El precio no puede ser negativo").optional(),
  presentationQty: z.coerce
    .number()
    .positive("La presentación debe ser mayor a 0")
    .optional(),
  category: z.nativeEnum(MaterialCategory).optional(),
  brand: z.string().optional().nullable(),
  supplier: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  /** Confirma el cambio aunque el nombre ya lo use otro material */
  allowDuplicateName: z.boolean().optional().default(false),
});

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;
export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>;
