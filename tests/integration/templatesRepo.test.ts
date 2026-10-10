import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { openDatabase, closeDatabase } from '../../src/db/connection';
import {
  upsertTemplate,
  duplicateTemplate,
  deleteTemplate,
  createCustomTemplate,
  listTemplates,
  getTemplate,
} from '../../src/db/repositories/templatesRepo';
import { getBuiltInTemplates } from '../../src/main/builtInTemplates';

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reportforge-test-'));
  openDatabase(tempDir);
});

afterEach(() => {
  closeDatabase();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('builtInTemplates', () => {
  it('define las 13 plantillas incorporadas requeridas (12 tecnicas/especializadas + personalizada en blanco)', () => {
    const templates = getBuiltInTemplates();
    const kinds = templates.map((t) => t.kind);

    expect(kinds).toContain('pentest_web');
    expect(kinds).toContain('api_security');
    expect(kinds).toContain('infra_interna');
    expect(kinds).toContain('infra_externa');
    expect(kinds).toContain('wireless');
    expect(kinds).toContain('cloud_config');
    expect(kinds).toContain('mobile_security');
    expect(kinds).toContain('code_review');
    expect(kinds).toContain('social_engineering');
    expect(kinds).toContain('vulnerability_analysis');
    expect(kinds).toContain('retest');
    expect(kinds).toContain('executive_summary');
    expect(kinds).toContain('custom');
  });

  it('cada plantilla incorporada tiene al menos una seccion', () => {
    const templates = getBuiltInTemplates();
    for (const template of templates) {
      expect(template.sections.length).toBeGreaterThan(0);
    }
  });
});

describe('templatesRepo', () => {
  it('duplica una plantilla incorporada como copia personalizada no incorporada', () => {
    const builtIn = getBuiltInTemplates()[0];
    upsertTemplate(builtIn);

    const copy = duplicateTemplate({ sourceId: builtIn.id, newName: 'Mi copia personalizada' });

    expect(copy.id).not.toBe(builtIn.id);
    expect(copy.isBuiltIn).toBe(false);
    expect(copy.isCustomCopy).toBe(true);
    expect(copy.sections).toEqual(builtIn.sections);
  });

  it('impide eliminar una plantilla incorporada', () => {
    const builtIn = getBuiltInTemplates()[0];
    upsertTemplate(builtIn);

    expect(() => deleteTemplate(builtIn.id)).toThrow();
    expect(getTemplate(builtIn.id)).not.toBeNull();
  });

  it('permite eliminar una plantilla personalizada', () => {
    const custom = createCustomTemplate('Mi plantilla', 'Descripcion');
    deleteTemplate(custom.id);

    expect(getTemplate(custom.id)).toBeNull();
  });

  it('crea una plantilla personalizada en blanco sin secciones', () => {
    const custom = createCustomTemplate('Nueva', 'Desde cero');
    expect(custom.sections).toEqual([]);
    expect(custom.isBuiltIn).toBe(false);
  });

  it('lista plantillas con las incorporadas primero', () => {
    const custom = createCustomTemplate('Z personalizada', 'Desc');
    const builtIn = getBuiltInTemplates()[0];
    upsertTemplate(builtIn);

    const list = listTemplates();
    const firstBuiltInIndex = list.findIndex((t) => t.isBuiltIn);
    const customIndex = list.findIndex((t) => t.id === custom.id);

    expect(firstBuiltInIndex).toBeLessThan(customIndex);
  });
});
