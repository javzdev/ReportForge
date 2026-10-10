import React, { useEffect, useState } from 'react';
import type { Project, Report, Finding, Attachment } from '@shared/types';
import { useRouter } from '../lib/router';
import { getErrorMessage } from '../lib/errors';
import { formatDateTime, CLASSIFICATION_LABELS } from '../lib/format';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import Banner from '../components/Banner';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import EditProjectModal from '../components/EditProjectModal';
import { SeverityBadge, StatusBadge } from '../components/Badges';
import AttachmentManager from '../components/AttachmentManager';
import { useToast } from '../hooks/useToast';

interface ProjectDetailPageProps {
  projectId: string;
}

export default function ProjectDetailPage({ projectId }: ProjectDetailPageProps): React.ReactElement {
  const { navigate } = useRouter();
  const { showToast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [reports, setReports] = useState<Report[] | null>(null);
  const [findings, setFindings] = useState<Finding[] | null>(null);
  const [attachments, setAttachments] = useState<Attachment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [deleteReportTarget, setDeleteReportTarget] = useState<Report | null>(null);
  const [deleteFindingTarget, setDeleteFindingTarget] = useState<Finding | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function loadAll(): Promise<void> {
    setError(null);
    try {
      const [projects, reportList, findingList, attachmentList] = await Promise.all([
        window.reportForge.projects.list(),
        window.reportForge.reports.listByProject(projectId),
        window.reportForge.findings.list({ projectId }),
        window.reportForge.attachments.listByProject(projectId),
      ]);
      const found = projects.find((p) => p.id === projectId) ?? null;
      setProject(found);
      setReports([...reportList].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
      setFindings([...findingList].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
      setAttachments(attachmentList);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo cargar el proyecto.'));
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function handleDeleteReport(): Promise<void> {
    if (!deleteReportTarget) return;
    setBusy(true);
    setActionError(null);
    try {
      await window.reportForge.reports.delete(deleteReportTarget.id);
      setDeleteReportTarget(null);
      showToast('success', 'Reporte eliminado.');
      await loadAll();
    } catch (err) {
      setActionError(getErrorMessage(err, 'No se pudo eliminar el reporte.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteFinding(): Promise<void> {
    if (!deleteFindingTarget) return;
    setBusy(true);
    setActionError(null);
    try {
      await window.reportForge.findings.delete(deleteFindingTarget.id);
      setDeleteFindingTarget(null);
      showToast('success', 'Hallazgo eliminado.');
      await loadAll();
    } catch (err) {
      setActionError(getErrorMessage(err, 'No se pudo eliminar el hallazgo.'));
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="page">
        <Banner kind="error">{error}</Banner>
        <Button variant="secondary" onClick={() => navigate({ name: 'projects' })}>
          Volver a proyectos
        </Button>
      </div>
    );
  }

  if (!project || !reports || !findings || !attachments) {
    return (
      <div className="page">
        <Spinner label="Cargando proyecto..." />
      </div>
    );
  }

  return (
    <div className="page">
      <button type="button" className="btn btn--ghost btn--sm" style={{ marginBottom: 12, paddingLeft: 0 }} onClick={() => navigate({ name: 'projects' })}>
        ← Proyectos
      </button>

      <div className="page-header">
        <div>
          <h1 className="page-title">{project.name}</h1>
          <p className="page-subtitle">Cliente: {project.clientName}</p>
          {project.description && <p className="page-subtitle">{project.description}</p>}
        </div>
        <div className="page-actions">
          <Button variant="secondary" onClick={() => setShowEdit(true)}>
            Editar proyecto
          </Button>
          <Button variant="primary" onClick={() => navigate({ name: 'new-report', projectId })}>
            + Nuevo reporte
          </Button>
        </div>
      </div>

      {actionError && <Banner kind="error">{actionError}</Banner>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="section-title" style={{ marginTop: 0 }}>
          Reportes
        </h2>
      </div>
      {reports.length === 0 ? (
        <EmptyState
          icon="📄"
          title="Sin reportes todavia"
          description="Crea un reporte a partir de una plantilla para este proyecto."
          action={
            <Button variant="primary" onClick={() => navigate({ name: 'new-report', projectId })}>
              + Nuevo reporte
            </Button>
          }
        />
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Titulo</th>
              <th>Clasificacion</th>
              <th>Actualizado</th>
              <th aria-hidden="true" />
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id}>
                <td>{report.title}</td>
                <td>{CLASSIFICATION_LABELS[report.classification] ?? report.classification}</td>
                <td>{formatDateTime(report.updatedAt)}</td>
                <td style={{ display: 'flex', gap: 8 }}>
                  <Button size="sm" variant="ghost" onClick={() => navigate({ name: 'report-editor', reportId: report.id })}>
                    Editar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => navigate({ name: 'report-preview', reportId: report.id })}>
                    Vista previa
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleteReportTarget(report)}>
                    Eliminar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="section-title">Hallazgos</h2>
        <Button variant="secondary" onClick={() => navigate({ name: 'finding-editor', projectId })}>
          + Nuevo hallazgo
        </Button>
      </div>
      {findings.length === 0 ? (
        <EmptyState icon="🛡️" title="Sin hallazgos todavia" description="Registra el primer hallazgo de este proyecto." />
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Titulo</th>
              <th>Severidad</th>
              <th>Estado</th>
              <th aria-hidden="true" />
            </tr>
          </thead>
          <tbody>
            {findings.map((finding) => (
              <tr key={finding.id}>
                <td>{finding.title}</td>
                <td>
                  <SeverityBadge severity={finding.severity} />
                </td>
                <td>
                  <StatusBadge status={finding.status} />
                </td>
                <td style={{ display: 'flex', gap: 8 }}>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate({ name: 'finding-editor', findingId: finding.id, projectId })}
                  >
                    Editar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleteFindingTarget(finding)}>
                    Eliminar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 className="section-title">Evidencias del proyecto</h2>
      <AttachmentManager
        projectId={projectId}
        attachments={attachments}
        onChanged={loadAll}
      />

      {showEdit && (
        <EditProjectModal
          project={project}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => {
            setProject(updated);
            setShowEdit(false);
            showToast('success', 'Proyecto actualizado.');
          }}
        />
      )}

      {deleteReportTarget && (
        <ConfirmDialog
          title="Eliminar reporte"
          message={`¿Eliminar el reporte "${deleteReportTarget.title}"? Esta accion no se puede deshacer.`}
          busy={busy}
          onConfirm={handleDeleteReport}
          onCancel={() => setDeleteReportTarget(null)}
        />
      )}

      {deleteFindingTarget && (
        <ConfirmDialog
          title="Eliminar hallazgo"
          message={`¿Eliminar el hallazgo "${deleteFindingTarget.title}"? Esta accion no se puede deshacer.`}
          busy={busy}
          onConfirm={handleDeleteFinding}
          onCancel={() => setDeleteFindingTarget(null)}
        />
      )}
    </div>
  );
}
