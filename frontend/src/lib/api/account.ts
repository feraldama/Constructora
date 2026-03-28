import api from "./client";
import type { GlobalRole } from "@/types";

export interface Profile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  globalRole: GlobalRole;
  isActive: boolean;
  createdAt: string;
}

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export async function getProfile(): Promise<Profile> {
  const res = await api.get<Profile>("/account/profile");
  return res.data;
}

export async function updateProfile(data: UpdateProfilePayload): Promise<Profile> {
  const res = await api.patch<Profile>("/account/profile", data);
  return res.data;
}

export async function changePassword(data: ChangePasswordPayload): Promise<{ message: string }> {
  const res = await api.post<{ message: string }>("/account/change-password", data);
  return res.data;
}
