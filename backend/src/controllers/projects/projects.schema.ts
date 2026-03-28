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
