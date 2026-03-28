import api from "@/lib/api/client";
import type { BudgetItem, MeasurementUnit } from "@/types";

export interface BudgetCategoryDTO {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  sortOrder: number;
  items: BudgetItem[];
}

export async function getProjectBudget(projectId: string): Promise<{ categories: BudgetCategoryDTO[] }> {
  const { data } = await api.get<{ categories: BudgetCategoryDTO[] }>(
    `/projects/${projectId}/budget`
  );
  return data;
}

export async function createBudgetCategory(
  projectId: string,
  payload: { name: string; description?: string }
): Promise<BudgetCategoryDTO> {
  const { data } = await api.post<BudgetCategoryDTO>(`/projects/${projectId}/categories`, payload);
  return data;
}

export async function deleteBudgetCategory(projectId: string, categoryId: string): Promise<void> {
  await api.delete(`/projects/${projectId}/categories/${categoryId}`);
}

export async function createBudgetItem(
  categoryId: string,
  payload: {
    name?: string;
    description?: string;
    unit?: MeasurementUnit;
    quantity?: number;
    unitPrice?: number;
    sortOrder?: number;
  }
): Promise<BudgetItem> {
  const { data } = await api.post<BudgetItem>(`/categories/${categoryId}/budget-items`, payload);
  return data;
}

export async function updateBudgetItem(
  itemId: string,
  payload: Partial<{
    name: string;
    description: string | null;
    unit: MeasurementUnit;
    quantity: number;
    unitPrice: number;
    sortOrder: number;
  }>
): Promise<BudgetItem> {
  const { data } = await api.patch<BudgetItem>(`/budget-items/${itemId}`, payload);
  return data;
}

export async function deleteBudgetItem(itemId: string): Promise<void> {
  await api.delete(`/budget-items/${itemId}`);
}
