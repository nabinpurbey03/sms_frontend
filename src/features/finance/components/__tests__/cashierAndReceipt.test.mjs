import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BS_MONTHS,
  getDefaultBillTitle,
  calculateQuickFillAmounts,
  calculateBaseMonthlyFee,
  calculateNetReceived,
  isArrearsFeeHead,
  computeMonthStatus,
  getCurrentBsMonthIndex,
  formatCurrency,
  formatCompactNumber,
  formatCompactCurrency,
} from '../../utils/cashierUtils.ts';

// -------------------------------------------------------------------------
// 1. Bikram Sambat 12-Month Selector & Default Bill Title
// -------------------------------------------------------------------------

test('BS_MONTHS contains exactly 12 Bikram Sambat months in chronological order', () => {
  assert.equal(BS_MONTHS.length, 12);
  assert.deepEqual([...BS_MONTHS], [
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
  ]);
});

test('getDefaultBillTitle dynamically constructs month and session title', () => {
  assert.equal(
    getDefaultBillTitle('Baishakh', '2081/82'),
    'Baishakh Fee Bill (2081/82)'
  );
  assert.equal(
    getDefaultBillTitle('Chaitra', undefined),
    'Chaitra Fee Bill (Active Session)'
  );
});

// -------------------------------------------------------------------------
// 2. Monthly Fee Aggregation (Single Month Billing, Not Quarterly x3)
// -------------------------------------------------------------------------

test('calculateBaseMonthlyFee sums fee heads for single month without multiplying by 3', () => {
  const structures = [
    { amount: '3500.00' }, // Tuition
    { amount: '500.00' },  // Lab
    { amount: '200.00' },  // Library
  ];
  const total = calculateBaseMonthlyFee(structures, 0);
  assert.equal(total, 4200);

  // With optional ad-hoc fee
  const totalWithAdHoc = calculateBaseMonthlyFee(structures, 300);
  assert.equal(totalWithAdHoc, 4500);
});

// -------------------------------------------------------------------------
// 3. Cashier Quick Fill Buttons Calculation
// -------------------------------------------------------------------------

test('calculateQuickFillAmounts: full balance and current month only when bill has arrears', () => {
  // Scenario: Current Month Tuition = 3000, Previous Dues = 2000. Total due = 5000. No discount.
  const res = calculateQuickFillAmounts({
    dueAmount: 5000,
    subtotalAmount: 3000,
    liveDiscountAmt: 0,
  });

  assert.equal(res.netPayable, 5000);
  assert.equal(res.currentMonthDue, 3000);
});

test('calculateQuickFillAmounts: applies counter discount to net payable and current month portion', () => {
  // Scenario: Due = 5000 (subtotal 3000, arrears 2000), Discount = 500
  const res = calculateQuickFillAmounts({
    dueAmount: 5000,
    subtotalAmount: 3000,
    liveDiscountAmt: 500,
  });

  // Net payable = 5000 - 500 = 4500
  assert.equal(res.netPayable, 4500);
  // Current month due = 3000 - 500 = 2500
  assert.equal(res.currentMonthDue, 2500);
});

test('calculateQuickFillAmounts: caps current month due if remaining due is less than subtotal', () => {
  // Scenario: Student previously made partial payment. Remaining due = 1500, but subtotal was 3000.
  const res = calculateQuickFillAmounts({
    dueAmount: 1500,
    subtotalAmount: 3000,
    liveDiscountAmt: 0,
  });

  assert.equal(res.netPayable, 1500);
  // Current month due cannot exceed remaining net payable
  assert.equal(res.currentMonthDue, 1500);
});

// -------------------------------------------------------------------------
// 4. Net Received Calculation & Receipt Particulars Detection
// -------------------------------------------------------------------------

test('calculateNetReceived sums cash amount and late fee penalty', () => {
  assert.equal(calculateNetReceived(5000, 150), 5150);
  assert.equal(calculateNetReceived(5000, 0), 5000);
  assert.equal(calculateNetReceived('4500.50', '200.25'), 4700.75);
});

