import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { openDatabase, closeDatabase } from '../../src/db/connection';
import { getAllSettings, setSetting, DEFAULT_SETTINGS } from '../../src/main/settingsManager';

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reportforge-test-'));
  openDatabase(tempDir);
});

afterEach(() => {
  closeDatabase();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('settingsManager', () => {
  it('devuelve los valores por defecto cuando no hay nada guardado', () => {
    expect(getAllSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('persiste y recupera un valor de tipo string', () => {
    setSetting('theme', 'dark');
    expect(getAllSettings().theme).toBe('dark');
  });

  it('persiste y recupera un valor numerico', () => {
    setSetting('maxAttachmentSizeBytes', 5 * 1024 * 1024);
    expect(getAllSettings().maxAttachmentSizeBytes).toBe(5 * 1024 * 1024);
  });

  it('acepta guardar un valor undefined para un campo opcional sin lanzar error de constraint', () => {
    expect(() => setSetting('brandName', undefined)).not.toThrow();
    expect(getAllSettings().brandName).toBeUndefined();
  });

  it('permite quitar un valor previamente guardado volviendo a undefined', () => {
    setSetting('brandName', 'Mi Consultora');
    expect(getAllSettings().brandName).toBe('Mi Consultora');

    setSetting('brandName', undefined);
    expect(getAllSettings().brandName).toBeUndefined();
  });
});
