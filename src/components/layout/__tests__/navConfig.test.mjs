import test from 'node:test';
import assert from 'node:assert/strict';
import { getNavItems } from '../navConfig.ts';

function createMockCtx(overrides = {}) {
  return {
    isSuperAdmin: false,
    isTeacher: false,
    isParent: false,
    can: (perm) => perm === 'VIEW_SECTIONS_STUDENTS' || perm === 'MANAGE_TENANT_SETTINGS',
    activeTenantId: 'tenant-1',
    activeRole: 'ADMIN',
    ...overrides,
  };
}

test('navConfig does not include Alumni Directory in sidebar navigation (kept inside analytics)', () => {
  const ctx = createMockCtx();
  const items = getNavItems(ctx);

  const alumniItem = items.find((item) => item.href === '/academic/alumni');
  assert.equal(alumniItem, undefined, 'Alumni Directory should not be exposed in main sidebar');

  const studentsRoster = items.find((item) => item.href === '/academic/students');
  assert.ok(studentsRoster, 'Students Roster item should exist');

  const analytics = items.find((item) => item.href === '/academic/analytics');
  assert.ok(analytics, 'Analytics item should exist under Academics');
});
