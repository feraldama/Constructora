"use client";

import { useState, useCallback } from "react";
import {
  Users,
  Search,
  ShieldCheck,
  Shield,
  UserCircle,
  ToggleLeft,
  ToggleRight,
  FolderKanban,
} from "lucide-react";
import { useUsers, useUpdateUserRole, useUpdateUserStatus } from "@/hooks/useUsers";
import { useAuth } from "@/hooks/useAuth";
import type { GlobalRole } from "@/types";
import type { AdminUser } from "@/lib/api/users";
import Modal from "@/components/ui/Modal";

const ROLE_LABELS: Record<GlobalRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Administrador",
  USER: "Usuario",
};

const ROLE_ICONS: Record<GlobalRole, React.ReactNode> = {
  SUPER_ADMIN: <ShieldCheck size={16} className="text-purple-600" />,
  ADMIN: <Shield size={16} className="text-blue-600" />,
  USER: <UserCircle size={16} className="text-gray-500" />,
};

const ROLE_COLORS: Record<GlobalRole, string> = {
  SUPER_ADMIN: "bg-purple-50 text-purple-700",
  ADMIN: "bg-blue-50 text-blue-700",
  USER: "bg-gray-100 text-gray-600",
};

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<GlobalRole | "">("");
  const [statusFilter, setStatusFilter] = useState<"" | "true" | "false">("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useUsers({
    page,
    limit: 20,
    search: search || undefined,
    role: roleFilter || undefined,
    isActive: statusFilter === "" ? undefined : statusFilter === "true",
  });

  const users = data?.data ?? [];
  const pagination = data?.pagination;

  const rolesMut = useUpdateUserRole();
  const statusMut = useUpdateUserStatus();

  // Role change confirmation
  const [roleTarget, setRoleTarget] = useState<{ user: AdminUser; role: GlobalRole } | null>(null);
  const [statusTarget, setStatusTarget] = useState<AdminUser | null>(null);

  const isSuperAdmin = currentUser?.globalRole === "SUPER_ADMIN";

  const handleRoleChange = useCallback(
    async (userId: string, globalRole: GlobalRole) => {
      try {
        await rolesMut.mutateAsync({ id: userId, globalRole });
        setRoleTarget(null);
      } catch {
        // error handled by mutation
      }
    },
    [rolesMut]
  );

  const handleStatusToggle = useCallback(
    async (userId: string, isActive: boolean) => {
      try {
        await statusMut.mutateAsync({ id: userId, isActive });
        setStatusTarget(null);
      } catch {
        // error handled by mutation
      }
    },
    [statusMut]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Administración de usuarios</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gestioná roles globales y estado de las cuentas
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value as GlobalRole | "");
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm w-full sm:w-auto"
        >
          <option value="">Todos los roles</option>
          <option value="SUPER_ADMIN">Super Admin</option>
          <option value="ADMIN">Administrador</option>
          <option value="USER">Usuario</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as "" | "true" | "false");
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm w-full sm:w-auto"
        >
          <option value="">Todos los estados</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
      </div>

      {/* Stats */}
      {pagination && (
        <p className="text-xs text-gray-500">
          {pagination.total} usuario{pagination.total !== 1 ? "s" : ""} encontrado{pagination.total !== 1 ? "s" : ""}
        </p>
      )}

      {/* Users list */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="divide-y divide-gray-100">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 rounded bg-gray-200 animate-pulse" />
                  <div className="h-3 w-28 rounded bg-gray-100 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="rounded-full bg-gray-100 p-4 mb-4">
              <Users size={32} className="text-gray-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Sin resultados</h3>
            <p className="text-sm text-gray-500">No se encontraron usuarios con esos filtros.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="px-6 py-3 font-medium text-gray-500">Usuario</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Rol global</th>
                  <th className="px-6 py-3 font-medium text-gray-500 text-center">Proyectos</th>
                  <th className="px-6 py-3 font-medium text-gray-500 text-center">Estado</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Registro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      {/* User info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700">
                            {u.firstName[0]}{u.lastName[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {u.firstName} {u.lastName}
                              {isSelf && <span className="text-xs text-gray-400 ml-2">(vos)</span>}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4">
                        {isSuperAdmin && !isSelf ? (
                          <select
                            value={u.globalRole}
                            onChange={(e) =>
                              setRoleTarget({ user: u, role: e.target.value as GlobalRole })
                            }
                            className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                          >
                            <option value="SUPER_ADMIN">Super Admin</option>
                            <option value="ADMIN">Administrador</option>
                            <option value="USER">Usuario</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${ROLE_COLORS[u.globalRole]}`}
                          >
                            {ROLE_ICONS[u.globalRole]}
                            {ROLE_LABELS[u.globalRole]}
                          </span>
                        )}
                      </td>

                      {/* Projects count */}
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1.5 text-gray-600">
                          <FolderKanban size={14} className="text-gray-400" />
                          {u._count.projectMembers}
                        </span>
                      </td>

                      {/* Status toggle */}
                      <td className="px-6 py-4 text-center">
                        {isSuperAdmin && !isSelf ? (
                          <button
                            type="button"
                            onClick={() => setStatusTarget(u)}
                            className="inline-flex items-center gap-1.5 cursor-pointer"
                            title={u.isActive ? "Desactivar" : "Activar"}
                          >
                            {u.isActive ? (
                              <ToggleRight size={24} className="text-green-500" />
                            ) : (
                              <ToggleLeft size={24} className="text-gray-400" />
                            )}
                            <span className={`text-xs font-medium ${u.isActive ? "text-green-600" : "text-gray-500"}`}>
                              {u.isActive ? "Activo" : "Inactivo"}
                            </span>
                          </button>
                        ) : (
                          <span className={`text-xs font-medium ${u.isActive ? "text-green-600" : "text-gray-500"}`}>
                            {u.isActive ? "Activo" : "Inactivo"}
                          </span>
                        )}
                      </td>

                      {/* Created */}
                      <td className="px-6 py-4 text-gray-500 text-xs whitespace-nowrap">
                        {new Date(u.createdAt).toLocaleDateString("es-AR")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="text-sm text-gray-500">
            Página {page} de {pagination.totalPages}
          </span>
          <button
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      )}

      {/* Role change confirmation */}
      <Modal
        isOpen={!!roleTarget}
        onClose={() => setRoleTarget(null)}
        title="Cambiar rol global"
      >
        {roleTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              ¿Cambiar el rol de{" "}
              <strong className="text-gray-900">
                {roleTarget.user.firstName} {roleTarget.user.lastName}
              </strong>{" "}
              a <strong className="text-gray-900">{ROLE_LABELS[roleTarget.role]}</strong>?
            </p>
            {roleTarget.role === "SUPER_ADMIN" && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                El rol Super Admin otorga acceso total al sistema.
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRoleTarget(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={rolesMut.isPending}
                onClick={() => void handleRoleChange(roleTarget.user.id, roleTarget.role)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {rolesMut.isPending ? "Guardando..." : "Confirmar"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Status toggle confirmation */}
      <Modal
        isOpen={!!statusTarget}
        onClose={() => setStatusTarget(null)}
        title={statusTarget?.isActive ? "Desactivar usuario" : "Activar usuario"}
      >
        {statusTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {statusTarget.isActive ? (
                <>
                  ¿Desactivar a{" "}
                  <strong className="text-gray-900">
                    {statusTarget.firstName} {statusTarget.lastName}
                  </strong>
                  ? No podrá iniciar sesión.
                </>
              ) : (
                <>
                  ¿Reactivar a{" "}
                  <strong className="text-gray-900">
                    {statusTarget.firstName} {statusTarget.lastName}
                  </strong>
                  ? Podrá volver a iniciar sesión.
                </>
              )}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStatusTarget(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={statusMut.isPending}
                onClick={() =>
                  void handleStatusToggle(statusTarget.id, !statusTarget.isActive)
                }
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                  statusTarget.isActive
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {statusMut.isPending
                  ? "Guardando..."
                  : statusTarget.isActive
                  ? "Desactivar"
                  : "Activar"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
