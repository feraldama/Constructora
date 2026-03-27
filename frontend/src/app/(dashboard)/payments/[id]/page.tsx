"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Calendar, DollarSign, User } from "lucide-react";
import { usePayment, useUpdatePayment } from "@/hooks/usePayments";
import Badge from "@/components/ui/Badge";
import type { PaymentStatus } from "@/types";

const STATUS_BADGE: Record<PaymentStatus, { label: string; variant: "success" | "warning" | "danger" | "default" }> = {
  PAID: { label: "Pagado", variant: "success" },
  PENDING: { label: "Pendiente", variant: "warning" },
  OVERDUE: { label: "Vencido", variant: "danger" },
  CANCELLED: { label: "Cancelado", variant: "default" },
};

function formatCurrency(value: number): string {
  return "$" + Number(value).toLocaleString("es-AR", { minimumFractionDigits: 2 });
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("es-AR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function PaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: payment, isLoading } = usePayment(id);
  const updateMutation = useUpdatePayment();

  async function handleMarkPaid() {
    if (!payment) return;
    await updateMutation.mutateAsync({ id: payment.id, data: { status: "PAID" } });
  }

  async function handleCancel() {
    if (!payment) return;
    await updateMutation.mutateAsync({ id: payment.id, data: { status: "CANCELLED" } });
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Pago no encontrado</p>
        <button onClick={() => router.push("/payments")} className="mt-3 text-blue-600 text-sm">
          Volver a pagos
        </button>
      </div>
    );
  }

  const status = STATUS_BADGE[payment.status];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back + Header */}
      <div>
        <button
          onClick={() => router.push("/payments")}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft size={16} />
          Volver a pagos
        </button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {formatCurrency(payment.amount)}
              </h1>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Registrado el {formatDate(payment.createdAt)}
            </p>
          </div>

          {payment.status !== "PAID" && payment.status !== "CANCELLED" && (
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                disabled={updateMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar pago
              </button>
              <button
                onClick={handleMarkPaid}
                disabled={updateMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
              >
                {updateMutation.isPending ? "Procesando..." : "Marcar como Pagado"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Datos del pago */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Detalles del pago</h2>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <DollarSign size={18} className="text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Monto</p>
                <p className="text-sm font-medium">{formatCurrency(payment.amount)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar size={18} className="text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Vencimiento</p>
                <p className="text-sm font-medium">{formatDate(payment.dueDate)}</p>
              </div>
            </div>

            {payment.paidAt && (
              <div className="flex items-start gap-3">
                <Calendar size={18} className="text-green-500 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Fecha de pago</p>
                  <p className="text-sm font-medium text-green-700">{formatDate(payment.paidAt)}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <FileText size={18} className="text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">N° Factura</p>
                <p className="text-sm font-medium">{payment.invoiceNumber || "-"}</p>
              </div>
            </div>

            {payment.description && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Descripcion</p>
                <p className="text-sm text-gray-700">{payment.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Contratista y proyecto */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Relaciones</h2>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <User size={18} className="text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Contratista</p>
                <p className="text-sm font-medium">
                  {typeof payment.contractor === "object" && payment.contractor
                    ? payment.contractor.name
                    : "-"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FileText size={18} className="text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Proyecto</p>
                <p className="text-sm font-medium">{payment.project?.name ?? "-"}</p>
              </div>
            </div>

            {payment.budgetItem && (
              <div className="flex items-start gap-3">
                <FileText size={18} className="text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Partida</p>
                  <p className="text-sm font-medium">
                    {payment.budgetItem.name} ({payment.budgetItem.unit})
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Adjuntos */}
      {payment.attachments && payment.attachments.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Comprobantes adjuntos</h2>
          <div className="space-y-2">
            {payment.attachments.map((att) => (
              <a
                key={att.id}
                href={att.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 text-sm text-blue-600"
              >
                <FileText size={16} />
                {att.fileName}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
