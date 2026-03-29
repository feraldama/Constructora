"use client";

import { use, useState, useMemo, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  Mail,
  Phone,
  MapPin,
  FileText,
  HardHat,
  CreditCard,
  FolderKanban,
  User,
  Hash,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
} from "lucide-react";
import {
  useContractor,
  useUpdateContractor,
  useContractorPaymentsGrouped,
} from "@/hooks/useContractors";
import {
  useCreateAssignment,
  useUpdateAssignment,
  useDeleteAssignment,
  useAssignmentsByContractor,
} from "@/hooks/useAssignments";
import { useProjects } from "@/hooks/useProjects";
import { useProjectBudget } from "@/hooks/useProjectBudget";
import type { ContractorPayload, PaymentsByProject, AssignmentWithProgress } from "@/lib/api/contractors";
import type { CreateAssignmentPayload, UpdateAssignmentPayload } from "@/lib/api/assignments";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import ContractorForm from "@/components/forms/ContractorForm";
import FileUpload from "@/components/ui/FileUpload";
import type { PaymentStatus } from "@/types";

// ─── Helpers ─────────────────────────────────────────────────────────

function fmt(value: number): string {
  return "$" + value.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(dateStr?: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_BADGE: Record<string, { label: string; variant: "success" | "warning" | "danger" | "default" }> = {
  PAID: { label: "Pagado", variant: "success" },
  PENDING: { label: "Pendiente", variant: "warning" },
  OVERDUE: { label: "Vencido", variant: "danger" },
  CANCELLED: { label: "Cancelado", variant: "default" },
};

const PROJECT_STATUS_LABEL: Record<string, string> = {
  PLANNING: "Planificacion",
  IN_PROGRESS: "En progreso",
  ON_HOLD: "Pausado",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado",
};

// ─── Sub-componentes ─────────────────────────────────────────────────

function FinancialCards({ fin }: { fin: NonNullable<import("@/lib/api/contractors").ContractorFinancialSummary> }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <Card icon={DollarSign} label="Acordado" value={fmt(fin.totalAgreed)} color="text-blue-600" bg="bg-blue-50" />
      <Card icon={TrendingUp} label="Pagado" value={fmt(fin.totalPaid)} sub={`${fin.globalPaidPercent}%`} color="text-green-600" bg="bg-green-50" />
      <Card icon={Clock} label="Pendiente" value={fmt(fin.totalPending)} color="text-yellow-600" bg="bg-yellow-50" />
      <Card icon={AlertTriangle} label="Vencido" value={fmt(fin.totalOverdue)} color="text-red-600" bg="bg-red-50" />
      <Card icon={DollarSign} label="Restante" value={fmt(fin.totalRemaining)} color="text-gray-600" bg="bg-gray-100" />
    </div>
  );
}

function Card({ icon: Icon, label, value, sub, color, bg }: {
  icon: typeof DollarSign; label: string; value: string; sub?: string; color: string; bg: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-1">
        <div className={`p-1.5 rounded ${bg}`}><Icon size={16} className={color} /></div>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className="text-lg font-bold text-gray-900 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function AssignmentsTable({
  assignments,
  onEdit,
  onDelete,
}: {
  assignments: AssignmentWithProgress[];
  onEdit: (a: AssignmentWithProgress) => void;
  onDelete: (a: AssignmentWithProgress) => void;
}) {
  if (assignments.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">Sin partidas asignadas</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50/50">
            <th className="text-left py-2.5 px-4 font-medium text-gray-500">Partida</th>
            <th className="text-left py-2.5 px-4 font-medium text-gray-500">Proyecto</th>
            <th className="text-center py-2.5 px-4 font-medium text-gray-500">Unidad</th>
            <th className="text-right py-2.5 px-4 font-medium text-gray-500">Acordado</th>
            <th className="text-right py-2.5 px-4 font-medium text-gray-500">Pagado</th>
            <th className="text-right py-2.5 px-4 font-medium text-gray-500">Restante</th>
            <th className="py-2.5 px-4 font-medium text-gray-500 w-28">Avance</th>
            <th className="py-2.5 px-4 w-20" />
          </tr>
        </thead>
        <tbody>
          {assignments.map((a) => (
            <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50/50">
              <td className="py-2.5 px-4 font-medium text-gray-900">{a.budgetItemName}</td>
              <td className="py-2.5 px-4 text-gray-600">{a.projectName}</td>
              <td className="py-2.5 px-4 text-center text-gray-500">{a.unit}</td>
              <td className="py-2.5 px-4 text-right tabular-nums">{fmt(a.agreedPrice)}</td>
              <td className="py-2.5 px-4 text-right tabular-nums text-green-600">{fmt(a.totalPaid)}</td>
              <td className="py-2.5 px-4 text-right tabular-nums font-semibold">{fmt(a.remaining)}</td>
              <td className="py-2.5 px-4">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${Math.min(a.paidPercent, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-8 text-right">{a.paidPercent}%</span>
                </div>
              </td>
              <td className="py-2.5 px-4">
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => onEdit(a)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors"
                    title="Editar asignación"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => onDelete(a)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors"
                    title="Eliminar asignación"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Formulario de asignación ────────────────────────────────────────

function inputCls(extra = "") {
  return `w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${extra}`;
}

function AssignmentFormModal({
  contractorId,
  editingAssignment,
  onClose,
}: {
  contractorId: string;
  editingAssignment?: AssignmentWithProgress | null;
  onClose: () => void;
}) {
  const isEdit = !!editingAssignment;
  const { data: projectsRes } = useProjects({ page: 1, limit: 100 });
  const projects = projectsRes?.data ?? [];

  const [projectId, setProjectId] = useState(editingAssignment?.projectId ?? "");
  const [budgetItemId, setBudgetItemId] = useState(editingAssignment?.budgetItemId ?? "");
  const [assignedQuantity, setAssignedQuantity] = useState(
    editingAssignment ? String(editingAssignment.assignedQuantity) : ""
  );
  const [unitPrice, setUnitPrice] = useState(
    editingAssignment && editingAssignment.assignedQuantity > 0
      ? String(Math.round((editingAssignment.agreedPrice / editingAssignment.assignedQuantity) * 100) / 100)
      : ""
  );
  const [notes, setNotes] = useState("");

  const agreedPrice = (Number(assignedQuantity) || 0) * (Number(unitPrice) || 0);
  const [formError, setFormError] = useState("");

  const { data: budgetData } = useProjectBudget(projectId || undefined);
  const { data: existingAssignments } = useAssignmentsByContractor(
    isEdit ? undefined : contractorId,
    projectId || undefined
  );

  const budgetItems = useMemo(() => {
    if (!budgetData?.categories) return [];
    const allItems = budgetData.categories.flatMap((cat) =>
      cat.items.map((item) => ({
        id: item.id,
        name: item.name,
        categoryName: cat.name,
        quantity: item.quantity,
      }))
    );

    if (!isEdit && existingAssignments && existingAssignments.length > 0) {
      const fullyPaidIds = new Set(
        existingAssignments
          .filter((a) => a.financials.remaining <= 0)
          .map((a) => a.budgetItemId)
      );
      return allItems.filter((item) => !fullyPaidIds.has(item.id));
    }

    return allItems;
  }, [budgetData, isEdit, existingAssignments]);

  const selectedItem = budgetItems.find((b) => b.id === budgetItemId);

  const createMutation = useCreateAssignment();
  const updateMutation = useUpdateAssignment();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setFormError("");

      try {
        if (isEdit && editingAssignment) {
          const data: UpdateAssignmentPayload = {};
          const qty = Number(assignedQuantity);
          const price = Number(agreedPrice);
          if (qty !== editingAssignment.assignedQuantity) data.assignedQuantity = qty;
          if (price !== editingAssignment.agreedPrice) data.agreedPrice = price;
          if (notes) data.notes = notes;

          await updateMutation.mutateAsync({
            id: editingAssignment.id,
            data,
            budgetItemId: editingAssignment.budgetItemId,
            contractorId,
          });
        } else {
          const payload: CreateAssignmentPayload = {
            contractorId,
            budgetItemId,
            assignedQuantity: Number(assignedQuantity),
            agreedPrice: Number(agreedPrice),
            ...(notes ? { notes } : {}),
          };
          await createMutation.mutateAsync(payload);
        }
        onClose();
      } catch (err: unknown) {
        const error = err as { response?: { data?: { error?: string } } };
        setFormError(error.response?.data?.error ?? "Error al guardar la asignación");
      }
    },
    [isEdit, editingAssignment, contractorId, budgetItemId, assignedQuantity, agreedPrice, notes, createMutation, updateMutation, onClose]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {formError}
        </div>
      )}

      {/* Proyecto */}
      {!isEdit && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Proyecto <span className="text-red-500">*</span>
          </label>
          <select
            value={projectId}
            onChange={(e) => { setProjectId(e.target.value); setBudgetItemId(""); }}
            required
            className={inputCls()}
          >
            <option value="">Seleccionar proyecto...</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Partida */}
      {!isEdit && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Partida <span className="text-red-500">*</span>
          </label>
          <select
            value={budgetItemId}
            onChange={(e) => setBudgetItemId(e.target.value)}
            required
            disabled={!projectId}
            className={inputCls(projectId ? "" : "bg-gray-50 text-gray-400")}
          >
            <option value="">
              {projectId ? "Seleccionar partida..." : "Elegí un proyecto primero"}
            </option>
            {budgetItems.map((b) => (
              <option key={b.id} value={b.id}>
                {b.categoryName} — {b.name}
              </option>
            ))}
          </select>
          {selectedItem && (
            <p className="mt-1 text-xs text-gray-500">
              Cantidad presupuestada: {selectedItem.quantity}
            </p>
          )}
        </div>
      )}

      {isEdit && (
        <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
          <p><span className="font-medium">Partida:</span> {editingAssignment!.budgetItemName}</p>
          <p><span className="font-medium">Proyecto:</span> {editingAssignment!.projectName}</p>
        </div>
      )}

      {/* Cantidad + Precio unitario */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cantidad asignada <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={assignedQuantity}
            onChange={(e) => setAssignedQuantity(e.target.value)}
            required
            min="0.0001"
            step="any"
            placeholder="0"
            className={inputCls()}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Precio unitario <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input
              type="number"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              required
              min="0"
              step="0.01"
              placeholder="0.00"
              className={inputCls("pl-7")}
            />
          </div>
        </div>
      </div>

      {/* Precio acordado (total) — calculado */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Precio acordado (total)</span>
        <span className="text-lg font-bold text-gray-900 tabular-nums">
          ${agreedPrice.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      {/* Notas */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observaciones opcionales..."
          maxLength={1000}
          className={inputCls()}
        />
      </div>

      {/* Botones */}
      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isSaving ? "Guardando..." : isEdit ? "Guardar cambios" : "Asignar partida"}
        </button>
      </div>
    </form>
  );
}

function PaymentsGrouped({ groups }: { groups: PaymentsByProject[] }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map((g) => [g.projectId, true]))
  );

  if (groups.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">Sin pagos registrados</p>;
  }

  const toggle = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const isOpen = expanded[group.projectId] ?? true;
        return (
          <div key={group.projectId} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Project header */}
            <button
              onClick={() => toggle(group.projectId)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                {isOpen ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                <span className="font-medium text-gray-900">{group.projectName}</span>
                <span className="text-xs text-gray-400">({group.totals.count} pagos)</span>
              </div>
              <div className="hidden sm:flex items-center gap-4 text-xs">
                <span className="text-green-600">Pagado: {fmt(group.totals.paid)}</span>
                <span className="text-yellow-600">Pendiente: {fmt(group.totals.pending)}</span>
                {group.totals.overdue > 0 && (
                  <span className="text-red-600">Vencido: {fmt(group.totals.overdue)}</span>
                )}
              </div>
            </button>

            {/* Payments table */}
            {isOpen && (
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-gray-200 bg-gray-50/30">
                    <th className="text-left py-2 px-4 font-medium text-gray-500">Fecha</th>
                    <th className="text-left py-2 px-4 font-medium text-gray-500">Descripcion</th>
                    <th className="text-left py-2 px-4 font-medium text-gray-500">Partida</th>
                    <th className="text-left py-2 px-4 font-medium text-gray-500">Factura</th>
                    <th className="text-right py-2 px-4 font-medium text-gray-500">Monto</th>
                    <th className="text-left py-2 px-4 font-medium text-gray-500">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {group.payments.map((p) => {
                    const badge = STATUS_BADGE[p.status] ?? STATUS_BADGE.PENDING;
                    return (
                      <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                        <td className="py-2 px-4 text-gray-600">{fmtDate(p.createdAt)}</td>
                        <td className="py-2 px-4 text-gray-900">{p.description || "-"}</td>
                        <td className="py-2 px-4 text-gray-600">{p.budgetItemName || "-"}</td>
                        <td className="py-2 px-4 text-gray-500 font-mono text-xs">{p.invoiceNumber || "-"}</td>
                        <td className="py-2 px-4 text-right font-semibold tabular-nums">{fmt(p.amount)}</td>
                        <td className="py-2 px-4">
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────────────

export default function ContractorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: contractor, isLoading } = useContractor(id);
  const { data: paymentsGrouped } = useContractorPaymentsGrouped(id);
  const updateMutation = useUpdateContractor();
  const deleteMutation = useDeleteAssignment();
  const [editOpen, setEditOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<AssignmentWithProgress | null>(null);
  const [deletingAssignment, setDeletingAssignment] = useState<AssignmentWithProgress | null>(null);

  async function handleEdit(payload: ContractorPayload) {
    await updateMutation.mutateAsync({ id, data: payload });
    setEditOpen(false);
  }

  async function handleDeleteAssignment() {
    if (!deletingAssignment) return;
    try {
      await deleteMutation.mutateAsync({
        id: deletingAssignment.id,
        budgetItemId: deletingAssignment.budgetItemId,
        contractorId: id,
      });
      setDeletingAssignment(null);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      alert(error.response?.data?.error ?? "Error al eliminar la asignación");
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!contractor) {
    return (
      <div className="text-center py-12">
        <HardHat size={40} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500">Contratista no encontrado</p>
        <button onClick={() => router.push("/contractors")} className="mt-3 text-sm text-blue-600">Volver</button>
      </div>
    );
  }

  const infoItems = [
    { icon: User, label: "Contacto", value: contractor.contactName },
    { icon: Mail, label: "Email", value: contractor.email },
    { icon: Phone, label: "Telefono", value: contractor.phone },
    { icon: Hash, label: "CUIT", value: contractor.taxId },
    { icon: MapPin, label: "Direccion", value: contractor.address },
    { icon: FileText, label: "Notas", value: contractor.notes },
  ];

  return (
    <div className="space-y-6">
      {/* Back */}
      <button onClick={() => router.push("/contractors")} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={16} /> Volver a Contratistas
      </button>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 text-blue-700">
            <HardHat size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{contractor.name}</h1>
              <Badge variant={contractor.isActive ? "success" : "danger"}>
                {contractor.isActive ? "Activo" : "Inactivo"}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Registrado el {fmtDate(contractor.createdAt)}
              {contractor.financial && ` · ${contractor.financial.activeProjects} proyecto${contractor.financial.activeProjects !== 1 ? "s" : ""} activo${contractor.financial.activeProjects !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        <button onClick={() => setEditOpen(true)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
          <Pencil size={16} /> Editar
        </button>
      </div>

      {/* Resumen financiero */}
      {contractor.financial && <FinancialCards fin={contractor.financial} />}

      {/* Progreso por proyecto */}
      {contractor.financial && contractor.financial.projects.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <FolderKanban size={18} className="text-gray-400" />
            <h2 className="font-semibold text-gray-900">Desglose por proyecto</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Proyecto</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Estado</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">Acordado</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">Pagado</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">Restante</th>
                  <th className="py-2 px-3 font-medium text-gray-500 w-28">Avance</th>
                </tr>
              </thead>
              <tbody>
                {contractor.financial.projects.map((p) => (
                  <tr key={p.projectId} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="py-2.5 px-3 font-medium text-gray-900">{p.projectName}</td>
                    <td className="py-2.5 px-3 text-gray-500 text-xs">{PROJECT_STATUS_LABEL[p.projectStatus] ?? p.projectStatus}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{fmt(p.agreed)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-green-600">{fmt(p.paid)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-semibold">{fmt(p.remaining)}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(p.paidPercent, 100)}%` }} />
                        </div>
                        <span className="text-xs text-gray-400 w-8 text-right">{p.paidPercent}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info de contacto */}
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Informacion de contacto</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
          {[infoItems.slice(0, 3), infoItems.slice(3)].map((col, ci) => (
            <div key={ci} className="divide-y divide-gray-100">
              {col.map((item) => (
                <div key={item.label} className="flex items-start gap-3 px-5 py-3">
                  <item.icon size={17} className="text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">{item.label}</p>
                    <p className="text-sm text-gray-900 mt-0.5">{item.value || <span className="text-gray-400 italic">Sin datos</span>}</p>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Documentación adjunta */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <FileUpload
          entityType="CONTRACTOR"
          entityId={id}
          label="Documentación adjunta"
        />
      </div>

      {/* Partidas asignadas */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FolderKanban size={18} className="text-gray-400" />
            <h2 className="font-semibold text-gray-900">Partidas asignadas</h2>
            <span className="text-xs text-gray-400">({contractor.assignments?.length ?? 0})</span>
          </div>
          <button
            onClick={() => { setEditingAssignment(null); setAssignModalOpen(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Plus size={16} />
            Asignar partida
          </button>
        </div>
        <AssignmentsTable
          assignments={contractor.assignments ?? []}
          onEdit={(a) => { setEditingAssignment(a); setAssignModalOpen(true); }}
          onDelete={(a) => setDeletingAssignment(a)}
        />
      </div>

      {/* Historial de pagos agrupado */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">
          <CreditCard size={18} className="text-gray-400" />
          <h2 className="font-semibold text-gray-900">Historial de pagos</h2>
        </div>
        <div className="p-4">
          <PaymentsGrouped groups={paymentsGrouped ?? []} />
        </div>
      </div>

      {/* Edit Contractor Modal */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Editar Contratista" className="max-w-2xl">
        <ContractorForm
          initialData={contractor}
          onSubmit={handleEdit}
          onCancel={() => setEditOpen(false)}
          isLoading={updateMutation.isPending}
        />
      </Modal>

      {/* Create/Edit Assignment Modal */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => { setAssignModalOpen(false); setEditingAssignment(null); }}
        title={editingAssignment ? "Editar asignación" : "Asignar partida"}
        className="max-w-lg"
      >
        <AssignmentFormModal
          contractorId={id}
          editingAssignment={editingAssignment}
          onClose={() => { setAssignModalOpen(false); setEditingAssignment(null); }}
        />
      </Modal>

      {/* Delete Assignment Modal */}
      <Modal
        isOpen={!!deletingAssignment}
        onClose={() => setDeletingAssignment(null)}
        title="Eliminar asignación"
      >
        {deletingAssignment && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              ¿Eliminar la asignación de{" "}
              <strong className="text-gray-900">{deletingAssignment.budgetItemName}</strong>{" "}
              en <strong className="text-gray-900">{deletingAssignment.projectName}</strong>?
            </p>
            {deletingAssignment.totalPaid > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                Esta asignación tiene pagos registrados por {fmt(deletingAssignment.totalPaid)}.
                Solo se puede eliminar si no hay pagos pendientes o pagados.
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletingAssignment(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteAssignment}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
