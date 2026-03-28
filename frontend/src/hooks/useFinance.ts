"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getFinancialSummary,
  getFinancialItems,
  getCashFlow,
  getPaymentPredictions,
  getDebtAlerts,
} from "@/lib/api/finance";

export function useFinancialSummary(projectId: string | undefined) {
  return useQuery({
    queryKey: ["finance", "summary", projectId],
    queryFn: () => getFinancialSummary(projectId!),
    enabled: !!projectId,
  });
}

export function useFinancialItems(projectId: string | undefined) {
  return useQuery({
    queryKey: ["finance", "items", projectId],
    queryFn: () => getFinancialItems(projectId!),
    enabled: !!projectId,
  });
}

export function useCashFlow(projectId: string | undefined) {
  return useQuery({
    queryKey: ["finance", "cash-flow", projectId],
    queryFn: () => getCashFlow(projectId!),
    enabled: !!projectId,
  });
}

export function usePaymentPredictions(projectId: string | undefined) {
  return useQuery({
    queryKey: ["finance", "predictions", projectId],
    queryFn: () => getPaymentPredictions(projectId!),
    enabled: !!projectId,
  });
}

export function useDebtAlerts(projectId: string | undefined) {
  return useQuery({
    queryKey: ["finance", "debt-alerts", projectId],
    queryFn: () => getDebtAlerts(projectId!),
    enabled: !!projectId,
  });
}
