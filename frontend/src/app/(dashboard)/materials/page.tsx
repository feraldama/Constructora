"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Plus,
  Package,
  Pencil,
  Trash2,
  Search,
  Filter,
} from "lucide-react";
import {
  useMaterials,
  useCreateMaterial,
  useUpdateMaterial,
  useDeleteMaterial,
} from "@/hooks/useMaterials";
import type { Material, MaterialCategory, MeasurementUnit } from "@/types";
import type { CreateMaterialPayload } from "@/lib/api/materials";
import Modal from "@/components/ui/Modal";

const CATEGORY_LABELS: Record<MaterialCategory, string> = {
  CEMENT: "Cemento",
  STEEL: "Acero",
  WOOD: "Madera",
  AGGREGATES: "Áridos",
  CERAMICS: "Cerámicos",
  PLUMBING: "Plomería",
  ELECTRICAL: "Electricidad",
  PAINT: "Pintura",
  WATERPROOFING: "Impermeabilización",
  HARDWARE: "Ferretería",
  OTHER: "Otros",
};

const CATEGORY_COLORS: Record<MaterialCategory, string> = {
  CEMENT: "bg-gray-100 text-gray-700",
  STEEL: "bg-blue-50 text-blue-700",
  WOOD: "bg-amber-50 text-amber-700",
  AGGREGATES: "bg-yellow-50 text-yellow-700",
  CERAMICS: "bg-rose-50 text-rose-700",
  PLUMBING: "bg-cyan-50 text-cyan-700",
  ELECTRICAL: "bg-orange-50 text-orange-700",
  PAINT: "bg-purple-50 text-purple-700",
  WATERPROOFING: "bg-teal-50 text-teal-700",
  HARDWARE: "bg-slate-100 text-slate-700",
  OTHER: "bg-gray-100 text-gray-600",
};

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

interface MaterialForm {
  name: string;
  unit: MeasurementUnit;
  unitPrice: number;
  presentationQty: number;
  category: MaterialCategory;
  brand: string;
  supplier: string;
  notes: string;
}

const EMPTY_FORM: MaterialForm = {
  name: "",
  unit: "UNIT",
  unitPrice: 0,
  presentationQty: 1,
  category: "OTHER",
  brand: "",
  supplier: "",
  notes: "",
};

