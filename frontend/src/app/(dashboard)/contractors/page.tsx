"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  HardHat,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  useContractors,
  useCreateContractor,
  useUpdateContractor,
  useDeleteContractor,
} from "@/hooks/useContractors";
import type { ContractorDetail, ContractorPayload } from "@/lib/api/contractors";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import ContractorForm from "@/components/forms/ContractorForm";

// ---------- Column setup ----------

const columnHelper = createColumnHelper<ContractorDetail>();

// ---------- Page component ----------

export default function ContractorsPage() {
  const router = useRouter();

  // Filters
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ContractorDetail | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContractorDetail | null>(null);

  // Queries & mutations
  const { data, isLoading } = useContractors({
    search: search || undefined,
    isActive: showInactive ? undefined : true,
  });
  const createMutation = useCreateContractor();
  const updateMutation = useUpdateContractor();
  const deleteMutation = useDeleteContractor();

  const contractors = data?.data ?? [];

  // ---------- Handlers ----------

  const handleCreate = useCallback(
    async (payload: ContractorPayload) => {
      await createMutation.mutateAsync(payload);
      setCreateOpen(false);
    },
    [createMutation]
  );

  const handleEdit = useCallback(
    async (payload: ContractorPayload) => {
      if (!editTarget) return;
      await updateMutation.mutateAsync({ id: editTarget.id, data: payload });
      setEditTarget(null);
    },
    [editTarget, updateMutation]
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }, [deleteTarget, deleteMutation]);

  // ---------- Columns ----------

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns = useMemo<ColumnDef<ContractorDetail, any>[]>(
    () => [
      columnHelper.accessor("name", {
        header: "Nombre",
        size: 220,
        cell: (info) => (
          <span className="font-medium text-gray-900">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("contactName", {
        header: "Contacto",
        size: 180,
        cell: (info) => (
          <span className="text-gray-700">{info.getValue() ?? "-"}</span>
        ),
      }),
      columnHelper.accessor("email", {
        header: "Email",
        size: 220,
        cell: (info) => (
          <span className="text-gray-600">{info.getValue() ?? "-"}</span>
        ),
      }),
      columnHelper.accessor("phone", {
        header: "Telefono",
        size: 150,
        cell: (info) => (
          <span className="text-gray-600">{info.getValue() ?? "-"}</span>
        ),
      }),
      columnHelper.accessor("taxId", {
        header: "CUIT",
        size: 150,
        cell: (info) => (
          <span className="text-gray-600 font-mono text-xs">
            {info.getValue() ?? "-"}
          </span>
        ),
      }),
      columnHelper.accessor("isActive", {
        header: "Estado",
        size: 100,
        cell: (info) =>
          info.getValue() ? (
            <Badge variant="success">Activo</Badge>
          ) : (
            <Badge variant="danger">Inactivo</Badge>
          ),
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        size: 90,
        cell: (info) => (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditTarget(info.row.original);
              }}
              className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="Editar"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget(info.row.original);
              }}
              className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Eliminar"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ),
      }),
    ],
    []
  );

  // ---------- Table ----------

  const table = useReactTable({
    data: contractors,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // ---------- Render ----------

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contratistas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona los contratistas y proveedores de tus obras
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={18} />
          Nuevo Contratista
        </button>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
          />
        </div>

        {/* Show inactive toggle */}
        <button
          onClick={() => setShowInactive((v) => !v)}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
            showInactive
              ? "border-blue-200 bg-blue-50 text-blue-700"
              : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
          )}
        >
          {showInactive ? <Eye size={16} /> : <EyeOff size={16} />}
          {showInactive ? "Mostrando inactivos" : "Mostrar inactivos"}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          /* Loading skeleton */
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="h-4 w-40 rounded bg-gray-200 animate-pulse" />
                <div className="h-4 w-32 rounded bg-gray-100 animate-pulse" />
                <div className="h-4 w-44 rounded bg-gray-100 animate-pulse" />
                <div className="h-4 w-28 rounded bg-gray-100 animate-pulse" />
                <div className="h-4 w-28 rounded bg-gray-100 animate-pulse" />
                <div className="h-5 w-16 rounded-full bg-gray-100 animate-pulse" />
              </div>
            ))}
          </div>
        ) : contractors.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="rounded-full bg-gray-100 p-4 mb-4">
              <HardHat size={32} className="text-gray-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              No hay contratistas
            </h3>
            <p className="text-sm text-gray-500 mb-4 max-w-sm">
              {search
                ? `No se encontraron contratistas para "${search}".`
                : "Agrega tu primer contratista para empezar a gestionar pagos y proyectos."}
            </p>
            {!search && (
              <button
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} />
                Nuevo Contratista
              </button>
            )}
          </div>
        ) : (
          /* Data table */
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr
                    key={headerGroup.id}
                    className="bg-gray-50 border-b border-gray-200"
                  >
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        style={{ width: header.getSize() }}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-gray-100">
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() =>
                      router.push(`/contractors/${row.original.id}`)
                    }
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-6 py-3.5 text-sm whitespace-nowrap"
                        style={{ width: cell.column.getSize() }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination info */}
      {data?.pagination && data.pagination.total > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Mostrando {contractors.length} de {data.pagination.total}{" "}
            contratistas
          </span>
        </div>
      )}

      {/* ---------- Create Modal ---------- */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nuevo Contratista"
        className="max-w-2xl"
      >
        <ContractorForm
          onSubmit={handleCreate}
          onCancel={() => setCreateOpen(false)}
          isLoading={createMutation.isPending}
        />
      </Modal>

      {/* ---------- Edit Modal ---------- */}
      <Modal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Editar Contratista"
        className="max-w-2xl"
      >
        {editTarget && (
          <ContractorForm
            initialData={editTarget}
            onSubmit={handleEdit}
            onCancel={() => setEditTarget(null)}
            isLoading={updateMutation.isPending}
          />
        )}
      </Modal>

      {/* ---------- Delete Confirmation ---------- */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar Contratista"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Estas seguro que deseas eliminar a{" "}
            <span className="font-semibold text-gray-900">
              {deleteTarget?.name}
            </span>
            ? El contratista sera marcado como inactivo y podras reactivarlo
            luego.
          </p>
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setDeleteTarget(null)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
