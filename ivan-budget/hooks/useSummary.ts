import { useMemo } from 'react';
import { BudgetEntry } from '../types';
import { groupEntriesByType, sumEntries } from '../utils/calculations';

export function useSummary(entries: BudgetEntry[]) {
  return useMemo(() => {
    const { income, expense, savings } = groupEntriesByType(entries);

    const totalIncome = sumEntries(income);
    const totalExpenses = sumEntries(expense);
    const totalSavings = sumEntries(savings);
    const balance = totalIncome - totalExpenses - totalSavings;

    const plannedIncome = sumEntries(income, 'planned_amount');
    const plannedExpenses = sumEntries(expense, 'planned_amount');
    const plannedSavings = sumEntries(savings, 'planned_amount');

    const effectiveExpenses = expense.reduce(
      (sum, e) => sum + (e.actual_amount > 0 ? e.actual_amount : e.planned_amount),
      0
    );

    return {
      income,
      expense,
      savings,
      totalIncome,
      totalExpenses,
      totalSavings,
      effectiveExpenses,
      balance,
      plannedIncome,
      plannedExpenses,
      plannedSavings,
      percentSpent: totalIncome > 0 ? Math.round((totalExpenses / totalIncome) * 100) : 0,
    };
  }, [entries]);
}
