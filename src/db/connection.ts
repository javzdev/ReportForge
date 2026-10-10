import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

export const SCHEMA_VERSION = 1;

let dbInstance: Database.Database | null = null;

/**
 * Abre (o crea) la base de datos SQLite dentro de userDataPath.
 * Se llama una sola vez al iniciar el proceso principal.
 */
export function openDatabase(userDataPath: string): Database.Database {
  if (dbInstance) return dbInstance;

  const dbPath = path.join(userDataPath, 'reportforge.db');
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schemaSql);

  const row = db
    .prepare('SELECT value FROM schema_meta WHERE key = ?')
    .get('schema_version') as { value: string } | undefined;

  if (!row) {
    db.prepare('INSERT INTO schema_meta (key, value) VALUES (?, ?)').run(
      'schema_version',
      String(SCHEMA_VERSION)
    );
  }

  dbInstance = db;
  return db;
}

export function getDatabase(): Database.Database {
  if (!dbInstance) {
    throw new Error('La base de datos no ha sido inicializada todavia.');
  }
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
