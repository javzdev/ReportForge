import type { ReportTemplate, TemplateSection } from '@shared/types';

// Secciones comunes reutilizadas por la mayoria de plantillas de evaluacion tecnica.
function commonFrontMatterSections(startOrder: number): TemplateSection[] {
  return [
    {
      id: 'portada',
      title: 'Portada',
      order: startOrder,
      required: true,
      fields: [
        { id: 'tituloDocumento', label: 'Titulo del documento', type: 'text', required: true },
        { id: 'nombreCliente', label: 'Cliente / entidad evaluada', type: 'text', required: true },
        { id: 'nombreProyecto', label: 'Nombre del proyecto', type: 'text', required: true },
        {
          id: 'clasificacion',
          label: 'Clasificacion del documento',
          type: 'select',
          required: true,
          options: ['Publico', 'Uso interno', 'Confidencial', 'Estrictamente confidencial'],
        },
        { id: 'fechaEmision', label: 'Fecha de emision', type: 'date', required: true },
      ],
    },
    {
      id: 'autores_revisores',
      title: 'Autores y revisores',
      order: startOrder + 1,
      required: true,
      fields: [
        { id: 'autores', label: 'Autores', type: 'textarea', required: true, placeholder: 'Ej: Jane Doe - Consultora de seguridad' },
        { id: 'revisores', label: 'Revisores', type: 'textarea', required: false },
      ],
    },
    {
      id: 'historial_versiones',
      title: 'Historial de versiones',
      order: startOrder + 2,
      required: false,
      fields: [{ id: 'historial', label: 'Historial de cambios', type: 'table', required: false }],
    },
  ];
}

function methodologySection(order: number, extraHelp?: string): TemplateSection {
  return {
    id: 'metodologia',
    title: 'Metodologia',
    order,
    required: true,
    fields: [
      {
        id: 'enfoque',
        label: 'Enfoque y metodologia utilizada',
        type: 'richtext',
        required: true,
        helpText: extraHelp ?? 'Describe el marco de referencia utilizado (ej. OWASP, PTES, NIST).',
      },
      { id: 'herramientas', label: 'Herramientas y tecnicas (documentacion)', type: 'textarea', required: false },
    ],
  };
}

function authorizationSection(order: number): TemplateSection {
  return {
    id: 'autorizacion',
    title: 'Confirmacion de autorizacion y reglas de participacion',
    order,
    required: true,
    fields: [
      { id: 'confirmacionAutorizacion', label: 'Confirmacion de autorizacion por escrito', type: 'textarea', required: true },
      { id: 'reglasParticipacion', label: 'Reglas de participacion (rules of engagement)', type: 'textarea', required: true },
      { id: 'ventanaEjecucion', label: 'Ventana de ejecucion acordada', type: 'text', required: false },
    ],
  };
}

function scopeSection(order: number): TemplateSection {
  return {
    id: 'alcance',
    title: 'Alcance, exclusiones y limitaciones',
    order,
    required: true,
    fields: [
      { id: 'alcanceIncluido', label: 'Alcance incluido', type: 'textarea', required: true },
      { id: 'exclusiones', label: 'Exclusiones', type: 'textarea', required: false },
      { id: 'limitaciones', label: 'Limitaciones de la evaluacion', type: 'textarea', required: false },
    ],
  };
}

function findingsSections(order: number): TemplateSection[] {
  return [
    {
      id: 'criterios_severidad',
      title: 'Criterios de evaluacion y severidad',
      order,
      required: true,
      fields: [
        { id: 'escalaSeveridad', label: 'Escala de severidad utilizada', type: 'textarea', required: true },
      ],
    },
    {
      id: 'resumen_resultados',
      title: 'Resumen de resultados',
      order: order + 1,
      required: true,
      fields: [
        { id: 'resumenGeneral', label: 'Resumen general de resultados', type: 'richtext', required: true },
        { id: 'tablaResumenHallazgos', label: 'Tabla resumen de hallazgos por severidad', type: 'findings_table', required: false },
      ],
    },
    {
      id: 'hallazgos_evidencias',
      title: 'Hallazgos y evidencias',
      order: order + 2,
      required: true,
      fields: [
        { id: 'listaHallazgos', label: 'Listado detallado de hallazgos', type: 'findings_table', required: true },
      ],
    },
    {
      id: 'impacto_priorizacion',
      title: 'Evaluacion de impacto y priorizacion',
      order: order + 3,
      required: false,
      fields: [{ id: 'priorizacion', label: 'Priorizacion de remediacion', type: 'richtext', required: false }],
    },
  ];
}

