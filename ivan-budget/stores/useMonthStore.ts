import { create } from 'zustand';
import { BudgetEntry, MonthBalance } from '../types';
import {
  getMonthEntries,
  createEntry,
  updateEntry,
  deleteEntry,
  markEntryPaid,
  markEntryUnpaid,
  autoPopulateMonth,
} from '../database/queries/entries';
import { getMonthBalance } from '../database/queries/summary';
import { getCurrentYearMonth } from '../utils/dateHelpers';

interface MonthState {
  year: number;
  month: number;
  entries: BudgetEntry[];
  balance: MonthBalance | null;
  loading: boolean;
  setMonth: (year: number, month: number) => void;
  loadMonth: (year: number, month: number, dailyAllowance?: number) => Promise<void>;
  addEntry: (data: Omit<BudgetEntry, 'id' | 'created_at' | 'category_name' | 'category_name_hr' | 'category_icon' | 'category_color' | 'category_type'>) => Promise<void>;
  editEntry: (id: number, data: Partial<Pick<BudgetEntry, 'planned_amount' | 'actual_amount' | 'due_date' | 'paid_date' | 'notes'>>) => Promise<void>;
  removeEntry: (id: number) => Promise<void>;
  payEntry: (id: number) => Promise<void>;
  unpayEntry: (id: number) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useMonthStore = create<MonthState>((set, get) => {
  const { year, month } = getCurrentYearMonth();

  return {
    year,
    month,
    entries: [],
    balance: null,
    loading: false,

    setMonth: (year, month) => {
      set({ year, month });
    },

    loadMonth: async (year, month, dailyAllowance = 30) => {
      set({ loading: true, year, month });
      try {
        await autoPopulateMonth(year, month, dailyAllowance);
        const [entries, balance] = await Promise.all([
          getMonthEntries(year, month),
          getMonthBalance(year, month),
        ]);
        set({ entries, balance, loading: false });
      } catch {
        set({ loading: false });
      }
    },

    addEntry: async (data) => {
      await createEntry(data);
      await get().refresh();
    },

    editEntry: async (id, data) => {
      await updateEntry(id, data);
      await get().refresh();
    },

    removeEntry: async (id) => {
      await deleteEntry(id);
      await get().refresh();
    },

    payEntry: async (id) => {
      await markEntryPaid(id);
      await get().refresh();
    },

    unpayEntry: async (id) => {
      await markEntryUnpaid(id);
      await get().refresh();
    },

    refresh: async () => {
      const { year, month } = get();
      const [entries, balance] = await Promise.all([
        getMonthEntries(year, month),
        getMonthBalance(year, month),
      ]);
      set({ entries, balance });
    },
  };
});
