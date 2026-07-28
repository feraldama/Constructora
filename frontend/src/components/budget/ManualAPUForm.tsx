"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Trash2,
  Package,
  Wrench,
  Loader2,
  Info,
  RotateCcw,
  ClipboardPaste,
} from "lucide-react";
import Combobox from "@/components/ui/Combobox";
import { useCreateManualAPU } from "@/hooks/useAPUTemplates";
import { useMaterials } from "@/hooks/useMaterials";
import { parseDecimal, formatDecimal, formatMoney as fmt } from "@/lib/utils/number";
import { normalizeName } from "@/lib/utils/text";
import { parsePastedMaterials, type PasteDestination } from "@/lib/utils/pasteMaterials";
import type {
  ManualAPUMaterialPayload,
  ManualAPULaborPayload,
} from "@/lib/api/apu-templates";
import type { Material, MaterialCategory, MeasurementUnit } from "@/types";

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

const MATERIAL_CATEGORY_LABELS: Record<MaterialCategory, string> = {
  CEMENT: "Cemento",
  STEEL: "Hierro / Acero",
  WOOD: "Madera",
  AGGREGATES: "Áridos",
  CERAMICS: "Cerámicos",
  PLUMBING: "Sanitarios",
  ELECTRICAL: "Electricidad",
  PAINT: "Pinturas",
  WATERPROOFING: "Impermeabilizantes",
  HARDWARE: "Ferretería",
  OTHER: "Otros",
};

const MATERIAL_CATEGORIES = Object.keys(MATERIAL_CATEGORY_LABELS) as MaterialCategory[];

function apiError(e: unknown, fallback: string): string {
  const err = e as {
    response?: { data?: { error?: string; details?: Record<string, string[] | undefined> } };
  };
  const details = err.response?.data?.details;
  const firstDetail = details
    ? Object.values(details)
        .flat()
        .find((m): m is string => !!m)
    : undefined;
  return firstDetail ?? err.response?.data?.error ?? fallback;
}

/** Fila de material: material del catálogo o alta rápida de uno nuevo. */
interface MaterialRow {
  key: string;
  /** null cuando el nombre tipeado no existe en el catálogo (se creará) */
  materialId: string | null;
  query: string;
  /**
   * true cuando el usuario ya terminó de decidir el nombre (salió del campo o
   * quiso guardar). Recién entonces se muestra el alta rápida, para que el
   * bloque no aparezca y desaparezca con cada tecla mientras busca.
   */
  nameSettled: boolean;
  consumption: string;
  waste: string;
  // Campos de alta rápida (solo si materialId === null)
  newUnit: MeasurementUnit;
  newPrice: string;
  newPresentationQty: string;
  newCategory: MaterialCategory;
}

interface LaborRow {
  key: string;
  description: string;
  cost: string;
}

interface Props {
  /** Crear una partida nueva en esta categoría */
  categoryId?: string;
  /** …o cargar la composición sobre una partida existente */
  budgetItemId?: string;
  /** Datos de la partida destino cuando se carga sobre una existente */
  existingItem?: { name: string; unit: MeasurementUnit };
  /** Nombre del rubro destino — precarga el rubro al guardar como plantilla */
  categoryName?: string;
  /** Rubros del catálogo APU para el combobox de plantilla */
  rubroOptions?: string[];
  /** Avisa si hay datos cargados, para confirmar antes de descartarlos */
  onDirtyChange?: (dirty: boolean) => void;
  onCancel: () => void;
  onSaved?: (budgetItemId: string) => void;
}

/**
 * Carga manual de un subrubro: nombre, unidad, cantidad, materiales (con
 * consumo y desperdicio) y mano de obra, con totales en vivo. Permite crear
 * materiales que todavía no están en el catálogo y guardar la composición
 * como plantilla APU reutilizable.
 */
