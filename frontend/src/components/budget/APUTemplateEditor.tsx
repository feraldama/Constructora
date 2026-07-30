"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Plus, Trash2, Loader2, Package, Wrench } from "lucide-react";
import Combobox from "@/components/ui/Combobox";
import { useUpdateAPUTemplate } from "@/hooks/useAPUTemplates";
import { useMaterials } from "@/hooks/useMaterials";
import { parseDecimal, formatDecimal, formatMoney as fmt } from "@/lib/utils/number";
import { normalizeName } from "@/lib/utils/text";
import type { APUTemplateDetail, Material, MeasurementUnit } from "@/types";

const UNIT_LABELS: Record<MeasurementUnit, string> = {
  M2: "m²",
  M3: "m³",
  ML: "ml",
  UNIT: "unidad",
  KG: "kg",
  TON: "ton",
  LITER: "lt",
  INCH: "pul",
  GLOBAL: "global",
};

const UNIT_OPTIONS = Object.keys(UNIT_LABELS) as MeasurementUnit[];

function apiError(e: unknown, fallback: string): string {
  const err = e as {
    response?: { data?: { error?: string; details?: Record<string, string[] | undefined> } };
  };
  const detalle = err.response?.data?.details;
  const primero = detalle
    ? Object.values(detalle)
        .flat()
        .find((m): m is string => !!m)
    : undefined;
  return primero ?? err.response?.data?.error ?? fallback;
}

interface MaterialRow {
  key: string;
  materialId: string;
  /** Nombre mostrado en el buscador */
  name: string;
  consumption: string;
  waste: string;
}

interface LaborRow {
  key: string;
  description: string;
  cost: string;
}

interface Props {
  template: APUTemplateDetail;
  rubroOptions?: string[];
  onCancel: () => void;
  onSaved?: () => void;
}

/**
 * Edición de una plantilla del catálogo APU: datos generales y composición
 * (materiales con consumo/desperdicio y mano de obra).
 *
 * Corregir una plantilla NO cambia las partidas ya creadas con ella: al
 * aplicarse, la partida se queda con una copia de las líneas.
 */
