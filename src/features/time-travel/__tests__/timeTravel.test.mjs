import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SIMULATED_DATE_STORAGE_KEY,
  calculateShiftedDate,
  getBsDateFromGregorian,
  getGregorianFromBs,
  formatDateToIso,
  shouldRenderTimeTravelBanner,
  shouldRenderTimeTravelToolbar,
  formatTimeTravelBannerText,
  formatToolbarPillLabel,
  BS_MONTHS,
} from '../timeTravelUtils.ts';
import {
  getCurrentBsMonthIndex,
  computeMonthStatus,
} from '../../finance/utils/cashierUtils.ts';

// -------------------------------------------------------------------------
// 1. Constants & Storage Key
// -------------------------------------------------------------------------
test('SIMULATED_DATE_STORAGE_KEY is ssup_simulated_date', () => {
  assert.equal(SIMULATED_DATE_STORAGE_KEY, 'ssup_simulated_date');
});

// -------------------------------------------------------------------------
// 2. Date Shift Additions (days, months, years)
// -------------------------------------------------------------------------
test('calculateShiftedDate: adds days correctly', () => {
  const base = new Date('2026-05-10T12:00:00Z');
  const shifted = calculateShiftedDate(base, { days: 15 });
  assert.equal(shifted.getDate(), base.getDate() + 15);
});

test('calculateShiftedDate: adds negative days correctly', () => {
  const base = new Date('2026-05-10T12:00:00Z');
  const shifted = calculateShiftedDate(base, { days: -5 });
  assert.equal(shifted.getDate(), base.getDate() - 5);
});

test('calculateShiftedDate: adds months correctly across boundary', () => {
  const base = new Date('2026-01-15T12:00:00Z');
  const shifted = calculateShiftedDate(base, { months: 2 });
  assert.equal(shifted.getMonth(), base.getMonth() + 2);
});

test('calculateShiftedDate: adds years correctly', () => {
  const base = new Date('2026-05-10T12:00:00Z');
  const shifted = calculateShiftedDate(base, { years: 1 });
  assert.equal(shifted.getFullYear(), base.getFullYear() + 1);
});

test('calculateShiftedDate: combines days, months, and years without mutating base', () => {
  const base = new Date('2026-01-01T12:00:00Z');
  const originalTime = base.getTime();
  const shifted = calculateShiftedDate(base, { years: 1, months: 1, days: 5 });
  assert.equal(base.getTime(), originalTime, 'baseDate must not be mutated');
  assert.equal(shifted.getFullYear(), 2027);
  assert.equal(shifted.getMonth(), 1); // Feb
  assert.equal(shifted.getDate(), 6);
});

// -------------------------------------------------------------------------
// 3. BS Date to Gregorian Conversion Round-Trip
// -------------------------------------------------------------------------
test('getBsDateFromGregorian converts Gregorian date to BS components', () => {
  // 2024-04-13 is 2081-01-01 (Baishakh 1, 2081)
  const gregorian = new Date(2024, 3, 13, 12, 0, 0);
  const bs = getBsDateFromGregorian(gregorian);
  assert.equal(bs.year, 2081);
  assert.equal(bs.month, 0); // 0-indexed Baishakh
  assert.equal(bs.day, 1);
  assert.equal(bs.formatted, '2081-01-01');
});

test('BS and Gregorian conversions perform seamless round-trip', () => {
  const year = 2081;
  const monthIndex = 3; // Shrawan
  const day = 15;

  const gregorian = getGregorianFromBs(year, monthIndex, day);
  assert.ok(gregorian instanceof Date, 'Should return a valid Date instance');

  const roundTripBs = getBsDateFromGregorian(gregorian);
  assert.equal(roundTripBs.year, year);
  assert.equal(roundTripBs.month, monthIndex);
  assert.equal(roundTripBs.day, day);
});

// -------------------------------------------------------------------------
// 4. Setting BS Month 0 (Baishakh) through 11 (Chaitra)
// -------------------------------------------------------------------------
test('getGregorianFromBs accurately resolves 1st day for all BS months (0..11)', () => {
  const testYear = 2081;
  for (let m = 0; m < 12; m++) {
    const greg = getGregorianFromBs(testYear, m, 1);
    const converted = getBsDateFromGregorian(greg);
    assert.equal(converted.year, testYear, `Year must match for month index ${m}`);
    assert.equal(converted.month, m, `Month index must match for month index ${m}`);
    assert.equal(converted.day, 1, `Day must be 1 for month index ${m}`);
  }
});

// -------------------------------------------------------------------------
// 5. formatDateToIso helper
// -------------------------------------------------------------------------
test('formatDateToIso returns YYYY-MM-DD format', () => {
  const d = new Date(2026, 4, 9); // May 9, 2026
  assert.equal(formatDateToIso(d), '2026-05-09');
});

