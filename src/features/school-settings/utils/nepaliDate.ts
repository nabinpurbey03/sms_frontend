import rawNepaliDate from 'nepali-date-converter';

// Handle CJS/ESM interop across Vite bundler and Node
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const NepaliDate: any = (rawNepaliDate as any)?.default || rawNepaliDate;

export interface NepaliMonthOption {
  index: number; // 0 to 11
  nameEn: string;
  nameNp: string;
}

export const NEPALI_MONTHS: NepaliMonthOption[] = [
  { index: 0, nameEn: 'Baisakh', nameNp: 'वैशाख' },
  { index: 1, nameEn: 'Jestha', nameNp: 'जेठ' },
  { index: 2, nameEn: 'Asar', nameNp: 'असार' },
  { index: 3, nameEn: 'Shrawan', nameNp: 'साउन' },
  { index: 4, nameEn: 'Bhadra', nameNp: 'भदौ' },
  { index: 5, nameEn: 'Ashwin', nameNp: 'असोज' },
  { index: 6, nameEn: 'Kartik', nameNp: 'कात्तिक' },
  { index: 7, nameEn: 'Mangsir', nameNp: 'मंसिर' },
  { index: 8, nameEn: 'Poush', nameNp: 'पुस' },
  { index: 9, nameEn: 'Magh', nameNp: 'माघ' },
  { index: 10, nameEn: 'Falgun', nameNp: 'फागुन' },
  { index: 11, nameEn: 'Chaitra', nameNp: 'चैत' },
];

export const NEPALI_DAYS_OF_WEEK = [
  { index: 0, short: 'Sun', nepaliShort: 'आइत' },
  { index: 1, short: 'Mon', nepaliShort: 'सोम' },
  { index: 2, short: 'Tue', nepaliShort: 'मङ्गल' },
  { index: 3, short: 'Wed', nepaliShort: 'बुध' },
  { index: 4, short: 'Thu', nepaliShort: 'बिही' },
  { index: 5, short: 'Fri', nepaliShort: 'शुक्र' },
  { index: 6, short: 'Sat', nepaliShort: 'शनि' },
];

const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * Converts Gregorian YYYY-MM-DD string to Bikram Sambat YYYY-MM-DD string
 */
export function adToBs(adDateStr: string): string {
  try {
    if (!adDateStr) return '';
    const [y, m, d] = adDateStr.split('-').map(Number);
    if (!y || !m || !d) return '';
    const bs = new NepaliDate(new Date(y, m - 1, d));
    return `${bs.getYear()}-${pad(bs.getMonth() + 1)}-${pad(bs.getDate())}`;
  } catch {
    return '';
  }
}

/**
 * Converts Bikram Sambat YYYY-MM-DD string to Gregorian YYYY-MM-DD string
 */
export function bsToAd(bsDateStr: string): string {
  try {
    if (!bsDateStr) return '';
    const [y, m, d] = bsDateStr.split('-').map(Number);
    if (!y || !m || !d) return '';
    const np = new NepaliDate(y, m - 1, d);
    const ad: Date = np.toJsDate();
    return `${ad.getFullYear()}-${pad(ad.getMonth() + 1)}-${pad(ad.getDate())}`;
  } catch {
    return '';
  }
}

/**
 * Get Nepali date info from Gregorian YYYY-MM-DD or Date
 */
export function getNepaliDateFromAd(adDate: string | Date): {
  year: number;
  month: number;
  date: number;
  day: number;
  monthNameEn: string;
  monthNameNp: string;
} | null {
  try {
    let jsDate: Date;
    if (typeof adDate === 'string') {
      const [y, m, d] = adDate.split('-').map(Number);
      if (!y || !m || !d) return null;
      jsDate = new Date(y, m - 1, d);
    } else {
      jsDate = adDate;
    }

    const np = new NepaliDate(jsDate);
    const monthIdx = np.getMonth();
    return {
      year: np.getYear(),
      month: monthIdx,
      date: np.getDate(),
      day: np.getDay(),
      monthNameEn: NEPALI_MONTHS[monthIdx]?.nameEn || 'Ashwin',
      monthNameNp: NEPALI_MONTHS[monthIdx]?.nameNp || 'असोज',
    };
  } catch {
    return null;
  }
}

/**
 * Returns number of days in a given BS month
 */
export function getBsDaysInMonth(year: number, monthIndex: number): number {
  try {
    // nepali-date-converter provides days count by probing month boundaries
    for (let day = 32; day >= 29; day--) {
      try {
        const test = new NepaliDate(year, monthIndex, day);
        if (test.getMonth() === monthIndex) {
          return day;
        }
      } catch {
        continue;
      }
    }
    return 30;
  } catch {
    return 30;
  }
}

/**
 * Returns day of week (0=Sunday ... 6=Saturday) for the 1st of a BS month
 */
