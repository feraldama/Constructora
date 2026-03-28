"use client";

import { use, useState, useCallback, useMemo } from "react";
import BudgetSpreadsheet from "@/components/tables/BudgetSpreadsheet";
import Modal from "@/components/ui/Modal";
import {
  useProjectBudget,
  useCreateBudgetCategory,
  useDeleteBudgetCategory,
  useCreateBudgetItem,
  useUpdateBudgetItem,
  useDeleteBudgetItem,
} from "@/hooks/useProjectBudget";
import { useProjects } from "@/hooks/useProjects";
import type { BudgetItem, MeasurementUnit } from "@/types";
import { Plus } from "lucide-react";

export default function BudgetPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);

  const { data: budgetData, isLoading: loadingBudget } = useProjectBudget(projectId);
  const { data: projectsRes } = useProjects({ page: 1, limit: 100 });
  const projectName = useMemo(
    () => projectsRes?.data.find((p) => p.id === projectId)?.name,
    [projectsRes, projectId]
  );

  const categories = budgetData?.categories ?? [];

  const createCat = useCreateBudgetCategory(projectId);
  const deleteCat = useDeleteBudgetCategory(projectId);
  const createItem = useCreateBudgetItem(projectId);
  const updateItem = useUpdateBudgetItem(projectId);
  const deleteItem = useDeleteBudgetItem(projectId);

  const saving =
    createCat.isPending ||
    deleteCat.isPending ||
    createItem.isPending ||
    updateItem.isPending ||
    deleteItem.isPending;

  const [newCatOpen, setNewCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [deleteCatTarget, setDeleteCatTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const handleCellChange = useCallback(
    (itemId: string, field: keyof BudgetItem, value: string | number) => {
      void (async () => {
        if (field === "name") {
          await updateItem.mutateAsync({ itemId, payload: { name: value as string } });
        } else if (field === "unit") {
          await updateItem.mutateAsync({ itemId, payload: { unit: value as MeasurementUnit } });
        } else if (field === "quantity") {
          await updateItem.mutateAsync({ itemId, payload: { quantity: value as number } });
        } else if (field === "costUnitPrice") {
          await updateItem.mutateAsync({ itemId, payload: { costUnitPrice: value as number } });
        }
      })();
    },
    [updateItem]
  );

  const handleAddItem = useCallback(
    (categoryId: string) => {
      void createItem.mutateAsync({ categoryId, payload: {} });
    },
    [createItem]
  );

  const handleDuplicateItem = useCallback(
    (categoryId: string, itemId: string) => {
      void (async () => {
        const cat = categories.find((c) => c.id === categoryId);
        const source = cat?.items.find((i) => i.id === itemId);
        if (!source) return;
        await createItem.mutateAsync({
          categoryId,
          payload: {
            name: `${source.name} (copia)`,
            unit: source.unit,
            quantity: source.quantity,
            costUnitPrice: source.costUnitPrice,
          },
        });
      })();
    },
    [createItem, categories]
  );

  const handleDeleteItem = useCallback(
    (_categoryId: string, itemId: string) => {
      void deleteItem.mutateAsync(itemId);
    },
    [deleteItem]
  );

  const submitNewCategory = useCallback(() => {
    const n = newCatName.trim();
    if (!n) return;
    void (async () => {
      await createCat.mutateAsync({ name: n });
      setNewCatName("");
      setNewCatOpen(false);
    })();
  }, [createCat, newCatName]);

  const confirmDeleteCategory = useCallback(() => {
    if (!deleteCatTarget) return;
    void (async () => {
      await deleteCat.mutateAsync(deleteCatTarget.id);
      setDeleteCatTarget(null);
    })();
  }, [deleteCat, deleteCatTarget]);

  const grandTotal = categories.reduce(
    (sum, cat) => sum + cat.items.reduce((s, i) => s + i.quantity * i.costUnitPrice, 0),
    0
  );

  if (loadingBudget) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Computo Metrico</h1>
          <p className="text-sm text-gray-500 mt-1">
            {projectName ? (
              <>
                Proyecto: <span className="text-gray-700">{projectName}</span>
              </>
            ) : (
              <>Proyecto: {projectId}</>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setNewCatOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 shadow-sm"
          >
            <Plus size={18} />
            Nueva categoría
          </button>
          <div className="text-right">
            <p className="text-xs text-gray-500">Presupuesto total</p>
            <p className="text-xl font-bold text-gray-900 tabular-nums">
              ${grandTotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-600">
          No hay rubros en este proyecto. Creá la primera con &quot;Nueva categoría&quot;.
        </div>
      ) : (
        categories.map((cat) => (
          <BudgetSpreadsheet
            key={cat.id}
            items={cat.items}
            categoryName={cat.name}
            debounceMs={0}
            isSaving={saving}
            onCellChange={(itemId, field, value) => handleCellChange(itemId, field, value)}
            onAddItem={() => handleAddItem(cat.id)}
            onDuplicateItem={(itemId) => handleDuplicateItem(cat.id, itemId)}
            onDeleteItem={(itemId) => handleDeleteItem(cat.id, itemId)}
            onDeleteCategory={() => setDeleteCatTarget({ id: cat.id, name: cat.name })}
          />
        ))
      )}

      <Modal isOpen={newCatOpen} onClose={() => setNewCatOpen(false)} title="Nueva categoría">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del rubro</label>
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
              placeholder="Ej. Instalaciones"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setNewCatOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!newCatName.trim() || createCat.isPending}
              onClick={submitNewCategory}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {createCat.isPending ? "Creando…" : "Crear"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!deleteCatTarget}
        onClose={() => setDeleteCatTarget(null)}
        title="Eliminar rubro"
      >
        {deleteCatTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              ¿Eliminar <strong className="text-gray-900">{deleteCatTarget.name}</strong> y todas
              sus partidas? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteCatTarget(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleteCat.isPending}
                onClick={confirmDeleteCategory}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteCat.isPending ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
