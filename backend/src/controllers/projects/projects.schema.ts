import { z } from "zod";
import { ProjectStatus } from "../../generated/prisma/enums.js";

export const createProjectSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  address: z.string().optional(),
  initialBudget: z.coerce.number().nonnegative().optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").optional(),
  description: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  initialBudget: z.coerce.number().nonnegative().optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  startDate: z.string().datetime().nullable().optional(),
  estimatedEnd: z.string().datetime().nullable().optional(),
});

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
