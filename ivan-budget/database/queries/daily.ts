import { getDatabase } from '../index';
import { DailyTracking } from '../../types';

export async function getMonthDailyTracking(
  year: number,
  month: number
): Promise<DailyTracking[]> {
  const db = getDatabase();
  return db.getAllAsync<DailyTracking>(
    'SELECT * FROM daily_tracking WHERE year = ? AND month = ? ORDER BY day',
    [year, month]
  );
}

export async function getDayTracking(
  year: number,
  month: number,
  day: number
): Promise<DailyTracking | null> {
  const db = getDatabase();
  return db.getFirstAsync<DailyTracking>(
    'SELECT * FROM daily_tracking WHERE year = ? AND month = ? AND day = ?',
    [year, month, day]
  );
}

export async function upsertDayTracking(
  year: number,
  month: number,
  day: number,
  allowed_amount: number,
  spent_amount: number,
  notes: string | null = null
): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    `INSERT INTO daily_tracking (year, month, day, allowed_amount, spent_amount, notes)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(year, month, day) DO UPDATE SET
       allowed_amount = excluded.allowed_amount,
       spent_amount = excluded.spent_amount,
       notes = excluded.notes`,
    [year, month, day, allowed_amount, spent_amount, notes]
  );
}

export async function initMonthDailyTracking(
  year: number,
  month: number,
  defaultAllowance: number = 4
): Promise<void> {
  const db = getDatabase();

  // Check if already initialized
  const existing = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM daily_tracking WHERE year = ? AND month = ?',
    [year, month]
  );

  if (existing && existing.count > 0) {
    return;
  }

  const daysInMonth = new Date(year, month, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    await db.runAsync(
      `INSERT OR IGNORE INTO daily_tracking (year, month, day, allowed_amount, spent_amount)
       VALUES (?, ?, ?, ?, 0)`,
      [year, month, day, defaultAllowance]
    );
  }
}

export async function getMonthProjectedDailySpending(
  year: number,
  month: number,
  todayDay: number
): Promise<number> {
  const db = getDatabase();
  // For days up to today: use actual spent_amount
  // For future days: use allowed_amount (assume spending exactly the allowed budget)
  const row = await db.getFirstAsync<{ projected: number }>(
    `SELECT COALESCE(SUM(
       CASE WHEN day <= ? THEN spent_amount ELSE allowed_amount END
     ), 0) as projected
     FROM daily_tracking WHERE year = ? AND month = ?`,
    [todayDay, year, month]
  );
  return row?.projected ?? 0;
}

export async function getMonthDailySummary(
  year: number,
  month: number
): Promise<{ total_allowed: number; total_spent: number; surplus: number }> {
  const db = getDatabase();
  const row = await db.getFirstAsync<{
    total_allowed: number;
    total_spent: number;
  }>(
    `SELECT COALESCE(SUM(allowed_amount), 0) as total_allowed,
            COALESCE(SUM(spent_amount), 0) as total_spent
     FROM daily_tracking WHERE year = ? AND month = ?`,
    [year, month]
  );
  const total_allowed = row?.total_allowed ?? 0;
  const total_spent = row?.total_spent ?? 0;
  return {
    total_allowed,
    total_spent,
    surplus: total_allowed - total_spent,
  };
}
