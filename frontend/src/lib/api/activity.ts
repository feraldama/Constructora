import api from "@/lib/api/client";
import type { PaginatedResponse } from "@/types";

export interface ActivityLogEntry {
  id: string;
  userId: string | null;
  projectId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; email: string } | null;
  project: { id: string; name: string } | null;
}

export interface ActivityFilters {
  projectId?: string;
  page?: number;
  limit?: number;
}

export async function getActivityLogs(
  params?: ActivityFilters
): Promise<PaginatedResponse<ActivityLogEntry>> {
  const { data } = await api.get<PaginatedResponse<ActivityLogEntry>>("/activity", { params });
  return data;
}
