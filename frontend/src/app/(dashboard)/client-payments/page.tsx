"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Plus,
  Wallet,
  Pencil,
  Trash2,
  Search,
  Filter,
} from "lucide-react";
import { useProject } from "@/hooks/useProject";
import {
  useClientPayments,
  useClientPaymentSummary,
  useCreateClientPayment,
  useUpdateClientPayment,
  useDeleteClientPayment,
} from "@/hooks/useClientPayments";
import type { ClientPayment, ClientPaymentConcept, PaymentMethod } from "@/types";
import type { CreateClientPaymentPayload } from "@/lib/api/client-payments";
import Modal from "@/components/ui/Modal";

const CONCEPT_LABELS: Record<ClientPaymentConcept, string> = {
  ADVANCE: "Anticipo",
  PROGRESS: "Avance",
  FINAL: "Final",
  RETENTION_RELEASE: "Liberación retención",
  OTHER: "Otro",
};

const CONCEPT_COLORS: Record<ClientPaymentConcept, string> = {
  ADVANCE: "bg-purple-50 text-purple-700",
  PROGRESS: "bg-blue-50 text-blue-700",
  FINAL: "bg-green-50 text-green-700",
  RETENTION_RELEASE: "bg-orange-50 text-orange-700",
  OTHER: "bg-gray-100 text-gray-700",
};

const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Efectivo",
  BANK_TRANSFER: "Transferencia",
  CHECK: "Cheque",
  OTHER: "Otro",
};

