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
  deriveBillLedgerStatus,
  isBillPayable,
  getBillMonthIndex,
  sortBillsChronologically,
  generateMonthlyLedgerSummary,
  formatStudentFullName,
  extractSeparateMonthsDue,
  filterApplicableBatchFeeStructures,
  evaluateBatchFeeStructureEligibility,
  getEligibleBatchFeeStructureIds,
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

// -------------------------------------------------------------------------
// 10. Student Ledger Month-by-Month Status & Independent Monthly Settlement
// -------------------------------------------------------------------------

test('deriveBillLedgerStatus derives PAID, PARTIAL, UNPAID, and CANCELLED correctly', () => {
  // 1. Settled bill with due_amount === 0 -> PAID
  const fullyPaidBill = {
    status: 'PAID',
    total_payable: 3500,
    paid_amount: 3500,
    due_amount: 0,
  };
  assert.equal(deriveBillLedgerStatus(fullyPaidBill), 'PAID');

  // Also when due_amount is 0 even if raw status is lowercase or legacy
  const zeroDueBill = {
    status: 'ISSUED',
    total_payable: 4000,
    paid_amount: 4000,
    due_amount: 0,
  };
  assert.equal(deriveBillLedgerStatus(zeroDueBill), 'PAID');

  // 2. Partial bill with paid > 0 and due > 0 -> PARTIAL
  const partialBill = {
    status: 'PARTIAL',
    total_payable: 5000,
    paid_amount: 2000,
    due_amount: 3000,
  };
  assert.equal(deriveBillLedgerStatus(partialBill), 'PARTIAL');

  // 3. Unpaid bill with paid === 0 and due > 0 -> UNPAID
  const unpaidBill = {
    status: 'UNPAID',
    total_payable: 5000,
    paid_amount: 0,
    due_amount: 5000,
  };
  assert.equal(deriveBillLedgerStatus(unpaidBill), 'UNPAID');

  // 4. Cancelled bill -> CANCELLED regardless of due
  const cancelledBill = {
    status: 'CANCELLED',
    total_payable: 5000,
    paid_amount: 0,
    due_amount: 5000,
  };
  assert.equal(deriveBillLedgerStatus(cancelledBill), 'CANCELLED');
});

test('isBillPayable identifies payable bills vs settled / cancelled bills', () => {
  // Unpaid bill with positive due -> payable
  assert.equal(isBillPayable({ status: 'UNPAID', due_amount: 3000 }), true);

  // Partial bill with positive due -> payable
  assert.equal(isBillPayable({ status: 'PARTIAL', due_amount: 1500 }), true);

  // Settled bill with 0 due -> NOT payable
  assert.equal(isBillPayable({ status: 'PAID', due_amount: 0 }), false);

  // Cancelled bill even with non-zero due -> NOT payable
  assert.equal(isBillPayable({ status: 'CANCELLED', due_amount: 3000 }), false);

  // Null or undefined -> NOT payable
  assert.equal(isBillPayable(null), false);
  assert.equal(isBillPayable(undefined), false);
});

test('sortBillsChronologically sorts bills from Baishakh to Chaitra', () => {
  const bills = [
    { id: '3', billing_month: 'Ashadh', issue_date: '2026-07-01' },
    { id: '1', billing_month: 'Baishakh', issue_date: '2026-05-01' },
    { id: '12', billing_month: 'Chaitra', issue_date: '2027-04-01' },
    { id: '2', billing_month: 'Jestha', issue_date: '2026-06-01' },
  ];

  const sortedAsc = sortBillsChronologically(bills, 'asc');
  assert.deepEqual(
    sortedAsc.map((b) => b.billing_month),
    ['Baishakh', 'Jestha', 'Ashadh', 'Chaitra']
  );

  const sortedDesc = sortBillsChronologically(bills, 'desc');
  assert.deepEqual(
    sortedDesc.map((b) => b.billing_month),
    ['Chaitra', 'Ashadh', 'Jestha', 'Baishakh']
  );
});

