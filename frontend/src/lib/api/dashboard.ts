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
    itemsWithProgress: number;
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

export interface OverviewProject {
  id: string;
  name: string;
  status: string;
  startDate: string | null;
  estimatedEnd: string | null;
  estimated: number;
  revenue: number;
  paid: number;
  pending: number;
  overdue: number;
  committed: number;
  executionPercent: number;
  progressPercent: number;
  profitMargin: number;
}

export interface DashboardOverview {
  projects: OverviewProject[];
  totals: {
    totalPaid: number;
    totalPending: number;
    totalOverdue: number;
    totalEstimated: number;
  };
}

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const { data } = await api.get<DashboardOverview>("/dashboard/overview");
  return data;
}

export interface CalendarEvent {
  id: string;
  type: "PAYMENT_DUE" | "PAYMENT_PAID" | "CERTIFICATE" | "PROJECT_START" | "PROJECT_END";
  title: string;
  date: string;
  color: string;
  meta?: Record<string, unknown>;
}

export async function getCalendarEvents(
  projectId: string,
  from: string,
  to: string
): Promise<CalendarEvent[]> {
  const { data } = await api.get<CalendarEvent[]>("/dashboard/calendar", {
    params: { projectId, from, to },
  });
  return data;
}