function fmt(n: number): string {
  return "$" + n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface PaymentForm {
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod | "";
  concept: ClientPaymentConcept;
  reference: string;
  notes: string;
}

const EMPTY_FORM: PaymentForm = {
  amount: 0,
  paymentDate: new Date().toISOString().slice(0, 10),
  paymentMethod: "",
  concept: "PROGRESS",
  reference: "",
  notes: "",
};

export default function ClientPaymentsPage() {
  const { projectId } = useProject();

  const [search, setSearch] = useState("");
  const [filterConcept, setFilterConcept] = useState<ClientPaymentConcept | "">("");

  const { data: payments, isLoading } = useClientPayments(projectId ?? undefined);
  const { data: summary } = useClientPaymentSummary(projectId ?? undefined);
  const createMut = useCreateClientPayment(projectId ?? undefined);
  const updateMut = useUpdateClientPayment(projectId ?? undefined);
  const deleteMut = useDeleteClientPayment(projectId ?? undefined);

  const [formOpen, setFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<ClientPayment | null>(null);
  const [form, setForm] = useState<PaymentForm>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<ClientPayment | null>(null);

  const openCreate = useCallback(() => {
    setEditingPayment(null);
    setForm({ ...EMPTY_FORM, paymentDate: new Date().toISOString().slice(0, 10) });
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((p: ClientPayment) => {
    setEditingPayment(p);
    setForm({
      amount: p.amount,
      paymentDate: p.paymentDate ? p.paymentDate.slice(0, 10) : "",
      paymentMethod: p.paymentMethod ?? "",
      concept: p.concept,
      reference: p.reference ?? "",
      notes: p.notes ?? "",
    });
    setFormOpen(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (form.amount <= 0) return;
    const payload: CreateClientPaymentPayload = {
      amount: form.amount,
      paymentDate: form.paymentDate
        ? new Date(form.paymentDate + "T12:00:00").toISOString()
        : new Date().toISOString(),
      paymentMethod: (form.paymentMethod as PaymentMethod) || null,
      concept: form.concept,
      reference: form.reference.trim() || null,
      notes: form.notes.trim() || null,
    };
    if (editingPayment) {
      await updateMut.mutateAsync({ id: editingPayment.id, payload });
    } else {
      await createMut.mutateAsync(payload);
    }
    setFormOpen(false);
  }, [form, editingPayment, createMut, updateMut]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await deleteMut.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }, [deleteTarget, deleteMut]);

  const filtered = useMemo(() => {
    if (!payments) return [];
    let list = payments;
    if (filterConcept) list = list.filter((p) => p.concept === filterConcept);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          (p.reference && p.reference.toLowerCase().includes(q)) ||
          (p.notes && p.notes.toLowerCase().includes(q))
      );
    }
    return list;
  }, [payments, filterConcept, search]);

  const isSaving = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cobros del Cliente</h1>
          <p className="text-sm text-gray-500 mt-1">
            Registro de ingresos: anticipos, avances y pagos finales del proyecto
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          disabled={!projectId}
          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition-colors shadow-sm shrink-0 disabled:opacity-50"
        >
          <Plus size={18} />
          Nuevo cobro
        </button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Total Presupuestado</p>
            <p className="text-lg font-bold text-gray-900">{fmt(summary.totalBudgeted)}</p>
          </div>
          <div className="bg-white rounded-xl border border-green-200 p-4">
            <p className="text-xs text-green-600 mb-1">Total Cobrado</p>
            <p className="text-lg font-bold text-green-700">{fmt(summary.totalCollected)}</p>
            <p className="text-xs text-gray-400">{summary.count} cobros</p>
          </div>
          <div className="bg-white rounded-xl border border-orange-200 p-4">
            <p className="text-xs text-orange-600 mb-1">Saldo Pendiente</p>
            <p className="text-lg font-bold text-orange-700">{fmt(summary.pendingBalance)}</p>
            {summary.totalBudgeted > 0 && (
              <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{
                    width: `${Math.min((summary.totalCollected / summary.totalBudgeted) * 100, 100)}%`,
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
        <div className="flex flex-col gap-1 w-full sm:w-auto sm:min-w-[180px]">
          <label className="text-xs font-medium text-gray-500">Concepto</label>
          <div className="relative">
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={filterConcept}
              onChange={(e) => setFilterConcept(e.target.value as ClientPaymentConcept | "")}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            >
              <option value="">Todos los conceptos</option>
              {(Object.keys(CONCEPT_LABELS) as ClientPaymentConcept[]).map((c) => (
                <option key={c} value={c}>{CONCEPT_LABELS[c]}</option>
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
              placeholder="Referencia o notas..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {isLoading || !projectId ? (
          <div className="divide-y divide-gray-100">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="h-4 w-48 rounded bg-gray-200 animate-pulse" />
                <div className="h-4 w-24 rounded bg-gray-100 animate-pulse" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="rounded-full bg-gray-100 p-4 mb-4">
              <Wallet size={32} className="text-gray-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Sin cobros</h3>
            <p className="text-sm text-gray-500 mb-4 max-w-sm">
              {search || filterConcept
                ? "No hay resultados con los filtros actuales."
                : "Registrá los cobros del cliente: anticipos, avances y pagos finales."}
            </p>
            {!search && !filterConcept && (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                <Plus size={16} />
                Nuevo cobro
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Concepto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Método</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referencia</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notas</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Acc.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {fmtDate(p.paymentDate)}
                    </td>
                    <td className="px-4 py-3 text-sm text-green-700 font-semibold tabular-nums text-right whitespace-nowrap">
                      {fmt(p.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${CONCEPT_COLORS[p.concept]}`}>
                        {CONCEPT_LABELS[p.concept]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {p.paymentMethod ? METHOD_LABELS[p.paymentMethod] : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {p.reference || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate">
                      {p.notes || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          title="Editar"
                          onClick={() => openEdit(p)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          title="Eliminar"
                          onClick={() => setDeleteTarget(p)}
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
        title={editingPayment ? "Editar cobro" : "Nuevo cobro"}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.amount || ""}
                onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
              <input
                type="date"
                value={form.paymentDate}
                onChange={(e) => setForm((f) => ({ ...f, paymentDate: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Concepto</label>
              <select
                value={form.concept}
                onChange={(e) => setForm((f) => ({ ...f, concept: e.target.value as ClientPaymentConcept }))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                {(Object.keys(CONCEPT_LABELS) as ClientPaymentConcept[]).map((c) => (
                  <option key={c} value={c}>{CONCEPT_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
              <select
                value={form.paymentMethod}
                onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value as PaymentMethod | "" }))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Sin especificar</option>
                {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map((m) => (
                  <option key={m} value={m}>{METHOD_LABELS[m]}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Referencia</label>
            <input
              type="text"
              value={form.reference}
              onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Ej. Transferencia #12345"
            />
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
              disabled={form.amount <= 0 || isSaving}
              onClick={() => void handleSubmit()}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {isSaving ? "Guardando..." : editingPayment ? "Guardar cambios" : "Registrar cobro"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar cobro"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              ¿Eliminar el cobro de <strong className="text-green-700">{fmt(deleteTarget.amount)}</strong>{" "}
              del {fmtDate(deleteTarget.paymentDate)}?
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
