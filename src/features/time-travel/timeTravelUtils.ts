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

export const BS_MONTHS = [
  'Baishakh',
  'Jestha',
  'Ashadh',
  'Shrawan',
  'Bhadra',
  'Ashwin',
  'Kartik',
  'Mangsir',
  'Poush',
  'Magh',
  'Falgun',
  'Chaitra',
] as const;

export type BsMonth = (typeof BS_MONTHS)[number];

/**
 * Determines whether the Time-Travel sticky warning banner should be rendered.
 * Strictly checks: VITE_ENABLE_TIME_TRAVEL === 'true' && user.is_super_admin === true && isSimulated === true.
 */
export function shouldRenderTimeTravelBanner(params: {
  isEnabled: boolean | string | undefined;
  isSuperAdmin: boolean | undefined;
  isSimulated: boolean;
}): boolean {
  const enabled = params.isEnabled === true || params.isEnabled === 'true';
  return enabled && Boolean(params.isSuperAdmin) && Boolean(params.isSimulated);
}

/**
 * Determines whether the Time-Travel floating toolbar should be rendered.
 * Strictly checks: VITE_ENABLE_TIME_TRAVEL === 'true' && user.is_super_admin === true.
 */
export function shouldRenderTimeTravelToolbar(params: {
  isEnabled: boolean | string | undefined;
  isSuperAdmin: boolean | undefined;
}): boolean {
  const enabled = params.isEnabled === true || params.isEnabled === 'true';
  return enabled && Boolean(params.isSuperAdmin);
}

/**
 * Formats sticky banner alert text strictly matching specification:
 * "Time Travel Active: System simulated as [BS Date] ([AD Date]). Real server time is unaffected."
 */
export function formatTimeTravelBannerText(effectiveDate: Date): string {
  const bs = getBsDateFromGregorian(effectiveDate);
  const adDate = formatDateToIso(effectiveDate);
  return `Time Travel Active: System simulated as ${BS_MONTHS[bs.month]} ${bs.day}, ${bs.year} (${adDate}). Real server time is unaffected.`;
}

/**
 * Formats the collapsed pill button label for the Time-Travel toolbar:
 * Muted 'Live Time' when real clock is active; 'Simulated: [BS Month DD]' when time travel is active.
 */
export function formatToolbarPillLabel(params: {
  isSimulated: boolean;
  effectiveDate: Date;
}): string {
  if (!params.isSimulated) {
    return 'Live Time';
  }
  const bs = getBsDateFromGregorian(params.effectiveDate);
  const dd = String(bs.day).padStart(2, '0');
  return `Simulated: ${BS_MONTHS[bs.month]} ${dd}`;
}

