import test from 'node:test';
import assert from 'node:assert/strict';
import { feeStructureFormSchema } from '../../schema.ts';
import {
  filterAndSortCandidateAcademicYears,
  isCloneScopeValid,
  formatCloneSampleText,
  ROUNDING_OPTIONS,
  PERCENTAGE_PRESETS,
  computeSessionCloneBannerState,
} from '../../utils/feeCloneUtils.ts';

/**
 * Calculates adjusted amount based on percentage increase and rounding interval.
 *
 * @param {number} baseAmount
 * @param {number} [percentageIncrease=0]
 * @param {number} [roundToNearest=10]
 * @returns {number}
 */
export function calculateAdjustedAmount(
  baseAmount,
  percentageIncrease = 0,
  roundToNearest = 10
) {
  const raw = baseAmount * (1 + percentageIncrease / 100);
  if (!roundToNearest || roundToNearest <= 0) {
    return Math.round(raw * 100) / 100;
  }
  return Math.round(raw / roundToNearest) * roundToNearest;
}

test('calculateAdjustedAmount: 1200 with 10% increase -> 1320', () => {
  assert.equal(calculateAdjustedAmount(1200, 10), 1320);
});

test('calculateAdjustedAmount: 1255 with 5% increase and roundToNearest=10 -> 1320', () => {
  // 1255 * 1.05 = 1317.75 -> rounded to nearest 10 is 1320
  assert.equal(calculateAdjustedAmount(1255, 5, 10), 1320);
});

test('calculateAdjustedAmount: 1000 with 0% increase -> 1000', () => {
  assert.equal(calculateAdjustedAmount(1000, 0), 1000);
});

test('calculateAdjustedAmount: 500 with -10% decrease -> 450', () => {
  assert.equal(calculateAdjustedAmount(500, -10), 450);
});

test('calculateAdjustedAmount: handles roundToNearest=100', () => {
  // 1250 * 1.10 = 1375 -> nearest 100 is 1400
  assert.equal(calculateAdjustedAmount(1250, 10, 100), 1400);
});

test('calculateAdjustedAmount: handles roundToNearest=0 or <= 0 with 2 decimal precision', () => {
  // 100.5 * 1.05 = 105.525 -> rounded to 2 decimals is 105.53
  assert.equal(calculateAdjustedAmount(100.5, 5, 0), 105.53);
  assert.equal(calculateAdjustedAmount(100.5, 5, -1), 105.53);
});

test('calculateAdjustedAmount: default parameters work', () => {
  assert.equal(calculateAdjustedAmount(1000), 1000);
});

test('feeStructureFormSchema: single class mode requires valid class_id', () => {
  const baseValid = {
    fee_level: 'CLASS',
    is_bulk_class: false,
    name: 'Tuition Fee',
    fee_category: 'TUITION',
    frequency: 'MONTHLY',
    amount: 2500,
  };

  const missingClass = feeStructureFormSchema.safeParse({
    ...baseValid,
    class_id: '',
  });
  assert.equal(missingClass.success, false);
  assert.equal(missingClass.error.issues[0].path[0], 'class_id');
  assert.match(missingClass.error.issues[0].message, /select a class/i);

  const validSingleClass = feeStructureFormSchema.safeParse({
    ...baseValid,
    class_id: 'class-uuid-1',
  });
  assert.equal(validSingleClass.success, true);
  if (validSingleClass.success) {
    assert.equal(validSingleClass.data.class_id, 'class-uuid-1');
  }
});

