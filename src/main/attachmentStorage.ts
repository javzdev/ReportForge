import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  ACCEPTED_ATTACHMENT_EXTENSIONS,
  ACCEPTED_ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENT_SIZE_BYTES,
} from '@shared/types';

export class AttachmentValidationError extends Error {}

let evidenceRoot: string | null = null;

export function initAttachmentStorage(userDataPath: string): void {
  evidenceRoot = path.join(userDataPath, 'evidence');
  if (!fs.existsSync(evidenceRoot)) {
    fs.mkdirSync(evidenceRoot, { recursive: true });
  }
}

function getEvidenceRoot(): string {
  if (!evidenceRoot) throw new Error('El almacenamiento de evidencias no ha sido inicializado.');
  return evidenceRoot;
}

/**
 * Convierte un nombre de archivo arbitrario en uno seguro para el sistema de archivos:
 * sin rutas, sin caracteres especiales, longitud acotada.
 */
export function sanitizeFileName(originalName: string): string {
  const base = path.basename(originalName);
  const ext = path.extname(base).toLowerCase();
  const nameWithoutExt = base.slice(0, base.length - ext.length);
  const safeName = nameWithoutExt
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .trim()
    .slice(0, 80);
  return `${safeName || 'archivo'}${ext}`;
}

export interface ValidateFileInput {
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  maxSizeBytes?: number;
}

export function validateAttachmentFile(input: ValidateFileInput): void {
  const ext = path.extname(input.originalFileName).toLowerCase();

  if (!ACCEPTED_ATTACHMENT_EXTENSIONS.includes(ext as (typeof ACCEPTED_ATTACHMENT_EXTENSIONS)[number])) {
    throw new AttachmentValidationError(
      `Tipo de archivo no permitido (${ext || 'sin extension'}). Tipos aceptados: ${ACCEPTED_ATTACHMENT_EXTENSIONS.join(', ')}`
    );
  }

  if (!ACCEPTED_ATTACHMENT_MIME_TYPES.includes(input.mimeType as (typeof ACCEPTED_ATTACHMENT_MIME_TYPES)[number])) {
    throw new AttachmentValidationError(`Tipo MIME no permitido: ${input.mimeType}`);
  }

  const limit = input.maxSizeBytes ?? MAX_ATTACHMENT_SIZE_BYTES;
  if (input.sizeBytes > limit) {
    const limitMb = (limit / (1024 * 1024)).toFixed(1);
    throw new AttachmentValidationError(`El archivo supera el limite permitido de ${limitMb} MB.`);
  }

  if (input.sizeBytes <= 0) {
    throw new AttachmentValidationError('El archivo esta vacio o no pudo leerse correctamente.');
  }
}

/**
 * Copia el contenido de un archivo fuente hacia el almacenamiento interno de evidencias,
 * dentro de la subcarpeta del proyecto. Devuelve el nombre de archivo interno generado.
 */
export function storeAttachmentFile(
  projectId: string,
  sourcePath: string,
  originalFileName: string
): string {
  const root = getEvidenceRoot();
  const projectDir = path.join(root, sanitizeProjectId(projectId));
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }

  const safeName = sanitizeFileName(originalFileName);
  const ext = path.extname(safeName);
  const storedFileName = `${randomUUID()}${ext}`;
  const destPath = path.join(projectDir, storedFileName);

  // Verifica que el destino quede dentro de projectDir (defensa en profundidad).
  const resolvedDest = path.resolve(destPath);
  if (!resolvedDest.startsWith(path.resolve(projectDir))) {
    throw new AttachmentValidationError('Ruta de destino invalida.');
  }

  fs.copyFileSync(sourcePath, destPath);
  return storedFileName;
}

export function getAttachmentFilePath(projectId: string, storedFileName: string): string {
  const root = getEvidenceRoot();
  const projectDir = path.join(root, sanitizeProjectId(projectId));
  const filePath = path.resolve(path.join(projectDir, storedFileName));

  if (!filePath.startsWith(path.resolve(projectDir))) {
    throw new AttachmentValidationError('Ruta de archivo invalida.');
  }
  return filePath;
}

export function deleteAttachmentFile(projectId: string, storedFileName: string): void {
  const filePath = getAttachmentFilePath(projectId, storedFileName);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

function sanitizeProjectId(projectId: string): string {
  // Los IDs son UUIDs generados internamente, pero validamos por defensa en profundidad.
  if (!/^[a-zA-Z0-9-]+$/.test(projectId)) {
    throw new AttachmentValidationError('Identificador de proyecto invalido.');
  }
  return projectId;
}
