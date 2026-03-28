"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
} from "@tanstack/react-table";
import { Plus, Search, FolderKanban, Calculator, Trash2 } from "lucide-react";
import axios from "axios";
import { useProjects, useCreateProject, useDeleteProject } from "@/hooks/useProjects";
import type { ProjectListItem } from "@/lib/api/projects";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";

const STATUS_BADGE: Record<
  string,
  { label: string; variant: "success" | "warning" | "danger" | "default" }
> = {
  PLANNING: { label: "Planificación", variant: "default" },
  IN_PROGRESS: { label: "En obra", variant: "success" },
  ON_HOLD: { label: "En pausa", variant: "warning" },
  COMPLETED: { label: "Finalizado", variant: "default" },
  CANCELLED: { label: "Cancelado", variant: "danger" },
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  EDITOR: "Editor",
  VIEWER: "Lector",
};

function fmtMoney(n: number): string {
  return "$" + n.toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

const columnHelper = createColumnHelper<ProjectListItem>();

export default function ProjectsPage() {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formBudget, setFormBudget] = useState("");

  const { data, isLoading } = useProjects({
    search: search || undefined,
    page: 1,
    limit: 50,
  });
  const createMutation = useCreateProject();
  const deleteMutation = useDeleteProject();

  const [deleteTarget, setDeleteTarget] = useState<ProjectListItem | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const projects = data?.data ?? [];

  const handleCreate = useCallback(async () => {
    if (!formName.trim()) return;
    const budget = formBudget.trim() ? Number(formBudget.replace(/\./g, "").replace(",", ".")) : undefined;
    await createMutation.mutateAsync({
      name: formName.trim(),
      description: formDescription.trim() || undefined,
      address: formAddress.trim() || undefined,
      initialBudget: budget !== undefined && !Number.isNaN(budget) ? budget : undefined,
    });
    setCreateOpen(false);
    setFormName("");
    setFormDescription("");
    setFormAddress("");
    setFormBudget("");
  }, [createMutation, formName, formDescription, formAddress, formBudget]);

  const confirmDeleteProject = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteError("");
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.data && typeof e.response.data === "object") {
        const msg = (e.response.data as { error?: string }).error;
        if (msg) setDeleteError(msg);
        else setDeleteError("No se pudo eliminar el proyecto.");
      } else {
        setDeleteError("No se pudo eliminar el proyecto.");
      }
    }
  }, [deleteTarget, deleteMutation]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns = useMemo<ColumnDef<ProjectListItem, any>[]>(
    () => [
      columnHelper.accessor("name", {
        header: "Proyecto",
        size: 260,
        cell: (info) => (
          <span className="font-medium text-gray-900">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("address", {
        header: "Ubicación",
        size: 220,
        cell: (info) => (
          <span className="text-gray-600 truncate max-w-[220px] block">
            {info.getValue() ?? "—"}
          </span>
        ),
      }),
      columnHelper.accessor("status", {
        header: "Estado",
        size: 130,
        cell: (info) => {
          const s = info.getValue();
          const b = STATUS_BADGE[s] ?? { label: s, variant: "default" as const };
          return <Badge variant={b.variant}>{b.label}</Badge>;
        },
      }),
      columnHelper.accessor("initialBudget", {
        header: "Presup. inicial",
        size: 130,
        cell: (info) => (
          <span className="text-gray-700 tabular-nums">{fmtMoney(info.getValue())}</span>
        ),
      }),
      columnHelper.accessor("role", {
        header: "Tu rol",
        size: 100,
        cell: (info) => (
          <span className="text-gray-600 text-sm">
            {info.getValue() ? ROLE_LABEL[info.getValue()!] ?? info.getValue() : "—"}
          </span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        size: 168,
        cell: (info) => (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              href={`/budget/${info.row.original.id}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              <Calculator size={14} />
              Cómputo
            </Link>
            {info.row.original.canDelete && (
              <button
                type="button"
                title="Eliminar proyecto (solo si está vacío)"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteError("");
                  setDeleteTarget(info.row.original);
                }}
                className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-white p-1.5 text-red-600 hover:bg-red-50"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        ),
      }),
    ],
    []
  );

  const table = useReactTable({
    data: projects,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proyectos</h1>
          <p className="text-sm text-gray-500 mt-1">
            Obras a las que tenés acceso según tu membresía
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={18} />
          Nuevo proyecto
        </button>
      </div>

      <div className="relative max-w-md">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre..."
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="h-4 w-48 rounded bg-gray-200 animate-pulse" />
                <div className="h-4 w-40 rounded bg-gray-100 animate-pulse" />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="rounded-full bg-gray-100 p-4 mb-4">
              <FolderKanban size={32} className="text-gray-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Sin proyectos</h3>
            <p className="text-sm text-gray-500 mb-4 max-w-sm">
              {search
                ? `No hay resultados para "${search}".`
                : "Creá un proyecto o pedí acceso a un equipo existente."}
            </p>
            {!search && (
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus size={16} />
                Nuevo proyecto
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="bg-gray-50 border-b border-gray-200">
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        style={{ width: header.getSize() }}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-gray-100">
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-6 py-3.5 text-sm"
                        style={{ width: cell.column.getSize() }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteError("");
        }}
        title="Eliminar proyecto"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              ¿Eliminar el proyecto <strong className="text-gray-900">{deleteTarget.name}</strong>? Solo
              podés hacerlo si no hay pagos, contratistas vinculados, partidas de presupuesto ni adjuntos.
              Las categorías vacías del cómputo se borran junto con el proyecto.
            </p>
            {deleteError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {deleteError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteError("");
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => void confirmDeleteProject()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Eliminando…" : "Eliminar definitivamente"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Nuevo proyecto">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Ej. Edificio Norte"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (opcional)</label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección (opcional)</label>
            <input
              type="text"
              value={formAddress}
              onChange={(e) => setFormAddress(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Presupuesto inicial (opcional)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={formBudget}
              onChange={(e) => setFormBudget(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="0"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!formName.trim() || createMutation.isPending}
              onClick={() => void handleCreate()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isPending ? "Guardando…" : "Crear"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
