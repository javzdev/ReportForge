import { ipcMain, dialog, app, type IpcMainInvokeEvent } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { IPC } from '@shared/ipcChannels';
import * as projectsRepo from '../db/repositories/projectsRepo';
import * as templatesRepo from '../db/repositories/templatesRepo';
import * as reportsRepo from '../db/repositories/reportsRepo';
import * as findingsRepo from '../db/repositories/findingsRepo';
import * as attachmentsRepo from '../db/repositories/attachmentsRepo';
import {
  validateAttachmentFile,
  storeAttachmentFile,
  getAttachmentFilePath,
  deleteAttachmentFile,
  initAttachmentStorage,
  AttachmentValidationError,
} from './attachmentStorage';
import { closeDatabase, openDatabase } from '../db/connection';
import { ensureBuiltInTemplatesSeeded } from './templateSeeder';
import { getAllSettings, setSetting } from './settingsManager';
import { buildReportHtml } from '../export/reportHtmlBuilder';
import { exportHtmlToPdf } from '../export/pdfExporter';
import {
  buildBackupPayload,
  validateBackupPayload,
  importBackupPayload,
  copyEvidenceFilesIntoStorage,
  BackupValidationError,
} from './backupManager';
import { randomUUID } from 'node:crypto';
import type { Attachment, AppSettings } from '@shared/types';

/** Error "de negocio" cuyo mensaje ya esta redactado en espanol para mostrarse directo al usuario. */
export class AppUserError extends Error {}

/**
 * Traduce cualquier error a un mensaje seguro para el renderer: los errores de negocio
 * (AppUserError, AttachmentValidationError, BackupValidationError) conservan su mensaje
 * porque fueron redactados a mano; cualquier otro error (SQLite, I/O del sistema, etc.)
 * se reemplaza por un mensaje generico para no filtrar rutas, SQL ni stacks internos.
 */
function toSafeErrorMessage(error: unknown): string {
  if (
    error instanceof AppUserError ||
    error instanceof AttachmentValidationError ||
    error instanceof BackupValidationError
  ) {
    return error.message;
  }
  return 'Ocurrio un error inesperado al procesar la solicitud.';
}

/** Registra un handler de ipcMain que traduce cualquier excepcion a un mensaje seguro. */
function safeHandle<T extends unknown[], R>(
  channel: string,
  handler: (event: IpcMainInvokeEvent, ...args: T) => R | Promise<R>
): void {
  ipcMain.handle(channel, async (event, ...args: T) => {
    try {
      return await handler(event, ...args);
    } catch (error) {
      throw new Error(toSafeErrorMessage(error));
    }
  });
}