test('generateMonthlyLedgerSummary creates compact overview pills with exact formatting', () => {
  const bills = [
    {
      id: 'b-1',
      bill_number: 'BILL-001',
      billing_month: 'Baishakh',
      total_payable: 3000,
      paid_amount: 3000,
      due_amount: 0,
      status: 'PAID',
    },
    {
      id: 'b-2',
      bill_number: 'BILL-002',
      billing_month: 'Jestha',
      total_payable: 3000,
      paid_amount: 0,
      due_amount: 3000,
      status: 'UNPAID',
    },
    {
      id: 'b-3',
      bill_number: 'BILL-003',
      billing_month: 'Ashadh',
      total_payable: 5000,
      paid_amount: 0,
      due_amount: 5000,
      status: 'UNPAID',
    },
  ];

  const pills = generateMonthlyLedgerSummary(bills);
  assert.equal(pills.length, 3);

  // Exact strings matching the prompt/brief:
  // M01 Baishakh: PAID, M02 Jestha: DUE NPR 3,000, M03 Ashadh: DUE NPR 5,000
  assert.equal(pills[0].displayText, 'M01 Baishakh: PAID');
  assert.equal(pills[0].status, 'PAID');
  assert.equal(pills[0].monthCode, 'M01');

  assert.equal(pills[1].displayText, 'M02 Jestha: DUE NPR 3,000');
  assert.equal(pills[1].status, 'UNPAID');
  assert.equal(pills[1].dueAmount, 3000);

  assert.equal(pills[2].displayText, 'M03 Ashadh: DUE NPR 5,000');
  assert.equal(pills[2].status, 'UNPAID');
  assert.equal(pills[2].dueAmount, 5000);
});

test('formatStudentFullName correctly formats first, middle, and last names', () => {
  // Full three parts
  assert.equal(
    formatStudentFullName({
      student_first_name: 'Aarav',
      student_middle_name: 'Kumar',
      student_last_name: 'Sharma',
    }),
    'Aarav Kumar Sharma'
  );

  // Without middle name
  assert.equal(
    formatStudentFullName({
      student_first_name: 'Sita',
      student_middle_name: null,
      student_last_name: 'Adhikari',
    }),
    'Sita Adhikari'
  );

  // Direct student model properties
  assert.equal(
    formatStudentFullName({
      first_name: 'Ram',
      middle_name: 'Bahadur',
      last_name: 'Thapa',
    }),
    'Ram Bahadur Thapa'
  );

  // Fallback to student_name
  assert.equal(
    formatStudentFullName({
      student_name: 'Deepak Shrestha',
    }),
    'Deepak Shrestha'
  );

  // Fallback when empty or null
  assert.equal(formatStudentFullName(null), 'Student');
  assert.equal(formatStudentFullName(undefined), 'Student');
  assert.equal(formatStudentFullName({}), 'Student');
});

test('extractSeparateMonthsDue: extracts, sorts chronologically, and itemizes unpaid months with dues', () => {
  // Empty or null cases
  assert.deepEqual(extractSeparateMonthsDue(null), []);
  assert.deepEqual(extractSeparateMonthsDue([]), []);

  const sampleBills = [
    {
      id: 'b-jestha',
      bill_number: 'FB-2082-002',
      billing_month: 'Jestha',
      due_amount: 3000,
      total_payable: 5000,
      paid_amount: 2000,
      status: 'PARTIAL',
    },
    {
      id: 'b-baishakh',
      bill_number: 'FB-2082-001',
      billing_month: 'Baishakh',
      due_amount: 5000,
      total_payable: 5000,
      paid_amount: 0,
      status: 'UNPAID',
    },
    {
      id: 'b-ashadh',
      bill_number: 'FB-2082-003',
      billing_month: 'Ashadh',
      due_amount: 0,
      total_payable: 5000,
      paid_amount: 5000,
      status: 'PAID',
    },
    {
      id: 'b-shrawan-cancelled',
      bill_number: 'FB-2082-004',
      billing_month: 'Shrawan',
      due_amount: 5000,
      total_payable: 5000,
      paid_amount: 0,
      status: 'CANCELLED',
    },
  ];

  const result = extractSeparateMonthsDue(sampleBills);
  assert.equal(result.length, 2);

  // Baishakh comes first chronologically
  assert.equal(result[0].month, 'Baishakh');
  assert.equal(result[0].dueAmount, 5000);
  assert.equal(result[0].billNumber, 'FB-2082-001');
  assert.equal(result[0].status, 'UNPAID');

  // Jestha comes second
  assert.equal(result[1].month, 'Jestha');
  assert.equal(result[1].dueAmount, 3000);
  assert.equal(result[1].billNumber, 'FB-2082-002');
  assert.equal(result[1].status, 'PARTIAL');
});

// -------------------------------------------------------------------------
// 12. Batch Billing Fee Structure Frequency Filtering
// -------------------------------------------------------------------------

