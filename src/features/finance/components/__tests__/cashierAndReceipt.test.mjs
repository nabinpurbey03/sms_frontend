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
  getNextSequentialMonth,
  getCurrentBsMonthIndex,
  formatCurrency,
  formatCompactNumber,
  formatCompactCurrency,
  numberToWords,
  getCancelBillEligibility,
  calculateTotalAccountBalance,
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

test('computeMonthStatus: strict sequential ordering enforces chronological queue', () => {
  // Running month is Ashwin (index 5)
  const runningIndex = 5;

  // Case 1: Fresh session (0 generated months). Only Baishakh (index 0) is selectable!
  const emptyGen = new Set();
  const baisEmpty = computeMonthStatus('Baishakh', runningIndex, emptyGen);
  assert.equal(baisEmpty.status, 'AVAILABLE_NEXT');
  assert.equal(baisEmpty.isSelectable, true);
  assert.equal(baisEmpty.badgeLabel, 'Next to Bill');

  const jesthaEmpty = computeMonthStatus('Jestha', runningIndex, emptyGen);
  assert.equal(jesthaEmpty.status, 'LOCKED_SEQUENCE');
  assert.equal(jesthaEmpty.isSelectable, false);
  assert.equal(jesthaEmpty.badgeLabel, 'Sequence Locked');
  assert.ok(jesthaEmpty.tooltipText.includes('Baishakh'));

  // Case 2: Baishakh generated. Jestha (index 1) is now Next to Bill.
  const baisGen = new Set(['Baishakh']);
  const baisStatus = computeMonthStatus('Baishakh', runningIndex, baisGen);
  assert.equal(baisStatus.status, 'GENERATED');
  assert.equal(baisStatus.isSelectable, false);

  const jesthaNext = computeMonthStatus('Jestha', runningIndex, baisGen);
  assert.equal(jesthaNext.status, 'AVAILABLE_NEXT');
  assert.equal(jesthaNext.isSelectable, true);

  const ashadhLocked = computeMonthStatus('Ashadh', runningIndex, baisGen);
  assert.equal(ashadhLocked.status, 'LOCKED_SEQUENCE');
  assert.equal(ashadhLocked.isSelectable, false);

  // Case 3: All past months generated up to running month (Ashwin). Ashwin is AVAILABLE_RUNNING.
  const caughtUp = new Set(['Baishakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra']);
  const ashwinRunning = computeMonthStatus('Ashwin', runningIndex, caughtUp);
  assert.equal(ashwinRunning.status, 'AVAILABLE_RUNNING');
  assert.equal(ashwinRunning.isSelectable, true);
  assert.equal(ashwinRunning.badgeLabel, 'Current Month');

  // Case 4: Future month beyond running month is FUTURE_LOCKED.
  const kartikFuture = computeMonthStatus('Kartik', runningIndex, caughtUp);
  assert.equal(kartikFuture.status, 'FUTURE_LOCKED');
  assert.equal(kartikFuture.isSelectable, false);

  // Case 5: Out-of-order legacy scenario (Shrawan generated, Baishakh wasn't). Baishakh is LOCKED_PAST.
  const legacyGen = new Set(['Shrawan']);
  const baisLegacy = computeMonthStatus('Baishakh', runningIndex, legacyGen);
  assert.equal(baisLegacy.status, 'LOCKED_PAST');
  assert.equal(baisLegacy.isSelectable, false);
  assert.equal(baisLegacy.badgeLabel, 'Locked (Past)');
});

