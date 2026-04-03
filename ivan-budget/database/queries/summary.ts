import { getDatabase } from '../index';
import { MonthBalance } from '../../types';

export async function getMonthBalance(
  year: number,
  month: number
): Promise<MonthBalance> {
  const db = getDatabase();

  const rows = await db.getAllAsync<{ type: string; total: number }>(
    `SELECT c.type, COALESCE(SUM(be.actual_amount), 0) as total
     FROM budget_entries be
     JOIN categories c ON be.category_id = c.id
     WHERE be.year = ? AND be.month = ?
     GROUP BY c.type`,
    [year, month]
  );

  let total_income = 0;
  let total_expenses = 0;
  let total_savings = 0;

  for (const row of rows) {
    if (row.type === 'income') total_income = row.total;
    else if (row.type === 'expense') total_expenses = row.total;
    else if (row.type === 'savings') total_savings = row.total;
  }

  return {
    year,
    month,
    total_income,
    total_expenses,
    total_savings,
    balance: total_income - total_expenses - total_savings,
  };
}

export async function getYearlyBalances(year: number): Promise<MonthBalance[]> {
  const db = getDatabase();

  const rows = await db.getAllAsync<{
    month: number;
    type: string;
    total: number;
  }>(
    `SELECT be.month, c.type, COALESCE(SUM(be.actual_amount), 0) as total
     FROM budget_entries be
     JOIN categories c ON be.category_id = c.id
     WHERE be.year = ?
     GROUP BY be.month, c.type
     ORDER BY be.month`,
    [year]
  );

  const balanceMap: Record<number, MonthBalance> = {};

  for (const row of rows) {
    if (!balanceMap[row.month]) {
      balanceMap[row.month] = {
        year,
        month: row.month,
        total_income: 0,
        total_expenses: 0,
        total_savings: 0,
        balance: 0,
      };
    }
    if (row.type === 'income') balanceMap[row.month].total_income = row.total;
    else if (row.type === 'expense') balanceMap[row.month].total_expenses = row.total;
    else if (row.type === 'savings') balanceMap[row.month].total_savings = row.total;
  }

  // Recalculate balances
  for (const mb of Object.values(balanceMap)) {
    mb.balance = mb.total_income - mb.total_expenses - mb.total_savings;
  }

  return Object.values(balanceMap).sort((a, b) => a.month - b.month);
}

export async function getMonthPlannedBalance(
  year: number,
  month: number
): Promise<{ planned_income: number; planned_expenses: number; planned_savings: number; planned_balance: number }> {
  const db = getDatabase();

  const rows = await db.getAllAsync<{ type: string; total: number }>(
    `SELECT c.type, COALESCE(SUM(be.planned_amount), 0) as total
     FROM budget_entries be
     JOIN categories c ON be.category_id = c.id
     WHERE be.year = ? AND be.month = ?
     GROUP BY c.type`,
    [year, month]
  );

  let planned_income = 0;
  let planned_expenses = 0;
  let planned_savings = 0;

  for (const row of rows) {
    if (row.type === 'income') planned_income = row.total;
    else if (row.type === 'expense') planned_expenses = row.total;
    else if (row.type === 'savings') planned_savings = row.total;
  }

  return {
    planned_income,
    planned_expenses,
    planned_savings,
    planned_balance: planned_income - planned_expenses - planned_savings,
  };
}

export async function getMonthTotalsByType(
  year: number,
  month: number,
  type: string
): Promise<{ planned: number; actual: number }> {
  const db = getDatabase();
  const row = await db.getFirstAsync<{ planned: number; actual: number }>(
    `SELECT COALESCE(SUM(be.planned_amount), 0) as planned,
            COALESCE(SUM(be.actual_amount), 0) as actual
     FROM budget_entries be
     JOIN categories c ON be.category_id = c.id
     WHERE be.year = ? AND be.month = ? AND c.type = ?`,
    [year, month, type]
  );
  return row ?? { planned: 0, actual: 0 };
}
