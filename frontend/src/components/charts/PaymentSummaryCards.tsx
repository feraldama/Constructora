"use client";

import { DollarSign, Clock, AlertTriangle, XCircle, CalendarClock } from "lucide-react";
import type { DashboardSummary } from "@/lib/api/payments";

interface PaymentSummaryCardsProps {
  summary: DashboardSummary;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

const cards = [
  {
    key: "totalPaid" as const,
    label: "Pagado",
    icon: DollarSign,
    color: "text-green-600",
    bg: "bg-green-50",
  },
  {
    key: "totalPending" as const,
    label: "Pendiente",
    icon: Clock,
    color: "text-yellow-600",
    bg: "bg-yellow-50",
  },
  {
    key: "totalOverdue" as const,
    label: "Vencido",
    icon: AlertTriangle,
    color: "text-red-600",
    bg: "bg-red-50",
  },
  {
    key: "totalCancelled" as const,
    label: "Cancelado",
    icon: XCircle,
    color: "text-gray-500",
    bg: "bg-gray-50",
  },
];

export default function PaymentSummaryCards({
  summary,
}: PaymentSummaryCardsProps) {
  return (
    <div className="space-y-4">
      {/* Tarjetas principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.key}
            className="bg-white rounded-xl border border-gray-200 p-4"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <card.icon size={20} className={card.color} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{card.label}</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(summary[card.key])}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alertas */}
      {(summary.overdueCount > 0 || summary.upcomingDueCount > 0) && (
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          {summary.overdueCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertTriangle size={16} />
              <span>
                <strong>{summary.overdueCount}</strong> pago{summary.overdueCount > 1 ? "s" : ""} vencido{summary.overdueCount > 1 ? "s" : ""}
              </span>
            </div>
          )}
          {summary.upcomingDueCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
              <CalendarClock size={16} />
              <span>
                <strong>{summary.upcomingDueCount}</strong> pago{summary.upcomingDueCount > 1 ? "s" : ""} vence{summary.upcomingDueCount > 1 ? "n" : ""} en 7 dias
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
