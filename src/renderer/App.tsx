import React from 'react';
import { RouterProvider, useRouter } from './lib/router';
import { ThemeProvider } from './hooks/useTheme';
import { ToastProvider } from './hooks/useToast';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import TemplatesPage from './pages/TemplatesPage';
import TemplateDetailPage from './pages/TemplateDetailPage';
import FindingsPage from './pages/FindingsPage';
import FindingEditorPage from './pages/FindingEditorPage';
import NewReportPage from './pages/NewReportPage';
import ReportEditorPage from './pages/ReportEditorPage';
import ReportPreviewPage from './pages/ReportPreviewPage';
import SettingsPage from './pages/SettingsPage';
import PrivacyPage from './pages/PrivacyPage';
import './components/ui.css';

function RouteSwitch(): React.ReactElement {
  const { route } = useRouter();

  switch (route.name) {
    case 'dashboard':
      return <DashboardPage />;
    case 'projects':
      return <ProjectsPage />;
    case 'project-detail':
      return <ProjectDetailPage projectId={route.projectId} />;
    case 'templates':
      return <TemplatesPage />;
    case 'template-detail':
      return <TemplateDetailPage templateId={route.templateId} />;
    case 'findings':
      return <FindingsPage />;
    case 'finding-editor':
      return <FindingEditorPage findingId={route.findingId} projectId={route.projectId} reportId={route.reportId} />;
    case 'new-report':
      return <NewReportPage projectId={route.projectId} templateId={route.templateId} />;
    case 'report-editor':
      return <ReportEditorPage reportId={route.reportId} />;
    case 'report-preview':
      return <ReportPreviewPage reportId={route.reportId} />;
    case 'settings':
      return <SettingsPage />;
    case 'privacy':
      return <PrivacyPage />;
    default:
      return <DashboardPage />;
  }
}

export default function App(): React.ReactElement {
  return (
    <ThemeProvider>
      <ToastProvider>
        <RouterProvider>
          <div className="app-shell">
            <Sidebar />
            <main id="main-content" className="app-main" tabIndex={-1}>
              <RouteSwitch />
            </main>
          </div>
        </RouterProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
