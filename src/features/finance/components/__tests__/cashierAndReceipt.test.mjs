import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BS_MONTHS,
  getDefaultBillTitle,
  calculateQuickFillAmounts,
  calculateBaseMonthlyFee,
  calculateNetReceived,
  isArrearsFeeHead,
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

