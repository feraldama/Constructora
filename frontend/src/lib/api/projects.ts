import api from "@/lib/api/client";
import type { PaginatedResponse } from "@/types";

export interface ProjectFilters {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface ProjectListItem {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  initialBudget: number;
  status: string;
  startDate: string | null;
  estimatedEnd: string | null;
  actualEnd: string | null;
  createdAt: string;
  updatedAt: string;
  role: string | null;
  /** Solo true si sos ADMIN y no hay pagos, contratistas, partidas ni adjuntos */
  canDelete?: boolean;
  _count: { contractors: number; payments: number };
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  address?: string;
  initialBudget?: number;
  status?: string;
}

export async function getProjects(
  params?: ProjectFilters
): Promise<PaginatedResponse<ProjectListItem>> {
  const { data } = await api.get<PaginatedResponse<ProjectListItem>>("/projects", {
    params,
  });
  return data;
}

export async function createProject(
  payload: CreateProjectPayload
): Promise<ProjectListItem> {
  const { data } = await api.post<ProjectListItem>("/projects", payload);
  return data;
}

export async function deleteProject(projectId: string): Promise<void> {
  await api.delete(`/projects/${projectId}`);
}
