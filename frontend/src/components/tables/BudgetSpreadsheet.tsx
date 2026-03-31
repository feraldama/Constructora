"use client";

import { useMemo, useCallback, useRef, useEffect, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
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
import { Plus, Copy, Trash2, GripVertical, Save, Ruler, FlaskConical } from "lucide-react";
import EditableCell, { type CellCoord } from "./EditableCell";
import { cn } from "@/lib/utils/cn";
import type { BudgetItem, MeasurementUnit } from "@/types";

// ─── Constantes ──────────────────────────────────────────────────────

const UNITS: { value: MeasurementUnit; label: string }[] = [
  { value: "M2", label: "m²" },
  { value: "M3", label: "m³" },
  { value: "ML", label: "ml" },
  { value: "UNIT", label: "Unidad" },
  { value: "KG", label: "kg" },
  { value: "TON", label: "Ton" },
  { value: "GLOBAL", label: "Global" },
];

// Columnas navegables (en orden de izquierda a derecha)
const NAV_COLUMNS = ["name", "unit", "quantity", "costUnitPrice", "saleUnitPrice"] as const;

function fmtCurrency(value: number): string {
  return "$" + value.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Props ───────────────────────────────────────────────────────────

interface BudgetSpreadsheetProps {
  items: BudgetItem[];
  categoryName?: string;
  /** Llamada en cada cambio de celda — el parent decide si persistir */
  onCellChange: (itemId: string, field: keyof BudgetItem, value: string | number) => void;
  /** Auto-save con debounce: ms de delay (default 800). 0 = sin debounce */
  debounceMs?: number;
  onAddItem: () => void;
  onDuplicateItem: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
  /** Eliminar rubro completo (opcional) */
  onDeleteCategory?: () => void;
  /** Indicador de guardando */
  isSaving?: boolean;
  readOnly?: boolean;
  /** Datos de avance físico por item (Map<budgetItemId, { measured, percent }>) */
  progressData?: Map<string, { measured: number; percent: number }>;
  /** Callback al hacer click en la celda de avance */
  onOpenProgress?: (itemId: string) => void;
  /** Callback al reordenar items (recibe nuevo orden de IDs) */
  onReorderItems?: (reorderedIds: string[]) => void;
  /** Props para el drag handle de la categoría (pasado por SortableCategory) */
  categoryDragHandleProps?: Record<string, unknown>;
  /** Callback para abrir el panel APU de un item */
  onOpenAPU?: (itemId: string) => void;
}

const columnHelper = createColumnHelper<BudgetItem>();

// ─── Componente ──────────────────────────────────────────────────────

export default function BudgetSpreadsheet({
  items,
  categoryName = "Partidas",
  onCellChange,
  debounceMs = 800,
  onAddItem,
  onDuplicateItem,
  onDeleteItem,
  onDeleteCategory,
  isSaving = false,
  readOnly = false,
  progressData,
  onOpenProgress,
  onReorderItems,
  categoryDragHandleProps,
  onOpenAPU,
}: BudgetSpreadsheetProps) {
  const tableRef = useRef<HTMLTableElement>(null);
  const debounceTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const debouncePendingRef = useRef<
    Map<string, { itemId: string; field: keyof BudgetItem; value: string | number }>
  >(new Map());
  const onCellChangeRef = useRef(onCellChange);
  onCellChangeRef.current = onCellChange;

  useEffect(() => {
    return () => {
      debounceTimersRef.current.forEach((t) => clearTimeout(t));
      debounceTimersRef.current.clear();
      // Evitar perder el último valor si el timer se cancela al desmontar (p. ej. refetch / Strict Mode)
      debouncePendingRef.current.forEach((p) => {
        onCellChangeRef.current(p.itemId, p.field, p.value);
      });
      debouncePendingRef.current.clear();
    };
  }, []);

  // ─── Debounce por celda (itemId+campo) para no pisar ediciones de otras filas ───
  const handleCellSave = useCallback(
    (itemId: string, field: keyof BudgetItem, value: string | number) => {
      if (debounceMs <= 0) {
        onCellChange(itemId, field, value);
        return;
      }
      const key = `${itemId}:${String(field)}`;
      const prev = debounceTimersRef.current.get(key);
      if (prev) clearTimeout(prev);
      debouncePendingRef.current.set(key, { itemId, field, value });
      const t = setTimeout(() => {
        debounceTimersRef.current.delete(key);
        debouncePendingRef.current.delete(key);
        onCellChangeRef.current(itemId, field, value);
      }, debounceMs);
      debounceTimersRef.current.set(key, t);
    },
    [debounceMs, onCellChange]
  );

  // ─── Navegación por teclado ───
  const navigateTo = useCallback(
    (from: CellCoord, direction: "up" | "down" | "left" | "right") => {
      const colIdx = NAV_COLUMNS.indexOf(from.colId as typeof NAV_COLUMNS[number]);
      let nextRow = from.rowIndex;
      let nextColIdx = colIdx;

      switch (direction) {
        case "up":
          nextRow = Math.max(0, from.rowIndex - 1);
          break;
        case "down":
          nextRow = Math.min(items.length - 1, from.rowIndex + 1);
          break;
        case "left":
          if (colIdx > 0) {
            nextColIdx = colIdx - 1;
          } else if (from.rowIndex > 0) {
            // Wrap a la última columna de la fila anterior
            nextRow = from.rowIndex - 1;
            nextColIdx = NAV_COLUMNS.length - 1;
          }
          break;
        case "right":
          if (colIdx < NAV_COLUMNS.length - 1) {
            nextColIdx = colIdx + 1;
          } else if (from.rowIndex < items.length - 1) {
            // Wrap a la primera columna de la fila siguiente
            nextRow = from.rowIndex + 1;
            nextColIdx = 0;
          }
          break;
      }

      const nextColId = NAV_COLUMNS[nextColIdx];

      // Buscar el elemento en el DOM y hacer focus
      requestAnimationFrame(() => {
        const el = tableRef.current?.querySelector<HTMLElement>(
          `[data-row="${nextRow}"][data-col="${nextColId}"]`
        );
        el?.focus();
      });
    },
    [items.length]
  );

  // ─── Columnas ───
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns = useMemo<ColumnDef<BudgetItem, any>[]>(
    () => [
      // Nro
      columnHelper.display({
        id: "index",
        header: () => <span className="text-gray-400">#</span>,
        size: 44,
        cell: (info) => (
          <div className="flex items-center gap-1 px-1">
            {!readOnly && (
              <GripVertical
                size={14}
                className="text-gray-300 hover:text-gray-500 cursor-grab shrink-0 drag-handle"
              />
            )}
            <span className="text-xs text-gray-400 tabular-nums">
              {info.row.index + 1}
            </span>
          </div>
        ),
      }),

      // Descripción
      columnHelper.accessor("name", {
        header: "Descripcion",
        size: 300,
        cell: (info) => (
          <EditableCell
            value={info.getValue()}
            type="text"
            disabled={readOnly}
            coord={{ rowIndex: info.row.index, colId: "name" }}
            onNavigate={navigateTo}
            onSave={(v) => handleCellSave(info.row.original.id, "name", v)}
            placeholder="Nombre de la partida"
          />
        ),
      }),

      // Unidad
      columnHelper.accessor("unit", {
        header: "Unidad",
        size: 95,
        cell: (info) => (
          <select
            data-row={info.row.index}
            data-col="unit"
            value={info.getValue()}
            disabled={readOnly}
            onChange={(e) => {
              onCellChange(info.row.original.id, "unit", e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Tab") {
                e.preventDefault();
                navigateTo(
                  { rowIndex: info.row.index, colId: "unit" },
                  e.shiftKey ? "left" : "right"
                );
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                navigateTo({ rowIndex: info.row.index, colId: "unit" }, "up");
              }
              if (e.key === "ArrowDown") {
                e.preventDefault();
                navigateTo({ rowIndex: info.row.index, colId: "unit" }, "down");
              }
            }}
            className={cn(
              "w-full px-2 py-2 bg-white rounded-sm text-sm cursor-pointer outline-none",
              "text-gray-900",
              "hover:bg-blue-50 focus:bg-blue-50 focus:ring-2 focus:ring-blue-300",
              readOnly && "pointer-events-none text-gray-500 bg-gray-50"
            )}
          >
            {UNITS.map((u) => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>
        ),
      }),

      // Cantidad
      columnHelper.accessor("quantity", {
        header: "Cantidad",
        size: 115,
        cell: (info) => (
          <EditableCell
            value={info.getValue()}
            type="number"
            disabled={readOnly}
            coord={{ rowIndex: info.row.index, colId: "quantity" }}
            onNavigate={navigateTo}
            onSave={(v) => handleCellSave(info.row.original.id, "quantity", v)}
            placeholder="0"
          />
        ),
      }),

      // Precio unitario (costo)
      columnHelper.accessor("costUnitPrice", {
        header: "P.U. Costo",
        size: 120,
        cell: (info) => (
          <EditableCell
            value={info.getValue()}
            type="number"
            disabled={readOnly}
            coord={{ rowIndex: info.row.index, colId: "costUnitPrice" }}
            onNavigate={navigateTo}
            onSave={(v) => handleCellSave(info.row.original.id, "costUnitPrice", v)}
            formatDisplay={(v) => fmtCurrency(Number(v))}
            placeholder="$0.00"
          />
        ),
      }),

      // Precio unitario (venta)
      columnHelper.accessor("saleUnitPrice", {
        header: "P.U. Venta",
        size: 120,
        cell: (info) => (
          <EditableCell
            value={info.getValue()}
            type="number"
            disabled={readOnly}
            coord={{ rowIndex: info.row.index, colId: "saleUnitPrice" }}
            onNavigate={navigateTo}
            onSave={(v) => handleCellSave(info.row.original.id, "saleUnitPrice", v)}
            formatDisplay={(v) => fmtCurrency(Number(v))}
            placeholder="$0.00"
          />
        ),
      }),

      // Subtotal costo (calculado)
      columnHelper.display({
        id: "costSubtotal",
        header: "Subt. Costo",
        size: 120,
        cell: (info) => {
          const sub = info.row.original.quantity * info.row.original.costUnitPrice;
          return (
            <div className="px-3 py-2 text-sm font-medium tabular-nums text-gray-700 bg-gray-50/50">
              {fmtCurrency(sub)}
            </div>
          );
        },
      }),

      // Subtotal venta (calculado)
      columnHelper.display({
        id: "saleSubtotal",
        header: "Subt. Venta",
        size: 120,
        cell: (info) => {
          const sub = info.row.original.quantity * info.row.original.saleUnitPrice;
          return (
            <div className="px-3 py-2 text-sm font-medium tabular-nums text-gray-700 bg-blue-50/50">
              {fmtCurrency(sub)}
            </div>
          );
        },
      }),

      // Avance físico
      ...(progressData
        ? [
            columnHelper.display({
              id: "progress",
              header: "Avance",
              size: 140,
              cell: (info: { row: { original: BudgetItem } }) => {
                const item = info.row.original;
                const prog = progressData.get(item.id);
                const pct = prog?.percent ?? 0;
                const measured = prog?.measured ?? 0;
                return (
                  <div
                    className="px-2 py-1.5 cursor-pointer hover:bg-blue-50 rounded transition-colors"
                    onClick={() => onOpenProgress?.(item.id)}
                    title="Registrar avance"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            pct >= 100
                              ? "bg-green-500"
                              : pct > 0
                              ? "bg-blue-500"
                              : "bg-gray-200"
                          }`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-gray-600 w-8 text-right shrink-0">
                        {pct}%
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5 tabular-nums">
                      {measured} / {item.quantity}
                    </p>
                  </div>
                );
              },
            }),
          ]
        : []),

      // Acciones
      ...(!readOnly
        ? [
            columnHelper.display({
              id: "actions",
              header: "",
              size: 72,
              cell: (info: { row: { original: BudgetItem } }) => (
                <div className="flex items-center gap-0.5 px-1">
                  {onOpenAPU && (
                    <button
                      onClick={() => onOpenAPU(info.row.original.id)}
                      className="p-1.5 text-gray-400 hover:text-purple-600 rounded transition-colors cursor-pointer"
                      title="Análisis de Precios (APU)"
                    >
                      <FlaskConical size={15} />
                    </button>
                  )}
                  <button
                    onClick={() => onDuplicateItem(info.row.original.id)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors"
                    title="Duplicar partida"
                  >
                    <Copy size={15} />
                  </button>
                  <button
                    onClick={() => onDeleteItem(info.row.original.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors"
                    title="Eliminar partida"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ),
            }),
          ]
        : []),
    ],
    [navigateTo, handleCellSave, onCellChange, onDuplicateItem, onDeleteItem, readOnly, onOpenAPU]
  );

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  // ─── DnD ───
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const itemIds = useMemo(() => items.map((i) => i.id), [items]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id || !onReorderItems) return;
      const oldIndex = itemIds.indexOf(active.id as string);
      const newIndex = itemIds.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;
      const newOrder = arrayMove(itemIds, oldIndex, newIndex);
      onReorderItems(newOrder);
    },
    [itemIds, onReorderItems]
  );

  // ─── Totales ───
  const categoryCostTotal = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.costUnitPrice, 0),
    [items]
  );
  const categorySaleTotal = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.saleUnitPrice, 0),
    [items]
  );

  const itemCount = items.length;

  // ─── Render ────
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      {/* Header de categoría */}
      <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-2">
          {categoryDragHandleProps && (
            <div
              {...categoryDragHandleProps}
              className="p-1 -ml-2 cursor-grab text-gray-400 hover:text-gray-600 rounded transition-colors"
              title="Arrastrar para reordenar rubro"
            >
              <GripVertical size={16} />
            </div>
          )}
          <h3 className="font-semibold text-gray-800">{categoryName}</h3>
          <span className="text-xs text-gray-400">{itemCount} partida{itemCount !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex items-center gap-3">
          {isSaving && (
            <span className="flex items-center gap-1.5 text-xs text-blue-600">
              <Save size={13} className="animate-pulse" />
              Guardando...
            </span>
          )}
          {!readOnly && onDeleteCategory && (
            <button
              type="button"
              onClick={onDeleteCategory}
              className="text-xs font-medium text-red-600 hover:text-red-700 px-2 py-1 rounded-md hover:bg-red-50 transition-colors"
            >
              Eliminar rubro
            </button>
          )}
          <div className="flex items-center gap-4 text-sm tabular-nums">
            <span className="text-gray-500">Costo: <strong className="text-gray-700">{fmtCurrency(categoryCostTotal)}</strong></span>
            <span className="text-gray-500">Venta: <strong className="text-blue-700">{fmtCurrency(categorySaleTotal)}</strong></span>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          <div className="overflow-x-auto">
            <table ref={tableRef} className="w-full border-collapse">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b border-gray-200 bg-gray-50/60">
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        style={{ width: header.getSize() }}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="px-4 py-8 text-center text-sm text-gray-400"
                    >
                      Sin partidas. Haz click en &quot;Agregar partida&quot; para comenzar.
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row, rowIdx) => (
                    <SortableRow key={row.id} row={row} rowIdx={rowIdx} readOnly={readOnly} />
                  ))
                )}
              </tbody>
              {/* Footer con totales */}
              {items.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50/80">
                    {/* cols 1-6: #, Desc, Unidad, Cantidad, P.U.Costo, P.U.Venta */}
                    <td
                      colSpan={6}
                      className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase"
                    >
                      Total categoría
                    </td>
                    {/* col 7: Subt. Costo */}
                    <td className="px-3 py-2.5 text-sm font-bold text-gray-900 tabular-nums">
                      {fmtCurrency(categoryCostTotal)}
                    </td>
                    {/* col 8: Subt. Venta */}
                    <td className="px-3 py-2.5 text-sm font-bold text-blue-700 tabular-nums">
                      {fmtCurrency(categorySaleTotal)}
                    </td>
                    {/* col 9: Avance (condicional) */}
                    {progressData && <td />}
                    {/* col 10: Acciones (condicional) */}
                    {!readOnly && <td />}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </SortableContext>
      </DndContext>

      {/* Agregar partida */}
      {!readOnly && (
        <button
          onClick={onAddItem}
          className="w-full px-4 py-2.5 text-sm text-gray-500 hover:text-blue-600 hover:bg-blue-50 flex items-center gap-2 transition-colors border-t border-gray-100"
        >
          <Plus size={16} />
          Agregar partida
        </button>
      )}

      {/* Atajos de teclado */}
      {!readOnly && items.length > 0 && (
        <div className="px-4 py-2 bg-gray-50/50 border-t border-gray-100 flex flex-wrap gap-4 text-[11px] text-gray-600">
          <span><kbd className="px-1 py-0.5 bg-gray-200 rounded text-[10px]">Tab</kbd> / <kbd className="px-1 py-0.5 bg-gray-200 rounded text-[10px]">Shift+Tab</kbd> navegar celdas</span>
          <span><kbd className="px-1 py-0.5 bg-gray-200 rounded text-[10px]">Enter</kbd> confirmar y bajar</span>
          <span><kbd className="px-1 py-0.5 bg-gray-200 rounded text-[10px]">Esc</kbd> cancelar edicion</span>
          <span><kbd className="px-1 py-0.5 bg-gray-200 rounded text-[10px]">↑↓←→</kbd> navegar</span>
          <span><GripVertical size={11} className="inline" /> arrastrar para reordenar</span>
        </div>
      )}
    </div>
  );
}

// ─── Sortable Row ───────────────────────────────────────────────────────

import type { Row } from "@tanstack/react-table";

function SortableRow({
  row,
  rowIdx,
  readOnly,
}: {
  row: Row<BudgetItem>;
  rowIdx: number;
  readOnly: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id, disabled: readOnly });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={cn(
        "border-b border-gray-100 transition-colors",
        "hover:bg-blue-50/30",
        rowIdx % 2 === 1 && "bg-gray-50/30",
        isDragging && "bg-blue-50 shadow-sm z-10"
      )}
    >
      {row.getVisibleCells().map((cell) => (
        <td
          key={cell.id}
          className="p-0"
          style={{ width: cell.column.getSize() }}
          {...(cell.column.id === "index" ? { ...attributes, ...listeners } : {})}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
    </tr>
  );
}
