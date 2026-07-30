"use client";

import { use, useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import BudgetSpreadsheet from "@/components/tables/BudgetSpreadsheet";
import Modal from "@/components/ui/Modal";
import {
  useProjectBudget,
  useCreateBudgetCategory,
  useDeleteBudgetCategory,
  useCreateBudgetItem,
  useUpdateBudgetItem,
  useDeleteBudgetItem,
  useReorderBudgetItems,
  useReorderCategories,
} from "@/hooks/useProjectBudget";
import { useProjects } from "@/hooks/useProjects";
import { useProjectProgress } from "@/hooks/useProgress";
import { useProject } from "@/hooks/useProject";
import ProgressEntryModal from "@/components/progress/ProgressEntryModal";
import APUPanel from "@/components/budget/APUPanel";
import APUTemplatePicker from "@/components/budget/APUTemplatePicker";
import Combobox from "@/components/ui/Combobox";
import { useAPURubros } from "@/hooks/useAPUTemplates";
import type { BudgetItem, MeasurementUnit } from "@/types";
import { Plus, GripVertical, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export default function BudgetPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId: routeProjectId } = use(params);
  const router = useRouter();
  const { projectId: activeProjectId, isLoading: loadingActiveProject } = useProject();
  const effectiveProjectId = activeProjectId ?? routeProjectId;

  // Si cambiás el "Proyecto activo" desde el sidebar, mantenemos la pantalla de
  // Cómputo Métrico sincronizada navegando al nuevo /budget/:projectId.
  useEffect(() => {
    if (loadingActiveProject) return;
    if (!activeProjectId) return;
    if (activeProjectId === routeProjectId) return;
    router.replace(`/budget/${activeProjectId}`);
  }, [activeProjectId, loadingActiveProject, routeProjectId, router]);

  const { data: budgetData, isLoading: loadingBudget } = useProjectBudget(effectiveProjectId);
  const { data: projectsRes } = useProjects({ page: 1, limit: 100 });
  const projectName = useMemo(
    () => projectsRes?.data.find((p) => p.id === effectiveProjectId)?.name,
    [projectsRes, effectiveProjectId]
  );

  const categories = budgetData?.categories ?? [];
  const { data: apuRubros } = useAPURubros();

  // Rubros sugeridos para "Nueva categoría": los del catálogo APU que aún
  // no fueron cargados como categoría en este proyecto.
  const suggestedRubros = useMemo(() => {
    const existing = new Set(categories.map((c) => c.name.toLowerCase().trim()));
    return (apuRubros ?? [])
      .filter((r) => !existing.has(r.rubro.toLowerCase().trim()))
      .map((r) => r.rubro);
  }, [apuRubros, categories]);

  // Progress data
  const { data: progressRes } = useProjectProgress(effectiveProjectId);
  const progressData = useMemo(() => {
    if (!progressRes) return undefined;
    const map = new Map<string, { measured: number; percent: number }>();
    for (const item of progressRes.items) {
      map.set(item.budgetItemId, {
        measured: item.measuredQuantity,
        percent: item.percent,
      });
    }
    return map;
  }, [progressRes]);

  const [progressItemId, setProgressItemId] = useState<string | null>(null);
  const [apuItemId, setApuItemId] = useState<string | null>(null);
  const [templatePickerCategory, setTemplatePickerCategory] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const apuPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!apuItemId) return;
    const id = requestAnimationFrame(() => {
      apuPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(id);
  }, [apuItemId]);
  const progressItem = useMemo(() => {
    if (!progressItemId) return null;
    for (const cat of categories) {
      const found = cat.items.find((i) => i.id === progressItemId);
      if (found) return found;
    }
    return null;
  }, [progressItemId, categories]);

  const apuItem = useMemo(() => {
    if (!apuItemId) return null;
    for (const cat of categories) {
      const found = cat.items.find((i) => i.id === apuItemId);
      if (found) return found;
    }
    return null;
  }, [apuItemId, categories]);

  const createCat = useCreateBudgetCategory(effectiveProjectId);
  const deleteCat = useDeleteBudgetCategory(effectiveProjectId);
  const createItem = useCreateBudgetItem(effectiveProjectId);
  const updateItem = useUpdateBudgetItem(effectiveProjectId);
  const deleteItem = useDeleteBudgetItem(effectiveProjectId);
  const reorderItems = useReorderBudgetItems(effectiveProjectId);
  const reorderCats = useReorderCategories(effectiveProjectId);

  // ─── DnD sensors for categories ───
  const catSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const categoryIds = useMemo(() => categories.map((c) => c.id), [categories]);

  const handleCategoryDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = categoryIds.indexOf(active.id as string);
      const newIndex = categoryIds.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;
      const newOrder = arrayMove(categoryIds, oldIndex, newIndex);
      void reorderCats.mutateAsync(
        newOrder.map((id, idx) => ({ id, sortOrder: idx }))
      );
    },
    [categoryIds, reorderCats]
  );

  const handleReorderItems = useCallback(
    (reorderedIds: string[]) => {
      void reorderItems.mutateAsync(
        reorderedIds.map((id, idx) => ({ id, sortOrder: idx }))
      );
    },
    [reorderItems]
  );

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
        } else if (field === "saleUnitPrice") {
          await updateItem.mutateAsync({ itemId, payload: { saleUnitPrice: value as number } });
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

  const grandCostTotal = categories.reduce(
    (sum, cat) => sum + cat.items.reduce((s, i) => s + i.quantity * i.costUnitPrice, 0),
    0
  );
  const grandSaleTotal = categories.reduce(
    (sum, cat) => sum + cat.items.reduce((s, i) => s + i.quantity * i.saleUnitPrice, 0),
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
          <h1 className="text-2xl font-bold text-gray-900">Cómputo Métrico</h1>
          <p className="text-sm text-gray-500 mt-1">
            {projectName ? (
              <>
                Proyecto: <span className="text-gray-700">{projectName}</span>
              </>
            ) : (
              <>Proyecto: {effectiveProjectId}</>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setNewCatOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover shadow-sm"
          >
            <Plus size={18} />
            Nueva categoría
          </button>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-xs text-gray-500">Total Costo</p>
              <p className="text-lg font-bold text-gray-900 tabular-nums">
                ${grandCostTotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Total Venta</p>
              <p className="text-lg font-bold text-blue-700 tabular-nums">
                ${grandSaleTotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-600">
          No hay rubros en este proyecto. Creá la primera con &quot;Nueva categoría&quot;.
        </div>
      ) : (
        <DndContext
          sensors={catSensors}
          collisionDetection={closestCenter}
          onDragEnd={handleCategoryDragEnd}
        >
          <SortableContext items={categoryIds} strategy={verticalListSortingStrategy}>
            {categories.map((cat) => (
              <SortableCategory key={cat.id} id={cat.id}>
                {({ dragHandleProps }) => (
                  <BudgetSpreadsheet
                    items={cat.items}
                    categoryName={cat.name}
                    debounceMs={0}
                    isSaving={saving}
                    onCellChange={(itemId, field, value) => handleCellChange(itemId, field, value)}
                    onAddItem={() => handleAddItem(cat.id)}
                    onDuplicateItem={(itemId) => handleDuplicateItem(cat.id, itemId)}
                    onDeleteItem={(itemId) => handleDeleteItem(cat.id, itemId)}
                    onDeleteCategory={() => setDeleteCatTarget({ id: cat.id, name: cat.name })}
                    progressData={progressData}
                    onOpenProgress={(itemId) => setProgressItemId(itemId)}
                    onOpenAPU={(itemId) => setApuItemId(itemId)}
                    onAddFromTemplate={() =>
                      setTemplatePickerCategory({ id: cat.id, name: cat.name })
                    }
                    onReorderItems={handleReorderItems}
                    categoryDragHandleProps={dragHandleProps}
                  />
                )}
              </SortableCategory>
            ))}
          </SortableContext>
        </DndContext>
      )}

      {/* APU Panel */}
      {apuItem && (
        <div ref={apuPanelRef} className="scroll-mt-4">
          <APUPanel item={apuItem} onClose={() => setApuItemId(null)} />
        </div>
      )}

      {/* Agregar partida: plantilla del catálogo APU o carga manual del subrubro */}
      <APUTemplatePicker
        isOpen={!!templatePickerCategory}
        onClose={() => setTemplatePickerCategory(null)}
        categoryId={templatePickerCategory?.id}
        categoryName={templatePickerCategory?.name}
        onApplied={(itemId) => setApuItemId(itemId)}
      />

      <Modal isOpen={newCatOpen} onClose={() => setNewCatOpen(false)} title="Nueva categoría">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del rubro</label>
            <Combobox
              value={newCatName}
              onChange={setNewCatName}
              options={suggestedRubros}
              placeholder="Elegí del catálogo o escribí uno nuevo"
              createLabel={(q) => `Crear rubro «${q}»`}
              autoFocus
            />
            {suggestedRubros.length > 0 && (
              <p className="mt-1 text-xs text-gray-500">
                {suggestedRubros.length} rubro{suggestedRubros.length === 1 ? "" : "s"} disponible
                {suggestedRubros.length === 1 ? "" : "s"} del catálogo
              </p>
            )}
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
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {createCat.isPending ? "Creando…" : "Crear"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Progress modal */}
      <ProgressEntryModal
        item={progressItem}
        isOpen={!!progressItemId}
        onClose={() => setProgressItemId(null)}
      />

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

// ─── Sortable Category Wrapper ────────────────────────────────────────────

function SortableCategory({
  id,
  children,
}: {
  id: string;
  children: ((props: { dragHandleProps: Record<string, unknown> }) => React.ReactNode) | React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "z-10 shadow-lg rounded-lg")}>
      {typeof children === "function"
        ? (children as (props: { dragHandleProps: Record<string, unknown> }) => React.ReactNode)({ dragHandleProps: { ...attributes, ...listeners } })
        : children}
    </div>
  );
}
