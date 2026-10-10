import React, { useState } from 'react';
import type { Attachment } from '@shared/types';
import Button from './Button';
import Banner from './Banner';
import ConfirmDialog from './ConfirmDialog';
import EmptyState from './EmptyState';
import { getErrorMessage } from '../lib/errors';
import { inferMimeTypeFromPath, getFileNameFromPath, isImageMime, formatBytes } from '../lib/mime';
import { useToast } from '../hooks/useToast';
import AttachmentThumbnail from './AttachmentThumbnail';

interface AttachmentManagerProps {
  projectId: string;
  findingId?: string;
  attachments: Attachment[];
  onChanged: () => void | Promise<void>;
}

// Gestor de evidencias reutilizado tanto en el detalle de proyecto (evidencias generales)
// como en el editor de hallazgo (evidencias vinculadas a un hallazgo especifico).
// El backend ya filtra el dialogo nativo por extension y vuelve a validar tipo/tamano al
// agregar, asi que aqui solo inferimos el mimeType desde la extension del path devuelto.
export default function AttachmentManager({
  projectId,
  findingId,
  attachments,
  onChanged,
}: AttachmentManagerProps): React.ReactElement {
  const { showToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Attachment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handlePickFiles(): Promise<void> {
    setUploadError(null);
    try {
      const paths = await window.reportForge.attachments.pickFiles();
      if (paths.length === 0) return;

      setUploading(true);
      const failures: string[] = [];
      for (const sourcePath of paths) {
        try {
          await window.reportForge.attachments.add({
            projectId,
            findingId,
            sourcePath,
            mimeType: inferMimeTypeFromPath(sourcePath),
          });
        } catch (err) {
          failures.push(`${getFileNameFromPath(sourcePath)}: ${getErrorMessage(err, 'No se pudo adjuntar.')}`);
        }
      }
      await onChanged();
      if (failures.length > 0) {
        setUploadError(failures.join(' | '));
      } else {
        showToast('success', paths.length > 1 ? 'Evidencias adjuntadas.' : 'Evidencia adjuntada.');
      }
    } catch (err) {
      setUploadError(getErrorMessage(err, 'No se pudieron adjuntar los archivos.'));
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await window.reportForge.attachments.delete(deleteTarget.id);
      setDeleteTarget(null);
      showToast('success', 'Evidencia eliminada.');
      await onChanged();
    } catch (err) {
      setDeleteError(getErrorMessage(err, 'No se pudo eliminar la evidencia.'));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button variant="secondary" onClick={handlePickFiles} disabled={uploading}>
          {uploading ? 'Adjuntando...' : '+ Adjuntar archivo'}
        </Button>
      </div>

      {uploadError && <Banner kind="error">{uploadError}</Banner>}

      {attachments.length === 0 ? (
        <EmptyState icon="📎" title="Sin evidencias adjuntas" description="Adjunta capturas, PDFs u otros archivos de respaldo." />
      ) : (
        <div className="grid grid--cards">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="card">
              <AttachmentThumbnail attachment={attachment} />
              <div style={{ fontWeight: 600, fontSize: 13, marginTop: 8, wordBreak: 'break-all' }}>
                {attachment.originalFileName}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>
                {formatBytes(attachment.sizeBytes)}
                {isImageMime(attachment.mimeType) ? '' : ` · ${attachment.mimeType}`}
              </div>
              {attachment.description && <div style={{ fontSize: 12, marginBottom: 8 }}>{attachment.description}</div>}
              <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(attachment)}>
                Eliminar
              </Button>
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Eliminar evidencia"
          message={
            <>
              <p>¿Eliminar el archivo "{deleteTarget.originalFileName}"? Esta accion no se puede deshacer.</p>
              {deleteError && <Banner kind="error">{deleteError}</Banner>}
            </>
          }
          busy={deleting}
          onConfirm={handleDelete}
          onCancel={() => {
            setDeleteTarget(null);
            setDeleteError(null);
          }}
        />
      )}
    </div>
  );
}
