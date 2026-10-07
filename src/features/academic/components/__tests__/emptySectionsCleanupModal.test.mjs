import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Pure helper functions for EmptySectionsCleanupModal logic
 */
export function groupEmptySectionsByClass(emptySections) {
  if (!emptySections || !Array.isArray(emptySections)) return [];
  const map = new Map();

  for (const s of emptySections) {
    const classId = s.class_id;
    if (!map.has(classId)) {
      map.set(classId, {
        class_id: s.class_id,
        class_name: s.class_name,
        sections: [],
      });
    }
    map.get(classId).sections.push(s);
  }

  return Array.from(map.values()).sort((a, b) => a.class_name.localeCompare(b.class_name));
}

export function filterDeletableEmptySections(emptySections) {
  if (!emptySections || !Array.isArray(emptySections)) return [];
  return emptySections.filter((s) => s.can_delete);
}

export function isSectionADefault(section) {
  return (
    section.section_name?.toUpperCase() === 'A' ||
    section.can_delete === false
  );
}

export function getSectionResolutionMeta(section) {
  const isSectionA = isSectionADefault(section);
  if (isSectionA) {
    return {
      canDelete: false,
      badgeText: 'Required · Default Section',
      noticeText: "Section 'A' is required and cannot be deleted. Please assign or enroll students into this section.",
    };
  }
  return {
    canDelete: true,
    badgeText: 'Empty · Deletable',
    noticeText: null,
  };
}

export function computeBulkDeleteCount(emptySections) {
  return filterDeletableEmptySections(emptySections).length;
}

// ----------------------------------------------------
// Tests
// ----------------------------------------------------

test('groupEmptySectionsByClass groups sections and sorts by class name', () => {
  const sections = [
    { section_id: 'sec-1', section_name: 'B', class_id: 'cls-10', class_name: 'Grade 10', student_count: 0, can_delete: true },
    { section_id: 'sec-2', section_name: 'A', class_id: 'cls-9', class_name: 'Grade 9', student_count: 0, can_delete: false },
    { section_id: 'sec-3', section_name: 'C', class_id: 'cls-10', class_name: 'Grade 10', student_count: 0, can_delete: true },
  ];

  const grouped = groupEmptySectionsByClass(sections);
  assert.equal(grouped.length, 2);
  assert.equal(grouped[0].class_name, 'Grade 10'); // Alphabetical order
  assert.equal(grouped[1].class_name, 'Grade 9');
  assert.equal(grouped[0].sections.length, 2);
  assert.equal(grouped[1].sections.length, 1);
});

test('groupEmptySectionsByClass handles empty or null input gracefully', () => {
  assert.deepEqual(groupEmptySectionsByClass([]), []);
  assert.deepEqual(groupEmptySectionsByClass(null), []);
  assert.deepEqual(groupEmptySectionsByClass(undefined), []);
});

test('filterDeletableEmptySections isolates can_delete=true sections', () => {
  const sections = [
    { section_id: 'sec-1', section_name: 'A', class_id: 'cls-1', class_name: 'Grade 1', student_count: 0, can_delete: false },
    { section_id: 'sec-2', section_name: 'B', class_id: 'cls-1', class_name: 'Grade 1', student_count: 0, can_delete: true },
    { section_id: 'sec-3', section_name: 'C', class_id: 'cls-1', class_name: 'Grade 1', student_count: 0, can_delete: true },
  ];

  const deletable = filterDeletableEmptySections(sections);
  assert.equal(deletable.length, 2);
  assert.deepEqual(deletable.map(s => s.section_id), ['sec-2', 'sec-3']);
});

test('isSectionADefault identifies Section A and non-deletable sections', () => {
  assert.equal(isSectionADefault({ section_name: 'A', can_delete: false }), true);
  assert.equal(isSectionADefault({ section_name: 'a', can_delete: false }), true);
  assert.equal(isSectionADefault({ section_name: 'A', can_delete: true }), true); // Section A is always default
  assert.equal(isSectionADefault({ section_name: 'B', can_delete: false }), true); // can_delete false
  assert.equal(isSectionADefault({ section_name: 'B', can_delete: true }), false);
  assert.equal(isSectionADefault({ section_name: 'C', can_delete: true }), false);
});

test('getSectionResolutionMeta returns expected badges and notices for Section A vs B/C', () => {
  const secA = { section_id: '1', section_name: 'A', class_id: 'c1', class_name: 'Class 1', student_count: 0, can_delete: false };
  const secB = { section_id: '2', section_name: 'B', class_id: 'c1', class_name: 'Class 1', student_count: 0, can_delete: true };

  const metaA = getSectionResolutionMeta(secA);
  assert.equal(metaA.canDelete, false);
  assert.equal(metaA.badgeText, 'Required · Default Section');
  assert.match(metaA.noticeText, /Section 'A' is required and cannot be deleted/);

  const metaB = getSectionResolutionMeta(secB);
  assert.equal(metaB.canDelete, true);
  assert.equal(metaB.badgeText, 'Empty · Deletable');
  assert.equal(metaB.noticeText, null);
});

test('computeBulkDeleteCount computes accurate count of deletable sections', () => {
  const sections = [
    { section_id: '1', section_name: 'A', can_delete: false },
    { section_id: '2', section_name: 'B', can_delete: true },
    { section_id: '3', section_name: 'C', can_delete: true },
    { section_id: '4', section_name: 'D', can_delete: true },
  ];

  assert.equal(computeBulkDeleteCount(sections), 3);
  assert.equal(computeBulkDeleteCount([]), 0);
  assert.equal(computeBulkDeleteCount([{ section_id: '1', section_name: 'A', can_delete: false }]), 0);
});
