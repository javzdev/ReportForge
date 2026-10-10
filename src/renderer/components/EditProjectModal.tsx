import React, { useState } from 'react';
import type { Project } from '@shared/types';
import Modal from './Modal';
import Button from './Button';
import Banner from './Banner';
import { getErrorMessage } from '../lib/errors';

interface EditProjectModalProps {
  project: Project;
  onClose: () => void;
  onSaved: (project: Project) => void;
}

export default function EditProjectModal({ project, onClose, onSaved }: EditProjectModalProps): React.ReactElement {
  const [name, setName] = useState(project.name);
  const [clientName, setClientName] = useState(project.clientName);
  const [description, setDescription] = useState(project.description ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!name.trim() || !clientName.trim()) {
      setError('Nombre de proyecto y cliente son obligatorios.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await window.reportForge.projects.update({
        id: project.id,
        name: name.trim(),
        clientName: clientName.trim(),
        description: description.trim() || undefined,
      });
      onSaved(updated);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar el proyecto.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Editar proyecto"
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="edit-project-form" variant="primary" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </>
      }
    >
      <form id="edit-project-form" onSubmit={handleSubmit}>
        {error && <Banner kind="error">{error}</Banner>}
        <div className="field">
          <label className="field-label field-required" htmlFor="edit-project-name">
            Nombre del proyecto
          </label>
          <input id="edit-project-name" className="input" value={name} onChange={(event) => setName(event.target.value)} autoFocus required />
        </div>
        <div className="field">
          <label className="field-label field-required" htmlFor="edit-project-client">
            Cliente / entidad evaluada
          </label>
          <input
            id="edit-project-client"
            className="input"
            value={clientName}
            onChange={(event) => setClientName(event.target.value)}
            required
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="edit-project-description">
            Descripcion (opcional)
          </label>
          <textarea
            id="edit-project-description"
            className="textarea"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
}
