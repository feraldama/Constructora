"use client";

import { useState, useEffect, useMemo, type FormEvent } from "react";
import type { Payment, PaymentStatus } from "@/types";
import type {
  CreatePaymentPayload,
  UpdatePaymentPayload,
  AssignmentFinancialContext,
} from "@/lib/api/payments";
import { useAssignmentContext } from "@/hooks/usePayments";
import { useProjectBudget } from "@/hooks/useProjectBudget";
import { useAssignmentsByContractor } from "@/hooks/useAssignments";

// ─── Tipos de dominio ─────────────────────────────────────────────────────────

type PaymentMethod = "CASH" | "BANK_TRANSFER" | "CHECK" | "OTHER";

interface BudgetItemOption {
  id: string;
  name: string;
  categoryName?: string;
}

interface PaymentFormProps {
  mode: "create" | "edit";
  initialData?: Payment;
  projects:    { id: string; name: string }[];
  contractors: { id: string; name: string }[];
  budgetItems?: BudgetItemOption[];
  onSubmit:    (data: CreatePaymentPayload | UpdatePaymentPayload) => void;
  onCancel:    () => void;
  isLoading?:  boolean;
  error?:      string;
  defaultProjectId?:    string;
  defaultContractorId?: string;
  defaultBudgetItemId?: string;
}

// ─── Opciones ─────────────────────────────────────────────────────────────────

const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "BANK_TRANSFER", label: "Transferencia bancaria" },
  { value: "CASH",          label: "Efectivo" },
  { value: "CHECK",         label: "Cheque" },
  { value: "OTHER",         label: "Otro" },
];

const STATUS_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: "PENDING",   label: "Pendiente" },
  { value: "PAID",      label: "Pagado" },
  { value: "OVERDUE",   label: "Vencido" },
  { value: "CANCELLED", label: "Cancelado" },
];

// ─── Panel financiero ─────────────────────────────────────────────────────────

function fmt(n: number) {
  return "$" + n.toLocaleString("es-AR", { minimumFractionDigits: 2 });
}

