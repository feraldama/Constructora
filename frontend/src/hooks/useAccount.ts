import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProfile,
  updateProfile,
  changePassword,
  type UpdateProfilePayload,
  type ChangePasswordPayload,
} from "@/lib/api/account";

export function useProfile() {
  return useQuery({
    queryKey: ["account", "profile"],
    queryFn: getProfile,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateProfilePayload) => updateProfile(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["account", "profile"] });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordPayload) => changePassword(data),
  });
}
