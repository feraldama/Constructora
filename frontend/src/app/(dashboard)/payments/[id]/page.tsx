"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Calendar, DollarSign, User, Banknote, ArrowLeftRight, FileCheck, MoreHorizontal, CreditCard, CheckCircle } from "lucide-react";
import { usePayment, useUpdatePayment } from "@/hooks/usePayments";
import { useGeneratePayment } from "@/hooks/useCertificates";
import Badge from "@/components/ui/Badge";
import FileUpload from "@/components/ui/FileUpload";
import Modal from "@/components/ui/Modal";
import type { PaymentStatus, PaymentMethod } from "@/types";

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

const METHOD_DISPLAY: Record<string, { label: string; icon: typeof Banknote; bg: string; text: string }> = {
  CASH:          { label: "Efectivo",      icon: Banknote,       bg: "bg-green-50",  text: "text-green-700" },
  BANK_TRANSFER: { label: "Transferencia", icon: ArrowLeftRight, bg: "bg-blue-50",   text: "text-blue-700" },
  CHECK:         { label: "Cheque",        icon: FileCheck,      bg: "bg-purple-50", text: "text-purple-700" },
  OTHER:         { label: "Otro",          icon: MoreHorizontal, bg: "bg-gray-100",  text: "text-gray-600" },
};

