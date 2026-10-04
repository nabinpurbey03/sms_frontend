import rawNepaliDate from 'nepali-date-converter';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const NepaliDate: any = (rawNepaliDate as any)?.default || rawNepaliDate;

export const SIMULATED_DATE_STORAGE_KEY = 'ssup_simulated_date';

/**
 * Calculates a shifted Date object by years, months, and days.
 * Pure function: does not mutate baseDate.
 */
export function calculateShiftedDate(
  baseDate: Date,
  shift: { days?: number; months?: number; years?: number }
): Date {
  const next = new Date(baseDate.getTime());
  if (shift.years) next.setFullYear(next.getFullYear() + shift.years);
  if (shift.months) next.setMonth(next.getMonth() + shift.months);
  if (shift.days) next.setDate(next.getDate() + shift.days);
  return next;
}

/**
 * Formats a Date object to YYYY-MM-DD using local calendar date parts.
 */
export function formatDateToIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Converts a Gregorian Date to Bikram Sambat year, month (0-indexed), day, and YYYY-MM-DD string.
 */
export function getBsDateFromGregorian(date: Date): {
  year: number;
  month: number;
  day: number;
  formatted: string;
} {
  const np = new NepaliDate(date);
  return {
    year: np.getYear(),
    month: np.getMonth(),
    day: np.getDate(),
    formatted: np.format('YYYY-MM-DD'),
  };
}

/**
 * Converts Bikram Sambat year, 0-indexed month, and day into a Gregorian Date.
 */
export function getGregorianFromBs(year: number, monthIndex: number, day: number = 1): Date {
  const np = new NepaliDate(year, monthIndex, day);
  return np.toJsDate();
}
