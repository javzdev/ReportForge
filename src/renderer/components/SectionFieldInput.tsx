import React from 'react';
import type { SectionFieldDefinition, Finding } from '@shared/types';
import { toDateInputValue, dateInputValueToIso } from '../lib/format';
import { SeverityBadge, StatusBadge } from './Badges';

interface SectionFieldInputProps {
  field: SectionFieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  findings?: Finding[];
}

// Renderiza el control de edicion adecuado segun field.type. Las limitaciones del MVP
// (tabla simplificada como textarea, adjuntos como lista de solo lectura) se documentan
// en el placeholder/helpText visible al usuario para que no sean una sorpresa.
export default function SectionFieldInput({ field, value, onChange, findings = [] }: SectionFieldInputProps): React.ReactElement {
  const inputId = `field-${field.id}`;

  switch (field.type) {
    case 'text':
      return (
        <input
          id={inputId}
          className="input"
          type="text"
          value={typeof value === 'string' ? value : ''}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      );

    case 'textarea':
      return (
        <textarea
          id={inputId}
          className="textarea"
          value={typeof value === 'string' ? value : ''}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      );

    case 'richtext':
      return (
        <textarea
          id={inputId}
          className="textarea"
          style={{ minHeight: 160 }}
          value={typeof value === 'string' ? value : ''}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      );

    case 'date':
      return (
        <input
          id={inputId}
          className="input"
          type="date"
          value={toDateInputValue(typeof value === 'string' ? value : '')}
          onChange={(event) => onChange(event.target.value ? dateInputValueToIso(event.target.value) : '')}
        />
      );

    case 'select':
      return (
        <select id={inputId} className="select" value={typeof value === 'string' ? value : ''} onChange={(event) => onChange(event.target.value)}>
          <option value="">Selecciona una opcion</option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );

    case 'table':
      return (
        <div>
          <textarea
            id={inputId}
            className="textarea"
            style={{ minHeight: 120, fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 13 }}
            value={typeof value === 'string' ? value : ''}
            placeholder={field.placeholder ?? 'Una fila por linea, columnas separadas por | (tabla simplificada en MVP)'}
            onChange={(event) => onChange(event.target.value)}
          />
          <p className="field-help">Tabla simplificada en esta version: edita el contenido como texto (una fila por linea).</p>
        </div>
      );

    case 'findings_table':
      return <FindingsTableField findings={findings} />;

    case 'attachment_list':
      return (
        <p className="field-help">
          Las evidencias se gestionan desde el detalle del proyecto o del hallazgo correspondiente. Este campo mostrara su
          listado automaticamente en la vista previa y exportacion.
        </p>
      );

    default:
      return <p className="field-help">Tipo de campo no soportado.</p>;
  }
}

export function FindingsTableField({ findings }: { findings: Finding[] }): React.ReactElement {
  if (findings.length === 0) {
    return <p className="field-help">Este reporte aun no tiene hallazgos vinculados.</p>;
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Titulo</th>
          <th>Severidad</th>
          <th>Activo afectado</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        {findings.map((finding) => (
          <tr key={finding.id}>
            <td>{finding.title}</td>
            <td>
              <SeverityBadge severity={finding.severity} />
            </td>
            <td>{finding.affectedAsset}</td>
            <td>
              <StatusBadge status={finding.status} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
