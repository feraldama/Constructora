"use client";

import { useRouter } from "next/navigation";
import {
  DollarSign,
  Clock,
  AlertTriangle,
  TrendingUp,
  FolderKanban,
  ArrowRight,
} from "lucide-react";
import { useDashboardOverview } from "@/hooks/useDashboard";
import Badge from "@/components/ui/Badge";

const STATUS_LABEL: Record<string, string> = {
  PLANNING: "Planificación",
  IN_PROGRESS: "En progreso",
  ON_HOLD: "Pausado",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado",
};

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "default"> = {
  PLANNING: "default",
  IN_PROGRESS: "success",
  ON_HOLD: "warning",
  COMPLETED: "success",
  CANCELLED: "danger",
};

function fmt(n: number): string {
  return "$" + n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function DashboardOverviewPage() {
  const router = useRouter();
  const { data, isLoading } = useDashboardOverview();

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  const { projects, totals } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vista general</h1>
          <p className="text-sm text-gray-500 mt-1">
            Resumen ejecutivo de todos tus proyectos
          </p>
        </div>
        <button
          onClick={() => router.push("/dashboard")}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Ver proyecto activo
          <ArrowRight size={16} />
        </button>
      </div>

      {/* KPI Totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">Total pagado</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(totals.totalPaid)}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-green-50">
              <DollarSign size={22} className="text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">Pendiente</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(totals.totalPending)}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-yellow-50">
              <Clock size={22} className="text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">Vencido</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(totals.totalOverdue)}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-red-50">
              <AlertTriangle size={22} className="text-red-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">Presup. total</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(totals.totalEstimated)}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-50">
              <TrendingUp size={22} className="text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Projects comparison table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">
          <FolderKanban size={18} className="text-gray-400" />
          <h2 className="font-semibold text-gray-900">Comparativo de proyectos</h2>
          <span className="text-xs text-gray-400">({projects.length})</span>
        </div>

        {projects.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">
            No tenés proyectos asignados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-5 py-3 text-left font-medium text-gray-500">Proyecto</th>
                  <th className="px-5 py-3 text-left font-medium text-gray-500">Estado</th>
                  <th className="px-5 py-3 text-right font-medium text-gray-500">Presupuesto</th>
                  <th className="px-5 py-3 text-right font-medium text-gray-500">Pagado</th>
                  <th className="px-5 py-3 text-right font-medium text-gray-500">Pendiente</th>
                  <th className="px-5 py-3 font-medium text-gray-500">Ejecución</th>
                  <th className="px-5 py-3 font-medium text-gray-500">Avance</th>
                  <th className="px-5 py-3 text-right font-medium text-gray-500">Margen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {projects.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => router.push("/dashboard")}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3.5 font-medium text-gray-900">{p.name}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant={STATUS_VARIANT[p.status] ?? "default"}>
                        {STATUS_LABEL[p.status] ?? p.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-gray-700">{fmt(p.estimated)}</td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-green-600 font-medium">{fmt(p.paid)}</td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-yellow-600">
                      {fmt(p.pending + p.overdue)}
                      {p.overdue > 0 && (
                        <span className="text-xs text-red-500 ml-1">({fmt(p.overdue)} vencido)</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(p.executionPercent, 100)}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 tabular-nums w-8">{p.executionPercent}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${p.progressPercent >= 75 ? "bg-green-500" : "bg-blue-400"}`}
                            style={{ width: `${Math.min(p.progressPercent, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 tabular-nums w-8">{p.progressPercent}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums">
                      <span className={p.profitMargin >= 0 ? "text-green-600" : "text-red-600"}>
                        {p.profitMargin}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
