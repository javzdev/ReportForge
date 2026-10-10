import fs from 'node:fs';
import path from 'node:path';
import { getDatabase, SCHEMA_VERSION } from '../db/connection';
import { getAttachmentFilePath, initAttachmentStorage } from './attachmentStorage';
import type { BackupPayload, AppSettings } from '@shared/types';
import { listProjects } from '../db/repositories/projectsRepo';
import { listTemplates, upsertTemplate } from '../db/repositories/templatesRepo';
import { listAllReports, saveReport } from '../db/repositories/reportsRepo';
import { listFindings, saveFinding } from '../db/repositories/findingsRepo';
import { insertAttachment } from '../db/repositories/attachmentsRepo';
import { getAllSettings, setSetting, DEFAULT_SETTINGS } from './settingsManager';

export class BackupValidationError extends Error {}

/**
 * Construye el payload completo de respaldo a partir del estado actual de la base de datos.
 * No incluye el contenido binario de los adjuntos (eso se empaqueta por separado si se desea),
 * pero si incluye sus metadatos para poder re-vincularlos tras una restauracion con los mismos archivos.
 */
export function buildBackupPayload(): BackupPayload {
  const projects = listProjects();
  const templates = listTemplates();
  const reports = listAllReports();
  const findings = listFindings();
  const db = getDatabase();
  const attachmentRows = db.prepare('SELECT * FROM attachments').all() as any[];

  const attachments = attachmentRows.map((row) => ({
    id: row.id,
    projectId: row.project_id,
    findingId: row.finding_id ?? undefined,
    reportId: row.report_id ?? undefined,
    originalFileName: row.original_file_name,
    storedFileName: row.stored_file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    description: row.description ?? undefined,
    createdAt: row.created_at,
  }));

  return {
    manifest: {
      appName: 'ReportForge Local',
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      counts: {
        projects: projects.length,
        templates: templates.length,
        reports: reports.length,
        findings: findings.length,
        attachments: attachments.length,
      },
    },
    projects,
    templates,
    reports,
    findings,
    attachments,
    settings: getAllSettings(),
  };
}

/**
 * Valida que el objeto parseado tenga la forma minima esperada de un backup de esta app.
 * No confia en el contenido: solo verifica estructura antes de permitir el resumen al usuario.
 */
export function validateBackupPayload(data: unknown): BackupPayload {
  if (typeof data !== 'object' || data === null) {
    throw new BackupValidationError('El archivo no contiene un objeto JSON valido.');
  }

  const payload = data as Partial<BackupPayload>;

  if (!payload.manifest || payload.manifest.appName !== 'ReportForge Local') {
    throw new BackupValidationError('El archivo no es un respaldo valido de ReportForge Local.');
  }

  if (typeof payload.manifest.schemaVersion !== 'number') {
    throw new BackupValidationError('El respaldo no indica una version de esquema valida.');
  }

  if (payload.manifest.schemaVersion > SCHEMA_VERSION) {
    throw new BackupValidationError(
      'Este respaldo fue creado por una version mas nueva de la aplicacion. Actualiza ReportForge Local antes de importarlo.'
    );
  }

  const arrays: Array<[string, unknown]> = [
    ['projects', payload.projects],
    ['templates', payload.templates],
    ['reports', payload.reports],
    ['findings', payload.findings],
    ['attachments', payload.attachments],
  ];

  for (const [key, value] of arrays) {
    if (!Array.isArray(value)) {
      throw new BackupValidationError(`El respaldo tiene un formato invalido: falta la lista "${key}".`);
    }
  }

  return payload as BackupPayload;
}

export interface ImportSummary {
  projects: number;
  templates: number;
  reports: number;
  findings: number;
  attachments: number;
  attachmentsMissingFiles: string[];
}

/**
 * Importa un backup ya validado. Usa upsert por id, por lo que registros con el mismo id
 * se sobrescriben (el llamador debe haber mostrado la advertencia de sobrescritura antes).
 * Los archivos de adjuntos deben existir ya en evidenceSourceDir si se desea restaurarlos.
 */
export function importBackupPayload(
  payload: BackupPayload,
  evidenceSourceDir: string | null
): ImportSummary {
  const db = getDatabase();
  const attachmentsMissingFiles: string[] = [];

  const run = db.transaction(() => {
    for (const template of payload.templates) {
      upsertTemplate(template);
    }
    for (const project of payload.projects) {
      db.prepare(
        `INSERT INTO projects (id, name, client_name, description, created_at, updated_at)
         VALUES (@id, @name, @clientName, @description, @createdAt, @updatedAt)
         ON CONFLICT(id) DO UPDATE SET name=@name, client_name=@clientName, description=@description, updated_at=@updatedAt`
      ).run({ ...project, description: project.description ?? null });
    }
    for (const report of payload.reports) {
      saveReport(report);
    }
    for (const finding of payload.findings) {
      saveFinding(finding);
    }
    for (const attachment of payload.attachments) {
      const existing = db.prepare('SELECT id FROM attachments WHERE id = ?').get(attachment.id);
      if (!existing) {
        insertAttachment(attachment);
      }

      if (evidenceSourceDir) {
        const sourceFile = path.join(evidenceSourceDir, attachment.projectId, attachment.storedFileName);
        if (!fs.existsSync(sourceFile)) {
          attachmentsMissingFiles.push(attachment.originalFileName);
        }
      }
    }

    if (payload.settings) {
      for (const [key, value] of Object.entries(payload.settings)) {
        setSetting(key as keyof AppSettings, value as never);
      }
    }
  });

  run();

  return {
    projects: payload.projects.length,
    templates: payload.templates.length,
    reports: payload.reports.length,
    findings: payload.findings.length,
    attachments: payload.attachments.length,
    attachmentsMissingFiles,
  };
}

export function copyEvidenceFilesIntoStorage(
  payload: BackupPayload,
  evidenceSourceDir: string,
  userDataPath: string
): void {
  initAttachmentStorage(userDataPath);
  for (const attachment of payload.attachments) {
    const sourceFile = path.join(evidenceSourceDir, attachment.projectId, attachment.storedFileName);
    if (!fs.existsSync(sourceFile)) continue;

    const destDir = path.join(userDataPath, 'evidence', attachment.projectId);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

    const destFile = getAttachmentFilePath(attachment.projectId, attachment.storedFileName);
    fs.copyFileSync(sourceFile, destFile);
  }
}

export { DEFAULT_SETTINGS };
