"use client";

import { useMemo, useState } from "react";
import { Search, FlaskConical, Loader2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import {
  useAPURubros,
  useAPUTemplates,
  useAPUTemplate,
  useApplyAPUTemplate,
} from "@/hooks/useAPUTemplates";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Aplicar a un BudgetItem ya creado. Si se pasa, se ofrece reemplazar APU existente. */
  budgetItemId?: string;
  /** Crear un nuevo BudgetItem en esta categoría */
  categoryId?: string;
  onApplied?: (budgetItemId: string) => void;
}

const formatMoney = (n: number) =>
  `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;

export default function APUTemplatePicker({
  isOpen,
  onClose,
  budgetItemId,
  categoryId,
  onApplied,
}: Props) {
  const [search, setSearch] = useState("");
  const [rubro, setRubro] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(false);

  const { data: rubros } = useAPURubros();
  const { data: templates, isLoading } = useAPUTemplates({
    search: search.trim() || undefined,
    rubro: rubro || undefined,
    isActive: true,
  });
  const { data: detail, isLoading: loadingDetail } = useAPUTemplate(selectedId);
  const applyMut = useApplyAPUTemplate();

  const filtered = useMemo(() => templates ?? [], [templates]);

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
          setSelectedId(null);
          setSearch("");
          setRubro("");
          setReplaceExisting(false);
          onClose();
        },
      }
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={budgetItemId ? "Aplicar plantilla APU a la partida" : "Agregar partida desde plantilla"}
      className="max-w-4xl"
    >
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
                className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
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
                    onClick={() => setSelectedId(t.id)}
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
              <div className="p-3 border-b border-gray-100">
                <div className="text-xs text-blue-600 font-medium">{detail.rubro}</div>
                <div className="text-sm font-medium text-gray-900">{detail.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">Unidad: {detail.unit}</div>
              </div>
              <div className="max-h-72 overflow-y-auto">
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
                          <div className="text-[10px] text-gray-400">{m.material.unit}</div>
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
                          <div className="text-[10px] text-amber-700">Mano de Obra</div>
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
          onClick={onClose}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={!selectedId || applyMut.isPending}
          onClick={handleApply}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2"
        >
          {applyMut.isPending && <Loader2 className="animate-spin" size={14} />}
          {budgetItemId ? "Aplicar a la partida" : "Crear partida"}
        </button>
      </div>
    </Modal>
  );
}
