import test from 'node:test';
import assert from 'node:assert/strict';
import rawNepaliDate from 'nepali-date-converter';

const NepaliDate = rawNepaliDate.default || rawNepaliDate;
const pad = (n) => String(n).padStart(2, '0');

function getBsDaysInMonth(year, monthIndex) {
  for (let day = 32; day >= 29; day--) {
    try {
      const t = new NepaliDate(year, monthIndex, day);
      if (t.getMonth() === monthIndex) return day;
    } catch {
      continue;
    }
  }
  return 30;
}

function getBsMonthStartDayOfWeek(year, monthIndex) {
  const first = new NepaliDate(year, monthIndex, 1);
  return first.getDay();
}

function bsToAd(bsDateStr) {
  const [y, m, d] = bsDateStr.split('-').map(Number);
  const np = new NepaliDate(y, m - 1, d);
  const ad = np.toJsDate();
  return `${ad.getFullYear()}-${pad(ad.getMonth() + 1)}-${pad(ad.getDate())}`;
}

function getBsMonthDateRangeAd(year, monthIndex) {
  const days = getBsDaysInMonth(year, monthIndex);
  const startAd = bsToAd(`${year}-${pad(monthIndex + 1)}-01`);
  const endAd = bsToAd(`${year}-${pad(monthIndex + 1)}-${pad(days)}`);
  return { startAd, endAd };
}

function isBsMonthWithinBounds(year, monthIndex, minDate, maxDate) {
  const { startAd, endAd } = getBsMonthDateRangeAd(year, monthIndex);
  if (minDate && endAd < minDate) return false;
  if (maxDate && startAd > maxDate) return false;
  return true;
}

test('Ashwin 2082 BS calculation and Gregorian conversion', () => {
  const days = getBsDaysInMonth(2082, 5); // Ashwin is index 5
  assert.strictEqual(days, 31, 'Ashwin 2082 has 31 days');

  const startDayOfWeek = getBsMonthStartDayOfWeek(2082, 5);
  assert.strictEqual(startDayOfWeek, 3, 'Ashwin 1, 2082 starts on Wednesday (day 3)');

  const { startAd, endAd } = getBsMonthDateRangeAd(2082, 5);
  assert.strictEqual(startAd, '2025-09-17', 'Ashwin 1, 2082 is 2025-09-17');
  assert.strictEqual(endAd, '2025-10-17', 'Ashwin 31, 2082 is 2025-10-17');
});

test('Session bounds clamping for BS months', () => {
  const minDate = '2025-04-14'; // Baisakh 1, 2082
  const maxDate = '2026-04-13'; // Chaitra 30, 2082

  assert.strictEqual(isBsMonthWithinBounds(2082, 0, minDate, maxDate), true, 'Baisakh 2082 is in session');
  assert.strictEqual(isBsMonthWithinBounds(2082, 5, minDate, maxDate), true, 'Ashwin 2082 is in session');
  assert.strictEqual(isBsMonthWithinBounds(2081, 11, minDate, maxDate), false, 'Chaitra 2081 is before session');
  assert.strictEqual(isBsMonthWithinBounds(2083, 1, minDate, maxDate), false, 'Jestha 2083 is after session');
});
