"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { ChevronDown, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ComboboxProps {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  /** Permite usar un valor que no está en `options` (lo escribe el usuario). Default true. */
  allowCustom?: boolean;
  /** Texto en el footer cuando no hay coincidencia. Default: "Crear «{q}»" */
  createLabel?: (query: string) => string;
  emptyLabel?: string;
  className?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

/**
 * Combobox accesible con Tailwind. Permite buscar dentro de una lista y, si
 * `allowCustom`, también escribir un valor libre que no aparece en `options`.
 *
 * Navegación de teclado: ↑/↓ resalta · Enter selecciona · Esc cierra.
 */
export default function Combobox({
  value,
  onChange,
  options,
  placeholder,
  allowCustom = true,
  createLabel = (q) => `Crear «${q}»`,
  emptyLabel = "Sin coincidencias",
  className,
  autoFocus,
  disabled,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();

  // Mantener query sincronizado si el value externo cambia (ej. reset del form)
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Cerrar al hacer click afuera
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  const exactMatch = useMemo(
    () => options.some((o) => o.toLowerCase() === query.trim().toLowerCase()),
    [options, query]
  );

  // Reset del highlight cuando cambian los filtrados
  useEffect(() => {
    setHighlight(0);
  }, [filtered.length, open]);

  // Auto-scroll del highlight para mantenerlo visible
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLLIElement>(
      `[data-idx="${highlight}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  const showCreateOption = allowCustom && query.trim().length > 0 && !exactMatch;
  const totalItems = filtered.length + (showCreateOption ? 1 : 0);

  const commit = (v: string) => {
    onChange(v);
    setQuery(v);
    setOpen(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      setHighlight((h) => Math.min(h + 1, Math.max(0, totalItems - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) setOpen(true);
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      if (!open) return;
      e.preventDefault();
      if (highlight < filtered.length) {
        commit(filtered[highlight]!);
      } else if (showCreateOption) {
        commit(query.trim());
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
      }
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (allowCustom) onChange(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          disabled={disabled}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-9 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            setOpen((o) => !o);
            inputRef.current?.focus();
          }}
          className="absolute inset-y-0 right-0 flex items-center px-2 text-gray-400 hover:text-gray-600 cursor-pointer"
          aria-label={open ? "Cerrar" : "Abrir"}
        >
          <ChevronDown
            size={16}
            className={cn("transition-transform", open && "rotate-180")}
          />
        </button>
      </div>

      {open && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg ring-1 ring-black/5 py-1 text-sm"
        >
          {filtered.length === 0 && !showCreateOption && (
            <li className="px-3 py-2 text-gray-400">{emptyLabel}</li>
          )}
          {filtered.map((opt, idx) => {
            const isSelected = opt === value;
            const isHighlighted = idx === highlight;
            return (
              <li
                key={opt}
                role="option"
                aria-selected={isSelected}
                data-idx={idx}
                onMouseEnter={() => setHighlight(idx)}
                onMouseDown={(e) => {
                  // mousedown para que el click ocurra antes del blur del input
                  e.preventDefault();
                  commit(opt);
                }}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 cursor-pointer text-gray-700",
                  isHighlighted && "bg-blue-50 text-blue-900",
                  isSelected && "font-medium"
                )}
              >
                <Check
                  size={14}
                  className={cn(
                    "shrink-0",
                    isSelected ? "text-blue-600" : "opacity-0"
                  )}
                />
                <span className="truncate">{opt}</span>
              </li>
            );
          })}
          {showCreateOption && (
            <li
              role="option"
              aria-selected={false}
              data-idx={filtered.length}
              onMouseEnter={() => setHighlight(filtered.length)}
              onMouseDown={(e) => {
                e.preventDefault();
                commit(query.trim());
              }}
              className={cn(
                "flex items-center gap-2 px-3 py-2 cursor-pointer border-t border-gray-100 text-emerald-700",
                highlight === filtered.length && "bg-emerald-50"
              )}
            >
              <Plus size={14} className="shrink-0" />
              <span className="truncate">{createLabel(query.trim())}</span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
