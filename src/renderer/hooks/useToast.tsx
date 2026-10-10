import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

interface Toast {
  id: string;
  kind: 'success' | 'error' | 'info';
  message: string;
}

interface ToastContextValue {
  showToast: (kind: Toast['kind'], message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// Notificaciones efimeras (toasts) para confirmaciones rapidas (ej. "Exportado con exito",
// "Adjunto eliminado"). Los errores que requieren accion del usuario se muestran ademas
// como Banner inline persistente en el formulario correspondiente, nunca solo como toast.
export function ToastProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((kind: Toast['kind'], message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4500);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.kind}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx;
}
