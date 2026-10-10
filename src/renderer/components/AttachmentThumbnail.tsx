import React, { useEffect, useState } from 'react';
import type { Attachment } from '@shared/types';
import { isImageMime } from '../lib/mime';

const MIME_ICONS: Record<string, string> = {
  'application/pdf': '📕',
  'text/plain': '📄',
  'text/csv': '📊',
  'application/json': '🗂️',
};

// Previsualiza imagenes usando attachments.readAsDataUrl (unico caso donde se solicita el
// contenido real del archivo); para PDF/texto/CSV/JSON se muestra solo un icono generico,
// nunca se intenta renderizar o parsear su contenido.
export default function AttachmentThumbnail({ attachment }: { attachment: Attachment }): React.ReactElement {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const isImage = isImageMime(attachment.mimeType);

  useEffect(() => {
    if (!isImage) return;
    let active = true;
    window.reportForge.attachments
      .readAsDataUrl(attachment.id)
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [attachment.id, isImage]);

  if (isImage && dataUrl) {
    return (
      <img
        src={dataUrl}
        alt={attachment.description || attachment.originalFileName}
        style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-alt)' }}
      />
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: 120,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 36,
        background: 'var(--color-surface-alt)',
        borderRadius: 'var(--radius-sm)',
      }}
      aria-hidden="true"
    >
      {isImage && !failed ? <span className="spinner" /> : MIME_ICONS[attachment.mimeType] ?? '📎'}
    </div>
  );
}
