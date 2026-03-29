import api from "@/lib/api/client";

export interface ProgressEntryDTO {
  id: string;
  budgetItemId: string;
  quantity: number;
  date: string;
  notes: string | null;
  recordedBy: { firstName: string; lastName: string };
  createdAt: string;
}

export interface BudgetItemProgressDTO {
  entries: ProgressEntryDTO[];
  cumulativeQuantity: number;
  budgetedQuantity: number;
  percent: number;
}

export interface ProjectProgressItem {
  budgetItemId: string;
  name: string;
  unit: string;
  budgetedQuantity: number;
  measuredQuantity: number;
  percent: number;
  saleSubtotal: number;
}

export interface ProjectProgressDTO {
  items: ProjectProgressItem[];
  overallPercent: number;
  totalItems: number;
  itemsWithProgress: number;
}

export async function getBudgetItemProgress(
  budgetItemId: string
): Promise<BudgetItemProgressDTO> {
  const { data } = await api.get<BudgetItemProgressDTO>(
    `/budget-items/${budgetItemId}/progress`
  );
  return data;
}

export async function createProgressEntry(
  budgetItemId: string,
  payload: { quantity: number; date?: string; notes?: string }
): Promise<ProgressEntryDTO> {
  const { data } = await api.post<ProgressEntryDTO>(
    `/budget-items/${budgetItemId}/progress`,
    payload
  );
  return data;
}

export async function updateProgressEntry(
  entryId: string,
  payload: Partial<{ quantity: number; date: string; notes: string }>
): Promise<ProgressEntryDTO> {
  const { data } = await api.patch<ProgressEntryDTO>(
    `/progress-entries/${entryId}`,
    payload
  );
  return data;
}

export async function deleteProgressEntry(entryId: string): Promise<void> {
  await api.delete(`/progress-entries/${entryId}`);
}

export async function getProjectProgress(
  projectId: string
): Promise<ProjectProgressDTO> {
  const { data } = await api.get<ProjectProgressDTO>(
    `/projects/${projectId}/progress`
  );
  return data;
}
