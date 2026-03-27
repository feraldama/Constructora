"use client";

import { useRef, useCallback, useEffect } from "react";

/**
 * Retorna una función debounced que retrasa la ejecución `delay` ms.
 * Si se llama de nuevo antes del timeout, se reinicia el timer.
 * Se limpia automáticamente al desmontar.
 */
export function useDebouncedCallback<T extends (...args: never[]) => void>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);

  // Mantener referencia actualizada sin re-crear la función
  callbackRef.current = callback;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  );
}
