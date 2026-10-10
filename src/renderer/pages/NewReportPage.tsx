import React, { useEffect, useState } from 'react';
import type { Project, ReportTemplate, DocumentClassification, AppSettings } from '@shared/types';
import { useRouter } from '../lib/router';
import { getErrorMessage } from '../lib/errors';
import { CLASSIFICATION_LABELS } from '../lib/format';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import Banner from '../components/Banner';

interface NewReportPageProps {
  projectId?: string;
  templateId?: string;
}

const CLASSIFICATIONS: DocumentClassification[] = ['publico', 'uso_interno', 'confidencial', 'estrictamente_confidencial'];

// Flujo de creacion de reporte: proyecto + plantilla + titulo + clasificacion.
// Si se llega con un projectId (desde el detalle de un proyecto) ese campo viene preseleccionado
// y bloqueado implicitamente al dejarlo como valor inicial del select (el usuario puede cambiarlo).
export default function NewReportPage({ projectId, templateId }: NewReportPageProps): React.ReactElement {
  const { navigate } = useRouter();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [templates, setTemplates] = useState<ReportTemplate[] | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedProjectId, setSelectedProjectId] = useState(projectId ?? '');
  const [selectedTemplateId, setSelectedTemplateId] = useState(templateId ?? '');
  const [title, setTitle] = useState('');
  const [classification, setClassification] = useState<DocumentClassification>('confidencial');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([window.reportForge.projects.list(), window.reportForge.templates.list(), window.reportForge.settings.get()])
      .then(([projectList, templateList, appSettings]) => {
        setProjects([...projectList].sort((a, b) => a.name.localeCompare(b.name)));
        setTemplates([...templateList].sort((a, b) => a.name.localeCompare(b.name)));
        setSettings(appSettings);
        setClassification(appSettings.defaultClassification);
      })
      .catch((err) => setLoadError(getErrorMessage(err, 'No se pudieron cargar los datos necesarios.')));
  }, []);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!selectedProjectId) {
      setSubmitError('Selecciona un proyecto.');
      return;
    }
    if (!selectedTemplateId) {
      setSubmitError('Selecciona una plantilla.');
      return;
    }
    if (!title.trim()) {
      setSubmitError('El titulo del reporte es obligatorio.');
      return;
    }

    setSaving(true);
    setSubmitError(null);
    try {
      const report = await window.reportForge.reports.create({
        projectId: selectedProjectId,
        templateId: selectedTemplateId,
        title: title.trim(),
        classification,
        sections: [],
      });
      navigate({ name: 'report-editor', reportId: report.id });
    } catch (err) {
      setSubmitError(getErrorMessage(err, 'No se pudo crear el reporte.'));
    } finally {
      setSaving(false);
    }
  }

  if (loadError) {
    return (
      <div className="page">
        <Banner kind="error">{loadError}</Banner>
      </div>
    );
  }

  if (!projects || !templates || !settings) {
    return (
      <div className="page">
        <Spinner label="Cargando..." />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="page">
        <Banner kind="warning">Necesitas crear un proyecto antes de poder crear un reporte.</Banner>
        <Button variant="primary" onClick={() => navigate({ name: 'projects' })}>
          Ir a proyectos
        </Button>
      </div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Nuevo reporte</h1>
          <p className="page-subtitle">Elige el proyecto, la plantilla base y los datos iniciales del reporte.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card">
        {submitError && <Banner kind="error">{submitError}</Banner>}

        <div className="field">
          <label className="field-label field-required" htmlFor="report-project">
            Proyecto
          </label>
          <select
            id="report-project"
            className="select"
            value={selectedProjectId}
            onChange={(event) => setSelectedProjectId(event.target.value)}
            required
          >
            <option value="">Selecciona un proyecto</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name} ({project.clientName})
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field-label field-required" htmlFor="report-template">
            Plantilla
          </label>
          <select
            id="report-template"
            className="select"
            value={selectedTemplateId}
            onChange={(event) => setSelectedTemplateId(event.target.value)}
            required
          >
            <option value="">Selecciona una plantilla</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
                {template.isBuiltIn ? '' : ' (personalizada)'}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field-label field-required" htmlFor="report-title">
            Titulo del reporte
          </label>
          <input id="report-title" className="input" value={title} onChange={(event) => setTitle(event.target.value)} required autoFocus />
        </div>

        <div className="field">
          <label className="field-label field-required" htmlFor="report-classification">
            Clasificacion del documento
          </label>
          <select
            id="report-classification"
            className="select"
            value={classification}
            onChange={(event) => setClassification(event.target.value as DocumentClassification)}
          >
            {CLASSIFICATIONS.map((value) => (
              <option key={value} value={value}>
                {CLASSIFICATION_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <Button type="button" variant="ghost" onClick={() => navigate({ name: 'projects' })} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Creando reporte...' : 'Crear reporte'}
          </Button>
        </div>
      </form>
    </div>
  );
}
