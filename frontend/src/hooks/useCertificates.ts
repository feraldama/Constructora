"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCertificates,
  getCertificate,
  createCertificate,
  updateCertificate,
  deleteCertificate,
  updateCertificateItem,
  submitCertificate,
  approveCertificate,
  rejectCertificate,
  resubmitCertificate,
  generateCertificatePayment,
  type CertificateFilters,
  type CreateCertificatePayload,
  type GeneratePaymentPayload,
} from "@/lib/api/certificates";

const CERTS_KEY = ["certificates"];

export function useCertificates(filters: CertificateFilters | undefined) {
  return useQuery({
    queryKey: [...CERTS_KEY, filters],
    queryFn: () => getCertificates(filters!),
    enabled: !!filters?.projectId,
  });
}

export function useCertificate(id: string | undefined) {
  return useQuery({
    queryKey: [...CERTS_KEY, "detail", id],
    queryFn: () => getCertificate(id!),
    enabled: !!id,
  });
}

export function useCreateCertificate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCertificatePayload) => createCertificate(payload),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: CERTS_KEY }); },
  });
}

export function useUpdateCertificate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<{ periodStart: string; periodEnd: string; notes: string }> }) =>
      updateCertificate(id, payload),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: CERTS_KEY }); },
  });
}

export function useDeleteCertificate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCertificate(id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: CERTS_KEY }); },
  });
}

export function useUpdateCertificateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, currentQuantity }: { itemId: string; currentQuantity: number }) =>
      updateCertificateItem(itemId, { currentQuantity }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: CERTS_KEY }); },
  });
}

export function useSubmitCertificate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => submitCertificate(id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: CERTS_KEY }); },
  });
}

export function useApproveCertificate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approveCertificate(id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: CERTS_KEY }); },
  });
}

export function useRejectCertificate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectCertificate(id, reason),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: CERTS_KEY }); },
  });
}

export function useResubmitCertificate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => resubmitCertificate(id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: CERTS_KEY }); },
  });
}

export function useGeneratePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: GeneratePaymentPayload }) =>
      generateCertificatePayment(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CERTS_KEY });
      void qc.invalidateQueries({ queryKey: ["payments"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
