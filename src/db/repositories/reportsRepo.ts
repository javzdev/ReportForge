import { randomUUID } from 'node:crypto';
import { getDatabase } from '../connection';
import type {
  Report,
  ReportAuthor,
  ReportVersionEntry,
  ReportSectionContent,
  DocumentClassification,
} from '@shared/types';

interface ReportRow {
  id: string;
  project_id: string;
  template_id: string;
  title: string;
  classification: string;
  authors_json: string;
  version_history_json: string;
  sections_json: string;
  created_at: string;
  updated_at: string;
}

function rowToReport(row: ReportRow): Report {
  return {
    id: row.id,
    projectId: row.project_id,
    templateId: row.template_id,
    title: row.title,
    classification: row.classification as DocumentClassification,
    authors: JSON.parse(row.authors_json) as ReportAuthor[],
    versionHistory: JSON.parse(row.version_history_json) as ReportVersionEntry[],
    sections: JSON.parse(row.sections_json) as ReportSectionContent[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listReportsByProject(projectId: string): Report[] {
  const rows = getDatabase()
    .prepare('SELECT * FROM reports WHERE project_id = ? ORDER BY updated_at DESC')
    .all(projectId) as ReportRow[];
  return rows.map(rowToReport);
}

export function listAllReports(): Report[] {
  const rows = getDatabase()
    .prepare('SELECT * FROM reports ORDER BY updated_at DESC')
    .all() as ReportRow[];
  return rows.map(rowToReport);
}

export function getReport(id: string): Report | null {
  const row = getDatabase().prepare('SELECT * FROM reports WHERE id = ?').get(id) as
    | ReportRow
    | undefined;
  return row ? rowToReport(row) : null;
}

export interface CreateReportInput {
  projectId: string;
  templateId: string;
  title: string;
  classification: DocumentClassification;
  sections: ReportSectionContent[];
}

function persistReport(report: Report): void {
  getDatabase()
    .prepare(
      `INSERT INTO reports (id, project_id, template_id, title, classification, authors_json, version_history_json, sections_json, created_at, updated_at)
       VALUES (@id, @projectId, @templateId, @title, @classification, @authorsJson, @versionHistoryJson, @sectionsJson, @createdAt, @updatedAt)
       ON CONFLICT(id) DO UPDATE SET
         title = @title, classification = @classification, authors_json = @authorsJson,
         version_history_json = @versionHistoryJson, sections_json = @sectionsJson, updated_at = @updatedAt`
    )
    .run({
      id: report.id,
      projectId: report.projectId,
      templateId: report.templateId,
      title: report.title,
      classification: report.classification,
      authorsJson: JSON.stringify(report.authors),
      versionHistoryJson: JSON.stringify(report.versionHistory),
      sectionsJson: JSON.stringify(report.sections),
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    });
}

export function createReport(input: CreateReportInput): Report {
  const now = new Date().toISOString();
  const report: Report = {
    id: randomUUID(),
    projectId: input.projectId,
    templateId: input.templateId,
    title: input.title.trim(),
    classification: input.classification,
    authors: [],
    versionHistory: [
      {
        id: randomUUID(),
        version: '0.1',
        date: now,
        author: '',
        changes: 'Creacion inicial del reporte.',
      },
    ],
    sections: input.sections,
    createdAt: now,
    updatedAt: now,
  };
  persistReport(report);
  return report;
}

export function saveReport(report: Report): Report {
  const updated: Report = { ...report, updatedAt: new Date().toISOString() };
  persistReport(updated);
  return updated;
}

export function deleteReport(id: string): void {
  getDatabase().prepare('DELETE FROM reports WHERE id = ?').run(id);
}
