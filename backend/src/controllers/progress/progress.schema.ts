import { z } from "zod";

export const createProgressEntrySchema = z.object({
  quantity: z.coerce.number().positive("La cantidad debe ser mayor a 0"),
  date: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
});

export const updateProgressEntrySchema = z.object({
  quantity: z.coerce.number().positive("La cantidad debe ser mayor a 0").optional(),
  date: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
});

export type CreateProgressEntryInput = z.infer<typeof createProgressEntrySchema>;
export type UpdateProgressEntryInput = z.infer<typeof updateProgressEntrySchema>;
