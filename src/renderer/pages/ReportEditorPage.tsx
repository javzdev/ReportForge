import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Report, ReportTemplate, Finding, ReportSectionContent } from '@shared/types';
import { useRouter } from '../lib/router';
import { getErrorMessage } from '../lib/errors';
import { computeRequiredFieldProgress } from '../lib/reportProgress';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import Banner from '../components/Banner';
import SectionFieldInput from '../components/SectionFieldInput';

interface ReportEditorPageProps {
  reportId: string;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

// Editor central de reportes. Renderiza cada TemplateSection (ordenada por `order`) con sus
// campos, mantiene el estado local de `sections` y lo sincroniza con el backend mediante
// guardado automatico debounced (~1.5s de inactividad). Un guardado manual inmediato
// ("Guardar ahora") tambien esta disponible para quien prefiera no depender del autosave.
export default function ReportEditorPage({ reportId }: ReportEditorPageProps): React.ReactElement {
  const { navigate } = useRouter();

  const [report, setReport] = useState<Report | null>(null);
  const [template, setTemplate] = useState<ReportTemplate | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [sections, setSections] = useState<ReportSectionContent[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  // Se usa para evitar que un guardado debounced en vuelo sobreescriba cambios mas nuevos
  // con una version vieja del estado capturada en el closure del timeout.
  const latestSectionsRef = useRef<ReportSectionContent[]>([]);

  async function loadReport(): Promise<void> {
    setLoadError(null);
    try {
      const loadedReport = await window.reportForge.reports.get(reportId);
      if (!loadedReport) {
        setLoadError('Reporte no encontrado.');
        return;
      }
      const loadedTemplate = await window.reportForge.templates.get(loadedReport.templateId);
      if (!loadedTemplate) {
        setLoadError('La plantilla asociada a este reporte no existe o fue eliminada.');
        return;
      }
      const loadedFindings = await window.reportForge.findings.list({ reportId });

      setReport(loadedReport);
      setTemplate(loadedTemplate);
      setFindings(loadedFindings);
      setSections(loadedReport.sections);
      latestSectionsRef.current = loadedReport.sections;
    } catch (err) {
      setLoadError(getErrorMessage(err, 'No se pudo cargar el reporte.'));
    }
  }

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  const persist = useCallback(
    async (sectionsToSave: ReportSectionContent[]) => {
      if (!report) return;
      setSaveState('saving');
      setSaveError(null);
      try {
        const saved = await window.reportForge.reports.save({ ...report, sections: sectionsToSave });
        setReport(saved);
        setSaveState('saved');
      } catch (err) {
        setSaveState('error');
        setSaveError(getErrorMessage(err, 'No se pudo guardar el reporte.'));
      }
    },
    [report]
  );

  const debouncedPersist = useDebouncedCallback(persist, 1500);

  function updateFieldValue(sectionId: string, fieldId: string, value: unknown): void {
    setSections((prev) => {
      const next = prev.some((s) => s.sectionId === sectionId)
        ? prev.map((s) => (s.sectionId === sectionId ? { ...s, values: { ...s.values, [fieldId]: value } } : s))
        : [...prev, { sectionId, values: { [fieldId]: value } }];
      latestSectionsRef.current = next;
      debouncedPersist(next);
      return next;
    });
  }

  async function handleSaveNow(): Promise<void> {
    await persist(latestSectionsRef.current);
  }

  if (loadError) {
    return (
      <div className="page">
        <Banner kind="error">{loadError}</Banner>
        <Button variant="secondary" onClick={() => navigate({ name: 'projects' })}>
          Volver a proyectos
        </Button>
      </div>
    );
  }

  if (!report || !template) {
    return (
      <div className="page">
        <Spinner label="Cargando reporte..." />
      </div>
    );
  }

  const sortedSections = [...template.sections].sort((a, b) => a.order - b.order);
  const progress = computeRequiredFieldProgress(template, sections);
  const valuesBySection = new Map(sections.map((s) => [s.sectionId, s.values]));

  return (
    <div className="page">
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        style={{ marginBottom: 12, paddingLeft: 0 }}
        onClick={() => navigate({ name: 'project-detail', projectId: report.projectId })}
      >
        ← Volver al proyecto
      </button>

      <div className="page-header">
        <div>
          <h1 className="page-title">{report.title}</h1>
          <p className="page-subtitle">Plantilla: {template.name}</p>
        </div>
        <div className="page-actions">
          <SaveIndicator state={saveState} />
          <Button variant="secondary" onClick={handleSaveNow} disabled={saveState === 'saving'}>
            Guardar ahora
          </Button>
          <Button variant="secondary" onClick={() => navigate({ name: 'report-preview', reportId })}>
            Vista previa
          </Button>
        </div>
      </div>

      {saveError && <Banner kind="error">{saveError}</Banner>}

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
          <span>Progreso de campos obligatorios</span>
          <strong>
            {progress.completed}/{progress.total} completados
          </strong>
        </div>
        <div className="progress-bar">
          <div
            className="progress-bar__fill"
            style={{ width: progress.total > 0 ? `${(progress.completed / progress.total) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {sortedSections.map((section) => (
        <div key={section.id} className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 16 }}>{section.title}</h2>
            {section.required && <span className="badge badge--warning">Obligatoria</span>}
          </div>
          {section.description && <p style={{ color: 'var(--color-text-muted)', marginTop: 0 }}>{section.description}</p>}

          {section.fields.map((field) => (
            <div className="field" key={field.id}>
              <label className={`field-label${field.required ? ' field-required' : ''}`} htmlFor={`field-${field.id}`}>
                {field.label}
              </label>
              {field.helpText && <span className="field-help">{field.helpText}</span>}
              <SectionFieldInput
                field={field}
                value={valuesBySection.get(section.id)?.[field.id]}
                onChange={(value) => updateFieldValue(section.id, field.id, value)}
                findings={findings}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }): React.ReactElement {
  if (state === 'saving') {
    return (
      <span className="save-indicator">
        <span className="spinner" aria-hidden="true" /> Guardando...
      </span>
    );
  }
  if (state === 'saved') {
    return <span className="save-indicator">✅ Guardado</span>;
  }
  if (state === 'error') {
    return <span className="save-indicator" style={{ color: 'var(--color-danger)' }}>⚠️ Error al guardar</span>;
  }
  return <span className="save-indicator">&nbsp;</span>;
}
