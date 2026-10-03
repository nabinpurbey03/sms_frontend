import test from 'node:test';
import assert from 'node:assert/strict';

export function shouldShowBanner(status, canManage) {
  if (!canManage) return false;
  if (!status) return false;
  return Boolean(status.is_expired && status.next_year);
}

test('shouldShowBanner requires canManage, is_expired, and next_year', () => {
  assert.equal(shouldShowBanner({ is_expired: true, next_year: { id: '1' } }, true), true);
  assert.equal(shouldShowBanner({ is_expired: true, next_year: { id: '1' } }, false), false);
  assert.equal(shouldShowBanner({ is_expired: false, next_year: { id: '1' } }, true), false);
  assert.equal(shouldShowBanner({ is_expired: true, next_year: null }, true), false);
  assert.equal(shouldShowBanner(null, true), false);
  assert.equal(shouldShowBanner(undefined, true), false);
  assert.equal(shouldShowBanner({ is_expired: true, next_year: { id: '1' } }, undefined), false);
});
