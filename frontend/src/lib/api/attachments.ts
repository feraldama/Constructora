import api from "@/lib/api/client";

export type AttachmentEntityType = "PROJECT" | "BUDGET_ITEM" | "CONTRACTOR" | "PAYMENT";

export interface Attachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
  entityType: AttachmentEntityType;
  createdAt: string;
}

export async function getAttachments(
  entityType: AttachmentEntityType,
  entityId: string
): Promise<Attachment[]> {
  const { data } = await api.get<Attachment[]>("/attachments", {
    params: { entityType, entityId },
  });
  return data;
}

export async function uploadAttachments(
  files: File[],
  entityType: AttachmentEntityType,
  entityId: string
): Promise<Attachment[]> {
  const formData = new FormData();
  formData.append("entityType", entityType);
  formData.append("entityId", entityId);
  files.forEach((file) => formData.append("files", file));

  const { data } = await api.post<Attachment[]>("/attachments", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function deleteAttachment(id: string): Promise<void> {
  await api.delete(`/attachments/${id}`);
}
