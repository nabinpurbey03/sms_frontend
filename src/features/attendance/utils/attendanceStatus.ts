import type { DailyAttendanceStatus, SectionAttendanceReport } from '../types';
import type { TeacherAssignmentResponse, AcademicClass } from '@/features/academic/types';

/**
 * Returns today's date formatted as YYYY-MM-DD in the user's local timezone.
 * Avoids UTC offset bugs caused by Date.toISOString().
 */
export function getLocalTodayDate(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Resolves the effective section ID for a teacher assignment.
 * If duty.section_id is null/undefined, falls back to the first section of the matching class.
 */
export function resolveDutySectionId(
  duty: TeacherAssignmentResponse | null | undefined,
  classes: AcademicClass[] = []
): string | null {
  if (!duty) return null;
  if (duty.section_id) return duty.section_id;

  const targetClass = classes.find((c) => c.id === duty.class_id);
  const sections = (targetClass as any)?.sections;
  if (Array.isArray(sections) && sections.length > 0) {
    return sections[0].id || null;
  }
  return null;
}

/**
 * Determines whether attendance for a specific section is marked.
 * Checks:
 * 1. dailyStatus.marked_section_ids includes sectionId
 * 2. dailyStatus.sections has is_marked === true
 * 3. dailyStatus.sections has (present_count + absent_count) > 0
 * 4. sectionReport has students with records for the given date, or total_school_days > 0
 */
export function isSectionAttendanceMarked(
  sectionId: string | null | undefined,
  dailyStatus?: DailyAttendanceStatus | null,
  sectionReport?: SectionAttendanceReport | null,
  dateStr?: string
): boolean {
  if (!sectionId) return false;

  // 1. Check marked_section_ids list
  if (dailyStatus?.marked_section_ids?.includes(sectionId)) {
    return true;
  }

  // 2. Check sections array status
  const secStatus = dailyStatus?.sections?.find((s) => s.section_id === sectionId);
  if (secStatus) {
    if (secStatus.is_marked) return true;
    const totalMarked = (secStatus.present_count ?? 0) + (secStatus.absent_count ?? 0);
    if (totalMarked > 0) return true;
  }

  // 3. Fallback: check section report data if provided
  if (sectionReport) {
    if ((sectionReport.total_school_days ?? 0) > 0) return true;
    if (dateStr && sectionReport.students) {
      const hasRecord = sectionReport.students.some(
        (s) => s.records && s.records[dateStr] !== undefined
      );
      if (hasRecord) return true;
    }
  }

  return false;
}
