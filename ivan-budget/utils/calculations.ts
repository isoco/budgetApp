import { BudgetEntry, MonthBalance } from '../types';

export function calculateBalance(
  income: number,
  expenses: number,
  savings: number
): number {
  return income - expenses - savings;
}

export function calculatePercentSpent(
  expenses: number,
  income: number
): number {
  if (income === 0) return 0;
  return Math.round((expenses / income) * 100);
}

export function groupEntriesByType(entries: BudgetEntry[]): {
  income: BudgetEntry[];
  expense: BudgetEntry[];
  savings: BudgetEntry[];
} {
  return {
    income: entries.filter((e) => e.category_type === 'income'),
    expense: entries.filter((e) => e.category_type === 'expense'),
    savings: entries.filter((e) => e.category_type === 'savings'),
  };
}

export function sumEntries(entries: BudgetEntry[], field: 'actual_amount' | 'planned_amount' = 'actual_amount'): number {
  return entries.reduce((sum, e) => sum + e[field], 0);
}

export function calculateDailyStatus(
  totalAllowed: number,
  totalSpent: number,
  currentDay: number
): {
  surplus: number;
  surplusPerDay: number;
  percentUsed: number;
} {
  const surplus = totalAllowed - totalSpent;
  const remainingDays = Math.max(1, totalAllowed / 30 - currentDay);
  return {
    surplus,
    surplusPerDay: surplus / remainingDays,
    percentUsed: totalAllowed > 0 ? Math.round((totalSpent / totalAllowed) * 100) : 0,
  };
}
