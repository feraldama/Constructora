"use client";

import { useQuery } from "@tanstack/react-query";
import { getActivityLogs, type ActivityFilters } from "@/lib/api/activity";

export function useActivityLogs(params?: ActivityFilters) {
  return useQuery({
    queryKey: ["activity", params],
    queryFn: () => getActivityLogs(params),
  });
}
