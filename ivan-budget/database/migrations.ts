import type { SQLiteDatabase } from 'expo-sqlite';
import { DB_CURRENT_VERSION } from './schema';

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const versionRow = await db.getFirstAsync<{ version: number }>(
    'SELECT version FROM db_version LIMIT 1'
  );
  const currentVersion = versionRow?.version ?? 0;

  if (currentVersion >= DB_CURRENT_VERSION) {
    return;
  }

  // Migration 1 → initial schema (already created by schema.ts)
  if (currentVersion < 1) {
    await db.runAsync(
      'INSERT OR REPLACE INTO db_version (version) VALUES (?)',
      [1]
    );
  }

  // Future migrations go here:
  // if (currentVersion < 2) { ... }
}
