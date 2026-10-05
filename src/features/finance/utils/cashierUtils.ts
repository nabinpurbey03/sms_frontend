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

export type MonthStatus =
  | 'GENERATED'
  | 'AVAILABLE_RUNNING'
  | 'AVAILABLE_NEXT'
  | 'LOCKED_SEQUENCE'
  | 'LOCKED_PAST'
  | 'FUTURE_LOCKED'
  | 'AVAILABLE_BACKLOG'; // Transitional compatibility for BatchBillingPage until Task 3

// Legacy alias for backward compatibility
export type MonthGenerationStatus = MonthStatus;

export interface MonthStatusInfo {
  month: BsMonth;
  index: number;
  status: MonthStatus;
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
 * Returns the single next required month in chronological sequence (Baishakh -> Chaitra)
 * that is unbilled and not beyond the running month, or null if all months up through
 * the running month are already generated.
 */
export function getNextSequentialMonth(
  runningMonthIndex: number,
  generatedMonths: Set<string>
): BsMonth | null {
  for (let i = 0; i <= runningMonthIndex; i++) {
    const m = BS_MONTHS[i];
    if (!generatedMonths.has(m)) {
      return m;
    }
  }
  return null;
}

/**
 * Computes availability status, selectable flag, badge label, and tooltip description
 * for a Bikram Sambat month given the running month index and previously generated months.
 * Enforces strict chronological billing sequence (Baishakh -> Chaitra):
 * 1. Generated months are marked GENERATED (not selectable).
 * 2. Unbilled months preceding an already generated month are marked LOCKED_PAST (cannot back-bill).
 * 3. Unbilled months waiting on an unbilled predecessor are marked LOCKED_SEQUENCE (sequential queue).
 * 4. The single first ungenerated month is:
 *    - AVAILABLE_RUNNING if it matches the current running month.
 *    - AVAILABLE_NEXT if it is before the current running month.
 *    - FUTURE_LOCKED if it is ahead of the current running month.
 */
export function computeMonthStatus(
  month: BsMonth,
  runningMonthIndex: number,
  generatedMonths: Set<string>
): MonthStatusInfo {
  const monthIdx = BS_MONTHS.indexOf(month);

  // 1. If already generated -> GENERATED
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

  // 2. If any subsequent month has already been generated -> LOCKED_PAST (out-of-order back-billing block)
  const hasSubsequentGenerated = BS_MONTHS.slice(monthIdx + 1).some((m) => generatedMonths.has(m));
  if (hasSubsequentGenerated) {
    const tooltipText = `Cannot bill ${month} because subsequent invoices have already been generated for this class.`;
    return {
      month,
      index: monthIdx,
      status: 'LOCKED_PAST',
      isSelectable: false,
      badgeLabel: 'Locked (Past)',
      tooltipText,
      description: tooltipText,
    };
  }

  // 3. If month is beyond running month -> FUTURE_LOCKED
  if (monthIdx > runningMonthIndex) {
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

  // 4. Identify the first ungenerated month in the calendar
  let firstUngeneratedIdx = -1;
  for (let i = 0; i < BS_MONTHS.length; i++) {
    if (!generatedMonths.has(BS_MONTHS[i])) {
      firstUngeneratedIdx = i;
      break;
    }
  }

  // If this month is NOT the first ungenerated month, it is blocked by an unbilled predecessor -> LOCKED_SEQUENCE
  if (monthIdx > firstUngeneratedIdx) {
    const missingPredecessor = BS_MONTHS[firstUngeneratedIdx];
    const tooltipText = `Sequential billing required. Please generate ${missingPredecessor} first.`;
    return {
      month,
      index: monthIdx,
      status: 'LOCKED_SEQUENCE',
      isSelectable: false,
      badgeLabel: 'Sequence Locked',
      tooltipText,
      description: tooltipText,
    };
  }

  // 5. This month IS the first ungenerated month:
  // If it matches the running month -> AVAILABLE_RUNNING
  if (monthIdx === runningMonthIndex) {
    const tooltipText = `${month} is the current running cycle and ready for generation.`;
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

  // If it's before running month -> AVAILABLE_NEXT
  const tooltipText = `${month} is the next required month to bill in chronological sequence.`;
  return {
    month,
    index: monthIdx,
    status: 'AVAILABLE_NEXT',
    isSelectable: true,
    badgeLabel: 'Next to Bill',
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

export interface CancelBillEligibility {
  canCancel: boolean;
  reason?: string;
}

/**
 * Validates whether a fee bill can be cancelled according to domain rules:
 * 1. User must have administrative / management permissions.
 * 2. Bill cannot already be CANCELLED.
 * 3. Bill cannot have recorded payments (paid_amount > 0). If payments exist, receipts must be voided/refunded first.
 */
export function getCancelBillEligibility(
  bill: { status?: string; paid_amount?: number | string } | null | undefined,
  userCanManage: boolean
): CancelBillEligibility {
  if (!bill) {
    return { canCancel: false, reason: 'No bill selected' };
  }
  if (!userCanManage) {
    return { canCancel: false, reason: 'You do not have permission to cancel bills' };
  }
  if (bill.status?.toUpperCase() === 'CANCELLED') {
    return { canCancel: false, reason: 'Bill is already cancelled' };
  }
  const paid = Math.max(0, Number(bill.paid_amount || 0));
  if (paid > 0) {
    return {
      canCancel: false,
      reason: `Cannot cancel bill with recorded payments (NPR ${paid.toFixed(2)} paid). Void receipts before cancelling.`,
    };
  }
  return { canCancel: true };
}

export interface AccountBalanceSummary {
  currentInvoiceDue: number;
  priorUnpaidTotal: number;
  totalAccountDue: number;
}

/**
 * Calculates cumulative student account balance by summing current invoice due amount
 * with all itemized prior unpaid monthly dues.
 */
export function calculateTotalAccountBalance(
  dueAmount: number | string,
  priorUnpaidMonths?: Array<{ due_amount: number | string }> | null
): AccountBalanceSummary {
  const currentInvoiceDue = Math.max(0, Number(dueAmount) || 0);
  const priorUnpaidTotal = (priorUnpaidMonths || []).reduce((sum, item) => {
    return sum + Math.max(0, Number(item?.due_amount) || 0);
  }, 0);
  const totalAccountDue = Math.round((currentInvoiceDue + priorUnpaidTotal) * 100) / 100;

  return {
    currentInvoiceDue,
    priorUnpaidTotal: Math.round(priorUnpaidTotal * 100) / 100,
    totalAccountDue,
  };
}
