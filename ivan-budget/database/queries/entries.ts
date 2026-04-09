import { getDatabase } from '../index';
import { BudgetEntry } from '../../types';
import { format } from 'date-fns';

export async function getMonthEntries(
  year: number,
  month: number
): Promise<BudgetEntry[]> {
  const db = getDatabase();
  return db.getAllAsync<BudgetEntry>(
    `SELECT be.*, c.name_hr as category_name_hr, c.name as category_name,
            c.icon as category_icon, c.color as category_color, c.type as category_type,
            c.is_recurring as category_is_recurring
     FROM budget_entries be
     JOIN categories c ON be.category_id = c.id
     WHERE be.year = ? AND be.month = ?
     ORDER BY c.type, c.name_hr`,
    [year, month]
  );
}

export async function getEntriesByType(
  year: number,
  month: number,
  type: string
): Promise<BudgetEntry[]> {
  const db = getDatabase();
  return db.getAllAsync<BudgetEntry>(
    `SELECT be.*, c.name_hr as category_name_hr, c.name as category_name,
            c.icon as category_icon, c.color as category_color, c.type as category_type,
            c.is_recurring as category_is_recurring
     FROM budget_entries be
     JOIN categories c ON be.category_id = c.id
     WHERE be.year = ? AND be.month = ? AND c.type = ?
     ORDER BY c.name_hr`,
    [year, month, type]
  );
}

export async function getEntryById(id: number): Promise<BudgetEntry | null> {
  const db = getDatabase();
  return db.getFirstAsync<BudgetEntry>(
    `SELECT be.*, c.name_hr as category_name_hr, c.name as category_name,
            c.icon as category_icon, c.color as category_color, c.type as category_type,
            c.is_recurring as category_is_recurring
     FROM budget_entries be
     JOIN categories c ON be.category_id = c.id
     WHERE be.id = ?`,
    [id]
  );
}

export async function createEntry(
  data: Omit<BudgetEntry, 'id' | 'created_at' | 'category_name' | 'category_name_hr' | 'category_icon' | 'category_color' | 'category_type'>
): Promise<number> {
  const db = getDatabase();
  const result = await db.runAsync(
    `INSERT INTO budget_entries (category_id, year, month, planned_amount, actual_amount, due_date, paid_date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.category_id,
      data.year,
      data.month,
      data.planned_amount,
      data.actual_amount,
      data.due_date,
      data.paid_date,
      data.notes,
    ]
  );
  return result.lastInsertRowId;
}

export async function updateEntry(
  id: number,
  data: Partial<Pick<BudgetEntry, 'planned_amount' | 'actual_amount' | 'due_date' | 'paid_date' | 'notes'>>
): Promise<void> {
  const db = getDatabase();
  const fields = Object.keys(data).map((k) => `${k} = ?`).join(', ');
  const values = [...Object.values(data), id];
  await db.runAsync(
    `UPDATE budget_entries SET ${fields} WHERE id = ?`,
    values
  );
}

export async function markEntryPaid(id: number): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    'UPDATE budget_entries SET paid_date = ? WHERE id = ?',
    [format(new Date(), 'yyyy-MM-dd'), id]
  );
}

export async function markEntryUnpaid(id: number): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    'UPDATE budget_entries SET paid_date = NULL WHERE id = ?',
    [id]
  );
}

export async function deleteEntry(id: number): Promise<void> {
  const db = getDatabase();
  await db.runAsync('DELETE FROM budget_entries WHERE id = ?', [id]);
}

export async function getUpcomingBills(daysAhead: number = 7): Promise<BudgetEntry[]> {
  const db = getDatabase();
  const today = format(new Date(), 'yyyy-MM-dd');
  const futureDate = format(
    new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000),
    'yyyy-MM-dd'
  );
  return db.getAllAsync<BudgetEntry>(
    `SELECT be.*, c.name_hr as category_name_hr, c.name as category_name,
            c.icon as category_icon, c.color as category_color, c.type as category_type,
            c.is_recurring as category_is_recurring
     FROM budget_entries be
     JOIN categories c ON be.category_id = c.id
     WHERE be.due_date >= ? AND be.due_date <= ? AND be.paid_date IS NULL
     ORDER BY be.due_date ASC`,
    [today, futureDate]
  );
}

export async function getUpcomingIncome(daysAhead: number = 7): Promise<BudgetEntry[]> {
  const db = getDatabase();
  const today = format(new Date(), 'yyyy-MM-dd');
  const futureDate = format(
    new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000),
    'yyyy-MM-dd'
  );
  return db.getAllAsync<BudgetEntry>(
    `SELECT be.*, c.name_hr as category_name_hr, c.name as category_name,
            c.icon as category_icon, c.color as category_color, c.type as category_type,
            c.is_recurring as category_is_recurring
     FROM budget_entries be
     JOIN categories c ON be.category_id = c.id
     WHERE c.type = 'income' AND be.due_date >= ? AND be.due_date <= ? AND be.paid_date IS NULL
     ORDER BY be.due_date ASC`,
    [today, futureDate]
  );
}

export async function autoPopulateMonth(
  year: number,
  month: number,
  dailyAllowance: number = 4
): Promise<void> {
  const db = getDatabase();

  // Check if month already has entries
  const existing = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM budget_entries WHERE year = ? AND month = ?',
    [year, month]
  );

  if (existing && existing.count > 0) {
    return; // Already populated
  }

  // Get recurring categories
  const recurring = await db.getAllAsync<{
    id: number;
    name: string;
    type: string;
    default_amount: number;
    due_day: number | null;
  }>(
    'SELECT id, name, type, default_amount, due_day FROM categories WHERE is_recurring = 1 AND is_active = 1'
  );

  for (const cat of recurring) {
    let dueDate: string | null = null;
    if (cat.due_day) {
      const daysInMonth = new Date(year, month, 0).getDate();
      const actualDay = Math.min(cat.due_day, daysInMonth);
      dueDate = `${year}-${String(month).padStart(2, '0')}-${String(actualDay).padStart(2, '0')}`;
    }

    let amount = cat.default_amount;
    // Daily life category: calculate based on days in month
    if (cat.name === 'daily_life') {
      const daysInMonth = new Date(year, month, 0).getDate();
      amount = daysInMonth * dailyAllowance;
    }

    await db.runAsync(
      `INSERT OR IGNORE INTO budget_entries (category_id, year, month, planned_amount, actual_amount, due_date, paid_date, notes)
       VALUES (?, ?, ?, ?, 0, ?, NULL, NULL)`,
      [cat.id, year, month, amount, dueDate]
    );
  }
}
