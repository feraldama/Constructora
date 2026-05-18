"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAPUTemplates,
  getAPURubros,
  getAPUTemplate,
  applyAPUTemplate,
  type ListAPUTemplatesParams,
  type ApplyAPUTemplatePayload,
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
