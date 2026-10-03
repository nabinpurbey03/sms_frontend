import test from 'node:test';
import assert from 'node:assert/strict';

export function getUpcomingBsYearOptions(currentBsYear, count = 4) {
  return Array.from({ length: count }, (_, i) => currentBsYear + i);
}

test('getUpcomingBsYearOptions generates sequential BS years', () => {
  const options = getUpcomingBsYearOptions(2081, 4);
  assert.deepEqual(options, [2081, 2082, 2083, 2084]);
});
