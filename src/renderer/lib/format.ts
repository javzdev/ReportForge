// Utilidades de formato de fechas y textos usadas en toda la interfaz.
//
// Nota sobre zonas horarias: los campos de "solo fecha" del modelo (identifiedDate,
// retestDate, y los valores de campos de tipo `date` en reportes) se guardan como un
// instante ISO en medianoche UTC (p.ej. "2026-01-15T00:00:00.000Z"), producido por un
// <input type="date">. Si se formatean con metodos que usan la zona horaria LOCAL del
// navegador (toLocaleDateString, getDate, etc.), cualquier zona horaria con offset
// negativo (toda America) muestra el dia ANTERIOR al que el usuario selecciono. Por eso
// estas fechas se parsean y formatean en UTC explicitamente en vez de en hora local.
export function formatDate(iso: string | undefined | null): string {
  if (!iso) return 'Sin fecha';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return date.toLocaleDateString('es', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function formatDateTime(iso: string | undefined | null): string {
  if (!iso) return 'Sin fecha';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return date.toLocaleString('es', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function toDateInputValue(iso: string | undefined | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  // toISOString() siempre devuelve el instante en UTC, que es exactamente lo que
  // necesitamos aqui: estas fechas se guardaron como medianoche UTC (ver nota arriba),
  // asi que leer sus componentes en UTC reproduce el mismo dia que el usuario eligio.
  return date.toISOString().slice(0, 10);
}

/** Convierte el valor de un <input type="date"> (YYYY-MM-DD) a un ISO de medianoche UTC,
 * evitando pasar por el parseo de zona horaria local que new Date(str).toISOString()
 * aplicaria si el string no estuviera ya en el formato exacto que Date.parse trata como UTC. */
export function dateInputValueToIso(value: string): string {
  if (!value) return '';
  return `${value}T00:00:00.000Z`;
}

/** Fecha de HOY en la zona horaria local del usuario, codificada como medianoche UTC
 * (mismo formato que el resto de fechas de "solo fecha" del modelo). No usar
 * `new Date().toISOString()` aqui: cerca de medianoche UTC esa expresion puede
 * devolver el dia anterior o siguiente al dia local real, segun el huso horario. */
export function todayAsDateOnlyIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return dateInputValueToIso(`${year}-${month}-${day}`);
}

export const SEVERITY_LABELS: Record<string, string> = {
  critica: 'Critica',
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
  informativa: 'Informativa',
};

export const SEVERITY_ORDER = ['critica', 'alta', 'media', 'baja', 'informativa'];

export const STATUS_LABELS: Record<string, string> = {
  borrador: 'Borrador',
  pendiente_revision: 'Pendiente de revision',
  confirmado: 'Confirmado',
  corregido: 'Corregido',
  aceptado: 'Aceptado',
  cerrado: 'Cerrado',
};

export const CLASSIFICATION_LABELS: Record<string, string> = {
  publico: 'Publico',
  uso_interno: 'Uso interno',
  confidencial: 'Confidencial',
  estrictamente_confidencial: 'Estrictamente confidencial',
};
