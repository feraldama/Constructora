"use client";

import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import {
  Plus,
  Search,
  Filter,
  Eye,
  Pencil,
  Trash2,
  CheckCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  usePayments,
  useCreatePayment,
  useUpdatePayment,
  useDeletePayment,
  usePaymentSummary,
  useContractorDebts,
} from "@/hooks/usePayments";
import type { PaymentFilters } from "@/lib/api/payments";
import type { PaymentDetail, CreatePaymentPayload, UpdatePaymentPayload } from "@/lib/api/payments";
import type { PaymentStatus } from "@/types";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import PaymentForm from "@/components/forms/PaymentForm";
import PaymentSummaryCards from "@/components/charts/PaymentSummaryCards";
import DebtTable from "@/components/charts/DebtTable";
import { useProjects } from "@/hooks/useProjects";
import { useContractors } from "@/hooks/useContractors";

// ── Etiquetas de método de pago ───────────────────────────────────────────────
const METHOD_LABEL: Record<string, string> = {
  CASH:          "Efectivo",
  BANK_TRANSFER: "Transferencia",
  CHECK:         "Cheque",
  OTHER:         "Otro",
};

const STATUS_BADGE: Record<PaymentStatus, { label: string; variant: "success" | "warning" | "danger" | "default" }> = {
  PAID: { label: "Pagado", variant: "success" },
  PENDING: { label: "Pendiente", variant: "warning" },
  OVERDUE: { label: "Vencido", variant: "danger" },
  CANCELLED: { label: "Cancelado", variant: "default" },
};

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "PENDING", label: "Pendientes" },
  { value: "PAID", label: "Pagados" },
  { value: "OVERDUE", label: "Vencidos" },
  { value: "CANCELLED", label: "Cancelados" },
];

function formatCurrency(value: number): string {
  return "$" + Number(value).toLocaleString("es-AR", { minimumFractionDigits: 2 });
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("es-AR");
}

const columnHelper = createColumnHelper<PaymentDetail>();

