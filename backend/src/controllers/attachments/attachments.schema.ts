import { z } from "zod";

export const uploadAttachmentSchema = z.object({
  entityType: z.enum(["PROJECT", "BUDGET_ITEM", "CONTRACTOR", "PAYMENT"]),
  entityId: z.string().uuid(),
});

export type UploadAttachmentInput = z.infer<typeof uploadAttachmentSchema>;
