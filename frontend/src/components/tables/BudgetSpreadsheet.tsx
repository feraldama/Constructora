"use client";

import { useMemo, useCallback, useRef, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
} from "@tanstack/react-table";
import { Plus, Copy, Trash2, GripVertical, Save } from "lucide-react";
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
const NAV_COLUMNS = ["name", "unit", "quantity", "unitPrice"] as const;

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
              <GripVertical size={14} className="text-gray-300 cursor-grab shrink-0" />
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

      // Precio unitario
      columnHelper.accessor("unitPrice", {
        header: "Precio Unit.",
        size: 130,
        cell: (info) => (
          <EditableCell
            value={info.getValue()}
            type="number"
            disabled={readOnly}
            coord={{ rowIndex: info.row.index, colId: "unitPrice" }}
            onNavigate={navigateTo}
            onSave={(v) => handleCellSave(info.row.original.id, "unitPrice", v)}
            formatDisplay={(v) => fmtCurrency(Number(v))}
            placeholder="$0.00"
          />
        ),
      }),

      // Subtotal (calculado — siempre deshabilitado)
      columnHelper.display({
        id: "subtotal",
        header: "Subtotal",
        size: 130,
        cell: (info) => {
          const sub = info.row.original.quantity * info.row.original.unitPrice;
          return (
            <div className="px-3 py-2 text-sm font-medium tabular-nums text-gray-700 bg-gray-50/50">
              {fmtCurrency(sub)}
            </div>
          );
        },
      }),

      // Acciones
      ...(!readOnly
        ? [
            columnHelper.display({
              id: "actions",
              header: "",
              size: 72,
              cell: (info: { row: { original: BudgetItem } }) => (
                <div className="flex items-center gap-0.5 px-1">
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
    [navigateTo, handleCellSave, onCellChange, onDuplicateItem, onDeleteItem, readOnly]
  );

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  // ─── Totales ───
  const categoryTotal = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [items]
  );

  const itemCount = items.length;

  // ─── Render ────
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      {/* Header de categoría */}
      <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-3">
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
          <span className="text-sm font-semibold text-gray-700 tabular-nums">
            Total: {fmtCurrency(categoryTotal)}
          </span>
        </div>
      </div>

      {/* Tabla */}
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
                <tr
                  key={row.id}
                  className={cn(
                    "border-b border-gray-100 transition-colors",
                    "hover:bg-blue-50/30",
                    rowIdx % 2 === 1 && "bg-gray-50/30"
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="p-0"
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
          {/* Footer con totales */}
          {items.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50/80">
                <td
                  colSpan={readOnly ? 4 : 4}
                  className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase"
                >
                  Total categoría
                </td>
                <td className="px-3 py-2.5" />
                <td className="px-3 py-2.5 text-sm font-bold text-gray-900 tabular-nums">
                  {fmtCurrency(categoryTotal)}
                </td>
                {!readOnly && <td />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

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
        <div className="px-4 py-2 bg-gray-50/50 border-t border-gray-100 flex gap-4 text-[11px] text-gray-600">
          <span><kbd className="px-1 py-0.5 bg-gray-200 rounded text-[10px]">Tab</kbd> / <kbd className="px-1 py-0.5 bg-gray-200 rounded text-[10px]">Shift+Tab</kbd> navegar celdas</span>
          <span><kbd className="px-1 py-0.5 bg-gray-200 rounded text-[10px]">Enter</kbd> confirmar y bajar</span>
          <span><kbd className="px-1 py-0.5 bg-gray-200 rounded text-[10px]">Esc</kbd> cancelar edicion</span>
          <span><kbd className="px-1 py-0.5 bg-gray-200 rounded text-[10px]">↑↓←→</kbd> navegar</span>
        </div>
      )}
    </div>
  );
}
