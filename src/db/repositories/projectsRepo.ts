import { randomUUID } from 'node:crypto';
import { getDatabase } from '../connection';
import type { Project } from '@shared/types';

interface ProjectRow {
  id: string;
  name: string;
  client_name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    clientName: row.client_name,
    description: row.description ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listProjects(): Project[] {
  const rows = getDatabase()
    .prepare('SELECT * FROM projects ORDER BY updated_at DESC')
    .all() as ProjectRow[];
  return rows.map(rowToProject);
}

export function getProject(id: string): Project | null {
  const row = getDatabase().prepare('SELECT * FROM projects WHERE id = ?').get(id) as
    | ProjectRow
    | undefined;
  return row ? rowToProject(row) : null;
}

export interface CreateProjectInput {
  name: string;
  clientName: string;
  description?: string;
}

export function createProject(input: CreateProjectInput): Project {
  const now = new Date().toISOString();
  const project: Project = {
    id: randomUUID(),
    name: input.name.trim(),
    clientName: input.clientName.trim(),
    description: input.description?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };

  getDatabase()
    .prepare(
      `INSERT INTO projects (id, name, client_name, description, created_at, updated_at)
       VALUES (@id, @name, @clientName, @description, @createdAt, @updatedAt)`
    )
    .run({ ...project, description: project.description ?? null });

  return project;
}

export interface UpdateProjectInput {
  id: string;
  name?: string;
  clientName?: string;
  description?: string;
}

export function updateProject(input: UpdateProjectInput): Project {
  const existing = getProject(input.id);
  if (!existing) throw new Error('Proyecto no encontrado.');

  const updated: Project = {
    ...existing,
    name: input.name?.trim() ?? existing.name,
    clientName: input.clientName?.trim() ?? existing.clientName,
    description: input.description !== undefined ? input.description.trim() || undefined : existing.description,
    updatedAt: new Date().toISOString(),
  };

  getDatabase()
    .prepare(
      `UPDATE projects SET name = @name, client_name = @clientName, description = @description, updated_at = @updatedAt
       WHERE id = @id`
    )
    .run({ ...updated, description: updated.description ?? null });

  return updated;
}

export function deleteProject(id: string): void {
  getDatabase().prepare('DELETE FROM projects WHERE id = ?').run(id);
}
