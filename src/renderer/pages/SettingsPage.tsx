import React, { useEffect, useState } from 'react';
import type { AppSettings, DocumentClassification } from '@shared/types';
import { useRouter } from '../lib/router';
import { useTheme } from '../hooks/useTheme';
import { getErrorMessage } from '../lib/errors';
import { CLASSIFICATION_LABELS } from '../lib/format';
import Button from '../components/Button';
import Banner from '../components/Banner';
import Spinner from '../components/Spinner';
import { useToast } from '../hooks/useToast';
import BackupSection from '../components/BackupSection';

const CLASSIFICATIONS: DocumentClassification[] = ['publico', 'uso_interno', 'confidencial', 'estrictamente_confidencial'];

// Configuracion: tema, clasificacion por defecto para nuevos reportes, respaldos locales,
// y acceso a la pagina de Privacidad y almacenamiento (con el borrado total de datos).
export default function SettingsPage(): React.ReactElement {
  const { navigate } = useRouter();
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingClassification, setSavingClassification] = useState(false);

  async function loadSettings(): Promise<void> {
    try {
      const result = await window.reportForge.settings.get();
      setSettings(result);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo cargar la configuracion.'));
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  async function handleDefaultClassificationChange(value: DocumentClassification): Promise<void> {
    setSavingClassification(true);
    try {
      const updated = await window.reportForge.settings.set('defaultClassification', value);
      setSettings(updated);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar la clasificacion por defecto.'));
    } finally {
      setSavingClassification(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Configuracion</h1>
          <p className="page-subtitle">Preferencias de la aplicacion, respaldos y privacidad.</p>
        </div>
        <div className="page-actions">
          <Button variant="secondary" onClick={() => navigate({ name: 'privacy' })}>
            Privacidad y almacenamiento
          </Button>
        </div>
      </div>

      {error && <Banner kind="error">{error}</Banner>}

      <h2 className="section-title" style={{ marginTop: 0 }}>
        Apariencia
      </h2>
      <div className="card">
        <div className="field" style={{ marginBottom: 0 }}>
          <span className="field-label">Tema</span>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            {(['light', 'dark', 'system'] as const).map((option) => (
              <Button key={option} variant={theme === option ? 'primary' : 'secondary'} onClick={() => setTheme(option)}>
                {option === 'light' ? 'Claro' : option === 'dark' ? 'Oscuro' : 'Segun el sistema'}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <h2 className="section-title">Reportes</h2>
      <div className="card">
        {settings === null ? (
          <Spinner label="Cargando..." />
        ) : (
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="field-label" htmlFor="default-classification">
              Clasificacion por defecto para nuevos reportes
            </label>
            <select
              id="default-classification"
              className="select"
              value={settings.defaultClassification}
              disabled={savingClassification}
              onChange={(event) => handleDefaultClassificationChange(event.target.value as DocumentClassification)}
            >
              {CLASSIFICATIONS.map((value) => (
                <option key={value} value={value}>
                  {CLASSIFICATION_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <h2 className="section-title">Respaldos</h2>
      <BackupSection onImported={() => showToast('success', 'Respaldo restaurado correctamente.')} />
    </div>
  );
}
