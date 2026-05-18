"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPurchases,
  createPurchase,
  updatePurchase,
  deletePurchase,
  type ListPurchasesParams,
  type CreatePurchasePayload,
  type UpdatePurchasePayload,
} from "@/lib/api/purchases";

const purchasesKey = (params?: ListPurchasesParams) => ["purchases", params ?? {}] as const;

export function usePurchases(params?: ListPurchasesParams) {
  return useQuery({
    queryKey: purchasesKey(params),
    queryFn: () => getPurchases(params),
  });
}

/**
 * Invalida las queries afectadas tras crear/editar/borrar una compra:
 *   - purchases (lista)
 *   - materials (cambia unitPrice)
 *   - budget / apu (cambia costo unitario de partidas en cascada)
 */
function invalidatePurchaseRelated(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ["purchases"] });
  void qc.invalidateQueries({ queryKey: ["materials"] });
  void qc.invalidateQueries({ queryKey: ["budget"] });
  void qc.invalidateQueries({ queryKey: ["apu"] });
}

export function useCreatePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePurchasePayload) => createPurchase(payload),
    onSuccess: () => invalidatePurchaseRelated(qc),
  });
}

export function useUpdatePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdatePurchasePayload }) =>
      updatePurchase(id, payload),
    onSuccess: () => invalidatePurchaseRelated(qc),
  });
}

export function useDeletePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePurchase(id),
    onSuccess: () => invalidatePurchaseRelated(qc),
  });
}
