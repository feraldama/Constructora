"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAssignmentsByItem,
  getAssignmentsByContractor,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getProjectContractorStats,
  getProjectItemCosts,
  type CreateAssignmentPayload,
  type UpdateAssignmentPayload,
} from "@/lib/api/assignments";

// ─── Query keys ───────────────────────────────────────────────────────────────

const keys = {
  byItem: (budgetItemId: string) =>
    ["assignments", "item", budgetItemId] as const,
  byContractor: (contractorId: string, projectId?: string) =>
    ["assignments", "contractor", contractorId, projectId ?? "all"] as const,
  projectContractors: (projectId: string) =>
    ["assignments", "project", projectId, "contractors"] as const,
  projectItems: (projectId: string) =>
    ["assignments", "project", projectId, "items"] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Contratistas asignados a una partida con su avance financiero. */
export function useAssignmentsByItem(budgetItemId: string | undefined) {
  return useQuery({
    queryKey: keys.byItem(budgetItemId ?? ""),
    queryFn: () => getAssignmentsByItem(budgetItemId!),
    enabled: !!budgetItemId,
  });
}

/** Partidas asignadas a un contratista, opcionalmente filtradas por proyecto. */
export function useAssignmentsByContractor(
  contractorId: string | undefined,
  projectId?: string
) {
  return useQuery({
    queryKey: keys.byContractor(contractorId ?? "", projectId),
    queryFn: () => getAssignmentsByContractor(contractorId!, projectId),
    enabled: !!contractorId,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAssignmentPayload) => createAssignment(payload),
    onSuccess: (_, variables) => {
      // Invalida la vista de la partida y la del contratista
      qc.invalidateQueries({ queryKey: keys.byItem(variables.budgetItemId) });
      qc.invalidateQueries({
        queryKey: ["assignments", "contractor", variables.contractorId],
      });
      // El presupuesto del proyecto no cambia (assignments no afectan costSubtotal),
      // pero el detalle del contratista sí
      qc.invalidateQueries({ queryKey: ["contractors", variables.contractorId] });
    },
  });
}

export function useUpdateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateAssignmentPayload;
      // Necesitamos los ids para invalidar — los pasamos junto al payload
      budgetItemId: string;
      contractorId: string;
    }) => updateAssignment(id, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: keys.byItem(variables.budgetItemId) });
      qc.invalidateQueries({
        queryKey: ["assignments", "contractor", variables.contractorId],
      });
      qc.invalidateQueries({ queryKey: ["contractors", variables.contractorId] });
    },
  });
}

/**
 * Queries 1-3: deuda por contratista, total pagado, ranking por costo.
 * Un único fetch que devuelve todos los campos de análisis por contratista.
 */
export function useProjectContractorStats(projectId: string | undefined) {
  return useQuery({
    queryKey: keys.projectContractors(projectId ?? ""),
    queryFn: () => getProjectContractorStats(projectId!),
    enabled: !!projectId,
  });
}

/** Query 4: costos por partida con varianza vs presupuesto. */
export function useProjectItemCosts(projectId: string | undefined) {
  return useQuery({
    queryKey: keys.projectItems(projectId ?? ""),
    queryFn: () => getProjectItemCosts(projectId!),
    enabled: !!projectId,
  });
}

export function useDeleteAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
    }: {
      id: string;
      budgetItemId: string;
      contractorId: string;
    }) => deleteAssignment(id),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: keys.byItem(variables.budgetItemId) });
      qc.invalidateQueries({
        queryKey: ["assignments", "contractor", variables.contractorId],
      });
      qc.invalidateQueries({ queryKey: ["contractors", variables.contractorId] });
    },
  });
}
