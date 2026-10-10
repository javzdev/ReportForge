import React, { useEffect, useState } from 'react';
import type { Report, ReportTemplate, Finding, Project } from '@shared/types';
import { useRouter } from '../lib/router';
import { getErrorMessage } from '../lib/errors';
import { formatDateTime, CLASSIFICATION_LABELS } from '../lib/format';
import { FindingsTableField } from '../components/SectionFieldInput';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import Banner from '../components/Banner';
import { useToast } from '../hooks/useToast';
import './ReportPreviewPage.css';

interface ReportPreviewPageProps {
  reportId: string;
}

// Vista previa de documento: reutiliza los mismos datos que el editor pero en maquetacion
// de solo lectura tipo documento (portada simulada + secciones + tabla de hallazgos), para
// que el usuario vea aproximadamente como se vera el PDF exportado antes de generarlo.
export default function ReportPreviewPage({ reportId }: ReportPreviewPageProps): React.ReactElement {
  const { navigate } = useRouter();
  const { showToast } = useToast();

  const [report, setReport] = useState<Report | null>(null);
  const [template, setTemplate] = useState<ReportTemplate | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load(): Promise<void> {
      try {
        const loadedReport = await window.reportForge.reports.get(reportId);
        if (!loadedReport) throw new Error('Reporte no encontrado.');
        const [loadedTemplate, loadedFindings, projects] = await Promise.all([
          window.reportForge.templates.get(loadedReport.templateId),
          window.reportForge.findings.list({ reportId }),
          window.reportForge.projects.list(),
        ]);
        if (!loadedTemplate) throw new Error('La plantilla asociada a este reporte no existe.');
        if (!active) return;
        setReport(loadedReport);
        setTemplate(loadedTemplate);
        setFindings(loadedFindings);
        setProject(projects.find((p) => p.id === loadedReport.projectId) ?? null);
      } catch (err) {
        if (active) setError(getErrorMessage(err, 'No se pudo cargar la vista previa.'));
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [reportId]);

  async function handleExport(): Promise<void> {
    setExporting(true);
    setExportError(null);
    try {
      const result = await window.reportForge.exportReport.toPdf(reportId);
      if (result.canceled) {
        // El usuario cerro el dialogo de guardado: no es un error, no se muestra nada.
        return;
      }
      showToast('success', `PDF exportado en: ${result.filePath}`);
    } catch (err) {
      setExportError(getErrorMessage(err, 'No se pudo exportar el reporte a PDF.'));
    } finally {
      setExporting(false);
    }
  }

  if (error) {
    return (
      <div className="page">
        <Banner kind="error">{error}</Banner>
      </div>
    );
  }

  if (!report || !template) {
    return (
      <div className="page">
        <Spinner label="Cargando vista previa..." />
      </div>
    );
  }

  const sortedSections = [...template.sections].sort((a, b) => a.order - b.order);
  const valuesBySection = new Map(report.sections.map((s) => [s.sectionId, s.values]));

  return (
    <div className="page">
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        style={{ marginBottom: 12, paddingLeft: 0 }}
        onClick={() => navigate({ name: 'report-editor', reportId })}
      >
        ← Volver al editor
      </button>

      <div className="page-header">
        <div>
          <h1 className="page-title">Vista previa</h1>
          <p className="page-subtitle">Asi se vera aproximadamente el documento exportado.</p>
        </div>
        <div className="page-actions">
          <Button variant="primary" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exportando...' : 'Exportar a PDF'}
          </Button>
        </div>
      </div>

      {exportError && <Banner kind="error">{exportError}</Banner>}

      <div className="document">
        <div className="document__cover">
          <div className="document__classification">{CLASSIFICATION_LABELS[report.classification]}</div>
          <h2 className="document__title">{report.title}</h2>
          {project && (
            <>
              <p className="document__meta">Cliente / entidad evaluada: {project.clientName}</p>
              <p className="document__meta">Proyecto: {project.name}</p>
            </>
          )}
          <p className="document__meta">Plantilla: {template.name}</p>
          <p className="document__meta">Ultima actualizacion: {formatDateTime(report.updatedAt)}</p>
          {report.authors.length > 0 && (
            <p className="document__meta">Autores: {report.authors.map((a) => a.name).join(', ')}</p>
          )}
        </div>

        {sortedSections.map((section) => (
          <div className="document__section" key={section.id}>
            <h3 className="document__section-title">{section.title}</h3>
            {section.description && <p className="document__section-description">{section.description}</p>}
            {section.fields.map((field) => {
              const value = valuesBySection.get(section.id)?.[field.id];
              return (
                <div className="document__field" key={field.id}>
                  <div className="document__field-label">{field.label}</div>
                  {field.type === 'findings_table' ? (
                    <FindingsTableField findings={findings} />
                  ) : (
                    <div className="document__field-value">
                      {typeof value === 'string' && value.trim().length > 0 ? value : (
                        <span className="document__field-empty">Sin contenido</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
