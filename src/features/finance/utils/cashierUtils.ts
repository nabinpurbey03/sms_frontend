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
