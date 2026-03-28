"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMembers,
  addMember,
  updateMemberRole,
  removeMember,
} from "@/lib/api/members";
import type { ProjectRole } from "@/types";

const membersKey = (projectId: string) => ["members", projectId] as const;

export function useMembers(projectId: string | undefined) {
  return useQuery({
    queryKey: projectId ? membersKey(projectId) : ["members", "none"],
    queryFn: () => getMembers(projectId!),
    enabled: !!projectId,
  });
}

export function useAddMember(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { email: string; role?: ProjectRole }) =>
      addMember(projectId!, payload),
    onSuccess: () => {
      if (projectId) void qc.invalidateQueries({ queryKey: membersKey(projectId) });
    },
  });
}

export function useUpdateMemberRole(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: ProjectRole }) =>
      updateMemberRole(projectId!, memberId, role),
    onSuccess: () => {
      if (projectId) void qc.invalidateQueries({ queryKey: membersKey(projectId) });
    },
  });
}

export function useRemoveMember(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => removeMember(projectId!, memberId),
    onSuccess: () => {
      if (projectId) void qc.invalidateQueries({ queryKey: membersKey(projectId) });
    },
  });
}
