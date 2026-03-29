import api from "@/lib/api/client";

export interface CertificateListItem {
  id: string;
  projectId: string;
  contractorId: string;
  contractorName: string;
  certificateNumber: number;
  periodStart: string;
  periodEnd: string;
  status: string;
  totalAmount: number;
  itemCount: number;
  submittedAt: string | null;
  approvedAt: string | null;
  createdAt: string;
}

export interface CertificateItemDTO {
  id: string;
  budgetItemId: string;
  budgetItemName: string;
  categoryName: string;
  unit: string;
  budgetedQuantity: number;
  previousQuantity: number;
  currentQuantity: number;
  accumulatedQuantity: number;
  unitPrice: number;
  currentAmount: number;
}

export interface CertificateDetail {
  id: string;
  projectId: string;
  projectName: string;
  contractorId: string;
  contractorName: string;
  certificateNumber: number;
  periodStart: string;
  periodEnd: string;
  status: string;
  notes: string | null;
  totalAmount: number;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  items: CertificateItemDTO[];
  payments: { id: string; amount: number; status: string; createdAt: string }[];
}

export interface CertificateFilters {
  projectId: string;
  contractorId?: string;
  status?: string;
}

export async function getCertificates(filters: CertificateFilters): Promise<CertificateListItem[]> {
  const { data } = await api.get<CertificateListItem[]>("/certificates", { params: filters });
  return data;
}

export async function getCertificate(id: string): Promise<CertificateDetail> {
  const { data } = await api.get<CertificateDetail>(`/certificates/${id}`);
  return data;
}

export interface CreateCertificatePayload {
  projectId: string;
  contractorId: string;
  periodStart: string;
  periodEnd: string;
  notes?: string;
}

export async function createCertificate(payload: CreateCertificatePayload) {
  const { data } = await api.post("/certificates", payload);
  return data as { id: string; certificateNumber: number };
}

export async function updateCertificate(id: string, payload: Partial<{ periodStart: string; periodEnd: string; notes: string }>) {
  const { data } = await api.patch(`/certificates/${id}`, payload);
  return data;
}

export async function deleteCertificate(id: string): Promise<void> {
  await api.delete(`/certificates/${id}`);
}

export async function updateCertificateItem(itemId: string, payload: { currentQuantity: number }) {
  const { data } = await api.patch(`/certificate-items/${itemId}`, payload);
  return data as { currentQuantity: number; accumulatedQuantity: number; currentAmount: number; certificateTotal: number };
}

export async function submitCertificate(id: string) {
  const { data } = await api.post(`/certificates/${id}/submit`);
  return data;
}

export async function approveCertificate(id: string) {
  const { data } = await api.post(`/certificates/${id}/approve`);
  return data;
}

export async function rejectCertificate(id: string, reason: string) {
  const { data } = await api.post(`/certificates/${id}/reject`, { reason });
  return data;
}

export async function resubmitCertificate(id: string) {
  const { data } = await api.post(`/certificates/${id}/resubmit`);
  return data;
}

export async function generateCertificatePayment(id: string) {
  const { data } = await api.post(`/certificates/${id}/generate-payment`);
  return data as { paymentId: string; amount: number; status: string };
}
