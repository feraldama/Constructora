"use client";

import {
  DollarSign,
  TrendingUp,
  Clock,
  AlertTriangle,
  Activity,
  CreditCard,
  BarChart3,
  CalendarClock,
} from "lucide-react";
import { useDashboard } from "@/hooks/useDashboard";
import Badge from "@/components/ui/Badge";
import type { ProjectDashboard } from "@/lib/api/dashboard";

// TODO: Usar projectId real del contexto de proyecto seleccionado
const PROJECT_ID = "demo-project";

const ACTION_LABELS: Record<string, string> = {
  CREATE_PAYMENT: "Nuevo pago registrado",
  UPDATE_PAYMENT: "Pago actualizado",
  DELETE_PAYMENT: "Pago eliminado",
  CREATE_CONTRACTOR: "Contratista creado",
  UPDATE_CONTRACTOR: "Contratista actualizado",
  DELETE_CONTRACTOR: "Contratista desactivado",
  CREATE_BUDGET_CATEGORY: "Rubro de presupuesto creado",
  DELETE_BUDGET_CATEGORY: "Rubro de presupuesto eliminado",
  CREATE_BUDGET_ITEM: "Partida creada",
  UPDATE_BUDGET_ITEM: "Partida actualizada",
  DELETE_BUDGET_ITEM: "Partida eliminada",
};

const STATUS_BADGE: Record<string, { label: string; variant: "success" | "warning" | "danger" | "default" }> = {
  PAID: { label: "Pagado", variant: "success" },
  PENDING: { label: "Pendiente", variant: "warning" },
  OVERDUE: { label: "Vencido", variant: "danger" },
  CANCELLED: { label: "Cancelado", variant: "default" },
};

function fmt(value: number): string {
  return "$" + value.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}

// ─── Componentes internos ────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  bgColor,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  sub?: string;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${bgColor}`}>
          <Icon size={22} className={color} />
        </div>
      </div>
    </div>
  );
}

function ProgressRing({ percent }: { percent: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const color = percent >= 75 ? "#22c55e" : percent >= 40 ? "#eab308" : "#3b82f6";

  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="8" />
        <circle
          cx="60" cy="60" r={radius} fill="none"
          stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-gray-900">{percent}%</span>
        <span className="text-xs text-gray-500">avance</span>
      </div>
    </div>
  );
}

function BudgetBar({ data }: { data: ProjectDashboard["budget"] }) {
  const executedPct = data.estimated > 0 ? (data.executed / data.estimated) * 100 : 0;
  const pendingPct = data.estimated > 0 ? ((data.committed - data.executed) / data.estimated) * 100 : 0;

  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="text-gray-500">Presupuesto estimado</span>
        <span className="font-semibold text-gray-900">{fmt(data.estimated)}</span>
      </div>
      <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex">
        <div
          className="bg-green-500 transition-all duration-500"
          style={{ width: `${Math.min(executedPct, 100)}%` }}
          title={`Ejecutado: ${fmt(data.executed)}`}
        />
        <div
          className="bg-yellow-400 transition-all duration-500"
          style={{ width: `${Math.min(pendingPct, 100 - executedPct)}%` }}
          title={`Pendiente/Vencido: ${fmt(data.committed - data.executed)}`}
        />
      </div>
      <div className="flex justify-between text-xs mt-2 text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
          Ejecutado {fmt(data.executed)}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          Comprometido {fmt(data.committed - data.executed)}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-200" />
          Restante {fmt(data.remaining)}
        </div>
      </div>
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: dash, isLoading } = useDashboard(PROJECT_ID);

  if (isLoading || !dash) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
          <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Resumen del proyecto activo</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={DollarSign}
          label="Total Pagado"
          value={fmt(dash.payments.totalPaid)}
          sub={`${dash.payments.countPaid} pagos`}
          color="text-green-600"
          bgColor="bg-green-50"
        />
        <StatCard
          icon={Clock}
          label="Pendiente"
          value={fmt(dash.payments.totalPending)}
          sub={`${dash.payments.countPending} pagos`}
          color="text-yellow-600"
          bgColor="bg-yellow-50"
        />
        <StatCard
          icon={AlertTriangle}
          label="Vencido"
          value={fmt(dash.payments.totalOverdue)}
          sub={`${dash.payments.countOverdue} pagos`}
          color="text-red-600"
          bgColor="bg-red-50"
        />
        <StatCard
          icon={TrendingUp}
          label="Ejecucion"
          value={`${dash.budget.executionPercent}%`}
          sub={`${fmt(dash.budget.executed)} de ${fmt(dash.budget.estimated)}`}
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
      </div>

      {/* Alertas */}
      {(dash.payments.countOverdue > 0 || dash.payments.countUpcoming7d > 0) && (
        <div className="flex gap-3">
          {dash.payments.countOverdue > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertTriangle size={16} />
              <strong>{dash.payments.countOverdue}</strong> pago{dash.payments.countOverdue > 1 ? "s" : ""} vencido{dash.payments.countOverdue > 1 ? "s" : ""}
            </div>
          )}
          {dash.payments.countUpcoming7d > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
              <CalendarClock size={16} />
              <strong>{dash.payments.countUpcoming7d}</strong> pago{dash.payments.countUpcoming7d > 1 ? "s vencen" : " vence"} en 7 dias
            </div>
          )}
        </div>
      )}

      {/* Presupuesto + Avance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Barra de presupuesto */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-gray-400" />
            <h2 className="font-semibold text-gray-900">Presupuesto estimado vs ejecutado</h2>
          </div>
          <BudgetBar data={dash.budget} />
        </div>

        {/* Avance de obra */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={18} className="text-gray-400" />
            <h2 className="font-semibold text-gray-900">Avance de obra</h2>
          </div>
          <ProgressRing percent={dash.progress.percent} />
          <p className="text-center text-xs text-gray-500 mt-3">
            {dash.progress.itemsWithPayments} de {dash.progress.totalItems} partidas con pagos realizados
          </p>
        </div>
      </div>

      {/* Últimos pagos + Actividad */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Últimos pagos */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={18} className="text-gray-400" />
            <h2 className="font-semibold text-gray-900">Ultimos pagos</h2>
          </div>
          {dash.recentPayments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Sin pagos registrados</p>
          ) : (
            <div className="space-y-3">
              {dash.recentPayments.map((p) => {
                const badge = STATUS_BADGE[p.status] ?? STATUS_BADGE.PENDING;
                return (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {p.contractorName}
                      </p>
                      <p className="text-xs text-gray-400">
                        {fmtDate(p.createdAt)}
                        {p.description && ` — ${p.description}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-3">
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                      <span className="text-sm font-semibold text-gray-900 tabular-nums w-24 text-right">
                        {fmt(p.amount)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Últimos movimientos */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={18} className="text-gray-400" />
            <h2 className="font-semibold text-gray-900">Ultimos movimientos</h2>
          </div>
          {dash.recentActivity.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Sin actividad registrada</p>
          ) : (
            <div className="space-y-3">
              {dash.recentActivity.map((a) => (
                <div key={a.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      {ACTION_LABELS[a.action] ?? a.action}
                    </p>
                    <p className="text-xs text-gray-400">
                      {a.userName ?? "Sistema"} — {fmtDate(a.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
