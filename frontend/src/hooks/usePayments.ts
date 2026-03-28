"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPayments,
  getPayment,
  createPayment,
  updatePayment,
  deletePayment,
  getPaymentSummary,
  getContractorDebts,
  getAssignmentContext,
  type PaymentFilters,
  type CreatePaymentPayload,
  type UpdatePaymentPayload,
} from "@/lib/api/payments";

const PAYMENTS_KEY = ["payments"];
const SUMMARY_KEY = ["payments", "summary"];
const DEBTS_KEY = ["payments", "debts"];

export function usePayments(params?: PaymentFilters) {
  return useQuery({
    queryKey: [...PAYMENTS_KEY, params],
    queryFn: () => getPayments(params),
  });
}

export function usePayment(id: string | undefined) {
  return useQuery({
    queryKey: [...PAYMENTS_KEY, id],
    queryFn: () => getPayment(id!),
    enabled: !!id,
  });
}

export function usePaymentSummary(projectId: string | undefined) {
  return useQuery({
    queryKey: [...SUMMARY_KEY, projectId],
    queryFn: () => getPaymentSummary(projectId!),
    enabled: !!projectId,
  });
}

export function useContractorDebts(projectId: string | undefined) {
  return useQuery({
    queryKey: [...DEBTS_KEY, projectId],
    queryFn: () => getContractorDebts(projectId!),
    enabled: !!projectId,
  });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePaymentPayload) => createPayment(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PAYMENTS_KEY });
      qc.invalidateQueries({ queryKey: SUMMARY_KEY });
      qc.invalidateQueries({ queryKey: DEBTS_KEY });
    },
  });
}

export function useUpdatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePaymentPayload }) =>
      updatePayment(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PAYMENTS_KEY });
      qc.invalidateQueries({ queryKey: SUMMARY_KEY });
      qc.invalidateQueries({ queryKey: DEBTS_KEY });
    },
  });
}

/**
 * Contexto financiero de un ContractorAssignment.
 * Se usa en el formulario de pago para mostrar el estado antes de crear.
 * Se refresca cuando cambian contractorId o budgetItemId.
 */
export function useAssignmentContext(
  contractorId: string | undefined,
  budgetItemId: string | undefined
) {
  return useQuery({
    queryKey: ["payments", "assignment-context", contractorId, budgetItemId],
    queryFn:  () => getAssignmentContext(contractorId!, budgetItemId!),
    enabled:  !!contractorId && !!budgetItemId,
    staleTime: 0,
    retry: (count, err) => {
      // 404 = no existe asignación — no reintentar, es estado esperado
      const status = (err as { response?: { status?: number } })?.response?.status;
      return status !== 404 && count < 2;
    },
  });
}

export function useDeletePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePayment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PAYMENTS_KEY });
      qc.invalidateQueries({ queryKey: SUMMARY_KEY });
      qc.invalidateQueries({ queryKey: DEBTS_KEY });
    },
  });
}
