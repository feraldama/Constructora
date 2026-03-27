import api from "@/lib/api/client";
import type { Payment, PaginatedResponse } from "@/types";

// ---------- Types ----------

export interface PaymentFilters {
  projectId?: string;
  contractorId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface CreatePaymentPayload {
  projectId: string;
  contractorId: string;
  budgetItemId?: string;
  amount: number;
  description?: string;
  invoiceNumber?: string;
  dueDate?: string;
  paymentType: "PARTIAL" | "TOTAL";
}

export interface UpdatePaymentPayload {
  amount?: number;
  status?: "PENDING" | "PAID" | "OVERDUE" | "CANCELLED";
  description?: string;
  invoiceNumber?: string;
  dueDate?: string;
  paidAt?: string;
}

export interface PaymentDetail extends Payment {
  budgetItem?: {
    id: string;
    name: string;
    unit: string;
  };
  attachments?: { id: string; fileName: string; fileUrl: string }[];
  _count?: { attachments: number };
}

export interface ContractorDebt {
  contractorId: string;
  contractorName: string;
  totalAgreed: number;
  totalPaid: number;
  totalPending: number;
  remaining: number;
}

export interface DashboardSummary {
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  totalCancelled: number;
  overdueCount: number;
  upcomingDueCount: number;
  recentPayments: Payment[];
}

// ---------- API functions ----------

export async function getPayments(
  params?: PaymentFilters
): Promise<PaginatedResponse<PaymentDetail>> {
  const { data } = await api.get<PaginatedResponse<PaymentDetail>>("/payments", {
    params,
  });
  return data;
}

export async function getPayment(id: string): Promise<PaymentDetail> {
  const { data } = await api.get<PaymentDetail>(`/payments/${id}`);
  return data;
}

export async function createPayment(
  payload: CreatePaymentPayload
): Promise<Payment> {
  const { data } = await api.post<Payment>("/payments", payload);
  return data;
}

export async function updatePayment(
  id: string,
  payload: UpdatePaymentPayload
): Promise<Payment> {
  const { data } = await api.patch<Payment>(`/payments/${id}`, payload);
  return data;
}

export async function deletePayment(id: string): Promise<void> {
  await api.delete(`/payments/${id}`);
}

export async function getPaymentSummary(
  projectId: string
): Promise<DashboardSummary> {
  const { data } = await api.get<DashboardSummary>("/payments/summary", {
    params: { projectId },
  });
  return data;
}

export async function getContractorDebts(
  projectId: string
): Promise<ContractorDebt[]> {
  const { data } = await api.get<ContractorDebt[]>("/payments/debts", {
    params: { projectId },
  });
  return data;
}

export async function triggerMarkOverdue(): Promise<{ updated: number }> {
  const { data } = await api.post<{ updated: number }>("/payments/mark-overdue");
  return data;
}