export default function MaterialsPage() {
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<MaterialCategory | "">("");

  const queryParams = useMemo(() => {
    const p: any = { isActive: true };
    if (search.trim()) p.search = search.trim();
    if (filterCategory) p.category = filterCategory;
    return p;
  }, [search, filterCategory]);

  const { data: materials, isLoading } = useMaterials(queryParams);
  const createMut = useCreateMaterial();
  const updateMut = useUpdateMaterial();
  const deleteMut = useDeleteMaterial();

  // Modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [form, setForm] = useState<MaterialForm>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Material | null>(null);

  const openCreate = useCallback(() => {
    setEditingMaterial(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((mat: Material) => {
    setEditingMaterial(mat);
    setForm({
      name: mat.name,
      unit: mat.unit,
      unitPrice: mat.unitPrice,
      presentationQty: mat.presentationQty,
      category: mat.category,
      brand: mat.brand ?? "",
      supplier: mat.supplier ?? "",
      notes: mat.notes ?? "",
    });
    setFormOpen(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!form.name.trim()) return;
    const payload: CreateMaterialPayload = {
      name: form.name.trim(),
      unit: form.unit,
      unitPrice: form.unitPrice,
      presentationQty: form.presentationQty,
      category: form.category,
      brand: form.brand.trim() || null,
      supplier: form.supplier.trim() || null,
      notes: form.notes.trim() || null,
    };
    if (editingMaterial) {
      await updateMut.mutateAsync({ id: editingMaterial.id, payload });
    } else {
      await createMut.mutateAsync(payload);
    }
    setFormOpen(false);
  }, [form, editingMaterial, createMut, updateMut]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await deleteMut.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }, [deleteTarget, deleteMut]);

  // Summary
  const summary = useMemo(() => {
    if (!materials) return { total: 0, byCategory: {} as Record<string, number> };
    const byCategory: Record<string, number> = {};
    for (const m of materials) {
      byCategory[m.category] = (byCategory[m.category] ?? 0) + 1;
    }
    return { total: materials.length, byCategory };
  }, [materials]);

  const isSaving = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catálogo de Materiales</h1>
          <p className="text-sm text-gray-500 mt-1">
            Base de datos de materiales con precios unitarios para análisis de costos
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm shrink-0"
        >
          <Plus size={18} />
          Nuevo material
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
        <div className="flex flex-col gap-1 w-full sm:w-auto sm:min-w-[180px]">
          <label className="text-xs font-medium text-gray-500">Categoría</label>
          <div className="relative">
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as MaterialCategory | "")}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            >
              <option value="">Todas las categorías</option>
              {(Object.keys(CATEGORY_LABELS) as MaterialCategory[]).map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1 w-full sm:w-auto sm:min-w-[220px]">
          <label className="text-xs font-medium text-gray-500">Buscar</label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nombre del material..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Summary cards */}
      {materials && materials.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4 col-span-2 sm:col-span-3 lg:col-span-1">
            <p className="text-xs text-gray-500 mb-1">Total materiales</p>
            <p className="text-lg font-bold text-gray-900">{summary.total}</p>
          </div>
          {(Object.keys(CATEGORY_LABELS) as MaterialCategory[])
            .filter((c) => summary.byCategory[c])
            .map((c) => (
              <div key={c} className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500 mb-1">{CATEGORY_LABELS[c]}</p>
                <p className="text-sm font-semibold text-gray-900">{summary.byCategory[c]}</p>
              </div>
            ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="divide-y divide-gray-100">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="h-4 w-48 rounded bg-gray-200 animate-pulse" />
                <div className="h-4 w-24 rounded bg-gray-100 animate-pulse" />
              </div>
            ))}
          </div>
        ) : !materials || materials.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="rounded-full bg-gray-100 p-4 mb-4">
              <Package size={32} className="text-gray-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Sin materiales</h3>
            <p className="text-sm text-gray-500 mb-4 max-w-sm">
              {search || filterCategory
                ? "No hay resultados con los filtros actuales."
                : "Creá tu catálogo de materiales para usarlos en el análisis de precios."}
            </p>
            {!search && !filterCategory && (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus size={16} />
                Nuevo material
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unidad</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Presentación</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Precio envase</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Precio/unit.</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marca</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proveedor</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Acc.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {materials.map((mat) => (
                  <tr key={mat.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                      {mat.name}
                      {mat.notes && (
                        <span className="block text-xs text-gray-400 font-normal truncate max-w-[200px]">{mat.notes}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_COLORS[mat.category]}`}>
                        {CATEGORY_LABELS[mat.category]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {UNIT_LABELS[mat.unit]}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 tabular-nums text-right whitespace-nowrap">
                      {mat.presentationQty > 1
                        ? `${mat.presentationQty} ${UNIT_LABELS[mat.unit]}`
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 tabular-nums text-right whitespace-nowrap">
                      {fmt(mat.unitPrice)}
                    </td>
                    <td className="px-4 py-3 text-sm text-blue-700 font-semibold tabular-nums text-right whitespace-nowrap">
                      {mat.presentationQty > 1
                        ? fmt(mat.unitPrice / mat.presentationQty)
                        : fmt(mat.unitPrice)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {mat.brand || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {mat.supplier || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          title="Editar"
                          onClick={() => openEdit(mat)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          title="Eliminar"
                          onClick={() => setDeleteTarget(mat)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit modal */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingMaterial ? "Editar material" : "Nuevo material"}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Ej. Cemento Portland"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unidad base *</label>
              <select
                value={form.unit}
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value as MeasurementUnit }))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                {(Object.keys(UNIT_LABELS) as MeasurementUnit[]).map((u) => (
                  <option key={u} value={u}>{UNIT_LABELS[u]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as MaterialCategory }))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                {(Object.keys(CATEGORY_LABELS) as MaterialCategory[]).map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Presentación ({UNIT_LABELS[form.unit]} por envase) *</label>
              <input
                type="number"
                step="any"
                min="0.0001"
                value={form.presentationQty || ""}
                onChange={(e) => setForm((f) => ({ ...f, presentationQty: Number(e.target.value) }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Ej. 50 (bolsa de 50 kg)"
              />
              <p className="text-xs text-gray-400 mt-1">
                Cuántas {UNIT_LABELS[form.unit]} vienen en el envase de compra (1 si se compra suelto)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio por envase *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.unitPrice || ""}
                onChange={(e) => setForm((f) => ({ ...f, unitPrice: Number(e.target.value) }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="0.00"
              />
              {form.presentationQty > 1 && form.unitPrice > 0 && (
                <p className="text-xs text-blue-600 mt-1">
                  = {fmt(form.unitPrice / form.presentationQty)} por {UNIT_LABELS[form.unit]}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
              <input
                type="text"
                value={form.brand}
                onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Ej. Loma Negra"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
              <input
                type="text"
                value={form.supplier}
                onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Ej. Corralón El Obrero"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Observaciones adicionales..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!form.name.trim() || isSaving}
              onClick={() => void handleSubmit()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? "Guardando..." : editingMaterial ? "Guardar cambios" : "Crear material"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar material"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              ¿Eliminar el material <strong className="text-gray-900">{deleteTarget.name}</strong>?
              Si está en uso en algún análisis de precios, se desactivará en su lugar.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleteMut.isPending}
                onClick={() => void handleDelete()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMut.isPending ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
