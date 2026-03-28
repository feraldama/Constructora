"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  CreditCard,
  FolderKanban,
  Calculator,
  LayoutDashboard,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useProjects } from "@/hooks/useProjects";
import { useDashboard } from "@/hooks/useDashboard";

const PIE_COLORS = {
  paid: "#22c55e",
  pending: "#eab308",
  overdue: "#ef4444",
};

function fmt(value: number): string {
  return "$" + value.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function ReportsPage() {
  const { data: projectsRes, isLoading: loadingProjects } = useProjects({ page: 1, limit: 100 });
  const projects = projectsRes?.data ?? [];

  const [projectId, setProjectId] = useState<string>("");

  useEffect(() => {
    if (!projectId && projects.length > 0) {
      setProjectId(projects[0].id);
    }
  }, [projectId, projects]);

  const { data: dash, isLoading: loadingDash } = useDashboard(projectId || undefined);

  const pieData = useMemo(
    () =>
      dash
        ? [
            { name: "Pagado", value: dash.payments.totalPaid, key: "paid" },
            { name: "Pendiente", value: dash.payments.totalPending, key: "pending" },
            { name: "Vencido", value: dash.payments.totalOverdue, key: "overdue" },
          ].filter((d) => d.value > 0)
        : [],
    [dash]
  );

  const pieTotal = pieData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Resumen ejecutivo por proyecto (presupuesto, pagos y avance)
          </p>
        </div>
        <div className="flex flex-col gap-1 min-w-[220px]">
          <label className="text-xs font-medium text-gray-500">Proyecto</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            disabled={loadingProjects || projects.length === 0}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50"
          >
            {projects.length === 0 ? (
              <option value="">Sin proyectos</option>
            ) : (
              projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {loadingProjects || !projectId ? (
        <div className="space-y-4">
          <div className="h-40 rounded-xl bg-gray-100 animate-pulse" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          No hay proyectos asignados.{" "}
          <Link href="/projects" className="text-blue-600 font-medium hover:underline">
            Gestioná proyectos
          </Link>
          .
        </div>
      ) : loadingDash || !dash ? (
        <div className="space-y-4">
          <div className="h-40 rounded-xl bg-gray-100 animate-pulse" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <LayoutDashboard size={16} />
              Dashboard
            </Link>
            <Link
              href="/payments"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <CreditCard size={16} />
              Pagos
            </Link>
            <Link
              href={`/budget/${projectId}`}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Calculator size={16} />
              Cómputo
            </Link>
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <FolderKanban size={16} />
              Proyectos
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={18} className="text-gray-400" />
                <h2 className="font-semibold text-gray-900">Distribución de pagos</h2>
              </div>
              {pieTotal <= 0 ? (
                <p className="text-sm text-gray-500 py-8 text-center">Sin montos registrados para graficar.</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={56}
                        outerRadius={88}
                        paddingAngle={2}
                      >
                        {pieData.map((entry) => (
                          <Cell
                            key={entry.key}
                            fill={PIE_COLORS[entry.key as keyof typeof PIE_COLORS]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) =>
                          typeof value === "number" ? fmt(value) : String(value ?? "")
                        }
                        contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col justify-center">
              <p className="text-sm text-gray-500 mb-1">Avance de obra</p>
              <p className="text-3xl font-bold text-gray-900">{dash.progress.percent}%</p>
              <p className="text-xs text-gray-500 mt-2">
                {dash.progress.itemsWithPayments} de {dash.progress.totalItems} partidas con pagos
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-50">
                  <DollarSign size={20} className="text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Pagado</p>
                  <p className="text-lg font-semibold text-gray-900">{fmt(dash.payments.totalPaid)}</p>
                  <p className="text-xs text-gray-400">{dash.payments.countPaid} pagos</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-50">
                  <CreditCard size={20} className="text-yellow-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Pendiente</p>
                  <p className="text-lg font-semibold text-gray-900">{fmt(dash.payments.totalPending)}</p>
                  <p className="text-xs text-gray-400">{dash.payments.countPending} pagos</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-50">
                  <CreditCard size={20} className="text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Vencido</p>
                  <p className="text-lg font-semibold text-gray-900">{fmt(dash.payments.totalOverdue)}</p>
                  <p className="text-xs text-gray-400">{dash.payments.countOverdue} pagos</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50">
                  <TrendingUp size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Ejecución presup.</p>
                  <p className="text-lg font-semibold text-gray-900">{dash.budget.executionPercent}%</p>
                  <p className="text-xs text-gray-400">{fmt(dash.budget.executed)} ejecutado</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Presupuesto</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Estimado</p>
                <p className="font-semibold text-gray-900">{fmt(dash.budget.estimated)}</p>
              </div>
              <div>
                <p className="text-gray-500">Ejecutado</p>
                <p className="font-semibold text-gray-900">{fmt(dash.budget.executed)}</p>
              </div>
              <div>
                <p className="text-gray-500">Comprometido</p>
                <p className="font-semibold text-gray-900">{fmt(dash.budget.committed)}</p>
              </div>
              <div>
                <p className="text-gray-500">Restante</p>
                <p className="font-semibold text-gray-900">{fmt(dash.budget.remaining)}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
