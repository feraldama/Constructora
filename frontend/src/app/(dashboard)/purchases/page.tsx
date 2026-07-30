"use client";

import { useMemo, useState } from "react";
import {
  Plus,
  ShoppingCart,
  Search,
  Trash2,
  Pencil,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  usePurchases,
  useCreatePurchase,
  useUpdatePurchase,
  useDeletePurchase,
} from "@/hooks/usePurchases";
import { useMaterials } from "@/hooks/useMaterials";
import { useProjects } from "@/hooks/useProjects";
import Modal from "@/components/ui/Modal";
import BankField, { paymentMethodRequiresBank } from "@/components/ui/BankField";
import type { MeasurementUnit, PaymentMethod, Purchase } from "@/types";

const UNIT_LABELS: Record<MeasurementUnit, string> = {
  M2: "m²",
  M3: "m³",
  ML: "ml",
  UNIT: "un",
  KG: "kg",
  TON: "ton",
  LITER: "lt",
  INCH: "pul",
  GLOBAL: "global",
};

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  CASH: "Efectivo",
  BANK_TRANSFER: "Transferencia",
  CHECK: "Cheque",
  OTHER: "Otro",
};

function fmt(n: number) {
  return "$" + n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

interface FormState {
  materialId: string;
  projectId: string;
  quantity: number;
  unitPrice: number;
  supplier: string;
  invoiceRef: string;
  purchaseDate: string;
  paymentMethod: PaymentMethod | "";
  bank: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  materialId: "",
  projectId: "",
  quantity: 0,
  unitPrice: 0,
  supplier: "",
  invoiceRef: "",
  purchaseDate: new Date().toISOString().slice(0, 10),
  paymentMethod: "",
  bank: "",
  notes: "",
};

export default function PurchasesPage() {
  const [search, setSearch] = useState("");
  const [filterMaterial, setFilterMaterial] = useState<string>("");
  const [filterProject, setFilterProject] = useState<string>("");

  const purchaseParams = useMemo(() => {
    const p: { materialId?: string; projectId?: string; limit?: number } = { limit: 100 };
    if (filterMaterial) p.materialId = filterMaterial;
    if (filterProject) p.projectId = filterProject;
    return p;
  }, [filterMaterial, filterProject]);

  const { data: purchasesRes, isLoading } = usePurchases(purchaseParams);
  const { data: materials } = useMaterials({ isActive: true });
  const { data: projectsRes } = useProjects({ page: 1, limit: 200 });

  const filteredPurchases = useMemo(() => {
    const arr = purchasesRes?.data ?? [];
    if (!search.trim()) return arr;
    const q = search.toLowerCase();
    return arr.filter(
      (p) =>
        p.material?.name.toLowerCase().includes(q) ||
        p.supplier?.toLowerCase().includes(q) ||
        p.invoiceRef?.toLowerCase().includes(q)
    );
  }, [purchasesRes, search]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Purchase | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Purchase | null>(null);
  const [lastAffected, setLastAffected] = useState<number | null>(null);

  const createMut = useCreatePurchase();
  const updateMut = useUpdatePurchase();
  const deleteMut = useDeletePurchase();

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError("");
    setLastAffected(null);
    setModalOpen(true);
  };

  const openEdit = (p: Purchase) => {
    setEditing(p);
    setForm({
      materialId: p.materialId,
      projectId: p.projectId ?? "",
      quantity: p.quantity,
      unitPrice: p.unitPrice,
      supplier: p.supplier ?? "",
      invoiceRef: p.invoiceRef ?? "",
      purchaseDate: p.purchaseDate.slice(0, 10),
      paymentMethod: p.paymentMethod ?? "",
      bank: p.bank ?? "",
      notes: p.notes ?? "",
    });
    setError("");
    setLastAffected(null);
    setModalOpen(true);
  };

  const submit = () => {
    setError("");
    if (!form.materialId) {
      setError("Seleccioná un material");
      return;
    }
    if (form.quantity <= 0) {
      setError("La cantidad debe ser mayor a 0");
      return;
    }
    if (form.unitPrice < 0) {
      setError("El precio no puede ser negativo");
      return;
    }
    if (paymentMethodRequiresBank(form.paymentMethod) && !form.bank.trim()) {
      setError("Indicá el banco para transferencias o cheques");
      return;
    }

    const payload = {
      materialId: form.materialId,
      projectId: form.projectId || null,
      quantity: Number(form.quantity),
      unitPrice: Number(form.unitPrice),
      supplier: form.supplier.trim() || null,
      invoiceRef: form.invoiceRef.trim() || null,
      purchaseDate: form.purchaseDate
        ? new Date(form.purchaseDate).toISOString()
        : undefined,
      paymentMethod: form.paymentMethod || null,
      bank: paymentMethodRequiresBank(form.paymentMethod) ? form.bank.trim() : null,
      notes: form.notes.trim() || null,
    };

    const onSuccess = (res: Purchase) => {
      if (typeof res.affectedBudgetItems === "number") {
        setLastAffected(res.affectedBudgetItems);
      }
      setModalOpen(false);
    };

    if (editing) {
      updateMut.mutate(
        { id: editing.id, payload },
        {
          onSuccess,
          onError: (e: unknown) => setError(extractError(e, "Error al actualizar")),
        }
      );
    } else {
      createMut.mutate(payload, {
        onSuccess,
        onError: (e: unknown) => setError(extractError(e, "Error al registrar la compra")),
      });
    }
  };

  const selectedMaterial = materials?.find((m) => m.id === form.materialId);
  const totalAmount = Number(form.quantity) * Number(form.unitPrice);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart size={24} className="text-blue-600" /> Compras
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Cada compra registra el precio pagado y actualiza el costo del material
            en todos los APU que lo usan.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover shadow-sm"
        >
          <Plus size={18} /> Nueva compra
        </button>
      </div>

      {lastAffected !== null && (
        <div className="rounded-lg bg-emerald-50 ring-1 ring-emerald-200 px-3 py-2 text-sm text-emerald-700">
          {lastAffected === 0
            ? "Compra registrada. Ninguna partida usaba este material."
            : `Compra registrada. Precio actualizado en ${lastAffected} partida${
                lastAffected === 1 ? "" : "s"
              } del cómputo métrico.`}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
        <div className="relative w-full sm:w-72">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar material / proveedor / factura"
            className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm text-gray-900 focus:border-ring focus:ring-2 focus:ring-ring focus:outline-none"
          />
        </div>
        <select
          value={filterMaterial}
          onChange={(e) => setFilterMaterial(e.target.value)}
          className="w-full sm:w-auto rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
        >
          <option value="">Todos los materiales</option>
          {materials?.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          className="w-full sm:w-auto rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
        >
          <option value="">Todos los proyectos</option>
          {projectsRes?.data.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Material</th>
                <th className="px-4 py-3 text-right">Cantidad</th>
                <th className="px-4 py-3 text-right">Precio unit.</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Proveedor</th>
                <th className="px-4 py-3">Proyecto</th>
                <th className="px-4 py-3">Factura</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500">
                    <Loader2 className="inline animate-spin mr-2" size={14} /> Cargando…
                  </td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500">
                    No hay compras registradas.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-sm text-gray-700 whitespace-nowrap">
                      {fmtDate(p.purchaseDate)}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-gray-900">
                      <div>{p.material?.name ?? "—"}</div>
                      {p.material && (
                        <div className="text-xs text-gray-400">
                          {UNIT_LABELS[p.material.unit]}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-right tabular-nums text-gray-700">
                      {p.quantity.toLocaleString("es-AR")}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-right tabular-nums text-gray-700">
                      {fmt(p.unitPrice)}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-right tabular-nums font-medium text-gray-900">
                      {fmt(p.totalAmount)}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-gray-700">
                      <div>{p.supplier || "—"}</div>
                      {p.bank && paymentMethodRequiresBank(p.paymentMethod) && (
                        <div className="text-xs text-gray-400">{p.bank}</div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-gray-700">
                      {p.project?.name || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-gray-700">
                      {p.invoiceRef || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => openEdit(p)}
                          className="touch-hit p-1.5 text-gray-400 hover:text-accent rounded hover:bg-accent-tint cursor-pointer"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(p)}
                          className="touch-hit p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal alta/edición */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar compra" : "Nueva compra"}
        className="max-w-2xl"
      >
        <div className="space-y-3">
          {error && (
            <div role="alert" className="flex items-center gap-2 rounded-lg bg-red-50 ring-1 ring-red-200 px-3 py-2 text-sm text-red-700">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Material *
            </label>
            <select
              value={form.materialId}
              onChange={(e) => setForm({ ...form, materialId: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            >
              <option value="">— seleccioná —</option>
              {materials?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({UNIT_LABELS[m.unit]}) · cat. {fmt(m.unitPrice)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cantidad *{" "}
                {selectedMaterial && (
                  <span className="text-xs font-normal text-gray-400">
                    ({UNIT_LABELS[selectedMaterial.unit]})
                  </span>
                )}
              </label>
              <input
                type="number"
                step="0.01"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio unitario *
              </label>
              <input
                type="number"
                step="0.01"
                value={form.unitPrice}
                onChange={(e) => setForm({ ...form, unitPrice: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total</label>
              <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700 tabular-nums">
                {fmt(totalAmount)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
              <input
                type="date"
                value={form.purchaseDate}
                onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
              <select
                value={form.paymentMethod}
                onChange={(e) => {
                  const m = e.target.value as PaymentMethod | "";
                  setForm({
                    ...form,
                    paymentMethod: m,
                    bank: paymentMethodRequiresBank(m) ? form.bank : "",
                  });
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              >
                <option value="">— sin definir —</option>
                {(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((m) => (
                  <option key={m} value={m}>
                    {PAYMENT_LABELS[m]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <BankField
            method={form.paymentMethod}
            value={form.bank}
            onChange={(v) => setForm({ ...form, bank: v })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
              <input
                type="text"
                value={form.supplier}
                onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                N° factura / referencia
              </label>
              <input
                type="text"
                value={form.invoiceRef}
                onChange={(e) => setForm({ ...form, invoiceRef: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Proyecto (opcional)
            </label>
            <select
              value={form.projectId}
              onChange={(e) => setForm({ ...form, projectId: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            >
              <option value="">— sin asociar —</option>
              {projectsRes?.data.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={createMut.isPending || updateMut.isPending}
              onClick={submit}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 inline-flex items-center gap-2"
            >
              {(createMut.isPending || updateMut.isPending) && (
                <Loader2 className="animate-spin" size={14} />
              )}
              {editing ? "Guardar cambios" : "Registrar compra"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar compra"
      >
        {deleteTarget && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              ¿Eliminar la compra de{" "}
              <strong className="text-gray-900">{deleteTarget.material?.name}</strong> del{" "}
              {fmtDate(deleteTarget.purchaseDate)}? Si era la compra más reciente del
              material, el precio del catálogo volverá al de la compra anterior.
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
                onClick={() =>
                  deleteMut.mutate(deleteTarget.id, {
                    onSuccess: () => setDeleteTarget(null),
                  })
                }
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMut.isPending ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function extractError(e: unknown, fallback: string): string {
  if (e && typeof e === "object" && "response" in e) {
    const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
    if (msg) return msg;
  }
  return fallback;
}
