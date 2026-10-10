import { getDatabase } from '../connection';
import type { Attachment } from '@shared/types';

interface AttachmentRow {
  id: string;
  project_id: string;
  finding_id: string | null;
  report_id: string | null;
  original_file_name: string;
  stored_file_name: string;
  mime_type: string;
  size_bytes: number;
  description: string | null;
  created_at: string;
}

function rowToAttachment(row: AttachmentRow): Attachment {
  return {
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
  };
}

export function listAttachmentsByProject(projectId: string): Attachment[] {
  const rows = getDatabase()
    .prepare('SELECT * FROM attachments WHERE project_id = ? ORDER BY created_at DESC')
    .all(projectId) as AttachmentRow[];
  return rows.map(rowToAttachment);
}

export function listAttachmentsByFinding(findingId: string): Attachment[] {
  const rows = getDatabase()
    .prepare('SELECT * FROM attachments WHERE finding_id = ? ORDER BY created_at DESC')
    .all(findingId) as AttachmentRow[];
  return rows.map(rowToAttachment);
}

export function getAttachment(id: string): Attachment | null {
  const row = getDatabase().prepare('SELECT * FROM attachments WHERE id = ?').get(id) as
    | AttachmentRow
    | undefined;
  return row ? rowToAttachment(row) : null;
}

export function insertAttachment(attachment: Attachment): Attachment {
  getDatabase()
    .prepare(
      `INSERT INTO attachments (id, project_id, finding_id, report_id, original_file_name, stored_file_name, mime_type, size_bytes, description, created_at)
       VALUES (@id, @projectId, @findingId, @reportId, @originalFileName, @storedFileName, @mimeType, @sizeBytes, @description, @createdAt)`
    )
    .run({
      id: attachment.id,
      projectId: attachment.projectId,
      findingId: attachment.findingId ?? null,
      reportId: attachment.reportId ?? null,
      originalFileName: attachment.originalFileName,
      storedFileName: attachment.storedFileName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      description: attachment.description ?? null,
      createdAt: attachment.createdAt,
    });
  return attachment;
}

export function deleteAttachment(id: string): void {
  getDatabase().prepare('DELETE FROM attachments WHERE id = ?').run(id);
}
