import { useState, useEffect, useCallback } from 'react';
import { DailyTracking } from '../types';
import {
  getMonthDailyTracking,
  initMonthDailyTracking,
  upsertDayTracking,
  getMonthDailySummary,
} from '../database/queries/daily';
import { useSettingsStore } from '../stores/useSettingsStore';

export function useDailyData(year: number, month: number) {
  const [days, setDays] = useState<DailyTracking[]>([]);
  const [summary, setSummary] = useState({ total_allowed: 0, total_spent: 0, surplus: 0 });
  const [loading, setLoading] = useState(false);
  const { settings } = useSettingsStore();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await initMonthDailyTracking(year, month, settings.daily_default_amount);
      const [dayData, summaryData] = await Promise.all([
        getMonthDailyTracking(year, month),
        getMonthDailySummary(year, month),
      ]);
      setDays(dayData);
      setSummary(summaryData);
    } finally {
      setLoading(false);
    }
  }, [year, month, settings.daily_default_amount]);

  useEffect(() => {
    load();
  }, [load]);

  const updateDay = useCallback(
    async (day: number, allowed: number, spent: number, notes: string | null = null) => {
      await upsertDayTracking(year, month, day, allowed, spent, notes);
      await load();
    },
    [year, month, load]
  );

  return { days, summary, loading, updateDay, reload: load };
}
