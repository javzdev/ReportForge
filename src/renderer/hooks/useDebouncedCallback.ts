import { useEffect, useMemo, useRef } from 'react';

// Debounce generico para guardado automatico: retrasa la ejecucion del callback hasta que
// pasen `delayMs` sin nuevas llamadas. Se usa en el editor de reportes para no llamar a
// reports.save() en cada tecla, sino ~1-2s despues de que el usuario deja de escribir.
export function useDebouncedCallback<T extends (...args: never[]) => void>(callback: T, delayMs: number): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    []
  );

  return useMemo(() => {
    const debounced = (...args: Parameters<T>): void => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delayMs);
    };
    return debounced as T;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delayMs]);
}
