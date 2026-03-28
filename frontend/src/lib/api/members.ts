import api from "@/lib/api/client";
import type { ProjectRole } from "@/types";

export interface ProjectMemberDTO {
  id: string;
  userId: string;
  projectId: string;
  role: ProjectRole;
  joinedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
  };
}

export async function getMembers(projectId: string): Promise<ProjectMemberDTO[]> {
  const { data } = await api.get<ProjectMemberDTO[]>(`/projects/${projectId}/members`);
  return data;
}

export async function addMember(
  projectId: string,
  payload: { email: string; role?: ProjectRole }
): Promise<ProjectMemberDTO> {
  const { data } = await api.post<ProjectMemberDTO>(
    `/projects/${projectId}/members`,
    payload
  );
  return data;
}

export async function updateMemberRole(
  projectId: string,
  memberId: string,
  role: ProjectRole
): Promise<ProjectMemberDTO> {
  const { data } = await api.patch<ProjectMemberDTO>(
    `/projects/${projectId}/members/${memberId}`,
    { role }
  );
  return data;
}

export async function removeMember(
  projectId: string,
  memberId: string
): Promise<void> {
  await api.delete(`/projects/${projectId}/members/${memberId}`);
}
