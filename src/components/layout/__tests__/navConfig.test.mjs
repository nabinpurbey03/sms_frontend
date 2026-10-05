import test from 'node:test';
import assert from 'node:assert/strict';
import { getNavItems } from '../navConfig.ts';
import { GraduationCap } from 'lucide-react';

function createMockCtx(overrides = {}) {
  return {
    isSuperAdmin: false,
    isTeacher: false,
    isParent: false,
    can: (perm) => perm === 'VIEW_SECTIONS_STUDENTS',
    activeTenantId: 'tenant-1',
    activeRole: 'ADMIN',
    ...overrides,
  };
}

test('navConfig includes Alumni Directory under Academics directly after Students Roster', () => {
  const ctx = createMockCtx();
  const items = getNavItems(ctx);

  const alumniItem = items.find((item) => item.href === '/academic/alumni');
  assert.ok(alumniItem, 'Alumni Directory item should be present in nav items');
  assert.equal(alumniItem.label, 'Alumni Directory');
  assert.equal(alumniItem.category, 'Academics');
  assert.equal(alumniItem.description, 'Historical records, graduation batches, and alumni transcripts.');
  assert.equal(alumniItem.icon, GraduationCap);
  assert.equal(alumniItem.show, true);

  const studentsRosterIndex = items.findIndex((item) => item.href === '/academic/students');
  const alumniIndex = items.findIndex((item) => item.href === '/academic/alumni');
  assert.ok(studentsRosterIndex !== -1, 'Students Roster item should exist');
  assert.equal(alumniIndex, studentsRosterIndex + 1, 'Alumni Directory must be directly after Students Roster');
});

test('Alumni Directory visibility conditions', () => {
  // Shown when user has VIEW_SECTIONS_STUDENTS and is not ACCOUNTANT
  const allowedCtx = createMockCtx({
    can: (perm) => perm === 'VIEW_SECTIONS_STUDENTS',
    activeRole: 'PRINCIPAL',
  });
  const allowedItem = getNavItems(allowedCtx).find((item) => item.href === '/academic/alumni');
  assert.equal(allowedItem?.show, true);

  // Hidden if missing permission
  const noPermCtx = createMockCtx({
    can: () => false,
    activeRole: 'PRINCIPAL',
  });
  const noPermItem = getNavItems(noPermCtx).find((item) => item.href === '/academic/alumni');
  assert.equal(noPermItem?.show, false);

  // Hidden if activeRole is ACCOUNTANT even with permission
  const accountantCtx = createMockCtx({
    can: () => true,
    activeRole: 'ACCOUNTANT',
  });
  const accountantItem = getNavItems(accountantCtx).find((item) => item.href === '/academic/alumni');
  assert.equal(accountantItem?.show, false);
});
