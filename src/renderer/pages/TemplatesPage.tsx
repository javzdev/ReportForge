import React, { useEffect, useState } from 'react';
import type { ReportTemplate } from '@shared/types';
import { useRouter } from '../lib/router';
import { getErrorMessage } from '../lib/errors';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import Banner from '../components/Banner';
import Modal from '../components/Modal';
import { useToast } from '../hooks/useToast';

// Biblioteca de plantillas: incluye las 12 plantillas incorporadas (no editables/eliminables)
// y cualquier plantilla personalizada creada por el usuario (duplicada o desde cero).
export default function TemplatesPage(): React.ReactElement {
  const { navigate } = useRouter();
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<ReportTemplate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreateCustom, setShowCreateCustom] = useState(false);

  async function loadTemplates(): Promise<void> {
    setError(null);
    try {
      const list = await window.reportForge.templates.list();
      setTemplates([...list].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudieron cargar las plantillas.'));
    }
  }

  useEffect(() => {
    loadTemplates();
  }, []);

  const builtIn = templates?.filter((t) => t.isBuiltIn) ?? [];
  const custom = templates?.filter((t) => !t.isBuiltIn) ?? [];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Plantillas</h1>
          <p className="page-subtitle">
            Plantillas incorporadas de evaluaciones tecnicas, listas para usar, y tus plantillas personalizadas.
          </p>
        </div>
        <div className="page-actions">
          <Button variant="primary" onClick={() => setShowCreateCustom(true)}>
            + Crear plantilla personalizada
          </Button>
        </div>
      </div>

      {error && <Banner kind="error">{error}</Banner>}

      {templates === null ? (
        <Spinner label="Cargando plantillas..." />
      ) : (
        <>
          <h2 className="section-title" style={{ marginTop: 0 }}>
            Incorporadas ({builtIn.length})
          </h2>
          <div className="grid grid--cards">
            {builtIn.map((template) => (
              <TemplateCard key={template.id} template={template} onOpen={() => navigate({ name: 'template-detail', templateId: template.id })} />
            ))}
          </div>

          <h2 className="section-title">Personalizadas ({custom.length})</h2>
          {custom.length === 0 ? (
            <Banner kind="info">
              Aun no tienes plantillas personalizadas. Puedes duplicar una incorporada desde su detalle, o crear una desde
              cero.
            </Banner>
          ) : (
            <div className="grid grid--cards">
              {custom.map((template) => (
                <TemplateCard key={template.id} template={template} onOpen={() => navigate({ name: 'template-detail', templateId: template.id })} />
              ))}
            </div>
          )}
        </>
      )}

      {showCreateCustom && (
        <CreateCustomTemplateModal
          onClose={() => setShowCreateCustom(false)}
          onCreated={(template) => {
            setShowCreateCustom(false);
            showToast('success', 'Plantilla personalizada creada.');
            navigate({ name: 'template-detail', templateId: template.id });
          }}
        />
      )}
    </div>
  );
}

function TemplateCard({ template, onOpen }: { template: ReportTemplate; onOpen: () => void }): React.ReactElement {
  return (
    <button type="button" className="card card--interactive" style={{ textAlign: 'left', border: 'none', width: '100%' }} onClick={onOpen}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{template.name}</div>
      <div style={{ color: 'var(--color-text-muted)', fontSize: 13, marginBottom: 8 }}>{template.description}</div>
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{template.sections.length} secciones</div>
    </button>
  );
}

function CreateCustomTemplateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (template: ReportTemplate) => void;
}): React.ReactElement {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!name.trim()) {
      setError('El nombre de la plantilla es obligatorio.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const template = await window.reportForge.templates.createCustom(name.trim(), description.trim());
      onCreated(template);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo crear la plantilla.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Crear plantilla personalizada"
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="new-custom-template-form" variant="primary" disabled={saving}>
            {saving ? 'Creando...' : 'Crear plantilla'}
          </Button>
        </>
      }
    >
      <form id="new-custom-template-form" onSubmit={handleSubmit}>
        {error && <Banner kind="error">{error}</Banner>}
        <div className="field">
          <label className="field-label field-required" htmlFor="template-name">
            Nombre
          </label>
          <input id="template-name" className="input" value={name} onChange={(event) => setName(event.target.value)} autoFocus required />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="template-description">
            Descripcion
          </label>
          <textarea id="template-description" className="textarea" value={description} onChange={(event) => setDescription(event.target.value)} />
        </div>
        <Banner kind="info">La plantilla se creara sin secciones. Podras anadirlas editando sus datos desde el detalle.</Banner>
      </form>
    </Modal>
  );
}