test('feeStructureFormSchema: bulk class mode requires non-empty class_ids array', () => {
  const baseValid = {
    fee_level: 'CLASS',
    is_bulk_class: true,
    name: 'Lab Charge',
    fee_category: 'LAB',
    frequency: 'MONTHLY',
    amount: 500,
  };

  const emptyClassIds = feeStructureFormSchema.safeParse({
    ...baseValid,
    class_ids: [],
  });
  assert.equal(emptyClassIds.success, false);
  assert.equal(emptyClassIds.error.issues[0].path[0], 'class_ids');
  assert.match(emptyClassIds.error.issues[0].message, /select at least one class/i);

  const missingClassIds = feeStructureFormSchema.safeParse({
    ...baseValid,
  });
  assert.equal(missingClassIds.success, false);
  assert.equal(missingClassIds.error.issues[0].path[0], 'class_ids');

  const validBulk = feeStructureFormSchema.safeParse({
    ...baseValid,
    class_ids: ['class-1', 'class-2', 'class-3'],
  });
  assert.equal(validBulk.success, true);
  if (validBulk.success) {
    assert.deepEqual(validBulk.data.class_ids, ['class-1', 'class-2', 'class-3']);
  }
});

test('feeStructureFormSchema: school level does not require class_id or class_ids', () => {
  const schoolFee = feeStructureFormSchema.safeParse({
    fee_level: 'SCHOOL',
    name: 'Campus Infrastructure',
    fee_category: 'MANAGEMENT',
    frequency: 'YEARLY',
    amount: 3000,
  });
  assert.equal(schoolFee.success, true);
});

test('filterAndSortCandidateAcademicYears filters current session and sorts descending', () => {
  const mockYears = [
    { id: 'ay-2079', name: '2079 BS', start_date: '2022-04-14' },
    { id: 'ay-2081', name: '2081 BS', start_date: '2024-04-13', is_current: true },
    { id: 'ay-2080', name: '2080 BS', start_date: '2023-04-14' },
  ];

  const candidates = filterAndSortCandidateAcademicYears(mockYears, 'ay-2081');
  assert.equal(candidates.length, 2);
  assert.equal(candidates[0].id, 'ay-2080');
  assert.equal(candidates[1].id, 'ay-2079');
});

test('filterAndSortCandidateAcademicYears handles empty or null array', () => {
  assert.deepEqual(filterAndSortCandidateAcademicYears([], 'ay-1'), []);
  assert.deepEqual(filterAndSortCandidateAcademicYears(null, 'ay-1'), []);
  assert.deepEqual(filterAndSortCandidateAcademicYears(undefined, 'ay-1'), []);
});

test('isCloneScopeValid validates scope checkboxes correctly', () => {
  assert.equal(
    isCloneScopeValid({ includeSchoolFees: true, includeClassFees: false, includeStudentPresets: false }),
    true
  );
  assert.equal(
    isCloneScopeValid({ includeSchoolFees: false, includeClassFees: true, includeStudentPresets: false }),
    true
  );
  assert.equal(
    isCloneScopeValid({ includeSchoolFees: false, includeClassFees: false, includeStudentPresets: true }),
    true
  );
  assert.equal(
    isCloneScopeValid({ includeSchoolFees: true, includeClassFees: true, includeStudentPresets: true }),
    true
  );
  assert.equal(
    isCloneScopeValid({ includeSchoolFees: false, includeClassFees: false, includeStudentPresets: false }),
    false
  );
});

test('formatCloneSampleText formats interactive sample preview text correctly', () => {
  const text10 = formatCloneSampleText(1000, 10, 10);
  assert.equal(
    text10,
    'Base fee of NPR 1,000 with +10% rounded to nearest 10 NPR → NPR 1,100'
  );

  const textExact = formatCloneSampleText(1000, 0, 0);
  assert.equal(
    textExact,
    'Base fee of NPR 1,000 with +0% rounded to exact → NPR 1,000'
  );

  const textNearestRe1 = formatCloneSampleText(1255, 5, 1);
  // 1255 * 1.05 = 1317.75 -> rounded to nearest 1 = 1318
  assert.equal(
    textNearestRe1,
    'Base fee of NPR 1,255 with +5% rounded to nearest Re 1 → NPR 1,318'
  );
});

