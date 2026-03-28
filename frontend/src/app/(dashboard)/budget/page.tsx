"use client";

import Link from "next/link";
import { Calculator, ChevronRight } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";

export default function BudgetProjectPickerPage() {
  const { data, isLoading } = useProjects({ page: 1, limit: 100 });
  const projects = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cómputo métrico</h1>
        <p className="text-sm text-gray-500 mt-1">
          Elegí un proyecto para ver y editar el presupuesto por partidas
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm divide-y divide-gray-100">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-lg bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">
            No tenés proyectos asignados. Creá uno en{" "}
            <Link href="/projects" className="text-blue-600 font-medium hover:underline">
              Proyectos
            </Link>
            .
          </div>
        ) : (
          projects.map((p) => (
            <Link
              key={p.id}
              href={`/budget/${p.id}`}
              className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                  <Calculator size={20} />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{p.name}</p>
                  {p.address && (
                    <p className="text-sm text-gray-500 truncate">{p.address}</p>
                  )}
                </div>
              </div>
              <ChevronRight
                size={20}
                className="text-gray-400 group-hover:text-gray-600 shrink-0"
              />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
