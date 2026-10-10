import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AppSettings } from '@shared/types';
import { getErrorMessage } from '../lib/errors';

type ThemePreference = AppSettings['theme'];
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(resolved: ResolvedTheme): void {
  document.documentElement.setAttribute('data-theme', resolved);
}

export function ThemeProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [theme, setThemeState] = useState<ThemePreference>('system');
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(getSystemPrefersDark());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carga la preferencia guardada al iniciar la app.
  useEffect(() => {
    let active = true;
    window.reportForge.settings
      .get()
      .then((settings) => {
        if (active) setThemeState(settings.theme);
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err, 'No se pudo cargar la preferencia de tema.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Escucha cambios del tema del sistema operativo mientras theme === 'system'.
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (event: MediaQueryListEvent) => setSystemPrefersDark(event.matches);
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  const resolvedTheme: ResolvedTheme = theme === 'system' ? (systemPrefersDark ? 'dark' : 'light') : theme;

  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = useCallback(async (next: ThemePreference) => {
    setThemeState(next);
    try {
      await window.reportForge.settings.set('theme', next);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar la preferencia de tema.'));
    }
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, loading, error }),
    [theme, resolvedTheme, setTheme, loading, error]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de ThemeProvider');
  return ctx;
}
