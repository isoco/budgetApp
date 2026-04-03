import { useEffect } from 'react';
import { useMonthStore } from '../stores/useMonthStore';
import { useSettingsStore } from '../stores/useSettingsStore';

export function useMonthData(year: number, month: number) {
  const { entries, balance, loading, loadMonth, addEntry, editEntry, removeEntry, payEntry, unpayEntry } =
    useMonthStore();
  const { settings } = useSettingsStore();

  useEffect(() => {
    loadMonth(year, month, settings.daily_default_amount);
  }, [year, month]);

  return { entries, balance, loading, addEntry, editEntry, removeEntry, payEntry, unpayEntry };
}
