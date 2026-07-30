"use client";

import { useMemo, useState } from "react";
import {
  Search,
  FlaskConical,
  Loader2,
  PencilLine,
  Pencil,
  Trash2,
  EyeOff,
  RotateCcw,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import ManualAPUForm from "@/components/budget/ManualAPUForm";
import APUTemplateEditor from "@/components/budget/APUTemplateEditor";
import {
  useAPURubros,
  useAPUTemplates,
  useAPUTemplate,
  useApplyAPUTemplate,
  useUpdateAPUTemplate,
  useDeleteAPUTemplate,
} from "@/hooks/useAPUTemplates";
import { cn } from "@/lib/utils/cn";
import type { MeasurementUnit } from "@/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Aplicar a un BudgetItem ya creado. Si se pasa, se ofrece reemplazar APU existente. */
  budgetItemId?: string;
  /** Crear un nuevo BudgetItem en esta categoría */
  categoryId?: string;
  /** Nombre del rubro destino — precarga el rubro al guardar una plantilla nueva */
  categoryName?: string;
  /** Partida destino cuando se carga sobre una existente (modo manual) */
  existingItem?: { name: string; unit: MeasurementUnit };
  onApplied?: (budgetItemId: string) => void;
}

type Mode = "template" | "manual";

function apiError(e: unknown, fallback: string): string {
  const err = e as { response?: { data?: { error?: string } } };
  return err.response?.data?.error ?? fallback;
}