export default function PaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: payment, isLoading } = usePayment(id);
  const updateMutation = useUpdatePayment();
  const generatePaymentMut = useGeneratePayment();

  // --- Mark-as-paid modal state ---
  const [showPaidModal, setShowPaidModal] = useState(false);
  const [paidForm, setPaidForm] = useState({
    paymentMethod: "" as PaymentMethod | "",
    paidAt: new Date().toISOString().slice(0, 10),
    invoiceNumber: "",
  });

  // --- Generate payment for remaining items modal ---
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  async function handleConfirmPaid() {
    if (!payment) return;
    await updateMutation.mutateAsync({
      id: payment.id,
      data: {
        status: "PAID",
        ...(paidForm.paymentMethod && { paymentMethod: paidForm.paymentMethod as PaymentMethod }),
        paidAt: new Date(paidForm.paidAt + "T12:00:00").toISOString(),
        ...(paidForm.invoiceNumber.trim() && { invoiceNumber: paidForm.invoiceNumber.trim() }),
      },
    });
    setShowPaidModal(false);
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
                onClick={() => setShowPaidModal(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
              >
                Marcar como Pagado
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

            <div className="flex items-start gap-3">
              <CreditCard size={18} className="text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Método de pago</p>
                {payment.paymentMethod && METHOD_DISPLAY[payment.paymentMethod] ? (
                  (() => {
                    const cfg = METHOD_DISPLAY[payment.paymentMethod!];
                    const Icon = cfg.icon;
                    return (
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.bg} ${cfg.text} mt-0.5`}>
                        <Icon size={13} />
                        {cfg.label}
                      </span>
                    );
                  })()
                ) : (
                  <p className="text-sm font-medium">-</p>
                )}
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
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <FileUpload
          entityType="PAYMENT"
          entityId={payment.id}
          label="Comprobantes adjuntos"
          readOnly={payment.status === "CANCELLED"}
        />
      </div>

      {/* Partidas del certificado — visible cuando el pago está vinculado a un certificado */}
      {payment.certificate && (() => {
        const cert = payment.certificate;
        const paidBudgetIds = new Set(
          cert.payments.map((p) => p.budgetItemId).filter(Boolean)
        );
        const hasFullPay = cert.payments.some((p) => !p.budgetItemId);
        const unpaidItems = cert.items.filter(
          (i) => !hasFullPay && !paidBudgetIds.has(i.budgetItemId) && i.currentAmount > 0
        );

        return (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-gray-900">
                Partidas — Certificación #{cert.certificateNumber}
              </h2>
              {unpaidItems.length > 0 && (
                <button
                  onClick={() => {
                    setSelectedItemIds(new Set());
                    setShowItemsModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700 hover:text-green-800 cursor-pointer"
                >
                  <CreditCard size={15} />
                  Generar pago de partidas restantes
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Partida</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500">Cantidad</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500">Monto</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-500">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cert.items.map((item) => {
                    const isPaid = hasFullPay || paidBudgetIds.has(item.budgetItemId);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50/50">
                        <td className="px-3 py-2">
                          <p className="font-medium text-gray-900">{item.budgetItemName}</p>
                          <p className="text-xs text-gray-400">{item.categoryName}</p>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-600">
                          {item.currentQuantity} {item.unit}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold text-gray-900">
                          {formatCurrency(item.currentAmount)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                              <CheckCircle size={13} /> Pago generado
                            </span>
                          ) : item.currentAmount > 0 ? (
                            <span className="text-xs font-medium text-amber-600">Pendiente</span>
                          ) : (
                            <span className="text-xs text-gray-400">Sin monto</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50">
                    <td className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Total certificación</td>
                    <td />
                    <td className="px-3 py-2 text-right font-bold text-gray-900 tabular-nums">
                      {formatCurrency(cert.totalAmount)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        );
      })()}

      {/* Modal: Generar pago por partidas restantes */}
      {payment.certificate && (() => {
        const cert = payment.certificate;
        const paidBudgetIds = new Set(cert.payments.map((p) => p.budgetItemId).filter(Boolean));
        const hasFullPay = cert.payments.some((p) => !p.budgetItemId);
        const unpaidItems = cert.items.filter(
          (i) => !hasFullPay && !paidBudgetIds.has(i.budgetItemId) && i.currentAmount > 0
        );

        return (
          <Modal
            isOpen={showItemsModal}
            onClose={() => setShowItemsModal(false)}
            title="Generar pago por partidas"
            className="max-w-2xl"
          >
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Seleccioná las partidas de la Certificación #{cert.certificateNumber} para las que querés generar un pago.
              </p>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-3 py-2 text-left w-10">
                          <input
                            type="checkbox"
                            checked={unpaidItems.length > 0 && selectedItemIds.size === unpaidItems.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedItemIds(new Set(unpaidItems.map((i) => i.id)));
                              } else {
                                setSelectedItemIds(new Set());
                              }
                            }}
                            className="rounded border-gray-300 cursor-pointer"
                          />
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Partida</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500">Cantidad</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {unpaidItems.map((item) => {
                        const checked = selectedItemIds.has(item.id);
                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => {
                              setSelectedItemIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(item.id)) next.delete(item.id);
                                else next.add(item.id);
                                return next;
                              });
                            }}
                          >
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {}}
                                className="rounded border-gray-300 cursor-pointer"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <p className="font-medium text-gray-900">{item.budgetItemName}</p>
                              <p className="text-xs text-gray-400">{item.categoryName}</p>
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-gray-600">
                              {item.currentQuantity} {item.unit}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums font-semibold text-gray-900">
                              {formatCurrency(item.currentAmount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {selectedItemIds.size > 0 && (
                  <div className="px-3 py-2 bg-green-50 border-t border-gray-200 flex justify-between text-sm">
                    <span className="text-green-700 font-medium">{selectedItemIds.size} partida(s)</span>
                    <span className="font-bold text-green-800 tabular-nums">
                      {formatCurrency(
                        unpaidItems
                          .filter((i) => selectedItemIds.has(i.id))
                          .reduce((sum, i) => sum + i.currentAmount, 0)
                      )}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowItemsModal(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    await generatePaymentMut.mutateAsync({
                      id: cert.id,
                      payload: { mode: "BY_ITEMS", itemIds: [...selectedItemIds] },
                    });
                    setShowItemsModal(false);
                  }}
                  disabled={generatePaymentMut.isPending || selectedItemIds.size === 0}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatePaymentMut.isPending
                    ? "Generando..."
                    : `Generar ${selectedItemIds.size} pago(s)`}
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* Modal: Marcar como Pagado */}
      <Modal isOpen={showPaidModal} onClose={() => setShowPaidModal(false)} title="Confirmar pago">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Completá los datos del pago por <span className="font-semibold">{formatCurrency(payment.amount)}</span>.
          </p>

          {/* Método de pago */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
            <select
              value={paidForm.paymentMethod}
              onChange={(e) => setPaidForm((f) => ({ ...f, paymentMethod: e.target.value as PaymentMethod | "" }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Seleccionar...</option>
              <option value="CASH">Efectivo</option>
              <option value="BANK_TRANSFER">Transferencia bancaria</option>
              <option value="CHECK">Cheque</option>
              <option value="OTHER">Otro</option>
            </select>
          </div>

          {/* Fecha de pago */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de pago</label>
            <input
              type="date"
              value={paidForm.paidAt}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setPaidForm((f) => ({ ...f, paidAt: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* N° Factura */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">N° Factura <span className="text-gray-400 font-normal">(opcional)</span></label>
            <input
              type="text"
              value={paidForm.invoiceNumber}
              onChange={(e) => setPaidForm((f) => ({ ...f, invoiceNumber: e.target.value }))}
              placeholder="Ej: 0001-00012345"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Acciones */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowPaidModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmPaid}
              disabled={updateMutation.isPending || !paidForm.paidAt}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateMutation.isPending ? "Procesando..." : "Confirmar pago"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
