"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Receipt,
  Pencil,
  Trash2,
  Search,
  Filter,
} from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import {
  useExpenses,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
} from "@/hooks/useExpenses";
import type { ProjectExpense, ExpenseType } from "@/types";
import type { CreateExpensePayload } from "@/lib/api/expenses";
import Modal from "@/components/ui/Modal";

const EXPENSE_LABELS: Record<ExpenseType, string> = {
  MATERIALS: "Materiales",
  EQUIPMENT: "Equipamiento",
  OVERHEAD: "Gastos generales",
  PERMITS: "Permisos",
  OTHER: "Otros",
};

const EXPENSE_COLORS: Record<ExpenseType, string> = {
  MATERIALS: "bg-blue-50 text-blue-700",
  EQUIPMENT: "bg-purple-50 text-purple-700",
  OVERHEAD: "bg-orange-50 text-orange-700",
  PERMITS: "bg-green-50 text-green-700",
  OTHER: "bg-gray-100 text-gray-700",
};

function fmt(n: number): string {
  return "$" + n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const EMPTY_FORM: CreateExpensePayload = {
  description: "",
  amount: 0,
  expenseType: "MATERIALS",
  expenseDate: new Date().toISOString().slice(0, 10),
  invoiceRef: "",
  notes: "",
};

export default function ExpensesPage() {
  const { data: projectsRes, isLoading: loadingProjects } = useProjects({ page: 1, limit: 100 });
  const projects = projectsRes?.data ?? [];

  const [projectId, setProjectId] = useState("");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<ExpenseType | "">("");

  useEffect(() => {
    if (!projectId && projects.length > 0) setProjectId(projects[0].id);
  }, [projectId, projects]);

  const { data: expenses, isLoading: loadingExpenses } = useExpenses(projectId || undefined);
  const createMut = useCreateExpense(projectId || undefined);
  const updateMut = useUpdateExpense(projectId || undefined);
  const deleteMut = useDeleteExpense(projectId || undefined);

  // Modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ProjectExpense | null>(null);
  const [form, setForm] = useState<CreateExpensePayload>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<ProjectExpense | null>(null);

  const openCreate = useCallback(() => {
    setEditingExpense(null);
    setForm({ ...EMPTY_FORM, expenseDate: new Date().toISOString().slice(0, 10) });
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((exp: ProjectExpense) => {
    setEditingExpense(exp);
    setForm({
      description: exp.description,
      amount: exp.amount,
      expenseType: exp.expenseType,
      expenseDate: exp.expenseDate ? exp.expenseDate.slice(0, 10) : "",
      invoiceRef: exp.invoiceRef ?? "",
      notes: exp.notes ?? "",
    });
    setFormOpen(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!form.description.trim() || form.amount <= 0) return;
    const payload: CreateExpensePayload = {
      ...form,
      description: form.description.trim(),
      expenseDate: form.expenseDate
        ? new Date(form.expenseDate + "T12:00:00").toISOString()
        : undefined,
      invoiceRef: form.invoiceRef?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
    };
    if (editingExpense) {
      await updateMut.mutateAsync({ id: editingExpense.id, payload });
    } else {
      await createMut.mutateAsync(payload);
    }
    setFormOpen(false);
  }, [form, editingExpense, createMut, updateMut]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await deleteMut.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }, [deleteTarget, deleteMut]);

  // Filter + search
  const filtered = useMemo(() => {
    if (!expenses) return [];
    let list = expenses;
    if (filterType) list = list.filter((e) => e.expenseType === filterType);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          (e.invoiceRef && e.invoiceRef.toLowerCase().includes(q))
      );
    }
    return list;
  }, [expenses, filterType, search]);

  // Summary per type
  const summary = useMemo(() => {
    if (!expenses) return { total: 0, byType: {} as Record<string, number> };
    const byType: Record<string, number> = {};
    let total = 0;
    for (const e of expenses) {
      total += e.amount;
      byType[e.expenseType] = (byType[e.expenseType] ?? 0) + e.amount;
    }
    return { total, byType };
  }, [expenses]);

  const isSaving = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gastos adicionales</h1>
          <p className="text-sm text-gray-500 mt-1">
            Materiales, equipamiento, permisos y otros gastos por proyecto
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          disabled={!projectId}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm shrink-0 disabled:opacity-50"
        >
          <Plus size={18} />
          Nuevo gasto
        </button>
      </div>

      {/* Project selector + filters */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
        <div className="flex flex-col gap-1 w-full sm:w-auto sm:min-w-[220px]">
          <label className="text-xs font-medium text-gray-500">Proyecto</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            disabled={loadingProjects}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50"
          >
            {projects.length === 0 ? (
              <option value="">Sin proyectos</option>
            ) : (
              projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))
            )}
          </select>
        </div>

        <div className="flex flex-col gap-1 w-full sm:w-auto sm:min-w-[180px]">
          <label className="text-xs font-medium text-gray-500">Tipo</label>
          <div className="relative">
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as ExpenseType | "")}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            >
              <option value="">Todos los tipos</option>
              {(Object.keys(EXPENSE_LABELS) as ExpenseType[]).map((t) => (
                <option key={t} value={t}>{EXPENSE_LABELS[t]}</option>
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
              placeholder="Descripción o factura..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Summary cards */}
      {expenses && expenses.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4 col-span-2 sm:col-span-3 lg:col-span-1">
            <p className="text-xs text-gray-500 mb-1">Total gastos</p>
            <p className="text-lg font-bold text-gray-900">{fmt(summary.total)}</p>
            <p className="text-xs text-gray-400">{expenses.length} registros</p>
          </div>
          {(Object.keys(EXPENSE_LABELS) as ExpenseType[]).map((t) => (
            <div key={t} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">{EXPENSE_LABELS[t]}</p>
              <p className="text-sm font-semibold text-gray-900">
                {fmt(summary.byType[t] ?? 0)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {loadingExpenses || !projectId ? (
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
              <Receipt size={32} className="text-gray-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Sin gastos</h3>
            <p className="text-sm text-gray-500 mb-4 max-w-sm">
              {search || filterType
                ? "No hay resultados con los filtros actuales."
                : "Agregá gastos de materiales, equipamiento, permisos u otros."}
            </p>
            {!search && !filterType && (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus size={16} />
                Nuevo gasto
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descripción
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Factura
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((exp) => (
                  <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3.5 text-sm text-gray-600 whitespace-nowrap">
                      {fmtDate(exp.expenseDate)}
                    </td>
                    <td className="px-6 py-3.5 text-sm text-gray-900 font-medium max-w-[260px] truncate">
                      {exp.description}
                      {exp.notes && (
                        <span className="block text-xs text-gray-400 font-normal truncate">{exp.notes}</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-sm whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${EXPENSE_COLORS[exp.expenseType]}`}>
                        {EXPENSE_LABELS[exp.expenseType]}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-gray-900 font-semibold tabular-nums text-right whitespace-nowrap">
                      {fmt(exp.amount)}
                    </td>
                    <td className="px-6 py-3.5 text-sm text-gray-600 whitespace-nowrap">
                      {exp.invoiceRef || "—"}
                    </td>
                    <td className="px-6 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          title="Editar"
                          onClick={() => openEdit(exp)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          title="Eliminar"
                          onClick={() => setDeleteTarget(exp)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
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
        title={editingExpense ? "Editar gasto" : "Nuevo gasto"}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Ej. Compra de cemento"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.amount || ""}
                onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
              <select
                value={form.expenseType}
                onChange={(e) => setForm((f) => ({ ...f, expenseType: e.target.value as ExpenseType }))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                {(Object.keys(EXPENSE_LABELS) as ExpenseType[]).map((t) => (
                  <option key={t} value={t}>{EXPENSE_LABELS[t]}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input
                type="date"
                value={form.expenseDate ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, expenseDate: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ref. factura</label>
              <input
                type="text"
                value={form.invoiceRef ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, invoiceRef: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Ej. FAC-001"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea
              value={form.notes ?? ""}
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
              disabled={!form.description.trim() || form.amount <= 0 || isSaving}
              onClick={() => void handleSubmit()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? "Guardando..." : editingExpense ? "Guardar cambios" : "Crear gasto"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar gasto"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              ¿Eliminar el gasto <strong className="text-gray-900">{deleteTarget.description}</strong>{" "}
              por <strong>{fmt(deleteTarget.amount)}</strong>?
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
