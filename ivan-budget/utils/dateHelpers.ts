import { format, parseISO, differenceInDays, isAfter, isBefore, startOfDay } from 'date-fns';
import { MONTHS_HR, MONTHS_HR_SHORT } from '../constants/months';

export function getMonthName(month: number): string {
  return MONTHS_HR[month - 1] ?? '';
}

export function getMonthNameShort(month: number): string {
  return MONTHS_HR_SHORT[month - 1] ?? '';
}

export function formatDateHR(dateString: string): string {
  const date = parseISO(dateString);
  return format(date, 'dd.MM.yyyy');
}

export function formatDateShortHR(dateString: string): string {
  const date = parseISO(dateString);
  return format(date, 'dd.MM.');
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function getMonthLabel(year: number, month: number): string {
  return `${getMonthName(month)} ${year}`;
}

export function getDueStatus(
  dueDate: string | null,
  paidDate: string | null
): 'paid' | 'overdue' | 'due-soon' | 'upcoming' | 'none' {
  if (!dueDate) return 'none';
  if (paidDate) return 'paid';

  const today = startOfDay(new Date());
  const due = startOfDay(parseISO(dueDate));
  const daysUntilDue = differenceInDays(due, today);

  if (daysUntilDue < 0) return 'overdue';
  if (daysUntilDue <= 3) return 'due-soon';
  return 'upcoming';
}

export function buildDueDate(
  year: number,
  month: number,
  day: number
): string {
  const daysInMonth = getDaysInMonth(year, month);
  const actualDay = Math.min(day, daysInMonth);
  return `${year}-${String(month).padStart(2, '0')}-${String(actualDay).padStart(2, '0')}`;
}

export function getCurrentYearMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function isoNow(): string {
  return format(new Date(), 'yyyy-MM-dd');
}
