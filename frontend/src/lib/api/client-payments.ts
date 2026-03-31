import api from "@/lib/api/client";
import type { ClientPayment, ClientPaymentConcept, PaymentMethod } from "@/types";

export interface CreateClientPaymentPayload {
  amount: number;
  paymentDate: string;
  paymentMethod?: PaymentMethod | null;
  concept?: ClientPaymentConcept;
  reference?: string | null;
  notes?: string | null;
}

export type UpdateClientPaymentPayload = Partial<CreateClientPaymentPayload>;

export interface ClientPaymentSummary {
  totalCollected: number;
  totalBudgeted: number;
  pendingBalance: number;
  count: number;
  byConcept: { concept: ClientPaymentConcept; total: number }[];
}

export async function getClientPayments(projectId: string): Promise<ClientPayment[]> {
  const { data } = await api.get<ClientPayment[]>(`/projects/${projectId}/client-payments`);
  return data;
}

export async function getClientPaymentSummary(projectId: string): Promise<ClientPaymentSummary> {
  const { data } = await api.get<ClientPaymentSummary>(`/projects/${projectId}/client-payments/summary`);
  return data;
}

export async function createClientPayment(
  projectId: string,
  payload: CreateClientPaymentPayload
): Promise<ClientPayment> {
  const { data } = await api.post<ClientPayment>(
    `/projects/${projectId}/client-payments`,
    payload
  );
  return data;
}

export async function updateClientPayment(
  projectId: string,
  paymentId: string,
  payload: UpdateClientPaymentPayload
): Promise<ClientPayment> {
  const { data } = await api.patch<ClientPayment>(
    `/projects/${projectId}/client-payments/${paymentId}`,
    payload
  );
  return data;
}

export async function deleteClientPayment(
  projectId: string,
  paymentId: string
): Promise<void> {
  await api.delete(`/projects/${projectId}/client-payments/${paymentId}`);
}
