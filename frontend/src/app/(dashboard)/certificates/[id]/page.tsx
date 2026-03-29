"use client";

import { use, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Send,
  CheckCircle,
  XCircle,
  RefreshCw,
  CreditCard,
  Trash2,
  Printer,
  AlertTriangle,
  FileDown,
} from "lucide-react";
import {
  useCertificate,
  useUpdateCertificateItem,
  useSubmitCertificate,
  useApproveCertificate,
  useRejectCertificate,
  useResubmitCertificate,
  useGeneratePayment,
  useDeleteCertificate,
} from "@/hooks/useCertificates";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { exportCertificatePdf } from "@/lib/utils/certificatePdf";

const STATUS_BADGE: Record<string, { label: string; variant: "success" | "warning" | "danger" | "default" }> = {
  DRAFT: { label: "Borrador", variant: "default" },
  SUBMITTED: { label: "Enviada", variant: "warning" },
  APPROVED: { label: "Aprobada", variant: "success" },
  REJECTED: { label: "Rechazada", variant: "danger" },
};

function fmt(n: number): string {
  return "$" + n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function CertificateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data: cert, isLoading } = useCertificate(id);
  const updateItemMut = useUpdateCertificateItem();
  const submitMut = useSubmitCertificate();
  const approveMut = useApproveCertificate();
  const rejectMut = useRejectCertificate();
  const resubmitMut = useResubmitCertificate();
  const generatePaymentMut = useGeneratePayment();
  const deleteMut = useDeleteCertificate();

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actionError, setActionError] = useState("");

  const isDraft = cert?.status === "DRAFT";
  const isSubmitted = cert?.status === "SUBMITTED";
  const isApproved = cert?.status === "APPROVED";
  const isRejected = cert?.status === "REJECTED";
  const hasPayment = (cert?.payments.length ?? 0) > 0;

  const handleItemChange = useCallback(
    async (itemId: string, value: string) => {
      const qty = Number(value);
      if (isNaN(qty) || qty < 0) return;
      await updateItemMut.mutateAsync({ itemId, currentQuantity: qty });
    },
    [updateItemMut]
  );

  const handleAction = useCallback(
    async (action: () => Promise<unknown>) => {
      setActionError("");
      try {
        await action();
      } catch (e) {
        const err = e as { response?: { data?: { error?: string } } };
        setActionError(err.response?.data?.error ?? "Error en la operación");
      }
    },
    []
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!cert) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Certificación no encontrada</p>
        <button onClick={() => router.push("/certificates")} className="mt-3 text-blue-600 text-sm cursor-pointer">
          Volver a certificaciones
        </button>
      </div>
    );
  }

  const badge = STATUS_BADGE[cert.status] ?? STATUS_BADGE.DRAFT;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Back + Header */}
      <div>
        <button onClick={() => router.push("/certificates")} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 cursor-pointer">
          <ArrowLeft size={16} /> Volver a certificaciones
        </button>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                Certificación #{cert.certificateNumber}
              </h1>
              <Badge variant={badge.variant}>{badge.label}</Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {cert.contractorName} — {cert.projectName}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Período: {fmtDate(cert.periodStart)} al {fmtDate(cert.periodEnd)}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {isDraft && (
              <>
                <button
                  onClick={() => void handleAction(() => submitMut.mutateAsync(id))}
                  disabled={submitMut.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Send size={16} />
                  {submitMut.isPending ? "Enviando..." : "Enviar"}
                </button>
                <button
                  onClick={() => setDeleteOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
            {isSubmitted && (
              <>
                <button
                  onClick={() => void handleAction(() => approveMut.mutateAsync(id))}
                  disabled={approveMut.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle size={16} />
                  {approveMut.isPending ? "Aprobando..." : "Aprobar"}
                </button>
                <button
                  onClick={() => { setRejectReason(""); setRejectOpen(true); }}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <XCircle size={16} />
                  Rechazar
                </button>
              </>
            )}
            {isApproved && !hasPayment && (
              <button
                onClick={() => void handleAction(() => generatePaymentMut.mutateAsync(id))}
                disabled={generatePaymentMut.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                <CreditCard size={16} />
                {generatePaymentMut.isPending ? "Generando..." : "Generar pago"}
              </button>
            )}
            {isRejected && (
              <button
                onClick={() => void handleAction(() => resubmitMut.mutateAsync(id))}
                disabled={resubmitMut.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw size={16} />
                {resubmitMut.isPending ? "Reenviando..." : "Corregir y reenviar"}
              </button>
            )}
            <button
              onClick={() => exportCertificatePdf(cert)}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
              title="Descargar PDF"
            >
              <FileDown size={16} />
              PDF
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              title="Imprimir"
            >
              <Printer size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {actionError && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertTriangle size={16} /> {actionError}
        </div>
      )}

      {/* Rejection reason */}
      {isRejected && cert.rejectionReason && (
        <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
          <XCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-700">Motivo de rechazo</p>
            <p className="text-sm text-red-600 mt-0.5">{cert.rejectionReason}</p>
          </div>
        </div>
      )}

      {/* Notes */}
      {cert.notes && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-1">Notas</p>
          <p className="text-sm text-gray-700">{cert.notes}</p>
        </div>
      )}

      {/* Items table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Partidas certificadas</h2>
          <span className="text-sm font-bold text-gray-900 tabular-nums">
            Total: {fmt(cert.totalAmount)}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-2.5 text-left font-medium text-gray-500">Rubro</th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-500">Partida</th>
                <th className="px-4 py-2.5 text-center font-medium text-gray-500">Unidad</th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-500">P. Unit.</th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-500">Anterior</th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-500">
                  {isDraft ? "Actual *" : "Actual"}
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-500">Acumulado</th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-500">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cert.items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{item.categoryName}</td>
                  <td className="px-4 py-2.5 text-gray-900 font-medium">{item.budgetItemName}</td>
                  <td className="px-4 py-2.5 text-center text-gray-500">{item.unit}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">
                    {fmt(item.unitPrice)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-500">
                    {item.previousQuantity}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {isDraft ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={item.currentQuantity}
                        onBlur={(e) => void handleItemChange(item.id, e.target.value)}
                        className="w-24 text-right rounded border border-gray-300 px-2 py-1 text-sm tabular-nums focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    ) : (
                      <span className="tabular-nums font-semibold text-gray-900">
                        {item.currentQuantity}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">
                    {item.accumulatedQuantity}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-gray-900">
                    {fmt(item.currentAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50">
                <td colSpan={7} className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                  Total certificación
                </td>
                <td className="px-4 py-3 text-right text-base font-bold text-gray-900 tabular-nums">
                  {fmt(cert.totalAmount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Linked payments */}
      {cert.payments.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Pagos vinculados</h3>
          <div className="space-y-2">
            {cert.payments.map((p) => (
              <div
                key={p.id}
                onClick={() => router.push(`/payments/${p.id}`)}
                className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <div>
                  <Badge variant={p.status === "PAID" ? "success" : p.status === "PENDING" ? "warning" : "default"}>
                    {p.status}
                  </Badge>
                  <span className="text-xs text-gray-400 ml-2">{fmtDate(p.createdAt)}</span>
                </div>
                <span className="font-semibold tabular-nums">{fmt(p.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reject Modal */}
      <Modal isOpen={rejectOpen} onClose={() => setRejectOpen(false)} title="Rechazar certificación">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo del rechazo *</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Explicá el motivo del rechazo..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setRejectOpen(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancelar
            </button>
            <button
              type="button"
              disabled={!rejectReason.trim() || rejectMut.isPending}
              onClick={() => void handleAction(async () => { await rejectMut.mutateAsync({ id, reason: rejectReason }); setRejectOpen(false); })}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {rejectMut.isPending ? "Rechazando..." : "Rechazar"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} title="Eliminar certificación">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            ¿Eliminar la certificación <strong>#{cert.certificateNumber}</strong>? Esta acción no se puede deshacer.
          </p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDeleteOpen(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancelar
            </button>
            <button
              type="button"
              disabled={deleteMut.isPending}
              onClick={() => void handleAction(async () => { await deleteMut.mutateAsync(id); router.push("/certificates"); })}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleteMut.isPending ? "Eliminando..." : "Eliminar"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