test('PERCENTAGE_PRESETS and ROUNDING_OPTIONS verify preset values', () => {
  const pctValues = PERCENTAGE_PRESETS.map((p) => p.value);
  assert.deepEqual(pctValues, [0, 5, 10, 15]);

  const roundValues = ROUNDING_OPTIONS.map((r) => r.value);
  assert.deepEqual(roundValues, [0, 1, 10]);
});

test('computeSessionCloneBannerState: returns shouldShowBanner: false when isLoading is true', () => {
  const result = computeSessionCloneBannerState({
    totalFeeHeadsCount: 0,
    candidateYears: [{ id: 'ay-2081', name: '2081 BS' }],
    isLoading: true,
  });
  assert.deepEqual(result, {
    shouldShowBanner: false,
    hasPreviousSessions: false,
    totalFeeHeadsCount: 0,
  });
});

test('computeSessionCloneBannerState: empty session with candidate years returns shouldShowBanner: true and latestPreviousYearName', () => {
  const result = computeSessionCloneBannerState({
    totalFeeHeadsCount: 0,
    candidateYears: [
      { id: 'ay-2081', name: '2081 BS' },
      { id: 'ay-2080', name: '2080 BS' },
    ],
    isLoading: false,
  });
  assert.deepEqual(result, {
    shouldShowBanner: true,
    hasPreviousSessions: true,
    latestPreviousYearName: '2081 BS',
    totalFeeHeadsCount: 0,
  });
});

test('computeSessionCloneBannerState: empty session without candidate years (new school) returns shouldShowBanner: true, hasPreviousSessions: false, latestPreviousYearName: undefined', () => {
  const result = computeSessionCloneBannerState({
    totalFeeHeadsCount: 0,
    candidateYears: [],
    isLoading: false,
  });
  assert.deepEqual(result, {
    shouldShowBanner: true,
    hasPreviousSessions: false,
    latestPreviousYearName: undefined,
    totalFeeHeadsCount: 0,
  });
});

test('computeSessionCloneBannerState: session with fees returns shouldShowBanner: false', () => {
  const result = computeSessionCloneBannerState({
    totalFeeHeadsCount: 5,
    candidateYears: [{ id: 'ay-2081', name: '2081 BS' }],
    isLoading: false,
  });
  assert.deepEqual(result, {
    shouldShowBanner: false,
    hasPreviousSessions: true,
    latestPreviousYearName: '2081 BS',
    totalFeeHeadsCount: 5,
  });
});

test('parent fee bill payment receipt resolution: empty vs single vs installment receipts', () => {
  const unpaidBill = {
    id: 'b-1',
    bill_number: 'BILL-001',
    payments: [],
  };
  assert.equal((unpaidBill.payments || []).length, 0);

  const singlePaymentBill = {
    id: 'b-2',
    bill_number: 'BILL-002',
    payments: [
      {
        id: 'p-1',
        receipt_number: 'RCP-2082-001',
        amount_paid: 2500,
        payment_date: '2026-05-10',
        payment_method: 'CASH',
        created_at: '2026-05-10T10:00:00Z',
      },
    ],
  };
  assert.equal(singlePaymentBill.payments.length, 1);
  assert.equal(singlePaymentBill.payments[0].receipt_number, 'RCP-2082-001');

  const multiPaymentBill = {
    id: 'b-3',
    bill_number: 'BILL-003',
    payments: [
      { id: 'p-2', receipt_number: 'RCP-2082-002', amount_paid: 1500, payment_date: '2026-05-10', payment_method: 'CASH', created_at: '2026-05-10T10:00:00Z' },
      { id: 'p-3', receipt_number: 'RCP-2082-003', amount_paid: 1000, payment_date: '2026-05-20', payment_method: 'ESEWA', created_at: '2026-05-20T10:00:00Z' },
    ],
  };
  assert.equal(multiPaymentBill.payments.length, 2);
  const totalPaid = multiPaymentBill.payments.reduce((s, p) => s + p.amount_paid, 0);
  assert.equal(totalPaid, 2500);
});


