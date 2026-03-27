import api from "@/lib/api/client";
import type { Contractor, PaginatedResponse } from "@/types";

// ---------- Types ----------

export interface ContractorFilters {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface ContractorPayload {
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  taxId?: string;
  address?: string;
  notes?: string;
}

export interface ContractorDetail extends Contractor {
  address?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  projects?: { project: { id: string; name: string; status: string } }[];
  financial?: ContractorFinancialSummary;
  assignments?: AssignmentWithProgress[];
}

export interface ContractorFinancialSummary {
  contractorId: string;
  contractorName: string;
  totalAgreed: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  totalRemaining: number;
  globalPaidPercent: number;
  projects: {
    projectId: string;
    projectName: string;
    projectStatus: string;
    agreed: number;
    paid: number;
    pending: number;
    overdue: number;
    remaining: number;
    paidPercent: number;
    assignmentCount: number;
  }[];
  totalAssignments: number;
  totalPayments: number;
  activeProjects: number;
}

export interface AssignmentWithProgress {
  id: string;
  budgetItemId: string;
  budgetItemName: string;
  unit: string;
  projectId: string;
  projectName: string;
  assignedQuantity: number;
  agreedPrice: number;
  totalPaid: number;
  totalPending: number;
  remaining: number;
  paidPercent: number;
}

export interface PaymentsByProject {
  projectId: string;
  projectName: string;
  payments: {
    id: string;
    amount: number;
    status: string;
    description: string | null;
    invoiceNumber: string | null;
    dueDate: string | null;
    paidAt: string | null;
    createdAt: string;
    budgetItemName: string | null;
  }[];
  totals: {
    paid: number;
    pending: number;
    overdue: number;
    count: number;
  };
}

// ---------- API functions ----------

export async function getContractors(
  params?: ContractorFilters
): Promise<PaginatedResponse<ContractorDetail>> {
  const { data } = await api.get<PaginatedResponse<ContractorDetail>>("/contractors", { params });
  return data;
}

export async function getContractor(id: string): Promise<ContractorDetail> {
  const { data } = await api.get<ContractorDetail>(`/contractors/${id}`);
  return data;
}

export async function createContractor(payload: ContractorPayload): Promise<ContractorDetail> {
  const { data } = await api.post<ContractorDetail>("/contractors", payload);
  return data;
}

export async function updateContractor(id: string, payload: Partial<ContractorPayload>): Promise<ContractorDetail> {
  const { data } = await api.patch<ContractorDetail>(`/contractors/${id}`, payload);
  return data;
}

export async function deleteContractor(id: string): Promise<void> {
  await api.delete(`/contractors/${id}`);
}

export async function getContractorFinancial(id: string): Promise<ContractorFinancialSummary> {
  const { data } = await api.get<ContractorFinancialSummary>(`/contractors/${id}/financial`);
  return data;
}

export async function getContractorAssignments(id: string, projectId?: string): Promise<AssignmentWithProgress[]> {
  const { data } = await api.get<AssignmentWithProgress[]>(`/contractors/${id}/assignments`, {
    params: projectId ? { projectId } : {},
  });
  return data;
}

export async function getContractorPaymentsGrouped(id: string): Promise<PaymentsByProject[]> {
  const { data } = await api.get<PaymentsByProject[]>(`/contractors/${id}/payments`);
  return data;
}
