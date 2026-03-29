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

export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "CHECK" | "OTHER";

export interface CreatePaymentPayload {
  projectId:     string;
  contractorId:  string;
  budgetItemId:  string;           // requerido — valida contra ContractorAssignment
  amount:        number;
  paymentType:   "PARTIAL" | "TOTAL";
  paymentMethod?: PaymentMethod;
  /** ISO 8601 — si se provee, el pago se crea como PAID */
  paymentDate?:  string;
  dueDate?:      string;
  description?:  string;
  invoiceNumber?: string;
}

export interface UpdatePaymentPayload {
  amount?:        number;
  status?:        "PENDING" | "PAID" | "OVERDUE" | "CANCELLED";
  paymentMethod?: PaymentMethod;
  description?:   string;
  invoiceNumber?: string;
  dueDate?:       string;
  paidAt?:        string;
}

export interface CertificateItemSummary {
  id: string;
  budgetItemId: string;
  budgetItemName: string;
  categoryName: string;
  unit: string;
  currentQuantity: number;
  unitPrice: number;
  currentAmount: number;
}

export interface CertificatePaymentSummary {
  id: string;
  budgetItemId?: string | null;
  status: string;
  amount: number;
}

export interface PaymentCertificate {
  id: string;
  certificateNumber: number;
  totalAmount: number;
  status: string;
  items: CertificateItemSummary[];
  payments: CertificatePaymentSummary[];
}

export interface PaymentDetail extends Payment {
  budgetItem?: {
    id: string;
    name: string;
    unit: string;
  };
  attachments?: { id: string; fileName: string; fileUrl: string }[];
  _count?: { attachments: number };
  certificate?: PaymentCertificate | null;
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

// ─── Contexto financiero de una asignación ───────────────────────────────────

export interface AssignmentFinancialContext {
  contractorId:     string;
  budgetItemId:     string;
  assignedQuantity: number;
  /** Monto total acordado — campo directo del contrato, no precio unitario */
  totalAcordado:    number;
  /** totalAcordado / assignedQuantity — solo informativo */
  precioUnitario:   number;
  /** Pagos confirmados (PAID) */
  totalPagado:      number;
  /** Pagos programados (PENDING) */
  totalPendiente:   number;
  /** Pagos vencidos (OVERDUE) */
  totalVencido:     number;
  /** totalPagado + totalPendiente + totalVencido */
  committed:        number;
  /** totalAcordado - committed — tope para nuevos pagos */
  saldoDisponible:  number;
  /** totalAcordado - totalPagado — deuda real sin contar pendientes */
  saldoPendiente:   number;
  porcentajePagado:        number;
  porcentajeComprometido:  number;
  estaPagoCompleto:        boolean;
  estaComprometidoEnExceso: boolean;
}

/**
 * Obtiene el contexto financiero de un ContractorAssignment.
 * Usar para mostrar el cuadro financiero antes de crear un pago.
 */
export async function getAssignmentContext(
  contractorId: string,
  budgetItemId: string
): Promise<AssignmentFinancialContext> {
  const { data } = await api.get<AssignmentFinancialContext>(
    "/payments/assignment-context",
    { params: { contractorId, budgetItemId } }
  );
  return data;
}