function closingSections(order: number): TemplateSection[] {
  return [
    {
      id: 'recomendaciones',
      title: 'Recomendaciones y plan de remediacion',
      order,
      required: true,
      fields: [{ id: 'planRemediacion', label: 'Plan de remediacion propuesto', type: 'richtext', required: true }],
    },
    {
      id: 'conclusiones',
      title: 'Conclusiones',
      order: order + 1,
      required: true,
      fields: [{ id: 'conclusionGeneral', label: 'Conclusion general', type: 'richtext', required: true }],
    },
    {
      id: 'anexos',
      title: 'Anexos',
      order: order + 2,
      required: false,
      fields: [{ id: 'contenidoAnexos', label: 'Contenido adicional', type: 'attachment_list', required: false }],
    },
    {
      id: 'glosario',
      title: 'Glosario y referencias',
      order: order + 3,
      required: false,
      fields: [{ id: 'glosarioTexto', label: 'Terminos y referencias', type: 'textarea', required: false }],
    },
    {
      id: 'revision_aprobacion',
      title: 'Revision y aprobacion',
      order: order + 4,
      required: false,
      fields: [
        { id: 'aprobadoPor', label: 'Aprobado por', type: 'text', required: false },
        { id: 'fechaAprobacion', label: 'Fecha de aprobacion', type: 'date', required: false },
      ],
    },
  ];
}

function execSummarySection(order: number): TemplateSection {
  return {
    id: 'resumen_ejecutivo',
    title: 'Resumen ejecutivo',
    order,
    required: true,
    fields: [
      { id: 'resumenEjecutivoTexto', label: 'Resumen ejecutivo', type: 'richtext', required: true },
      { id: 'objetivos', label: 'Objetivos de la evaluacion', type: 'textarea', required: true },
    ],
  };
}

function fullTechnicalTemplate(
  id: ReportTemplate['kind'],
  name: string,
  description: string,
  methodologyHelp?: string
): ReportTemplate {
  const now = new Date().toISOString();
  const sections: TemplateSection[] = [
    ...commonFrontMatterSections(0),
    execSummarySection(3),
    scopeSection(4),
    authorizationSection(5),
    methodologySection(6, methodologyHelp),
    ...findingsSections(7),
    ...closingSections(11),
  ];

  return {
    id,
    kind: id,
    name,
    description,
    isBuiltIn: true,
    isCustomCopy: false,
    sections,
    createdAt: now,
    updatedAt: now,
  };
}

