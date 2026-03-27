import api from "@/lib/api/client";

export interface ProjectDashboard {
  budget: {
    estimated: number;
    executed: number;
    committed: number;
    remaining: number;
    executionPercent: number;
  };
  payments: {
    totalPaid: number;
    totalPending: number;
    totalOverdue: number;
    countPaid: number;
    countPending: number;
    countOverdue: number;
    countUpcoming7d: number;
  };
  progress: {
    totalItems: number;
    itemsWithPayments: number;
    percent: number;
  };
  recentActivity: {
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata: unknown;
    createdAt: string;
    userName: string | null;
  }[];
  recentPayments: {
    id: string;
    amount: number;
    status: string;
    createdAt: string;
    paidAt: string | null;
    contractorName: string;
    description: string | null;
  }[];
}

export async function getProjectDashboard(
  projectId: string
): Promise<ProjectDashboard> {
  const { data } = await api.get<ProjectDashboard>("/dashboard", {
    params: { projectId },
  });
  return data;
}