test('getNextSequentialMonth: returns exact next month or null when caught up', () => {
  const runningIndex = 3; // Shrawan
  assert.equal(getNextSequentialMonth(runningIndex, new Set()), 'Baishakh');
  assert.equal(getNextSequentialMonth(runningIndex, new Set(['Baishakh'])), 'Jestha');
  assert.equal(getNextSequentialMonth(runningIndex, new Set(['Baishakh', 'Jestha'])), 'Ashadh');
  assert.equal(getNextSequentialMonth(runningIndex, new Set(['Baishakh', 'Jestha', 'Ashadh'])), 'Shrawan');
  // All caught up through Shrawan:
  assert.equal(getNextSequentialMonth(runningIndex, new Set(['Baishakh', 'Jestha', 'Ashadh', 'Shrawan'])), null);
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

test('numberToWords: converts amounts to South Asian English words with Rupees Only suffix', () => {
  assert.equal(numberToWords(0), 'Zero Rupees Only');
  assert.equal(numberToWords('0'), 'Zero Rupees Only');
  assert.equal(numberToWords(500), 'Five Hundred Rupees Only');
  assert.equal(numberToWords(1250), 'One Thousand Two Hundred Fifty Rupees Only');
  assert.equal(numberToWords(12500), 'Twelve Thousand Five Hundred Rupees Only');
  assert.equal(numberToWords('75500'), 'Seventy Five Thousand Five Hundred Rupees Only');
  assert.equal(numberToWords(125000), 'One Lakh Twenty Five Thousand Rupees Only');
  assert.equal(numberToWords(1500000), 'Fifteen Lakh Rupees Only');
  assert.equal(numberToWords(10000000), 'One Crore Rupees Only');
  assert.equal(numberToWords(25000000), 'Two Crore Fifty Lakh Rupees Only');
});

// -------------------------------------------------------------------------
// 8. Cancel Bill Eligibility Rules
// -------------------------------------------------------------------------

test('getCancelBillEligibility: denies if user lacks management permissions', () => {
  const result = getCancelBillEligibility({ status: 'UNPAID', paid_amount: 0 }, false);
  assert.equal(result.canCancel, false);
  assert.match(result.reason, /permission/i);
});

test('getCancelBillEligibility: denies if bill is null or undefined', () => {
  const result = getCancelBillEligibility(null, true);
  assert.equal(result.canCancel, false);
});

test('getCancelBillEligibility: denies if bill is already CANCELLED', () => {
  const result = getCancelBillEligibility({ status: 'CANCELLED', paid_amount: 0 }, true);
  assert.equal(result.canCancel, false);
  assert.match(result.reason, /already cancelled/i);
});

test('getCancelBillEligibility: denies if bill has recorded payments (partial or full)', () => {
  const partialResult = getCancelBillEligibility({ status: 'PARTIAL', paid_amount: 500 }, true);
  assert.equal(partialResult.canCancel, false);
  assert.match(partialResult.reason, /recorded payments/i);
  assert.match(partialResult.reason, /500\.00/);

  const fullResult = getCancelBillEligibility({ status: 'PAID', paid_amount: 5000 }, true);
  assert.equal(fullResult.canCancel, false);
  assert.match(fullResult.reason, /recorded payments/i);
});

test('getCancelBillEligibility: approves if bill is UNPAID with zero payments and user has permission', () => {
  const result = getCancelBillEligibility({ status: 'UNPAID', paid_amount: 0 }, true);
  assert.equal(result.canCancel, true);
  assert.equal(result.reason, undefined);
});

// -------------------------------------------------------------------------
// 9. Prior Monthly Dues Itemization & Cumulative Account Balance
// -------------------------------------------------------------------------

test('calculateTotalAccountBalance: sums current cycle due and itemized prior unpaid months', () => {
  const priorUnpaidMonths = [
    {
      bill_id: 'bill-01',
      bill_number: 'FB-2081-001',
      billing_month: 'Baishakh',
      academic_year_name: '2081/82',
      due_amount: 1500,
    },
    {
      bill_id: 'bill-02',
      bill_number: 'FB-2081-002',
      billing_month: 'Jestha',
      academic_year_name: '2081/82',
      due_amount: '2250.50',
    },
  ];

  const currentDue = 3000;
  const result = calculateTotalAccountBalance(currentDue, priorUnpaidMonths);

  assert.equal(result.currentInvoiceDue, 3000);
  assert.equal(result.priorUnpaidTotal, 3750.50);
  assert.equal(result.totalAccountDue, 6750.50);
});

test('calculateTotalAccountBalance: returns current due when no prior unpaid months exist', () => {
  const resEmpty = calculateTotalAccountBalance(4500, []);
  assert.equal(resEmpty.currentInvoiceDue, 4500);
  assert.equal(resEmpty.priorUnpaidTotal, 0);
  assert.equal(resEmpty.totalAccountDue, 4500);

  const resUndefined = calculateTotalAccountBalance('5000.00', undefined);
  assert.equal(resUndefined.currentInvoiceDue, 5000);
  assert.equal(resUndefined.priorUnpaidTotal, 0);
  assert.equal(resUndefined.totalAccountDue, 5000);
});

test('prior monthly dues itemization: correctly parses and formats itemized breakdown', () => {
  const sampleBill = {
    id: 'bill-current',
    bill_number: 'FB-2081-003',
    billing_month: 'Ashadh',
    subtotal_amount: 4000,
    total_payable: 4000,
    due_amount: 4000,
    prior_unpaid_months: [
      {
        bill_id: 'b-1',
        bill_number: 'FB-2081-001',
        billing_month: 'Baishakh',
        academic_year_name: '2081/82',
        due_amount: 1200,
      },
      {
        bill_id: 'b-2',
        bill_number: 'FB-2081-002',
        billing_month: 'Jestha',
        academic_year_name: '2081/82',
        due_amount: 1800,
      },
    ],
  };

  const totals = calculateTotalAccountBalance(sampleBill.due_amount, sampleBill.prior_unpaid_months);
  assert.equal(totals.currentInvoiceDue, 4000);
  assert.equal(totals.priorUnpaidTotal, 3000);
  assert.equal(totals.totalAccountDue, 7000);

  // Format checks matching invoice presentation
  const lines = sampleBill.prior_unpaid_months.map((p) => ({
    label: `Due amount for ${p.billing_month || 'Previous Cycle'}:`,
    formattedAmount: `+ NPR ${Number(p.due_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
  }));

  assert.deepEqual(lines, [
    { label: 'Due amount for Baishakh:', formattedAmount: '+ NPR 1,200.00' },
    { label: 'Due amount for Jestha:', formattedAmount: '+ NPR 1,800.00' },
  ]);
});

