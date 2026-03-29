"use client";

import { useState, useCallback } from "react";
import { Trash2, Plus, Ruler } from "lucide-react";
import Modal from "@/components/ui/Modal";
import {
  useItemProgress,
  useCreateProgressEntry,
  useUpdateProgressEntry,
  useDeleteProgressEntry,
} from "@/hooks/useProgress";
import type { BudgetItem } from "@/types";

interface ProgressEntryModalProps {
  item: BudgetItem | null;
  isOpen: boolean;
  onClose: () => void;
}

const UNIT_LABELS: Record<string, string> = {
  M2: "m²",
  M3: "m³",
  ML: "ml",
  UNIT: "un",
  KG: "kg",
  TON: "ton",
  GLOBAL: "gl",
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ProgressEntryModal({
  item,
  isOpen,
  onClose,
}: ProgressEntryModalProps) {
  const { data, isLoading } = useItemProgress(item?.id);
  const createMut = useCreateProgressEntry();
  const updateMut = useUpdateProgressEntry();
  const deleteMut = useDeleteProgressEntry();

  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const resetForm = useCallback(() => {
    setQuantity("");
    setDate(new Date().toISOString().slice(0, 10));
    setNotes("");
    setError("");
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!item) return;
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      setError("Ingresá una cantidad válida");
      return;
    }
    setError("");
    try {
      await createMut.mutateAsync({
        budgetItemId: item.id,
        payload: {
          quantity: qty,
          date: new Date(date + "T12:00:00").toISOString(),
          notes: notes.trim() || undefined,
        },
      });
      resetForm();
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      setError(err.response?.data?.error ?? "Error al registrar avance");
    }
  }, [item, quantity, date, notes, createMut, resetForm]);

  const handleDelete = useCallback(
    async (entryId: string) => {
      if (!confirm("¿Eliminar este registro de avance?")) return;
      await deleteMut.mutateAsync(entryId);
    },
    [deleteMut]
  );

  if (!item) return null;

  const unitLabel = UNIT_LABELS[item.unit] ?? item.unit;
  const budgeted = item.quantity;
  const cumulative = data?.cumulativeQuantity ?? 0;
  const percent = data?.percent ?? 0;
  const remaining = Math.max(budgeted - cumulative, 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Avance físico"
      className="max-w-lg"
    >
      <div className="space-y-5">
        {/* Header info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Ruler size={16} className="text-gray-400" />
            <p className="text-sm font-medium text-gray-900">{item.name}</p>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  percent >= 100 ? "bg-green-500" : percent >= 75 ? "bg-blue-500" : "bg-blue-400"
                }`}
                style={{ width: `${Math.min(percent, 100)}%` }}
              />
            </div>
            <span className="text-sm font-bold text-gray-900 tabular-nums w-12 text-right">
              {percent}%
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-[11px] text-gray-500">Presupuestado</p>
              <p className="text-sm font-semibold text-gray-900 tabular-nums">
                {budgeted} {unitLabel}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-gray-500">Medido</p>
              <p className="text-sm font-semibold text-blue-600 tabular-nums">
                {cumulative} {unitLabel}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-gray-500">Restante</p>
              <p className="text-sm font-semibold text-gray-600 tabular-nums">
                {remaining} {unitLabel}
              </p>
            </div>
          </div>
        </div>

        {/* New entry form */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Registrar medición
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Cantidad ({unitLabel}) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Fecha</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Notas</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Opcional"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={createMut.isPending || !quantity}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus size={16} />
            {createMut.isPending ? "Registrando..." : "Registrar avance"}
          </button>
        </div>

        {/* Entries history */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Historial de mediciones
          </p>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : !data || data.entries.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">
              Sin mediciones registradas
            </p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {data.entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 tabular-nums">
                        +{entry.quantity} {unitLabel}
                      </span>
                      <span className="text-xs text-gray-400">
                        {fmtDate(entry.date)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-gray-400">
                        {entry.recordedBy.firstName} {entry.recordedBy.lastName}
                      </span>
                      {entry.notes && (
                        <span className="text-[11px] text-gray-500 truncate">
                          — {entry.notes}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(entry.id)}
                    disabled={deleteMut.isPending}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded opacity-0 group-hover:opacity-100 transition-all"
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