export function getBuiltInTemplates(): ReportTemplate[] {
  const now = new Date().toISOString();

  const socialEngineering: ReportTemplate = {
    id: 'social_engineering',
    kind: 'social_engineering',
    name: 'Evaluacion de ingenieria social',
    description: 'Centrada en autorizacion, alcance, resultados agregados y medidas preventivas (sin datos personales de individuos objetivo).',
    isBuiltIn: true,
    isCustomCopy: false,
    sections: [
      ...commonFrontMatterSections(0),
      execSummarySection(3),
      scopeSection(4),
      authorizationSection(5),
      methodologySection(6, 'Describe los vectores autorizados (phishing, llamadas, etc.) y como se protegio la privacidad del personal.'),
      {
        id: 'resultados_agregados',
        title: 'Resultados agregados',
        order: 7,
        required: true,
        fields: [
          { id: 'tasaInteraccion', label: 'Tasas agregadas (ej. % de interaccion)', type: 'textarea', required: true, helpText: 'Presenta datos agregados, nunca identifiques individuos.' },
          { id: 'observaciones', label: 'Observaciones generales', type: 'richtext', required: true },
        ],
      },
      {
        id: 'medidas_preventivas',
        title: 'Medidas preventivas recomendadas',
        order: 8,
        required: true,
        fields: [{ id: 'medidas', label: 'Recomendaciones de concientizacion y controles', type: 'richtext', required: true }],
      },
      ...closingSections(9),
    ],
    createdAt: now,
    updatedAt: now,
  };

  const vulnerabilityAnalysis: ReportTemplate = {
    id: 'vulnerability_analysis',
    kind: 'vulnerability_analysis',
    name: 'Analisis de vulnerabilidades y priorizacion',
    description: 'Enfocado en consolidar hallazgos de distintas fuentes y priorizar su remediacion.',
    isBuiltIn: true,
    isCustomCopy: false,
    sections: [
      ...commonFrontMatterSections(0),
      execSummarySection(3),
      scopeSection(4),
      methodologySection(5, 'Describe las fuentes de los hallazgos (escaneos manuales documentados, revisiones, reportes previos).'),
      ...findingsSections(6),
      ...closingSections(10),
    ],
    createdAt: now,
    updatedAt: now,
  };

  const retest: ReportTemplate = {
    id: 'retest',
    kind: 'retest',
    name: 'Retest y verificacion de remediaciones',
    description: 'Para documentar la verificacion de que los hallazgos previos fueron corregidos.',
    isBuiltIn: true,
    isCustomCopy: false,
    sections: [
      ...commonFrontMatterSections(0),
      execSummarySection(3),
      scopeSection(4),
      methodologySection(5, 'Describe como se verifico cada remediacion.'),
      {
        id: 'estado_remediaciones',
        title: 'Estado de remediaciones',
        order: 6,
        required: true,
        fields: [
          { id: 'tablaEstado', label: 'Tabla de hallazgos previos y su estado actual', type: 'findings_table', required: true },
        ],
      },
      ...closingSections(7),
    ],
    createdAt: now,
    updatedAt: now,
  };

  const executiveSummary: ReportTemplate = {
    id: 'executive_summary',
    kind: 'executive_summary',
    name: 'Informe ejecutivo resumido',
    description: 'Version corta orientada a direccion, sin detalle tecnico exhaustivo.',
    isBuiltIn: true,
    isCustomCopy: false,
    sections: [
      ...commonFrontMatterSections(0),
      execSummarySection(3),
      {
        id: 'resumen_resultados_ejecutivo',
        title: 'Resumen de resultados',
        order: 4,
        required: true,
        fields: [
          { id: 'resumenNumerico', label: 'Resumen numerico de hallazgos por severidad', type: 'findings_table', required: true },
          { id: 'mensajeClave', label: 'Mensaje clave para direccion', type: 'richtext', required: true },
        ],
      },
      {
        id: 'recomendaciones_ejecutivas',
        title: 'Recomendaciones principales',
        order: 5,
        required: true,
        fields: [{ id: 'recomendacionesTop', label: 'Principales recomendaciones', type: 'richtext', required: true }],
      },
      {
        id: 'revision_aprobacion_exec',
        title: 'Revision y aprobacion',
        order: 6,
        required: false,
        fields: [{ id: 'aprobadoPorExec', label: 'Aprobado por', type: 'text', required: false }],
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  const customBlank: ReportTemplate = {
    id: 'custom',
    kind: 'custom',
    name: 'Plantilla personalizada desde cero',
    description: 'Comienza sin secciones predefinidas y construye tu propia estructura.',
    isBuiltIn: true,
    isCustomCopy: false,
    sections: [commonFrontMatterSections(0)[0]],
    createdAt: now,
    updatedAt: now,
  };

  return [
    fullTechnicalTemplate('pentest_web', 'Prueba de penetracion de aplicaciones web', 'Evaluacion tecnica de seguridad en aplicaciones web.', 'Ej. OWASP Testing Guide, OWASP Top 10.'),
    fullTechnicalTemplate('api_security', 'Evaluacion de seguridad de API', 'Evaluacion tecnica enfocada en APIs REST/GraphQL/SOAP.', 'Ej. OWASP API Security Top 10.'),
    fullTechnicalTemplate('infra_interna', 'Evaluacion de infraestructura interna', 'Evaluacion de seguridad en red interna autorizada.'),
    fullTechnicalTemplate('infra_externa', 'Evaluacion de infraestructura externa', 'Evaluacion de superficie expuesta a internet, autorizada.'),
    fullTechnicalTemplate('wireless', 'Evaluacion de redes inalambricas', 'Evaluacion de seguridad Wi-Fi en entornos autorizados.'),
    fullTechnicalTemplate('cloud_config', 'Revision de configuracion cloud', 'Revision de configuraciones de seguridad en proveedores cloud.', 'Ej. CIS Benchmarks del proveedor correspondiente.'),
    fullTechnicalTemplate('mobile_security', 'Evaluacion de seguridad movil', 'Evaluacion tecnica de aplicaciones moviles (Android/iOS).', 'Ej. OWASP MASVS.'),
    fullTechnicalTemplate('code_review', 'Revision de codigo seguro', 'Revision manual/documentada de codigo fuente en busca de debilidades.', 'Ej. OWASP Code Review Guide.'),
    socialEngineering,
    vulnerabilityAnalysis,
    retest,
    executiveSummary,
    customBlank,
  ];
}
