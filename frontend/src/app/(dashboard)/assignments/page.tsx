"use client";

import { useState, useMemo } from "react";
import {
  ClipboardList,
  DollarSign,
  Users,
  AlertTriangle,
  Search,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { useProject } from "@/hooks/useProject";
import {
  useProjectContractorStats,
  useProjectItemCosts,
} from "@/hooks/useAssignments";
import type { ContractorFinancialStats, ItemCost } from "@/lib/api/assignments";

function fmt(n: number): string {
  return "$" + n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function AssignmentsPage() {
  const { projectId } = useProject();
  const pid = projectId ?? undefined;

  const { data: contractorStats, isLoading: loadingContractors } = useProjectContractorStats(pid);
  const { data: itemCosts, isLoading: loadingItems } = useProjectItemCosts(pid);

  const [view, setView] = useState<"contractors" | "items">("items");
  const [search, setSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Group items by category
  const groupedItems = useMemo(() => {
    if (!itemCosts) return [];
    const filtered = search
      ? itemCosts.items.filter(
          (i) =>
            i.itemName.toLowerCase().includes(search.toLowerCase()) ||
            i.categoryName.toLowerCase().includes(search.toLowerCase())
        )
      : itemCosts.items;

    const map = new Map<string, { categoryId: string; categoryName: string; items: ItemCost[] }>();
    for (const item of filtered) {
      let group = map.get(item.categoryId);
      if (!group) {
        group = { categoryId: item.categoryId, categoryName: item.categoryName, items: [] };
        map.set(item.categoryId, group);
      }
      group.items.push(item);
    }
    return Array.from(map.values());
  }, [itemCosts, search]);

  const filteredContractors = useMemo(() => {
    if (!contractorStats) return [];
    return search
      ? contractorStats.contractors.filter((c) =>
          c.contractorName.toLowerCase().includes(search.toLowerCase())
        )
      : contractorStats.contractors;
  }, [contractorStats, search]);

  const toggleCategory = (catId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedCategories(new Set(groupedItems.map((g) => g.categoryId)));
  };

  const isLoading = loadingContractors || loadingItems;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Asignaciones</h1>
          <p className="text-sm text-gray-500 mt-1">
            Partidas asignadas a contratistas del proyecto activo
          </p>
        </div>
      </div>

      {isLoading || !projectId ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
          <div className="h-64 rounded-xl bg-gray-100 animate-pulse" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          {contractorStats && itemCosts && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                label="Total comprometido"
                value={fmt(contractorStats.totalAgreed)}
                icon={<DollarSign size={20} className="text-blue-600" />}
                bg="bg-blue-50"
              />
              <KpiCard
                label="Total pagado"
                value={fmt(contractorStats.totalPaid)}
                sub={`${contractorStats.totalAgreed > 0 ? Math.round((contractorStats.totalPaid / contractorStats.totalAgreed) * 100) : 0}% ejecutado`}
                icon={<DollarSign size={20} className="text-green-600" />}
                bg="bg-green-50"
              />
              <KpiCard
                label="Contratistas activos"
                value={String(contractorStats.contractors.length)}
                sub={`${itemCosts.items.filter((i) => i.contractorCount > 0).length} partidas asignadas`}
                icon={<Users size={20} className="text-purple-600" />}
                bg="bg-purple-50"
              />
              <KpiCard
                label="Deuda vencida"
                value={fmt(contractorStats.totalOverdue)}
                icon={<AlertTriangle size={20} className={contractorStats.totalOverdue > 0 ? "text-red-600" : "text-gray-400"} />}
                bg={contractorStats.totalOverdue > 0 ? "bg-red-50" : "bg-gray-50"}
                valueColor={contractorStats.totalOverdue > 0 ? "text-red-700" : "text-gray-900"}
              />
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex rounded-lg border border-gray-200 bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => setView("items")}
                className={`px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
                  view === "items"
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                Por partida
              </button>
              <button
                type="button"
                onClick={() => setView("contractors")}
                className={`px-4 py-2 text-sm font-medium transition-colors cursor-pointer border-l border-gray-200 ${
                  view === "contractors"
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                Por contratista
              </button>
            </div>
            <div className="relative w-full sm:w-auto">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={view === "items" ? "Buscar partida o rubro..." : "Buscar contratista..."}
                className="w-full sm:w-72 pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
          </div>

          {/* Items view */}
          {view === "items" && itemCosts && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <ClipboardList size={16} className="text-gray-400" />
                  Asignaciones por partida
                </h3>
                <div className="flex gap-2 text-xs">
                  <button type="button" onClick={expandAll} className="text-blue-600 hover:text-blue-800 cursor-pointer">
                    Expandir todo
                  </button>
                  <span className="text-gray-300">|</span>
                  <button type="button" onClick={() => setExpandedCategories(new Set())} className="text-blue-600 hover:text-blue-800 cursor-pointer">
                    Colapsar todo
                  </button>
                </div>
              </div>

              {groupedItems.length === 0 ? (
                <div className="p-10 text-center text-sm text-gray-500">
                  {search ? "Sin resultados para la búsqueda." : "No hay partidas en este proyecto."}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                        <th className="py-2.5 px-4">Rubro / Partida</th>
                        <th className="py-2.5 px-3 text-right">Presupuestado</th>
                        <th className="py-2.5 px-3 text-right">Contratado</th>
                        <th className="py-2.5 px-3 text-right">Pagado</th>
                        <th className="py-2.5 px-3 text-right">Pendiente</th>
                        <th className="py-2.5 px-3 text-right">Varianza</th>
                        <th className="py-2.5 px-3 text-center">Contratistas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {groupedItems.map((group) => {
                        const isExpanded = expandedCategories.has(group.categoryId);
                        const catBudgeted = group.items.reduce((s, i) => s + i.budgetedCost, 0);
                        const catContracted = group.items.reduce((s, i) => s + i.totalContracted, 0);
                        const catPaid = group.items.reduce((s, i) => s + i.totalPaid, 0);
                        const catPending = group.items.reduce((s, i) => s + i.totalPending, 0);
                        const catVariance = catBudgeted - catContracted;

                        return (
                          <ItemCategoryGroup
                            key={group.categoryId}
                            categoryName={group.categoryName}
                            items={group.items}
                            isExpanded={isExpanded}
                            onToggle={() => toggleCategory(group.categoryId)}
                            catBudgeted={catBudgeted}
                            catContracted={catContracted}
                            catPaid={catPaid}
                            catPending={catPending}
                            catVariance={catVariance}
                            fmt={fmt}
                          />
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Contractors view */}
          {view === "contractors" && contractorStats && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Users size={16} className="text-gray-400" />
                  Resumen por contratista
                </h3>
              </div>

              {filteredContractors.length === 0 ? (
                <div className="p-10 text-center text-sm text-gray-500">
                  {search ? "Sin resultados para la búsqueda." : "No hay contratistas asignados en este proyecto."}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                        <th className="py-2.5 px-4">Contratista</th>
                        <th className="py-2.5 px-3 text-center">Partidas</th>
                        <th className="py-2.5 px-3 text-right">Acordado</th>
                        <th className="py-2.5 px-3 text-right">Pagado</th>
                        <th className="py-2.5 px-3 text-right">Pendiente</th>
                        <th className="py-2.5 px-3 text-right">Vencido</th>
                        <th className="py-2.5 px-3 text-right">Restante</th>
                        <th className="py-2.5 px-3">Ejecución</th>
                        <th className="py-2.5 px-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredContractors.map((c) => (
                        <ContractorRow key={c.contractorId} contractor={c} fmt={fmt} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon,
  bg,
  valueColor = "text-gray-900",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  bg: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${bg} shrink-0`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500">{label}</p>
          <p className={`text-lg font-semibold ${valueColor} truncate`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 truncate">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

// ── Item Category Group ───────────────────────────────────────────────────

function ItemCategoryGroup({
  categoryName,
  items,
  isExpanded,
  onToggle,
  catBudgeted,
  catContracted,
  catPaid,
  catPending,
  catVariance,
  fmt,
}: {
  categoryName: string;
  items: ItemCost[];
  isExpanded: boolean;
  onToggle: () => void;
  catBudgeted: number;
  catContracted: number;
  catPaid: number;
  catPending: number;
  catVariance: number;
  fmt: (n: number) => string;
}) {
  return (
    <>
      <tr className="bg-gray-50 hover:bg-gray-100 cursor-pointer" onClick={onToggle}>
        <td className="py-2.5 px-4 font-medium text-gray-900">
          <div className="flex items-center gap-2">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            {categoryName}
            <span className="text-xs text-gray-400 font-normal">({items.length})</span>
          </div>
        </td>
        <td className="py-2.5 px-3 text-right tabular-nums font-medium">{fmt(catBudgeted)}</td>
        <td className="py-2.5 px-3 text-right tabular-nums font-medium">{fmt(catContracted)}</td>
        <td className="py-2.5 px-3 text-right tabular-nums font-medium">{fmt(catPaid)}</td>
        <td className="py-2.5 px-3 text-right tabular-nums font-medium">{fmt(catPending)}</td>
        <td className={`py-2.5 px-3 text-right tabular-nums font-medium ${catVariance >= 0 ? "text-green-700" : "text-red-700"}`}>
          {catVariance >= 0 ? "+" : ""}{fmt(catVariance)}
        </td>
        <td className="py-2.5 px-3 text-center">—</td>
      </tr>
      {isExpanded &&
        items.map((item) => {
          const unassigned = item.contractorCount === 0;
          return (
            <tr key={item.itemId} className={`hover:bg-gray-50 ${unassigned ? "bg-yellow-50/30" : ""}`}>
              <td className="py-2 px-4 pl-10 text-gray-700">
                <div className="flex items-center gap-2">
                  <span className="truncate max-w-[250px]">{item.itemName}</span>
                  <span className="text-xs text-gray-400 shrink-0">
                    {item.quantity} {item.unit}
                  </span>
                  {unassigned && (
                    <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-medium text-yellow-700">
                      Sin asignar
                    </span>
                  )}
                </div>
              </td>
              <td className="py-2 px-3 text-right tabular-nums text-gray-600">{fmt(item.budgetedCost)}</td>
              <td className="py-2 px-3 text-right tabular-nums text-gray-600">{fmt(item.totalContracted)}</td>
              <td className="py-2 px-3 text-right tabular-nums text-gray-600">{fmt(item.totalPaid)}</td>
              <td className="py-2 px-3 text-right tabular-nums text-gray-600">{fmt(item.totalPending)}</td>
              <td className={`py-2 px-3 text-right tabular-nums ${item.costVariance >= 0 ? "text-green-700" : "text-red-700"}`}>
                {item.costVariance >= 0 ? "+" : ""}{fmt(item.costVariance)}
              </td>
              <td className="py-2 px-3 text-center">
                <span className={`text-xs font-medium ${item.contractorCount > 0 ? "text-blue-600" : "text-gray-400"}`}>
                  {item.contractorCount}
                </span>
              </td>
            </tr>
          );
        })}
    </>
  );
}

// ── Contractor Row ────────────────────────────────────────────────────────

function ContractorRow({
  contractor: c,
  fmt,
}: {
  contractor: ContractorFinancialStats;
  fmt: (n: number) => string;
}) {
  const pct = c.paidPercent;
  return (
    <tr className="hover:bg-gray-50">
      <td className="py-3 px-4">
        <p className="font-medium text-gray-900">{c.contractorName}</p>
        {c.email && <p className="text-xs text-gray-400">{c.email}</p>}
      </td>
      <td className="py-3 px-3 text-center">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
          {c.assignmentCount}
        </span>
      </td>
      <td className="py-3 px-3 text-right tabular-nums font-medium">{fmt(c.totalAgreed)}</td>
      <td className="py-3 px-3 text-right tabular-nums text-green-700">{fmt(c.totalPaid)}</td>
      <td className="py-3 px-3 text-right tabular-nums text-yellow-700">{fmt(c.totalPending)}</td>
      <td className={`py-3 px-3 text-right tabular-nums ${c.totalOverdue > 0 ? "text-red-700 font-medium" : "text-gray-400"}`}>
        {c.totalOverdue > 0 ? fmt(c.totalOverdue) : "—"}
      </td>
      <td className="py-3 px-3 text-right tabular-nums">{fmt(c.balanceRemaining)}</td>
      <td className="py-3 px-3">
        <div className="flex items-center gap-2 min-w-[100px]">
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <span className="text-xs tabular-nums text-gray-500 w-8 text-right">{pct}%</span>
        </div>
      </td>
      <td className="py-3 px-3">
        <Link
          href={`/contractors/${c.contractorId}`}
          className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors inline-flex cursor-pointer"
          title="Ver detalle"
        >
          <ExternalLink size={15} />
        </Link>
      </td>
    </tr>
  );
}
