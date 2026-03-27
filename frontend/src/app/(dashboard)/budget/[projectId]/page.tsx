"use client";

import { use, useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import BudgetSpreadsheet from "@/components/tables/BudgetSpreadsheet";
import type { BudgetItem, MeasurementUnit } from "@/types";

// ─── Mock data (reemplazar con useQuery cuando exista el endpoint) ───

function createEmptyItem(categoryId: string, sortOrder: number): BudgetItem {
  return {
    id: uuidv4(),
    categoryId,
    name: "",
    unit: "M2" as MeasurementUnit,
    quantity: 0,
    unitPrice: 0,
    subtotal: 0,
    sortOrder,
  };
}

const INITIAL_CATEGORIES = [
  {
    id: "cat-1",
    name: "Movimiento de Suelo",
    items: [
      { id: "item-1", categoryId: "cat-1", name: "Excavación para fundaciones", unit: "M3" as MeasurementUnit, quantity: 120, unitPrice: 4500, subtotal: 540000, sortOrder: 0 },
      { id: "item-2", categoryId: "cat-1", name: "Relleno y compactación", unit: "M3" as MeasurementUnit, quantity: 80, unitPrice: 3200, subtotal: 256000, sortOrder: 1 },
      { id: "item-3", categoryId: "cat-1", name: "Retiro de suelo sobrante", unit: "M3" as MeasurementUnit, quantity: 40, unitPrice: 2800, subtotal: 112000, sortOrder: 2 },
    ],
  },
  {
    id: "cat-2",
    name: "Estructura de Hormigón",
    items: [
      { id: "item-4", categoryId: "cat-2", name: "Hormigón armado para columnas", unit: "M3" as MeasurementUnit, quantity: 15, unitPrice: 85000, subtotal: 1275000, sortOrder: 0 },
      { id: "item-5", categoryId: "cat-2", name: "Losa nervurada", unit: "M2" as MeasurementUnit, quantity: 200, unitPrice: 32000, subtotal: 6400000, sortOrder: 1 },
    ],
  },
  {
    id: "cat-3",
    name: "Mampostería",
    items: [] as BudgetItem[],
  },
];

// ─── Página ──────────────────────────────────────────────────────────

export default function BudgetPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);

  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [savingCategoryId, setSavingCategoryId] = useState<string | null>(null);

  // ─── Handlers ───

  const handleCellChange = useCallback(
    (categoryId: string, itemId: string, field: keyof BudgetItem, value: string | number) => {
      setCategories((prev) =>
        prev.map((cat) => {
          if (cat.id !== categoryId) return cat;
          return {
            ...cat,
            items: cat.items.map((item) => {
              if (item.id !== itemId) return item;
              const updated = { ...item, [field]: value };
              // Recalcular subtotal
              updated.subtotal = updated.quantity * updated.unitPrice;
              return updated;
            }),
          };
        })
      );

      // Simular auto-save al backend
      setSavingCategoryId(categoryId);
      // El debounce real ya está en el componente, esto simula la respuesta del server
      setTimeout(() => setSavingCategoryId(null), 600);

      // TODO: Llamar a la API real aquí
      // api.patch(`/budget-items/${itemId}`, { [field]: value })
    },
    []
  );

  const handleAddItem = useCallback((categoryId: string) => {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== categoryId) return cat;
        const newItem = createEmptyItem(categoryId, cat.items.length);
        return { ...cat, items: [...cat.items, newItem] };
      })
    );
  }, []);

  const handleDuplicateItem = useCallback((categoryId: string, itemId: string) => {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== categoryId) return cat;
        const source = cat.items.find((i) => i.id === itemId);
        if (!source) return cat;
        const duplicate: BudgetItem = {
          ...source,
          id: uuidv4(),
          name: `${source.name} (copia)`,
          sortOrder: cat.items.length,
        };
        // Insertar justo después del original
        const idx = cat.items.findIndex((i) => i.id === itemId);
        const newItems = [...cat.items];
        newItems.splice(idx + 1, 0, duplicate);
        return { ...cat, items: newItems };
      })
    );
  }, []);

  const handleDeleteItem = useCallback((categoryId: string, itemId: string) => {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== categoryId) return cat;
        return { ...cat, items: cat.items.filter((i) => i.id !== itemId) };
      })
    );
  }, []);

  // ─── Totales ───
  const grandTotal = categories.reduce(
    (sum, cat) => sum + cat.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Computo Metrico</h1>
          <p className="text-sm text-gray-500 mt-1">Proyecto: {projectId}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-gray-500">Presupuesto total</p>
            <p className="text-xl font-bold text-gray-900 tabular-nums">
              ${grandTotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Categorías */}
      {categories.map((cat) => (
        <BudgetSpreadsheet
          key={cat.id}
          items={cat.items}
          categoryName={cat.name}
          debounceMs={800}
          isSaving={savingCategoryId === cat.id}
          onCellChange={(itemId, field, value) =>
            handleCellChange(cat.id, itemId, field, value)
          }
          onAddItem={() => handleAddItem(cat.id)}
          onDuplicateItem={(itemId) => handleDuplicateItem(cat.id, itemId)}
          onDeleteItem={(itemId) => handleDeleteItem(cat.id, itemId)}
        />
      ))}
    </div>
  );
}
