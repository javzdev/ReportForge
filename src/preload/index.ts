import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '@shared/ipcChannels';
import type {
  Project,
  ReportTemplate,
  Report,
  Finding,
  Attachment,
  AppSettings,
  Severity,
  FindingStatus,
  DocumentClassification,
  ReportSectionContent,
} from '@shared/types';

/**
 * API expuesta al renderer. Es deliberadamente una lista cerrada de funciones
 * tipadas (no un invoke generico), para que el renderer nunca pueda invocar
 * un canal IPC arbitrario ni pasar comandos de sistema.
 */
const reportForgeApi = {
  projects: {
    list: (): Promise<Project[]> => ipcRenderer.invoke(IPC.PROJECTS_LIST),
    create: (input: { name: string; clientName: string; description?: string }): Promise<Project> =>
      ipcRenderer.invoke(IPC.PROJECTS_CREATE, input),
    update: (input: { id: string; name?: string; clientName?: string; description?: string }): Promise<Project> =>
      ipcRenderer.invoke(IPC.PROJECTS_UPDATE, input),
    delete: (id: string): Promise<void> => ipcRenderer.invoke(IPC.PROJECTS_DELETE, id),
  },

  templates: {
    list: (): Promise<ReportTemplate[]> => ipcRenderer.invoke(IPC.TEMPLATES_LIST),
    get: (id: string): Promise<ReportTemplate | null> => ipcRenderer.invoke(IPC.TEMPLATES_GET, id),
    duplicate: (sourceId: string, newName: string): Promise<ReportTemplate> =>
      ipcRenderer.invoke(IPC.TEMPLATES_DUPLICATE, { sourceId, newName }),
    save: (template: ReportTemplate): Promise<ReportTemplate> => ipcRenderer.invoke(IPC.TEMPLATES_SAVE, template),
    createCustom: (name: string, description: string): Promise<ReportTemplate> =>
      ipcRenderer.invoke(IPC.TEMPLATES_CREATE_CUSTOM, name, description),
    delete: (id: string): Promise<void> => ipcRenderer.invoke(IPC.TEMPLATES_DELETE, id),
  },

  reports: {
    listByProject: (projectId: string): Promise<Report[]> =>
      ipcRenderer.invoke(IPC.REPORTS_LIST_BY_PROJECT, projectId),
    get: (id: string): Promise<Report | null> => ipcRenderer.invoke(IPC.REPORTS_GET, id),
    create: (input: {
      projectId: string;
      templateId: string;
      title: string;
      classification: DocumentClassification;
      sections: ReportSectionContent[];
    }): Promise<Report> => ipcRenderer.invoke(IPC.REPORTS_CREATE, input),
    save: (report: Report): Promise<Report> => ipcRenderer.invoke(IPC.REPORTS_SAVE, report),
    delete: (id: string): Promise<void> => ipcRenderer.invoke(IPC.REPORTS_DELETE, id),
  },

  findings: {
    list: (filters?: {
      projectId?: string;
      reportId?: string;
      severity?: Severity;
      status?: FindingStatus;
      searchText?: string;
    }): Promise<Finding[]> => ipcRenderer.invoke(IPC.FINDINGS_LIST, filters ?? {}),
    get: (id: string): Promise<Finding | null> => ipcRenderer.invoke(IPC.FINDINGS_GET, id),
    create: (input: Record<string, unknown>): Promise<Finding> => ipcRenderer.invoke(IPC.FINDINGS_CREATE, input),
    save: (finding: Finding): Promise<Finding> => ipcRenderer.invoke(IPC.FINDINGS_SAVE, finding),
    delete: (id: string): Promise<void> => ipcRenderer.invoke(IPC.FINDINGS_DELETE, id),
  },

  attachments: {
    listByProject: (projectId: string): Promise<Attachment[]> =>
      ipcRenderer.invoke(IPC.ATTACHMENTS_LIST_BY_PROJECT, projectId),
    listByFinding: (findingId: string): Promise<Attachment[]> =>
      ipcRenderer.invoke(IPC.ATTACHMENTS_LIST_BY_FINDING, findingId),
    pickFiles: (): Promise<string[]> => ipcRenderer.invoke(IPC.ATTACHMENTS_PICK_FILES),
    add: (input: {
      projectId: string;
      findingId?: string;
      sourcePath: string;
      mimeType: string;
      description?: string;
    }): Promise<Attachment> => ipcRenderer.invoke(IPC.ATTACHMENTS_ADD, input),
    delete: (id: string): Promise<void> => ipcRenderer.invoke(IPC.ATTACHMENTS_DELETE, id),
    readAsDataUrl: (id: string): Promise<string> => ipcRenderer.invoke(IPC.ATTACHMENTS_READ_AS_DATA_URL, id),
  },

  settings: {
    get: (): Promise<AppSettings> => ipcRenderer.invoke(IPC.SETTINGS_GET),
    set: <K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<AppSettings> =>
      ipcRenderer.invoke(IPC.SETTINGS_SET, key, value),
  },

  exportReport: {
    toPdf: (reportId: string): Promise<{ canceled: boolean; filePath?: string }> =>
      ipcRenderer.invoke(IPC.EXPORT_REPORT_TO_PDF, reportId),
  },

  backup: {
    create: (): Promise<{ canceled: boolean; filePath?: string }> => ipcRenderer.invoke(IPC.BACKUP_CREATE),
    pickFile: (): Promise<string | null> => ipcRenderer.invoke(IPC.BACKUP_PICK_FILE),
    validate: (filePath: string): Promise<unknown> => ipcRenderer.invoke(IPC.BACKUP_VALIDATE, filePath),
    import: (filePath: string): Promise<unknown> => ipcRenderer.invoke(IPC.BACKUP_IMPORT, filePath),
  },

  app: {
    getInfo: (): Promise<{ version: string; userDataPath: string; evidencePath: string }> =>
      ipcRenderer.invoke(IPC.APP_GET_INFO),
    deleteAllData: (): Promise<void> => ipcRenderer.invoke(IPC.APP_DELETE_ALL_DATA),
  },
};

export type ReportForgeApi = typeof reportForgeApi;

contextBridge.exposeInMainWorld('reportForge', reportForgeApi);
