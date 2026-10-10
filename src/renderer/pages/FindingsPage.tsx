import React, { useEffect, useState } from 'react';
import type { Finding, Project, Severity, FindingStatus } from '@shared/types';
import { useRouter } from '../lib/router';
import { getErrorMessage } from '../lib/errors';
import { formatDate, SEVERITY_LABELS, STATUS_LABELS } from '../lib/format';
import { SeverityBadge, StatusBadge } from '../components/Badges';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import Banner from '../components/Banner';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../hooks/useToast';

const SEVERITIES: Severity[] = ['critica', 'alta', 'media', 'baja', 'informativa'];
const STATUSES: FindingStatus[] = ['borrador', 'pendiente_revision', 'confirmado', 'corregido', 'aceptado', 'cerrado'];

// Vista global de hallazgos a traves de todos los proyectos, con busqueda y filtros.
// Usa findings.list(filters) directamente (el backend ya soporta projectId/severity/status/searchText),
// por lo que el filtrado ocurre en el proceso principal, no en el cliente.
export default function FindingsPage(): React.ReactElement {
  const { navigate } = useRouter();
  const { showToast } = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [findings, setFindings] = useState<Finding[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [projectFilter, setProjectFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState<Severity | ''>('');
  const [statusFilter, setStatusFilter] = useState<FindingStatus | ''>('');
  const [searchText, setSearchText] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<Finding | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    window.reportForge.projects
      .list()
      .then(setProjects)
      .catch((err) => setError(getErrorMessage(err, 'No se pudieron cargar los proyectos.')));
  }, []);

  async function loadFindings(): Promise<void> {
    setError(null);
    try {
      const list = await window.reportForge.findings.list({
        projectId: projectFilter || undefined,
        severity: severityFilter || undefined,
        status: statusFilter || undefined,
        searchText: searchText.trim() || undefined,
      });
      setFindings([...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudieron cargar los hallazgos.'));
    }
  }

  useEffect(() => {
    const timeout = setTimeout(loadFindings, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectFilter, severityFilter, statusFilter, searchText]);

  function projectName(projectId: string): string {
    return projects.find((p) => p.id === projectId)?.name ?? 'Proyecto desconocido';
  }

  async function handleDelete(): Promise<void> {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await window.reportForge.findings.delete(deleteTarget.id);
      setDeleteTarget(null);
      showToast('success', 'Hallazgo eliminado.');
      await loadFindings();
    } catch (err) {
      setDeleteError(getErrorMessage(err, 'No se pudo eliminar el hallazgo.'));
    } finally {
      setDeleting(false);
    }
  }

  const hasActiveFilters = Boolean(projectFilter || severityFilter || statusFilter || searchText);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Hallazgos</h1>
          <p className="page-subtitle">Busca y filtra hallazgos de todos tus proyectos.</p>
        </div>
        <div className="page-actions">
          <Button variant="primary" onClick={() => navigate({ name: 'finding-editor' })}>
            + Nuevo hallazgo
          </Button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label className="field-label" htmlFor="filter-search">
            Buscar
          </label>
          <input
            id="filter-search"
            className="input"
            placeholder="Titulo, descripcion, activo..."
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label className="field-label" htmlFor="filter-project">
            Proyecto
          </label>
          <select id="filter-project" className="select" value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}>
            <option value="">Todos</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label className="field-label" htmlFor="filter-severity">
            Severidad
          </label>
          <select
            id="filter-severity"
            className="select"
            value={severityFilter}
            onChange={(event) => setSeverityFilter(event.target.value as Severity | '')}
          >
            <option value="">Todas</option>
            {SEVERITIES.map((severity) => (
              <option key={severity} value={severity}>
                {SEVERITY_LABELS[severity]}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label className="field-label" htmlFor="filter-status">
            Estado
          </label>
          <select
            id="filter-status"
            className="select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as FindingStatus | '')}
          >
            <option value="">Todos</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <Banner kind="error">{error}</Banner>}

      {findings === null ? (
        <Spinner label="Cargando hallazgos..." />
      ) : findings.length === 0 ? (
        <EmptyState
          icon="🛡️"
          title={hasActiveFilters ? 'Sin resultados para estos filtros' : 'Aun no hay hallazgos'}
          description={hasActiveFilters ? 'Ajusta los filtros o la busqueda.' : 'Registra el primer hallazgo de seguridad.'}
          action={
            !hasActiveFilters && (
              <Button variant="primary" onClick={() => navigate({ name: 'finding-editor' })}>
                + Nuevo hallazgo
              </Button>
            )
          }
        />
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Titulo</th>
              <th>Proyecto</th>
              <th>Severidad</th>
              <th>Estado</th>
              <th>Identificado</th>
              <th aria-hidden="true" />
            </tr>
          </thead>
          <tbody>
            {findings.map((finding) => (
              <tr key={finding.id}>
                <td>{finding.title}</td>
                <td>{projectName(finding.projectId)}</td>
                <td>
                  <SeverityBadge severity={finding.severity} />
                </td>
                <td>
                  <StatusBadge status={finding.status} />
                </td>
                <td>{formatDate(finding.identifiedDate)}</td>
                <td style={{ display: 'flex', gap: 8 }}>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate({ name: 'finding-editor', findingId: finding.id, projectId: finding.projectId })}
                  >
                    Editar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(finding)}>
                    Eliminar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Eliminar hallazgo"
          message={
            <>
              <p>¿Eliminar el hallazgo "{deleteTarget.title}"? Esta accion no se puede deshacer.</p>
              {deleteError && <Banner kind="error">{deleteError}</Banner>}
            </>
          }
          busy={deleting}
          onConfirm={handleDelete}
          onCancel={() => {
            setDeleteTarget(null);
            setDeleteError(null);
          }}
        />
      )}
    </div>
  );
}
