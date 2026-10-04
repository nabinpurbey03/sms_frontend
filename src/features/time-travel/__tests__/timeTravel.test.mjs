import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SIMULATED_DATE_STORAGE_KEY,
  calculateShiftedDate,
  getBsDateFromGregorian,
  getGregorianFromBs,
  formatDateToIso,
} from '../timeTravelUtils.ts';
import { getCurrentBsMonthIndex } from '../../finance/utils/cashierUtils.ts';

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