const formatMoney = (n: number) =>
  `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;

export default function APUTemplatePicker({
  isOpen,
  onClose,
  budgetItemId,
  categoryId,
  categoryName,
  existingItem,
  onApplied,
}: Props) {
  const [mode, setMode] = useState<Mode>("template");
  const [search, setSearch] = useState("");
  const [rubro, setRubro] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(false);
  /** El form manual avisa si tiene filas cargadas, para no descartarlas sin querer */
  const [manualDirty, setManualDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  // Mantenimiento de la plantilla seleccionada
  const [editing, setEditing] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);

  const { data: rubros } = useAPURubros();
  const { data: templates, isLoading } = useAPUTemplates({
    search: search.trim() || undefined,
    rubro: rubro || undefined,
    isActive: true,
  });
  const { data: detail, isLoading: loadingDetail } = useAPUTemplate(selectedId);
  const applyMut = useApplyAPUTemplate();
  const updateMut = useUpdateAPUTemplate();
  const deleteMut = useDeleteAPUTemplate();

  const filtered = useMemo(() => templates ?? [], [templates]);
  const rubroOptions = useMemo(() => (rubros ?? []).map((r) => r.rubro), [rubros]);

  const resetAndClose = () => {
    setMode("template");
    setSelectedId(null);
    setSearch("");
    setRubro("");
    setReplaceExisting(false);
    setManualDirty(false);
    setConfirmDiscard(false);
    onClose();
  };

  /** Cierre pedido por el usuario (X, click afuera, Escape o Cancelar). */
  const requestClose = () => {
    if (manualDirty) {
      setConfirmDiscard(true);
      return;
    }
    resetAndClose();
  };

  const handleApply = () => {
    if (!selectedId) return;
    applyMut.mutate(
      {
        templateId: selectedId,
        payload: {
          budgetItemId,
          categoryId,
          replaceExisting,
        },
      },
      {
        onSuccess: (res) => {
          onApplied?.(res.budgetItemId);
          resetAndClose();
        },
      }
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={requestClose}
      title={budgetItemId ? "Cargar APU en la partida" : "Agregar partida"}
      className="max-w-4xl"
    >
      {/* Confirmación para no perder una carga manual a medio hacer */}
      {confirmDiscard && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/95 p-6">
          <div className="max-w-sm text-center space-y-4">
            <h3 className="text-base font-semibold text-gray-900">
              ¿Descartar la carga manual?
            </h3>
            <p className="text-sm text-gray-600">
              Tenés datos cargados en el subrubro que todavía no se guardaron. Si cerrás
              ahora se pierden.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmDiscard(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Seguir editando
              </button>
              <button
                type="button"
                onClick={resetAndClose}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selector de modo: catálogo de plantillas o carga manual */}
      <div
        role="tablist"
        aria-label="Cómo cargar la partida"
        className="flex flex-wrap gap-1 mb-4 rounded-lg bg-gray-100 p-1"
      >
        {(
          [
            { id: "template" as Mode, label: "Desde plantilla", icon: FlaskConical },
            { id: "manual" as Mode, label: "Carga manual", icon: PencilLine },
          ]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={mode === tab.id}
            onClick={() => setMode(tab.id)}
            className={cn(
              "flex-1 min-w-[9rem] inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              mode === tab.id
                ? "bg-white text-blue-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            <tab.icon size={15} />
            {tab.label}
            {tab.id === "manual" && manualDirty && (
              <span
                className="ml-0.5 h-1.5 w-1.5 rounded-full bg-blue-500"
                title="Hay datos cargados sin guardar"
              />
            )}
          </button>
        ))}
      </div>

      {/* Confirmación de borrado de la plantilla del catálogo */}
      {deletingTemplate && detail && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/95 p-6">
          <div className="max-w-sm text-center space-y-4">
            <h3 className="text-base font-semibold text-gray-900">¿Eliminar la plantilla?</h3>
            <p className="text-sm text-gray-600">
              Se borra <strong className="text-gray-900">{detail.name}</strong> del rubro{" "}
              <strong className="text-gray-900">{detail.rubro}</strong> del catálogo. Las partidas
              ya creadas con ella no se modifican.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-2">
              <button
                type="button"
                onClick={() => setDeletingTemplate(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleteMut.isPending}
                onClick={() => {
                  setTemplateError(null);
                  deleteMut.mutate(detail.id, {
                    onSuccess: () => {
                      setDeletingTemplate(false);
                      setSelectedId(null);
                    },
                    onError: (e) => {
                      setDeletingTemplate(false);
                      setTemplateError(apiError(e, "No se pudo eliminar la plantilla"));
                    },
                  });
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {deleteMut.isPending && <Loader2 className="animate-spin" size={14} />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edición de la plantilla seleccionada */}
      {editing && detail && (
        <APUTemplateEditor
          template={detail}
          rubroOptions={rubroOptions}
          onCancel={() => setEditing(false)}
          onSaved={() => setEditing(false)}
        />
      )}

      {/* El form manual queda montado al cambiar de pestaña: no se pierde la carga */}
      <div className={mode === "manual" && !editing ? "" : "hidden"}>
        <ManualAPUForm
          categoryId={categoryId}
          budgetItemId={budgetItemId}
          existingItem={existingItem}
          categoryName={categoryName}
          rubroOptions={rubroOptions}
          onDirtyChange={setManualDirty}
          onCancel={requestClose}
          onSaved={(id) => {
            onApplied?.(id);
            resetAndClose();
          }}
        />
      </div>

      {mode === "template" && !editing && (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Columna izquierda: lista */}
          <div className="space-y-3">
            {/* filtros */}
            <div className="space-y-2">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar subrubro..."
                  className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm text-gray-900 focus:border-ring focus:ring-2 focus:ring-ring focus:outline-none"
                />
              </div>
              <select
                value={rubro}
                onChange={(e) => setRubro(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              >
                <option value="">Todos los rubros ({rubros?.length ?? 0})</option>
                {rubros?.map((r) => (
                  <option key={r.rubro} value={r.rubro}>
                    {r.rubro} ({r.count})
                  </option>
                ))}
              </select>
            </div>

            {/* listado */}
            <div className="max-h-96 overflow-y-auto rounded-lg border border-gray-200 bg-white">
              {isLoading ? (
                <div className="p-6 flex items-center justify-center text-sm text-gray-500">
                  <Loader2 className="animate-spin mr-2" size={16} /> Cargando…
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500">
                  Sin resultados
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {filtered.map((t) => (
                    <li
                      key={t.id}
                      onClick={() => {
                        setSelectedId(t.id);
                        setEditing(false);
                        setTemplateError(null);
                      }}
                      className={`cursor-pointer px-3 py-2 text-sm hover:bg-blue-50 ${
                        selectedId === t.id ? "bg-blue-50" : ""
                      }`}
                    >
                      <div className="text-xs text-blue-600 font-medium">{t.rubro}</div>
                      <div className="text-gray-900">{t.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {t.materialsCount} mat · {t.laborCount} MO · {t.unit}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Columna derecha: detalle */}
          <div className="space-y-3">
            {!selectedId ? (
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500 flex flex-col items-center justify-center min-h-[24rem]">
                <FlaskConical size={32} className="mb-2 text-gray-400" />
                Seleccioná una plantilla para ver su composición
              </div>
            ) : loadingDetail || !detail ? (
              <div className="p-8 flex items-center justify-center text-sm text-gray-500">
                <Loader2 className="animate-spin mr-2" size={16} /> Cargando detalle…
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-white">
                <div className="p-3 border-b border-gray-100 space-y-2">
                  <div>
                    <div className="text-xs text-blue-600 font-medium">{detail.rubro}</div>
                    <div className="text-sm font-medium text-gray-900">
                      {detail.name}
                      {!detail.isActive && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                          Desactivada
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">Unidad: {detail.unit}</div>
                    {detail.description && (
                      <div className="text-xs text-gray-500 mt-0.5">{detail.description}</div>
                    )}
                  </div>

                  {/* Mantenimiento del catálogo */}
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-hover"
                    >
                      <Pencil size={13} />
                      Editar plantilla
                    </button>
                    <button
                      type="button"
                      disabled={updateMut.isPending}
                      onClick={() =>
                        void updateMut.mutateAsync({
                          id: detail.id,
                          payload: { isActive: !detail.isActive },
                        })
                      }
                      className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50"
                    >
                      {detail.isActive ? <EyeOff size={13} /> : <RotateCcw size={13} />}
                      {detail.isActive ? "Desactivar" : "Reactivar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingTemplate(true)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={13} />
                      Eliminar
                    </button>
                  </div>

                  {templateError && (
                    <p role="alert" className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
                      {templateError}
                    </p>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr className="text-gray-500 uppercase tracking-wide">
                        <th className="text-left px-3 py-2">Insumo</th>
                        <th className="text-right px-2 py-2">Cant.</th>
                        <th className="text-right px-2 py-2">Precio</th>
                        <th className="text-right px-3 py-2">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {detail.materials.map((m) => (
                        <tr key={m.id}>
                          <td className="px-3 py-1.5">
                            <div className="text-gray-900">{m.material.name}</div>
                            <div className="text-xs text-gray-400">{m.material.unit}</div>
                          </td>
                          <td className="px-2 py-1.5 text-right tabular-nums text-gray-700">
                            {m.consumptionPerUnit.toLocaleString("es-AR")}
                          </td>
                          <td className="px-2 py-1.5 text-right tabular-nums text-gray-700">
                            {formatMoney(m.unitCost)}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums text-gray-900">
                            {formatMoney(m.subtotal)}
                          </td>
                        </tr>
                      ))}
                      {detail.labor.map((l) => (
                        <tr key={l.id} className="bg-amber-50/40">
                          <td className="px-3 py-1.5">
                            <div className="text-gray-900">{l.description}</div>
                            <div className="text-xs text-amber-700">Mano de Obra</div>
                          </td>
                          <td className="px-2 py-1.5 text-right text-gray-400">—</td>
                          <td className="px-2 py-1.5 text-right text-gray-400">—</td>
                          <td className="px-3 py-1.5 text-right tabular-nums text-gray-900">
                            {formatMoney(l.costPerUnit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 sticky bottom-0">
                      <tr>
                        <td colSpan={3} className="px-3 py-2 text-right text-gray-600">
                          Total por {detail.unit}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-gray-900 tabular-nums">
                          {formatMoney(detail.totalCost)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* opciones aplicar */}
            {budgetItemId && (
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={(e) => setReplaceExisting(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Reemplazar líneas APU existentes
              </label>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={requestClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!selectedId || applyMut.isPending}
            onClick={handleApply}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 inline-flex items-center gap-2"
          >
            {applyMut.isPending && <Loader2 className="animate-spin" size={14} />}
            {budgetItemId ? "Aplicar a la partida" : "Crear partida"}
          </button>
        </div>
        </>
      )}
    </Modal>
  );
}
