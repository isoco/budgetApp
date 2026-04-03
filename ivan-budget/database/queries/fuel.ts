import { getDatabase } from '../index';
import { FuelEntry, MonthlySummary } from '../../types';

export async function getMonthFuelEntries(
  year: number,
  month: number
): Promise<FuelEntry[]> {
  const db = getDatabase();
  return db.getAllAsync<FuelEntry>(
    'SELECT * FROM fuel_entries WHERE year = ? AND month = ? ORDER BY date DESC',
    [year, month]
  );
}

export async function createFuelEntry(
  data: Omit<FuelEntry, 'id' | 'created_at'>
): Promise<number> {
  const db = getDatabase();
  const result = await db.runAsync(
    `INSERT INTO fuel_entries (year, month, date, vehicle, amount, liters, price_per_liter, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.year,
      data.month,
      data.date,
      data.vehicle,
      data.amount,
      data.liters,
      data.price_per_liter,
      data.notes,
    ]
  );
  return result.lastInsertRowId;
}

export async function updateFuelEntry(
  id: number,
  data: Partial<Omit<FuelEntry, 'id' | 'created_at'>>
): Promise<void> {
  const db = getDatabase();
  const fields = Object.keys(data).map((k) => `${k} = ?`).join(', ');
  const values = [...Object.values(data), id];
  await db.runAsync(
    `UPDATE fuel_entries SET ${fields} WHERE id = ?`,
    values
  );
}

export async function deleteFuelEntry(id: number): Promise<void> {
  const db = getDatabase();
  await db.runAsync('DELETE FROM fuel_entries WHERE id = ?', [id]);
}

export async function getMonthFuelTotal(
  year: number,
  month: number
): Promise<number> {
  const db = getDatabase();
  const row = await db.getFirstAsync<{ total: number }>(
    'SELECT COALESCE(SUM(amount), 0) as total FROM fuel_entries WHERE year = ? AND month = ?',
    [year, month]
  );
  return row?.total ?? 0;
}

export async function getMonthlySummary(
  year: number,
  month: number
): Promise<MonthlySummary | null> {
  const db = getDatabase();
  return db.getFirstAsync<MonthlySummary>(
    'SELECT * FROM monthly_summary WHERE year = ? AND month = ?',
    [year, month]
  );
}

export async function upsertMonthlySummary(
  year: number,
  month: number,
  fuel_estimated: number
): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    `INSERT INTO monthly_summary (year, month, fuel_estimated)
     VALUES (?, ?, ?)
     ON CONFLICT(year, month) DO UPDATE SET fuel_estimated = excluded.fuel_estimated`,
    [year, month, fuel_estimated]
  );
}
