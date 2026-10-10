import React, { useEffect, useState } from 'react';
import type { Finding, Severity, FindingStatus, Project, Report, FindingReference, Attachment } from '@shared/types';
import { useRouter } from '../lib/router';
import { getErrorMessage } from '../lib/errors';
import { toDateInputValue, dateInputValueToIso, todayAsDateOnlyIso, SEVERITY_LABELS, STATUS_LABELS } from '../lib/format';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import Banner from '../components/Banner';
import AttachmentManager from '../components/AttachmentManager';
import { useToast } from '../hooks/useToast';

interface FindingEditorPageProps {
  findingId?: string;
  projectId?: string;
  reportId?: string;
}

const SEVERITIES: Severity[] = ['critica', 'alta', 'media', 'baja', 'informativa'];
const STATUSES: FindingStatus[] = ['borrador', 'pendiente_revision', 'confirmado', 'corregido', 'aceptado', 'cerrado'];

interface FormState {
  projectId: string;
  reportId: string;
  title: string;
  description: string;
  affectedAsset: string;
  category: string;
  severity: Severity;
  severityJustification: string;
  potentialImpact: string;
  reproductionSteps: string;
  remediationRecommendation: string;
  status: FindingStatus;
  owner: string;
  identifiedDate: string;
  retestDate: string;
  references: FindingReference[];
  tags: string[];
  notes: string;
}

function emptyForm(projectId?: string, reportId?: string): FormState {
  return {
    projectId: projectId ?? '',
    reportId: reportId ?? '',
    title: '',
    description: '',
    affectedAsset: '',
    category: '',
    severity: 'media',
    severityJustification: '',
    potentialImpact: '',
    reproductionSteps: '',
    remediationRecommendation: '',
    status: 'borrador',
    owner: '',
    identifiedDate: todayAsDateOnlyIso(),
    retestDate: '',
    references: [],
    tags: [],
    notes: '',
  };
}

function findingToForm(finding: Finding): FormState {
  return {
    projectId: finding.projectId,
    reportId: finding.reportId ?? '',
    title: finding.title,
    description: finding.description,
    affectedAsset: finding.affectedAsset,
    category: finding.category,
    severity: finding.severity,
    severityJustification: finding.severityJustification ?? '',
    potentialImpact: finding.potentialImpact ?? '',
    reproductionSteps: finding.reproductionSteps ?? '',
    remediationRecommendation: finding.remediationRecommendation ?? '',
    status: finding.status,
    owner: finding.owner ?? '',
    identifiedDate: finding.identifiedDate,
    retestDate: finding.retestDate ?? '',
    references: finding.references,
    tags: finding.tags,
    notes: finding.notes ?? '',
  };
}

