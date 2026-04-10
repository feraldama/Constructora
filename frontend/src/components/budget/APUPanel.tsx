"use client";

import { useState, useCallback } from "react";
import {
  Plus,
  Trash2,
  RefreshCw,
  Package,
  Wrench,
} from "lucide-react";
import {
  useAPU,
  useAddAPUMaterial,
  useUpdateAPUMaterial,
  useDeleteAPUMaterial,
  useAddAPULabor,
  useUpdateAPULabor,
  useDeleteAPULabor,
  useRefreshAPUPrices,
} from "@/hooks/useAPU";
import { useMaterials } from "@/hooks/useMaterials";
import type { BudgetItem, Material, MeasurementUnit } from "@/types";

/** Parse a user-typed decimal that may use comma or dot as separator */
function parseDecimal(raw: string): number {
  return Number(raw.replace(",", "."));
}

const UNIT_LABELS: Record<MeasurementUnit, string> = {
  M2: "m²",
  M3: "m³",
  ML: "ml",
  UNIT: "unidad",
  KG: "kg",
  TON: "ton",
  GLOBAL: "global",
};

function fmt(n: number): string {
  return "$" + n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface APUPanelProps {
  item: BudgetItem;
  onClose: () => void;
}

export default function APUPanel({ item, onClose }: APUPanelProps) {
  const { data: apu, isLoading } = useAPU(item.id);
  const { data: materials } = useMaterials({ isActive: true });

  const addMaterial = useAddAPUMaterial(item.id);
  const updateMaterial = useUpdateAPUMaterial(item.id);
  const deleteMaterial = useDeleteAPUMaterial(item.id);
  const addLabor = useAddAPULabor(item.id);
  const updateLabor = useUpdateAPULabor(item.id);
  const deleteLabor = useDeleteAPULabor(item.id);
  const refreshPrices = useRefreshAPUPrices(item.id);

  // Add material form
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [newMaterialId, setNewMaterialId] = useState("");
  const [newConsumption, setNewConsumption] = useState("");
  const [newWaste, setNewWaste] = useState("");

  // Add labor form
  const [showAddLabor, setShowAddLabor] = useState(false);
  const [newLaborDesc, setNewLaborDesc] = useState("");
  const [newLaborCost, setNewLaborCost] = useState("");

  const handleAddMaterial = useCallback(async () => {
    const consumption = parseDecimal(newConsumption);
    const waste = parseDecimal(newWaste);
    if (!newMaterialId || isNaN(consumption) || consumption <= 0) return;
    await addMaterial.mutateAsync({
      materialId: newMaterialId,
      consumptionPerUnit: consumption,
      wastePercent: isNaN(waste) ? 0 : waste,
    });
    setShowAddMaterial(false);
    setNewMaterialId("");
    setNewConsumption("");
    setNewWaste("");
  }, [newMaterialId, newConsumption, newWaste, addMaterial]);

  const handleAddLabor = useCallback(async () => {
    const cost = parseDecimal(newLaborCost);
    if (!newLaborDesc.trim()) return;
    await addLabor.mutateAsync({
      description: newLaborDesc.trim(),
      costPerUnit: isNaN(cost) ? 0 : cost,
    });
    setShowAddLabor(false);
    setNewLaborDesc("");
    setNewLaborCost("");
  }, [newLaborDesc, newLaborCost, addLabor]);

  // Materiales ya usados en el APU (para filtrar en el selector)
  const usedMaterialIds = new Set(apu?.materials.map((m) => m.materialId) ?? []);
  const availableMaterials = materials?.filter((m) => !usedMaterialIds.has(m.id)) ?? [];

  if (isLoading) {
    return (
      <div className="border border-blue-200 rounded-lg bg-blue-50/30 p-6 animate-pulse">
        <div className="h-5 w-48 bg-gray-200 rounded mb-4" />
        <div className="h-32 bg-gray-100 rounded" />
      </div>
    );
  }

  return (
    <div className="border border-blue-200 rounded-lg bg-white shadow-sm">
      {/* Header */}
      <div className="bg-blue-50 px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-blue-200 rounded-t-lg">
        <div>
          <h3 className="font-semibold text-blue-900 text-sm">
            Análisis de Precios Unitarios (APU)
          </h3>
          <p className="text-xs text-blue-600 mt-0.5">
            {item.name} — {UNIT_LABELS[item.unit]}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refreshPrices.mutateAsync()}
            disabled={refreshPrices.isPending || !apu?.materials.length}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-900 bg-white border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 disabled:opacity-50 transition-colors"
            title="Actualizar precios desde el catálogo"
          >
            <RefreshCw size={13} className={refreshPrices.isPending ? "animate-spin" : ""} />
            Actualizar precios
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-gray-500 hover:text-gray-700 px-2 py-1.5"
          >
            Cerrar
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* ─── Materiales ─── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <Package size={15} className="text-gray-400" />
              Materiales
            </h4>
            <button
              type="button"
              onClick={() => setShowAddMaterial(true)}
              disabled={availableMaterials.length === 0}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
            >
              <Plus size={14} />
              Agregar
            </button>
          </div>

          {apu?.materials.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-1.5 px-2 text-xs font-medium text-gray-500">Material</th>
                    <th className="text-right py-1.5 px-2 text-xs font-medium text-gray-500">Consumo/{UNIT_LABELS[item.unit]}</th>
                    <th className="text-right py-1.5 px-2 text-xs font-medium text-gray-500">Desp.%</th>
                    <th className="text-right py-1.5 px-2 text-xs font-medium text-gray-500">P.U.</th>
                    <th className="text-right py-1.5 px-2 text-xs font-medium text-gray-500">Subtotal</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {apu.materials.map((line) => (
                    <tr key={line.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-1.5 px-2 text-gray-900">
                        {line.material?.name}
                        <span className="text-xs text-gray-400 ml-1">
                          ({UNIT_LABELS[line.material?.unit as MeasurementUnit] ?? line.material?.unit})
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-right">
                        <input
                          type="text"
                          inputMode="decimal"
                          defaultValue={line.consumptionPerUnit}
                          onBlur={(e) => {
                            const val = parseDecimal(e.target.value);
                            if (!isNaN(val) && val !== line.consumptionPerUnit && val > 0) {
                              void updateMaterial.mutateAsync({
                                id: line.id,
                                payload: { consumptionPerUnit: val },
                              });
                            }
                          }}
                          className="w-20 text-right rounded border border-gray-200 px-2 py-1 text-sm tabular-nums focus:border-blue-400 focus:ring-1 focus:ring-blue-300 outline-none"
                        />
                      </td>
                      <td className="py-1.5 px-2 text-right">
                        <input
                          type="text"
                          inputMode="decimal"
                          defaultValue={line.wastePercent}
                          onBlur={(e) => {
                            const val = parseDecimal(e.target.value);
                            if (!isNaN(val) && val !== line.wastePercent) {
                              void updateMaterial.mutateAsync({
                                id: line.id,
                                payload: { wastePercent: val },
                              });
                            }
                          }}
                          className="w-16 text-right rounded border border-gray-200 px-2 py-1 text-sm tabular-nums focus:border-blue-400 focus:ring-1 focus:ring-blue-300 outline-none"
                        />
                      </td>
                      <td className="py-1.5 px-2 text-right tabular-nums text-gray-600">
                        {fmt(line.unitCost)}
                      </td>
                      <td className="py-1.5 px-2 text-right tabular-nums font-medium text-gray-900">
                        {fmt(line.subtotal)}
                      </td>
                      <td className="py-1.5 px-1">
                        <button
                          type="button"
                          onClick={() => void deleteMaterial.mutateAsync(line.id)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200">
                    <td colSpan={4} className="py-1.5 px-2 text-right text-xs font-medium text-gray-500">
                      Total materiales
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums font-semibold text-gray-900">
                      {fmt(apu.totalMaterials)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic py-2">
              Sin materiales en el análisis. Hacé click en "Agregar" para comenzar.
            </p>
          )}

          {/* Add material form */}
          {showAddMaterial && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Material</label>
                <select
                  value={newMaterialId}
                  onChange={(e) => setNewMaterialId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar material...</option>
                  {availableMaterials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({UNIT_LABELS[m.unit]}) — {fmt(m.unitPrice)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Consumo por {UNIT_LABELS[item.unit]}
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={newConsumption}
                    onChange={(e) => setNewConsumption(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Ej. 12,5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Desperdicio %</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={newWaste}
                    onChange={(e) => setNewWaste(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="5"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddMaterial(false)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!newMaterialId || parseDecimal(newConsumption) <= 0 || addMaterial.isPending}
                  onClick={() => void handleAddMaterial()}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {addMaterial.isPending ? "Agregando..." : "Agregar"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ─── Mano de Obra ─── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <Wrench size={15} className="text-gray-400" />
              Mano de Obra
            </h4>
            <button
              type="button"
              onClick={() => setShowAddLabor(true)}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
            >
              <Plus size={14} />
              Agregar
            </button>
          </div>

          {apu?.labor.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-1.5 px-2 text-xs font-medium text-gray-500">Descripción</th>
                    <th className="text-right py-1.5 px-2 text-xs font-medium text-gray-500">Costo/{UNIT_LABELS[item.unit]}</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {apu.labor.map((line) => (
                    <tr key={line.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          defaultValue={line.description}
                          onBlur={(e) => {
                            const val = e.target.value.trim();
                            if (val && val !== line.description) {
                              void updateLabor.mutateAsync({
                                id: line.id,
                                payload: { description: val },
                              });
                            }
                          }}
                          className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-300 outline-none"
                        />
                      </td>
                      <td className="py-1.5 px-2 text-right">
                        <input
                          type="text"
                          inputMode="decimal"
                          defaultValue={line.costPerUnit}
                          onBlur={(e) => {
                            const val = parseDecimal(e.target.value);
                            if (!isNaN(val) && val !== line.costPerUnit) {
                              void updateLabor.mutateAsync({
                                id: line.id,
                                payload: { costPerUnit: val },
                              });
                            }
                          }}
                          className="w-24 text-right rounded border border-gray-200 px-2 py-1 text-sm tabular-nums focus:border-blue-400 focus:ring-1 focus:ring-blue-300 outline-none"
                        />
                      </td>
                      <td className="py-1.5 px-1">
                        <button
                          type="button"
                          onClick={() => void deleteLabor.mutateAsync(line.id)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200">
                    <td className="py-1.5 px-2 text-right text-xs font-medium text-gray-500">
                      Total mano de obra
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums font-semibold text-gray-900">
                      {fmt(apu.totalLabor)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic py-2">
              Sin mano de obra en el análisis.
            </p>
          )}

          {/* Add labor form */}
          {showAddLabor && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
                  <input
                    type="text"
                    value={newLaborDesc}
                    onChange={(e) => setNewLaborDesc(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Ej. Oficial albañil"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Costo por {UNIT_LABELS[item.unit]}
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={newLaborCost}
                    onChange={(e) => setNewLaborCost(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="0,654"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddLabor(false)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!newLaborDesc.trim() || addLabor.isPending}
                  onClick={() => void handleAddLabor()}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {addLabor.isPending ? "Agregando..." : "Agregar"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ─── Total APU ─── */}
        {apu && (apu.materials.length > 0 || apu.labor.length > 0) && (
          <div className="border-t border-gray-200 pt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-500">
                Materiales: <strong className="text-gray-700">{fmt(apu.totalMaterials)}</strong>
              </span>
              <span className="text-gray-500">
                M.O.: <strong className="text-gray-700">{fmt(apu.totalLabor)}</strong>
              </span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Costo unitario APU: </span>
              <strong className="text-blue-700 text-base">{fmt(apu.totalCost)}</strong>
              <span className="text-gray-400 text-xs ml-1">/ {UNIT_LABELS[item.unit]}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
