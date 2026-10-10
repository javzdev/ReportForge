import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

// Router casero en memoria. Se eligio en lugar de react-router-dom para no anadir
// una dependencia nueva a un MVP de escritorio sin URLs reales que navegar (no hay
// barra de direcciones, historial de navegador real, ni necesidad de deep-linking).
// Un objeto de ruta con "name" + parametros tipados es suficiente y mas simple de
// razonar que configurar un router de navegador dentro de una ventana de Electron.

export type Route =
  | { name: 'dashboard' }
  | { name: 'projects' }
  | { name: 'project-detail'; projectId: string }
  | { name: 'new-report'; projectId?: string; templateId?: string }
  | { name: 'report-editor'; reportId: string }
  | { name: 'report-preview'; reportId: string }
  | { name: 'templates' }
  | { name: 'template-detail'; templateId: string }
  | { name: 'findings' }
  | { name: 'finding-editor'; findingId?: string; projectId?: string; reportId?: string }
  | { name: 'settings' }
  | { name: 'privacy' };

interface RouterContextValue {
  route: Route;
  navigate: (route: Route) => void;
}

const RouterContext = createContext<RouterContextValue | null>(null);

export function RouterProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [route, setRoute] = useState<Route>({ name: 'dashboard' });

  const navigate = useCallback((next: Route) => {
    setRoute(next);
    // Lleva el foco al inicio del contenido principal en cada navegacion, para que
    // usuarios de teclado/lector de pantalla no queden "perdidos" en el punto anterior.
    requestAnimationFrame(() => {
      const main = document.getElementById('main-content');
      main?.focus();
    });
  }, []);

  const value = useMemo(() => ({ route, navigate }), [route, navigate]);

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter(): RouterContextValue {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter debe usarse dentro de RouterProvider');
  return ctx;
}
