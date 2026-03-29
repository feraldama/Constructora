"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, FileCheck2, Search } from "lucide-react";
import { useProject } from "@/hooks/useProject";
import { useCertificates, useCreateCertificate, useDeleteCertificate } from "@/hooks/useCertificates";
import { useContractors } from "@/hooks/useContractors";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import type { CreateCertificatePayload } from "@/lib/api/certificates";

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
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function CertificatesPage() {
  const router = useRouter();
  const { projectId } = useProject();

  const [statusFilter, setStatusFilter] = useState("");
  const [contractorFilter, setContractorFilter] = useState("");

  const { data: certificates, isLoading } = useCertificates(
    projectId ? { projectId, status: statusFilter || undefined, contractorId: contractorFilter || undefined } : undefined
  );
  const { data: contractorsRes } = useContractors({ projectId: projectId ?? undefined, limit: 100 });
  const contractors = contractorsRes?.data ?? [];

  const createMut = useCreateCertificate();
  const deleteMut = useDeleteCertificate();

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [formContractorId, setFormContractorId] = useState("");
  const [formPeriodStart, setFormPeriodStart] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [formPeriodEnd, setFormPeriodEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [formNotes, setFormNotes] = useState("");
  const [formError, setFormError] = useState("");

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; number: number } | null>(null);

  const handleCreate = useCallback(async () => {
    if (!projectId || !formContractorId) return;
    setFormError("");
    try {
      const payload: CreateCertificatePayload = {
        projectId,
        contractorId: formContractorId,
        periodStart: new Date(formPeriodStart + "T00:00:00").toISOString(),
        periodEnd: new Date(formPeriodEnd + "T23:59:59").toISOString(),
        notes: formNotes.trim() || undefined,
      };
      const result = await createMut.mutateAsync(payload);
      setCreateOpen(false);
      router.push(`/certificates/${result.id}`);
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      setFormError(err.response?.data?.error ?? "Error al crear certificación");
    }
  }, [projectId, formContractorId, formPeriodStart, formPeriodEnd, formNotes, createMut, router]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await deleteMut.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }, [deleteTarget, deleteMut]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Certificaciones</h1>
          <p className="text-sm text-gray-500 mt-1">
            Certificados de avance de obra por contratista
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setFormError(""); setCreateOpen(true); }}
          disabled={!projectId}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 shadow-sm shrink-0 disabled:opacity-50"
        >
          <Plus size={18} />
          Nueva certificación
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
        <select
          value={contractorFilter}
          onChange={(e) => setContractorFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm w-full sm:w-auto sm:min-w-[200px]"
        >
          <option value="">Todos los contratistas</option>
          {contractors.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm w-full sm:w-auto"
        >
          <option value="">Todos los estados</option>
          <option value="DRAFT">Borrador</option>
          <option value="SUBMITTED">Enviada</option>
          <option value="APPROVED">Aprobada</option>
          <option value="REJECTED">Rechazada</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {isLoading || !projectId ? (
          <div className="divide-y divide-gray-100">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="h-4 w-16 rounded bg-gray-200 animate-pulse" />
                <div className="h-4 w-40 rounded bg-gray-200 animate-pulse" />
                <div className="h-4 w-24 rounded bg-gray-100 animate-pulse" />
              </div>
            ))}
          </div>
        ) : !certificates || certificates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="rounded-full bg-gray-100 p-4 mb-4">
              <FileCheck2 size={32} className="text-gray-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Sin certificaciones</h3>
            <p className="text-sm text-gray-500 mb-4 max-w-sm">
              Creá una nueva certificación para registrar el avance de obra ejecutado por un contratista.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left font-medium text-gray-500">#</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Contratista</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Período</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Estado</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">Monto</th>
                  <th className="px-6 py-3 text-center font-medium text-gray-500">Items</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Creada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {certificates.map((c) => {
                  const badge = STATUS_BADGE[c.status] ?? STATUS_BADGE.DRAFT;
                  return (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/certificates/${c.id}`)}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-3.5 font-semibold text-gray-900">
                        #{c.certificateNumber}
                      </td>
                      <td className="px-6 py-3.5 text-gray-900 font-medium">{c.contractorName}</td>
                      <td className="px-6 py-3.5 text-gray-600 whitespace-nowrap">
                        {fmtDate(c.periodStart)} — {fmtDate(c.periodEnd)}
                      </td>
                      <td className="px-6 py-3.5">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </td>
                      <td className="px-6 py-3.5 text-right font-semibold tabular-nums text-gray-900">
                        {fmt(c.totalAmount)}
                      </td>
                      <td className="px-6 py-3.5 text-center text-gray-500">{c.itemCount}</td>
                      <td className="px-6 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                        {fmtDate(c.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Nueva certificación">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contratista *</label>
            <select
              value={formContractorId}
              onChange={(e) => setFormContractorId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Seleccionar contratista...</option>
              {contractors.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Inicio período *</label>
              <input
                type="date"
                value={formPeriodStart}
                onChange={(e) => setFormPeriodStart(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fin período *</label>
              <input
                type="date"
                value={formPeriodEnd}
                onChange={(e) => setFormPeriodEnd(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Opcional"
            />
          </div>
          {formError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{formError}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCreateOpen(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancelar
            </button>
            <button
              type="button"
              disabled={!formContractorId || createMut.isPending}
              onClick={() => void handleCreate()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {createMut.isPending ? "Creando..." : "Crear certificación"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Eliminar certificación">
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              ¿Eliminar la certificación <strong>#{deleteTarget.number}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
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
