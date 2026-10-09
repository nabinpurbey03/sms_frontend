import test from 'node:test';
import assert from 'node:assert/strict';
import { isNavItemActive, getBreadcrumbs, getNavItems } from '../../../../components/layout/navConfig.ts';

test('isNavItemActive activates Alumni Clearance for /finance/alumni-clearance path', () => {
  assert.equal(isNavItemActive('/finance/alumni-clearance', '/finance/alumni-clearance'), true);
  assert.equal(isNavItemActive('/finance/bills', '/finance/alumni-clearance'), false);
  assert.equal(isNavItemActive('/finance/alumni-clearance', '/finance/bills'), false);
});

test('getNavItems includes Alumni Clearance under Finance category for users with VIEW_FINANCE', () => {
  const mockCtx = {
    isSuperAdmin: false,
    isTeacher: false,
    isParent: false,
    can: (perm) => perm === 'VIEW_FINANCE',
    activeTenantId: 'tenant-1',
    activeRole: 'ADMIN',
  };

  const items = getNavItems(mockCtx);
  const alumniClearanceItem = items.find((item) => item.href === '/finance/alumni-clearance');

  assert.ok(alumniClearanceItem, 'Alumni Clearance should exist in navigation');
  assert.equal(alumniClearanceItem.label, 'Alumni Clearance');
  assert.equal(alumniClearanceItem.category, 'Finance');
  assert.equal(alumniClearanceItem.show, true);
});

test('getBreadcrumbs resolves Finance > Alumni Clearance for /finance/alumni-clearance', () => {
  const mockCtx = {
    isSuperAdmin: false,
    isTeacher: false,
    isParent: false,
    can: (perm) => perm === 'VIEW_FINANCE',
    activeTenantId: 'tenant-1',
    activeRole: 'ADMIN',
  };

  const items = getNavItems(mockCtx);
  const crumbs = getBreadcrumbs('/finance/alumni-clearance', items);

  assert.equal(crumbs.length, 2);
  assert.equal(crumbs[0].label, 'Finance');
  assert.equal(crumbs[1].label, 'Alumni Clearance');
  assert.equal(crumbs[1].href, '/finance/alumni-clearance');
});

test('Alumni clearance status derivation logic evaluates due balance and status flag', () => {
  function deriveClearanceStatus(item) {
    const due = Number(item.total_due || 0);
    if (item.clearance_status === 'CLEARED' || due <= 0) {
      return { status: 'CLEARED', isCleared: true, badge: 'Cleared' };
    }
    return { status: 'PENDING_CLEARANCE', isCleared: false, badge: 'Pending Clearance' };
  }

  const clearedStudent = {
    student_id: 's-1',
    first_name: 'Aarav',
    last_name: 'Sharma',
    total_billed: '50000.00',
    total_paid: '50000.00',
    total_due: '0.00',
    clearance_status: 'CLEARED',
  };

  const pendingStudent = {
    student_id: 's-2',
    first_name: 'Bina',
    last_name: 'Rai',
    total_billed: '50000.00',
    total_paid: '42000.00',
    total_due: '8000.00',
    clearance_status: 'PENDING_CLEARANCE',
  };

  const clearedRes = deriveClearanceStatus(clearedStudent);
  assert.equal(clearedRes.status, 'CLEARED');
  assert.equal(clearedRes.isCleared, true);

  const pendingRes = deriveClearanceStatus(pendingStudent);
  assert.equal(pendingRes.status, 'PENDING_CLEARANCE');
  assert.equal(pendingRes.isCleared, false);
});
