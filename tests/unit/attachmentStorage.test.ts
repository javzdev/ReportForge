import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  sanitizeFileName,
  validateAttachmentFile,
  initAttachmentStorage,
  storeAttachmentFile,
  getAttachmentFilePath,
  deleteAttachmentFile,
  AttachmentValidationError,
} from '../../src/main/attachmentStorage';
import { MAX_ATTACHMENT_SIZE_BYTES } from '../../src/shared/types';

describe('sanitizeFileName', () => {
  it('elimina caracteres especiales y conserva la extension', () => {
    expect(sanitizeFileName('evidencia captura (1)!!.png')).toBe('evidencia captura 1.png');
  });

  it('elimina intentos de path traversal, quedandose solo con el nombre base', () => {
    expect(sanitizeFileName('../../etc/passwd')).toBe('passwd');
  });

  it('usa un nombre por defecto si queda vacio tras sanitizar', () => {
    expect(sanitizeFileName('%%%.png')).toBe('archivo.png');
  });

  it('acota la longitud del nombre', () => {
    const longName = `${'a'.repeat(200)}.txt`;
    const sanitized = sanitizeFileName(longName);
    expect(sanitized.length).toBeLessThanOrEqual(84); // 80 + '.txt'
  });
});

describe('validateAttachmentFile', () => {
  it('acepta un archivo con extension y mime permitidos dentro del limite de tamano', () => {
    expect(() =>
      validateAttachmentFile({
        originalFileName: 'captura.png',
        mimeType: 'image/png',
        sizeBytes: 1024,
      })
    ).not.toThrow();
  });

  it('rechaza extensiones no permitidas (ej. ejecutables)', () => {
    expect(() =>
      validateAttachmentFile({
        originalFileName: 'script.exe',
        mimeType: 'application/octet-stream',
        sizeBytes: 1024,
      })
    ).toThrow(AttachmentValidationError);
  });

  it('rechaza un mime type no permitido aunque la extension sea valida', () => {
    expect(() =>
      validateAttachmentFile({
        originalFileName: 'falso.png',
        mimeType: 'application/x-msdownload',
        sizeBytes: 1024,
      })
    ).toThrow(AttachmentValidationError);
  });

  it('rechaza archivos que superan el tamano maximo', () => {
    expect(() =>
      validateAttachmentFile({
        originalFileName: 'grande.pdf',
        mimeType: 'application/pdf',
        sizeBytes: MAX_ATTACHMENT_SIZE_BYTES + 1,
      })
    ).toThrow(AttachmentValidationError);
  });

  it('respeta un limite de tamano configurado distinto al default', () => {
    expect(() =>
      validateAttachmentFile({
        originalFileName: 'mediano.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 2 * 1024 * 1024,
        maxSizeBytes: 1024 * 1024,
      })
    ).toThrow(AttachmentValidationError);
  });

  it('rechaza archivos vacios', () => {
    expect(() =>
      validateAttachmentFile({
        originalFileName: 'vacio.txt',
        mimeType: 'text/plain',
        sizeBytes: 0,
      })
    ).toThrow(AttachmentValidationError);
  });
});

describe('almacenamiento fisico de adjuntos', () => {
  let tempUserData: string;
  let sourceFile: string;

  beforeEach(() => {
    tempUserData = fs.mkdtempSync(path.join(os.tmpdir(), 'reportforge-userdata-'));
    initAttachmentStorage(tempUserData);
    sourceFile = path.join(os.tmpdir(), `source-${Date.now()}.txt`);
    fs.writeFileSync(sourceFile, 'contenido de prueba');
  });

  afterEach(() => {
    fs.rmSync(tempUserData, { recursive: true, force: true });
    if (fs.existsSync(sourceFile)) fs.rmSync(sourceFile, { force: true });
  });

  it('copia el archivo dentro de la carpeta del proyecto con un nombre interno generado', () => {
    const projectId = 'proyecto-uuid-1234';
    const storedFileName = storeAttachmentFile(projectId, sourceFile, 'mi evidencia.txt');

    expect(storedFileName).toMatch(/\.txt$/);

    const storedPath = getAttachmentFilePath(projectId, storedFileName);
    expect(fs.existsSync(storedPath)).toBe(true);
    expect(fs.readFileSync(storedPath, 'utf-8')).toBe('contenido de prueba');
  });

  it('elimina el archivo fisico al borrar el adjunto', () => {
    const projectId = 'proyecto-uuid-5678';
    const storedFileName = storeAttachmentFile(projectId, sourceFile, 'evidencia.txt');
    const storedPath = getAttachmentFilePath(projectId, storedFileName);

    expect(fs.existsSync(storedPath)).toBe(true);
    deleteAttachmentFile(projectId, storedFileName);
    expect(fs.existsSync(storedPath)).toBe(false);
  });

  it('rechaza identificadores de proyecto con caracteres invalidos (defensa contra path traversal)', () => {
    expect(() => getAttachmentFilePath('../../escape', 'archivo.txt')).toThrow(AttachmentValidationError);
  });
});
