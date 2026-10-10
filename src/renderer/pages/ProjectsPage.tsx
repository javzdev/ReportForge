import React, { useEffect, useState } from 'react';
import type { Project } from '@shared/types';
import { useRouter } from '../lib/router';
import { getErrorMessage } from '../lib/errors';
import { formatDateTime } from '../lib/format';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import Banner from '../components/Banner';
import EmptyState from '../components/EmptyState';
import NewProjectModal from '../components/NewProjectModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../hooks/useToast';

export default function ProjectsPage(): React.ReactElement {
  const { navigate } = useRouter();
  const { showToast } = useToast();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function loadProjects(): Promise<void> {
    setError(null);
    try {
      const list = await window.reportForge.projects.list();
      setProjects([...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudieron cargar los proyectos.'));
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  async function handleDelete(): Promise<void> {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await window.reportForge.projects.delete(deleteTarget.id);
      setDeleteTarget(null);
      showToast('success', `Proyecto "${deleteTarget.name}" eliminado.`);
      await loadProjects();
    } catch (err) {
      setDeleteError(getErrorMessage(err, 'No se pudo eliminar el proyecto.'));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Proyectos</h1>
          <p className="page-subtitle">Cada proyecto agrupa reportes, hallazgos y evidencias de una evaluacion.</p>
        </div>
        <div className="page-actions">
          <Button variant="primary" onClick={() => setShowNewProject(true)}>
            + Nuevo proyecto
          </Button>
        </div>
      </div>

      {error && <Banner kind="error">{error}</Banner>}

      {projects === null ? (
        <Spinner label="Cargando proyectos..." />
      ) : projects.length === 0 ? (
        <EmptyState
          icon="🗂️"
          title="Aun no tienes proyectos"
          description="Crea un proyecto para empezar a organizar tus evaluaciones de seguridad."
          action={
            <Button variant="primary" onClick={() => setShowNewProject(true)}>
              + Crear proyecto
            </Button>
          }
        />
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Cliente</th>
              <th>Actualizado</th>
              <th aria-hidden="true" />
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id}>
                <td>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    style={{ padding: 0, fontWeight: 600 }}
                    onClick={() => navigate({ name: 'project-detail', projectId: project.id })}
                  >
                    {project.name}
                  </button>
                </td>
                <td>{project.clientName}</td>
                <td>{formatDateTime(project.updatedAt)}</td>
                <td style={{ display: 'flex', gap: 8 }}>
                  <Button size="sm" variant="ghost" onClick={() => navigate({ name: 'project-detail', projectId: project.id })}>
                    Abrir
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(project)}>
                    Eliminar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreated={(project) => {
            setShowNewProject(false);
            navigate({ name: 'project-detail', projectId: project.id });
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Eliminar proyecto"
          message={
            <>
              <p>
                ¿Eliminar el proyecto <strong>{deleteTarget.name}</strong>? Esta accion borrara tambien sus reportes,
                hallazgos y evidencias asociadas. No se puede deshacer.
              </p>
              {deleteError && <Banner kind="error">{deleteError}</Banner>}
            </>
          }
          confirmLabel="Eliminar proyecto"
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
