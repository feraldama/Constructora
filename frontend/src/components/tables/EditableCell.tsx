"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils/cn";

export interface CellCoord {
  rowIndex: number;
  colId: string;
}

interface EditableCellProps {
  value: string | number;
  type?: "text" | "number";
  disabled?: boolean;
  className?: string;
  /** Llamada con el valor final al salir de la celda o tras debounce */
  onSave: (value: string | number) => void;
  /** Coordenadas para navegación por teclado */
  coord?: CellCoord;
  /** Callback para navegar a otra celda */
  onNavigate?: (from: CellCoord, direction: "up" | "down" | "left" | "right") => void;
  /** Formato de display (ej: moneda) */
  formatDisplay?: (value: string | number) => string;
  placeholder?: string;
}

export default function EditableCell({
  value: initialValue,
  type = "text",
  disabled = false,
  className,
  onSave,
  coord,
  onNavigate,
  formatDisplay,
  placeholder = "Click para editar",
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState<string>(String(initialValue));
  const inputRef = useRef<HTMLInputElement>(null);

  // Sincronizar con cambios externos
  useEffect(() => {
    if (!isEditing) {
      setLocalValue(String(initialValue));
    }
  }, [initialValue, isEditing]);

  // Focus + select al entrar en edición
  useEffect(() => {
    if (isEditing) {
      // requestAnimationFrame asegura que el input ya está en el DOM
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [isEditing]);

  const commitValue = useCallback(() => {
    const finalValue = type === "number" ? Number(localValue) || 0 : localValue;
    if (finalValue !== initialValue) {
      onSave(finalValue);
    }
    setIsEditing(false);
  }, [localValue, initialValue, type, onSave]);

  const cancelEdit = useCallback(() => {
    setLocalValue(String(initialValue));
    setIsEditing(false);
  }, [initialValue]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "Enter":
        e.preventDefault();
        commitValue();
        // Mover abajo después de Enter
        if (coord && onNavigate) onNavigate(coord, "down");
        break;

      case "Escape":
        e.preventDefault();
        cancelEdit();
        break;

      case "Tab":
        // Tab natural del browser: commit y dejar que el foco se mueva
        commitValue();
        if (coord && onNavigate) {
          e.preventDefault();
          onNavigate(coord, e.shiftKey ? "left" : "right");
        }
        break;

      case "ArrowUp":
        if (type === "number") {
          e.preventDefault();
          commitValue();
          if (coord && onNavigate) onNavigate(coord, "up");
        }
        break;

      case "ArrowDown":
        if (type === "number") {
          e.preventDefault();
          commitValue();
          if (coord && onNavigate) onNavigate(coord, "down");
        }
        break;
    }
  };

  // ─── Modo deshabilitado ───
  if (disabled) {
    const displayValue = formatDisplay
      ? formatDisplay(initialValue)
      : type === "number"
        ? Number(initialValue).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : String(initialValue);

    return (
      <div
        className={cn(
          "px-3 py-2 text-gray-500 bg-gray-50/80 tabular-nums select-none",
          className
        )}
      >
        {displayValue}
      </div>
    );
  }

  // ─── Modo edición ───
  if (isEditing) {
    return (
      <input
        ref={inputRef}
        data-row={coord?.rowIndex}
        data-col={coord?.colId}
        type={type}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={commitValue}
        onKeyDown={handleKeyDown}
        step={type === "number" ? "any" : undefined}
        className={cn(
          "w-full px-3 py-2 border-2 border-blue-500 rounded-sm outline-none bg-white text-sm tabular-nums",
          "ring-2 ring-blue-200",
          className
        )}
      />
    );
  }

  // ─── Modo display ───
  const displayValue = formatDisplay
    ? formatDisplay(initialValue)
    : type === "number"
      ? Number(initialValue).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : initialValue;

  const isEmpty = !initialValue && initialValue !== 0;

  return (
    <div
      tabIndex={0}
      data-row={coord?.rowIndex}
      data-col={coord?.colId}
      onClick={() => setIsEditing(true)}
      onFocus={() => setIsEditing(true)}
      onKeyDown={(e) => {
        // Entrar en edición con Enter, Space, o cualquier tecla alfanumérica
        if (e.key === "Enter" || e.key === " " || (e.key.length === 1 && !e.ctrlKey && !e.metaKey)) {
          e.preventDefault();
          setIsEditing(true);
          // Si es una tecla alfanumérica, empezar con ese carácter
          if (e.key.length === 1 && e.key !== " ") {
            setLocalValue(e.key);
          }
        }
        // Navegación sin entrar en edición
        if (coord && onNavigate) {
          if (e.key === "ArrowUp") { e.preventDefault(); onNavigate(coord, "up"); }
          if (e.key === "ArrowDown") { e.preventDefault(); onNavigate(coord, "down"); }
          if (e.key === "ArrowLeft") { e.preventDefault(); onNavigate(coord, "left"); }
          if (e.key === "ArrowRight") { e.preventDefault(); onNavigate(coord, "right"); }
          if (e.key === "Tab") { e.preventDefault(); onNavigate(coord, e.shiftKey ? "left" : "right"); }
        }
      }}
      className={cn(
        "px-3 py-2 cursor-cell rounded-sm text-sm tabular-nums transition-colors",
        "hover:bg-blue-50 focus:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-300",
        isEmpty && "text-gray-400 italic",
        className
      )}
    >
      {isEmpty ? placeholder : displayValue}
    </div>
  );
}
