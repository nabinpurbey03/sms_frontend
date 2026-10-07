import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Pure helper functions mirroring the logic in AttendanceDashboardHub
 */
export function filterActiveSections(sections) {
  return sections.filter((s) => s.totalStudents > 0);
}

export function computePendingSectionsCount(activeSections) {
  return activeSections.filter((s) => !s.isMarked).length;
}

export function computeRecordedSectionsCount(activeSections) {
  return activeSections.filter((s) => s.isMarked).length;
}

export function getSectionAttendanceBadgeMeta(section) {
  if (section.isMarked) {
    return {
      status: 'RECORDED',
      badgeText: 'Recorded',
      canMark: true,
      actionText: 'Update',
    };
  }
  if (section.totalStudents === 0) {
    return {
      status: 'EMPTY',
      badgeText: 'Empty (0 Students)',
      canMark: false,
      tooltip: 'No students enrolled in this section',
      actionText: 'Mark',
    };
  }
  return {
    status: 'PENDING',
    badgeText: 'Pending',
    canMark: true,
    actionText: 'Mark',
  };
}

export function calculateAttendanceHubMetrics({ activeSectionsList, markedSectionsCount }) {
  const totalSectionsCount = activeSectionsList.length;
  const complianceRate = totalSectionsCount > 0
    ? Math.round((markedSectionsCount / totalSectionsCount) * 100)
    : 0;

  return {
    totalSectionsCount,
    markedSectionsCount,
    complianceRate,
  };
}

test('Active section filtering and pending section counting', () => {
  const sections = [
    { sectionId: 'sec-a', className: 'Grade 10', sectionName: 'A', totalStudents: 20, isMarked: true },
    { sectionId: 'sec-b', className: 'Grade 10', sectionName: 'B', totalStudents: 15, isMarked: false },
    { sectionId: 'sec-c', className: 'Grade 10', sectionName: 'C', totalStudents: 0, isMarked: false },
  ];

  // 1. Verify activeSections is 2 (Section A and Section B)
  const activeSections = filterActiveSections(sections);
  assert.equal(activeSections.length, 2);
  assert.deepEqual(activeSections.map(s => s.sectionId), ['sec-a', 'sec-b']);

  // 2. Verify pendingSectionsCount is 1 (Section B), NOT 2
  const pendingCount = computePendingSectionsCount(activeSections);
  assert.equal(pendingCount, 1);

  // 3. Verify recordedSectionsCount is 1 (Section A)
  const recordedCount = computeRecordedSectionsCount(activeSections);
  assert.equal(recordedCount, 1);

  // 4. Verify empty Section C is identified as empty and not pending
  const metaA = getSectionAttendanceBadgeMeta(sections[0]);
  const metaB = getSectionAttendanceBadgeMeta(sections[1]);
  const metaC = getSectionAttendanceBadgeMeta(sections[2]);

  assert.equal(metaA.status, 'RECORDED');
  assert.equal(metaA.badgeText, 'Recorded');

  assert.equal(metaB.status, 'PENDING');
  assert.equal(metaB.canMark, true);

  assert.equal(metaC.status, 'EMPTY');
  assert.equal(metaC.badgeText, 'Empty (0 Students)');
  assert.equal(metaC.canMark, false);
  assert.equal(metaC.tooltip, 'No students enrolled in this section');
});

test('All sections empty edge case', () => {
  const sections = [
    { sectionId: 'sec-empty-1', totalStudents: 0, isMarked: false },
    { sectionId: 'sec-empty-2', totalStudents: 0, isMarked: false },
  ];

  const activeSections = filterActiveSections(sections);
  assert.equal(activeSections.length, 0);

  const pendingCount = computePendingSectionsCount(activeSections);
  assert.equal(pendingCount, 0);

  const metrics = calculateAttendanceHubMetrics({
    activeSectionsList: activeSections,
    markedSectionsCount: 0,
  });
  assert.equal(metrics.totalSectionsCount, 0);
  assert.equal(metrics.complianceRate, 0);
});

test('Compliance rate metrics protection with empty sections', () => {
  // Scenario: 2 active sections both marked, 1 empty section
  const sections = [
    { sectionId: 'sec-1', totalStudents: 25, isMarked: true },
    { sectionId: 'sec-2', totalStudents: 30, isMarked: true },
    { sectionId: 'sec-3', totalStudents: 0, isMarked: false }, // Empty
  ];

  const activeSections = filterActiveSections(sections);
  const metrics = calculateAttendanceHubMetrics({
    activeSectionsList: activeSections,
    markedSectionsCount: 2,
  });

  // Total sections count should be 2 (not 3), giving 100% compliance rate
  assert.equal(metrics.totalSectionsCount, 2);
  assert.equal(metrics.complianceRate, 100);
});
