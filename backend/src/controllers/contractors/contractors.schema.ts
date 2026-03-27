import { z } from "zod";

export const createContractorSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  contactName: z.string().optional(),
  email: z.string().email("Email no válido").optional(),
  phone: z.string().optional(),
  taxId: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export const updateContractorSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").optional(),
  contactName: z.string().optional(),
  email: z.string().email("Email no válido").optional(),
  phone: z.string().optional(),
  taxId: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type CreateContractorInput = z.infer<typeof createContractorSchema>;
export type UpdateContractorInput = z.infer<typeof updateContractorSchema>;
