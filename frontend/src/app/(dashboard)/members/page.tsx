"use client";

import { useState, useCallback } from "react";
import {
  Users,
  Plus,
  Trash2,
  Shield,
  ShieldCheck,
  Eye,
} from "lucide-react";
import { useProject } from "@/hooks/useProject";
import { useAuth } from "@/hooks/useAuth";
import {
  useMembers,
  useAddMember,
  useUpdateMemberRole,
  useRemoveMember,
} from "@/hooks/useMembers";
import type { ProjectRole } from "@/types";
import type { ProjectMemberDTO } from "@/lib/api/members";
import Modal from "@/components/ui/Modal";
import axios from "axios";

const ROLE_LABELS: Record<ProjectRole, string> = {
  ADMIN: "Administrador",
  EDITOR: "Editor",
  VIEWER: "Lector",
};

const ROLE_ICONS: Record<ProjectRole, React.ReactNode> = {
  ADMIN: <ShieldCheck size={16} className="text-blue-600" />,
  EDITOR: <Shield size={16} className="text-green-600" />,
  VIEWER: <Eye size={16} className="text-gray-500" />,
};

const ROLE_COLORS: Record<ProjectRole, string> = {
  ADMIN: "bg-blue-50 text-blue-700",
  EDITOR: "bg-green-50 text-green-700",
  VIEWER: "bg-gray-100 text-gray-600",
};

export default function MembersPage() {
  const { user: currentUser } = useAuth();
  const { projectId } = useProject();

  const pid = projectId ?? undefined;
  const { data: members, isLoading: loadingMembers } = useMembers(pid);
  const addMut = useAddMember(pid);
  const updateRoleMut = useUpdateMemberRole(pid);
  const removeMut = useRemoveMember(pid);

  // Current user's role in this project
  const myMembership = members?.find((m) => m.user.id === currentUser?.id);
  const isAdmin = myMembership?.role === "ADMIN";

  // Add member modal
  const [addOpen, setAddOpen] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState<ProjectRole>("VIEWER");
  const [addError, setAddError] = useState("");

  // Remove confirmation
  const [removeTarget, setRemoveTarget] = useState<ProjectMemberDTO | null>(null);
  const [removeError, setRemoveError] = useState("");

  const handleAdd = useCallback(async () => {
    if (!addEmail.trim()) return;
    setAddError("");
    try {
      await addMut.mutateAsync({ email: addEmail.trim(), role: addRole });
      setAddOpen(false);
      setAddEmail("");
      setAddRole("VIEWER");
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.data) {
        setAddError((e.response.data as { error?: string }).error ?? "Error al agregar miembro");
      } else {
        setAddError("Error al agregar miembro");
      }
    }
  }, [addEmail, addRole, addMut]);

  const handleRoleChange = useCallback(
    async (memberId: string, role: ProjectRole) => {
      try {
        await updateRoleMut.mutateAsync({ memberId, role });
      } catch {
        // ignore — UI shows current role from cache
      }
    },
    [updateRoleMut]
  );

  const handleRemove = useCallback(async () => {
    if (!removeTarget) return;
    setRemoveError("");
    try {
      await removeMut.mutateAsync(removeTarget.id);
      setRemoveTarget(null);
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.data) {
        setRemoveError((e.response.data as { error?: string }).error ?? "Error al eliminar miembro");
      } else {
        setRemoveError("Error al eliminar miembro");
      }
    }
  }, [removeTarget, removeMut]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Miembros del proyecto</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestioná quién tiene acceso y qué rol cumple en cada proyecto
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              setAddError("");
              setAddOpen(true);
            }}
            disabled={!projectId}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm shrink-0 disabled:opacity-50"
          >
            <Plus size={18} />
            Agregar miembro
          </button>
        )}
      </div>

      {/* Members list */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {loadingMembers || !projectId ? (
          <div className="divide-y divide-gray-100">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 rounded bg-gray-200 animate-pulse" />
                  <div className="h-3 w-28 rounded bg-gray-100 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : !members || members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="rounded-full bg-gray-100 p-4 mb-4">
              <Users size={32} className="text-gray-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Sin miembros</h3>
            <p className="text-sm text-gray-500">Este proyecto no tiene miembros configurados.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {members.map((member) => {
              const isSelf = member.user.id === currentUser?.id;
              return (
                <div
                  key={member.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  {/* Avatar */}
                  <div className="shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700">
                    {member.user.firstName[0]}{member.user.lastName[0]}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {member.user.firstName} {member.user.lastName}
                      {isSelf && <span className="text-xs text-gray-400 ml-2">(vos)</span>}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{member.user.email}</p>
                  </div>

                  {/* Role selector / badge */}
                  <div className="flex items-center gap-2">
                    {isAdmin && !isSelf ? (
                      <select
                        value={member.role}
                        onChange={(e) =>
                          void handleRoleChange(member.id, e.target.value as ProjectRole)
                        }
                        disabled={updateRoleMut.isPending}
                        className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50"
                      >
                        <option value="ADMIN">Administrador</option>
                        <option value="EDITOR">Editor</option>
                        <option value="VIEWER">Lector</option>
                      </select>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${ROLE_COLORS[member.role]}`}
                      >
                        {ROLE_ICONS[member.role]}
                        {ROLE_LABELS[member.role]}
                      </span>
                    )}

                    {isAdmin && !isSelf && (
                      <button
                        type="button"
                        title="Quitar del proyecto"
                        onClick={() => {
                          setRemoveError("");
                          setRemoveTarget(member);
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add member modal */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Agregar miembro">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email del usuario *
            </label>
            <input
              type="email"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="usuario@ejemplo.com"
            />
            <p className="text-xs text-gray-400 mt-1">
              El usuario debe estar registrado en BuildControl
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
            <select
              value={addRole}
              onChange={(e) => setAddRole(e.target.value as ProjectRole)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="ADMIN">Administrador — acceso total</option>
              <option value="EDITOR">Editor — puede crear y editar</option>
              <option value="VIEWER">Lector — solo lectura</option>
            </select>
          </div>
          {addError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {addError}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!addEmail.trim() || addMut.isPending}
              onClick={() => void handleAdd()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {addMut.isPending ? "Agregando..." : "Agregar"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Remove confirmation */}
      <Modal
        isOpen={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        title="Quitar miembro"
      >
        {removeTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              ¿Quitar a <strong className="text-gray-900">
                {removeTarget.user.firstName} {removeTarget.user.lastName}
              </strong> ({removeTarget.user.email}) del proyecto?
            </p>
            {removeError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {removeError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRemoveTarget(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={removeMut.isPending}
                onClick={() => void handleRemove()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {removeMut.isPending ? "Quitando..." : "Quitar del proyecto"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
