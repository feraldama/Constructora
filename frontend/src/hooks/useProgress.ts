"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getBudgetItemProgress,
  createProgressEntry,
  updateProgressEntry,
  deleteProgressEntry,
  getProjectProgress,
} from "@/lib/api/progress";

const PROGRESS_KEY = ["progress"];

export function useItemProgress(budgetItemId: string | undefined) {
  return useQuery({
    queryKey: [...PROGRESS_KEY, "item", budgetItemId],
    queryFn: () => getBudgetItemProgress(budgetItemId!),
    enabled: !!budgetItemId,
  });
}

export function useProjectProgress(projectId: string | undefined) {
  return useQuery({
    queryKey: [...PROGRESS_KEY, "project", projectId],
    queryFn: () => getProjectProgress(projectId!),
    enabled: !!projectId,
  });
}

export function useCreateProgressEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      budgetItemId,
      payload,
    }: {
      budgetItemId: string;
      payload: { quantity: number; date?: string; notes?: string };
    }) => createProgressEntry(budgetItemId, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PROGRESS_KEY });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateProgressEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      entryId,
      payload,
    }: {
      entryId: string;
      payload: Partial<{ quantity: number; date: string; notes: string }>;
    }) => updateProgressEntry(entryId, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PROGRESS_KEY });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteProgressEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entryId: string) => deleteProgressEntry(entryId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PROGRESS_KEY });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
