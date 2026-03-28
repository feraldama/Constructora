import { z } from "zod";
import { ProjectRole } from "../../generated/prisma/enums.js";

export const addMemberSchema = z.object({
  email: z.string().email("Email inválido"),
  role: z.nativeEnum(ProjectRole).optional().default("VIEWER"),
});

export const updateMemberRoleSchema = z.object({
  role: z.nativeEnum(ProjectRole),
});

export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
