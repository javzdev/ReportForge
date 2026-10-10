import React, { useState } from 'react';
import Modal from './Modal';
import Button from './Button';

interface ConfirmDialogProps {
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  /** Si se define, el usuario debe escribir exactamente este texto para habilitar el boton de confirmar. */
  requireTypedText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}

// Dialogo de confirmacion reutilizable para cualquier accion destructiva (borrar proyecto,
// reporte, hallazgo, adjunto, plantilla) o de alto impacto (eliminar todos los datos).
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = true,
  requireTypedText,
  onConfirm,
  onCancel,
  busy = false,
}: ConfirmDialogProps): React.ReactElement {
  const [typedText, setTypedText] = useState('');
  const confirmDisabled = busy || (requireTypedText !== undefined && typedText !== requireTypedText);

  return (
    <Modal
      title={title}
      onClose={onCancel}
      width="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={confirmDisabled}>
            {busy ? 'Procesando...' : confirmLabel}
          </Button>
        </>
      }
    >
      <div style={{ color: 'var(--color-text)' }}>{message}</div>
      {requireTypedText !== undefined && (
        <div style={{ marginTop: 16 }}>
          <label htmlFor="confirm-typed-text" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
            Escribe "{requireTypedText}" para confirmar
          </label>
          <input
            id="confirm-typed-text"
            type="text"
            className="input"
            value={typedText}
            onChange={(event) => setTypedText(event.target.value)}
            autoComplete="off"
            autoFocus
          />
        </div>
      )}
    </Modal>
  );
}