export default function APUTemplateEditor({
  template,
  rubroOptions = [],
  onCancel,
  onSaved,
}: Props) {
  const keySeq = useRef(0);
  const nextKey = () => `edit-${++keySeq.current}`;

  const { data: materials } = useMaterials({ isActive: true });
  const updateMut = useUpdateAPUTemplate();

  const [rubro, setRubro] = useState(template.rubro);
  const [name, setName] = useState(template.name);
  const [unit, setUnit] = useState<MeasurementUnit>(template.unit);
  const [description, setDescription] = useState(template.description ?? "");
  const [error, setError] = useState<string | null>(null);

  const [materialRows, setMaterialRows] = useState<MaterialRow[]>(() =>
    template.materials.map((m, idx) => ({
      key: `mat-${idx}`,
      materialId: m.materialId,
      name: m.material.name,
      consumption: formatDecimal(m.consumptionPerUnit),
      waste: m.wastePercent ? formatDecimal(m.wastePercent) : "",
    }))
  );
  const [laborRows, setLaborRows] = useState<LaborRow[]>(() =>
    template.labor.map((l, idx) => ({
      key: `mo-${idx}`,
      description: l.description,
      cost: formatDecimal(l.costPerUnit, 2),
    }))
  );

  const byName = useMemo(() => {
    const map = new Map<string, Material>();
    for (const m of materials ?? []) map.set(normalizeName(m.name), m);
    return map;
  }, [materials]);

  const byId = useMemo(() => {
    const map = new Map<string, Material>();
    for (const m of materials ?? []) map.set(m.id, m);
    return map;
  }, [materials]);

  const materialNames = useMemo(() => (materials ?? []).map((m) => m.name), [materials]);

  /** Precio por unidad de consumo, tomado del catálogo actual. */
  const unitCostOf = useCallback(
    (row: MaterialRow): number => {
      const m = byId.get(row.materialId);
      if (m) return m.unitPrice / (m.presentationQty || 1);
      // La plantilla puede referenciar un material que ya no está en la lista
      // de activos: en ese caso se usa el precio que trajo el detalle.
      const original = template.materials.find((x) => x.materialId === row.materialId);
      return original?.unitCost ?? 0;
    },
    [byId, template.materials]
  );

  const subtotalOf = useCallback(
    (row: MaterialRow): number => {
      const cons = parseDecimal(row.consumption);
      const waste = parseDecimal(row.waste);
      if (Number.isNaN(cons) || cons <= 0) return 0;
      return cons * (1 + (Number.isNaN(waste) ? 0 : waste) / 100) * unitCostOf(row);
    },
    [unitCostOf]
  );

  const totalMaterials = materialRows.reduce((s, r) => s + subtotalOf(r), 0);
  const totalLabor = laborRows.reduce((s, r) => {
    const c = parseDecimal(r.cost);
    return s + (Number.isNaN(c) ? 0 : c);
  }, 0);

  const patchRow = (key: string, patch: Partial<MaterialRow>) =>
    setMaterialRows((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const handleSave = useCallback(async () => {
    setError(null);

    if (!name.trim()) return setError("El nombre de la plantilla es requerido");
    if (!rubro.trim()) return setError("El rubro es requerido");

    const conMaterial = materialRows.filter((r) => r.materialId);
    const conMO = laborRows.filter((r) => r.description.trim());

    if (conMaterial.length === 0 && conMO.length === 0) {
      return setError("La plantilla necesita al menos un material o una mano de obra");
    }

    for (const row of conMaterial) {
      const cons = parseDecimal(row.consumption);
      if (Number.isNaN(cons) || cons <= 0) {
        return setError(`Ingresá el consumo de «${row.name}» (mayor a 0)`);
      }
      const waste = parseDecimal(row.waste);
      if (!Number.isNaN(waste) && (waste < 0 || waste > 100)) {
        return setError(`El desperdicio de «${row.name}» debe estar entre 0 y 100%`);
      }
    }

    const ids = conMaterial.map((r) => r.materialId);
    if (new Set(ids).size !== ids.length) {
      return setError("Hay materiales repetidos en la plantilla");
    }

    // Filas cuyo insumo tipeado no existe en el catálogo
    const sinResolver = materialRows.filter((r) => !r.materialId && r.name.trim());
    if (sinResolver.length > 0) {
      return setError(
        `«${sinResolver[0]!.name}» no está en el catálogo: cargalo en Materiales y volvé a elegirlo`
      );
    }

    try {
      await updateMut.mutateAsync({
        id: template.id,
        payload: {
          rubro: rubro.trim(),
          name: name.trim(),
          unit,
          description: description.trim() || null,
          materials: conMaterial.map((r) => {
            const waste = parseDecimal(r.waste);
            return {
              materialId: r.materialId,
              consumptionPerUnit: parseDecimal(r.consumption),
              wastePercent: Number.isNaN(waste) ? 0 : waste,
            };
          }),
          labor: conMO.map((r) => {
            const c = parseDecimal(r.cost);
            return {
              description: r.description.trim(),
              costPerUnit: Number.isNaN(c) ? 0 : c,
            };
          }),
        },
      });
      onSaved?.();
    } catch (e) {
      setError(apiError(e, "No se pudo guardar la plantilla"));
    }
  }, [
    name,
    rubro,
    unit,
    description,
    materialRows,
    laborRows,
    template.id,
    updateMut,
    onSaved,
  ]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
        <div className="sm:col-span-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">Rubro</label>
          <Combobox
            value={rubro}
            onChange={setRubro}
            options={rubroOptions}
            placeholder="Rubro del catálogo o uno nuevo"
          />
        </div>
        <div className="sm:col-span-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Nombre del subrubro
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Nombre de la plantilla"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-ring focus:ring-2 focus:ring-ring focus:outline-none"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Unidad</label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as MeasurementUnit)}
            aria-label="Unidad de la plantilla"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          >
            {UNIT_OPTIONS.map((u) => (
              <option key={u} value={u}>
                {UNIT_LABELS[u]}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-4">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Descripción (opcional)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            aria-label="Descripción de la plantilla"
            placeholder="Detalle o aclaración del subrubro"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-ring focus:ring-2 focus:ring-ring focus:outline-none"
          />
        </div>
      </div>

      {/* ─── Materiales ─── */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
            <Package size={15} className="text-gray-400" />
            Materiales
          </h4>
          <button
            type="button"
            onClick={() =>
              setMaterialRows((rows) => [
                ...rows,
                { key: nextKey(), materialId: "", name: "", consumption: "", waste: "" },
              ])
            }
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            <Plus size={14} />
            Agregar material
          </button>
        </div>

        <div className="space-y-2">
          {materialRows.map((row) => (
            <div
              key={row.key}
              className="flex flex-col sm:flex-row sm:items-end gap-2 rounded-lg border border-gray-200 bg-gray-50/60 p-2.5"
            >
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-medium text-gray-500 mb-1">Insumo</label>
                <Combobox
                  value={row.name}
                  onChange={(v) => {
                    const found = byName.get(normalizeName(v));
                    patchRow(row.key, { name: v, materialId: found?.id ?? "" });
                  }}
                  options={materialNames}
                  allowCustom={false}
                  placeholder="Elegí un material del catálogo"
                  emptyLabel="No hay materiales con ese nombre"
                />
              </div>
              <div className="w-full sm:w-28">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Consumo / {UNIT_LABELS[unit]}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  aria-label="Consumo de la plantilla"
                  value={row.consumption}
                  onChange={(e) => patchRow(row.key, { consumption: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm text-right tabular-nums focus:border-ring focus:ring-2 focus:ring-ring focus:outline-none"
                />
              </div>
              <div className="w-full sm:w-20">
                <label className="block text-xs font-medium text-gray-500 mb-1">Desp. %</label>
                <input
                  type="text"
                  inputMode="decimal"
                  aria-label="Desperdicio de la plantilla"
                  value={row.waste}
                  onChange={(e) => patchRow(row.key, { waste: e.target.value })}
                  placeholder="0"
                  className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm text-right tabular-nums focus:border-ring focus:ring-2 focus:ring-ring focus:outline-none"
                />
              </div>
              <div className="w-full sm:w-28 sm:text-right">
                <span className="block text-xs font-medium text-gray-500 mb-1">Subtotal</span>
                <span className="block px-2 py-2 text-sm font-medium text-gray-900 tabular-nums">
                  {fmt(subtotalOf(row))}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMaterialRows((rows) => rows.filter((r) => r.key !== row.key))}
                className="self-end p-2 text-gray-400 hover:text-red-600 rounded cursor-pointer shrink-0"
                title="Quitar material"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          {materialRows.length === 0 && (
            <p className="text-xs text-gray-400 italic">Sin materiales en la plantilla.</p>
          )}
        </div>
      </div>

      {/* ─── Mano de obra ─── */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
            <Wrench size={15} className="text-gray-400" />
            Mano de obra
          </h4>
          <button
            type="button"
            onClick={() =>
              setLaborRows((rows) => [...rows, { key: nextKey(), description: "", cost: "" }])
            }
            className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-hover"
          >
            <Plus size={14} />
            Agregar mano de obra
          </button>
        </div>

        <div className="space-y-2">
          {laborRows.map((row) => (
            <div
              key={row.key}
              className="flex flex-col sm:flex-row sm:items-end gap-2 rounded-lg border border-gray-200 bg-amber-50/40 p-2.5"
            >
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Descripción
                </label>
                <input
                  type="text"
                  value={row.description}
                  aria-label="Descripción de la mano de obra de la plantilla"
                  onChange={(e) =>
                    setLaborRows((rows) =>
                      rows.map((r) =>
                        r.key === row.key ? { ...r, description: e.target.value } : r
                      )
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ring focus:ring-2 focus:ring-ring focus:outline-none"
                />
              </div>
              <div className="w-full sm:w-32">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Costo / {UNIT_LABELS[unit]}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={row.cost}
                  aria-label="Costo de la mano de obra de la plantilla"
                  onChange={(e) =>
                    setLaborRows((rows) =>
                      rows.map((r) => (r.key === row.key ? { ...r, cost: e.target.value } : r))
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm text-right tabular-nums focus:border-ring focus:ring-2 focus:ring-ring focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => setLaborRows((rows) => rows.filter((r) => r.key !== row.key))}
                className="self-end p-2 text-gray-400 hover:text-red-600 rounded cursor-pointer shrink-0"
                title="Quitar mano de obra"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          {laborRows.length === 0 && (
            <p className="text-xs text-gray-400 italic">Sin mano de obra en la plantilla.</p>
          )}
        </div>
      </div>

      {/* ─── Totales ─── */}
      <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="text-gray-600">
            Materiales: <strong className="text-gray-900 tabular-nums">{fmt(totalMaterials)}</strong>
          </span>
          <span className="text-gray-600">
            M.O.: <strong className="text-gray-900 tabular-nums">{fmt(totalLabor)}</strong>
          </span>
        </div>
        <div className="text-sm">
          <span className="text-gray-600">Costo por {UNIT_LABELS[unit]}: </span>
          <strong className="text-blue-700 text-base tabular-nums">
            {fmt(totalMaterials + totalLabor)}
          </strong>
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Corregir la plantilla no cambia las partidas ya creadas con ella: al aplicarse, cada
        partida se queda con su propia copia de las líneas.
      </p>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={updateMut.isPending}
          onClick={() => void handleSave()}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 inline-flex items-center gap-2"
        >
          {updateMut.isPending && <Loader2 className="animate-spin" size={14} />}
          Guardar plantilla
        </button>
      </div>
    </div>
  );
}
