import api from "@/lib/api/client";
import type { ProjectExpense, ExpenseType } from "@/types";

export interface CreateExpensePayload {
  description: string;
  amount: number;
  expenseType: ExpenseType;
  expenseDate?: string;
  invoiceRef?: string;
  notes?: string;
}

export type UpdateExpensePayload = Partial<CreateExpensePayload>;

export async function getExpenses(projectId: string): Promise<ProjectExpense[]> {
  const { data } = await api.get<ProjectExpense[]>(`/projects/${projectId}/expenses`);
  return data;
}

export async function createExpense(
  projectId: string,
  payload: CreateExpensePayload
): Promise<ProjectExpense> {
  const { data } = await api.post<ProjectExpense>(
    `/projects/${projectId}/expenses`,
    payload
  );
  return data;
}

export async function updateExpense(
  expenseId: string,
  payload: UpdateExpensePayload
): Promise<ProjectExpense> {
  const { data } = await api.patch<ProjectExpense>(`/expenses/${expenseId}`, payload);
  return data;
}

export async function deleteExpense(expenseId: string): Promise<void> {
  await api.delete(`/expenses/${expenseId}`);
}
