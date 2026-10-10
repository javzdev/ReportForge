// Mapa simple de extension -> MIME type, usado al adjuntar archivos: pickFiles()
// devuelve solo rutas absolutas (filtradas por extension en el dialogo nativo),
// asi que el renderer debe inferir el mimeType antes de llamar a attachments.add().
const EXTENSION_TO_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.json': 'application/json',
};

export function inferMimeTypeFromPath(filePath: string): string {
  const lower = filePath.toLowerCase();
  const dotIndex = lower.lastIndexOf('.');
  if (dotIndex === -1) return 'application/octet-stream';
  const ext = lower.slice(dotIndex);
  return EXTENSION_TO_MIME[ext] ?? 'application/octet-stream';
}

export function getFileNameFromPath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  return parts[parts.length - 1] ?? filePath;
}

export function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}
