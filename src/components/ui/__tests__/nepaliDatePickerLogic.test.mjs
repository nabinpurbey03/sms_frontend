import test from 'node:test';
import assert from 'node:assert/strict';
import rawNepaliDate from 'nepali-date-converter';

const NepaliDate = rawNepaliDate.default || rawNepaliDate;
const pad = (n) => String(n).padStart(2, '0');

function adToBs(adStr) {
  const [y, m, d] = adStr.split('-').map(Number);
  const np = new NepaliDate(new Date(y, m - 1, d));
  return `${np.getYear()}-${pad(np.getMonth() + 1)}-${pad(np.getDate())}`;
}

function bsToAd(bsStr) {
  const [y, m, d] = bsStr.split('-').map(Number);
  const np = new NepaliDate(y, m - 1, d);
  const ad = np.toJsDate();
  return `${ad.getFullYear()}-${pad(ad.getMonth() + 1)}-${pad(ad.getDate())}`;
}

test('Round-trip conversion consistency', () => {
  const testAd = '2025-10-01';
  const bs = adToBs(testAd);
  assert.strictEqual(bs, '2082-06-15', '2025-10-01 converts to 2082-06-15 BS');
  const convertedBack = bsToAd(bs);
  assert.strictEqual(convertedBack, testAd, 'Converts back to original AD');
});
