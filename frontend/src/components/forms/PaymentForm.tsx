"use client";

import { useState, type FormEvent } from "react";
import type { Payment, PaymentStatus } from "@/types";
import type { CreatePaymentPayload, UpdatePaymentPayload } from "@/lib/api/payments";

interface PaymentFormProps {
  mode: "create" | "edit";
  initialData?: Payment;
  // Listas para selects
  projects: { id: string; name: string }[];
  contractors: { id: string; name: string }[];
  budgetItems?: { id: string; name: string }[];
  maxAllowed?: number;
  onSubmit: (data: CreatePaymentPayload | UpdatePaymentPayload) => void;
  onCancel: () => void;
  isLoading?: boolean;
  error?: string;
}

const STATUS_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: "PENDING", label: "Pendiente" },
  { value: "PAID", label: "Pagado" },
  { value: "OVERDUE", label: "Vencido" },
  { value: "CANCELLED", label: "Cancelado" },
];

export default function PaymentForm({
  mode,
  initialData,
  projects,
  contractors,
  budgetItems = [],
  maxAllowed,
  onSubmit,
  onCancel,
  isLoading = false,
  error,
}: PaymentFormProps) {
  const [form, setForm] = useState({
    projectId: initialData?.projectId ?? "",
    contractorId: initialData?.contractorId ?? "",
    budgetItemId: initialData?.budgetItemId ?? "",
    amount: initialData?.amount ?? 0,
    description: initialData?.description ?? "",
    invoiceNumber: initialData?.invoiceNumber ?? "",
    dueDate: initialData?.dueDate?.slice(0, 10) ?? "",
    paymentType: "PARTIAL" as "PARTIAL" | "TOTAL",
    status: initialData?.status ?? "PENDING",
  });

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
        projectId: form.projectId,
        contractorId: form.contractorId,
        budgetItemId: form.budgetItemId || undefined,
        amount: Number(form.amount),
        description: form.description || undefined,
        invoiceNumber: form.invoiceNumber || undefined,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
        paymentType: form.paymentType,
      };
      onSubmit(payload);
    } else {
      const payload: UpdatePaymentPayload = {
        amount: Number(form.amount),
        status: form.status as PaymentStatus,
        description: form.description || undefined,
        invoiceNumber: form.invoiceNumber || undefined,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
      };
      onSubmit(payload);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {maxAllowed !== undefined && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          Monto maximo disponible: <strong>${maxAllowed.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</strong>
        </div>
      )}

      {mode === "create" && (
        <div className="grid grid-cols-2 gap-4">
          {/* Proyecto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Proyecto *
            </label>
            <select
              name="projectId"
              value={form.projectId}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Seleccionar...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Contratista */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contratista *
            </label>
            <select
              name="contractorId"
              value={form.contractorId}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Seleccionar...</option>
              {contractors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Partida (opcional) */}
      {budgetItems.length > 0 && mode === "create" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Partida (opcional)
          </label>
          <select
            name="budgetItemId"
            value={form.budgetItemId}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Sin partida específica</option>
            {budgetItems.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Tipo de pago */}
        {mode === "create" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de pago
            </label>
            <select
              name="paymentType"
              value={form.paymentType}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="PARTIAL">Parcial</option>
              <option value="TOTAL">Total (salda deuda)</option>
            </select>
          </div>
        )}

        {/* Monto */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Monto * {form.paymentType === "TOTAL" && "(se calcula auto)"}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500 text-sm">$</span>
            <input
              type="number"
              name="amount"
              value={form.amount}
              onChange={handleChange}
              required
              min="0.01"
              step="0.01"
              disabled={form.paymentType === "TOTAL"}
              className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* N° Factura */}
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Fecha de vencimiento */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha de vencimiento
          </label>
          <input
            type="date"
            name="dueDate"
            value={form.dueDate}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descripción
        </label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={2}
          placeholder="Detalle del pago..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
        />
      </div>

      {/* Botones */}
      <div className="flex justify-end gap-3 pt-2">
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
          {isLoading ? "Guardando..." : mode === "create" ? "Registrar Pago" : "Guardar Cambios"}
        </button>
      </div>
    </form>
  );
}
