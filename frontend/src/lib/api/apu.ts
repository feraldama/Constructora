import api from "@/lib/api/client";
import type { APUBreakdown, BudgetItemMaterial, BudgetItemLabor } from "@/types";

export interface AddAPUMaterialPayload {
  materialId: string;
  consumptionPerUnit: number;
  wastePercent?: number;
}

export interface UpdateAPUMaterialPayload {
  consumptionPerUnit?: number;
  wastePercent?: number;
}

export interface AddAPULaborPayload {
  description: string;
  costPerUnit: number;
}

export interface UpdateAPULaborPayload {
  description?: string;
  costPerUnit?: number;
}

export async function getAPU(budgetItemId: string): Promise<APUBreakdown> {
  const { data } = await api.get<APUBreakdown>(`/budget-items/${budgetItemId}/apu`);
  return data;
}

export async function addAPUMaterial(
  budgetItemId: string,
  payload: AddAPUMaterialPayload
): Promise<BudgetItemMaterial> {
  const { data } = await api.post<BudgetItemMaterial>(
    `/budget-items/${budgetItemId}/apu/materials`,
    payload
  );
  return data;
}

export async function updateAPUMaterial(
  budgetItemId: string,
  apuMaterialId: string,
  payload: UpdateAPUMaterialPayload
): Promise<BudgetItemMaterial> {
  const { data } = await api.patch<BudgetItemMaterial>(
    `/budget-items/${budgetItemId}/apu/materials/${apuMaterialId}`,
    payload
  );
  return data;
}

export async function deleteAPUMaterial(
  budgetItemId: string,
  apuMaterialId: string
): Promise<void> {
  await api.delete(`/budget-items/${budgetItemId}/apu/materials/${apuMaterialId}`);
}

export async function addAPULabor(
  budgetItemId: string,
  payload: AddAPULaborPayload
): Promise<BudgetItemLabor> {
  const { data } = await api.post<BudgetItemLabor>(
    `/budget-items/${budgetItemId}/apu/labor`,
    payload
  );
  return data;
}

export async function updateAPULabor(
  budgetItemId: string,
  apuLaborId: string,
  payload: UpdateAPULaborPayload
): Promise<BudgetItemLabor> {
  const { data } = await api.patch<BudgetItemLabor>(
    `/budget-items/${budgetItemId}/apu/labor/${apuLaborId}`,
    payload
  );
  return data;
}

export async function deleteAPULabor(
  budgetItemId: string,
  apuLaborId: string
): Promise<void> {
  await api.delete(`/budget-items/${budgetItemId}/apu/labor/${apuLaborId}`);
}

export async function refreshAPUPrices(budgetItemId: string): Promise<void> {
  await api.post(`/budget-items/${budgetItemId}/apu/refresh-prices`);
}
