"use client";

import { useQuery } from "@tanstack/react-query";
import { getProjectDashboard } from "@/lib/api/dashboard";

export function useDashboard(projectId: string | undefined) {
  return useQuery({
    queryKey: ["dashboard", projectId],
    queryFn: () => getProjectDashboard(projectId!),
    enabled: !!projectId,
    staleTime: 30 * 1000, // 30s — dashboard se refresca cada 30s
  });
}
