import api from "@/lib/api/client";

// ── Finance Summary ─────────────────────────────────────────────────────────

export interface ItemFinancial {
  itemId: string;
  itemName: string;
  categoryId: string;
  categoryName: string;
  unit: string;
  quantity: number;
  costUnitPrice: number;
  saleUnitPrice: number;
  costSubtotal: number;
  saleSubtotal: number;
  grossProfit: number;
  marginPercent: number;
}

export interface ProjectFinancialSummary {
  projectId: string;
  totalRevenue: number;
  totalCostItems: number;
  totalExpenses: number;
  totalCost: number;
  totalPaid: number;
  totalPending: number;
  totalExecuted: number;
  grossProfit: number;
  profitMargin: number;
  costVariance: number;
  costVariancePercent: number;
  expensesByType: { expenseType: string; total: number; count: number }[];
  topItems: ItemFinancial[];
  riskItems: ItemFinancial[];
}

export async function getFinancialSummary(projectId: string): Promise<ProjectFinancialSummary> {
  const { data } = await api.get<ProjectFinancialSummary>(
    `/projects/${projectId}/finance/summary`
  );
  return data;
}

export async function getFinancialItems(projectId: string): Promise<ItemFinancial[]> {
  const { data } = await api.get<ItemFinancial[]>(
    `/projects/${projectId}/finance/items`
  );
  return data;
}

// ── Cash Flow ───────────────────────────────────────────────────────────────

export interface CashFlowPeriod {
  period: string;
  paid: number;
  scheduled: number;
  predicted: number;
  cumulative: number;
}

export interface CashFlowResult {
  periods: CashFlowPeriod[];
  totals: {
    paid: number;
    scheduled: number;
    predicted: number;
    unscheduledBalance: number;
  };
  generatedAt: string;
}

export interface PaymentPrediction {
  contractorId: string;
  contractorName: string;
  budgetItemId: string;
  budgetItemName: string;
  agreedPrice: number;
  committed: number;
  unscheduledBalance: number;
  predictedDate: string | null;
  avgDaysBetweenPayments: number | null;
  lastPaymentDate: string | null;
  paidCount: number;
  confidence: "high" | "medium" | "none";
  confidenceReason: string;
}

export interface PaymentPredictionsResult {
  predictions: PaymentPrediction[];
  totalUnscheduled: number;
  generatedAt: string;
}

export interface DebtAlert {
  type: string;
  severity: "critical" | "high" | "medium";
  contractorId: string;
  contractorName: string;
  budgetItemId: string;
  budgetItemName: string;
  amount: number;
  message: string;
}

export interface DebtAlertsResult {
  alerts: DebtAlert[];
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  totalAtRisk: number;
  generatedAt: string;
}

export async function getCashFlow(projectId: string): Promise<CashFlowResult> {
  const { data } = await api.get<CashFlowResult>(`/payments/cash-flow`, {
    params: { projectId },
  });
  return data;
}

export async function getPaymentPredictions(
  projectId: string
): Promise<PaymentPredictionsResult> {
  const { data } = await api.get<PaymentPredictionsResult>(`/payments/predictions`, {
    params: { projectId },
  });
  return data;
}

export async function getDebtAlerts(projectId: string): Promise<DebtAlertsResult> {
  const { data } = await api.get<DebtAlertsResult>(`/payments/debt-alerts`, {
    params: { projectId },
  });
  return data;
}

// ── Variance Analysis ──────────────────────────────────────────────────────

export interface VarianceItem {
  itemId: string;
  itemName: string;
  categoryId: string;
  categoryName: string;
  unit: string;
  budgetedQty: number;
  costUnitPrice: number;
  saleUnitPrice: number;
  budgetedCost: number;
  budgetedSale: number;
  committedPrice: number;
  paidAmount: number;
  pendingAmount: number;
  totalExecuted: number;
  linkedExpenses: number;
  certifiedAmount: number;
  certifiedQty: number;
  progressQty: number;
  progressPercent: number;
  costVariance: number;
  costVariancePercent: number;
  saleVariance: number;
  status: "under" | "on_track" | "over";
}

export interface CategoryVariance {
  categoryId: string;
  categoryName: string;
  budgetedCost: number;
  budgetedSale: number;
  committedPrice: number;
  paidAmount: number;
  pendingAmount: number;
  totalExecuted: number;
  certifiedAmount: number;
  costVariance: number;
  costVariancePercent: number;
  itemCount: number;
  overCount: number;
}

export interface VarianceAnalysisResult {
  summary: {
    totalBudgetedCost: number;
    totalBudgetedSale: number;
    totalCommitted: number;
    totalPaid: number;
    totalPending: number;
    totalExecuted: number;
    totalCertified: number;
    costVariance: number;
    costVariancePercent: number;
    commitVariance: number;
    commitVariancePercent: number;
    overBudgetItems: number;
    onTrackItems: number;
    underBudgetItems: number;
  };
  categories: CategoryVariance[];
  items: VarianceItem[];
  generatedAt: string;
}

export async function getVarianceAnalysis(projectId: string): Promise<VarianceAnalysisResult> {
  const { data } = await api.get<VarianceAnalysisResult>(
    `/projects/${projectId}/finance/variance`
  );
  return data;
}
