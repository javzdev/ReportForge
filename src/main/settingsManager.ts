import { getDatabase } from '../db/connection';
import type { AppSettings } from '@shared/types';
import { MAX_ATTACHMENT_SIZE_BYTES } from '@shared/types';

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  brandName: undefined,
  brandLogoAttachmentId: undefined,
  defaultClassification: 'confidencial',
  maxAttachmentSizeBytes: MAX_ATTACHMENT_SIZE_BYTES,
};

export function getAllSettings(): AppSettings {
  const rows = getDatabase().prepare('SELECT key, value FROM settings').all() as {
    key: string;
    value: string;
  }[];

  const stored: Record<string, unknown> = {};
  for (const row of rows) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(row.value);
    } catch {
      parsed = row.value;
    }
    // Los campos opcionales del modelo usan `undefined` (no `null`) como "sin valor".
    stored[row.key] = parsed === null ? undefined : parsed;
  }

  return { ...DEFAULT_SETTINGS, ...stored } as AppSettings;
}

export function setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
  // JSON.stringify(undefined) devuelve `undefined` (no la cadena "undefined"), lo cual
  // better-sqlite3 no puede bindear como parametro; lo normalizamos a null en ese caso.
  const serialized = value === undefined ? 'null' : JSON.stringify(value);

  getDatabase()
    .prepare(
      `INSERT INTO settings (key, value) VALUES (@key, @value)
       ON CONFLICT(key) DO UPDATE SET value = @value`
    )
    .run({ key, value: serialized });
}
