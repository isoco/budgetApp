export type CategoryType = 'income' | 'expense' | 'savings';

export interface Category {
  id: number;
  name: string;
  name_hr: string;
  type: CategoryType;
  icon: string;
  color: string;
  is_recurring: number; // 0 | 1
  default_amount: number;
  due_day: number | null;
  is_active: number; // 0 | 1
  is_system: number; // 0 | 1
  created_at: string;
}

export interface BudgetEntry {
  id: number;
  category_id: number;
  year: number;
  month: number;
  planned_amount: number;
  actual_amount: number;
  due_date: string | null;
  paid_date: string | null;
  notes: string | null;
  created_at: string;
  // Joined fields
  category_name?: string;
  category_name_hr?: string;
  category_icon?: string;
  category_color?: string;
  category_type?: CategoryType;
  category_is_recurring?: number;
}

export interface DailyTracking {
  id: number;
  year: number;
  month: number;
  day: number;
  allowed_amount: number;
  spent_amount: number;
  notes: string | null;
}

export interface FuelEntry {
  id: number;
  year: number;
  month: number;
  date: string;
  vehicle: string;
  amount: number;
  liters: number | null;
  price_per_liter: number | null;
  notes: string | null;
  created_at: string;
}

export interface MonthlySummary {
  id: number;
  year: number;
  month: number;
  fuel_estimated: number;
}

export interface MonthBalance {
  year: number;
  month: number;
  total_income: number;
  total_expenses: number;
  total_savings: number;
  balance: number;
}

export interface AppSettings {
  currency: 'EUR';
  language: 'hr' | 'en';
  daily_default_amount: number;
  fuel_monthly_estimate: number;
  dark_mode: boolean;
}

export interface AddEntryForm {
  category_id: number;
  planned_amount: number;
  actual_amount: number;
  due_date?: string;
  notes?: string;
}

export interface AddFuelForm {
  date: string;
  vehicle: string;
  amount: number;
  liters?: number;
  price_per_liter?: number;
  notes?: string;
}

export interface AddDailyForm {
  allowed_amount: number;
  spent_amount: number;
  notes?: string;
}