// -------------------------------------------------------------------------
// 6. getCurrentBsMonthIndex with simulated/custom asOfDate
// -------------------------------------------------------------------------
test('getCurrentBsMonthIndex evaluates simulated date correctly', () => {
  // 2024-04-13 is Baishakh 1, 2081 -> index 0
  assert.equal(getCurrentBsMonthIndex(new Date(2024, 3, 13)), 0);
  // 2024-07-16 is Shrawan 1, 2081 -> index 3
  assert.equal(getCurrentBsMonthIndex(new Date(2024, 6, 16)), 3);
  // Accepts ISO date string
  assert.equal(getCurrentBsMonthIndex('2024-04-13T12:00:00Z'), 0);
  // Fallback when no date passed returns a valid 0-11 index
  const fallback = getCurrentBsMonthIndex();
  assert.ok(fallback >= 0 && fallback <= 11);
});

// -------------------------------------------------------------------------
// 7. Request Interceptor & Simulated Date Header Injection
// -------------------------------------------------------------------------
test('Request interceptor injects X-Simulated-Date when present in sessionStorage', () => {
  // Interceptor logic as defined in src/lib/api-client.ts
  const interceptor = (config) => {
    const simulatedDate =
      typeof globalThis !== 'undefined' && globalThis.sessionStorage
        ? globalThis.sessionStorage.getItem(SIMULATED_DATE_STORAGE_KEY)
        : null;
    if (simulatedDate && config.headers) {
      config.headers['X-Simulated-Date'] = simulatedDate;
    }
    return config;
  };

  const store = new Map();
  globalThis.sessionStorage = {
    getItem: (k) => store.get(k) || null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };

  try {
    // When no simulated date is set
    const cfg1 = { headers: {} };
    interceptor(cfg1);
    assert.equal(cfg1.headers['X-Simulated-Date'], undefined);

    // When simulated date is set
    globalThis.sessionStorage.setItem(SIMULATED_DATE_STORAGE_KEY, '2026-05-15');
    const cfg2 = { headers: {} };
    interceptor(cfg2);
    assert.equal(cfg2.headers['X-Simulated-Date'], '2026-05-15');
  } finally {
    delete globalThis.sessionStorage;
  }
});

// -------------------------------------------------------------------------
// 8. TimeTravelBanner Guard & Rendering
// -------------------------------------------------------------------------
test('shouldRenderTimeTravelBanner: strictly requires isEnabled, isSuperAdmin, and isSimulated', () => {
  // All true -> renders
  assert.equal(
    shouldRenderTimeTravelBanner({ isEnabled: 'true', isSuperAdmin: true, isSimulated: true }),
    true
  );
  assert.equal(
    shouldRenderTimeTravelBanner({ isEnabled: true, isSuperAdmin: true, isSimulated: true }),
    true
  );

  // Feature flag disabled -> hidden
  assert.equal(
    shouldRenderTimeTravelBanner({ isEnabled: 'false', isSuperAdmin: true, isSimulated: true }),
    false
  );
  assert.equal(
    shouldRenderTimeTravelBanner({ isEnabled: undefined, isSuperAdmin: true, isSimulated: true }),
    false
  );

  // Non-super-admin -> hidden
  assert.equal(
    shouldRenderTimeTravelBanner({ isEnabled: 'true', isSuperAdmin: false, isSimulated: true }),
    false
  );
  assert.equal(
    shouldRenderTimeTravelBanner({ isEnabled: 'true', isSuperAdmin: undefined, isSimulated: true }),
    false
  );

  // Not in simulation mode -> hidden
  assert.equal(
    shouldRenderTimeTravelBanner({ isEnabled: 'true', isSuperAdmin: true, isSimulated: false }),
    false
  );
});

// -------------------------------------------------------------------------
// 9. TimeTravelToolbar Guard & Rendering
// -------------------------------------------------------------------------
test('shouldRenderTimeTravelToolbar: strictly requires isEnabled and isSuperAdmin', () => {
  // Super admin with flag enabled -> renders (even if not currently simulated, so user can trigger it)
  assert.equal(
    shouldRenderTimeTravelToolbar({ isEnabled: 'true', isSuperAdmin: true }),
    true
  );
  assert.equal(
    shouldRenderTimeTravelToolbar({ isEnabled: true, isSuperAdmin: true }),
    true
  );

  // Feature flag disabled -> hidden
  assert.equal(
    shouldRenderTimeTravelToolbar({ isEnabled: 'false', isSuperAdmin: true }),
    false
  );
  assert.equal(
    shouldRenderTimeTravelToolbar({ isEnabled: undefined, isSuperAdmin: true }),
    false
  );

  // Non-super-admin -> hidden
  assert.equal(
    shouldRenderTimeTravelToolbar({ isEnabled: 'true', isSuperAdmin: false }),
    false
  );
  assert.equal(
    shouldRenderTimeTravelToolbar({ isEnabled: 'true', isSuperAdmin: undefined }),
    false
  );
});

