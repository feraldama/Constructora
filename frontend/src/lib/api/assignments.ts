import api from "@/lib/api/client";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface AssignmentFinancials {
  totalPaid: number;
  totalPending: number;
  remaining: number;
  paidPercent: number;
}

export interface AssignmentDetail {
  id: string;
  contractorId: string;
  budgetItemId: string;
  assignedQuantity: number;
  agreedPrice: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  contractor: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    isActive: boolean;
  };
  budgetItem: {
    id: string;
    name: string;
    categoryName: string;
    projectId: string;
  };
  financials: AssignmentFinancials;
}

export interface AssignmentsByItemResponse {
  budgetItem: {
    id: string;
    name: string;
    quantity: number;
    totalAssigned: number;
    availableQuantity: number;
  };
  assignments: AssignmentDetail[];
}

export interface CreateAssignmentPayload {
  contractorId: string;
  budgetItemId: string;
  assignedQuantity: number;
  agreedPrice: number;
  notes?: string;
}

export interface UpdateAssignmentPayload {
  assignedQuantity?: number;
  agreedPrice?: number;
  notes?: string | null;
}

// ─── API ──────────────────────────────────────────────────────────────────────

/** Asignaciones de una partida, con avance financiero por contratista. */
export async function getAssignmentsByItem(
  budgetItemId: string
): Promise<AssignmentsByItemResponse> {
  const { data } = await api.get<AssignmentsByItemResponse>("/assignments", {
    params: { budgetItemId },
  });
  return data;
}

/** Todas las partidas asignadas a un contratista, opcionalmente filtradas por proyecto. */
export async function getAssignmentsByContractor(
  contractorId: string,
  projectId?: string
): Promise<AssignmentDetail[]> {
  const { data } = await api.get<AssignmentDetail[]>("/assignments", {
    params: { contractorId, ...(projectId ? { projectId } : {}) },
  });
  return data;
}

export async function createAssignment(
  payload: CreateAssignmentPayload
): Promise<AssignmentDetail> {
  const { data } = await api.post<AssignmentDetail>("/assignments", payload);
  return data;
}

export async function updateAssignment(
  id: string,
  payload: UpdateAssignmentPayload
): Promise<AssignmentDetail> {
  const { data } = await api.patch<AssignmentDetail>(`/assignments/${id}`, payload);
  return data;
}

export async function deleteAssignment(id: string): Promise<void> {
  await api.delete(`/assignments/${id}`);
}

// ─── Analíticas de proyecto ───────────────────────────────────────────────────

export interface ContractorFinancialStats {
  contractorId: string;
  contractorName: string;
  email: string | null;
  phone: string | null;
  assignmentCount: number;
  totalAgreed: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  /** totalAgreed − totalPaid */
  balanceRemaining: number;
  /** Solo pagos OVERDUE */
  overdueDebt: number;
  paidPercent: number;
  /** 1 = más costoso del proyecto */
  costRank: number;
}

export interface ProjectContractorStats {
  projectId: string;
  totalAgreed: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  totalOwed: number;
  contractors: ContractorFinancialStats[];
}

export interface ItemCost {
  itemId: string;
  itemName: string;
  unit: string;
  quantity: number;
  categoryId: string;
  categoryName: string;
  budgetedCost: number;
  budgetedRevenue: number;
  contractorCount: number;
  totalContracted: number;
  /** budgetedCost − totalContracted (positivo = favorable) */
  costVariance: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  balanceRemaining: number;
}

export interface ProjectItemCosts {
  projectId: string;
  totalBudgetedCost: number;
  totalContracted: number;
  totalPaid: number;
  items: ItemCost[];
}

/** Queries 1-3: deuda por contratista, total pagado y ranking por costo. */
export async function getProjectContractorStats(
  projectId: string
): Promise<ProjectContractorStats> {
  const { data } = await api.get<ProjectContractorStats>(
    `/assignments/project/${projectId}/contractors`
  );
  return data;
}

/** Query 4: costos por partida con varianza vs presupuesto. */
export async function getProjectItemCosts(
  projectId: string
): Promise<ProjectItemCosts> {
  const { data } = await api.get<ProjectItemCosts>(
    `/assignments/project/${projectId}/items`
  );
  return data;
}
