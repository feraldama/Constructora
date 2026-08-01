"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'button, [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])';

function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null && !el.hasAttribute("disabled")
  );
}

/**
 * Patrón dialog (WAI-ARIA) para overlays: al activarse, mueve el foco adentro
 * del contenedor; mientras está activo, Tab cicla dentro; al desactivarse,
 * devuelve el foco al elemento que lo abrió.
 *
 * @param active      el overlay está abierto
 * @param containerRef contenedor del trap (panel del modal, drawer, etc.)
 * @param preferredRef zona preferida para el foco inicial (ej. el cuerpo del
 *                     modal, para no arrancar en la X del header). Si no hay
 *                     focuseable ahí, cae al contenedor; si tampoco, al propio
 *                     contenedor (necesita tabIndex={-1}).
 */
export function useFocusTrap(
  active: boolean,
  containerRef: RefObject<HTMLElement | null>,
  preferredRef?: RefObject<HTMLElement | null>
) {
  // Foco inicial + devolución al cerrar
  useEffect(() => {
    if (!active) return;
    const opener = document.activeElement as HTMLElement | null;

    const container = containerRef.current;
    const preferred = preferredRef?.current;
    const target =
      (preferred && focusables(preferred)[0]) ??
      (container && focusables(container)[0]) ??
      container;
    target?.focus();

    return () => {
      if (opener && document.contains(opener)) opener.focus();
    };
    // containerRef/preferredRef son refs estables; solo `active` dispara
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Trap de Tab
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      const container = containerRef.current;
      if (e.key !== "Tab" || !container) return;
      const items = focusables(container);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;

      if (e.shiftKey && (current === first || !container.contains(current))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (current === last || !container.contains(current))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
