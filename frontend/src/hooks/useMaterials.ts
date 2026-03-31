"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMaterials,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  type CreateMaterialPayload,
  type UpdateMaterialPayload,
} from "@/lib/api/materials";
import type { MaterialCategory } from "@/types";

const materialsKey = (params?: { search?: string; category?: MaterialCategory; isActive?: boolean }) =>
  ["materials", params ?? {}] as const;

export function useMaterials(params?: { search?: string; category?: MaterialCategory; isActive?: boolean }) {
  return useQuery({
    queryKey: materialsKey(params),
    queryFn: () => getMaterials(params),
  });
}

export function useCreateMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateMaterialPayload) => createMaterial(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["materials"] });
    },
  });
}

export function useUpdateMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateMaterialPayload }) =>
      updateMaterial(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["materials"] });
    },
  });
}

export function useDeleteMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMaterial(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["materials"] });
    },
  });
}
