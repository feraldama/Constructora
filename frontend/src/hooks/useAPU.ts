"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAPU,
  addAPUMaterial,
  updateAPUMaterial,
  deleteAPUMaterial,
  addAPULabor,
  updateAPULabor,
  deleteAPULabor,
  refreshAPUPrices,
  type AddAPUMaterialPayload,
  type UpdateAPUMaterialPayload,
  type AddAPULaborPayload,
  type UpdateAPULaborPayload,
} from "@/lib/api/apu";

const apuKey = (budgetItemId: string) => ["apu", budgetItemId] as const;

export function useAPU(budgetItemId: string | undefined) {
  return useQuery({
    queryKey: budgetItemId ? apuKey(budgetItemId) : ["apu", "none"],
    queryFn: () => getAPU(budgetItemId!),
    enabled: !!budgetItemId,
  });
}

function useAPUMutation<TPayload>(
  budgetItemId: string | undefined,
  mutationFn: (payload: TPayload) => Promise<unknown>
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      if (budgetItemId) {
        void qc.invalidateQueries({ queryKey: apuKey(budgetItemId) });
        void qc.invalidateQueries({ queryKey: ["budget"] });
        void qc.invalidateQueries({ queryKey: ["dashboard"] });
      }
    },
  });
}

export function useAddAPUMaterial(budgetItemId: string | undefined) {
  return useAPUMutation<AddAPUMaterialPayload>(budgetItemId, (payload) =>
    addAPUMaterial(budgetItemId!, payload)
  );
}

export function useUpdateAPUMaterial(budgetItemId: string | undefined) {
  return useAPUMutation<{ id: string; payload: UpdateAPUMaterialPayload }>(
    budgetItemId,
    ({ id, payload }) => updateAPUMaterial(budgetItemId!, id, payload)
  );
}

export function useDeleteAPUMaterial(budgetItemId: string | undefined) {
  return useAPUMutation<string>(budgetItemId, (id) =>
    deleteAPUMaterial(budgetItemId!, id)
  );
}

export function useAddAPULabor(budgetItemId: string | undefined) {
  return useAPUMutation<AddAPULaborPayload>(budgetItemId, (payload) =>
    addAPULabor(budgetItemId!, payload)
  );
}

export function useUpdateAPULabor(budgetItemId: string | undefined) {
  return useAPUMutation<{ id: string; payload: UpdateAPULaborPayload }>(
    budgetItemId,
    ({ id, payload }) => updateAPULabor(budgetItemId!, id, payload)
  );
}

export function useDeleteAPULabor(budgetItemId: string | undefined) {
  return useAPUMutation<string>(budgetItemId, (id) =>
    deleteAPULabor(budgetItemId!, id)
  );
}

export function useRefreshAPUPrices(budgetItemId: string | undefined) {
  return useAPUMutation<void>(budgetItemId, () =>
    refreshAPUPrices(budgetItemId!)
  );
}
