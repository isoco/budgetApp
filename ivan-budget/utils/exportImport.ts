import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getDatabase } from '../database';
import { format } from 'date-fns';

export async function exportData(): Promise<void> {
  const db = getDatabase();

  const categories = await db.getAllAsync('SELECT * FROM categories');
  const entries = await db.getAllAsync('SELECT * FROM budget_entries');
  const daily = await db.getAllAsync('SELECT * FROM daily_tracking');
  const fuel = await db.getAllAsync('SELECT * FROM fuel_entries');
  const summary = await db.getAllAsync('SELECT * FROM monthly_summary');

  const exportPayload = {
    version: 1,
    exported_at: new Date().toISOString(),
    data: { categories, entries, daily, fuel, summary },
  };

  const json = JSON.stringify(exportPayload, null, 2);
  const filename = `ivan-budget-export-${format(new Date(), 'yyyy-MM-dd')}.json`;
  const fileUri = `${FileSystem.documentDirectory}${filename}`;

  await FileSystem.writeAsStringAsync(fileUri, json, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'Izvezi podatke',
    });
  }
}

export async function importData(jsonString: string): Promise<void> {
  const db = getDatabase();

  let payload: {
    version: number;
    data: {
      categories: Record<string, unknown>[];
      entries: Record<string, unknown>[];
      daily: Record<string, unknown>[];
      fuel: Record<string, unknown>[];
      summary: Record<string, unknown>[];
    };
  };

  try {
    payload = JSON.parse(jsonString);
  } catch {
    throw new Error('Nevažeći JSON format');
  }

  if (!payload.data) {
    throw new Error('Nevažeća struktura datoteke');
  }

  await db.withTransactionAsync(async () => {
    // Clear existing data (except system categories)
    await db.runAsync('DELETE FROM budget_entries');
    await db.runAsync('DELETE FROM daily_tracking');
    await db.runAsync('DELETE FROM fuel_entries');
    await db.runAsync('DELETE FROM monthly_summary');
    await db.runAsync('DELETE FROM categories WHERE is_system = 0');

    // Import categories
    for (const cat of payload.data.categories) {
      await db.runAsync(
        `INSERT OR IGNORE INTO categories (id, name, name_hr, type, icon, color, is_recurring, default_amount, due_day, is_active, is_system, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cat['id'] as number, cat['name'] as string, cat['name_hr'] as string,
          cat['type'] as string, cat['icon'] as string, cat['color'] as string,
          cat['is_recurring'] as number, cat['default_amount'] as number,
          cat['due_day'] as number | null, cat['is_active'] as number,
          cat['is_system'] as number, cat['created_at'] as string,
        ]
      );
    }

    // Import entries
    for (const entry of payload.data.entries) {
      await db.runAsync(
        `INSERT OR IGNORE INTO budget_entries (id, category_id, year, month, planned_amount, actual_amount, due_date, paid_date, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          entry['id'] as number, entry['category_id'] as number,
          entry['year'] as number, entry['month'] as number,
          entry['planned_amount'] as number, entry['actual_amount'] as number,
          entry['due_date'] as string | null, entry['paid_date'] as string | null,
          entry['notes'] as string | null, entry['created_at'] as string,
        ]
      );
    }

    // Import daily tracking
    for (const day of payload.data.daily) {
      await db.runAsync(
        `INSERT OR IGNORE INTO daily_tracking (id, year, month, day, allowed_amount, spent_amount, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          day['id'] as number, day['year'] as number, day['month'] as number,
          day['day'] as number, day['allowed_amount'] as number,
          day['spent_amount'] as number, day['notes'] as string | null,
        ]
      );
    }

    // Import fuel
    for (const fuel of payload.data.fuel) {
      await db.runAsync(
        `INSERT OR IGNORE INTO fuel_entries (id, year, month, date, vehicle, amount, liters, price_per_liter, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          fuel['id'] as number, fuel['year'] as number, fuel['month'] as number,
          fuel['date'] as string, fuel['vehicle'] as string, fuel['amount'] as number,
          fuel['liters'] as number | null, fuel['price_per_liter'] as number | null,
          fuel['notes'] as string | null, fuel['created_at'] as string,
        ]
      );
    }

    // Import monthly summary
    for (const ms of payload.data.summary) {
      await db.runAsync(
        `INSERT OR IGNORE INTO monthly_summary (id, year, month, fuel_estimated) VALUES (?, ?, ?, ?)`,
        [
          ms['id'] as number, ms['year'] as number,
          ms['month'] as number, ms['fuel_estimated'] as number,
        ]
      );
    }
  });
}