test('filterApplicableBatchFeeStructures: allows YEARLY in Baishakh and rejects ONE_TIME', () => {
  const structures = [
    { id: 'fs-1', name: 'Monthly Tuition', frequency: 'MONTHLY', amount: 3000 },
    { id: 'fs-2', name: 'Annual Development Fee', frequency: 'YEARLY', amount: 5000 },
    { id: 'fs-3', name: 'Admission Fee', frequency: 'ONE_TIME', amount: 10000 },
  ];

  const evaluated = filterApplicableBatchFeeStructures('Baishakh', structures);
  assert.equal(evaluated.length, 3);

  // Monthly Tuition is eligible
  assert.equal(evaluated[0].isEligible, true);
  assert.equal(evaluated[0].structure.id, 'fs-1');

  // Annual Development Fee is eligible in Baishakh
  assert.equal(evaluated[1].isEligible, true);
  assert.equal(evaluated[1].structure.id, 'fs-2');
  assert.equal(evaluated[1].badgeLabel, 'Annual Fee');

  // Admission Fee (ONE_TIME) is ineligible
  assert.equal(evaluated[2].isEligible, false);
  assert.equal(evaluated[2].structure.id, 'fs-3');
  assert.equal(evaluated[2].badgeLabel, 'Admission Only');
  assert.match(evaluated[2].disabledReason, /one-time admission fees cannot be billed/i);

  const eligibleIds = getEligibleBatchFeeStructureIds('Baishakh', structures);
  assert.deepEqual(eligibleIds, ['fs-1', 'fs-2']);
});

test('filterApplicableBatchFeeStructures: rejects YEARLY and ONE_TIME in non-Baishakh months', () => {
  const structures = [
    { id: 'fs-1', name: 'Monthly Tuition', frequency: 'MONTHLY', amount: 3000 },
    { id: 'fs-2', name: 'Annual Development Fee', frequency: 'YEARLY', amount: 5000 },
    { id: 'fs-3', name: 'Admission Fee', frequency: 'ONE_TIME', amount: 10000 },
  ];

  for (const month of ['Jestha', 'Ashadh', 'Chaitra']) {
    const evaluated = filterApplicableBatchFeeStructures(month, structures);
    assert.equal(evaluated.length, 3);

    // Monthly Tuition is eligible
    assert.equal(evaluated[0].isEligible, true);

    // Annual Development Fee is ineligible outside Baishakh
    assert.equal(evaluated[1].isEligible, false);
    assert.equal(evaluated[1].badgeLabel, 'Yearly (Baishakh Only)');
    assert.match(evaluated[1].disabledReason, /annual fees can only be billed in baishakh/i);

    // Admission Fee is ineligible
    assert.equal(evaluated[2].isEligible, false);
    assert.equal(evaluated[2].badgeLabel, 'Admission Only');

    const eligibleIds = getEligibleBatchFeeStructureIds(month, structures);
    assert.deepEqual(eligibleIds, ['fs-1']);
  }
});

// -------------------------------------------------------------------------
// 19. Consolidated Pay All Receipt Data Model & Structure Contracts
// -------------------------------------------------------------------------

test('Consolidated Receipt: validates allocations structure and multi-bill settlement math', () => {
  const consolidatedDoc = {
    consolidated_receipt_number: 'CREC-2081-0001',
    school_name: 'Kathmandu Model School',
    school_address: 'Bagbazar, Kathmandu',
    payment_date: '2026-05-15',
    student_name: 'Aayush Shrestha',
    class_name: 'Grade 6',
    section_name: 'A',
    payment_method: 'CASH',
    remarks: 'Pay all outstanding dues',
    allocations: [
      {
        payment_id: 'pay-1',
        receipt_number: 'REC-2081-0001',
        bill_id: 'bill-1',
        bill_number: 'BILL-001',
        billing_month: 'Baishakh',
        bill_title: 'Baishakh Fee Bill',
        amount_allocated: '3000.00',
        remaining_due_after: '0.00',
        status: 'PAID',
      },
      {
        payment_id: 'pay-2',
        receipt_number: 'REC-2081-0002',
        bill_id: 'bill-2',
        bill_number: 'BILL-002',
        billing_month: 'Jestha',
        bill_title: 'Jestha Fee Bill',
        amount_allocated: '2500.00',
        remaining_due_after: '500.00',
        status: 'PARTIAL',
      },
    ],
    total_amount_paid: '5500.00',
    amount_in_words: 'Five Thousand Five Hundred Rupees Only',
    total_account_balance_remaining: '500.00',
  };

  assert.equal(consolidatedDoc.consolidated_receipt_number.startsWith('CREC-'), true);
  assert.equal(consolidatedDoc.allocations.length, 2);

  const sumAllocated = consolidatedDoc.allocations.reduce(
    (acc, curr) => acc + Number(curr.amount_allocated),
    0
  );
  assert.equal(sumAllocated, 5500);
  assert.equal(Number(consolidatedDoc.total_amount_paid), 5500);
  assert.equal(Number(consolidatedDoc.total_account_balance_remaining), 500);
});