function FinancialContextPanel({
  ctx,
  loading,
}: {
  ctx: AssignmentFinancialContext | undefined;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 p-3 space-y-2 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-4 bg-gray-100 rounded" />
        ))}
      </div>
    );
  }
  if (!ctx) return null;

  const rows: { label: string; value: string; highlight?: "green" | "yellow" | "red" }[] = [
    { label: "Total acordado",     value: fmt(ctx.totalAcordado) },
    { label: "Total pagado",       value: fmt(ctx.totalPagado),    highlight: ctx.totalPagado > 0 ? "green" : undefined },
    { label: "Pendiente / Vencido", value: fmt(ctx.totalPendiente + ctx.totalVencido), highlight: ctx.totalVencido > 0 ? "red" : ctx.totalPendiente > 0 ? "yellow" : undefined },
    {
      label: "Saldo disponible",
      value: fmt(ctx.saldoDisponible),
      highlight: ctx.estaComprometidoEnExceso ? "red" : ctx.saldoDisponible === 0 ? "yellow" : "green",
    },
  ];

  const barPaid      = Math.min(ctx.porcentajePagado, 100);
  const barCommitted = Math.min(ctx.porcentajeComprometido, 100);

  return (
    <div className={`rounded-lg border p-3 text-sm space-y-3 ${
      ctx.estaComprometidoEnExceso
        ? "border-red-200 bg-red-50"
        : ctx.estaPagoCompleto
        ? "border-green-200 bg-green-50"
        : "border-blue-200 bg-blue-50"
    }`}>
      <p className="font-medium text-gray-700 text-xs uppercase tracking-wide">
        Estado financiero de la asignación
      </p>

      {/* Barra de progreso */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Pagado {ctx.porcentajePagado}%</span>
          <span>Comprometido {ctx.porcentajeComprometido}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden relative">
          {/* Comprometido (fondo) */}
          <div
            className="absolute inset-y-0 left-0 bg-yellow-300 rounded-full transition-all"
            style={{ width: `${barCommitted}%` }}
          />
          {/* Pagado (encima) */}
          <div
            className="absolute inset-y-0 left-0 bg-green-500 rounded-full transition-all"
            style={{ width: `${barPaid}%` }}
          />
        </div>
      </div>

      {/* Tabla de montos */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
        {rows.map((r) => (
          <div key={r.label} className="contents">
            <dt className="text-gray-500">{r.label}</dt>
            <dd className={`font-semibold text-right ${
              r.highlight === "green"  ? "text-green-700"  :
              r.highlight === "yellow" ? "text-yellow-700" :
              r.highlight === "red"    ? "text-red-700"    :
              "text-gray-800"
            }`}>
              {r.value}
            </dd>
          </div>
        ))}
      </dl>

      {ctx.estaComprometidoEnExceso && (
        <p className="text-xs text-red-600 font-medium">
          ⚠ Los compromisos superan el monto acordado. Revisá los pagos pendientes.
        </p>
      )}
      {ctx.estaPagoCompleto && !ctx.estaComprometidoEnExceso && (
        <p className="text-xs text-green-600 font-medium">
          ✓ Esta asignación está completamente saldada.
        </p>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function inputCls(extra = "") {
  return `w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${extra}`;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function PaymentForm({
  mode,
  initialData,
  projects,
  contractors,
  budgetItems = [],
  onSubmit,
  onCancel,
  isLoading = false,
  error,
  defaultProjectId,
  defaultContractorId,
  defaultBudgetItemId,
}: PaymentFormProps) {
  const [form, setForm] = useState({
    projectId:     defaultProjectId    ?? initialData?.projectId    ?? "",
    contractorId:  defaultContractorId ?? initialData?.contractorId ?? "",
    budgetItemId:  defaultBudgetItemId ?? initialData?.budgetItemId ?? "",
    amount:        initialData ? Number(initialData.amount) : ("" as number | ""),
    paymentDate:   "",             // ISO date string — si se provee, pago queda PAID
    dueDate:       initialData?.dueDate?.slice(0, 10) ?? "",
    paymentMethod: "" as PaymentMethod | "",
    paymentType:   "PARTIAL" as "PARTIAL" | "TOTAL",
    invoiceNumber: initialData?.invoiceNumber ?? "",
    description:   initialData?.description  ?? "",
    status:        (initialData?.status ?? "PENDING") as PaymentStatus,
  });

  // Cargar partidas del proyecto seleccionado
  const { data: budgetData } = useProjectBudget(
    mode === "create" ? form.projectId || undefined : undefined
  );

  // Cargar asignaciones del contratista en este proyecto para filtrar las saldadas
  const { data: contractorAssignments } = useAssignmentsByContractor(
    mode === "create" ? form.contractorId || undefined : undefined,
    form.projectId || undefined
  );

  const derivedBudgetItems = useMemo<BudgetItemOption[]>(() => {
    const items = budgetItems.length > 0
      ? budgetItems
      : (budgetData?.categories ?? []).flatMap((cat) =>
          cat.items.map((item) => ({
            id: item.id,
            name: item.name,
            categoryName: cat.name,
          }))
        );

    // Si hay contratista seleccionado y tenemos sus asignaciones, filtrar partidas saldadas
    if (contractorAssignments && contractorAssignments.length > 0) {
      const fullyPaidIds = new Set(
        contractorAssignments
          .filter((a) => a.financials.remaining <= 0)
          .map((a) => a.budgetItemId)
      );
      return items.filter((item) => !fullyPaidIds.has(item.id));
    }

    return items;
  }, [budgetItems, budgetData, contractorAssignments]);

  // Limpiar budgetItemId cuando cambia el proyecto
  useEffect(() => {
    if (mode === "create") {
      setForm((f) => ({ ...f, budgetItemId: "" }));
    }
  }, [form.projectId, mode]);

  // Contexto financiero en vivo — se carga cuando hay contractorId + budgetItemId
  const { data: financialCtx, isFetching: ctxLoading, error: ctxError } = useAssignmentContext(
    mode === "create" ? form.contractorId || undefined : undefined,
    mode === "create" ? form.budgetItemId || undefined : undefined
  );

  const noAssignment = !ctxLoading && !!ctxError && !!form.contractorId && !!form.budgetItemId;

  // Si paymentType cambia a TOTAL, limpiar el amount (lo fija el backend)
  useEffect(() => {
    if (form.paymentType === "TOTAL") {
      setForm((f) => ({ ...f, amount: "" }));
    }
  }, [form.paymentType]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (mode === "create") {
      const payload: CreatePaymentPayload = {
        projectId:     form.projectId,
        contractorId:  form.contractorId,
        budgetItemId:  form.budgetItemId,
        amount:        form.paymentType === "TOTAL" && financialCtx
                         ? financialCtx.saldoDisponible
                         : Number(form.amount) || 0,
        paymentType:   form.paymentType,
        paymentMethod: form.paymentMethod || undefined,
        paymentDate:   form.paymentDate ? new Date(form.paymentDate).toISOString() : undefined,
        dueDate:       form.dueDate     ? new Date(form.dueDate).toISOString()     : undefined,
        invoiceNumber: form.invoiceNumber || undefined,
        description:   form.description  || undefined,
      };
      onSubmit(payload);
    } else {
      const payload: UpdatePaymentPayload = {
        amount:        form.amount !== "" ? Number(form.amount) : undefined,
        status:        form.status,
        paymentMethod: form.paymentMethod || undefined,
        description:   form.description  || undefined,
        invoiceNumber: form.invoiceNumber || undefined,
        dueDate:       form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
        paidAt:        form.paymentDate ? new Date(form.paymentDate).toISOString() : undefined,
      };
      onSubmit(payload);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Error de servidor */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Panel financiero en vivo ── */}
      {mode === "create" && form.contractorId && form.budgetItemId && (
        noAssignment ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <p className="font-medium">Este contratista no tiene asignada esta partida.</p>
            <p className="mt-1 text-amber-600">
              Asigná al contratista a esta partida desde la sección de Contratistas antes de registrar un pago.
            </p>
          </div>
        ) : (
          <FinancialContextPanel ctx={financialCtx} loading={ctxLoading} />
        )
      )}

      {/* ── Proyecto + Contratista (solo creación) ── */}
      {mode === "create" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Proyecto <span className="text-red-500">*</span>
            </label>
            <select
              name="projectId"
              value={form.projectId}
              onChange={handleChange}
              required
              className={inputCls()}
            >
              <option value="">Seleccionar...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contratista <span className="text-red-500">*</span>
            </label>
            <select
              name="contractorId"
              value={form.contractorId}
              onChange={handleChange}
              required
              className={inputCls()}
            >
              <option value="">Seleccionar...</option>
              {contractors.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ── Partida (solo creación) ── */}
      {mode === "create" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Partida <span className="text-red-500">*</span>
          </label>
          <select
            name="budgetItemId"
            value={form.budgetItemId}
            onChange={handleChange}
            required
            className={inputCls()}
          >
            <option value="">Seleccionar partida...</option>
            {derivedBudgetItems.map((b) => (
              <option key={b.id} value={b.id}>
                {b.categoryName ? `${b.categoryName} — ` : ""}
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ── Tipo + Monto ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {mode === "create" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de pago
            </label>
            <select
              name="paymentType"
              value={form.paymentType}
              onChange={handleChange}
              className={inputCls()}
            >
              <option value="PARTIAL">Parcial — monto específico</option>
              <option value="TOTAL">Total — salda toda la deuda</option>
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Monto{" "}
            {form.paymentType === "TOTAL" ? (
              <span className="text-gray-400 font-normal">
                {financialCtx
                  ? `(auto: ${fmt(financialCtx.saldoDisponible)})`
                  : noAssignment
                  ? "(sin asignación)"
                  : form.contractorId && form.budgetItemId
                  ? "(cargando…)"
                  : "(seleccioná contratista y partida)"}
              </span>
            ) : (
              <span className="text-red-500">*</span>
            )}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">
              $
            </span>
            <input
              type="number"
              name="amount"
              value={
                form.paymentType === "TOTAL"
                  ? financialCtx?.saldoDisponible ?? ""
                  : form.amount
              }
              onChange={handleChange}
              required={form.paymentType !== "TOTAL"}
              min="0.01"
              step="0.01"
              max={financialCtx?.saldoDisponible}
              disabled={form.paymentType === "TOTAL"}
              placeholder="0.00"
              className={inputCls("pl-7 disabled:bg-gray-50 disabled:text-gray-400")}
            />
          </div>
        </div>

        {/* Estado (solo edición) */}
        {mode === "edit" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className={inputCls()}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Método de pago ── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Método de pago
        </label>
        <select
          name="paymentMethod"
          value={form.paymentMethod}
          onChange={handleChange}
          className={inputCls()}
        >
          <option value="">Sin especificar</option>
          {PAYMENT_METHOD_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* ── Fechas ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha de pago
            <span className="ml-1 text-xs font-normal text-gray-400">
              (si ya se realizó)
            </span>
          </label>
          <input
            type="date"
            name="paymentDate"
            value={form.paymentDate}
            max={todayISO()}
            onChange={handleChange}
            className={inputCls()}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha de vencimiento
            <span className="ml-1 text-xs font-normal text-gray-400">
              (si está programado)
            </span>
          </label>
          <input
            type="date"
            name="dueDate"
            value={form.dueDate}
            onChange={handleChange}
            className={inputCls()}
          />
        </div>
      </div>

      {/* ── N° Factura + Descripción ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            N° Factura / Comprobante
          </label>
          <input
            type="text"
            name="invoiceNumber"
            value={form.invoiceNumber}
            onChange={handleChange}
            placeholder="Ej: FC-A-00001234"
            className={inputCls()}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descripción
          </label>
          <input
            type="text"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Detalle del pago..."
            className={inputCls()}
          />
        </div>
      </div>

      {/* ── Botones ── */}
      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading
            ? "Guardando..."
            : mode === "create"
            ? "Registrar Pago"
            : "Guardar Cambios"}
        </button>
      </div>
    </form>
  );
}