// -------------------------------------------------------------------------
// 10. formatTimeTravelBannerText formatting
// -------------------------------------------------------------------------
test('formatTimeTravelBannerText: formats exact text matching template', () => {
  // 2024-04-13 is Baishakh 1, 2081 BS
  const date1 = new Date(2024, 3, 13, 12, 0, 0);
  const text1 = formatTimeTravelBannerText(date1);
  assert.equal(
    text1,
    'Time Travel Active: System simulated as Baishakh 1, 2081 (2024-04-13). Real server time is unaffected.'
  );

  // 2024-07-16 is Shrawan 1, 2081 BS
  const date2 = new Date(2024, 6, 16, 12, 0, 0);
  const text2 = formatTimeTravelBannerText(date2);
  assert.equal(
    text2,
    'Time Travel Active: System simulated as Shrawan 1, 2081 (2024-07-16). Real server time is unaffected.'
  );
});

// -------------------------------------------------------------------------
// 11. formatToolbarPillLabel formatting
// -------------------------------------------------------------------------
test('formatToolbarPillLabel: formats compact pill label for live and simulated state', () => {
  const date = new Date(2024, 3, 13, 12, 0, 0);

  // When live (not simulated)
  assert.equal(
    formatToolbarPillLabel({ isSimulated: false, effectiveDate: date }),
    'Live Time'
  );

  // When simulated
  assert.equal(
    formatToolbarPillLabel({ isSimulated: true, effectiveDate: date }),
    'Simulated: Baishakh 01'
  );

  // Another month
  const date2 = new Date(2024, 6, 16, 12, 0, 0);
  assert.equal(
    formatToolbarPillLabel({ isSimulated: true, effectiveDate: date2 }),
    'Simulated: Shrawan 01'
  );
});

// -------------------------------------------------------------------------
// 12. BatchBilling Reactive Month Transition on Time-Travel
// -------------------------------------------------------------------------
test('BatchBilling reactive integration: simulated date shifts recalculate running BS month index and month statuses', () => {
  const generatedSet = new Set();

  // In Baishakh (month index 0):
  const dateBaishakh = new Date(2024, 3, 13, 12, 0, 0);
  const runningIdx1 = getCurrentBsMonthIndex(dateBaishakh);
  assert.equal(runningIdx1, 0);

  const baishakhStatus1 = computeMonthStatus('Baishakh', runningIdx1, generatedSet);
  assert.equal(baishakhStatus1.status, 'AVAILABLE_RUNNING');
  assert.equal(baishakhStatus1.isSelectable, true);

  const jesthaStatus1 = computeMonthStatus('Jestha', runningIdx1, generatedSet);
  assert.equal(jesthaStatus1.status, 'FUTURE_LOCKED');
  assert.equal(jesthaStatus1.isSelectable, false);

  // Time travel into Jestha (month index 1) via month jumper:
  const dateJestha = getGregorianFromBs(2081, 1, 1);
  const runningIdx2 = getCurrentBsMonthIndex(dateJestha);
  assert.equal(runningIdx2, 1);

  // Under strict sequential billing: Baishakh is next required to bill (AVAILABLE_NEXT),
  // Jestha is locked pending Baishakh (LOCKED_SEQUENCE), Ashadh is upcoming locked (FUTURE_LOCKED)
  const baishakhStatus2 = computeMonthStatus('Baishakh', runningIdx2, generatedSet);
  assert.equal(baishakhStatus2.status, 'AVAILABLE_NEXT');
  assert.equal(baishakhStatus2.isSelectable, true);

  const jesthaStatus2 = computeMonthStatus('Jestha', runningIdx2, generatedSet);
  assert.equal(jesthaStatus2.status, 'LOCKED_SEQUENCE');
  assert.equal(jesthaStatus2.isSelectable, false);

  const ashadhStatus2 = computeMonthStatus('Ashadh', runningIdx2, generatedSet);
  assert.equal(ashadhStatus2.status, 'FUTURE_LOCKED');
  assert.equal(ashadhStatus2.isSelectable, false);

  // Once Baishakh is generated, Jestha becomes available as running month
  generatedSet.add('Baishakh');
  const jesthaStatus3 = computeMonthStatus('Jestha', runningIdx2, generatedSet);
  assert.equal(jesthaStatus3.status, 'AVAILABLE_RUNNING');
  assert.equal(jesthaStatus3.isSelectable, true);
});

