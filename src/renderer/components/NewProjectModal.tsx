import React, { useState } from 'react';
import type { Project } from '@shared/types';
import Modal from './Modal';
import Button from './Button';
import Banner from './Banner';
import { getErrorMessage } from '../lib/errors';

interface NewProjectModalProps {
  onClose: () => void;
  onCreated: (project: Project) => void;
}

// Modal de creacion de proyecto. Valida en el cliente que nombre y cliente no esten
// vacios (el backend tambien lo exige y rechazaria la promesa con un AppUserError,
// pero validar antes evita un viaje IPC innecesario y da feedback instantaneo).
export default function NewProjectModal({ onClose, onCreated }: NewProjectModalProps): React.ReactElement {
  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [description, setDescription] = useState('');
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
      const project = await window.reportForge.projects.create({
        name: name.trim(),
        clientName: clientName.trim(),
        description: description.trim() || undefined,
      });
      onCreated(project);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo crear el proyecto.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Nuevo proyecto"
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="new-project-form" variant="primary" disabled={saving}>
            {saving ? 'Creando...' : 'Crear proyecto'}
          </Button>
        </>
      }
    >
      <form id="new-project-form" onSubmit={handleSubmit}>
        {error && <Banner kind="error">{error}</Banner>}
        <div className="field">
          <label className="field-label field-required" htmlFor="project-name">
            Nombre del proyecto
          </label>
          <input
            id="project-name"
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
            required
          />
        </div>
        <div className="field">
          <label className="field-label field-required" htmlFor="project-client">
            Cliente / entidad evaluada
          </label>
          <input
            id="project-client"
            className="input"
            value={clientName}
            onChange={(event) => setClientName(event.target.value)}
            required
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="project-description">
            Descripcion (opcional)
          </label>
          <textarea
            id="project-description"
            className="textarea"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
}
