import rawNepaliDate from 'nepali-date-converter';

// Handle CJS/ESM interop across Vite bundler and Node
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const NepaliDate: any = (rawNepaliDate as any)?.default || rawNepaliDate;

/**
 * Utilities for Cashier POS, Monthly Billing, and Receipt Itemization.
 */

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

export type BsMonth = typeof BS_MONTHS[number];

export function getDefaultBillTitle(month: string, sessionName?: string): string {
  const sessionLabel = sessionName || 'Active Session';
  return `${month} Fee Bill (${sessionLabel})`;
}

export interface QuickFillParams {
  dueAmount: number;
  subtotalAmount: number;
  liveDiscountAmt?: number;
}

export interface QuickFillResult {
  netPayable: number;
  currentMonthDue: number;
}

/**
 * Calculates quick-fill payment amounts for the cashier POS dialog:
 * - netPayable: The total remaining balance to fully clear the bill (after discount)
 * - currentMonthDue: The portion of the bill corresponding strictly to the current month's fees,
 *   capped at the remaining netPayable.
 */
export function calculateQuickFillAmounts(params: QuickFillParams): QuickFillResult {
  const due = Math.max(0, Number(params.dueAmount) || 0);
  const discount = Math.max(0, Number(params.liveDiscountAmt) || 0);
  const subtotal = Math.max(0, Number(params.subtotalAmount) || 0);

  const netPayable = Math.max(0, Math.round((due - discount) * 100) / 100);

  // Current month due is subtotal minus applicable discount, but cannot exceed netPayable
  const currentMonthEffective = Math.max(0, Math.round((subtotal - discount) * 100) / 100);
  const currentMonthDue = Math.min(netPayable, currentMonthEffective);

  return {
    netPayable,
    currentMonthDue,
  };
}

/**
 * Sums fee structures for single-month billing (non-quarterly).
 */
export function calculateBaseMonthlyFee(
  structures: Array<{ amount: number | string }>,
  adHocAmount?: number
): number {
  let total = 0;
  for (const s of structures) {
    total += Number(s.amount) || 0;
  }
  if (adHocAmount && adHocAmount > 0) {
    total += Number(adHocAmount);
  }
  return Math.round(total * 100) / 100;
}

/**
 * Calculates net received funds from cashier: cash/digital amount + collected penalty.
 */
export function calculateNetReceived(amountPaid: number | string, lateFeeAmount?: number | string): number {
  const paid = Number(amountPaid) || 0;
  const late = Number(lateFeeAmount) || 0;
  return Math.round((paid + late) * 100) / 100;
}

/**
 * Checks if a fee head item represents carried arrears / prior session dues.
 */
export function isArrearsFeeHead(feeName: string): boolean {
  if (!feeName) return false;
  const lower = feeName.toLowerCase();
  return (
    lower.includes('due amount for') ||
    lower.includes('due amount academic year') ||
    lower.includes('prior dues') ||
    lower.includes('carried arrears')
  );
}

export type MonthGenerationStatus =
  | 'GENERATED'         // Invoiced already -> Faded & Disabled
  | 'AVAILABLE_RUNNING' // Active running month, unbilled -> Highlighted & Selectable
  | 'AVAILABLE_BACKLOG' // Past month that was skipped/unbilled -> Selectable
  | 'FUTURE_LOCKED';    // Month after running month in session -> Faded & Disabled

export interface MonthStatusInfo {
  month: BsMonth;
  index: number;
  status: MonthGenerationStatus;
  isSelectable: boolean;
  badgeLabel: string;
  tooltipText: string;
  description: string;
}

/**
 * Returns the 0-indexed Bikram Sambat month (0 = Baishakh, 11 = Chaitra)
 * for the given Gregorian date (defaults to today).
 */
export function getCurrentBsMonthIndex(asOfDate?: Date | string | null): number {
  if (!asOfDate) {
    return new NepaliDate().getMonth();
  }
  const dateObj = typeof asOfDate === 'string' ? new Date(asOfDate) : asOfDate;
  return new NepaliDate(dateObj).getMonth();
}

/**
 * Computes availability status, selectable flag, badge label, and tooltip description
 * for a Bikram Sambat month given the running month index and previously generated months.
 */
