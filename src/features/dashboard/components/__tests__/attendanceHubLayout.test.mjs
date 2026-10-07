import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Helper to determine action rendering for a section card
export function getSectionCardActionMeta(sec) {
  if (sec.isMarked) {
    return { type: 'badge', status: 'RECORDED', label: 'Recorded', showButton: false };
  }
  if (sec.totalStudents === 0) {
    return { type: 'badge', status: 'EMPTY', label: 'Empty Section', showButton: false };
  }
  return { type: 'action', status: 'PENDING', label: 'Mark', showButton: true };
}

// Helper to calculate rolling 7-day date window for time series
export function getRollingSevenDayWindow(baseDateStr) {
  const base = new Date(baseDateStr);
  const start = new Date(base);
  start.setDate(start.getDate() - 7);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: baseDateStr,
  };
}

describe('Attendance Hub Layout & Section Roster Logic', () => {
  it('correctly suppresses Mark button and returns EMPTY badge for 0-student sections', () => {
    const emptySection = {
      sectionId: 'sec-1',
      sectionName: 'A',
      className: 'Grade 1',
      totalStudents: 0,
      presentCount: 0,
      absentCount: 0,
      isMarked: false,
    };
    const meta = getSectionCardActionMeta(emptySection);
    assert.equal(meta.status, 'EMPTY');
    assert.equal(meta.label, 'Empty Section');
    assert.equal(meta.showButton, false, 'Empty sections must never render a Mark button');
  });

  it('renders Recorded badge and suppresses button for marked sections', () => {
    const markedSection = {
      sectionId: 'sec-2',
      sectionName: 'B',
      className: 'Grade 1',
      totalStudents: 25,
      presentCount: 24,
      absentCount: 1,
      isMarked: true,
    };
    const meta = getSectionCardActionMeta(markedSection);
    assert.equal(meta.status, 'RECORDED');
    assert.equal(meta.showButton, false);
  });

  it('renders Mark button for pending sections with enrolled students', () => {
    const pendingSection = {
      sectionId: 'sec-3',
      sectionName: 'C',
      className: 'Grade 2',
      totalStudents: 22,
      presentCount: 0,
      absentCount: 0,
      isMarked: false,
    };
    const meta = getSectionCardActionMeta(pendingSection);
    assert.equal(meta.status, 'PENDING');
    assert.equal(meta.showButton, true);
  });

  it('calculates exact 7-day rolling date range window', () => {
    const window = getRollingSevenDayWindow('2026-10-07');
    assert.equal(window.endDate, '2026-10-07');
    assert.equal(window.startDate, '2026-09-30');
  });
});
