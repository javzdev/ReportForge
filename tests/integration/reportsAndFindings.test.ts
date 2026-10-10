import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { openDatabase, closeDatabase } from '../../src/db/connection';
import { createProject, deleteProject } from '../../src/db/repositories/projectsRepo';
import { upsertTemplate } from '../../src/db/repositories/templatesRepo';
import { createReport, getReport, saveReport, deleteReport, listReportsByProject } from '../../src/db/repositories/reportsRepo';
import { createFinding, getFinding, saveFinding, deleteFinding, listFindings } from '../../src/db/repositories/findingsRepo';
import type { ReportTemplate } from '../../src/shared/types';

let tempDir: string;

const sampleTemplate: ReportTemplate = {
  id: 'tpl-test',
  kind: 'custom',
  name: 'Plantilla de prueba',
  description: 'Para pruebas',
  isBuiltIn: false,
  isCustomCopy: false,
  sections: [
    {
      id: 'seccion-1',
      title: 'Seccion 1',
      order: 0,
      required: true,
      fields: [{ id: 'campo-1', label: 'Campo 1', type: 'text', required: true }],
    },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reportforge-test-'));
  openDatabase(tempDir);
  upsertTemplate(sampleTemplate);
});

afterEach(() => {
  closeDatabase();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('reportsRepo', () => {
  it('crea un reporte con historial de version inicial', () => {
    const project = createProject({ name: 'P', clientName: 'C' });
    const report = createReport({
      projectId: project.id,
      templateId: sampleTemplate.id,
      title: 'Informe de prueba',
      classification: 'confidencial',
      sections: [],
    });

    expect(report.title).toBe('Informe de prueba');
    expect(report.versionHistory).toHaveLength(1);
    expect(report.versionHistory[0].version).toBe('0.1');
  });

  it('guarda cambios en las secciones de un reporte y persiste entre lecturas (simula cierre y reapertura)', () => {
    const project = createProject({ name: 'P', clientName: 'C' });
    const report = createReport({
      projectId: project.id,
      templateId: sampleTemplate.id,
      title: 'Informe',
      classification: 'confidencial',
      sections: [],
    });

    const updated = saveReport({
      ...report,
      sections: [{ sectionId: 'seccion-1', values: { 'campo-1': 'Valor guardado' } }],
    });

    expect(updated.sections[0].values['campo-1']).toBe('Valor guardado');

    // Simula "cerrar y volver a abrir la app": releer desde la base de datos.
    const reread = getReport(report.id);
    expect(reread?.sections[0].values['campo-1']).toBe('Valor guardado');
  });

  it('lista reportes por proyecto', () => {
    const project = createProject({ name: 'P', clientName: 'C' });
    const otherProject = createProject({ name: 'Otro', clientName: 'C2' });

    createReport({ projectId: project.id, templateId: sampleTemplate.id, title: 'R1', classification: 'confidencial', sections: [] });
    createReport({ projectId: otherProject.id, templateId: sampleTemplate.id, title: 'R2', classification: 'confidencial', sections: [] });

    const list = listReportsByProject(project.id);
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe('R1');
  });

  it('elimina un reporte', () => {
    const project = createProject({ name: 'P', clientName: 'C' });
    const report = createReport({ projectId: project.id, templateId: sampleTemplate.id, title: 'R', classification: 'confidencial', sections: [] });

    deleteReport(report.id);
    expect(getReport(report.id)).toBeNull();
  });

  it('eliminar un proyecto elimina en cascada sus reportes', () => {
    const project = createProject({ name: 'P', clientName: 'C' });
    const report = createReport({ projectId: project.id, templateId: sampleTemplate.id, title: 'R', classification: 'confidencial', sections: [] });

    deleteProject(project.id);

    expect(getReport(report.id)).toBeNull();
  });
});

describe('findingsRepo', () => {
  it('crea un hallazgo con severidad y estado', () => {
    const project = createProject({ name: 'P', clientName: 'C' });
    const finding = createFinding({
      projectId: project.id,
      title: 'Hallazgo de prueba',
      description: 'Descripcion',
      affectedAsset: 'activo.ejemplo.local',
      category: 'Inyeccion',
      severity: 'alta',
      status: 'borrador',
      identifiedDate: '2026-01-01',
    });

    expect(finding.severity).toBe('alta');
    expect(finding.status).toBe('borrador');

    const reread = getFinding(finding.id);
    expect(reread?.title).toBe('Hallazgo de prueba');
  });

  it('filtra hallazgos por severidad y por texto de busqueda', () => {
    const project = createProject({ name: 'P', clientName: 'C' });
    createFinding({
      projectId: project.id,
      title: 'XSS en formulario',
      description: '',
      affectedAsset: '',
      category: '',
      severity: 'media',
      status: 'borrador',
      identifiedDate: '2026-01-01',
    });
    createFinding({
      projectId: project.id,
      title: 'SQLi en login',
      description: '',
      affectedAsset: '',
      category: '',
      severity: 'critica',
      status: 'borrador',
      identifiedDate: '2026-01-01',
    });

    const bySeverity = listFindings({ projectId: project.id, severity: 'critica' });
    expect(bySeverity).toHaveLength(1);
    expect(bySeverity[0].title).toBe('SQLi en login');

    const bySearch = listFindings({ projectId: project.id, searchText: 'XSS' });
    expect(bySearch).toHaveLength(1);
    expect(bySearch[0].title).toBe('XSS en formulario');
  });

  it('actualiza el estado de un hallazgo', () => {
    const project = createProject({ name: 'P', clientName: 'C' });
    const finding = createFinding({
      projectId: project.id,
      title: 'H',
      description: '',
      affectedAsset: '',
      category: '',
      severity: 'baja',
      status: 'borrador',
      identifiedDate: '2026-01-01',
    });

    const updated = saveFinding({ ...finding, status: 'corregido', retestDate: '2026-02-01' });
    expect(updated.status).toBe('corregido');

    const reread = getFinding(finding.id);
    expect(reread?.status).toBe('corregido');
    expect(reread?.retestDate).toBe('2026-02-01');
  });

  it('elimina un hallazgo', () => {
    const project = createProject({ name: 'P', clientName: 'C' });
    const finding = createFinding({
      projectId: project.id,
      title: 'H',
      description: '',
      affectedAsset: '',
      category: '',
      severity: 'informativa',
      status: 'borrador',
      identifiedDate: '2026-01-01',
    });

    deleteFinding(finding.id);
    expect(getFinding(finding.id)).toBeNull();
  });
});