test('isArrearsFeeHead detects monthly rolling arrears and academic year carried dues', () => {
  assert.equal(isArrearsFeeHead('Due amount for Baishakh'), true);
  assert.equal(isArrearsFeeHead('Due amount academic year - 2081/82'), true);
  assert.equal(isArrearsFeeHead('Carried Arrears from Term 1'), true);
  assert.equal(isArrearsFeeHead('Prior Dues Balance'), true);
  assert.equal(isArrearsFeeHead('Tuition Fee Grade 10'), false);
  assert.equal(isArrearsFeeHead('Computer Lab Fee'), false);
});

// -------------------------------------------------------------------------
// 5. Batch Bill Generation Schema: Ad-Hoc Fee Optional Preprocessing
// -------------------------------------------------------------------------

test('batchBillGenerateSchema accepts empty string for optional ad_hoc_fee_amount without validation error', async () => {
  const { batchBillGenerateSchema } = await import('../../schema.ts');
  const basePayload = {
    class_id: 'class-123',
    billing_month: 'Baishakh',
    fee_structure_ids: ['fee-1'],
    due_date: '2026-05-15',
  };

  // Case A: empty string "" (returned by empty HTML number input)
  const emptyStrRes = batchBillGenerateSchema.safeParse({
    ...basePayload,
    ad_hoc_fee_name: '',
    ad_hoc_fee_amount: '',
  });
  assert.equal(emptyStrRes.success, true);
  assert.equal(emptyStrRes.data.ad_hoc_fee_amount, undefined);

  // Case B: undefined
  const undefRes = batchBillGenerateSchema.safeParse({
    ...basePayload,
    ad_hoc_fee_amount: undefined,
  });
  assert.equal(undefRes.success, true);
  assert.equal(undefRes.data.ad_hoc_fee_amount, undefined);

  // Case C: valid number 500
  const validNumRes = batchBillGenerateSchema.safeParse({
    ...basePayload,
    ad_hoc_fee_name: 'Test Fee',
    ad_hoc_fee_amount: 500,
  });
  assert.equal(validNumRes.success, true);
  assert.equal(validNumRes.data.ad_hoc_fee_amount, 500);

  // Case D: valid string "500"
  const validStrRes = batchBillGenerateSchema.safeParse({
    ...basePayload,
    ad_hoc_fee_name: 'Test Fee',
    ad_hoc_fee_amount: '500',
  });
  assert.equal(validStrRes.success, true);
  assert.equal(validStrRes.data.ad_hoc_fee_amount, 500);

  // Case E: negative number fails
  const negRes = batchBillGenerateSchema.safeParse({
    ...basePayload,
    ad_hoc_fee_amount: -50,
  });
  assert.equal(negRes.success, false);
});

// -------------------------------------------------------------------------
// 6. Month Generation Status Calculation Utilities
// -------------------------------------------------------------------------

test('computeMonthStatus: correctly identifies generated, running, backlog, and future months', () => {
  // Assume running month is Ashwin (index 5)
  const runningIndex = 5;
  const generated = new Set(['Baishakh', 'Ashadh']);

  // Case 1: Baishakh is generated -> GENERATED, not selectable
  const baishakh = computeMonthStatus('Baishakh', runningIndex, generated);
  assert.equal(baishakh.status, 'GENERATED');
  assert.equal(baishakh.isSelectable, false);
  assert.equal(baishakh.badgeLabel, 'Generated');
  assert.equal(baishakh.tooltipText, 'Baishakh invoices have already been generated for this class.');
  assert.equal(baishakh.index, 0);

  // Case 2: Jestha was not generated and is past -> AVAILABLE_BACKLOG, selectable
  const jestha = computeMonthStatus('Jestha', runningIndex, generated);
  assert.equal(jestha.status, 'AVAILABLE_BACKLOG');
  assert.equal(jestha.isSelectable, true);
  assert.equal(jestha.badgeLabel, 'Unbilled Past');
  assert.equal(jestha.tooltipText, 'Jestha was not generated yet and can be billed now.');
  assert.equal(jestha.index, 1);

  // Case 3: Ashwin is running month and not generated -> AVAILABLE_RUNNING, selectable
  const ashwin = computeMonthStatus('Ashwin', runningIndex, generated);
  assert.equal(ashwin.status, 'AVAILABLE_RUNNING');
  assert.equal(ashwin.isSelectable, true);
  assert.equal(ashwin.badgeLabel, 'Current Month');
  assert.equal(ashwin.tooltipText, 'Ashwin is the current running cycle.');
  assert.equal(ashwin.index, 5);

  // Case 4: Kartik is future month -> FUTURE_LOCKED, not selectable
  const kartik = computeMonthStatus('Kartik', runningIndex, generated);
  assert.equal(kartik.status, 'FUTURE_LOCKED');
  assert.equal(kartik.isSelectable, false);
  assert.equal(kartik.badgeLabel, 'Upcoming');
  assert.equal(kartik.tooltipText, 'Kartik is an upcoming month in this academic session.');
  assert.equal(kartik.index, 6);
});

