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
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useUnreadCount } from "@/hooks/useNotifications";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Proyectos", href: "/projects", icon: FolderKanban },
  { name: "Computo Metrico", href: "/budget", icon: Calculator },
  { name: "Contratistas", href: "/contractors", icon: HardHat },
  { name: "Pagos", href: "/payments", icon: CreditCard },
  { name: "Reportes", href: "/reports", icon: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: unreadCount } = useUnreadCount();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen px-4 py-6 flex flex-col">
      <div className="mb-8 px-2">
        <h1 className="text-xl font-bold text-gray-900">BuildControl</h1>
        <p className="text-xs text-gray-500 mt-1">Gestion de Obras</p>
      </div>

      <nav className="space-y-1 flex-1">
        {navigation.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
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

        {/* Notificaciones con badge */}
        <Link
          href="/notifications"
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
      </nav>
    </aside>
  );
}
