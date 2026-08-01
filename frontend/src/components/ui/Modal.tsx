"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useFocusTrap } from "@/hooks/useFocusTrap";

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
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

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

  // Patrón dialog (WAI-ARIA): foco inicial en el cuerpo, Tab cicla dentro del
  // panel, y al cerrar el foco vuelve al elemento que abrió el modal.
  useFocusTrap(isOpen, panelRef, bodyRef);

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
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className={cn(
            "relative w-full max-w-lg bg-white rounded-xl shadow-xl animate-in zoom-in-95 duration-150 cursor-default focus:outline-none",
            className
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 id={titleId} className="text-lg font-semibold text-gray-900">
              {title}
            </h2>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="touch-hit p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          {/* Body */}
          <div ref={bodyRef} className="px-6 py-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
