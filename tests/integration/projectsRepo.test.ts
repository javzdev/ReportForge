import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { openDatabase, closeDatabase } from '../../src/db/connection';
import {
  createProject,
  listProjects,
  getProject,
  updateProject,
  deleteProject,
} from '../../src/db/repositories/projectsRepo';

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reportforge-test-'));
  openDatabase(tempDir);
});

afterEach(() => {
  closeDatabase();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('projectsRepo', () => {
  it('crea un proyecto y lo recupera por id', () => {
    const created = createProject({ name: 'Proyecto Demo', clientName: 'Cliente Ficticio' });
    const fetched = getProject(created.id);

    expect(fetched).not.toBeNull();
    expect(fetched?.name).toBe('Proyecto Demo');
    expect(fetched?.clientName).toBe('Cliente Ficticio');
  });

  it('lista proyectos ordenados por actualizacion descendente', () => {
    const first = createProject({ name: 'Primero', clientName: 'Cliente A' });
    createProject({ name: 'Segundo', clientName: 'Cliente B' });

    // Actualiza "first" explicitamente para que su updated_at sea el mas reciente,
    // evitando depender de la resolucion de milisegundos entre dos creaciones consecutivas.
    const touched = updateProject({ id: first.id, name: 'Primero (actualizado)' });

    const list = listProjects();
    expect(list[0].id).toBe(touched.id);
  });

  it('actualiza un proyecto existente', () => {
    const created = createProject({ name: 'Original', clientName: 'Cliente' });
    const updated = updateProject({ id: created.id, name: 'Renombrado' });

    expect(updated.name).toBe('Renombrado');
    expect(updated.clientName).toBe('Cliente');

    const fetched = getProject(created.id);
    expect(fetched?.name).toBe('Renombrado');
  });

  it('lanza error al actualizar un proyecto inexistente', () => {
    expect(() => updateProject({ id: 'id-inexistente', name: 'X' })).toThrow();
  });

  it('elimina un proyecto', () => {
    const created = createProject({ name: 'A borrar', clientName: 'Cliente' });
    deleteProject(created.id);

    expect(getProject(created.id)).toBeNull();
  });

  it('recorta espacios en blanco de nombre y cliente', () => {
    const created = createProject({ name: '  Con espacios  ', clientName: '  Cliente  ' });
    expect(created.name).toBe('Con espacios');
    expect(created.clientName).toBe('Cliente');
  });
});
