"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Max width class – defaults to max-w-lg */
  className?: string;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  className,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      // Si un componente interno ya consumió el Escape (ej. cerrar el dropdown
      // de un Combobox), no cerramos el modal: se perdería lo cargado.
      if (e.key === "Escape" && !e.defaultPrevented) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    // El overlay scrollea: si el contenido es más alto que la pantalla (mobile,
    // formularios largos) el diálogo se recorre en lugar de quedar fuera del
    // viewport con partes inalcanzables.
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        ref={overlayRef}
        className="flex min-h-full items-center justify-center p-4 cursor-pointer"
        onClick={(e) => {
          if (e.target === overlayRef.current) onClose();
        }}
      >
        <div
          className={cn(
            "relative w-full max-w-lg bg-white rounded-xl shadow-xl animate-in zoom-in-95 duration-150 cursor-default",
            className
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
