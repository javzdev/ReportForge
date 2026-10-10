import type { Report, ReportTemplate, Finding, AppSettings } from '@shared/types';

/** Escapa HTML para evitar que contenido de usuario se interprete como markup/script. */
function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeMultiline(value: unknown): string {
  return escapeHtml(value).replace(/\n/g, '<br/>');
}

const SEVERITY_LABELS: Record<string, string> = {
  critica: 'Critica',
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
  informativa: 'Informativa',
};

const SEVERITY_COLORS: Record<string, string> = {
  critica: '#7f1d1d',
  alta: '#b91c1c',
  media: '#b45309',
  baja: '#1d4ed8',
  informativa: '#4b5563',
};

const CLASSIFICATION_LABELS: Record<string, string> = {
  publico: 'Publico',
  uso_interno: 'Uso interno',
  confidencial: 'Confidencial',
  estrictamente_confidencial: 'Estrictamente confidencial',
};

function renderFindingsTable(findings: Finding[]): string {
  if (findings.length === 0) {
    return '<p class="empty-note">No hay hallazgos registrados para este reporte.</p>';
  }

  const rows = findings
    .map(
      (f) => `
      <tr>
        <td>${escapeHtml(f.title)}</td>
        <td><span class="badge" style="background:${SEVERITY_COLORS[f.severity]}">${SEVERITY_LABELS[f.severity]}</span></td>
        <td>${escapeHtml(f.affectedAsset)}</td>
        <td>${escapeHtml(f.status)}</td>
      </tr>`
    )
    .join('');

  return `
    <table class="findings-table">
      <thead><tr><th>Hallazgo</th><th>Severidad</th><th>Activo afectado</th><th>Estado</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderFindingDetail(finding: Finding, index: number): string {
  return `
    <div class="finding-detail">
      <h3>${index + 1}. ${escapeHtml(finding.title)} <span class="badge" style="background:${SEVERITY_COLORS[finding.severity]}">${SEVERITY_LABELS[finding.severity]}</span></h3>
      <p><strong>Activo afectado:</strong> ${escapeHtml(finding.affectedAsset)}</p>
      <p><strong>Categoria:</strong> ${escapeHtml(finding.category)}</p>
      <p><strong>Descripcion:</strong><br/>${escapeMultiline(finding.description)}</p>
      ${finding.severityJustification ? `<p><strong>Justificacion de severidad:</strong><br/>${escapeMultiline(finding.severityJustification)}</p>` : ''}
      ${finding.potentialImpact ? `<p><strong>Impacto potencial:</strong><br/>${escapeMultiline(finding.potentialImpact)}</p>` : ''}
      ${finding.reproductionSteps ? `<p><strong>Pasos de reproduccion:</strong><br/>${escapeMultiline(finding.reproductionSteps)}</p>` : ''}
      ${finding.remediationRecommendation ? `<p><strong>Recomendacion de remediacion:</strong><br/>${escapeMultiline(finding.remediationRecommendation)}</p>` : ''}
      <p><strong>Estado:</strong> ${escapeHtml(finding.status)}</p>
    </div>`;
}

export interface BuildReportHtmlInput {
  report: Report;
  template: ReportTemplate;
  findings: Finding[];
  settings: AppSettings;
}

/**
 * Construye el documento HTML completo del reporte, con portada, tabla de contenido simple,
 * secciones en el orden de la plantilla y listado de hallazgos. Todo el contenido de usuario
 * pasa por escapeHtml/escapeMultiline antes de insertarse en el markup.
 */
export function buildReportHtml(input: BuildReportHtmlInput): string {
  const { report, template, findings, settings } = input;

  const sectionsHtml = template.sections
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((section) => {
      const content = report.sections.find((s) => s.sectionId === section.id);
      const fieldsHtml = section.fields
        .map((field) => {
          const rawValue = content?.values?.[field.id];
          if (rawValue === undefined || rawValue === null || rawValue === '') return '';

          if (field.type === 'findings_table') {
            return `<div class="field-block"><h4>${escapeHtml(field.label)}</h4>${renderFindingsTable(findings)}</div>`;
          }

          return `<div class="field-block"><h4>${escapeHtml(field.label)}</h4><p>${escapeMultiline(rawValue)}</p></div>`;
        })
        .join('');

      if (!fieldsHtml) return '';

      return `<section class="report-section"><h2>${escapeHtml(section.title)}</h2>${fieldsHtml}</section>`;
    })
    .join('');

  const findingsDetailHtml = findings.map((f, i) => renderFindingDetail(f, i)).join('');

  const brandLine = settings.brandName
    ? `<p class="brand-name">${escapeHtml(settings.brandName)}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(report.title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; margin: 0; padding: 0; font-size: 13px; line-height: 1.5; }
  .cover { padding: 80px 48px; text-align: center; }
  .cover h1 { font-size: 28px; margin-bottom: 8px; }
  .cover .classification { display: inline-block; margin-top: 24px; padding: 6px 16px; border-radius: 4px; background: #111827; color: #fff; font-size: 12px; letter-spacing: 0.05em; text-transform: uppercase; }
  .brand-name { color: #6b7280; font-size: 14px; margin-top: 40px; }
  .report-section { padding: 24px 48px; page-break-inside: avoid; }
  .report-section h2 { border-bottom: 2px solid #111827; padding-bottom: 6px; font-size: 18px; }
  .field-block { margin-bottom: 16px; }
  .field-block h4 { font-size: 13px; color: #374151; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.03em; }
  .findings-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  .findings-table th, .findings-table td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: left; font-size: 12px; }
  .findings-table th { background: #f3f4f6; }
  .badge { color: #fff; padding: 2px 8px; border-radius: 3px; font-size: 11px; }
  .finding-detail { padding: 16px 48px; border-top: 1px solid #e5e7eb; page-break-inside: avoid; }
  .empty-note { color: #6b7280; font-style: italic; }
</style>
</head>
<body>
  <div class="cover">
    <h1>${escapeHtml(report.title)}</h1>
    <p>${escapeHtml(template.name)}</p>
    <div class="classification">${escapeHtml(CLASSIFICATION_LABELS[report.classification] ?? report.classification)}</div>
    ${brandLine}
  </div>

  ${sectionsHtml}

  <section class="report-section">
    <h2>Detalle de hallazgos</h2>
    ${findings.length > 0 ? findingsDetailHtml : '<p class="empty-note">No hay hallazgos registrados.</p>'}
  </section>
</body>
</html>`;
}
