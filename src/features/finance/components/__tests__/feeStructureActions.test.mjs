import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Determines whether the action button should be 'deactivate' or 'reactivate'
 * based on the fee head active status.
 *
 * @param {{ is_active?: boolean } | null | undefined} fee
 * @returns {'deactivate' | 'reactivate'}
 */
export function getFeeHeadAction(fee) {
  if (!fee) return 'reactivate';
  return fee.is_active ? 'deactivate' : 'reactivate';
}

test('getFeeHeadAction returns "deactivate" when fee is active', () => {
  assert.equal(getFeeHeadAction({ id: 'fee-1', name: 'Tuition Fee', is_active: true }), 'deactivate');
  assert.equal(getFeeHeadAction({ is_active: true }), 'deactivate');
});

test('getFeeHeadAction returns "reactivate" when fee is inactive', () => {
  assert.equal(getFeeHeadAction({ id: 'fee-2', name: 'Lab Fee', is_active: false }), 'reactivate');
  assert.equal(getFeeHeadAction({ is_active: false }), 'reactivate');
});

test('getFeeHeadAction handles edge cases with falsy or missing is_active', () => {
  assert.equal(getFeeHeadAction({ is_active: undefined }), 'reactivate');
  assert.equal(getFeeHeadAction({ is_active: null }), 'reactivate');
  assert.equal(getFeeHeadAction(null), 'reactivate');
  assert.equal(getFeeHeadAction(undefined), 'reactivate');
});
