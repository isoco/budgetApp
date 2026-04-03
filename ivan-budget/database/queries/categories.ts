import { getDatabase } from '../index';
import { Category, CategoryType } from '../../types';

export async function getAllCategories(): Promise<Category[]> {
  const db = getDatabase();
  return db.getAllAsync<Category>(
    'SELECT * FROM categories ORDER BY type, name_hr'
  );
}

export async function getActiveCategories(type?: CategoryType): Promise<Category[]> {
  const db = getDatabase();
  if (type) {
    return db.getAllAsync<Category>(
      'SELECT * FROM categories WHERE is_active = 1 AND type = ? ORDER BY name_hr',
      [type]
    );
  }
  return db.getAllAsync<Category>(
    'SELECT * FROM categories WHERE is_active = 1 ORDER BY type, name_hr'
  );
}

export async function getRecurringCategories(): Promise<Category[]> {
  const db = getDatabase();
  return db.getAllAsync<Category>(
    'SELECT * FROM categories WHERE is_recurring = 1 AND is_active = 1 ORDER BY type, name_hr'
  );
}

export async function getCategoryById(id: number): Promise<Category | null> {
  const db = getDatabase();
  return db.getFirstAsync<Category>(
    'SELECT * FROM categories WHERE id = ?',
    [id]
  );
}

export async function createCategory(
  data: Omit<Category, 'id' | 'created_at'>
): Promise<number> {
  const db = getDatabase();
  const result = await db.runAsync(
    `INSERT INTO categories (name, name_hr, type, icon, color, is_recurring, default_amount, due_day, is_active, is_system)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.name,
      data.name_hr,
      data.type,
      data.icon,
      data.color,
      data.is_recurring,
      data.default_amount,
      data.due_day,
      data.is_active,
      data.is_system,
    ]
  );
  return result.lastInsertRowId;
}

export async function updateCategory(
  id: number,
  data: Partial<Omit<Category, 'id' | 'created_at' | 'is_system'>>
): Promise<void> {
  const db = getDatabase();
  const fields = Object.keys(data).map((k) => `${k} = ?`).join(', ');
  const values = [...Object.values(data), id];
  await db.runAsync(
    `UPDATE categories SET ${fields} WHERE id = ?`,
    values
  );
}

export async function deactivateCategory(id: number): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    'UPDATE categories SET is_active = 0 WHERE id = ?',
    [id]
  );
}

export async function deleteCategory(id: number): Promise<void> {
  const db = getDatabase();
  // Only allow deleting non-system categories
  await db.runAsync(
    'DELETE FROM categories WHERE id = ? AND is_system = 0',
    [id]
  );
}
