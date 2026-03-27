"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getContractors,
  getContractor,
  createContractor,
  updateContractor,
  deleteContractor,
  getContractorFinancial,
  getContractorAssignments,
  getContractorPaymentsGrouped,
  type ContractorFilters,
  type ContractorPayload,
} from "@/lib/api/contractors";

const CONTRACTORS_KEY = ["contractors"];

export function useContractors(params?: ContractorFilters) {
  return useQuery({
    queryKey: [...CONTRACTORS_KEY, params],
    queryFn: () => getContractors(params),
  });
}

export function useContractor(id: string | undefined) {
  return useQuery({
    queryKey: [...CONTRACTORS_KEY, id],
    queryFn: () => getContractor(id!),
    enabled: !!id,
  });
}

export function useContractorFinancial(id: string | undefined) {
  return useQuery({
    queryKey: [...CONTRACTORS_KEY, id, "financial"],
    queryFn: () => getContractorFinancial(id!),
    enabled: !!id,
  });
}

export function useContractorAssignments(id: string | undefined, projectId?: string) {
  return useQuery({
    queryKey: [...CONTRACTORS_KEY, id, "assignments", projectId],
    queryFn: () => getContractorAssignments(id!, projectId),
    enabled: !!id,
  });
}

export function useContractorPaymentsGrouped(id: string | undefined) {
  return useQuery({
    queryKey: [...CONTRACTORS_KEY, id, "payments-grouped"],
    queryFn: () => getContractorPaymentsGrouped(id!),
    enabled: !!id,
  });
}

export function useCreateContractor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ContractorPayload) => createContractor(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: CONTRACTORS_KEY }); },
  });
}

export function useUpdateContractor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ContractorPayload> }) =>
      updateContractor(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: CONTRACTORS_KEY }); },
  });
}

export function useDeleteContractor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteContractor(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: CONTRACTORS_KEY }); },
  });
}
