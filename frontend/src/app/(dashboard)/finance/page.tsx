"use client";

import { useState, useMemo, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Clock,
  ShieldAlert,
  Receipt,
  FileSpreadsheet,
  GitCompareArrows,
  CheckCircle2,
  XCircle,
  MinusCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useProject } from "@/hooks/useProject";
import {
  useFinancialSummary,
  useCashFlow,
  usePaymentPredictions,
  useDebtAlerts,
  useVarianceAnalysis,
} from "@/hooks/useFinance";
import type { CategoryVariance } from "@/lib/api/finance";
import { exportToExcel } from "@/lib/utils/export";

function fmt(n: number): string {
  return "$" + n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtPeriod(period: string): string {
  const [y, m] = period.split("-");
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${months[Number(m) - 1]} ${y.slice(2)}`;
}

const EXPENSE_LABELS: Record<string, string> = {
  MATERIALS: "Materiales",
  EQUIPMENT: "Equipamiento",
  OVERHEAD: "Gastos generales",
  PERMITS: "Permisos",
  OTHER: "Otros",
};

const PIE_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#22c55e", "#6b7280"];

const SEVERITY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  high: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  medium: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
};

const CONFIDENCE_STYLES: Record<string, { bg: string; text: string }> = {
  high: { bg: "bg-green-50", text: "text-green-700" },
  medium: { bg: "bg-yellow-50", text: "text-yellow-700" },
  none: { bg: "bg-gray-100", text: "text-gray-500" },
};

export default function FinancePage() {
  const { projectId, project } = useProject();
  const [tab, setTab] = useState<"overview" | "cashflow" | "predictions" | "alerts" | "variance">("overview");

  const pid = projectId ?? undefined;
  const { data: fin, isLoading: loadingFin } = useFinancialSummary(pid);
  const { data: cashFlow, isLoading: loadingCF } = useCashFlow(tab === "cashflow" ? pid : undefined);
  const { data: predictions, isLoading: loadingPred } = usePaymentPredictions(tab === "predictions" ? pid : undefined);
  const { data: alertsData, isLoading: loadingAlerts } = useDebtAlerts(tab === "alerts" ? pid : undefined);
  const { data: varianceData, isLoading: loadingVariance } = useVarianceAnalysis(tab === "variance" ? pid : undefined);

  const selectedProject = project;

  const handleExportFinance = useCallback(() => {
    if (!fin || !selectedProject) return;
    const name = selectedProject.name.replace(/[^a-zA-Z0-9_-]/g, "_");
    const sheets = [];

    // Summary sheet
    sheets.push({
      name: "Resumen",
      headers: ["Concepto", "Valor"],
      rows: [
        ["Ingresos estimados", fin.totalRevenue],
        ["Costo partidas", fin.totalCostItems],
        ["Gastos adicionales", fin.totalExpenses],
        ["Costo total", fin.totalCost],
        ["Ganancia bruta", fin.grossProfit],
        ["Margen (%)", fin.profitMargin],
        ["Total pagado", fin.totalPaid],
        ["Pendiente + vencido", fin.totalPending],
        ["Ejecutado real", fin.totalExecuted],
        ["Varianza", fin.costVariance],
        ["Varianza (%)", fin.costVariancePercent],
      ] as (string | number)[][],
    });

    // Top items
    if (fin.topItems.length > 0) {
      sheets.push({
        name: "Rentabilidad",
        headers: ["Partida", "Rubro", "Costo", "Venta", "Ganancia", "Margen %"],
        rows: fin.topItems.map((i) => [
          i.itemName, i.categoryName, i.costSubtotal, i.saleSubtotal, i.grossProfit, i.marginPercent,
        ]),
      });
    }

    // Cash flow
    if (cashFlow?.periods.length) {
      sheets.push({
        name: "Flujo de caja",
        headers: ["Periodo", "Pagado", "Programado", "Predicho", "Acumulado"],
        rows: cashFlow.periods.map((p) => [p.period, p.paid, p.scheduled, p.predicted, p.cumulative]),
      });
    }

    // Predictions
    if (predictions?.predictions.length) {
      sheets.push({
        name: "Predicciones",
        headers: ["Contratista", "Partida", "Sin programar", "Fecha estimada", "Intervalo (días)", "Confianza"],
        rows: predictions.predictions.map((p) => [
          p.contractorName, p.budgetItemName, p.unscheduledBalance,
          p.predictedDate ?? "", p.avgDaysBetweenPayments ?? "", p.confidence,
        ]),
      });
    }

    // Alerts
    if (alertsData?.alerts.length) {
      sheets.push({
        name: "Alertas",
        headers: ["Severidad", "Tipo", "Contratista", "Partida", "Monto", "Mensaje"],
        rows: alertsData.alerts.map((a) => [
          a.severity, a.type, a.contractorName, a.budgetItemName, a.amount, a.message,
        ]),
      });
    }

    // Variance
    if (varianceData?.items.length) {
      sheets.push({
        name: "Variación",
        headers: [
          "Rubro", "Partida", "Unidad", "Cantidad",
          "Costo presupuestado", "Comprometido", "Pagado", "Pendiente",
          "Certificado", "Variación ($)", "Variación (%)", "Estado",
        ],
        rows: varianceData.items.map((i) => [
          i.categoryName, i.itemName, i.unit, i.budgetedQty,
          i.budgetedCost, i.committedPrice, i.paidAmount, i.pendingAmount,
          i.certifiedAmount, i.costVariance, i.costVariancePercent,
          i.status === "over" ? "Sobre presupuesto" : i.status === "under" ? "Bajo presupuesto" : "En línea",
        ]),
      });
    }

    exportToExcel(`Finanzas_${name}`, sheets);
  }, [fin, selectedProject, cashFlow, predictions, alertsData, varianceData]);

  const expensePieData = useMemo(
    () =>
      fin?.expensesByType
        .filter((e) => e.total > 0)
        .map((e) => ({
          name: EXPENSE_LABELS[e.expenseType] ?? e.expenseType,
          value: e.total,
        })) ?? [],
    [fin]
  );

  const isLoading = loadingFin;

  const tabs = [
    { key: "overview" as const, label: "Resumen" },
    { key: "variance" as const, label: "Variación" },
    { key: "cashflow" as const, label: "Flujo de caja" },
    { key: "predictions" as const, label: "Predicciones" },
    { key: "alerts" as const, label: "Alertas" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finanzas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Márgenes, flujo de caja, predicciones y alertas por proyecto
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-end gap-3">
          {fin && (
            <button
              type="button"
              onClick={handleExportFinance}
              className="inline-flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-100 shrink-0"
            >
              <FileSpreadsheet size={16} />
              Exportar Excel
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 overflow-x-auto -mb-px">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === t.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {t.label}
              {t.key === "alerts" && alertsData && (alertsData.criticalCount + alertsData.highCount) > 0 && (
                <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
                  {alertsData.criticalCount + alertsData.highCount}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {isLoading || !projectId ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
          <div className="h-64 rounded-xl bg-gray-100 animate-pulse" />
        </div>
      ) : !fin ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          No se pudieron cargar los datos financieros.
        </div>
      ) : (
        <>
          {/* ── TAB: Overview ──────────────────────────────────────────── */}
          {tab === "overview" && (
            <div className="space-y-6">
              {/* KPI cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                  label="Ingresos estimados"
                  value={fmt(fin.totalRevenue)}
                  icon={<DollarSign size={20} className="text-green-600" />}
                  iconBg="bg-green-50"
                />
                <KpiCard
                  label="Costo total"
                  value={fmt(fin.totalCost)}
                  sub={`Partidas: ${fmt(fin.totalCostItems)} + Gastos: ${fmt(fin.totalExpenses)}`}
                  icon={<Receipt size={20} className="text-blue-600" />}
                  iconBg="bg-blue-50"
                />
                <KpiCard
                  label="Ganancia bruta"
                  value={fmt(fin.grossProfit)}
                  sub={`Margen: ${fin.profitMargin}%`}
                  icon={
                    fin.grossProfit >= 0
                      ? <TrendingUp size={20} className="text-green-600" />
                      : <TrendingDown size={20} className="text-red-600" />
                  }
                  iconBg={fin.grossProfit >= 0 ? "bg-green-50" : "bg-red-50"}
                  valueColor={fin.grossProfit >= 0 ? "text-green-700" : "text-red-700"}
                />
                <KpiCard
                  label="Varianza vs presupuesto"
                  value={fmt(Math.abs(fin.costVariance))}
                  sub={`${fin.costVariancePercent > 0 ? "Bajo" : "Sobre"} presupuesto: ${Math.abs(fin.costVariancePercent)}%`}
                  icon={
                    fin.costVariance >= 0
                      ? <ArrowDownRight size={20} className="text-green-600" />
                      : <ArrowUpRight size={20} className="text-red-600" />
                  }
                  iconBg={fin.costVariance >= 0 ? "bg-green-50" : "bg-red-50"}
                  valueColor={fin.costVariance >= 0 ? "text-green-700" : "text-red-700"}
                />
              </div>

              {/* Execution row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <p className="text-xs text-gray-500 mb-1">Total pagado</p>
                  <p className="text-xl font-bold text-gray-900">{fmt(fin.totalPaid)}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <p className="text-xs text-gray-500 mb-1">Pendiente + vencido</p>
                  <p className="text-xl font-bold text-gray-900">{fmt(fin.totalPending)}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <p className="text-xs text-gray-500 mb-1">Ejecutado real</p>
                  <p className="text-xl font-bold text-gray-900">{fmt(fin.totalExecuted)}</p>
                  <p className="text-xs text-gray-400 mt-1">Pagado + gastos adicionales</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Expenses by type pie */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Gastos por tipo</h3>
                  {expensePieData.length === 0 ? (
                    <p className="text-sm text-gray-500 py-8 text-center">Sin gastos registrados.</p>
                  ) : (
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={expensePieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={48}
                            outerRadius={80}
                            paddingAngle={2}
                          >
                            {expensePieData.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(v) => (typeof v === "number" ? fmt(v) : String(v ?? ""))}
                            contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Top items table */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">
                    Partidas más rentables
                  </h3>
                  {fin.topItems.length === 0 ? (
                    <p className="text-sm text-gray-500 py-8 text-center">Sin datos de rentabilidad.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-gray-500">
                            <th className="pb-2">Partida</th>
                            <th className="pb-2 text-right">Ganancia</th>
                            <th className="pb-2 text-right">Margen</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {fin.topItems.map((item) => (
                            <tr key={item.itemId}>
                              <td className="py-2 text-gray-900 max-w-[200px] truncate">{item.itemName}</td>
                              <td className="py-2 text-right tabular-nums text-green-700">{fmt(item.grossProfit)}</td>
                              <td className="py-2 text-right tabular-nums">{item.marginPercent}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Risk items */}
              {fin.riskItems.length > 0 && (
                <div className="bg-white rounded-xl border border-red-200 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle size={18} className="text-red-500" />
                    <h3 className="text-sm font-semibold text-gray-900">
                      Partidas en riesgo (margen &lt; 10%)
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-gray-500">
                          <th className="pb-2">Partida</th>
                          <th className="pb-2">Rubro</th>
                          <th className="pb-2 text-right">Costo</th>
                          <th className="pb-2 text-right">Venta</th>
                          <th className="pb-2 text-right">Margen</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {fin.riskItems.map((item) => (
                          <tr key={item.itemId}>
                            <td className="py-2 text-gray-900">{item.itemName}</td>
                            <td className="py-2 text-gray-500">{item.categoryName}</td>
                            <td className="py-2 text-right tabular-nums">{fmt(item.costSubtotal)}</td>
                            <td className="py-2 text-right tabular-nums">{fmt(item.saleSubtotal)}</td>
                            <td className={`py-2 text-right tabular-nums font-medium ${item.marginPercent < 0 ? "text-red-600" : "text-yellow-600"}`}>
                              {item.marginPercent}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: Cash Flow ─────────────────────────────────────────── */}
          {tab === "cashflow" && (
            <div className="space-y-6">
              {loadingCF ? (
                <div className="h-80 rounded-xl bg-gray-100 animate-pulse" />
              ) : !cashFlow || cashFlow.periods.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-sm text-gray-500">
                  No hay datos de flujo de caja para este proyecto.
                </div>
              ) : (
                <>
                  {/* Totals */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard
                      label="Total pagado"
                      value={fmt(cashFlow.totals.paid)}
                      icon={<DollarSign size={20} className="text-green-600" />}
                      iconBg="bg-green-50"
                    />
                    <KpiCard
                      label="Programado"
                      value={fmt(cashFlow.totals.scheduled)}
                      icon={<Clock size={20} className="text-blue-600" />}
                      iconBg="bg-blue-50"
                    />
                    <KpiCard
                      label="Predicho"
                      value={fmt(cashFlow.totals.predicted)}
                      icon={<BarChart3 size={20} className="text-purple-600" />}
                      iconBg="bg-purple-50"
                    />
                    <KpiCard
                      label="Sin programar"
                      value={fmt(cashFlow.totals.unscheduledBalance)}
                      icon={<AlertTriangle size={20} className="text-yellow-600" />}
                      iconBg="bg-yellow-50"
                    />
                  </div>

                  {/* Stacked bar chart */}
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">
                      Flujo de caja mensual
                    </h3>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={cashFlow.periods.map((p) => ({ ...p, label: fmtPeriod(p.period) }))}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                          <Tooltip
                            formatter={(v) => (typeof v === "number" ? fmt(v) : String(v ?? ""))}
                            contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                          />
                          <Legend />
                          <Bar dataKey="paid" name="Pagado" fill="#22c55e" stackId="a" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="scheduled" name="Programado" fill="#3b82f6" stackId="a" />
                          <Bar dataKey="predicted" name="Predicho" fill="#a78bfa" stackId="a" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Cumulative area chart */}
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">
                      Acumulado de salidas
                    </h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={cashFlow.periods.map((p) => ({ ...p, label: fmtPeriod(p.period) }))}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                          <Tooltip
                            formatter={(v) => (typeof v === "number" ? fmt(v) : String(v ?? ""))}
                            contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                          />
                          <Area
                            type="monotone"
                            dataKey="cumulative"
                            name="Acumulado"
                            stroke="#3b82f6"
                            fill="#dbeafe"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── TAB: Predictions ───────────────────────────────────────── */}
          {tab === "predictions" && (
            <div className="space-y-6">
              {loadingPred ? (
                <div className="h-64 rounded-xl bg-gray-100 animate-pulse" />
              ) : !predictions || predictions.predictions.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-sm text-gray-500">
                  No hay predicciones de pago para este proyecto.
                </div>
              ) : (
                <>
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <h3 className="text-sm font-semibold text-gray-900">
                        Predicciones de pagos futuros
                      </h3>
                      <p className="text-xs text-gray-500">
                        Total sin programar: <strong>{fmt(predictions.totalUnscheduled)}</strong>
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                            <th className="pb-2 pr-4">Contratista</th>
                            <th className="pb-2 pr-4">Partida</th>
                            <th className="pb-2 pr-4 text-right">Sin programar</th>
                            <th className="pb-2 pr-4">Fecha estimada</th>
                            <th className="pb-2 pr-4 text-right">Intervalo</th>
                            <th className="pb-2">Confianza</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {predictions.predictions.map((p, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="py-2.5 pr-4 text-gray-900 font-medium">{p.contractorName}</td>
                              <td className="py-2.5 pr-4 text-gray-600 max-w-[200px] truncate">{p.budgetItemName}</td>
                              <td className="py-2.5 pr-4 text-right tabular-nums font-medium">{fmt(p.unscheduledBalance)}</td>
                              <td className="py-2.5 pr-4 text-gray-600">
                                {p.predictedDate ?? "—"}
                              </td>
                              <td className="py-2.5 pr-4 text-right tabular-nums text-gray-500">
                                {p.avgDaysBetweenPayments !== null ? `${p.avgDaysBetweenPayments}d` : "—"}
                              </td>
                              <td className="py-2.5">
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CONFIDENCE_STYLES[p.confidence].bg} ${CONFIDENCE_STYLES[p.confidence].text}`}
                                  title={p.confidenceReason}
                                >
                                  {p.confidence === "high" ? "Alta" : p.confidence === "medium" ? "Media" : "Sin datos"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── TAB: Variance ────────────────────────────────────────── */}
          {tab === "variance" && (
            <VarianceTab
              data={varianceData}
              loading={loadingVariance}
              fmt={fmt}
            />
          )}

          {/* ── TAB: Alerts ────────────────────────────────────────────── */}
          {tab === "alerts" && (
            <div className="space-y-6">
              {loadingAlerts ? (
                <div className="h-64 rounded-xl bg-gray-100 animate-pulse" />
              ) : !alertsData || alertsData.alerts.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
                  <ShieldAlert size={40} className="mx-auto text-green-400 mb-3" />
                  <p className="text-sm text-gray-600 font-medium">Sin alertas activas</p>
                  <p className="text-xs text-gray-400 mt-1">No se detectaron problemas financieros.</p>
                </div>
              ) : (
                <>
                  {/* Alert summary */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-red-50 rounded-xl border border-red-200 p-4">
                      <p className="text-xs text-red-600 mb-1">Criticas</p>
                      <p className="text-2xl font-bold text-red-700">{alertsData.criticalCount}</p>
                    </div>
                    <div className="bg-orange-50 rounded-xl border border-orange-200 p-4">
                      <p className="text-xs text-orange-600 mb-1">Altas</p>
                      <p className="text-2xl font-bold text-orange-700">{alertsData.highCount}</p>
                    </div>
                    <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4">
                      <p className="text-xs text-yellow-600 mb-1">Medias</p>
                      <p className="text-2xl font-bold text-yellow-700">{alertsData.mediumCount}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <p className="text-xs text-gray-500 mb-1">Monto en riesgo</p>
                      <p className="text-2xl font-bold text-red-700">{fmt(alertsData.totalAtRisk)}</p>
                    </div>
                  </div>

                  {/* Alert list */}
                  <div className="space-y-3">
                    {alertsData.alerts.map((alert, i) => {
                      const s = SEVERITY_STYLES[alert.severity];
                      return (
                        <div
                          key={i}
                          className={`rounded-xl border p-4 ${s.bg} ${s.border}`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="flex items-start gap-3">
                              <AlertTriangle size={18} className={`${s.text} shrink-0 mt-0.5`} />
                              <div>
                                <p className={`text-sm font-medium ${s.text}`}>
                                  {alert.message}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {alert.type.replace(/_/g, " ")} &middot; {alert.severity}
                                </p>
                              </div>
                            </div>
                            <p className={`text-lg font-bold ${s.text} shrink-0`}>
                              {fmt(alert.amount)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── KPI Card Component ──────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon,
  iconBg,
  valueColor = "text-gray-900",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  iconBg: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${iconBg} shrink-0`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500">{label}</p>
          <p className={`text-lg font-semibold ${valueColor} truncate`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 truncate">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

// ── Variance Tab Component ────────────────────────────────────────────────

const STATUS_STYLES = {
  over: { bg: "bg-red-50", text: "text-red-700", label: "Sobre presupuesto", icon: XCircle },
  on_track: { bg: "bg-green-50", text: "text-green-700", label: "En línea", icon: CheckCircle2 },
  under: { bg: "bg-blue-50", text: "text-blue-700", label: "Bajo presupuesto", icon: MinusCircle },
};

function VarianceTab({
  data,
  loading,
  fmt,
}: {
  data: import("@/lib/api/finance").VarianceAnalysisResult | undefined;
  loading: boolean;
  fmt: (n: number) => string;
}) {
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "over" | "on_track" | "under">("all");

  const toggleCat = useCallback((catId: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    if (!data) return;
    setExpandedCats(new Set(data.categories.map((c) => c.categoryId)));
  }, [data]);

  const collapseAll = useCallback(() => {
    setExpandedCats(new Set());
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-gray-100 animate-pulse" />
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
        <GitCompareArrows size={40} className="mx-auto text-gray-300 mb-3" />
        <p className="text-sm text-gray-600 font-medium">Sin datos de variación</p>
        <p className="text-xs text-gray-400 mt-1">
          Registrá pagos y certificaciones para ver el análisis de variación.
        </p>
      </div>
    );
  }

  const { summary, categories, items } = data;
  const filteredItems = filter === "all" ? items : items.filter((i) => i.status === filter);
  const filteredCats = filter === "all"
    ? categories
    : categories.filter((c) =>
        items.some((i) => i.categoryId === c.categoryId && i.status === filter)
      );

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Costo presupuestado"
          value={fmt(summary.totalBudgetedCost)}
          icon={<DollarSign size={20} className="text-blue-600" />}
          iconBg="bg-blue-50"
        />
        <KpiCard
          label="Comprometido"
          value={fmt(summary.totalCommitted)}
          sub={`${summary.commitVariancePercent > 0 ? "Disponible" : "Excedido"}: ${fmt(Math.abs(summary.commitVariance))}`}
          icon={<Receipt size={20} className="text-purple-600" />}
          iconBg="bg-purple-50"
        />
        <KpiCard
          label="Ejecutado (pagado)"
          value={fmt(summary.totalPaid)}
          sub={`Pendiente: ${fmt(summary.totalPending)}`}
          icon={<DollarSign size={20} className="text-green-600" />}
          iconBg="bg-green-50"
        />
        <KpiCard
          label="Variación total"
          value={fmt(Math.abs(summary.costVariance))}
          sub={`${summary.costVariance >= 0 ? "Bajo" : "Sobre"} presupuesto: ${Math.abs(summary.costVariancePercent)}%`}
          icon={
            summary.costVariance >= 0
              ? <ArrowDownRight size={20} className="text-green-600" />
              : <ArrowUpRight size={20} className="text-red-600" />
          }
          iconBg={summary.costVariance >= 0 ? "bg-green-50" : "bg-red-50"}
          valueColor={summary.costVariance >= 0 ? "text-green-700" : "text-red-700"}
        />
      </div>

      {/* Status distribution */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => setFilter(filter === "over" ? "all" : "over")}
          className={`rounded-xl border p-4 text-left transition-colors cursor-pointer ${
            filter === "over" ? "border-red-400 bg-red-50" : "border-gray-200 bg-white hover:bg-red-50/50"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <XCircle size={16} className="text-red-500" />
            <span className="text-xs text-gray-500">Sobre presupuesto</span>
          </div>
          <p className="text-2xl font-bold text-red-700">{summary.overBudgetItems}</p>
          <p className="text-xs text-gray-400">partidas</p>
        </button>
        <button
          type="button"
          onClick={() => setFilter(filter === "on_track" ? "all" : "on_track")}
          className={`rounded-xl border p-4 text-left transition-colors cursor-pointer ${
            filter === "on_track" ? "border-green-400 bg-green-50" : "border-gray-200 bg-white hover:bg-green-50/50"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 size={16} className="text-green-500" />
            <span className="text-xs text-gray-500">En línea</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{summary.onTrackItems}</p>
          <p className="text-xs text-gray-400">partidas</p>
        </button>
        <button
          type="button"
          onClick={() => setFilter(filter === "under" ? "all" : "under")}
          className={`rounded-xl border p-4 text-left transition-colors cursor-pointer ${
            filter === "under" ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white hover:bg-blue-50/50"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <MinusCircle size={16} className="text-blue-500" />
            <span className="text-xs text-gray-500">Bajo presupuesto</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{summary.underBudgetItems}</p>
          <p className="text-xs text-gray-400">partidas</p>
        </button>
      </div>

      {/* Variance table by category */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">
            Detalle por rubro y partida
            {filter !== "all" && (
              <span className="ml-2 text-xs font-normal text-gray-400">
                (filtrado: {STATUS_STYLES[filter].label})
              </span>
            )}
          </h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={expandAll}
              className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              Expandir todo
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={collapseAll}
              className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              Colapsar todo
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                <th className="py-2.5 px-4">Rubro / Partida</th>
                <th className="py-2.5 px-3 text-right">Presupuestado</th>
                <th className="py-2.5 px-3 text-right">Comprometido</th>
                <th className="py-2.5 px-3 text-right">Pagado</th>
                <th className="py-2.5 px-3 text-right">Pendiente</th>
                <th className="py-2.5 px-3 text-right">Certificado</th>
                <th className="py-2.5 px-3 text-right">Variación</th>
                <th className="py-2.5 px-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredCats.map((cat) => {
                const isExpanded = expandedCats.has(cat.categoryId);
                const catItems = filteredItems.filter((i) => i.categoryId === cat.categoryId);
                return (
                  <CategoryRow
                    key={cat.categoryId}
                    cat={cat}
                    items={catItems}
                    isExpanded={isExpanded}
                    onToggle={() => toggleCat(cat.categoryId)}
                    fmt={fmt}
                  />
                );
              })}
            </tbody>
            {/* Totals footer */}
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold text-gray-900">
                <td className="py-3 px-4">TOTAL</td>
                <td className="py-3 px-3 text-right tabular-nums">{fmt(summary.totalBudgetedCost)}</td>
                <td className="py-3 px-3 text-right tabular-nums">{fmt(summary.totalCommitted)}</td>
                <td className="py-3 px-3 text-right tabular-nums">{fmt(summary.totalPaid)}</td>
                <td className="py-3 px-3 text-right tabular-nums">{fmt(summary.totalPending)}</td>
                <td className="py-3 px-3 text-right tabular-nums">{fmt(summary.totalCertified)}</td>
                <td className={`py-3 px-3 text-right tabular-nums ${summary.costVariance >= 0 ? "text-green-700" : "text-red-700"}`}>
                  {summary.costVariance >= 0 ? "+" : ""}{fmt(summary.costVariance)} ({Math.abs(summary.costVariancePercent)}%)
                </td>
                <td className="py-3 px-3 text-center">—</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Category Row with expandable items ────────────────────────────────────

function CategoryRow({
  cat,
  items,
  isExpanded,
  onToggle,
  fmt,
}: {
  cat: CategoryVariance;
  items: import("@/lib/api/finance").VarianceItem[];
  isExpanded: boolean;
  onToggle: () => void;
  fmt: (n: number) => string;
}) {
  return (
    <>
      {/* Category header row */}
      <tr
        className="bg-gray-50 hover:bg-gray-100 cursor-pointer"
        onClick={onToggle}
      >
        <td className="py-2.5 px-4 font-medium text-gray-900">
          <div className="flex items-center gap-2">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            {cat.categoryName}
            <span className="text-xs text-gray-400 font-normal">({cat.itemCount} partidas)</span>
            {cat.overCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                {cat.overCount} sobre
              </span>
            )}
          </div>
        </td>
        <td className="py-2.5 px-3 text-right tabular-nums font-medium">{fmt(cat.budgetedCost)}</td>
        <td className="py-2.5 px-3 text-right tabular-nums font-medium">{fmt(cat.committedPrice)}</td>
        <td className="py-2.5 px-3 text-right tabular-nums font-medium">{fmt(cat.paidAmount)}</td>
        <td className="py-2.5 px-3 text-right tabular-nums font-medium">{fmt(cat.pendingAmount)}</td>
        <td className="py-2.5 px-3 text-right tabular-nums font-medium">{fmt(cat.certifiedAmount)}</td>
        <td className={`py-2.5 px-3 text-right tabular-nums font-medium ${cat.costVariance >= 0 ? "text-green-700" : "text-red-700"}`}>
          {cat.costVariance >= 0 ? "+" : ""}{fmt(cat.costVariance)}
        </td>
        <td className="py-2.5 px-3 text-center">
          <span className="text-xs text-gray-400">{Math.abs(cat.costVariancePercent)}%</span>
        </td>
      </tr>

      {/* Item detail rows */}
      {isExpanded &&
        items.map((item) => {
          const s = STATUS_STYLES[item.status];
          const Icon = s.icon;
          return (
            <tr key={item.itemId} className="hover:bg-gray-50">
              <td className="py-2 px-4 pl-10 text-gray-700">
                <div className="flex items-center gap-2">
                  <span className="truncate max-w-[250px]">{item.itemName}</span>
                  <span className="text-xs text-gray-400 shrink-0">
                    {item.budgetedQty} {item.unit}
                  </span>
                  {item.progressPercent > 0 && (
                    <span className="text-xs text-gray-400 shrink-0">
                      · {item.progressPercent}% avance
                    </span>
                  )}
                </div>
              </td>
              <td className="py-2 px-3 text-right tabular-nums text-gray-600">{fmt(item.budgetedCost)}</td>
              <td className="py-2 px-3 text-right tabular-nums text-gray-600">{fmt(item.committedPrice)}</td>
              <td className="py-2 px-3 text-right tabular-nums text-gray-600">{fmt(item.paidAmount)}</td>
              <td className="py-2 px-3 text-right tabular-nums text-gray-600">{fmt(item.pendingAmount)}</td>
              <td className="py-2 px-3 text-right tabular-nums text-gray-600">{fmt(item.certifiedAmount)}</td>
              <td className={`py-2 px-3 text-right tabular-nums font-medium ${item.costVariance >= 0 ? "text-green-700" : "text-red-700"}`}>
                {item.costVariance >= 0 ? "+" : ""}{fmt(item.costVariance)}
                <span className="text-xs text-gray-400 ml-1">({Math.abs(item.costVariancePercent)}%)</span>
              </td>
              <td className="py-2 px-3 text-center">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${s.bg} ${s.text}`}
                  title={s.label}
                >
                  <Icon size={12} />
                  <span className="hidden sm:inline">{s.label}</span>
                </span>
              </td>
            </tr>
          );
        })}
    </>
  );
}
