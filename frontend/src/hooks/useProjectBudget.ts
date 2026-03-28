"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProjectBudget,
  createBudgetCategory,
  deleteBudgetCategory,
  createBudgetItem,
  updateBudgetItem,
  deleteBudgetItem,
} from "@/lib/api/budget";
import type { BudgetItem, MeasurementUnit } from "@/types";

const budgetKey = (projectId: string) => ["budget", projectId] as const;

export function useProjectBudget(projectId: string | undefined) {
  return useQuery({
    queryKey: projectId ? budgetKey(projectId) : ["budget", "none"],
    queryFn: () => getProjectBudget(projectId!),
    enabled: !!projectId,
  });
}

export function useCreateBudgetCategory(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; description?: string }) =>
      createBudgetCategory(projectId!, payload),
    onSuccess: () => {
      if (projectId) void qc.invalidateQueries({ queryKey: budgetKey(projectId) });
    },
  });
}

export function useDeleteBudgetCategory(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (categoryId: string) => deleteBudgetCategory(projectId!, categoryId),
    onSuccess: () => {
      if (projectId) void qc.invalidateQueries({ queryKey: budgetKey(projectId) });
    },
  });
}

export function useCreateBudgetItem(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      categoryId,
      payload,
    }: {
      categoryId: string;
      payload: {
        name?: string;
        description?: string;
        unit?: MeasurementUnit;
        quantity?: number;
        unitPrice?: number;
        sortOrder?: number;
      };
    }) => createBudgetItem(categoryId, payload),
    onSuccess: () => {
      if (projectId) void qc.invalidateQueries({ queryKey: budgetKey(projectId) });
    },
  });
}

export function useUpdateBudgetItem(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      payload,
    }: {
      itemId: string;
      payload: Partial<{
        name: string;
        description: string | null;
        unit: MeasurementUnit;
        quantity: number;
        unitPrice: number;
        sortOrder: number;
      }>;
    }) => updateBudgetItem(itemId, payload),
    onSuccess: () => {
      if (projectId) void qc.invalidateQueries({ queryKey: budgetKey(projectId) });
    },
  });
}

export function useDeleteBudgetItem(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => deleteBudgetItem(itemId),
    onSuccess: () => {
      if (projectId) void qc.invalidateQueries({ queryKey: budgetKey(projectId) });
    },
  });
}
