import api from "./client";
import type { GlobalRole } from "@/types";

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  globalRole: GlobalRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { projectMembers: number };
}

export interface AdminUserDetail extends AdminUser {
  projectMembers: {
    id: string;
    role: string;
    joinedAt: string;
    project: { id: string; name: string; status: string };
  }[];
}

export interface UsersFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: GlobalRole;
  isActive?: boolean;
}

export interface UsersPaginatedResponse {
  data: AdminUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function getUsers(filters?: UsersFilters): Promise<UsersPaginatedResponse> {
  const params: Record<string, string> = {};
  if (filters?.page) params.page = String(filters.page);
  if (filters?.limit) params.limit = String(filters.limit);
  if (filters?.search) params.search = filters.search;
  if (filters?.role) params.role = filters.role;
  if (filters?.isActive !== undefined) params.isActive = String(filters.isActive);

  const res = await api.get<UsersPaginatedResponse>("/users", { params });
  return res.data;
}

export async function getUserById(id: string): Promise<AdminUserDetail> {
  const res = await api.get<AdminUserDetail>(`/users/${id}`);
  return res.data;
}

export async function updateUserRole(id: string, globalRole: GlobalRole): Promise<AdminUser> {
  const res = await api.patch<AdminUser>(`/users/${id}/role`, { globalRole });
  return res.data;
}

export async function updateUserStatus(id: string, isActive: boolean): Promise<AdminUser> {
  const res = await api.patch<AdminUser>(`/users/${id}/status`, { isActive });
  return res.data;
}
