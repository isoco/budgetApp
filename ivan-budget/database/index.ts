import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL } from './schema';
import { runMigrations } from './migrations';
import { seedDatabase } from './seed';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  const db = await SQLite.openDatabaseAsync('ivan-budget.db');

  // Enable WAL mode for better performance
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // Create tables
  await db.execAsync(CREATE_TABLES_SQL);

  // Run migrations
  await runMigrations(db);

  // Seed default data
  await seedDatabase(db);

  dbInstance = db;
  return db;
}

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return dbInstance;
}