export function registerIpcHandlers(getUserDataPath: () => string): void {
  // --- Proyectos ---
  safeHandle(IPC.PROJECTS_LIST, () => projectsRepo.listProjects());
  safeHandle(IPC.PROJECTS_CREATE, (_e, input: projectsRepo.CreateProjectInput) => {
    if (!input.name?.trim() || !input.clientName?.trim()) {
      throw new AppUserError('Nombre de proyecto y cliente son obligatorios.');
    }
    return projectsRepo.createProject(input);
  });
  safeHandle(IPC.PROJECTS_UPDATE, (_e, input: projectsRepo.UpdateProjectInput) =>
    projectsRepo.updateProject(input)
  );
  safeHandle(IPC.PROJECTS_DELETE, (_e, id: string) => {
    projectsRepo.deleteProject(id);
    const evidenceDir = path.join(getUserDataPath(), 'evidence', id);
    if (fs.existsSync(evidenceDir)) {
      fs.rmSync(evidenceDir, { recursive: true, force: true });
    }
  });

  // --- Plantillas ---
  safeHandle(IPC.TEMPLATES_LIST, () => templatesRepo.listTemplates());
  safeHandle(IPC.TEMPLATES_GET, (_e, id: string) => templatesRepo.getTemplate(id));
  safeHandle(IPC.TEMPLATES_DUPLICATE, (_e, input: templatesRepo.DuplicateTemplateInput) =>
    templatesRepo.duplicateTemplate(input)
  );
  safeHandle(IPC.TEMPLATES_SAVE, (_e, template: Parameters<typeof templatesRepo.upsertTemplate>[0]) =>
    templatesRepo.upsertTemplate(template)
  );
  safeHandle(IPC.TEMPLATES_CREATE_CUSTOM, (_e, name: string, description: string) =>
    templatesRepo.createCustomTemplate(name, description)
  );
  safeHandle(IPC.TEMPLATES_DELETE, (_e, id: string) => {
    try {
      templatesRepo.deleteTemplate(id);
    } catch (error) {
      if (error instanceof Error) throw new AppUserError(error.message);
      throw error;
    }
  });

  // --- Reportes ---
  safeHandle(IPC.REPORTS_LIST_BY_PROJECT, (_e, projectId: string) =>
    reportsRepo.listReportsByProject(projectId)
  );
  safeHandle(IPC.REPORTS_GET, (_e, id: string) => reportsRepo.getReport(id));
  safeHandle(IPC.REPORTS_CREATE, (_e, input: reportsRepo.CreateReportInput) => {
    if (!input.title?.trim()) throw new AppUserError('El titulo del reporte es obligatorio.');
    return reportsRepo.createReport(input);
  });
  safeHandle(IPC.REPORTS_SAVE, (_e, report: Parameters<typeof reportsRepo.saveReport>[0]) =>
    reportsRepo.saveReport(report)
  );
  safeHandle(IPC.REPORTS_DELETE, (_e, id: string) => reportsRepo.deleteReport(id));

  // --- Hallazgos ---
  safeHandle(IPC.FINDINGS_LIST, (_e, filters: findingsRepo.FindingFilters) =>
    findingsRepo.listFindings(filters)
  );
  safeHandle(IPC.FINDINGS_GET, (_e, id: string) => findingsRepo.getFinding(id));
  safeHandle(IPC.FINDINGS_CREATE, (_e, input: findingsRepo.CreateFindingInput) => {
    if (!input.title?.trim()) throw new AppUserError('El titulo del hallazgo es obligatorio.');
    return findingsRepo.createFinding(input);
  });
  safeHandle(IPC.FINDINGS_SAVE, (_e, finding: Parameters<typeof findingsRepo.saveFinding>[0]) =>
    findingsRepo.saveFinding(finding)
  );
  safeHandle(IPC.FINDINGS_DELETE, (_e, id: string) => findingsRepo.deleteFinding(id));

  // --- Adjuntos ---
  safeHandle(IPC.ATTACHMENTS_LIST_BY_PROJECT, (_e, projectId: string) =>
    attachmentsRepo.listAttachmentsByProject(projectId)
  );
  safeHandle(IPC.ATTACHMENTS_LIST_BY_FINDING, (_e, findingId: string) =>
    attachmentsRepo.listAttachmentsByFinding(findingId)
  );

  safeHandle(IPC.ATTACHMENTS_PICK_FILES, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Archivos permitidos', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf', 'txt', 'csv', 'json'] },
      ],
    });
    if (result.canceled) return [];
    return result.filePaths;
  });

  safeHandle(
    IPC.ATTACHMENTS_ADD,
    (_e, input: { projectId: string; findingId?: string; sourcePath: string; mimeType: string; description?: string }) => {
      const stats = fs.statSync(input.sourcePath);
      const originalFileName = path.basename(input.sourcePath);
      const settings = getAllSettings();

      validateAttachmentFile({
        originalFileName,
        mimeType: input.mimeType,
        sizeBytes: stats.size,
        maxSizeBytes: settings.maxAttachmentSizeBytes,
      });

      const storedFileName = storeAttachmentFile(input.projectId, input.sourcePath, originalFileName);

      const attachment: Attachment = {
        id: randomUUID(),
        projectId: input.projectId,
        findingId: input.findingId,
        originalFileName,
        storedFileName,
        mimeType: input.mimeType,
        sizeBytes: stats.size,
        description: input.description,
        createdAt: new Date().toISOString(),
      };

      return attachmentsRepo.insertAttachment(attachment);
    }
  );

  safeHandle(IPC.ATTACHMENTS_DELETE, (_e, id: string) => {
    const attachment = attachmentsRepo.getAttachment(id);
    if (attachment) {
      deleteAttachmentFile(attachment.projectId, attachment.storedFileName);
      attachmentsRepo.deleteAttachment(id);
    }
  });

  safeHandle(IPC.ATTACHMENTS_READ_AS_DATA_URL, (_e, id: string) => {
    const attachment = attachmentsRepo.getAttachment(id);
    if (!attachment) throw new AppUserError('Evidencia no encontrada.');

    const filePath = getAttachmentFilePath(attachment.projectId, attachment.storedFileName);
    const buffer = fs.readFileSync(filePath);
    const base64 = buffer.toString('base64');
    return `data:${attachment.mimeType};base64,${base64}`;
  });

  // --- Configuracion ---
  safeHandle(IPC.SETTINGS_GET, () => getAllSettings());
  safeHandle(IPC.SETTINGS_SET, (_e, key: keyof AppSettings, value: unknown) => {
    setSetting(key, value as never);
    return getAllSettings();
  });

  // --- Exportacion ---
  safeHandle(IPC.EXPORT_REPORT_TO_PDF, async (_e, reportId: string) => {
    const report = reportsRepo.getReport(reportId);
    if (!report) throw new AppUserError('Reporte no encontrado.');
    const template = templatesRepo.getTemplate(report.templateId);
    if (!template) throw new AppUserError('Plantilla del reporte no encontrada.');
    const findings = findingsRepo.listFindings({ reportId });
    const settings = getAllSettings();

    const saveResult = await dialog.showSaveDialog({
      title: 'Exportar reporte a PDF',
      defaultPath: `${report.title.replace(/[^a-zA-Z0-9-_ ]/g, '')}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });

    if (saveResult.canceled || !saveResult.filePath) {
      return { canceled: true as const };
    }

    const html = buildReportHtml({ report, template, findings, settings });
    await exportHtmlToPdf(html, saveResult.filePath);

    return { canceled: false as const, filePath: saveResult.filePath };
  });

  // --- Backups ---
  safeHandle(IPC.BACKUP_CREATE, async () => {
    const saveResult = await dialog.showSaveDialog({
      title: 'Crear respaldo local',
      defaultPath: `reportforge-backup-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'Respaldo ReportForge', extensions: ['json'] }],
    });

    if (saveResult.canceled || !saveResult.filePath) return { canceled: true as const };

    const payload = buildBackupPayload();
    fs.writeFileSync(saveResult.filePath, JSON.stringify(payload, null, 2), 'utf-8');

    return { canceled: false as const, filePath: saveResult.filePath };
  });

  safeHandle(IPC.BACKUP_PICK_FILE, async () => {
    const result = await dialog.showOpenDialog({
      title: 'Seleccionar archivo de respaldo',
      properties: ['openFile'],
      filters: [{ name: 'Respaldo ReportForge', extensions: ['json'] }],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  safeHandle(IPC.BACKUP_VALIDATE, (_e, filePath: string) => {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    const payload = validateBackupPayload(parsed);
    return payload.manifest;
  });

  safeHandle(IPC.BACKUP_IMPORT, (_e, filePath: string) => {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    const payload = validateBackupPayload(parsed);
    const summary = importBackupPayload(payload, null);
    copyEvidenceFilesIntoStorage(payload, path.dirname(filePath), getUserDataPath());
    return summary;
  });

  // --- App / datos ---
  safeHandle(IPC.APP_GET_INFO, () => ({
    version: app.getVersion(),
    userDataPath: getUserDataPath(),
    evidencePath: path.join(getUserDataPath(), 'evidence'),
  }));

  safeHandle(IPC.APP_DELETE_ALL_DATA, () => {
    const userDataPath = getUserDataPath();
    const dbPath = path.join(userDataPath, 'reportforge.db');
    const evidenceDir = path.join(userDataPath, 'evidence');

    // Se cierra la conexion antes de borrar para evitar corrupcion de archivos WAL.
    closeDatabase();

    for (const file of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
      if (fs.existsSync(file)) fs.rmSync(file, { force: true });
    }
    if (fs.existsSync(evidenceDir)) {
      fs.rmSync(evidenceDir, { recursive: true, force: true });
    }

    openDatabase(userDataPath);
    initAttachmentStorage(userDataPath);
    ensureBuiltInTemplatesSeeded();
  });
}