export function computeMonthStatus(
  month: BsMonth,
  runningMonthIndex: number,
  generatedMonths: Set<string>
): MonthStatusInfo {
  const monthIdx = BS_MONTHS.indexOf(month);

  // 1. If generatedMonths.has(month) -> status = 'GENERATED', isSelectable = false, badgeLabel = 'Generated', tooltipText = `${month} invoices have already been generated for this class.`
  if (generatedMonths.has(month)) {
    const tooltipText = `${month} invoices have already been generated for this class.`;
    return {
      month,
      index: monthIdx,
      status: 'GENERATED',
      isSelectable: false,
      badgeLabel: 'Generated',
      tooltipText,
      description: tooltipText,
    };
  }

  // 2. If monthIdx === runningMonthIndex -> status = 'AVAILABLE_RUNNING', isSelectable = true, badgeLabel = 'Current Month', tooltipText = `${month} is the current running cycle.`
  if (monthIdx === runningMonthIndex) {
    const tooltipText = `${month} is the current running cycle.`;
    return {
      month,
      index: monthIdx,
      status: 'AVAILABLE_RUNNING',
      isSelectable: true,
      badgeLabel: 'Current Month',
      tooltipText,
      description: tooltipText,
    };
  }

  // 3. If monthIdx < runningMonthIndex -> status = 'AVAILABLE_BACKLOG', isSelectable = true, badgeLabel = 'Unbilled Past', tooltipText = `${month} was not generated yet and can be billed now.`
  if (monthIdx < runningMonthIndex) {
    const tooltipText = `${month} was not generated yet and can be billed now.`;
    return {
      month,
      index: monthIdx,
      status: 'AVAILABLE_BACKLOG',
      isSelectable: true,
      badgeLabel: 'Unbilled Past',
      tooltipText,
      description: tooltipText,
    };
  }

  // 4. If monthIdx > runningMonthIndex -> status = 'FUTURE_LOCKED', isSelectable = false, badgeLabel = 'Upcoming', tooltipText = `${month} is an upcoming month in this academic session.`
  const tooltipText = `${month} is an upcoming month in this academic session.`;
  return {
    month,
    index: monthIdx,
    status: 'FUTURE_LOCKED',
    isSelectable: false,
    badgeLabel: 'Upcoming',
    tooltipText,
    description: tooltipText,
  };
}

/**
 * Formats full currency with commas and 2 decimal places using en-IN locale.
 */
export function formatCurrency(
  amount: number | string,
  prefix: string = 'NPR '
): string {
  const num = Number(amount || 0);
  return `${prefix}${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Formats a numeric value into a compact human-readable string:
 * - >= 1,000,000,000: B (e.g. 1.25B)
 * - >= 1,000,000: M (e.g. 1.25M, 1M)
 * - >= 1,000: K (e.g. 12.5K, 450K, 1K)
 * - < 1,000: standard number formatted with en-IN locale
 */
export function formatCompactNumber(amount: number | string): string {
  const num = Number(amount);
  if (isNaN(num) || num === 0) return '0';

  const isNegative = num < 0;
  const abs = Math.abs(num);

  let formatted: string;
  if (abs >= 1_000_000_000) {
    formatted = parseFloat((abs / 1_000_000_000).toFixed(2)) + 'B';
  } else if (abs >= 1_000_000) {
    formatted = parseFloat((abs / 1_000_000).toFixed(2)) + 'M';
  } else if (abs >= 1_000) {
    formatted = parseFloat((abs / 1_000).toFixed(1)) + 'K';
  } else {
    formatted = abs.toLocaleString('en-IN', {
      maximumFractionDigits: 2,
    });
  }

  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Formats a monetary amount into compact currency notation with K for thousand
 * and M for million (e.g. 'NPR 12.5K', 'NPR 1.25M').
 */
export function formatCompactCurrency(
  amount: number | string,
  prefix: string = 'NPR '
): string {
  const num = Number(amount);
  if (isNaN(num) || num === 0) {
    return `${prefix}0`;
  }
  const isNegative = num < 0;
  const compact = formatCompactNumber(Math.abs(num));
  return isNegative ? `-${prefix}${compact}` : `${prefix}${compact}`;
}

/**
 * Converts a monetary number to English words in South Asian numbering (Rupees ... Only).
 */
export function numberToWords(amount: number | string): string {
  try {
    const num = Math.round(Math.abs(Number(amount) || 0));
    if (num === 0) {
      return 'Zero Rupees Only';
    }

    const units = [
      '',
      'One',
      'Two',
      'Three',
      'Four',
      'Five',
      'Six',
      'Seven',
      'Eight',
      'Nine',
      'Ten',
      'Eleven',
      'Twelve',
      'Thirteen',
      'Fourteen',
      'Fifteen',
      'Sixteen',
      'Seventeen',
      'Eighteen',
      'Nineteen',
    ];
    const tens = [
      '',
      '',
      'Twenty',
      'Thirty',
      'Forty',
      'Fifty',
      'Sixty',
      'Seventy',
      'Eighty',
      'Ninety',
    ];

    function convertBelowThousand(n: number): string {
      let res = '';
      if (n >= 100) {
        res += units[Math.floor(n / 100)] + ' Hundred ';
        n %= 100;
      }
      if (n >= 20) {
        res += tens[Math.floor(n / 10)] + ' ';
        n %= 10;
      }
      if (n > 0) {
        res += units[n] + ' ';
      }
      return res.trim();
    }

    let intVal = num;
    const parts: string[] = [];

    const crore = Math.floor(intVal / 10000000);
    intVal %= 10000000;
    const lakh = Math.floor(intVal / 100000);
    intVal %= 100000;
    const thousand = Math.floor(intVal / 1000);
    const remainder = intVal % 1000;

    if (crore > 0) {
      parts.push(convertBelowThousand(crore) + ' Crore');
    }
    if (lakh > 0) {
      parts.push(convertBelowThousand(lakh) + ' Lakh');
    }
    if (thousand > 0) {
      parts.push(convertBelowThousand(thousand) + ' Thousand');
    }
    if (remainder > 0) {
      parts.push(convertBelowThousand(remainder));
    }

    return parts.join(' ').trim() + ' Rupees Only';
  } catch {
    return `${amount} Rupees Only`;
  }
}
