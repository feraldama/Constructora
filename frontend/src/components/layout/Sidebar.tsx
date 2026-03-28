"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Calculator,
  HardHat,
  CreditCard,
  BarChart3,
  Bell,
  Receipt,
  TrendingUp,
  History,
  Users,
  ShieldCheck,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useUnreadCount } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Proyectos", href: "/projects", icon: FolderKanban },
  { name: "Computo Metrico", href: "/budget", icon: Calculator },
  { name: "Contratistas", href: "/contractors", icon: HardHat },
  { name: "Pagos", href: "/payments", icon: CreditCard },
  { name: "Gastos", href: "/expenses", icon: Receipt },
  { name: "Finanzas", href: "/finance", icon: TrendingUp },
  { name: "Reportes", href: "/reports", icon: BarChart3 },
  { name: "Actividad", href: "/activity", icon: History },
  { name: "Equipo", href: "/members", icon: Users },
];

const adminNav = [
  { name: "Usuarios", href: "/admin/users", icon: ShieldCheck },
];

const bottomNav = [
  { name: "Configuración", href: "/settings", icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: unreadCount } = useUnreadCount();
  const { user } = useAuth();

  const isGlobalAdmin = user?.globalRole === "SUPER_ADMIN" || user?.globalRole === "ADMIN";

  const navContent = (
    <>
      <div className="mb-8 px-2 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">BuildControl</h1>
          <p className="text-xs text-gray-500 mt-1">Gestion de Obras</p>
        </div>
        {/* Botón cerrar — solo visible en mobile */}
        <button
          onClick={onClose}
          className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          aria-label="Cerrar menú"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="space-y-1 flex-1">
        {navigation.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <item.icon size={20} />
              {item.name}
            </Link>
          );
        })}

        <Link
          href="/notifications"
          onClick={onClose}
          className={cn(
            "flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            pathname?.startsWith("/notifications")
              ? "bg-blue-50 text-blue-700"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          )}
        >
          <div className="flex items-center gap-3">
            <Bell size={20} />
            Notificaciones
          </div>
          {unreadCount != null && unreadCount > 0 && (
            <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-red-500 rounded-full">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>

        {/* Admin section */}
        {isGlobalAdmin && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Admin</p>
            </div>
            {adminNav.map((item) => {
              const isActive = pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <item.icon size={20} />
                  {item.name}
                </Link>
              );
            })}
          </>
        )}

        {/* Bottom section */}
        <div className="pt-4 pb-1 px-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Cuenta</p>
        </div>
        {bottomNav.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <item.icon size={20} />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <>
      {/* ── Desktop: sidebar estático ── */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 h-screen overflow-y-auto px-4 py-6 flex-col shrink-0">
        {navContent}
      </aside>

      {/* ── Mobile: overlay drawer ── */}
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity md:hidden cursor-pointer",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-white px-4 py-6 flex flex-col shadow-xl transition-transform duration-300 md:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {navContent}
      </aside>
    </>
  );
}
