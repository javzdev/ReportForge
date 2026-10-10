import React, { useEffect, useState } from 'react';
import type { Project, Report } from '@shared/types';
import { useRouter } from '../lib/router';
import { getErrorMessage } from '../lib/errors';
import { formatDateTime } from '../lib/format';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import Banner from '../components/Banner';
import EmptyState from '../components/EmptyState';
import NewProjectModal from '../components/NewProjectModal';

interface RecentReport extends Report {
  projectName: string;
}

// Inicio/Dashboard: punto de entrada a la app. Muestra proyectos y reportes recientes
// para que el usuario continue donde lo dejo, con accesos rapidos a lo mas comun
// (crear proyecto) y a la seccion de privacidad, dado que es software que maneja
// informacion sensible y queremos que esa pagina sea facil de encontrar.
export default function DashboardPage(): React.ReactElement {
  const { navigate } = useRouter();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [recentReports, setRecentReports] = useState<RecentReport[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);

  async function loadData(): Promise<void> {
    setError(null);
    try {
      const projectList = await window.reportForge.projects.list();
      const sortedProjects = [...projectList].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      setProjects(sortedProjects);

      const reportsByProject = await Promise.all(
        projectList.map(async (project) => {
          const reports = await window.reportForge.reports.listByProject(project.id);
          return reports.map((report) => ({ ...report, projectName: project.name }));
        })
      );
      const allReports = reportsByProject
        .flat()
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 6);
      setRecentReports(allReports);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudieron cargar los datos del inicio.'));
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const loading = projects === null;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Inicio</h1>
          <p className="page-subtitle">Resumen de tu actividad reciente. Todo se guarda unicamente en este equipo.</p>
        </div>
        <div className="page-actions">
          <Button variant="secondary" onClick={() => navigate({ name: 'privacy' })}>
            Privacidad y almacenamiento
          </Button>
          <Button variant="primary" onClick={() => setShowNewProject(true)}>
            + Nuevo proyecto
          </Button>
        </div>
      </div>

      {error && <Banner kind="error">{error}</Banner>}

      {loading ? (
        <Spinner label="Cargando inicio..." />
      ) : projects && projects.length === 0 ? (
        <EmptyState
          icon="🗂️"
          title="Aun no tienes proyectos"
          description="Crea tu primer proyecto para comenzar a organizar evaluaciones, reportes y hallazgos."
          action={
            <Button variant="primary" onClick={() => setShowNewProject(true)}>
              + Crear mi primer proyecto
            </Button>
          }
        />
      ) : (
        <>
          <h2 className="section-title">Proyectos recientes</h2>
          <div className="grid grid--cards">
            {projects?.slice(0, 6).map((project) => (
              <button
                key={project.id}
                type="button"
                className="card card--interactive"
                style={{ textAlign: 'left', border: 'none', width: '100%' }}
                onClick={() => navigate({ name: 'project-detail', projectId: project.id })}
              >
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{project.name}</div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: 13, marginBottom: 8 }}>
                  Cliente: {project.clientName}
                </div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
                  Actualizado: {formatDateTime(project.updatedAt)}
                </div>
              </button>
            ))}
          </div>

          <h2 className="section-title">Reportes recientes</h2>
          {recentReports === null ? (
            <Spinner label="Cargando reportes..." />
          ) : recentReports.length === 0 ? (
            <EmptyState
              icon="📄"
              title="Aun no hay reportes"
              description="Crea un reporte desde un proyecto para empezar a redactar."
            />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Titulo</th>
                  <th>Proyecto</th>
                  <th>Actualizado</th>
                  <th aria-hidden="true" />
                </tr>
              </thead>
              <tbody>
                {recentReports.map((report) => (
                  <tr key={report.id}>
                    <td>{report.title}</td>
                    <td>{report.projectName}</td>
                    <td>{formatDateTime(report.updatedAt)}</td>
                    <td>
                      <Button size="sm" variant="ghost" onClick={() => navigate({ name: 'report-editor', reportId: report.id })}>
                        Abrir
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
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
    </div>
  );
}
