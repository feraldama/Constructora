"use client";

import { useState, useEffect } from "react";
import {
  History,
  ChevronLeft,
  ChevronRight,
  User,
  FolderKanban,
} from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { useActivityLogs } from "@/hooks/useActivity";

const ACTION_LABELS: Record<string, string> = {
  CREATE_PROJECT: "Creó proyecto",
  UPDATE_PROJECT: "Editó proyecto",
  DELETE_PROJECT: "Eliminó proyecto",
  CREATE_CATEGORY: "Creó rubro",
  DELETE_CATEGORY: "Eliminó rubro",
  CREATE_BUDGET_ITEM: "Creó partida",
  UPDATE_BUDGET_ITEM: "Editó partida",
  DELETE_BUDGET_ITEM: "Eliminó partida",
  CREATE_CONTRACTOR: "Creó contratista",
  UPDATE_CONTRACTOR: "Editó contratista",
  DELETE_CONTRACTOR: "Eliminó contratista",
  CREATE_PAYMENT: "Creó pago",
  UPDATE_PAYMENT: "Editó pago",
  DELETE_PAYMENT: "Eliminó pago",
  CREATE_ASSIGNMENT: "Creó asignación",
  UPDATE_ASSIGNMENT: "Editó asignación",
  DELETE_ASSIGNMENT: "Eliminó asignación",
  CREATE_EXPENSE: "Creó gasto",
  UPDATE_EXPENSE: "Editó gasto",
  DELETE_EXPENSE: "Eliminó gasto",
  UPLOAD_ATTACHMENT: "Subió archivo",
  DELETE_ATTACHMENT: "Eliminó archivo",
};

const ENTITY_COLORS: Record<string, string> = {
  Project: "bg-blue-50 text-blue-700",
  Category: "bg-gray-100 text-gray-700",
  BudgetItem: "bg-indigo-50 text-indigo-700",
  Contractor: "bg-orange-50 text-orange-700",
  Payment: "bg-green-50 text-green-700",
  ContractorAssignment: "bg-purple-50 text-purple-700",
  ProjectExpense: "bg-yellow-50 text-yellow-700",
  Attachment: "bg-pink-50 text-pink-700",
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `Hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `Hace ${days}d`;
  return fmtDate(iso);
}

export default function ActivityPage() {
  const { data: projectsRes, isLoading: loadingProjects } = useProjects({ page: 1, limit: 100 });
  const projects = projectsRes?.data ?? [];

  const [projectId, setProjectId] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [projectId]);

  const { data, isLoading } = useActivityLogs({
    projectId: projectId || undefined,
    page,
    limit: 30,
  });

  const logs = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Historial de actividad</h1>
          <p className="text-sm text-gray-500 mt-1">
            Registro de todas las acciones realizadas en los proyectos
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex flex-col gap-1 w-full sm:w-auto sm:min-w-[240px]">
          <label className="text-xs font-medium text-gray-500">Filtrar por proyecto</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            disabled={loadingProjects}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50"
          >
            <option value="">Todos los proyectos</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="divide-y divide-gray-100">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-64 rounded bg-gray-200 animate-pulse" />
                  <div className="h-3 w-32 rounded bg-gray-100 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="rounded-full bg-gray-100 p-4 mb-4">
              <History size={32} className="text-gray-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Sin actividad</h3>
            <p className="text-sm text-gray-500 max-w-sm">
              No se encontraron registros de actividad{projectId ? " para este proyecto" : ""}.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                {/* Avatar */}
                <div className="shrink-0 w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                  <User size={16} className="text-gray-400" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {log.user
                        ? `${log.user.firstName} ${log.user.lastName}`
                        : "Sistema"}
                    </span>
                    <span className="text-sm text-gray-600">
                      {ACTION_LABELS[log.action] ?? log.action.replace(/_/g, " ").toLowerCase()}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    {/* Entity type badge */}
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        ENTITY_COLORS[log.entityType] ?? "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {log.entityType}
                    </span>

                    {/* Project name */}
                    {log.project && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <FolderKanban size={12} />
                        {log.project.name}
                      </span>
                    )}

                    {/* Metadata preview */}
                    {log.metadata && typeof log.metadata === "object" && (
                      <span className="text-xs text-gray-400 truncate max-w-[300px]">
                        {Object.entries(log.metadata)
                          .filter(([, v]) => v !== null && v !== undefined && v !== "")
                          .slice(0, 3)
                          .map(([k, v]) => `${k}: ${String(v)}`)
                          .join(" · ")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Timestamp */}
                <div className="shrink-0 text-right">
                  <p className="text-xs text-gray-500">{relativeTime(log.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500">
              Página {pagination.page} de {pagination.totalPages} ({pagination.total} registros)
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 rounded-lg border border-gray-300 text-gray-500 hover:bg-white disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-gray-300 text-gray-500 hover:bg-white disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
