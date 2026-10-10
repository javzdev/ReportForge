import React, { useState } from 'react';
import type { BackupManifest } from '@shared/types';
import Button from './Button';
import Banner from './Banner';
import Modal from './Modal';
import { getErrorMessage } from '../lib/errors';
import { formatDateTime } from '../lib/format';
import { useToast } from '../hooks/useToast';

interface BackupSectionProps {
  onImported: () => void;
}

type RestoreStep = 'idle' | 'validated';

// Flujo de respaldo local: crear (backup.create) y restaurar en dos pasos explicitos
// (pickFile -> validate, mostrando un resumen del manifiesto, y solo tras confirmacion
// explicita del usuario se llama a import). backup.validate puede rechazar si el JSON
// no es un backup valido; ese mensaje de error se muestra directo, sin interpretarlo.
export default function BackupSection({ onImported }: BackupSectionProps): React.ReactElement {
  const { showToast } = useToast();

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [pickedFilePath, setPickedFilePath] = useState<string | null>(null);
  const [manifest, setManifest] = useState<BackupManifest | null>(null);
  const [restoreStep, setRestoreStep] = useState<RestoreStep>('idle');
  const [validating, setValidating] = useState(false);
  const [validateError, setValidateError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  async function handleCreateBackup(): Promise<void> {
    setCreating(true);
    setCreateError(null);
    try {
      const result = await window.reportForge.backup.create();
      if (result.canceled) return;
      showToast('success', `Respaldo creado en: ${result.filePath}`);
    } catch (err) {
      setCreateError(getErrorMessage(err, 'No se pudo crear el respaldo.'));
    } finally {
      setCreating(false);
    }
  }

  async function handlePickAndValidate(): Promise<void> {
    setValidateError(null);
    try {
      const filePath = await window.reportForge.backup.pickFile();
      if (!filePath) return;
      setPickedFilePath(filePath);
      setShowRestoreModal(true);
      setValidating(true);
      try {
        const result = (await window.reportForge.backup.validate(filePath)) as BackupManifest;
        setManifest(result);
        setRestoreStep('validated');
      } catch (err) {
        setValidateError(getErrorMessage(err, 'El archivo seleccionado no es un respaldo valido.'));
      } finally {
        setValidating(false);
      }
    } catch (err) {
      setValidateError(getErrorMessage(err, 'No se pudo leer el archivo seleccionado.'));
    }
  }

  async function handleConfirmImport(): Promise<void> {
    if (!pickedFilePath) return;
    setImporting(true);
    setImportError(null);
    try {
      await window.reportForge.backup.import(pickedFilePath);
      closeRestoreModal();
      onImported();
    } catch (err) {
      setImportError(getErrorMessage(err, 'No se pudo restaurar el respaldo.'));
    } finally {
      setImporting(false);
    }
  }

  function closeRestoreModal(): void {
    setShowRestoreModal(false);
    setPickedFilePath(null);
    setManifest(null);
    setRestoreStep('idle');
    setValidateError(null);
    setImportError(null);
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <h3 style={{ marginTop: 0 }}>Crear respaldo local</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
            Genera un archivo .json con todos tus proyectos, plantillas, reportes, hallazgos y metadatos de evidencias.
          </p>
          {createError && <Banner kind="error">{createError}</Banner>}
          <Button variant="primary" onClick={handleCreateBackup} disabled={creating}>
            {creating ? 'Creando respaldo...' : 'Crear respaldo local'}
          </Button>
        </div>

        <div style={{ flex: 1, minWidth: 240 }}>
          <h3 style={{ marginTop: 0 }}>Restaurar desde respaldo</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
            Selecciona un archivo de respaldo .json. Podras ver un resumen antes de confirmar la restauracion.
          </p>
          <Button variant="secondary" onClick={handlePickAndValidate}>
            Seleccionar archivo de respaldo
          </Button>
        </div>
      </div>

      {showRestoreModal && (
        <Modal title="Restaurar respaldo" onClose={closeRestoreModal} width="sm" footer={
          <>
            <Button variant="ghost" onClick={closeRestoreModal} disabled={importing}>
              Cancelar
            </Button>
            {restoreStep === 'validated' && manifest && (
              <Button variant="danger" onClick={handleConfirmImport} disabled={importing}>
                {importing ? 'Restaurando...' : 'Restaurar y sobrescribir'}
              </Button>
            )}
          </>
        }>
          {validating && <p>Validando archivo...</p>}
          {validateError && <Banner kind="error">{validateError}</Banner>}
          {importError && <Banner kind="error">{importError}</Banner>}
          {manifest && (
            <>
              <Banner kind="warning">
                Restaurar puede sobrescribir datos existentes que compartan el mismo identificador. Esta accion no se puede
                deshacer.
              </Banner>
              <table className="table">
                <tbody>
                  <tr>
                    <th>Generado</th>
                    <td>{formatDateTime(manifest.exportedAt)}</td>
                  </tr>
                  <tr>
                    <th>Proyectos</th>
                    <td>{manifest.counts.projects}</td>
                  </tr>
                  <tr>
                    <th>Plantillas</th>
                    <td>{manifest.counts.templates}</td>
                  </tr>
                  <tr>
                    <th>Reportes</th>
                    <td>{manifest.counts.reports}</td>
                  </tr>
                  <tr>
                    <th>Hallazgos</th>
                    <td>{manifest.counts.findings}</td>
                  </tr>
                  <tr>
                    <th>Adjuntos</th>
                    <td>{manifest.counts.attachments}</td>
                  </tr>
                </tbody>
              </table>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
