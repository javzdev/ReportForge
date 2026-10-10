import { getDatabase } from '../db/connection';
import { createProject } from '../db/repositories/projectsRepo';
import { createReport } from '../db/repositories/reportsRepo';
import { createFinding } from '../db/repositories/findingsRepo';

/**
 * Inserta datos de demostracion EXCLUSIVAMENTE ficticios, solo si la base de datos
 * esta completamente vacia (primer arranque). Util para que el usuario explore la app
 * sin tener que crear contenido real de inmediato.
 */
export function seedDemoDataIfEmpty(): void {
  const db = getDatabase();
  const projectCount = (db.prepare('SELECT COUNT(*) as c FROM projects').get() as { c: number }).c;
  if (projectCount > 0) return;

  const demoProject = createProject({
    name: 'Demo - Evaluacion Web Ficticia',
    clientName: 'Empresa Ficticia S.A. (datos de ejemplo)',
    description:
      'Proyecto de demostracion con datos completamente ficticios, incluido solo para explorar la aplicacion. Puedes eliminarlo cuando quieras.',
  });

  const demoReport = createReport({
    projectId: demoProject.id,
    templateId: 'pentest_web',
    title: 'Informe de ejemplo - Pentest Web (ficticio)',
    classification: 'confidencial',
    sections: [],
  });

  createFinding({
    projectId: demoProject.id,
    reportId: demoReport.id,
    title: '[Ejemplo ficticio] Inyeccion SQL en formulario de busqueda',
    description:
      'Hallazgo de ejemplo con fines demostrativos. No corresponde a un sistema real. En una evaluacion autorizada real, aqui se documentaria el detalle tecnico de la vulnerabilidad observada.',
    affectedAsset: 'app-demo.ejemplo.local/buscar',
    category: 'Inyeccion',
    severity: 'alta',
    severityJustification: 'Ejemplo: permitiria lectura no autorizada de datos si fuera un hallazgo real.',
    potentialImpact: 'Ejemplo ficticio de impacto potencial sobre confidencialidad de datos.',
    reproductionSteps:
      '1. (Ejemplo) Navegar al formulario de busqueda.\n2. (Ejemplo) Insertar una cadena de prueba documentada durante la evaluacion autorizada.\n3. (Ejemplo) Observar la respuesta del sistema.',
    remediationRecommendation: 'Ejemplo: usar consultas parametrizadas y validacion de entrada.',
    status: 'confirmado',
    identifiedDate: new Date().toISOString().slice(0, 10),
    references: [{ id: 'ref-demo-1', label: 'OWASP A03:2021 (ejemplo)' }],
    tags: ['demo', 'ficticio'],
    notes: 'Este hallazgo es parte de los datos de demostracion y es completamente ficticio.',
  });

  createFinding({
    projectId: demoProject.id,
    reportId: demoReport.id,
    title: '[Ejemplo ficticio] Cabeceras de seguridad ausentes',
    description: 'Hallazgo de ejemplo con fines demostrativos sobre cabeceras HTTP de seguridad.',
    affectedAsset: 'app-demo.ejemplo.local',
    category: 'Configuracion',
    severity: 'baja',
    status: 'pendiente_revision',
    identifiedDate: new Date().toISOString().slice(0, 10),
    references: [],
    tags: ['demo', 'ficticio'],
  });
}
