import api from "@/lib/api/client";
import type { PaginatedResponse, PaymentMethod, Purchase } from "@/types";

export interface ListPurchasesParams {
  materialId?: string;
  projectId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export async function getPurchases(
  params?: ListPurchasesParams
): Promise<PaginatedResponse<Purchase>> {
  const { data } = await api.get<PaginatedResponse<Purchase>>("/purchases", { params });
  return data;
}

export async function getPurchase(id: string): Promise<Purchase> {
  const { data } = await api.get<Purchase>(`/purchases/${id}`);
  return data;
}

export interface CreatePurchasePayload {
  materialId: string;
  projectId?: string | null;
  quantity: number;
  unitPrice: number;
  supplier?: string | null;
  invoiceRef?: string | null;
  purchaseDate?: string;
  paymentMethod?: PaymentMethod | null;
  bank?: string | null;
  notes?: string | null;
}

export async function createPurchase(payload: CreatePurchasePayload): Promise<Purchase> {
  const { data } = await api.post<Purchase>("/purchases", payload);
  return data;
}

export type UpdatePurchasePayload = Partial<CreatePurchasePayload>;

export async function updatePurchase(
  id: string,
  payload: UpdatePurchasePayload
): Promise<Purchase> {
  const { data } = await api.patch<Purchase>(`/purchases/${id}`, payload);
  return data;
}

export async function deletePurchase(id: string): Promise<void> {
  await api.delete(`/purchases/${id}`);
}
