"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getClientPayments,
  getClientPaymentSummary,
  createClientPayment,
  updateClientPayment,
  deleteClientPayment,
  type CreateClientPaymentPayload,
  type UpdateClientPaymentPayload,
} from "@/lib/api/client-payments";

const paymentsKey = (projectId: string) => ["client-payments", projectId] as const;
const summaryKey = (projectId: string) => ["client-payments-summary", projectId] as const;

export function useClientPayments(projectId: string | undefined) {
  return useQuery({
    queryKey: projectId ? paymentsKey(projectId) : ["client-payments", "none"],
    queryFn: () => getClientPayments(projectId!),
    enabled: !!projectId,
  });
}

export function useClientPaymentSummary(projectId: string | undefined) {
  return useQuery({
    queryKey: projectId ? summaryKey(projectId) : ["client-payments-summary", "none"],
    queryFn: () => getClientPaymentSummary(projectId!),
    enabled: !!projectId,
  });
}

export function useCreateClientPayment(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateClientPaymentPayload) =>
      createClientPayment(projectId!, payload),
    onSuccess: () => {
      if (projectId) {
        void qc.invalidateQueries({ queryKey: paymentsKey(projectId) });
        void qc.invalidateQueries({ queryKey: summaryKey(projectId) });
        void qc.invalidateQueries({ queryKey: ["dashboard"] });
      }
    },
  });
}

export function useUpdateClientPayment(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateClientPaymentPayload }) =>
      updateClientPayment(projectId!, id, payload),
    onSuccess: () => {
      if (projectId) {
        void qc.invalidateQueries({ queryKey: paymentsKey(projectId) });
        void qc.invalidateQueries({ queryKey: summaryKey(projectId) });
        void qc.invalidateQueries({ queryKey: ["dashboard"] });
      }
    },
  });
}

export function useDeleteClientPayment(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteClientPayment(projectId!, id),
    onSuccess: () => {
      if (projectId) {
        void qc.invalidateQueries({ queryKey: paymentsKey(projectId) });
        void qc.invalidateQueries({ queryKey: summaryKey(projectId) });
        void qc.invalidateQueries({ queryKey: ["dashboard"] });
      }
    },
  });
}