export function getBsMonthStartDayOfWeek(year: number, monthIndex: number): number {
  try {
    const firstDay = new NepaliDate(year, monthIndex, 1);
    return firstDay.getDay();
  } catch {
    return 0;
  }
}

/**
 * Formats a single Gregorian date into dual calendar display
 * When primary is 'BS': "Ashwin 15, 2082 (Oct 1, 2025)"
 * When primary is 'AD': "Oct 1, 2025 (Ashwin 15, 2082 BS)"
 */
export function formatDualDate(adDateStr: string, primary: 'BS' | 'AD' = 'BS'): string {
  if (!adDateStr) return '';
  try {
    const [y, m, d] = adDateStr.split('-').map(Number);
    if (!y || !m || !d) return adDateStr;
    const adDate = new Date(y, m - 1, d);
    const npInfo = getNepaliDateFromAd(adDate);
    if (!npInfo) return adDateStr;

    const bsFormatted = `${npInfo.monthNameEn} ${npInfo.date}, ${npInfo.year}`;
    const adFormatted = adDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    if (primary === 'AD') {
      return `${adFormatted} (${bsFormatted} BS)`;
    }
    return `${bsFormatted} (${adFormatted})`;
  } catch {
    return adDateStr;
  }
}

/**
 * Formats a date range into dual calendar display
 * When primary is 'BS': "Ashwin 15–19, 2082 (Oct 1–5, 2025)"
 * When primary is 'AD': "Oct 1–5, 2025 (Ashwin 15–19, 2082 BS)"
 */
export function formatDualDateRange(
  startAdStr: string,
  endAdStr: string,
  primary: 'BS' | 'AD' = 'BS'
): string {
  if (!startAdStr) return '';
  if (!endAdStr || startAdStr === endAdStr) {
    return formatDualDate(startAdStr, primary);
  }

  try {
    const [sy, sm, sd] = startAdStr.split('-').map(Number);
    const [ey, em, ed] = endAdStr.split('-').map(Number);
    const startDate = new Date(sy, sm - 1, sd);
    const endDate = new Date(ey, em - 1, ed);

    const startNp = getNepaliDateFromAd(startDate);
    const endNp = getNepaliDateFromAd(endDate);

    if (!startNp || !endNp) {
      return `${startAdStr} to ${endAdStr}`;
    }

    let bsText = '';
    if (startNp.year === endNp.year) {
      if (startNp.month === endNp.month) {
        bsText = `${startNp.monthNameEn} ${startNp.date}–${endNp.date}, ${startNp.year}`;
      } else {
        bsText = `${startNp.monthNameEn} ${startNp.date} – ${endNp.monthNameEn} ${endNp.date}, ${startNp.year}`;
      }
    } else {
      bsText = `${startNp.monthNameEn} ${startNp.date}, ${startNp.year} – ${endNp.monthNameEn} ${endNp.date}, ${endNp.year}`;
    }

    let adText = '';
    const startAdMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
    const endAdMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
    if (sy === ey) {
      if (sm === em) {
        adText = `${startAdMonth} ${sd}–${ed}, ${sy}`;
      } else {
        adText = `${startAdMonth} ${sd} – ${endAdMonth} ${ed}, ${sy}`;
      }
    } else {
      adText = `${startAdMonth} ${sd}, ${sy} – ${endAdMonth} ${ed}, ${ey}`;
    }

    if (primary === 'AD') {
      return `${adText} (${bsText} BS)`;
    }
    return `${bsText} (${adText})`;
  } catch {
    return `${startAdStr} to ${endAdStr}`;
  }
}

/**
 * Returns the Gregorian start and end date strings (YYYY-MM-DD) for a BS month
 */
export function getBsMonthDateRangeAd(
  year: number,
  monthIndex: number
): { startAd: string; endAd: string } {
  const days = getBsDaysInMonth(year, monthIndex);
  const startAd = bsToAd(`${year}-${pad(monthIndex + 1)}-01`);
  const endAd = bsToAd(`${year}-${pad(monthIndex + 1)}-${pad(days)}`);
  return { startAd, endAd };
}

/**
 * Checks if a given BS month overlaps with an academic session's [minDate, maxDate]
 */
export function isBsMonthWithinBounds(
  year: number,
  monthIndex: number,
  minDate?: string,
  maxDate?: string
): boolean {
  const { startAd, endAd } = getBsMonthDateRangeAd(year, monthIndex);
  if (minDate && endAd < minDate) return false;
  if (maxDate && startAd > maxDate) return false;
  return true;
}

/**
 * Checks if a single AD date string falls inside the active academic session
 */
export function isAdDateWithinSession(
  adDateStr: string,
  minDate?: string,
  maxDate?: string
): boolean {
  if (minDate && adDateStr < minDate) return false;
  if (maxDate && adDateStr > maxDate) return false;
  return true;
}
