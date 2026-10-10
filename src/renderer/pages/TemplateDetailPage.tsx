import React, { useEffect, useState } from 'react';
import type { ReportTemplate } from '@shared/types';
import { useRouter } from '../lib/router';
import { getErrorMessage } from '../lib/errors';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import Banner from '../components/Banner';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../hooks/useToast';

interface TemplateDetailPageProps {
  templateId: string;
}

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: 'Texto corto',
  textarea: 'Texto largo',
  richtext: 'Texto enriquecido',
  date: 'Fecha',
  select: 'Lista de opciones',
  table: 'Tabla (simplificada)',
  findings_table: 'Tabla de hallazgos',
  attachment_list: 'Lista de adjuntos',
};

export default function TemplateDetailPage({ templateId }: TemplateDetailPageProps): React.ReactElement {
  const { navigate } = useRouter();
  const { showToast } = useToast();
  const [template, setTemplate] = useState<ReportTemplate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDuplicate, setShowDuplicate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load(): Promise<void> {
    setError(null);
    try {
      const result = await window.reportForge.templates.get(templateId);
      setTemplate(result);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo cargar la plantilla.'));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  async function handleDelete(): Promise<void> {
    if (!template) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await window.reportForge.templates.delete(template.id);
      showToast('success', 'Plantilla eliminada.');
      navigate({ name: 'templates' });
    } catch (err) {
      // El backend rechaza borrar plantillas incorporadas; mostramos ese mensaje tal cual.
      setDeleteError(getErrorMessage(err, 'No se pudo eliminar la plantilla.'));
    } finally {
      setDeleting(false);
    }
  }

  if (error) {
    return (
      <div className="page">
        <Banner kind="error">{error}</Banner>
        <Button variant="secondary" onClick={() => navigate({ name: 'templates' })}>
          Volver a plantillas
        </Button>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="page">
        <Spinner label="Cargando plantilla..." />
      </div>
    );
  }

  const sortedSections = [...template.sections].sort((a, b) => a.order - b.order);

  return (
    <div className="page">
      <button type="button" className="btn btn--ghost btn--sm" style={{ marginBottom: 12, paddingLeft: 0 }} onClick={() => navigate({ name: 'templates' })}>
        ← Plantillas
      </button>

      <div className="page-header">
        <div>
          <h1 className="page-title">{template.name}</h1>
          <p className="page-subtitle">{template.description}</p>
          <span className="badge badge--neutral">{template.isBuiltIn ? 'Incorporada' : 'Personalizada'}</span>
        </div>
        <div className="page-actions">
          <Button variant="secondary" onClick={() => setShowDuplicate(true)}>
            Duplicar
          </Button>
          <Button
            variant="primary"
            onClick={() => navigate({ name: 'new-report', templateId: template.id })}
          >
            Usar en nuevo reporte
          </Button>
          {!template.isBuiltIn && (
            <Button variant="danger" onClick={() => setShowDelete(true)}>
              Eliminar
            </Button>
          )}
        </div>
      </div>

      {sortedSections.length === 0 ? (
        <Banner kind="info">Esta plantilla aun no tiene secciones definidas.</Banner>
      ) : (
        sortedSections.map((section) => (
          <div key={section.id} className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <h3 style={{ margin: '0 0 4px' }}>{section.title}</h3>
              {section.required && <span className="badge badge--warning">Obligatoria</span>}
            </div>
            {section.description && <p style={{ color: 'var(--color-text-muted)', marginTop: 0 }}>{section.description}</p>}
            <table className="table">
              <thead>
                <tr>
                  <th>Campo</th>
                  <th>Tipo</th>
                  <th>Obligatorio</th>
                </tr>
              </thead>
              <tbody>
                {section.fields.map((field) => (
                  <tr key={field.id}>
                    <td>{field.label}</td>
                    <td>{FIELD_TYPE_LABELS[field.type] ?? field.type}</td>
                    <td>{field.required ? 'Si' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}

      {showDuplicate && (
        <DuplicateTemplateModal
          template={template}
          onClose={() => setShowDuplicate(false)}
          onDuplicated={(duplicated) => {
            setShowDuplicate(false);
            showToast('success', 'Plantilla duplicada.');
            navigate({ name: 'template-detail', templateId: duplicated.id });
          }}
        />
      )}

      {showDelete && (
        <ConfirmDialog
          title="Eliminar plantilla"
          message={
            <>
              <p>¿Eliminar la plantilla "{template.name}"? Esta accion no se puede deshacer.</p>
              {deleteError && <Banner kind="error">{deleteError}</Banner>}
            </>
          }
          busy={deleting}
          onConfirm={handleDelete}
          onCancel={() => {
            setShowDelete(false);
            setDeleteError(null);
          }}
        />
      )}
    </div>
  );
}

function DuplicateTemplateModal({
  template,
  onClose,
  onDuplicated,
}: {
  template: ReportTemplate;
  onClose: () => void;
  onDuplicated: (template: ReportTemplate) => void;
}): React.ReactElement {
  const [newName, setNewName] = useState(`${template.name} (copia)`);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!newName.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const duplicated = await window.reportForge.templates.duplicate(template.id, newName.trim());
      onDuplicated(duplicated);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo duplicar la plantilla.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Duplicar plantilla"
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="duplicate-template-form" variant="primary" disabled={saving}>
            {saving ? 'Duplicando...' : 'Duplicar'}
          </Button>
        </>
      }
    >
      <form id="duplicate-template-form" onSubmit={handleSubmit}>
        {error && <Banner kind="error">{error}</Banner>}
        <div className="field">
          <label className="field-label field-required" htmlFor="duplicate-name">
            Nombre de la nueva plantilla
          </label>
          <input id="duplicate-name" className="input" value={newName} onChange={(event) => setNewName(event.target.value)} autoFocus required />
        </div>
      </form>
    </Modal>
  );
}
