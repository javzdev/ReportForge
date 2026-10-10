import { randomUUID } from 'node:crypto';
import { getDatabase } from '../connection';
import type { ReportTemplate, TemplateSection, TemplateKind } from '@shared/types';

interface TemplateRow {
  id: string;
  kind: string;
  name: string;
  description: string;
  is_built_in: number;
  is_custom_copy: number;
  sections_json: string;
  created_at: string;
  updated_at: string;
}

function rowToTemplate(row: TemplateRow): ReportTemplate {
  return {
    id: row.id,
    kind: row.kind as TemplateKind,
    name: row.name,
    description: row.description,
    isBuiltIn: row.is_built_in === 1,
    isCustomCopy: row.is_custom_copy === 1,
    sections: JSON.parse(row.sections_json) as TemplateSection[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listTemplates(): ReportTemplate[] {
  const rows = getDatabase()
    .prepare('SELECT * FROM templates ORDER BY is_built_in DESC, name ASC')
    .all() as TemplateRow[];
  return rows.map(rowToTemplate);
}

export function getTemplate(id: string): ReportTemplate | null {
  const row = getDatabase().prepare('SELECT * FROM templates WHERE id = ?').get(id) as
    | TemplateRow
    | undefined;
  return row ? rowToTemplate(row) : null;
}

export function upsertTemplate(template: ReportTemplate): ReportTemplate {
  getDatabase()
    .prepare(
      `INSERT INTO templates (id, kind, name, description, is_built_in, is_custom_copy, sections_json, created_at, updated_at)
       VALUES (@id, @kind, @name, @description, @isBuiltIn, @isCustomCopy, @sectionsJson, @createdAt, @updatedAt)
       ON CONFLICT(id) DO UPDATE SET
         kind = @kind, name = @name, description = @description,
         is_built_in = @isBuiltIn, is_custom_copy = @isCustomCopy,
         sections_json = @sectionsJson, updated_at = @updatedAt`
    )
    .run({
      id: template.id,
      kind: template.kind,
      name: template.name,
      description: template.description,
      isBuiltIn: template.isBuiltIn ? 1 : 0,
      isCustomCopy: template.isCustomCopy ? 1 : 0,
      sectionsJson: JSON.stringify(template.sections),
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    });
  return template;
}

export interface DuplicateTemplateInput {
  sourceId: string;
  newName: string;
}

export function duplicateTemplate(input: DuplicateTemplateInput): ReportTemplate {
  const source = getTemplate(input.sourceId);
  if (!source) throw new Error('Plantilla de origen no encontrada.');

  const now = new Date().toISOString();
  const copy: ReportTemplate = {
    ...source,
    id: randomUUID(),
    name: input.newName.trim(),
    isBuiltIn: false,
    isCustomCopy: true,
    createdAt: now,
    updatedAt: now,
  };
  return upsertTemplate(copy);
}

export function deleteTemplate(id: string): void {
  const template = getTemplate(id);
  if (template?.isBuiltIn) {
    throw new Error('No se pueden eliminar las plantillas incorporadas.');
  }
  getDatabase().prepare('DELETE FROM templates WHERE id = ?').run(id);
}

export function createCustomTemplate(name: string, description: string): ReportTemplate {
  const now = new Date().toISOString();
  const template: ReportTemplate = {
    id: randomUUID(),
    kind: 'custom',
    name: name.trim(),
    description: description.trim(),
    isBuiltIn: false,
    isCustomCopy: false,
    sections: [],
    createdAt: now,
    updatedAt: now,
  };
  return upsertTemplate(template);
}
