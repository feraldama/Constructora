"use client";

import { useState } from "react";
import {
  Bell,
  BellOff,
  CheckCheck,
  AlertTriangle,
  Clock,
  TrendingUp,
  Info,
  CreditCard,
} from "lucide-react";
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
} from "@/hooks/useNotifications";
import type { Notification } from "@/lib/api/notifications";
import { cn } from "@/lib/utils/cn";

// ─── Helpers ─────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  string,
  { icon: typeof Bell; color: string; bg: string; label: string }
> = {
  PAYMENT_OVERDUE: {
    icon: AlertTriangle,
    color: "text-red-600",
    bg: "bg-red-50",
    label: "Pago vencido",
  },
  PAYMENT_DUE: {
    icon: Clock,
    color: "text-yellow-600",
    bg: "bg-yellow-50",
    label: "Pago por vencer",
  },
  PROJECT_UPDATE: {
    icon: TrendingUp,
    color: "text-orange-600",
    bg: "bg-orange-50",
    label: "Presupuesto",
  },
  ASSIGNMENT_CREATED: {
    icon: CreditCard,
    color: "text-blue-600",
    bg: "bg-blue-50",
    label: "Asignacion",
  },
  GENERAL: {
    icon: Info,
    color: "text-gray-600",
    bg: "bg-gray-50",
    label: "General",
  },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days}d`;
  return new Date(dateStr).toLocaleDateString("es-AR");
}

// ─── Componente de notificación individual ───────────────────────────

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
}) {
  const config = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG.GENERAL;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex items-start gap-4 px-5 py-4 border-b border-gray-100 transition-colors",
        !notification.isRead
          ? "bg-blue-50/30 hover:bg-blue-50/50"
          : "hover:bg-gray-50/50"
      )}
    >
      {/* Icono */}
      <div className={`p-2 rounded-lg shrink-0 ${config.bg}`}>
        <Icon size={18} className={config.color} />
      </div>

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3
                className={cn(
                  "text-sm",
                  !notification.isRead ? "font-semibold text-gray-900" : "font-medium text-gray-700"
                )}
              >
                {notification.title}
              </h3>
              {!notification.isRead && (
                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
              )}
            </div>
            <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
              {notification.message}
            </p>
          </div>
          <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
            {timeAgo(notification.createdAt)}
          </span>
        </div>

        {/* Metadata tags */}
        <div className="flex items-center gap-2 mt-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
            {config.label}
          </span>
          {!notification.isRead && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkRead(notification.id);
              }}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Marcar como leida
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useNotifications({
    unreadOnly: showUnreadOnly,
    page,
  });
  const markReadMutation = useMarkAsRead();
  const markAllMutation = useMarkAllAsRead();

  const notifications = data?.data ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notificaciones</h1>
          <p className="text-sm text-gray-500 mt-1">
            {unreadCount > 0
              ? `${unreadCount} sin leer`
              : "Todas leidas"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Filtro no leídas */}
          <button
            onClick={() => {
              setShowUnreadOnly(!showUnreadOnly);
              setPage(1);
            }}
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors",
              showUnreadOnly
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            )}
          >
            {showUnreadOnly ? <BellOff size={16} /> : <Bell size={16} />}
            {showUnreadOnly ? "Sin leer" : "Todas"}
          </button>

          {/* Marcar todas como leídas */}
          {unreadCount > 0 && (
            <button
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-50"
            >
              <CheckCheck size={16} />
              Marcar todas como leidas
            </button>
          )}
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/3 bg-gray-100 rounded animate-pulse" />
                  <div className="h-3 w-full bg-gray-50 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16">
            <Bell size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">
              {showUnreadOnly
                ? "No hay notificaciones sin leer"
                : "No hay notificaciones"}
            </p>
          </div>
        ) : (
          <>
            {notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onMarkRead={(id) => markReadMutation.mutate(id)}
              />
            ))}

            {/* Paginación */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200">
                <span className="text-sm text-gray-500">
                  {pagination.total} notificacion{pagination.total !== 1 ? "es" : ""}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-700">
                    {page} / {pagination.totalPages}
                  </span>
                  <button
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
