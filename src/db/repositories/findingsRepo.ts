import { randomUUID } from 'node:crypto';
import { getDatabase } from '../connection';
import type { Finding, FindingReference, Severity, FindingStatus } from '@shared/types';

interface FindingRow {
  id: string;
  project_id: string;
  report_id: string | null;
  title: string;
  description: string;
  affected_asset: string;
  category: string;
  severity: string;
  severity_justification: string | null;
  potential_impact: string | null;
  reproduction_steps: string | null;
  remediation_recommendation: string | null;
  status: string;
  owner: string | null;
  identified_date: string;
  retest_date: string | null;
  references_json: string;
  tags_json: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function rowToFinding(row: FindingRow, attachmentIds: string[]): Finding {
  return {
    id: row.id,
    projectId: row.project_id,
    reportId: row.report_id ?? undefined,
    title: row.title,
    description: row.description,
    affectedAsset: row.affected_asset,
    category: row.category,
    severity: row.severity as Severity,
    severityJustification: row.severity_justification ?? undefined,
    potentialImpact: row.potential_impact ?? undefined,
    reproductionSteps: row.reproduction_steps ?? undefined,
    remediationRecommendation: row.remediation_recommendation ?? undefined,
    status: row.status as FindingStatus,
    owner: row.owner ?? undefined,
    identifiedDate: row.identified_date,
    retestDate: row.retest_date ?? undefined,
    references: JSON.parse(row.references_json) as FindingReference[],
    tags: JSON.parse(row.tags_json) as string[],
    notes: row.notes ?? undefined,
    attachmentIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getAttachmentIdsForFinding(findingId: string): string[] {
  const rows = getDatabase()
    .prepare('SELECT id FROM attachments WHERE finding_id = ?')
    .all(findingId) as { id: string }[];
  return rows.map((r) => r.id);
}

export interface FindingFilters {
  projectId?: string;
  reportId?: string;
  severity?: Severity;
  status?: FindingStatus;
  searchText?: string;
}

export function listFindings(filters: FindingFilters = {}): Finding[] {
  const clauses: string[] = [];
  const params: Record<string, string> = {};

  if (filters.projectId) {
    clauses.push('project_id = @projectId');
    params.projectId = filters.projectId;
  }
  if (filters.reportId) {
    clauses.push('report_id = @reportId');
    params.reportId = filters.reportId;
  }
  if (filters.severity) {
    clauses.push('severity = @severity');
    params.severity = filters.severity;
  }
  if (filters.status) {
    clauses.push('status = @status');
    params.status = filters.status;
  }
  if (filters.searchText) {
    clauses.push('(title LIKE @searchText OR description LIKE @searchText OR affected_asset LIKE @searchText)');
    params.searchText = `%${filters.searchText}%`;
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = getDatabase()
    .prepare(`SELECT * FROM findings ${where} ORDER BY updated_at DESC`)
    .all(params) as FindingRow[];

  return rows.map((row) => rowToFinding(row, getAttachmentIdsForFinding(row.id)));
}

export function getFinding(id: string): Finding | null {
  const row = getDatabase().prepare('SELECT * FROM findings WHERE id = ?').get(id) as
    | FindingRow
    | undefined;
  return row ? rowToFinding(row, getAttachmentIdsForFinding(row.id)) : null;
}

export interface CreateFindingInput {
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
  references?: FindingReference[];
  tags?: string[];
  notes?: string;
}

function persistFinding(finding: Finding): void {
  getDatabase()
    .prepare(
      `INSERT INTO findings (
        id, project_id, report_id, title, description, affected_asset, category, severity,
        severity_justification, potential_impact, reproduction_steps, remediation_recommendation,
        status, owner, identified_date, retest_date, references_json, tags_json, notes, created_at, updated_at
      ) VALUES (
        @id, @projectId, @reportId, @title, @description, @affectedAsset, @category, @severity,
        @severityJustification, @potentialImpact, @reproductionSteps, @remediationRecommendation,
        @status, @owner, @identifiedDate, @retestDate, @referencesJson, @tagsJson, @notes, @createdAt, @updatedAt
      )
      ON CONFLICT(id) DO UPDATE SET
        report_id = @reportId, title = @title, description = @description, affected_asset = @affectedAsset,
        category = @category, severity = @severity, severity_justification = @severityJustification,
        potential_impact = @potentialImpact, reproduction_steps = @reproductionSteps,
        remediation_recommendation = @remediationRecommendation, status = @status, owner = @owner,
        identified_date = @identifiedDate, retest_date = @retestDate, references_json = @referencesJson,
        tags_json = @tagsJson, notes = @notes, updated_at = @updatedAt`
    )
    .run({
      id: finding.id,
      projectId: finding.projectId,
      reportId: finding.reportId ?? null,
      title: finding.title,
      description: finding.description,
      affectedAsset: finding.affectedAsset,
      category: finding.category,
      severity: finding.severity,
      severityJustification: finding.severityJustification ?? null,
      potentialImpact: finding.potentialImpact ?? null,
      reproductionSteps: finding.reproductionSteps ?? null,
      remediationRecommendation: finding.remediationRecommendation ?? null,
      status: finding.status,
      owner: finding.owner ?? null,
      identifiedDate: finding.identifiedDate,
      retestDate: finding.retestDate ?? null,
      referencesJson: JSON.stringify(finding.references),
      tagsJson: JSON.stringify(finding.tags),
      notes: finding.notes ?? null,
      createdAt: finding.createdAt,
      updatedAt: finding.updatedAt,
    });
}

export function createFinding(input: CreateFindingInput): Finding {
  const now = new Date().toISOString();
  const finding: Finding = {
    id: randomUUID(),
    projectId: input.projectId,
    reportId: input.reportId,
    title: input.title.trim(),
    description: input.description,
    affectedAsset: input.affectedAsset,
    category: input.category,
    severity: input.severity,
    severityJustification: input.severityJustification,
    potentialImpact: input.potentialImpact,
    reproductionSteps: input.reproductionSteps,
    remediationRecommendation: input.remediationRecommendation,
    status: input.status,
    owner: input.owner,
    identifiedDate: input.identifiedDate,
    retestDate: input.retestDate,
    references: input.references ?? [],
    tags: input.tags ?? [],
    notes: input.notes,
    attachmentIds: [],
    createdAt: now,
    updatedAt: now,
  };
  persistFinding(finding);
  return finding;
}

export function saveFinding(finding: Finding): Finding {
  const updated: Finding = { ...finding, updatedAt: new Date().toISOString() };
  persistFinding(updated);
  return updated;
}

export function deleteFinding(id: string): void {
  getDatabase().prepare('DELETE FROM findings WHERE id = ?').run(id);
}
