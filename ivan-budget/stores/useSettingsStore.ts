import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings } from '../types';

const SETTINGS_KEY = '@ivan-budget/settings';

const DEFAULT_SETTINGS: AppSettings = {
  currency: 'EUR',
  language: 'hr',
  daily_default_amount: 4,
  fuel_monthly_estimate: 30,
  dark_mode: false,
};

interface SettingsState {
  settings: AppSettings;
  loaded: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,

  loadSettings: async () => {
    try {
      const raw = await AsyncStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<AppSettings>;
        set({ settings: { ...DEFAULT_SETTINGS, ...saved }, loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  updateSettings: async (partial) => {
    const current = get().settings;
    const next = { ...current, ...partial };
    set({ settings: next });
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  },

  resetSettings: async () => {
    set({ settings: DEFAULT_SETTINGS });
    await AsyncStorage.removeItem(SETTINGS_KEY);
  },
}));
