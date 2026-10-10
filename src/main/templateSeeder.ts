import { getDatabase } from '../db/connection';
import { upsertTemplate } from '../db/repositories/templatesRepo';
import { getBuiltInTemplates } from './builtInTemplates';

/**
 * Inserta o actualiza las plantillas incorporadas en cada arranque, para que
 * mejoras futuras a estas plantillas lleguen a usuarios existentes sin afectar
 * las copias personalizadas que el usuario haya creado (que tienen otros ids).
 */
export function ensureBuiltInTemplatesSeeded(): void {
  const db = getDatabase();
  const builtIns = getBuiltInTemplates();

  const run = db.transaction(() => {
    for (const template of builtIns) {
      upsertTemplate(template);
    }
  });

  run();
}
