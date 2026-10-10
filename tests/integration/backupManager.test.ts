import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { openDatabase, closeDatabase, SCHEMA_VERSION } from '../../src/db/connection';
import { createProject, getProject } from '../../src/db/repositories/projectsRepo';
import { createReport } from '../../src/db/repositories/reportsRepo';
import { createFinding } from '../../src/db/repositories/findingsRepo';
import { ensureBuiltInTemplatesSeeded } from '../../src/main/templateSeeder';
import {
  buildBackupPayload,
  validateBackupPayload,
  importBackupPayload,
  BackupValidationError,
} from '../../src/main/backupManager';

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reportforge-test-'));
  openDatabase(tempDir);
  ensureBuiltInTemplatesSeeded();
});

afterEach(() => {
  closeDatabase();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('validateBackupPayload', () => {
  it('rechaza un JSON que no es un objeto', () => {
    expect(() => validateBackupPayload('no soy un objeto')).toThrow(BackupValidationError);
    expect(() => validateBackupPayload(null)).toThrow(BackupValidationError);
  });

  it('rechaza un objeto sin manifest valido de ReportForge Local', () => {
    expect(() => validateBackupPayload({ foo: 'bar' })).toThrow(BackupValidationError);
    expect(() =>
      validateBackupPayload({ manifest: { appName: 'OtraApp', schemaVersion: 1 } })
    ).toThrow(BackupValidationError);
  });

  it('rechaza un respaldo de una version de esquema futura desconocida', () => {
    const payload = buildBackupPayload();
    payload.manifest.schemaVersion = SCHEMA_VERSION + 10;
    expect(() => validateBackupPayload(payload)).toThrow(BackupValidationError);
  });

  it('rechaza un respaldo con listas faltantes o corruptas', () => {
    const payload = buildBackupPayload();
    const corrupted = { ...payload, projects: 'no es un arreglo' };
    expect(() => validateBackupPayload(corrupted)).toThrow(BackupValidationError);
  });

  it('acepta un respaldo valido generado por la propia app', () => {
    createProject({ name: 'P', clientName: 'C' });
    const payload = buildBackupPayload();
    expect(() => validateBackupPayload(payload)).not.toThrow();
  });
});

describe('importBackupPayload', () => {
  it('restaura proyectos, reportes y hallazgos desde un respaldo valido', () => {
    const project = createProject({ name: 'Proyecto original', clientName: 'Cliente' });
    const report = createReport({
      projectId: project.id,
      templateId: 'pentest_web',
      title: 'Informe original',
      classification: 'confidencial',
      sections: [],
    });
    createFinding({
      projectId: project.id,
      reportId: report.id,
      title: 'Hallazgo original',
      description: '',
      affectedAsset: '',
      category: '',
      severity: 'alta',
      status: 'borrador',
      identifiedDate: '2026-01-01',
    });

    const payload = buildBackupPayload();

    // Simula "perder los datos" (borrado total) y luego restaurar desde el backup.
    closeDatabase();
    const freshDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reportforge-restore-'));
    openDatabase(freshDir);
    ensureBuiltInTemplatesSeeded();

    expect(getProject(project.id)).toBeNull();

    const summary = importBackupPayload(payload, null);

    expect(summary.projects).toBe(1);
    expect(summary.findings).toBe(1);
    expect(getProject(project.id)?.name).toBe('Proyecto original');

    // Cierra la conexion a freshDir antes de borrarlo (Windows bloquea archivos abiertos),
    // y reabre sobre tempDir para que el afterEach global pueda cerrar y limpiar con normalidad.
    closeDatabase();
    fs.rmSync(freshDir, { recursive: true, force: true });
    openDatabase(tempDir);
  });

  it('sobrescribe registros existentes con el mismo id (comportamiento upsert documentado)', () => {
    const project = createProject({ name: 'Nombre viejo', clientName: 'Cliente' });
    const payload = buildBackupPayload();

    // Modifica el payload para simular una version mas reciente del mismo proyecto.
    payload.projects[0].name = 'Nombre nuevo desde backup';

    importBackupPayload(payload, null);

    expect(getProject(project.id)?.name).toBe('Nombre nuevo desde backup');
  });
});
