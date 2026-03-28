"use client";

import { useState, useCallback, useEffect } from "react";
import { User, Lock, Check, AlertCircle } from "lucide-react";
import { useProfile, useUpdateProfile, useChangePassword } from "@/hooks/useAccount";
import { useAuth } from "@/hooks/useAuth";
import axios from "axios";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Administrador",
  USER: "Usuario",
};

export default function SettingsPage() {
  const { user: authUser } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const updateMut = useUpdateProfile();
  const passwordMut = useChangePassword();

  // Profile form
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName);
      setLastName(profile.lastName);
    }
  }, [profile]);

  const handleProfileSave = useCallback(async () => {
    setProfileMsg(null);
    try {
      await updateMut.mutateAsync({ firstName, lastName });
      setProfileMsg({ type: "success", text: "Perfil actualizado" });
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.data) {
        setProfileMsg({ type: "error", text: (e.response.data as { error?: string }).error ?? "Error al actualizar" });
      } else {
        setProfileMsg({ type: "error", text: "Error al actualizar" });
      }
    }
  }, [firstName, lastName, updateMut]);

  const handlePasswordChange = useCallback(async () => {
    setPasswordMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "Las contraseñas no coinciden" });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: "error", text: "La nueva contraseña debe tener al menos 6 caracteres" });
      return;
    }

    try {
      await passwordMut.mutateAsync({ currentPassword, newPassword });
      setPasswordMsg({ type: "success", text: "Contraseña actualizada" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.data) {
        setPasswordMsg({ type: "error", text: (e.response.data as { error?: string }).error ?? "Error al cambiar contraseña" });
      } else {
        setPasswordMsg({ type: "error", text: "Error al cambiar contraseña" });
      }
    }
  }, [currentPassword, newPassword, confirmPassword, passwordMut]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded bg-gray-200 animate-pulse" />
        <div className="h-64 rounded-xl bg-gray-100 animate-pulse" />
        <div className="h-48 rounded-xl bg-gray-100 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-500 mt-1">Gestioná tu perfil y seguridad</p>
      </div>

      {/* Profile section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-lg bg-blue-50">
            <User size={20} className="text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Información personal</h2>
            <p className="text-xs text-gray-500">Tus datos de cuenta</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Avatar + role (read-only) */}
          <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-lg font-bold text-blue-700">
              {profile?.firstName[0]}{profile?.lastName[0]}
            </div>
            <div>
              <p className="text-sm text-gray-500">Email: <span className="text-gray-900 font-medium">{profile?.email}</span></p>
              <p className="text-sm text-gray-500">
                Rol: <span className="text-gray-900 font-medium">{ROLE_LABELS[profile?.globalRole ?? "USER"] ?? profile?.globalRole}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {profileMsg && (
            <div
              className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${
                profileMsg.type === "success"
                  ? "bg-green-50 text-green-700 border border-green-100"
                  : "bg-red-50 text-red-700 border border-red-100"
              }`}
            >
              {profileMsg.type === "success" ? <Check size={16} /> : <AlertCircle size={16} />}
              {profileMsg.text}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              disabled={updateMut.isPending || !firstName.trim() || !lastName.trim()}
              onClick={() => void handleProfileSave()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {updateMut.isPending ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>

      {/* Password section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-lg bg-amber-50">
            <Lock size={20} className="text-amber-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Cambiar contraseña</h2>
            <p className="text-xs text-gray-500">Actualizá tu contraseña de acceso</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña actual</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar nueva contraseña</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {passwordMsg && (
            <div
              className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${
                passwordMsg.type === "success"
                  ? "bg-green-50 text-green-700 border border-green-100"
                  : "bg-red-50 text-red-700 border border-red-100"
              }`}
            >
              {passwordMsg.type === "success" ? <Check size={16} /> : <AlertCircle size={16} />}
              {passwordMsg.text}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              disabled={passwordMut.isPending || !currentPassword || !newPassword || !confirmPassword}
              onClick={() => void handlePasswordChange()}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {passwordMut.isPending ? "Cambiando..." : "Cambiar contraseña"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
