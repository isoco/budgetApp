import { useMemo } from 'react';
import { BudgetEntry } from '../types';
import { groupEntriesByType, sumEntries } from '../utils/calculations';

export function useSummary(entries: BudgetEntry[]) {
  return useMemo(() => {
    const { income, expense, savings } = groupEntriesByType(entries);

    // Only income entries that have been received (paid_date set) count toward current saldo
    const receivedIncome = income.filter((e) => !!e.paid_date);
    const totalIncome = sumEntries(receivedIncome);

    // All income planned (received + expected) — used for projections
    const expectedIncome = sumEntries(income, 'planned_amount');

    const totalExpenses = sumEntries(expense);
    const totalSavings = sumEntries(savings);
    const balance = totalIncome - totalExpenses - totalSavings;

    const effectiveExpenses = expense.reduce(
      (sum, e) => sum + (e.actual_amount > 0 ? e.actual_amount : e.planned_amount),
      0
    );

    const plannedExpenses = sumEntries(expense, 'planned_amount');
    const plannedSavings = sumEntries(savings, 'planned_amount');

    return {
      income,
      expense,
      savings,
      totalIncome,
      expectedIncome,
      totalExpenses,
      totalSavings,
      effectiveExpenses,
      balance,
      plannedExpenses,
      plannedSavings,
      percentSpent: totalIncome > 0 ? Math.round((totalExpenses / totalIncome) * 100) : 0,
    };
  }, [entries]);
}