export default function PaymentsPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<PaymentFilters>({ page: 1, limit: 20 });
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentDetail | null>(null);
  const [deletingPayment, setDeletingPayment] = useState<PaymentDetail | null>(null);
  const [formError, setFormError] = useState("");
  const [activeTab, setActiveTab] = useState<"list" | "debts">("list");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  // Datos reales de proyectos y contratistas
  const { data: projectsData } = useProjects({ limit: 100 });
  const { data: contractorsData } = useContractors({ limit: 200, isActive: true });

  const projects     = projectsData?.data     ?? [];
  const contractors  = contractorsData?.data  ?? [];
  const projectId    = selectedProjectId || undefined;

  const activeFilters: PaymentFilters = {
    ...filters,
    projectId:   projectId,
    status:      statusFilter || undefined,
    dateFrom:    dateFrom ? new Date(dateFrom).toISOString() : undefined,
    dateTo:      dateTo   ? new Date(dateTo).toISOString()   : undefined,
  };

  const { data: paymentsData, isLoading } = usePayments(activeFilters);
  const { data: summary } = usePaymentSummary(projectId);
  const { data: debts } = useContractorDebts(projectId);
  const createMutation = useCreatePayment();
  const updateMutation = useUpdatePayment();
  const deleteMutation = useDeletePayment();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns = useMemo<any[]>(
    () => [
      columnHelper.accessor("createdAt", {
        header: "Fecha",
        size: 100,
        cell: (info) => (
          <span className="text-sm text-gray-600">{formatDate(info.getValue())}</span>
        ),
      }),
      columnHelper.accessor("contractor", {
        header: "Contratista",
        size: 180,
        cell: (info) => (
          <span className="font-medium text-gray-900">
            {info.getValue()?.name ?? "-"}
          </span>
        ),
      }),
      columnHelper.accessor("project", {
        header: "Proyecto",
        size: 160,
        cell: (info) => (
          <span className="text-sm text-gray-600">
            {info.getValue()?.name ?? "-"}
          </span>
        ),
      }),
      columnHelper.accessor("amount", {
        header: "Monto",
        size: 130,
        cell: (info) => (
          <span className="font-semibold text-gray-900">
            {formatCurrency(info.getValue())}
          </span>
        ),
      }),
      columnHelper.accessor("status", {
        header: "Estado",
        size: 110,
        cell: (info) => {
          const s = STATUS_BADGE[info.getValue()];
          return <Badge variant={s.variant}>{s.label}</Badge>;
        },
      }),
      columnHelper.accessor("dueDate", {
        header: "Vencimiento",
        size: 110,
        cell: (info) => {
          const date = info.getValue();
          if (!date) return <span className="text-gray-400">-</span>;
          const isOverdue = new Date(date) < new Date() && info.row.original.status === "PENDING";
          return (
            <span className={isOverdue ? "text-red-600 font-medium" : "text-gray-600"}>
              {formatDate(date)}
            </span>
          );
        },
      }),
      columnHelper.accessor("paymentMethod" as keyof PaymentDetail, {
        header: "Método",
        size: 120,
        cell: (info) => {
          const m = info.getValue() as string | null | undefined;
          if (!m) return <span className="text-gray-400">-</span>;
          return <span className="text-sm text-gray-600">{METHOD_LABEL[m] ?? m}</span>;
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        size: 120,
        cell: (info) => {
          const payment = info.row.original;
          return (
            <div className="flex gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); router.push(`/payments/${payment.id}`); }}
                className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                title="Ver detalle"
              >
                <Eye size={16} />
              </button>
              {payment.status !== "PAID" && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleMarkPaid(payment); }}
                    className="p-1.5 text-gray-400 hover:text-green-600 transition-colors"
                    title="Marcar como pagado"
                  >
                    <CheckCircle size={16} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingPayment(payment); }}
                    className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Editar"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeletingPayment(payment); }}
                    className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
          );
        },
      }),
    ],
    [router]
  );

  const table = useReactTable({
    data: paymentsData?.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  async function handleCreate(data: CreatePaymentPayload | UpdatePaymentPayload) {
    setFormError("");
    try {
      await createMutation.mutateAsync(data as CreatePaymentPayload);
      setShowCreate(false);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setFormError(error.response?.data?.error ?? "Error al crear el pago");
    }
  }

  async function handleUpdate(data: CreatePaymentPayload | UpdatePaymentPayload) {
    if (!editingPayment) return;
    setFormError("");
    try {
      await updateMutation.mutateAsync({ id: editingPayment.id, data: data as UpdatePaymentPayload });
      setEditingPayment(null);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setFormError(error.response?.data?.error ?? "Error al actualizar el pago");
    }
  }

  async function handleDelete() {
    if (!deletingPayment) return;
    try {
      await deleteMutation.mutateAsync(deletingPayment.id);
      setDeletingPayment(null);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      alert(error.response?.data?.error ?? "Error al eliminar");
    }
  }

  async function handleMarkPaid(payment: PaymentDetail) {
    try {
      await updateMutation.mutateAsync({
        id: payment.id,
        data: { status: "PAID" },
      });
    } catch {
      // silently handle
    }
  }

  const pagination = paymentsData?.pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pagos</h1>
          <p className="text-sm text-gray-500 mt-1">Gestion de pagos a contratistas</p>
        </div>
        <button
          onClick={() => { setFormError(""); setShowCreate(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shrink-0"
        >
          <Plus size={18} />
          Nuevo Pago
        </button>
      </div>

      {/* Dashboard Summary */}
      {summary && <PaymentSummaryCards summary={summary} />}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-full sm:w-fit">
        <button
          onClick={() => setActiveTab("list")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === "list"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Listado de Pagos
        </button>
        <button
          onClick={() => setActiveTab("debts")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === "debts"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Deuda por Contratista
        </button>
      </div>

      {activeTab === "debts" && debts ? (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Deuda restante por contratista</h2>
          <DebtTable debts={debts} />
        </div>
      ) : (
        <>
          {/* Filtros */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter size={16} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Filtros</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {/* Selector de proyecto */}
              <select
                value={selectedProjectId}
                onChange={(e) => { setSelectedProjectId(e.target.value); setFilters((f) => ({ ...f, page: 1 })); }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
              >
                <option value="">Todos los proyectos</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setFilters((f) => ({ ...f, page: 1 })); }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                {STATUS_FILTERS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>

              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500">Desde</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setFilters((f) => ({ ...f, page: 1 })); }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500">Hasta</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setFilters((f) => ({ ...f, page: 1 })); }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {(selectedProjectId || statusFilter || dateFrom || dateTo) && (
                <button
                  onClick={() => {
                    setSelectedProjectId("");
                    setStatusFilter("");
                    setDateFrom("");
                    setDateTo("");
                  }}
                  className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>

          {/* Tabla */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {isLoading ? (
              <div className="p-8 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : (paymentsData?.data.length ?? 0) === 0 ? (
              <div className="text-center py-12">
                <Search size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No se encontraron pagos</p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Registrar el primer pago
                </button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    {table.getHeaderGroups().map((hg) => (
                      <tr key={hg.id} className="bg-gray-50 border-b border-gray-200">
                        {hg.headers.map((h) => (
                          <th
                            key={h.id}
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                            style={{ width: h.getSize() }}
                          >
                            {flexRender(h.column.columnDef.header, h.getContext())}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/payments/${row.original.id}`)}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-4 py-3" style={{ width: cell.column.getSize() }}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>

                {/* Paginación */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                    <span className="text-sm text-gray-500">
                      {pagination.total} resultado{pagination.total !== 1 ? "s" : ""}
                    </span>
                    <div className="flex gap-2">
                      <button
                        disabled={pagination.page <= 1}
                        onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                      >
                        Anterior
                      </button>
                      <span className="px-3 py-1 text-sm text-gray-700">
                        {pagination.page} / {pagination.totalPages}
                      </span>
                      <button
                        disabled={pagination.page >= pagination.totalPages}
                        onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                      >
                        Siguiente
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Modal Crear */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nuevo Pago" className="max-w-2xl">
        <PaymentForm
          mode="create"
          projects={projects}
          contractors={contractors}
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
          isLoading={createMutation.isPending}
          error={formError}
        />
      </Modal>

      {/* Modal Editar */}
      <Modal
        isOpen={!!editingPayment}
        onClose={() => setEditingPayment(null)}
        title="Editar Pago"
        className="max-w-2xl"
      >
        {editingPayment && (
          <PaymentForm
            mode="edit"
            initialData={editingPayment}
            projects={projects}
            contractors={contractors}
            onSubmit={handleUpdate}
            onCancel={() => setEditingPayment(null)}
            isLoading={updateMutation.isPending}
            error={formError}
          />
        )}
      </Modal>

      {/* Modal Eliminar */}
      <Modal
        isOpen={!!deletingPayment}
        onClose={() => setDeletingPayment(null)}
        title="Eliminar Pago"
      >
        <p className="text-sm text-gray-600 mb-1">
          Estas por eliminar un pago de{" "}
          <strong>{deletingPayment ? formatCurrency(deletingPayment.amount) : ""}</strong>{" "}
          a <strong>{deletingPayment?.contractor?.name}</strong>.
        </p>
        <p className="text-sm text-gray-500 mb-4">Esta accion no se puede deshacer.</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setDeletingPayment(null)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
