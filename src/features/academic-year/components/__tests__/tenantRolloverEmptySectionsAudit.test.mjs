import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Pure functions mirroring the Empty Sections Audit logic in TenantRolloverDialog
 */
export function shouldRenderEmptySectionsAudit(summary) {
  return Boolean(summary && summary.empty_sections_count && summary.empty_sections_count > 0);
}

export function formatEmptySectionsAuditNotice(academicYearName, emptySectionsCount) {
  return {
    header: `Attention: Empty Sections Detected (${emptySectionsCount})`,
    body: `Some sections have 0 students enrolled for session ${academicYearName}. School policy requires active sections to have students; empty sections distort attendance tracking and block creating new sections (minimum 20 students rule).`,
  };
}

export function formatEmptySectionBadge(section) {
  return `${section.class_name} - Section ${section.section_name}`;
}

export function applyEmptySectionsCleanupToSummary(currentSummary, deletedSectionIds) {
  if (!currentSummary) return null;
  const deletedSet = new Set(deletedSectionIds);
  const remaining = (currentSummary.empty_sections || []).filter(
    (s) => !deletedSet.has(s.section_id)
  );
  return {
    ...currentSummary,
    empty_sections_count: remaining.length,
    empty_sections: remaining,
  };
}

test('TenantRolloverDialog Empty Sections Audit: shouldRenderEmptySectionsAudit', () => {
  assert.equal(shouldRenderEmptySectionsAudit(null), false);
  assert.equal(shouldRenderEmptySectionsAudit({}), false);
  assert.equal(shouldRenderEmptySectionsAudit({ empty_sections_count: 0 }), false);
  assert.equal(shouldRenderEmptySectionsAudit({ empty_sections_count: 3 }), true);
});

test('TenantRolloverDialog Empty Sections Audit: notice and badge formatting', () => {
  const notice = formatEmptySectionsAuditNotice('Academic Session 2083/2084', 2);
  assert.equal(notice.header, 'Attention: Empty Sections Detected (2)');
  assert.ok(notice.body.includes('Academic Session 2083/2084'));
  assert.ok(notice.body.includes('minimum 20 students rule'));

  const badge = formatEmptySectionBadge({
    section_id: 'sec-1',
    section_name: 'B',
    class_name: 'Grade 9',
  });
  assert.equal(badge, 'Grade 9 - Section B');
});

test('TenantRolloverDialog Empty Sections Audit: cleanup state update removes deleted sections', () => {
  const initialSummary = {
    tenant_id: 'tenant-1',
    academic_year_id: 'ay-2',
    academic_year_name: 'Academic Session 2083/2084',
    total_students_promoted: 120,
    total_students_retained: 5,
    total_students_transferred: 2,
    total_students_graduated: 30,
    teacher_assignments_copied: 15,
    empty_sections_count: 2,
    empty_sections: [
      { section_id: 'sec-10b', section_name: 'B', class_name: 'Grade 10' },
      { section_id: 'sec-10c', section_name: 'C', class_name: 'Grade 10' },
    ],
  };

  assert.equal(shouldRenderEmptySectionsAudit(initialSummary), true);

  // Clean up 1 section
  const updatedSummary = applyEmptySectionsCleanupToSummary(initialSummary, ['sec-10c']);
  assert.equal(updatedSummary.empty_sections_count, 1);
  assert.equal(updatedSummary.empty_sections.length, 1);
  assert.equal(updatedSummary.empty_sections[0].section_id, 'sec-10b');
  assert.equal(shouldRenderEmptySectionsAudit(updatedSummary), true);

  // Clean up the remaining section
  const finalSummary = applyEmptySectionsCleanupToSummary(updatedSummary, ['sec-10b']);
  assert.equal(finalSummary.empty_sections_count, 0);
  assert.equal(finalSummary.empty_sections.length, 0);
  assert.equal(shouldRenderEmptySectionsAudit(finalSummary), false);
});
