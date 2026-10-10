// Tipos compartidos entre main, preload y renderer.
// Este archivo es la unica fuente de verdad del modelo de datos.

export type Severity = 'critica' | 'alta' | 'media' | 'baja' | 'informativa';

export type FindingStatus =
  | 'borrador'
  | 'pendiente_revision'
  | 'confirmado'
  | 'corregido'
  | 'aceptado'
  | 'cerrado';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'richtext'
  | 'date'
  | 'select'
  | 'table'
  | 'findings_table'
  | 'attachment_list';

export interface SectionFieldDefinition {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string[]; // para type: 'select'
}

export interface TemplateSection {
  id: string;
  title: string;
  order: number;
  description?: string;
  required: boolean;
  fields: SectionFieldDefinition[];
}

export type TemplateKind =
  | 'pentest_web'
  | 'api_security'
  | 'infra_interna'
  | 'infra_externa'
  | 'wireless'
  | 'cloud_config'
  | 'mobile_security'
  | 'code_review'
  | 'social_engineering'
  | 'vulnerability_analysis'
  | 'retest'
  | 'executive_summary'
  | 'custom';

export interface ReportTemplate {
  id: string;
  kind: TemplateKind;
  name: string;
  description: string;
  isBuiltIn: boolean;
  isCustomCopy: boolean;
  sections: TemplateSection[];
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  clientName: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export type DocumentClassification =
  | 'publico'
  | 'uso_interno'
  | 'confidencial'
  | 'estrictamente_confidencial';

export interface ReportAuthor {
  id: string;
  name: string;
  role: 'autor' | 'revisor' | 'aprobador';
}

export interface ReportVersionEntry {
  id: string;
  version: string;
  date: string;
  author: string;
  changes: string;
}

export interface ReportSectionContent {
  sectionId: string; // referencia a TemplateSection.id
  values: Record<string, unknown>; // fieldId -> valor
}

export interface Report {
  id: string;
  projectId: string;
  templateId: string;
  title: string;
  classification: DocumentClassification;
  authors: ReportAuthor[];
  versionHistory: ReportVersionEntry[];
  sections: ReportSectionContent[];
  createdAt: string;
  updatedAt: string;
}

export interface FindingReference {
  id: string;
  label: string; // ej. "CVE-2024-1234", "OWASP A01:2021"
}

export interface Finding {
  id: string;
  projectId: string;
  reportId?: string;
  title: string;
  description: string;
  affectedAsset: string;
  category: string;
  severity: Severity;
  severityJustification?: string;
  potentialImpact?: string;
  reproductionSteps?: string;
  remediationRecommendation?: string;
  status: FindingStatus;
  owner?: string;
  identifiedDate: string;
  retestDate?: string;
  references: FindingReference[];
  tags: string[];
  notes?: string;
  attachmentIds: string[];
  createdAt: string;
  updatedAt: string;
}

export const ACCEPTED_ATTACHMENT_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.pdf',
  '.txt',
  '.csv',
  '.json',
] as const;

export const ACCEPTED_ATTACHMENT_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
] as const;

export const MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB, configurable en Settings

export interface Attachment {
  id: string;
  projectId: string;
  findingId?: string;
  reportId?: string;
  originalFileName: string;
  storedFileName: string;
  mimeType: string;
  sizeBytes: number;
  description?: string;
  createdAt: string;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  brandName?: string;
  brandLogoAttachmentId?: string;
  defaultClassification: DocumentClassification;
  maxAttachmentSizeBytes: number;
}

export interface BackupManifest {
  appName: 'ReportForge Local';
  schemaVersion: number;
  exportedAt: string;
  counts: {
    projects: number;
    templates: number;
    reports: number;
    findings: number;
    attachments: number;
  };
}

export interface BackupPayload {
  manifest: BackupManifest;
  projects: Project[];
  templates: ReportTemplate[];
  reports: Report[];
  findings: Finding[];
  attachments: Attachment[];
  settings: AppSettings;
}
