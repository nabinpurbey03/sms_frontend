import test from 'node:test';
import assert from 'node:assert/strict';

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
