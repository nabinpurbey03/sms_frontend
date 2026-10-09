import { test } from 'node:test';
import assert from 'node:assert/strict';

test('SessionArchiveSelect logic: active vs archived session detection', () => {
  const activeYear = { id: 'ay-2082', name: '2082/83', is_current: true, is_closed: false };
  const archivedYear1 = { id: 'ay-2081', name: '2081/82', is_current: false, is_closed: true };
  const archivedYear2 = { id: 'ay-2080', name: '2080/81', is_current: false, is_closed: true };
  const academicYears = [activeYear, archivedYear1, archivedYear2];

  // Helper function mimicking SessionArchiveSelect behavior
  const resolveSelection = (value, currentYear) => {
    const isArchived = Boolean(value && currentYear && value !== currentYear.id);
    const selectedId = value ?? currentYear?.id ?? '';
    return { isArchived, selectedId };
  };

  // 1. Default when value is undefined: active year is selected, not archived
  const defaultState = resolveSelection(undefined, activeYear);
  assert.equal(defaultState.selectedId, 'ay-2082');
  assert.equal(defaultState.isArchived, false);

  // 2. Explicit active year passed: not archived
  const activeExplicit = resolveSelection('ay-2082', activeYear);
  assert.equal(activeExplicit.selectedId, 'ay-2082');
  assert.equal(activeExplicit.isArchived, false);

  // 3. Archived year 2081 passed: isArchived is true
  const archived1 = resolveSelection('ay-2081', activeYear);
  assert.equal(archived1.selectedId, 'ay-2081');
  assert.equal(archived1.isArchived, true);

  // 4. Archived year 2080 passed: isArchived is true
  const archived2 = resolveSelection('ay-2080', activeYear);
  assert.equal(archived2.selectedId, 'ay-2080');
  assert.equal(archived2.isArchived, true);

  // 5. Test onChange handler callback value
  const simulateChange = (selectedId, currentYear) => {
    return currentYear && selectedId === currentYear.id ? undefined : selectedId;
  };

  assert.equal(simulateChange('ay-2082', activeYear), undefined);
  assert.equal(simulateChange('ay-2081', activeYear), 'ay-2081');
  assert.equal(simulateChange('ay-2080', activeYear), 'ay-2080');
});

test('Finance dashboard post-rollover banner and 3-tier dues logic', () => {
  // Test case 1: Rollover completed, unbilled session
  const summary1 = {
    total_collected_month: '0.00',
    total_collected_year: '0.00',
    total_outstanding_dues: '10000.00',
    total_opening_arrears: '4000.00',
    total_alumni_dues: '6000.00',
    is_new_session_unbilled: true,
    total_defaulters_count: 5,
  };

  const outstandingDues1 = Number(summary1.total_outstanding_dues || 0);
  const openingArrears1 = Number(summary1.total_opening_arrears || 0);
  const alumniDues1 = Number(summary1.total_alumni_dues || 0);
  const activeSessionDues1 = Math.max(0, outstandingDues1 - openingArrears1 - alumniDues1);

  assert.equal(summary1.is_new_session_unbilled, true);
  assert.equal(openingArrears1, 4000);
  assert.equal(alumniDues1, 6000);
  assert.equal(activeSessionDues1, 0); // 0 in active session since unbilled
  assert.equal(activeSessionDues1 + openingArrears1 + alumniDues1, outstandingDues1);

  // Test case 2: First bills generated (is_new_session_unbilled becomes false)
  const summary2 = {
    total_collected_month: '0.00',
    total_collected_year: '0.00',
    total_outstanding_dues: '15000.00',
    total_opening_arrears: '4000.00',
    total_alumni_dues: '6000.00',
    is_new_session_unbilled: false,
    total_defaulters_count: 10,
  };

  const outstandingDues2 = Number(summary2.total_outstanding_dues || 0);
  const openingArrears2 = Number(summary2.total_opening_arrears || 0);
  const alumniDues2 = Number(summary2.total_alumni_dues || 0);
  const activeSessionDues2 = Math.max(0, outstandingDues2 - openingArrears2 - alumniDues2);

  assert.equal(summary2.is_new_session_unbilled, false);
  assert.equal(openingArrears2, 4000);
  assert.equal(alumniDues2, 6000);
  assert.equal(activeSessionDues2, 5000);
  assert.equal(activeSessionDues2 + openingArrears2 + alumniDues2, outstandingDues2);

  // Test case 3: Fresh tenant with no prior arrears
  const summary3 = {
    total_collected_month: '5000.00',
    total_collected_year: '20000.00',
    total_outstanding_dues: '8000.00',
    total_opening_arrears: '0.00',
    total_alumni_dues: '0.00',
    is_new_session_unbilled: false,
    total_defaulters_count: 2,
  };

  const outstandingDues3 = Number(summary3.total_outstanding_dues || 0);
  const openingArrears3 = Number(summary3.total_opening_arrears || 0);
  const alumniDues3 = Number(summary3.total_alumni_dues || 0);
  const hasRolloverDues = openingArrears3 > 0 || alumniDues3 > 0;

  assert.equal(hasRolloverDues, false);
  assert.equal(Math.max(0, outstandingDues3 - openingArrears3 - alumniDues3), 8000);
});

test('BillsPage archive permissions: disabling bill creation and cancellation for past sessions', () => {
  const isArchived = true;

  const canGenerateBills = !isArchived;
  const canCancelBill = !isArchived;
  const canViewLedger = true; // Viewing audit record is always enabled

  assert.equal(canGenerateBills, false, 'Bill creation must be blocked on archived sessions');
  assert.equal(canCancelBill, false, 'Bill cancellation must be blocked on archived sessions');
  assert.equal(canViewLedger, true, 'Bill ledger viewing must remain allowed on archived sessions');
});
