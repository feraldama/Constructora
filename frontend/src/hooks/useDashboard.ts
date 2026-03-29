"use client";

import { useQuery } from "@tanstack/react-query";
import { getProjectDashboard, getDashboardOverview, getCalendarEvents } from "@/lib/api/dashboard";

export function useDashboard(projectId: string | undefined) {
  return useQuery({
    queryKey: ["dashboard", projectId],
    queryFn: () => getProjectDashboard(projectId!),
    enabled: !!projectId,
    staleTime: 30 * 1000,
  });
}

export function useDashboardOverview() {
  return useQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: () => getDashboardOverview(),
    staleTime: 60 * 1000,
  });
}

export function useCalendarEvents(projectId: string | undefined, from: string, to: string) {
  return useQuery({
    queryKey: ["dashboard", "calendar", projectId, from, to],
    queryFn: () => getCalendarEvents(projectId!, from, to),
    enabled: !!projectId,
    staleTime: 60 * 1000,
  });
}
