import type { ReportTemplate, ReportSectionContent } from '@shared/types';

// Calcula cuantos campos obligatorios de la plantilla ya tienen un valor no vacio en el
// reporte. Los campos de tipo findings_table/attachment_list no cuentan como "pendientes
// de llenar" porque su contenido se deriva de otras entidades (hallazgos/adjuntos), no de
// texto que el usuario escriba en el campo mismo.
export function computeRequiredFieldProgress(
  template: ReportTemplate,
  sections: ReportSectionContent[]
): { completed: number; total: number } {
  let total = 0;
  let completed = 0;

  const valuesBySection = new Map(sections.map((section) => [section.sectionId, section.values]));

  for (const section of template.sections) {
    for (const field of section.fields) {
      if (!field.required) continue;
      if (field.type === 'findings_table' || field.type === 'attachment_list') continue;

      total += 1;
      const value = valuesBySection.get(section.id)?.[field.id];
      const isFilled = typeof value === 'string' ? value.trim().length > 0 : value !== undefined && value !== null;
      if (isFilled) completed += 1;
    }
  }

  return { completed, total };
}
