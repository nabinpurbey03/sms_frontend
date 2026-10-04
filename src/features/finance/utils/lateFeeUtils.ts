/**
 * Utility functions for automated late fee calculation, formatting, and penalty display.
 */

export interface LateFeePreviewResult {
  late_fee: number;
  overdue_days: number;
  grace_days: number;
  is_overdue: boolean;
  fee_type: string;
}

/**
 * Computes client-side preview for late fees based on due date, as of date, and school policy.
 */
export function computeLateFeePreview(params: {
  dueDate: string | Date;
  asOfDate?: string | Date;
  dueAmount: number;
  lateFeeEnabled?: boolean;
  graceDays?: number;
  feeType?: string;
  feeAmount?: number;
}): LateFeePreviewResult {
  const {
    dueDate,
    asOfDate = new Date(),
    dueAmount,
    lateFeeEnabled = true,
    graceDays = 7,
    feeType = 'FLAT',
    feeAmount = 0,
  } = params;

  if (!lateFeeEnabled || dueAmount <= 0) {
    return {
      late_fee: 0,
      overdue_days: 0,
      grace_days: graceDays,
      is_overdue: false,
      fee_type: feeType,
    };
  }

  const dDate = new Date(dueDate);
  // Strip time component to compare calendar dates accurately
  const dOnly = new Date(dDate.getFullYear(), dDate.getMonth(), dDate.getDate());

  const aDate = new Date(asOfDate);
  const aOnly = new Date(aDate.getFullYear(), aDate.getMonth(), aDate.getDate());

  const graceCutoff = new Date(dOnly.getTime() + graceDays * 24 * 60 * 60 * 1000);
  const diffMs = aOnly.getTime() - graceCutoff.getTime();
  const overdueDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (overdueDays <= 0) {
    return {
      late_fee: 0,
      overdue_days: 0,
      grace_days: graceDays,
      is_overdue: false,
      fee_type: feeType,
    };
  }

  const type = (feeType || 'FLAT').trim().toUpperCase();
  let fee = 0;

  if (type === 'FLAT') {
    fee = feeAmount;
  } else if (type === 'DAILY') {
    fee = Math.round(overdueDays * feeAmount * 100) / 100;
  } else if (type === 'PERCENT') {
    fee = Math.round(dueAmount * (feeAmount / 100) * 100) / 100;
  }

  return {
    late_fee: fee,
    overdue_days: overdueDays,
    grace_days: graceDays,
    is_overdue: fee > 0,
    fee_type: type,
  };
}

/**
 * Returns formatted banner message as required by spec:
 * "Late Fee: NPR {lateFee} ({overdueDays} days past grace period)"
 */
export function formatLateFeeBanner(lateFee: number | string, overdueDays: number): string {
  const feeNum = Number(lateFee) || 0;
  return `Late Fee: NPR ${feeNum.toFixed(2)} (${overdueDays} days past grace period)`;
}

/**
 * Formats toggle button labels for collecting vs waiving late fee.
 */
export function formatCollectLateFeeLabel(lateFee: number | string): string {
  const feeNum = Number(lateFee) || 0;
  return `Collect Late Fee (NPR ${feeNum.toFixed(2)})`;
}

export function formatWaiveLateFeeLabel(): string {
  return 'Waive Late Fee';
}
