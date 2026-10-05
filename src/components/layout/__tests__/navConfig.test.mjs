import test from 'node:test';
import assert from 'node:assert/strict';
import { getNavItems, isNavItemActive, getBreadcrumbs } from '../navConfig.ts';

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

test('navConfig includes Invoice Generation under Finance category for users with VIEW_FINANCE', () => {
  const financeCtx = createMockCtx({
    can: (perm) => perm === 'VIEW_FINANCE',
  });
  const items = getNavItems(financeCtx);

  const invoiceGenItem = items.find((item) => item.href === '/finance/batch-billing');
  assert.ok(invoiceGenItem, 'Invoice Generation item should exist');
  assert.equal(invoiceGenItem.label, 'Invoice Generation');
  assert.equal(invoiceGenItem.category, 'Finance');
  assert.equal(invoiceGenItem.show, true);

  // Hidden for parent
  const parentCtx = createMockCtx({
    isParent: true,
    can: (perm) => perm === 'VIEW_FINANCE',
  });
  const parentItems = getNavItems(parentCtx);
  const parentInvoiceGen = parentItems.find((item) => item.href === '/finance/batch-billing');
  assert.equal(parentInvoiceGen?.show, false, 'Invoice Generation should be hidden for parent');

  // Hidden when lacking permission
  const noPermCtx = createMockCtx({
    can: () => false,
  });
  const noPermItems = getNavItems(noPermCtx);
  const noPermInvoiceGen = noPermItems.find((item) => item.href === '/finance/batch-billing');
  assert.equal(noPermInvoiceGen?.show, false, 'Invoice Generation should be hidden when lacking VIEW_FINANCE');
});

test('isNavItemActive activates Bills & Invoices for /finance/ledger routes', () => {
  assert.equal(isNavItemActive('/finance/ledger/student-123', '/finance/bills'), true);
  assert.equal(isNavItemActive('/finance/bills', '/finance/bills'), true);
  assert.equal(isNavItemActive('/finance/batch-billing', '/finance/bills'), false);
});

test('getBreadcrumbs resolves Finance > Bills & Invoices > Student Ledger for student ledger paths', () => {
  const financeCtx = createMockCtx({
    can: (perm) => perm === 'VIEW_FINANCE',
  });
  const items = getNavItems(financeCtx);

  const crumbs = getBreadcrumbs('/finance/ledger/student-999', items);
  assert.equal(crumbs.length, 3);
  assert.equal(crumbs[0].label, 'Finance');
  assert.equal(crumbs[1].label, 'Bills & Invoices');
  assert.equal(crumbs[1].href, '/finance/bills');
  assert.equal(crumbs[2].label, 'Student Ledger');
});


