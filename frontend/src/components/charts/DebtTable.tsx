"use client";

import type { ContractorDebt } from "@/lib/api/payments";

interface DebtTableProps {
  debts: ContractorDebt[];
}

function formatCurrency(value: number): string {
  return "$" + value.toLocaleString("es-AR", { minimumFractionDigits: 2 });
}

function getBarColor(remaining: number, totalAgreed: number): string {
  if (totalAgreed === 0) return "bg-gray-200";
  const ratio = remaining / totalAgreed;
  if (ratio > 0.5) return "bg-green-500";
  if (ratio > 0.2) return "bg-yellow-500";
  return "bg-red-500";
}

export default function DebtTable({ debts }: DebtTableProps) {
  if (debts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No hay contratistas con asignaciones en este proyecto
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-medium text-gray-500">Contratista</th>
            <th className="text-right py-3 px-4 font-medium text-gray-500">Acordado</th>
            <th className="text-right py-3 px-4 font-medium text-gray-500">Pagado</th>
            <th className="text-right py-3 px-4 font-medium text-gray-500">Pendiente</th>
            <th className="text-right py-3 px-4 font-medium text-gray-500">Restante</th>
            <th className="py-3 px-4 font-medium text-gray-500 w-32">Avance</th>
          </tr>
        </thead>
        <tbody>
          {debts.map((debt) => {
            const paidPercent =
              debt.totalAgreed > 0
                ? Math.round((debt.totalPaid / debt.totalAgreed) * 100)
                : 0;

            return (
              <tr key={debt.contractorId} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium text-gray-900">
                  {debt.contractorName}
                </td>
                <td className="py-3 px-4 text-right text-gray-600">
                  {formatCurrency(debt.totalAgreed)}
                </td>
                <td className="py-3 px-4 text-right text-green-600 font-medium">
                  {formatCurrency(debt.totalPaid)}
                </td>
                <td className="py-3 px-4 text-right text-yellow-600">
                  {formatCurrency(debt.totalPending)}
                </td>
                <td className="py-3 px-4 text-right font-semibold text-gray-900">
                  {formatCurrency(debt.remaining)}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getBarColor(debt.remaining, debt.totalAgreed)}`}
                        style={{ width: `${Math.min(paidPercent, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right">
                      {paidPercent}%
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
