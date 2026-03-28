import { z } from "zod";

export const listUsersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "USER"]).optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});

export const updateUserRoleSchema = z.object({
  globalRole: z.enum(["SUPER_ADMIN", "ADMIN", "USER"]),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});

export type ListUsersInput = z.infer<typeof listUsersSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
