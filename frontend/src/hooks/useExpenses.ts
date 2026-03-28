"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  type CreateExpensePayload,
  type UpdateExpensePayload,
} from "@/lib/api/expenses";

const expensesKey = (projectId: string) => ["expenses", projectId] as const;

export function useExpenses(projectId: string | undefined) {
  return useQuery({
    queryKey: projectId ? expensesKey(projectId) : ["expenses", "none"],
    queryFn: () => getExpenses(projectId!),
    enabled: !!projectId,
  });
}

export function useCreateExpense(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateExpensePayload) =>
      createExpense(projectId!, payload),
    onSuccess: () => {
      if (projectId) {
        void qc.invalidateQueries({ queryKey: expensesKey(projectId) });
        void qc.invalidateQueries({ queryKey: ["dashboard"] });
      }
    },
  });
}

export function useUpdateExpense(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateExpensePayload }) =>
      updateExpense(id, payload),
    onSuccess: () => {
      if (projectId) {
        void qc.invalidateQueries({ queryKey: expensesKey(projectId) });
        void qc.invalidateQueries({ queryKey: ["dashboard"] });
      }
    },
  });
}

export function useDeleteExpense(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => {
      if (projectId) {
        void qc.invalidateQueries({ queryKey: expensesKey(projectId) });
        void qc.invalidateQueries({ queryKey: ["dashboard"] });
      }
    },
  });
}
