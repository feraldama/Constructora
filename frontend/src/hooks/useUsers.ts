import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getUsers,
  updateUserRole,
  updateUserStatus,
  type UsersFilters,
} from "@/lib/api/users";
import type { GlobalRole } from "@/types";

export function useUsers(filters?: UsersFilters) {
  return useQuery({
    queryKey: ["users", filters],
    queryFn: () => getUsers(filters),
  });
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, globalRole }: { id: string; globalRole: GlobalRole }) =>
      updateUserRole(id, globalRole),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUpdateUserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateUserStatus(id, isActive),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
