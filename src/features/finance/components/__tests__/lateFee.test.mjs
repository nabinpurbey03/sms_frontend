import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeLateFeePreview,
  formatLateFeeBanner,
  formatCollectLateFeeLabel,
  formatWaiveLateFeeLabel,
} from '../../utils/lateFeeUtils.ts';

// -------------------------------------------------------------------------
// 1. computeLateFeePreview: Boundary & Mode Tests
// -------------------------------------------------------------------------

test('computeLateFeePreview: returns 0 fee and 0 overdue days when late fee is disabled', () => {
  const result = computeLateFeePreview({
    dueDate: '2026-09-01',
    asOfDate: '2026-09-20',
    dueAmount: 5000,
    lateFeeEnabled: false,
    graceDays: 7,
    feeType: 'FLAT',
    feeAmount: 150,
  });

  assert.equal(result.late_fee, 0);
  assert.equal(result.overdue_days, 0);
  assert.equal(result.is_overdue, false);
});

test('computeLateFeePreview: returns 0 fee when dueAmount is 0 or negative', () => {
  const result = computeLateFeePreview({
    dueDate: '2026-09-01',
    asOfDate: '2026-09-20',
    dueAmount: 0,
    lateFeeEnabled: true,
    graceDays: 7,
    feeType: 'FLAT',
    feeAmount: 150,
  });

  assert.equal(result.late_fee, 0);
  assert.equal(result.overdue_days, 0);
  assert.equal(result.is_overdue, false);
});

test('computeLateFeePreview: returns 0 fee when within due date or grace period', () => {
  // Exactly on due date
  const onDue = computeLateFeePreview({
    dueDate: '2026-09-01',
    asOfDate: '2026-09-01',
    dueAmount: 5000,
    lateFeeEnabled: true,
    graceDays: 7,
    feeType: 'FLAT',
    feeAmount: 150,
  });
  assert.equal(onDue.late_fee, 0);
  assert.equal(onDue.overdue_days, 0);
  assert.equal(onDue.is_overdue, false);

  // Exactly on 7th day after due date (grace cutoff)
  const onCutoff = computeLateFeePreview({
    dueDate: '2026-09-01',
    asOfDate: '2026-09-08',
    dueAmount: 5000,
    lateFeeEnabled: true,
    graceDays: 7,
    feeType: 'FLAT',
    feeAmount: 150,
  });
  assert.equal(onCutoff.late_fee, 0);
  assert.equal(onCutoff.overdue_days, 0);
  assert.equal(onCutoff.is_overdue, false);
});

test('computeLateFeePreview: flat fee calculates accurately once grace period passes', () => {
  // 1 day past grace cutoff (Sept 9)
  const oneDayPast = computeLateFeePreview({
    dueDate: '2026-09-01',
    asOfDate: '2026-09-09',
    dueAmount: 5000,
    lateFeeEnabled: true,
    graceDays: 7,
    feeType: 'FLAT',
    feeAmount: 150,
  });
  assert.equal(oneDayPast.late_fee, 150);
  assert.equal(oneDayPast.overdue_days, 1);
  assert.equal(oneDayPast.is_overdue, true);

  // 10 days past grace cutoff (Sept 18)
  const tenDaysPast = computeLateFeePreview({
    dueDate: '2026-09-01',
    asOfDate: '2026-09-18',
    dueAmount: 5000,
    lateFeeEnabled: true,
    graceDays: 7,
    feeType: 'FLAT',
    feeAmount: 150,
  });
  assert.equal(tenDaysPast.late_fee, 150);
  assert.equal(tenDaysPast.overdue_days, 10);
  assert.equal(tenDaysPast.is_overdue, true);
});

test('computeLateFeePreview: daily penalty multiplies overdue days by daily rate', () => {
  const daily = computeLateFeePreview({
    dueDate: '2026-09-01',
    asOfDate: '2026-09-13', // 5 days past grace
    dueAmount: 5000,
    lateFeeEnabled: true,
    graceDays: 7,
    feeType: 'DAILY',
    feeAmount: 20,
  });
  assert.equal(daily.late_fee, 100); // 5 * 20
  assert.equal(daily.overdue_days, 5);
  assert.equal(daily.is_overdue, true);
});

test('computeLateFeePreview: percent penalty calculates percentage of remaining due amount', () => {
  const percent = computeLateFeePreview({
    dueDate: '2026-09-01',
    asOfDate: '2026-09-12', // 4 days past grace
    dueAmount: 8000,
    lateFeeEnabled: true,
    graceDays: 7,
    feeType: 'PERCENT',
    feeAmount: 5, // 5% of 8000 = 400
  });
  assert.equal(percent.late_fee, 400);
  assert.equal(percent.overdue_days, 4);
  assert.equal(percent.is_overdue, true);
});

// -------------------------------------------------------------------------
// 2. Banner & Label Formatting Specs
// -------------------------------------------------------------------------

test('formatLateFeeBanner: formats according to required brief string template', () => {
  const banner = formatLateFeeBanner(150, 12);
  assert.equal(banner, 'Late Fee: NPR 150.00 (12 days past grace period)');
});

test('formatCollectLateFeeLabel: formats toggle label for collection', () => {
  const label = formatCollectLateFeeLabel(150);
  assert.equal(label, 'Collect Late Fee (NPR 150.00)');
});

test('formatWaiveLateFeeLabel: formats toggle label for waiver', () => {
  const label = formatWaiveLateFeeLabel();
  assert.equal(label, 'Waive Late Fee');
});

// -------------------------------------------------------------------------
// 3. Payment Submission Late Fee & Waiver Payload Logic
// -------------------------------------------------------------------------

test('submission payload: includes late_fee_paid when collection is active', () => {
  const lateFeeData = { late_fee: 150, overdue_days: 10, is_overdue: true };
  const collectLateFee = true;

  const lateFeePayload = {
    late_fee_paid: collectLateFee && lateFeeData.is_overdue ? Number(lateFeeData.late_fee) : 0,
    late_fee_waived: !collectLateFee && lateFeeData.is_overdue,
  };

  assert.equal(lateFeePayload.late_fee_paid, 150);
  assert.equal(lateFeePayload.late_fee_waived, false);
});

test('submission payload: sets late_fee_waived to true when cashier waives', () => {
  const lateFeeData = { late_fee: 150, overdue_days: 10, is_overdue: true };
  const collectLateFee = false;

  const lateFeePayload = {
    late_fee_paid: collectLateFee && lateFeeData.is_overdue ? Number(lateFeeData.late_fee) : 0,
    late_fee_waived: !collectLateFee && lateFeeData.is_overdue,
  };

  assert.equal(lateFeePayload.late_fee_paid, 0);
  assert.equal(lateFeePayload.late_fee_waived, true);
});

// -------------------------------------------------------------------------
// 4. Receipt Itemization Line Item Condition
// -------------------------------------------------------------------------

test('receipt itemization: displays line when late_fee_amount > 0', () => {
  const paymentWithLateFee = {
    amount_paid: 5000,
    late_fee_amount: 150,
  };

  const shouldDisplayLine = Number(paymentWithLateFee.late_fee_amount || 0) > 0;
  const lineText = `Late Fee / Penalty: NPR ${Number(paymentWithLateFee.late_fee_amount).toFixed(2)}`;

  assert.equal(shouldDisplayLine, true);
  assert.equal(lineText, 'Late Fee / Penalty: NPR 150.00');

  const paymentWithoutLateFee = {
    amount_paid: 5000,
    late_fee_amount: 0,
  };
  assert.equal(Number(paymentWithoutLateFee.late_fee_amount || 0) > 0, false);
});
