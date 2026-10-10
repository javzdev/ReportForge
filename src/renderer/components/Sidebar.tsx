import React from 'react';
import { useRouter, type Route } from '../lib/router';
import './Sidebar.css';

interface NavItem {
  label: string;
  icon: string;
  route: Route;
  matches: (route: Route) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Inicio', icon: '🏠', route: { name: 'dashboard' }, matches: (r) => r.name === 'dashboard' },
  {
    label: 'Proyectos',
    icon: '🗂️',
    route: { name: 'projects' },
    matches: (r) => r.name === 'projects' || r.name === 'project-detail',
  },
  {
    label: 'Plantillas',
    icon: '📋',
    route: { name: 'templates' },
    matches: (r) => r.name === 'templates' || r.name === 'template-detail',
  },
  {
    label: 'Hallazgos',
    icon: '🛡️',
    route: { name: 'findings' },
    matches: (r) => r.name === 'findings' || r.name === 'finding-editor',
  },
  {
    label: 'Configuracion',
    icon: '⚙️',
    route: { name: 'settings' },
    matches: (r) => r.name === 'settings' || r.name === 'privacy',
  },
];

export default function Sidebar(): React.ReactElement {
  const { route, navigate } = useRouter();

  return (
    <nav className="sidebar" aria-label="Navegacion principal">
      <div className="sidebar__brand">
        <span className="sidebar__brand-icon" aria-hidden="true">
          🔒
        </span>
        <div>
          <div className="sidebar__brand-name">ReportForge</div>
          <div className="sidebar__brand-tag">Local · Sin nube</div>
        </div>
      </div>

      <ul className="sidebar__nav">
        {NAV_ITEMS.map((item) => {
          const active = item.matches(route);
          return (
            <li key={item.label}>
              <button
                type="button"
                className={`sidebar__nav-item${active ? ' sidebar__nav-item--active' : ''}`}
                onClick={() => navigate(item.route)}
                aria-current={active ? 'page' : undefined}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="sidebar__footer">
        <span className="sidebar__footer-dot" aria-hidden="true" />
        100% local · sin conexion a internet
      </div>
    </nav>
  );
}