export default function ManualAPUForm({
  categoryId,
  budgetItemId,
  existingItem,
  categoryName,
  rubroOptions = [],
  onDirtyChange,
  onCancel,
  onSaved,
}: Props) {
  const keySeq = useRef(0);
  const nextKey = () => `row-${++keySeq.current}`;

  // Catálogo completo (incluye desactivados): los inactivos no se ofrecen en
  // la lista, pero si el usuario tipea su nombre se reusa ese material en vez
  // de crear un duplicado — misma resolución que hace el backend al guardar.
  const { data: materials } = useMaterials();
  const createManual = useCreateManualAPU();

  const [name, setName] = useState(existingItem?.name ?? "");
  const [unit, setUnit] = useState<MeasurementUnit>(existingItem?.unit ?? "M2");
  const [quantity, setQuantity] = useState("");
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [rubro, setRubro] = useState(categoryName ?? "");
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Fila cuyo campo de insumo recibe el foco al crearse (Enter / pegado) */
  const [autoFocusKey, setAutoFocusKey] = useState<string | null>(null);
  // Pegado masivo desde una planilla
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const [materialRows, setMaterialRows] = useState<MaterialRow[]>([
    {
      key: "row-0",
      materialId: null,
      query: "",
      nameSettled: false,
      consumption: "",
      waste: "",
      newUnit: "UNIT",
      newPrice: "",
      newPresentationQty: "1",
      newCategory: "OTHER",
    },
  ]);
  const [laborRows, setLaborRows] = useState<LaborRow[]>([]);

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

  // Sólo se sugieren los activos; los desactivados se resuelven si se tipean
  const materialNames = useMemo(
    () => (materials ?? []).filter((m) => m.isActive).map((m) => m.name),
    [materials]
  );

  const catalogUnitCost = (m: Material) => m.unitPrice / (m.presentationQty || 1);

  /** Costo por unidad del insumo de la fila (catálogo o alta rápida) */
  const rowUnitCost = useCallback(
    (row: MaterialRow): number => {
      if (row.materialId) {
        const m = byId.get(row.materialId);
        return m ? catalogUnitCost(m) : 0;
      }
      const price = parseDecimal(row.newPrice);
      const pres = parseDecimal(row.newPresentationQty);
      if (Number.isNaN(price)) return 0;
      return price / (pres > 0 ? pres : 1);
    },
    [byId]
  );

  const rowSubtotal = useCallback(
    (row: MaterialRow): number => {
      const cons = parseDecimal(row.consumption);
      const waste = parseDecimal(row.waste);
      if (Number.isNaN(cons) || cons <= 0) return 0;
      return cons * (1 + (Number.isNaN(waste) ? 0 : waste) / 100) * rowUnitCost(row);
    },
    [rowUnitCost]
  );

  // Filas con contenido: sirven para los totales, la validación y el aviso de
  // "hay datos sin guardar" que usa el modal para confirmar antes de cerrar.
  const filledMaterials = materialRows.filter((r) => r.query.trim().length > 0);
  const filledLabor = laborRows.filter((r) => r.description.trim().length > 0);
  const dirty =
    filledMaterials.length > 0 ||
    filledLabor.length > 0 ||
    quantity.trim().length > 0 ||
    (!budgetItemId && name.trim().length > 0);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const totalMaterials = materialRows.reduce((s, r) => s + rowSubtotal(r), 0);
  const totalLabor = laborRows.reduce((s, r) => {
    const c = parseDecimal(r.cost);
    return s + (Number.isNaN(c) ? 0 : c);
  }, 0);
  const totalUnitCost = totalMaterials + totalLabor;
  const qty = parseDecimal(quantity);
  const totalCost = (Number.isNaN(qty) ? 0 : qty) * totalUnitCost;

  const patchMaterial = (key: string, patch: Partial<MaterialRow>) =>
    setMaterialRows((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const emptyMaterialRow = (key: string): MaterialRow => ({
    key,
    materialId: null,
    query: "",
    nameSettled: false,
    consumption: "",
    waste: "",
    newUnit: "UNIT",
    newPrice: "",
    newPresentationQty: "1",
    newCategory: "OTHER",
  });

  /** Agrega una fila vacía y le deja el foco (para cargar de corrido con Enter). */
  const addMaterialRow = () => {
    const key = nextKey();
    setMaterialRows((rows) => [...rows, emptyMaterialRow(key)]);
    setAutoFocusKey(key);
  };

  const addLaborRow = () => {
    const key = nextKey();
    setLaborRows((rows) => [...rows, { key, description: "", cost: "" }]);
    setAutoFocusKey(key);
  };

  /**
   * Vuelca las filas pegadas de una planilla en el formulario: enlaza con el
   * catálogo lo que coincide y deja el resto listo como alta rápida.
   */
  const parsedPaste = useMemo(
    () => parsePastedMaterials(pasteText, (normalized) => byName.get(normalized)),
    [pasteText, byName]
  );

  /**
   * Destino elegido por fila pegada (índice → destino). Arranca con la
   * sugerencia del parser y con "ignorar" en lo que ya está en el formulario.
   */
  const [pasteDestinations, setPasteDestinations] = useState<Record<number, PasteDestination>>({});

  const nombresCargados = useMemo(
    () => new Set(filledMaterials.map((r) => normalizeName(r.query))),
    [filledMaterials]
  );

  // Al cambiar el texto pegado se recalculan los destinos sugeridos
  useEffect(() => {
    setPasteDestinations(
      Object.fromEntries(
        parsedPaste.lines.map((line, idx) => [
          idx,
          line.destination === "material" && nombresCargados.has(normalizeName(line.name))
            ? "skip"
            : line.destination,
        ])
      )
    );
    // nombresCargados se recalcula en cada render: sólo interesa al cambiar el texto
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pasteText, parsedPaste.lines.length]);

  const destinationOf = (idx: number): PasteDestination =>
    pasteDestinations[idx] ?? parsedPaste.lines[idx]?.destination ?? "material";

  const pasteCounts = useMemo(() => {
    let materiales = 0;
    let mo = 0;
    let ignoradas = 0;
    parsedPaste.lines.forEach((_, idx) => {
      const d = destinationOf(idx);
      if (d === "material") materiales++;
      else if (d === "labor") mo++;
      else ignoradas++;
    });
    return { materiales, mo, ignoradas };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedPaste.lines, pasteDestinations]);

  /** Enter en los campos numéricos de una fila agrega la siguiente. */
  const handleRowEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    addMaterialRow();
  };

  /**
   * true si el texto tipeado se interpretó con punto de miles (ej. "1.500" →
   * 1500). Se avisa en la fila para que nadie confunda miles con decimales.
   */
  const readAsThousands = (raw: string): boolean => {
    if (!/^\s*-?\d{1,3}\.\d{3}\s*$/.test(raw)) return false;
    return parseDecimal(raw) !== Number(raw.replace(",", "."));
  };

  const applyPaste = () => {
    const nuevosMateriales: MaterialRow[] = [];
    const nuevaMO: LaborRow[] = [];

    parsedPaste.lines.forEach((line, idx) => {
      const destino = destinationOf(idx);
      if (destino === "skip") return;

      if (destino === "labor") {
        // En las planillas el costo de MO viene en la columna de precio o, si no
        // está, en la de consumo (suele ser la única con número en esa fila).
        const costo = line.unitPrice ?? line.consumption;
        nuevaMO.push({
          key: nextKey(),
          description: line.name,
          cost: costo === null ? "" : formatDecimal(costo, 2),
        });
        return;
      }

      const material = line.materialId ? byId.get(line.materialId) : undefined;
      nuevosMateriales.push({
        ...emptyMaterialRow(nextKey()),
        materialId: line.materialId,
        // Se guarda el nombre del catálogo cuando hay coincidencia, para que el
        // buscador lo muestre tal como está cargado
        query: material?.name ?? line.name,
        // Los materiales nuevos entran con el alta rápida ya visible
        nameSettled: !line.materialId,
        consumption: line.consumption === null ? "" : formatDecimal(line.consumption),
        waste: line.wastePercent === null ? "" : formatDecimal(line.wastePercent),
        newUnit: material?.unit ?? "UNIT",
        newPrice: line.unitPrice === null ? "" : formatDecimal(line.unitPrice, 2),
      });
    });

    if (nuevosMateriales.length === 0 && nuevaMO.length === 0) return;

    // Las filas vacías se descartan; lo ya cargado se conserva
    if (nuevosMateriales.length > 0) {
      setMaterialRows((rows) => [
        ...rows.filter((r) => r.query.trim().length > 0),
        ...nuevosMateriales,
      ]);
    }
    if (nuevaMO.length > 0) {
      setLaborRows((rows) => [...rows.filter((r) => r.description.trim().length > 0), ...nuevaMO]);
    }
    setPasteText("");
    setPasteOpen(false);
  };

  const handleSubmit = useCallback(async () => {
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Ingresá el nombre del subrubro");
      return;
    }

    // Filas con datos suficientes para formar una línea del APU
    const usableMaterials = filledMaterials;
    const usableLabor = filledLabor;

    if (usableMaterials.length === 0 && usableLabor.length === 0) {
      setError("Agregá al menos un material o una línea de mano de obra");
      return;
    }

    // Al intentar guardar, los nombres quedan decididos: si alguna fila necesita
    // el alta rápida, su bloque tiene que estar visible para poder completarlo.
    setMaterialRows((rows) =>
      rows.map((r) => (r.query.trim().length > 0 ? { ...r, nameSettled: true } : r))
    );

    for (const row of usableMaterials) {
      const label = row.query.trim();
      const cons = parseDecimal(row.consumption);
      if (Number.isNaN(cons) || cons <= 0) {
        setError(`Ingresá el consumo de «${label}» (mayor a 0)`);
        return;
      }
      const waste = parseDecimal(row.waste);
      if (!Number.isNaN(waste) && (waste < 0 || waste > 100)) {
        setError(`El desperdicio de «${label}» debe estar entre 0 y 100%`);
        return;
      }
      if (!row.materialId) {
        const price = parseDecimal(row.newPrice);
        if (Number.isNaN(price) || price < 0) {
          setError(`Ingresá el precio del material nuevo «${label}»`);
          return;
        }
        const pres = parseDecimal(row.newPresentationQty);
        if (!Number.isNaN(pres) && pres <= 0) {
          setError(`La cantidad por envase de «${label}» debe ser mayor a 0`);
          return;
        }
      }
    }

    // Materiales repetidos: el backend los rechaza, avisamos antes. Se compara
    // normalizado (sin acentos ni mayúsculas), igual que resuelve el backend.
    const usedKeys = usableMaterials.map((r) => r.materialId ?? normalizeName(r.query));
    if (new Set(usedKeys).size !== usedKeys.length) {
      setError("Hay materiales repetidos en la composición");
      return;
    }

    if (saveAsTemplate && !rubro.trim()) {
      setError("Indicá el rubro para guardar la composición como plantilla");
      return;
    }

    try {
      // Los materiales nuevos van inline: el backend los crea en la misma
      // transacción que la partida, así no quedan materiales sueltos si falla.
      const lines: ManualAPUMaterialPayload[] = usableMaterials.map((row) => {
        const waste = parseDecimal(row.waste);
        const pres = parseDecimal(row.newPresentationQty);
        return {
          materialId: row.materialId ?? undefined,
          newMaterial: row.materialId
            ? undefined
            : {
                name: row.query.trim(),
                unit: row.newUnit,
                unitPrice: parseDecimal(row.newPrice) || 0,
                presentationQty: !Number.isNaN(pres) && pres > 0 ? pres : 1,
                category: row.newCategory,
              },
          consumptionPerUnit: parseDecimal(row.consumption),
          wastePercent: Number.isNaN(waste) ? 0 : waste,
        };
      });

      const laborLines: ManualAPULaborPayload[] = usableLabor.map((r) => {
        const c = parseDecimal(r.cost);
        return {
          description: r.description.trim(),
          costPerUnit: Number.isNaN(c) ? 0 : c,
        };
      });

      const res = await createManual.mutateAsync({
        categoryId,
        budgetItemId,
        name: trimmedName,
        unit: budgetItemId ? undefined : unit,
        quantity: Number.isNaN(qty) ? 0 : qty,
        materials: lines,
        labor: laborLines,
        replaceExisting: budgetItemId ? replaceExisting : false,
        saveAsTemplate,
        rubro: saveAsTemplate ? rubro.trim() : undefined,
      });

      onSaved?.(res.budgetItemId);
    } catch (e) {
      setError(apiError(e, "No se pudo guardar el subrubro"));
    }
  }, [
    name,
    filledMaterials,
    filledLabor,
    saveAsTemplate,
    rubro,
    categoryId,
    budgetItemId,
    unit,
    qty,
    replaceExisting,
    createManual,
    onSaved,
  ]);

  const saving = createManual.isPending;

  return (
    <div className="space-y-4">
      {/* El scroll lo maneja el Modal: así no hay scroll anidado en mobile */}
      <div className="space-y-4">
        {/* ─── Datos del subrubro ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
          <div className="sm:col-span-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Nombre del subrubro
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!!budgetItemId}
              placeholder="Ej. Marco recto 0,70 p/ puerta"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Unidad</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as MeasurementUnit)}
              disabled={!!budgetItemId}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 disabled:bg-gray-50 disabled:text-gray-500"
            >
              {UNIT_OPTIONS.map((u) => (
                <option key={u} value={u}>
                  {UNIT_LABELS[u]}
                </option>
              ))}
            </select>
          </div>
          {!budgetItemId && (
            <div className="sm:col-span-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Cantidad</label>
              <input
                type="text"
                inputMode="decimal"
                aria-label="Cantidad de la partida"
                        value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm tabular-nums text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* ─── Materiales ─── */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h4 className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <Package size={15} className="text-gray-400" />
              Materiales
            </h4>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPasteOpen((o) => !o)}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                <ClipboardPaste size={14} />
                Pegar desde Excel
              </button>
              <button
                type="button"
                onClick={addMaterialRow}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                <Plus size={14} />
                Agregar material
              </button>
            </div>
          </div>

          {/* ─── Pegado masivo desde una planilla ─── */}
          {pasteOpen && (
            <div className="mb-2 rounded-lg border border-blue-200 bg-blue-50/60 p-3 space-y-2">
              <p className="text-[11px] text-blue-900">
                Copiá las filas del Excel y pegalas acá — se puede incluir la mano de obra: cada fila lleva su destino y se puede cambiar. Una fila por línea, columnas
                separadas por tabulación:{" "}
                <strong>Insumo</strong> · <strong>Consumo</strong> · Desperdicio % (opcional)
                · Precio del envase (opcional, para materiales nuevos).
              </p>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={4}
                autoFocus
                aria-label="Filas copiadas de la planilla"
                placeholder={"Cemento Portland\t10\t5\nArena lavada\t0,25"}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />

              {parsedPaste.lines.length > 0 && (
                <div className="max-h-44 overflow-y-auto rounded-lg border border-blue-100 bg-white">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr className="text-gray-500">
                        <th className="text-left px-2 py-1.5">Fila</th>
                        <th className="text-left px-2 py-1.5">Cargar como</th>
                        <th className="text-left px-2 py-1.5">Origen</th>
                        <th className="text-right px-2 py-1.5">Consumo</th>
                        <th className="text-right px-2 py-1.5">Desp. %</th>
                        <th className="text-right px-2 py-1.5">Precio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {parsedPaste.lines.map((line, idx) => {
                        const destino = destinationOf(idx);
                        const yaCargado =
                          destino !== "labor" && nombresCargados.has(normalizeName(line.name));
                        return (
                          <tr key={`${line.name}-${idx}`} className={destino === "skip" ? "opacity-50" : ""}>
                            <td className="px-2 py-1 text-gray-900">
                              {line.name}
                              {yaCargado && (
                                <span className="ml-1 text-[10px] text-amber-700">(ya en la lista)</span>
                              )}
                            </td>
                            <td className="px-2 py-1">
                              <select
                                value={destino}
                                aria-label={`Destino de ${line.name}`}
                                onChange={(e) =>
                                  setPasteDestinations((prev) => ({
                                    ...prev,
                                    [idx]: e.target.value as PasteDestination,
                                  }))
                                }
                                className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs"
                              >
                                <option value="material">Material</option>
                                <option value="labor">Mano de obra</option>
                                <option value="skip">Ignorar</option>
                              </select>
                            </td>
                            <td className="px-2 py-1">
                              {destino === "labor" ? (
                                <span className="text-amber-700">mano de obra</span>
                              ) : line.materialId ? (
                                <span className="text-gray-500">catálogo</span>
                              ) : (
                                <span className="text-emerald-700">nuevo</span>
                              )}
                            </td>
                            <td className="px-2 py-1 text-right tabular-nums text-gray-700">
                              {line.consumption === null ? "—" : formatDecimal(line.consumption)}
                            </td>
                            <td className="px-2 py-1 text-right tabular-nums text-gray-700">
                              {line.wastePercent === null ? "—" : formatDecimal(line.wastePercent)}
                            </td>
                            <td className="px-2 py-1 text-right tabular-nums text-gray-700">
                              {line.unitPrice === null ? "—" : fmt(line.unitPrice)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span className="text-[11px] text-blue-900">
                  {parsedPaste.lines.length === 0
                    ? "Todavía no se reconocieron filas."
                    : `${parsedPaste.lines.length} fila${parsedPaste.lines.length === 1 ? "" : "s"} · ${pasteCounts.materiales} como material · ${pasteCounts.mo} como mano de obra${
                        pasteCounts.ignoradas > 0 ? ` · ${pasteCounts.ignoradas} ignorada(s)` : ""
                      }`}
                  {parsedPaste.headerSkipped && " · encabezado descartado"}
                  {parsedPaste.skipped > 0 && ` · ${parsedPaste.skipped} sin nombre`}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPasteOpen(false);
                      setPasteText("");
                    }}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={pasteCounts.materiales + pasteCounts.mo === 0}
                    onClick={applyPaste}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Agregar {pasteCounts.materiales + pasteCounts.mo || ""} fila
                    {pasteCounts.materiales + pasteCounts.mo === 1 ? "" : "s"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {materialRows.map((row) => {
              const isNew = !row.materialId && row.query.trim().length > 0 && row.nameSettled;
              const linked = row.materialId ? byId.get(row.materialId) : undefined;
              const unitCost = rowUnitCost(row);
              return (
                <div
                  key={row.key}
                  className="rounded-lg border border-gray-200 bg-gray-50/60 p-2.5 space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                    <div className="flex-1 min-w-0">
                      <label className="block text-[11px] font-medium text-gray-500 mb-1">
                        Insumo
                      </label>
                      <Combobox
                        value={row.query}
                        onChange={(v) => {
                          const found = byName.get(normalizeName(v));
                          patchMaterial(row.key, {
                            query: v,
                            materialId: found?.id ?? null,
                            // Mientras tipea, el alta rápida se mantiene oculta
                            nameSettled: false,
                            ...(found ? { newUnit: found.unit } : {}),
                          });
                        }}
                        onBlur={() => patchMaterial(row.key, { nameSettled: true })}
                        onPaste={(e) => {
                          // Varias filas copiadas de una planilla: en vez de
                          // meter todo en un campo, abrimos el pegado masivo.
                          const texto = e.clipboardData.getData("text");
                          if (/\t|\r?\n/.test(texto.trim())) {
                            e.preventDefault();
                            setPasteText(texto);
                            setPasteOpen(true);
                          }
                        }}
                        autoFocus={row.key === autoFocusKey}
                        options={materialNames}
                        placeholder="Buscar en el catálogo o escribir uno nuevo"
                        createLabel={(q) => `Crear material «${q}»`}
                      />
                    </div>
                    <div className="w-full sm:w-28">
                      <label className="block text-[11px] font-medium text-gray-500 mb-1">
                        Consumo / {UNIT_LABELS[unit]}
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        aria-label="Consumo por unidad"
                        value={row.consumption}
                        onChange={(e) => patchMaterial(row.key, { consumption: e.target.value })}
                        onKeyDown={handleRowEnter}
                        placeholder="Ej. 12,5"
                        className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm text-right tabular-nums focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="w-full sm:w-20">
                      <label className="block text-[11px] font-medium text-gray-500 mb-1">
                        Desp. %
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        aria-label="Porcentaje de desperdicio"
                        value={row.waste}
                        onChange={(e) => patchMaterial(row.key, { waste: e.target.value })}
                        onKeyDown={handleRowEnter}
                        placeholder="0"
                        className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm text-right tabular-nums focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="w-full sm:w-28 sm:text-right">
                      <span className="block text-[11px] font-medium text-gray-500 mb-1">
                        Subtotal
                      </span>
                      <span className="block px-2 py-2 text-sm font-medium text-gray-900 tabular-nums">
                        {fmt(rowSubtotal(row))}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setMaterialRows((rows) => rows.filter((r) => r.key !== row.key))
                      }
                      className="self-end p-2 text-gray-400 hover:text-red-600 rounded cursor-pointer shrink-0"
                      title="Quitar material"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {(readAsThousands(row.consumption) || readAsThousands(row.waste)) && (
                    <p className="text-[11px] text-amber-700">
                      Ojo: {readAsThousands(row.consumption) ? "el consumo" : "el desperdicio"} se
                      leyó como{" "}
                      <strong>
                        {formatDecimal(
                          parseDecimal(
                            readAsThousands(row.consumption) ? row.consumption : row.waste
                          )
                        )}
                      </strong>{" "}
                      (el punto separa miles). Para decimales usá coma: 1,5
                    </p>
                  )}

                  {linked && (
                    <p className="text-[11px] text-gray-500">
                      Catálogo · {fmt(unitCost)} por {UNIT_LABELS[linked.unit]}
                    </p>
                  )}

                  {linked && !linked.isActive && (
                    <p className="text-[11px] text-amber-700 flex items-start gap-1.5">
                      <RotateCcw size={13} className="mt-px shrink-0" />
                      «{linked.name}» está desactivado en el catálogo: se reutiliza y se
                      reactiva al guardar (no se crea un duplicado).
                    </p>
                  )}

                  {/* Alta rápida cuando el insumo no está en el catálogo */}
                  {isNew && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-2.5 space-y-2">
                      <p className="text-[11px] text-emerald-800 flex items-start gap-1.5">
                        <Info size={13} className="mt-px shrink-0" />
                        «{row.query.trim()}» no está en el catálogo: se va a crear con estos datos.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <div>
                          <label className="block text-[11px] font-medium text-gray-500 mb-1">
                            Unidad
                          </label>
                          <select
                            value={row.newUnit}
                            onChange={(e) =>
                              patchMaterial(row.key, {
                                newUnit: e.target.value as MeasurementUnit,
                              })
                            }
                            className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm"
                          >
                            {UNIT_OPTIONS.map((u) => (
                              <option key={u} value={u}>
                                {UNIT_LABELS[u]}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-gray-500 mb-1">
                            Precio del envase
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            aria-label="Precio del envase"
                        value={row.newPrice}
                            onChange={(e) => patchMaterial(row.key, { newPrice: e.target.value })}
                            placeholder="0,00"
                            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-right tabular-nums"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-gray-500 mb-1">
                            Cant. por envase
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            aria-label="Cantidad por envase"
                        value={row.newPresentationQty}
                            onChange={(e) =>
                              patchMaterial(row.key, { newPresentationQty: e.target.value })
                            }
                            placeholder="1"
                            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-right tabular-nums"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-gray-500 mb-1">
                            Categoría
                          </label>
                          <select
                            value={row.newCategory}
                            onChange={(e) =>
                              patchMaterial(row.key, {
                                newCategory: e.target.value as MaterialCategory,
                              })
                            }
                            className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm"
                          >
                            {MATERIAL_CATEGORIES.map((c) => (
                              <option key={c} value={c}>
                                {MATERIAL_CATEGORY_LABELS[c]}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <p className="text-[11px] text-emerald-800">
                        Precio unitario resultante: <strong>{fmt(unitCost)}</strong> por{" "}
                        {UNIT_LABELS[row.newUnit]}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
            {materialRows.length === 0 && (
              <p className="text-xs text-gray-400 italic">
                Sin materiales. Podés cargar solo mano de obra si el subrubro no lleva insumos.
              </p>
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
              onClick={addLaborRow}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
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
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">
                    Descripción
                  </label>
                  <input
                    type="text"
                    value={row.description}
                    onChange={(e) =>
                      setLaborRows((rows) =>
                        rows.map((r) =>
                          r.key === row.key ? { ...r, description: e.target.value } : r
                        )
                      )
                    }
                    autoFocus={row.key === autoFocusKey}
                    aria-label="Descripción de la mano de obra"
                    placeholder="Ej. Oficial carpintero"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div className="w-full sm:w-32">
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">
                    Costo / {UNIT_LABELS[unit]}
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={row.cost}
                    onChange={(e) =>
                      setLaborRows((rows) =>
                        rows.map((r) => (r.key === row.key ? { ...r, cost: e.target.value } : r))
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      addLaborRow();
                    }}
                    aria-label="Costo de la mano de obra por unidad"
                    placeholder="0,00"
                    className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm text-right tabular-nums focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
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
              <p className="text-xs text-gray-400 italic">Sin mano de obra cargada.</p>
            )}
          </div>
        </div>

        {/* ─── Guardar como plantilla ─── */}
        <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
          <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={saveAsTemplate}
              onChange={(e) => setSaveAsTemplate(e.target.checked)}
              className="mt-0.5 rounded border-gray-300 cursor-pointer"
            />
            <span>
              Guardar como plantilla reutilizable
              <span className="block text-xs text-gray-500">
                Queda disponible en &quot;Desde plantilla&quot; para otros proyectos.
              </span>
            </span>
          </label>
          {saveAsTemplate && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Rubro de la plantilla
              </label>
              <Combobox
                value={rubro}
                onChange={setRubro}
                options={rubroOptions}
                placeholder="Elegí un rubro del catálogo o escribí uno nuevo"
                createLabel={(q) => `Crear rubro «${q}»`}
              />
            </div>
          )}
        </div>

        {budgetItemId && (
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={replaceExisting}
              onChange={(e) => setReplaceExisting(e.target.checked)}
              className="rounded border-gray-300 cursor-pointer"
            />
            Reemplazar las líneas APU existentes de la partida
          </label>
        )}
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
        <div className="text-sm text-right">
          <div>
            <span className="text-gray-600">Costo unitario: </span>
            <strong className="text-blue-700 text-base tabular-nums">{fmt(totalUnitCost)}</strong>
            <span className="text-gray-500 text-xs ml-1">/ {UNIT_LABELS[unit]}</span>
          </div>
          {!budgetItemId && qty > 0 && (
            <div className="text-xs text-gray-600 mt-0.5">
              Costo total ({qty.toLocaleString("es-AR")} {UNIT_LABELS[unit]}):{" "}
              <strong className="text-gray-900 tabular-nums">{fmt(totalCost)}</strong>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
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
          disabled={saving}
          onClick={() => void handleSubmit()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2"
        >
          {saving && <Loader2 className="animate-spin" size={14} />}
          {budgetItemId ? "Cargar APU en la partida" : "Crear partida"}
        </button>
      </div>
    </div>
  );
}