test('getCurrentBsMonthIndex returns an integer between 0 and 11', () => {
  const currentIdx = getCurrentBsMonthIndex();
  assert.equal(typeof currentIdx, 'number');
  assert.equal(Number.isInteger(currentIdx), true);
  assert.ok(currentIdx >= 0 && currentIdx <= 11);

  // With a specific known date (e.g., 2026-05-15 is in Jestha, index 1)
  const jesthaDate = new Date('2026-05-15');
  const jesthaIdx = getCurrentBsMonthIndex(jesthaDate);
  assert.equal(jesthaIdx, 1);
});

// -------------------------------------------------------------------------
// 7. Compact Currency Formatting (K for Thousand, M for Million)
// -------------------------------------------------------------------------

test('formatCompactNumber: correctly formats thousands (K), millions (M), and billions (B)', () => {
  // Zero / empty / null / NaN
  assert.equal(formatCompactNumber(0), '0');
  assert.equal(formatCompactNumber('0'), '0');
  assert.equal(formatCompactNumber(''), '0');
  assert.equal(formatCompactNumber(null), '0');
  assert.equal(formatCompactNumber(undefined), '0');

  // Below 1,000 -> normal number with locale
  assert.equal(formatCompactNumber(500), '500');
  assert.equal(formatCompactNumber(750), '750');
  assert.equal(formatCompactNumber(999), '999');

  // Thousands (K) -> 1 decimal stripped if trailing zero
  assert.equal(formatCompactNumber(1000), '1K');
  assert.equal(formatCompactNumber(1500), '1.5K');
  assert.equal(formatCompactNumber(12000), '12K');
  assert.equal(formatCompactNumber(12500), '12.5K');
  assert.equal(formatCompactNumber(450000), '450K');
  assert.equal(formatCompactNumber('75500'), '75.5K');

  // Millions (M) -> up to 2 decimals stripped if trailing zero
  assert.equal(formatCompactNumber(1000000), '1M');
  assert.equal(formatCompactNumber(1200000), '1.2M');
  assert.equal(formatCompactNumber(1250000), '1.25M');
  assert.equal(formatCompactNumber(50000000), '50M');

  // Billions (B)
  assert.equal(formatCompactNumber(1000000000), '1B');
  assert.equal(formatCompactNumber(2500000000), '2.5B');

  // Negative values
  assert.equal(formatCompactNumber(-500), '-500');
  assert.equal(formatCompactNumber(-12500), '-12.5K');
  assert.equal(formatCompactNumber(-1500000), '-1.5M');
});

test('formatCompactCurrency: prefixes currency symbol with compact numbers', () => {
  assert.equal(formatCompactCurrency(0), 'NPR 0');
  assert.equal(formatCompactCurrency(750), 'NPR 750');
  assert.equal(formatCompactCurrency(12500), 'NPR 12.5K');
  assert.equal(formatCompactCurrency(450000), 'NPR 450K');
  assert.equal(formatCompactCurrency(1250000), 'NPR 1.25M');
  assert.equal(formatCompactCurrency(1000000), 'NPR 1M');
  assert.equal(formatCompactCurrency(-12500), '-NPR 12.5K');
  assert.equal(formatCompactCurrency(2500000, 'Rs. '), 'Rs. 2.5M');
});

test('formatCurrency: preserves exact 2-decimal precision for receipts and audit ledgers', () => {
  assert.equal(formatCurrency(0), 'NPR 0.00');
  assert.equal(formatCurrency(1250.5), 'NPR 1,250.50');
  assert.equal(formatCurrency(1250000), 'NPR 12,50,000.00');
});

