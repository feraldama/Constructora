import { cn } from "@/lib/utils/cn";
import type { ReactNode } from "react";

type BadgeVariant = "success" | "warning" | "danger" | "default";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: "bg-green-50 text-green-700 ring-green-600/20",
  warning: "bg-yellow-50 text-yellow-700 ring-yellow-600/20",
  danger: "bg-red-50 text-red-700 ring-red-600/20",
  default: "bg-gray-50 text-gray-700 ring-gray-600/20",
};

export default function Badge({
  variant = "default",
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
