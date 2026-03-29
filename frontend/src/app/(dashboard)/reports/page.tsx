"use client";

import { useMemo, useCallback } from "react";
import Link from "next/link";
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  CreditCard,
  FolderKanban,
  Calculator,
  LayoutDashboard,
  FileSpreadsheet,
  Printer,
  Receipt,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useProject } from "@/hooks/useProject";
import { useDashboard } from "@/hooks/useDashboard";
import { useProjectBudget } from "@/hooks/useProjectBudget";
import { usePayments } from "@/hooks/usePayments";
import { useExpenses } from "@/hooks/useExpenses";
import { useFinancialSummary } from "@/hooks/useFinance";
import { exportToExcel } from "@/lib/utils/export";

const PIE_COLORS = {
  paid: "#22c55e",
  pending: "#eab308",
  overdue: "#ef4444",
};

function fmt(value: number): string {
  return "$" + value.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function ReportsPage() {
  const { projectId, project } = useProject();

  const { data: dash, isLoading: loadingDash } = useDashboard(projectId ?? undefined);
  const { data: budgetData } = useProjectBudget(projectId ?? undefined);
  const { data: paymentsData } = usePayments(projectId ? { projectId } : undefined);
  const { data: expensesData } = useExpenses(projectId ?? undefined);
  const { data: finSummary } = useFinancialSummary(projectId ?? undefined);

  const selectedProject = project;

  const handleExportExcel = useCallback(() => {
    if (!selectedProject) return;
    const projectName = selectedProject.name.replace(/[^a-zA-Z0-9_-]/g, "_");
    const sheets = [];

    // Sheet 1: Budget
    if (budgetData?.categories) {
      const budgetRows: (string | number)[][] = [];
      for (const cat of budgetData.categories) {
        for (const item of cat.items) {
          budgetRows.push([
            cat.name,
            item.name,
            item.unit,
            item.quantity,
            item.costUnitPrice,
            item.saleUnitPrice,
            item.costSubtotal,
            item.saleSubtotal,
          ]);
        }
      }
      sheets.push({
        name: "Presupuesto",
        headers: ["Rubro", "Partida", "Unidad", "Cantidad", "P.U. Costo", "P.U. Venta", "Subtotal Costo", "Subtotal Venta"],
        rows: budgetRows,
      });
    }

    // Sheet 2: Payments
    if (paymentsData && Array.isArray(paymentsData)) {
      const paymentRows = paymentsData.map((p) => [
        p.contractor?.name ?? "",
        p.description ?? "",
        p.amount,
        p.status,
        p.dueDate ? new Date(p.dueDate).toLocaleDateString("es-AR") : "",
        p.paidAt ? new Date(p.paidAt).toLocaleDateString("es-AR") : "",
        p.invoiceNumber ?? "",
      ]);
      sheets.push({
        name: "Pagos",
        headers: ["Contratista", "Descripción", "Monto", "Estado", "Vencimiento", "Pagado", "Factura"],
        rows: paymentRows,
      });
    }

    // Sheet 3: Expenses
    if (expensesData && expensesData.length > 0) {
      const expenseRows = expensesData.map((e) => [
        new Date(e.expenseDate).toLocaleDateString("es-AR"),
        e.description,
        e.expenseType,
        e.quantity,
        e.unitPrice,
        e.amount,
        e.budgetItemName ?? "",
        e.invoiceRef ?? "",
        e.notes ?? "",
      ]);
      sheets.push({
        name: "Gastos",
        headers: ["Fecha", "Descripción", "Tipo", "Cantidad", "P.U.", "Total", "Partida", "Factura", "Notas"],
        rows: expenseRows,
      });
    }

    // Sheet 4: Financial summary
    if (finSummary) {
      sheets.push({
        name: "Resumen Financiero",
        headers: ["Concepto", "Valor"],
        rows: [
          ["Ingresos estimados", finSummary.totalRevenue],
          ["Costo partidas", finSummary.totalCostItems],
          ["Gastos adicionales", finSummary.totalExpenses],
          ["Costo total", finSummary.totalCost],
          ["Ganancia bruta", finSummary.grossProfit],
          ["Margen (%)", finSummary.profitMargin],
          ["Total pagado", finSummary.totalPaid],
          ["Pendiente", finSummary.totalPending],
          ["Ejecutado real", finSummary.totalExecuted],
          ["Varianza", finSummary.costVariance],
          ["Varianza (%)", finSummary.costVariancePercent],
        ],
      });
    }

    if (sheets.length > 0) {
      exportToExcel(`Reporte_${projectName}`, sheets);
    }
  }, [selectedProject, budgetData, paymentsData, expensesData, finSummary]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

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

  const EXPENSE_LABELS: Record<string, string> = {
    MATERIALS: "Materiales",
    EQUIPMENT: "Equipamiento",
    OVERHEAD: "Gastos generales",
    PERMITS: "Permisos",
    OTHER: "Otros",
  };

  const expenseSummary = useMemo(() => {
    if (!expensesData || expensesData.length === 0) return null;
    let total = 0;
    const byType: Record<string, number> = {};
    const byItem: Record<string, { name: string; total: number }> = {};
    for (const e of expensesData) {
      total += e.amount;
      byType[e.expenseType] = (byType[e.expenseType] ?? 0) + e.amount;
      if (e.budgetItemId && e.budgetItemName) {
        const existing = byItem[e.budgetItemId];
        if (existing) existing.total += e.amount;
        else byItem[e.budgetItemId] = { name: e.budgetItemName, total: e.amount };
      }
    }
    const unlinked = expensesData.filter((e) => !e.budgetItemId).reduce((s, e) => s + e.amount, 0);
    return { total, count: expensesData.length, byType, byItem: Object.values(byItem), unlinked };
  }, [expensesData]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Resumen ejecutivo por proyecto (presupuesto, pagos y avance)
          </p>
        </div>
      </div>

      {!projectId ? (
        <div className="space-y-4">
          <div className="h-40 rounded-xl bg-gray-100 animate-pulse" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
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

            <div className="w-px bg-gray-200 mx-1 hidden sm:block" />

            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-100"
            >
              <FileSpreadsheet size={16} />
              Exportar Excel
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Printer size={16} />
              Imprimir
            </button>
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
                {dash.progress.itemsWithProgress} de {dash.progress.totalItems} partidas con avance
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

          {/* Gastos adicionales */}
          {expenseSummary && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Receipt size={18} className="text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900">Gastos adicionales</h3>
                <span className="text-xs text-gray-400">({expenseSummary.count} registros)</span>
              </div>

              {/* Total + por tipo */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Total gastos</p>
                  <p className="text-lg font-bold text-gray-900">{fmt(expenseSummary.total)}</p>
                </div>
                {Object.entries(expenseSummary.byType).map(([type, amount]) => (
                  <div key={type} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">{EXPENSE_LABELS[type] ?? type}</p>
                    <p className="text-sm font-semibold text-gray-900">{fmt(amount)}</p>
                  </div>
                ))}
              </div>

              {/* Por partida vinculada */}
              {(expenseSummary.byItem.length > 0 || expenseSummary.unlinked > 0) && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Desglose por partida</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="py-2 text-left text-xs font-medium text-gray-500">Partida</th>
                          <th className="py-2 text-right text-xs font-medium text-gray-500">Total gastado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {expenseSummary.byItem.map((item) => (
                          <tr key={item.name}>
                            <td className="py-2 text-gray-900">{item.name}</td>
                            <td className="py-2 text-right tabular-nums font-medium">{fmt(item.total)}</td>
                          </tr>
                        ))}
                        {expenseSummary.unlinked > 0 && (
                          <tr>
                            <td className="py-2 text-gray-500 italic">Sin vincular a partida</td>
                            <td className="py-2 text-right tabular-nums font-medium text-gray-500">{fmt(expenseSummary.unlinked)}</td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-gray-200">
                          <td className="py-2 font-semibold text-gray-900">Total</td>
                          <td className="py-2 text-right tabular-nums font-bold text-gray-900">{fmt(expenseSummary.total)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
