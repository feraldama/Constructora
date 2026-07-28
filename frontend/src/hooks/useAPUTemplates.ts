"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAPUTemplates,
  getAPURubros,
  getAPUTemplate,
  applyAPUTemplate,
  createManualAPU,
  updateAPUTemplate,
  deleteAPUTemplate,
  type ListAPUTemplatesParams,
  type ApplyAPUTemplatePayload,
  type CreateManualAPUPayload,
  type UpdateAPUTemplatePayload,
} from "@/lib/api/apu-templates";

export function useAPUTemplates(params?: ListAPUTemplatesParams) {
  return useQuery({
    queryKey: ["apu-templates", params ?? {}],
    queryFn: () => getAPUTemplates(params),
  });
}

export function useAPURubros() {
  return useQuery({
    queryKey: ["apu-templates", "rubros"],
    queryFn: getAPURubros,
  });
}

export function useAPUTemplate(id: string | null) {
  return useQuery({
    queryKey: ["apu-template", id],
    queryFn: () => getAPUTemplate(id!),
    enabled: !!id,
  });
}

export function useApplyAPUTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, payload }: { templateId: string; payload: ApplyAPUTemplatePayload }) =>
      applyAPUTemplate(templateId, payload),
    onSuccess: () => {
      // Invalidamos presupuesto y APUs — el applyTemplate puede crear un
      // BudgetItem nuevo o modificar uno existente, y los precios cambian.
      void qc.invalidateQueries({ queryKey: ["budget"] });
      void qc.invalidateQueries({ queryKey: ["apu"] });
    },
  });
}

/** Corrige una plantilla del catálogo (datos, estado o composición). */
export function useUpdateAPUTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAPUTemplatePayload }) =>
      updateAPUTemplate(id, payload),
    onSuccess: (detail) => {
      void qc.invalidateQueries({ queryKey: ["apu-templates"] });
      void qc.invalidateQueries({ queryKey: ["apu-template", detail.id] });
    },
  });
}

/** Elimina una plantilla del catálogo (no afecta partidas ya creadas). */
export function useDeleteAPUTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAPUTemplate(id),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: ["apu-templates"] });
      void qc.removeQueries({ queryKey: ["apu-template", id] });
    },
  });
}

/** Carga manual de un subrubro completo (materiales + mano de obra). */
export function useCreateManualAPU() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateManualAPUPayload) => createManualAPU(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["budget"] });
      void qc.invalidateQueries({ queryKey: ["apu"] });
      // Con saveAsTemplate la composición entra al catálogo (y puede sumar rubro).
      void qc.invalidateQueries({ queryKey: ["apu-templates"] });
      // La carga puede dar de alta o reactivar materiales del catálogo global.
      void qc.invalidateQueries({ queryKey: ["materials"] });
    },
  });
}
