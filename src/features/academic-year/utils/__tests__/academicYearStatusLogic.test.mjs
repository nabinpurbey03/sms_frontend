import test from 'node:test';
import assert from 'node:assert/strict';

export function shouldShowExpiryPrompt({ isExpired, userRole, hasNextYear }) {
  const allowedRoles = ['ADMIN', 'OFFICE_ADMIN'];
  return Boolean(isExpired && allowedRoles.includes(userRole) && hasNextYear);
}

export function formatAcademicYearElapsed(days) {
  if (days <= 0) return 'ended today';
  if (days === 1) return 'ended yesterday';
  return `ended ${days} days ago`;
}

test('shouldShowExpiryPrompt returns true only for admins when year is expired and next year exists', () => {
  assert.equal(shouldShowExpiryPrompt({ isExpired: true, userRole: 'ADMIN', hasNextYear: true }), true);
  assert.equal(shouldShowExpiryPrompt({ isExpired: true, userRole: 'OFFICE_ADMIN', hasNextYear: true }), true);
  assert.equal(shouldShowExpiryPrompt({ isExpired: true, userRole: 'TEACHER', hasNextYear: true }), false);
  assert.equal(shouldShowExpiryPrompt({ isExpired: false, userRole: 'ADMIN', hasNextYear: true }), false);
  assert.equal(shouldShowExpiryPrompt({ isExpired: true, userRole: 'ADMIN', hasNextYear: false }), false);
});

test('formatAcademicYearElapsed formats days correctly', () => {
  assert.equal(formatAcademicYearElapsed(0), 'ended today');
  assert.equal(formatAcademicYearElapsed(1), 'ended yesterday');
  assert.equal(formatAcademicYearElapsed(5), 'ended 5 days ago');
});
