import type { SQLiteDatabase } from 'expo-sqlite';
import { DEFAULT_CATEGORIES } from '../constants/defaultCategories';

export async function seedDatabase(db: SQLiteDatabase): Promise<void> {
  const existing = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM categories'
  );

  if (existing && existing.count > 0) {
    return; // Already seeded
  }

  for (const cat of DEFAULT_CATEGORIES) {
    await db.runAsync(
      `INSERT INTO categories (name, name_hr, type, icon, color, is_recurring, default_amount, due_day, is_active, is_system)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cat.name,
        cat.name_hr,
        cat.type,
        cat.icon,
        cat.color,
        cat.is_recurring,
        cat.default_amount,
        cat.due_day,
        cat.is_active,
        cat.is_system,
      ]
    );
  }
}