// Formulario completo de hallazgo: cubre todos los campos del modelo Finding. Permite
// vincular el hallazgo a un reporte especifico del mismo proyecto (campo reportId opcional).
// Las evidencias se gestionan aparte, una vez el hallazgo existe (necesitan un findingId).
export default function FindingEditorPage({ findingId, projectId, reportId }: FindingEditorPageProps): React.ReactElement {
  const { navigate } = useRouter();
  const { showToast } = useToast();

  const isEditing = Boolean(findingId);
  const [form, setForm] = useState<FormState>(emptyForm(projectId, reportId));
  const [projects, setProjects] = useState<Project[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [currentFinding, setCurrentFinding] = useState<Finding | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [referenceInput, setReferenceInput] = useState('');

  useEffect(() => {
    let active = true;
    async function load(): Promise<void> {
      try {
        const projectList = await window.reportForge.projects.list();
        if (!active) return;
        setProjects(projectList);

        if (findingId) {
          const finding = await window.reportForge.findings.get(findingId);
          if (!finding) throw new Error('Hallazgo no encontrado.');
          if (!active) return;
          setCurrentFinding(finding);
          setForm(findingToForm(finding));
          const [reportList, attachmentList] = await Promise.all([
            window.reportForge.reports.listByProject(finding.projectId),
            window.reportForge.attachments.listByFinding(finding.id),
          ]);
          if (!active) return;
          setReports(reportList);
          setAttachments(attachmentList);
        } else if (projectId) {
          const reportList = await window.reportForge.reports.listByProject(projectId);
          if (active) setReports(reportList);
        }
      } catch (err) {
        if (active) setLoadError(getErrorMessage(err, 'No se pudo cargar el hallazgo.'));
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [findingId]);

  async function handleProjectChange(newProjectId: string): Promise<void> {
    setForm((prev) => ({ ...prev, projectId: newProjectId, reportId: '' }));
    if (!newProjectId) {
      setReports([]);
      return;
    }
    try {
      const reportList = await window.reportForge.reports.listByProject(newProjectId);
      setReports(reportList);
    } catch (err) {
      setLoadError(getErrorMessage(err, 'No se pudieron cargar los reportes del proyecto.'));
    }
  }

  function addTag(): void {
    const value = tagInput.trim();
    if (!value || form.tags.includes(value)) return;
    setForm((prev) => ({ ...prev, tags: [...prev.tags, value] }));
    setTagInput('');
  }

  function removeTag(tag: string): void {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  }

  function addReference(): void {
    const label = referenceInput.trim();
    if (!label) return;
    setForm((prev) => ({ ...prev, references: [...prev.references, { id: crypto.randomUUID(), label }] }));
    setReferenceInput('');
  }

  function removeReference(id: string): void {
    setForm((prev) => ({ ...prev, references: prev.references.filter((r) => r.id !== id) }));
  }

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!form.projectId) {
      setSaveError('Selecciona un proyecto.');
      return;
    }
    if (!form.title.trim()) {
      setSaveError('El titulo del hallazgo es obligatorio.');
      return;
    }

    setSaving(true);
    setSaveError(null);

    const payload = {
      projectId: form.projectId,
      reportId: form.reportId || undefined,
      title: form.title.trim(),
      description: form.description,
      affectedAsset: form.affectedAsset,
      category: form.category,
      severity: form.severity,
      severityJustification: form.severityJustification || undefined,
      potentialImpact: form.potentialImpact || undefined,
      reproductionSteps: form.reproductionSteps || undefined,
      remediationRecommendation: form.remediationRecommendation || undefined,
      status: form.status,
      owner: form.owner || undefined,
      identifiedDate: form.identifiedDate,
      retestDate: form.retestDate || undefined,
      references: form.references,
      tags: form.tags,
      notes: form.notes || undefined,
    };

    try {
      if (isEditing && currentFinding) {
        const saved = await window.reportForge.findings.save({
          ...currentFinding,
          ...payload,
        });
        setCurrentFinding(saved);
        showToast('success', 'Hallazgo actualizado.');
      } else {
        const created = await window.reportForge.findings.create(payload);
        showToast('success', 'Hallazgo creado.');
        navigate({ name: 'finding-editor', findingId: created.id, projectId: created.projectId });
        return;
      }
    } catch (err) {
      setSaveError(getErrorMessage(err, 'No se pudo guardar el hallazgo.'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="page">
        <Spinner label="Cargando..." />
      </div>
    );
  }

  if (loadError && !currentFinding) {
    return (
      <div className="page">
        <Banner kind="error">{loadError}</Banner>
        <Button variant="secondary" onClick={() => navigate({ name: 'findings' })}>
          Volver a hallazgos
        </Button>
      </div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: 820 }}>
      <button type="button" className="btn btn--ghost btn--sm" style={{ marginBottom: 12, paddingLeft: 0 }} onClick={() => navigate({ name: 'findings' })}>
        ← Hallazgos
      </button>

      <div className="page-header">
        <div>
          <h1 className="page-title">{isEditing ? 'Editar hallazgo' : 'Nuevo hallazgo'}</h1>
          <p className="page-subtitle">Registra toda la informacion tecnica y de gestion del hallazgo.</p>
        </div>
      </div>

      {loadError && <Banner kind="error">{loadError}</Banner>}

      <form onSubmit={handleSubmit} className="card">
        {saveError && <Banner kind="error">{saveError}</Banner>}

        <div className="form-row">
          <div className="field">
            <label className="field-label field-required" htmlFor="finding-project">
              Proyecto
            </label>
            <select
              id="finding-project"
              className="select"
              value={form.projectId}
              onChange={(event) => handleProjectChange(event.target.value)}
              required
              disabled={isEditing}
            >
              <option value="">Selecciona un proyecto</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="finding-report">
              Vincular a reporte (opcional)
            </label>
            <select
              id="finding-report"
              className="select"
              value={form.reportId}
              onChange={(event) => setForm((prev) => ({ ...prev, reportId: event.target.value }))}
              disabled={!form.projectId}
            >
              <option value="">Sin vincular</option>
              {reports.map((report) => (
                <option key={report.id} value={report.id}>
                  {report.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label className="field-label field-required" htmlFor="finding-title">
            Titulo
          </label>
          <input id="finding-title" className="input" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} required />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="finding-description">
            Descripcion
          </label>
          <textarea
            id="finding-description"
            className="textarea"
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          />
        </div>

        <div className="form-row">
          <div className="field">
            <label className="field-label" htmlFor="finding-asset">
              Activo afectado
            </label>
            <input
              id="finding-asset"
              className="input"
              value={form.affectedAsset}
              onChange={(event) => setForm((prev) => ({ ...prev, affectedAsset: event.target.value }))}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="finding-category">
              Categoria
            </label>
            <input
              id="finding-category"
              className="input"
              value={form.category}
              onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
              placeholder="Ej: Inyeccion SQL, XSS, Configuracion insegura"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="field">
            <label className="field-label field-required" htmlFor="finding-severity">
              Severidad
            </label>
            <select
              id="finding-severity"
              className="select"
              value={form.severity}
              onChange={(event) => setForm((prev) => ({ ...prev, severity: event.target.value as Severity }))}
              style={{ borderLeft: `4px solid var(--color-${form.severity})` }}
            >
              {SEVERITIES.map((severity) => (
                <option key={severity} value={severity}>
                  {SEVERITY_LABELS[severity]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="finding-status">
              Estado
            </label>
            <select id="finding-status" className="select" value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as FindingStatus }))}>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="finding-severity-justification">
            Justificacion de severidad
          </label>
          <textarea
            id="finding-severity-justification"
            className="textarea"
            value={form.severityJustification}
            onChange={(event) => setForm((prev) => ({ ...prev, severityJustification: event.target.value }))}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="finding-impact">
            Impacto potencial
          </label>
          <textarea
            id="finding-impact"
            className="textarea"
            value={form.potentialImpact}
            onChange={(event) => setForm((prev) => ({ ...prev, potentialImpact: event.target.value }))}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="finding-steps">
            Pasos de reproduccion
          </label>
          <textarea
            id="finding-steps"
            className="textarea"
            style={{ minHeight: 120 }}
            value={form.reproductionSteps}
            onChange={(event) => setForm((prev) => ({ ...prev, reproductionSteps: event.target.value }))}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="finding-remediation">
            Recomendacion de remediacion
          </label>
          <textarea
            id="finding-remediation"
            className="textarea"
            value={form.remediationRecommendation}
            onChange={(event) => setForm((prev) => ({ ...prev, remediationRecommendation: event.target.value }))}
          />
        </div>

        <div className="form-row">
          <div className="field">
            <label className="field-label" htmlFor="finding-owner">
              Responsable (opcional)
            </label>
            <input id="finding-owner" className="input" value={form.owner} onChange={(event) => setForm((prev) => ({ ...prev, owner: event.target.value }))} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="finding-identified-date">
              Fecha de identificacion
            </label>
            <input
              id="finding-identified-date"
              className="input"
              type="date"
              value={toDateInputValue(form.identifiedDate)}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, identifiedDate: event.target.value ? dateInputValueToIso(event.target.value) : prev.identifiedDate }))
              }
            />
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="finding-retest-date">
            Fecha de retest (opcional)
          </label>
          <input
            id="finding-retest-date"
            className="input"
            type="date"
            value={toDateInputValue(form.retestDate)}
            onChange={(event) => setForm((prev) => ({ ...prev, retestDate: event.target.value ? dateInputValueToIso(event.target.value) : '' }))}
          />
        </div>

        <div className="field">
          <span className="field-label">Referencias</span>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              className="input"
              placeholder="Ej: CVE-2024-1234 u OWASP A01:2021"
              value={referenceInput}
              onChange={(event) => setReferenceInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addReference();
                }
              }}
            />
            <Button type="button" variant="secondary" onClick={addReference}>
              Agregar
            </Button>
          </div>
          {form.references.length > 0 && (
            <div className="tag-list">
              {form.references.map((reference) => (
                <span key={reference.id} className="tag-chip">
                  {reference.label}{' '}
                  <button
                    type="button"
                    onClick={() => removeReference(reference.id)}
                    aria-label={`Quitar referencia ${reference.label}`}
                    style={{ background: 'none', border: 'none', padding: 0, marginLeft: 4, color: 'var(--color-text-muted)' }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="field">
          <span className="field-label">Etiquetas</span>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              className="input"
              placeholder="Ej: owasp-top10, autenticacion"
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addTag();
                }
              }}
            />
            <Button type="button" variant="secondary" onClick={addTag}>
              Agregar
            </Button>
          </div>
          {form.tags.length > 0 && (
            <div className="tag-list">
              {form.tags.map((tag) => (
                <span key={tag} className="tag-chip">
                  {tag}{' '}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    aria-label={`Quitar etiqueta ${tag}`}
                    style={{ background: 'none', border: 'none', padding: 0, marginLeft: 4, color: 'var(--color-text-muted)' }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="finding-notes">
            Notas
          </label>
          <textarea id="finding-notes" className="textarea" value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <Button type="button" variant="ghost" onClick={() => navigate({ name: 'findings' })} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear hallazgo'}
          </Button>
        </div>
      </form>

      {isEditing && currentFinding && (
        <>
          <h2 className="section-title">Evidencias del hallazgo</h2>
          <AttachmentManager
            projectId={currentFinding.projectId}
            findingId={currentFinding.id}
            attachments={attachments}
            onChanged={async () => {
              const list = await window.reportForge.attachments.listByFinding(currentFinding.id);
              setAttachments(list);
            }}
          />
        </>
      )}
    </div>
  );
}
