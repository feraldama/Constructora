"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAttachments,
  uploadAttachments,
  deleteAttachment,
  type AttachmentEntityType,
} from "@/lib/api/attachments";

const ATTACHMENTS_KEY = ["attachments"];

export function useAttachments(entityType: AttachmentEntityType, entityId: string | undefined) {
  return useQuery({
    queryKey: [...ATTACHMENTS_KEY, entityType, entityId],
    queryFn: () => getAttachments(entityType, entityId!),
    enabled: !!entityId,
  });
}

export function useUploadAttachments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      files,
      entityType,
      entityId,
    }: {
      files: File[];
      entityType: AttachmentEntityType;
      entityId: string;
    }) => uploadAttachments(files, entityType, entityId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ATTACHMENTS_KEY });
    },
  });
}

export function useDeleteAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteAttachment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ATTACHMENTS_KEY });
    },
  });
}
