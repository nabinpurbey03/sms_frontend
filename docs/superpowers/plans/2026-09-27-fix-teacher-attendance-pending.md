# Fix Teacher Attendance Showing as Pending Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the issue where a teacher submits attendance but the dashboard still shows attendance as "Pending" by correcting section ID resolution, multi-section status checks, local date calculation, robust marked-state detection, and query cache synchronization.

**Architecture:** Create a shared attendance status utility (`isSectionAttendanceMarked` and `getLocalTodayDate`) in `src/features/attendance/utils/attendanceStatus.ts`. Update `useMarkAttendance` to optimistically update `daily_attendance_status` in the query cache. Update all teacher dashboard components (`TeacherDailyActionAlert`, `TeacherMissionControlHub`, `TeacherClassroomSectionCard`), `AttendanceDashboardHub`, and `MyAssignmentsPage` to use the unified status logic with fallback section resolution.

**Tech Stack:** React 19, TanStack Query v5, TanStack Router, TypeScript

**Spec:** User report: "a teacher has submitted their attendance although he/she is seeing attendance is pending can you check whats the problem and what can be best way to fic it?"

## Global Constraints

- Never break existing attendance recording or reporting functionality.
- Do not introduce new third-party dependencies.
- Date representations must consistently use local calendar date (`YYYY-MM-DD`), matching `NepaliDatePicker`.
- Support teachers with single sections, multiple sections, and assignments where `section_id` is initially unassigned (`null`/`undefined`).
- TypeScript strict checking: `npx tsc --noEmit` must pass with zero errors.
- Build verification: `npm run build` must succeed.

---

## Root Cause Analysis

1. **Missing Section ID Resolution:** In `TeacherMissionControlHub`, `TeacherDailyActionAlert`, and `TeacherClassroomSectionCard`, the code checked `dailyAttendanceStatus?.marked_section_ids?.includes(duty.section_id!)`. If the teacher's assignment record has `section_id === null` (class-level teacher assignment), `duty.section_id!` is `null`, which evaluates to `false`. Furthermore, `TeacherClassroomSectionCard` explicitly had `if (!duty.section_id) return false;`, prematurely marking it as pending.
2. **First-Duty-Only Limitation:** In `TeacherMissionControlHub` and `TeacherDailyActionAlert`, only `classTeacherAssignments[0]` was checked. If a teacher is assigned to multiple sections (e.g., Section A and Section B) and submitted attendance for Section B, the dashboard only checked Section A, falsely displaying "Attendance Pending".
3. **Narrow `isMarked` Checks:** Components checked only `marked_section_ids.includes(id)` or `sec.is_marked`. If the backend populated `present_count + absent_count > 0` or if `sectionReport` already has records for today, the components still showed "Pending" because they ignored existing student records.
4. **Timezone Discrepancy (UTC vs Local):** `new Date().toISOString().split('T')[0]` returns the UTC date. In Nepal (UTC+5:45), between midnight and 5:45 AM, UTC is the previous day. Moreover, `NepaliDatePicker` generates local dates. If a teacher submitted on local date, querying UTC date returns "not marked".
5. **Cache Staleness on Navigation:** `useMarkAttendance` invalidated `['attendance']` and `['daily_attendance_status']`. When navigating from `/attendance/mark` to `/dashboard`, the dashboard unmounted query may serve stale data before background refetch completes.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/features/attendance/utils/attendanceStatus.ts` | **Create** | Unified helpers: `getLocalTodayDate()`, `isSectionAttendanceMarked()`, `resolveDutySectionId()` |
| `src/features/attendance/hooks.ts` | **Modify** | Update `useMarkAttendance` with optimistic cache update for `daily_attendance_status` |
| `src/features/dashboard/components/teacher/TeacherDailyActionAlert.tsx` | **Modify** | Check all class teacher assignments, support fallback section resolution and robust marked-detection |
| `src/features/dashboard/components/teacher/TeacherMissionControlHub.tsx` | **Modify** | Support multi-section status aggregation and fallback section resolution |
| `src/features/dashboard/components/teacher/TeacherClassroomSectionCard.tsx` | **Modify** | Use `resolveDutySectionId`, check both `dailyAttendanceStatus` and `sectionReport` |
| `src/features/dashboard/components/AttendanceDashboardHub.tsx` | **Modify** | Ensure section list checklist uses robust `isMarked` checking (`marked_section_ids` OR `is_marked` OR `present+absent > 0`) |
| `src/features/attendance/pages/MyAssignmentsPage.tsx` | **Modify** | Use robust `isMarked` check for class teacher duties |

---

### Task 1: Create Attendance Status Utility Functions

**Files:**
- Create: `src/features/attendance/utils/attendanceStatus.ts`

**Interfaces:**
- Produces:
  - `getLocalTodayDate(): string` — formats current local date as `YYYY-MM-DD`
  - `resolveDutySectionId(duty: TeacherAssignmentResponse | null, classes: AcademicClassWithDetails[]): string | null` — returns `duty.section_id` or falls back to the first section of `duty.class_id`
  - `isSectionAttendanceMarked(sectionId: string | null | undefined, dailyStatus?: DailyAttendanceStatus | null, sectionReport?: SectionAttendanceReport | null, dateStr?: string): boolean`

- [ ] **Step 1: Create `src/features/attendance/utils/attendanceStatus.ts`**

```ts
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
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/features/attendance/utils/attendanceStatus.ts
git commit -m "feat: add attendance status and local date utility functions"
```

---

### Task 2: Optimistic Cache Update in `useMarkAttendance`

**Files:**
- Modify: `src/features/attendance/hooks.ts:120-155`

**Interfaces:**
- Consumes: `queryClient.setQueriesData`, `DAILY_ATTENDANCE_STATUS_KEY`
- Produces: Immediate local cache update of `daily_attendance_status` on successful attendance mutation

- [ ] **Step 1: Update `useMarkAttendance` in `src/features/attendance/hooks.ts`**

In `src/features/attendance/hooks.ts`, update `onSuccess` of `useMarkAttendance`:

```ts
    onSuccess: (data, { tenantId, classId, sectionId, recordDate, presentStudentIds }) => {
      // 1. Optimistically update daily_attendance_status cache so dashboard reflects immediately
      queryClient.setQueriesData(
        { queryKey: [DAILY_ATTENDANCE_STATUS_KEY, tenantId, recordDate] },
        (old: DailyAttendanceStatus | undefined) => {
          if (!old) return old;
          const updatedMarkedIds = Array.from(new Set([...(old.marked_section_ids || []), sectionId]));
          const updatedSections = (old.sections || []).map((sec) => {
            if (sec.section_id === sectionId) {
              const presentCount = data?.total_marked_present ?? presentStudentIds.length;
              const absentCount = data?.total_marked_absent ?? Math.max(0, sec.total_students - presentCount);
              return {
                ...sec,
                is_marked: true,
                present_count: presentCount,
                absent_count: absentCount,
              };
            }
            return sec;
          });
          return {
            ...old,
            marked_section_ids: updatedMarkedIds,
            sections: updatedSections,
          };
        }
      );

      // 2. Invalidate queries for fresh synchronization
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: [DAILY_ATTENDANCE_STATUS_KEY] });
      queryClient.invalidateQueries({ queryKey: ['tenant_dashboard'] });

      const count = data?.total_marked_present ?? presentStudentIds.length;
      toast.success('Attendance Recorded', {
        description: `${count} student(s) marked present for ${recordDate}`,
      });
    },
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/features/attendance/hooks.ts
git commit -m "fix: update query cache immediately upon attendance submission"
```

---

### Task 3: Fix `TeacherDailyActionAlert.tsx` Multi-Section & Section Resolution

**Files:**
- Modify: `src/features/dashboard/components/teacher/TeacherDailyActionAlert.tsx:1-158`

**Interfaces:**
- Consumes: `getLocalTodayDate`, `isSectionAttendanceMarked`, `resolveDutySectionId` from `@/features/attendance/utils/attendanceStatus`
- Consumes: `classTeacherAssignments: TeacherAssignmentResponse[]` (or checks all class teacher assignments if available)
- Produces: Correct alert banner indicating whether attendance is completed or pending for all class teacher duties

- [ ] **Step 1: Update `TeacherDailyActionAlert.tsx`**

Add imports and update the props interface and logic to handle both `primaryClassTeacherDuty` and all `classTeacherAssignments`, plus fallback section resolution:

```tsx
import React, { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, CalendarCheck, CheckCircle2, Edit3, Sparkles } from 'lucide-react';
import { useDailyAttendanceStatus } from '@/features/attendance/hooks';
import { useAllClassesWithDetails } from '@/features/academic/hooks';
import {
  getLocalTodayDate,
  isSectionAttendanceMarked,
  resolveDutySectionId,
} from '@/features/attendance/utils/attendanceStatus';
import type { TeacherAssignmentResponse } from '@/features/academic/types';

export interface TeacherDailyActionAlertProps {
  tenantId: string;
  primaryClassTeacherDuty: TeacherAssignmentResponse | null;
  subjectTeacherAssignments: TeacherAssignmentResponse[];
  classTeacherAssignments?: TeacherAssignmentResponse[];
}

export const TeacherDailyActionAlert: React.FC<TeacherDailyActionAlertProps> = ({
  tenantId,
  primaryClassTeacherDuty,
  subjectTeacherAssignments,
  classTeacherAssignments = [],
}) => {
  const todayStr = useMemo(() => getLocalTodayDate(), []);
  const { data: dailyAttendanceStatus } = useDailyAttendanceStatus(
    tenantId || null,
    todayStr
  );
  const { data: classes = [] } = useAllClassesWithDetails(tenantId || null);

  const effectiveClassTeacherDuties = useMemo(() => {
    if (classTeacherAssignments.length > 0) return classTeacherAssignments;
    return primaryClassTeacherDuty ? [primaryClassTeacherDuty] : [];
  }, [classTeacherAssignments, primaryClassTeacherDuty]);

  if (effectiveClassTeacherDuties.length > 0) {
    // Check marked status for each duty
    const dutiesWithStatus = effectiveClassTeacherDuties.map((duty) => {
      const sectionId = resolveDutySectionId(duty, classes);
      const isMarked = isSectionAttendanceMarked(sectionId, dailyAttendanceStatus, null, todayStr);
      const sectionStatus = dailyAttendanceStatus?.sections?.find((s) => s.section_id === sectionId);
      return {
        duty,
        sectionId,
        isMarked,
        sectionStatus,
      };
    });

    const pendingDuties = dutiesWithStatus.filter((d) => !d.isMarked);
    const completedDuties = dutiesWithStatus.filter((d) => d.isMarked);
    const isAllMarked = pendingDuties.length === 0;

    if (!isAllMarked) {
      const firstPending = pendingDuties[0];
      return (
        <div className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/5 p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0 animate-pulse">
                <Clock className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5"
                  >
                    Action Required
                  </Badge>
                  <h3 className="text-sm sm:text-base font-semibold text-foreground">
                    Daily Attendance Pending: {firstPending.duty.class_name} - Section{' '}
                    {firstPending.duty.section_name || 'A'}
                    {pendingDuties.length > 1 && ` (+${pendingDuties.length - 1} more)`}
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Today's presence records have not been marked yet. Take morning attendance for your students.
                </p>
              </div>
            </div>
            <div className="self-end sm:self-center shrink-0">
              <Button
                asChild
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-xs"
              >
                <Link
                  to="/attendance/mark"
                  search={
                    {
                      classId: firstPending.duty.class_id,
                      sectionId: firstPending.sectionId,
                    } as any
                  }
                >
                  <CalendarCheck className="w-4 h-4 mr-1.5" /> Mark Today's Attendance
                </Link>
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // All assigned duties marked
    const totalPresent = completedDuties.reduce((acc, d) => acc + (d.sectionStatus?.present_count ?? 0), 0);
    const totalAbsent = completedDuties.reduce((acc, d) => acc + (d.sectionStatus?.absent_count ?? 0), 0);
    const totalStudents = totalPresent + totalAbsent;
    const rate = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 100;
    const primaryDuty = effectiveClassTeacherDuties[0];

    return (
      <div className="relative overflow-hidden rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 sm:mt-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5"
                >
                  Completed
                </Badge>
                <h3 className="text-sm sm:text-base font-semibold text-foreground">
                  Today's Attendance Completed ({totalPresent} Present, {totalAbsent} Absent • {rate}% Presence)
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Attendance for {effectiveClassTeacherDuties.map((d) => `${d.class_name} ${d.section_name || 'A'}`).join(', ')} is recorded and up to date for today.
              </p>
            </div>
          </div>
          <div className="self-end sm:self-center shrink-0">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="text-xs border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
            >
              <Link
                to="/attendance/mark"
                search={
                  {
                    classId: primaryDuty.class_id,
                    sectionId: primaryDuty.section_id,
                  } as any
                }
              >
                <Edit3 className="w-3.5 h-3.5 mr-1" /> Update Records
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Teacher is only a subject teacher (no primary class teacher duty)
  return (
    <div className="relative overflow-hidden rounded-xl border border-sky-500/20 bg-sky-500/10 p-4 sm:p-5 shadow-xs">
      <div className="flex items-start gap-3.5">
        <div className="p-2.5 rounded-lg bg-sky-500/20 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm sm:text-base font-semibold text-foreground">
            Subject Teaching Overview
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            You are assigned to teach {subjectTeacherAssignments.length} subjects across classes. Review your exam score entry and curriculum syllabus below.
          </p>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/features/dashboard/components/teacher/TeacherDailyActionAlert.tsx
git commit -m "fix: update TeacherDailyActionAlert with robust marked status check"
```

---

### Task 4: Fix `TeacherMissionControlHub.tsx` & `TeacherClassroomSectionCard.tsx`

**Files:**
- Modify: `src/features/dashboard/components/teacher/TeacherMissionControlHub.tsx:40-150`
- Modify: `src/features/dashboard/components/teacher/TeacherClassroomSectionCard.tsx:50-115`

**Interfaces:**
- Consumes: `getLocalTodayDate`, `isSectionAttendanceMarked`, `resolveDutySectionId` from `@/features/attendance/utils/attendanceStatus`
- Produces: Accurate StatCard and Classroom Card status reflection

- [ ] **Step 1: Update `TeacherMissionControlHub.tsx`**

1. Replace `new Date().toISOString().split('T')[0]` with `getLocalTodayDate()`.
2. Pass `classTeacherAssignments={classTeacherAssignments}` to `TeacherDailyActionAlert`.
3. Use `resolveDutySectionId(primaryClassTeacherDuty, classes)` to ensure `section_id` is never null.
4. Calculate `isAttendanceMarked` using `isSectionAttendanceMarked`.

```tsx
  const todayStr = useMemo(() => getLocalTodayDate(), []);

  // Primary class teacher effective section ID
  const primarySectionId = useMemo(() => {
    return resolveDutySectionId(primaryClassTeacherDuty, classes);
  }, [primaryClassTeacherDuty, classes]);

  const primarySectionStatus = useMemo(() => {
    if (!primarySectionId) return null;
    return (
      dailyAttendanceStatus?.sections?.find(
        (s) => s.section_id === primarySectionId
      ) || null
    );
  }, [dailyAttendanceStatus, primarySectionId]);

  const isAttendanceMarked = useMemo(() => {
    if (!primaryClassTeacherDuty) return false;
    return isSectionAttendanceMarked(primarySectionId, dailyAttendanceStatus, null, todayStr);
  }, [dailyAttendanceStatus, primaryClassTeacherDuty, primarySectionId, todayStr]);
```

- [ ] **Step 2: Update `TeacherClassroomSectionCard.tsx`**

1. Replace `new Date().toISOString().split('T')[0]` with `getLocalTodayDate()`.
2. Resolve effective section ID:
```tsx
  const effectiveSectionId = useMemo(() => {
    return duty.section_id || (cls?.sections?.[0]?.id ?? '');
  }, [duty.section_id, cls?.sections]);
```
3. Update `useSectionAttendanceReport` to use `effectiveSectionId`.
4. Update `isMarked`:
```tsx
  const isMarked = useMemo(() => {
    if (!effectiveSectionId) return false;
    return isSectionAttendanceMarked(effectiveSectionId, dailyAttendanceStatus, sectionReport, todayStr);
  }, [effectiveSectionId, dailyAttendanceStatus, sectionReport, todayStr]);
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/features/dashboard/components/teacher/TeacherMissionControlHub.tsx src/features/dashboard/components/teacher/TeacherClassroomSectionCard.tsx
git commit -m "fix: resolve duty section ID and verify attendance via report in teacher classroom card"
```

---

### Task 5: Fix `AttendanceDashboardHub.tsx` & `MyAssignmentsPage.tsx`

**Files:**
- Modify: `src/features/dashboard/components/AttendanceDashboardHub.tsx:255-295`
- Modify: `src/features/attendance/pages/MyAssignmentsPage.tsx:20-40, 140-155`

**Interfaces:**
- Consumes: `isSectionAttendanceMarked` from `@/features/attendance/utils/attendanceStatus`
- Produces: Correct marked vs pending status across admin checklist and teacher assignment pages

- [ ] **Step 1: Update `AttendanceDashboardHub.tsx`**

In `sectionsStatusList` calculation:
```tsx
        const status = statusMap.get(sec.id);
        const isMarked = isSectionAttendanceMarked(sec.id, dailyStatus);
```
Ensure `isMarked` considers `marked_section_ids`, `status.is_marked`, and `present_count + absent_count > 0`.

- [ ] **Step 2: Update `MyAssignmentsPage.tsx`**

1. Replace `new Date().toISOString().split('T')[0]` with `getLocalTodayDate()`.
2. In class teacher cards:
```tsx
  const isMarkedToday = isSectionAttendanceMarked(assignment.section_id, dailyStatus);
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 4: Verify complete build**

Run: `npm run build`
Expected: `✓ built in ~1.1s` with 0 errors

- [ ] **Step 5: Commit and push**

```bash
git add src/features/dashboard/components/AttendanceDashboardHub.tsx src/features/attendance/pages/MyAssignmentsPage.tsx
git commit -m "fix: align section attendance marked checks in AttendanceDashboardHub and MyAssignmentsPage"
git push origin nabin
```

---

## Verification Plan

### Automated Build & Type Checks
1. `npx tsc --noEmit` — passes with 0 errors.
2. `npm run build` — Vite build succeeds without bundle or compile errors.

### Manual Verification
1. Log in as a Teacher with a Class Teacher assignment.
2. Go to `/attendance/mark`, record presence for students in the class, and click "Confirm and Submit".
3. Return to `/dashboard`:
   - Top banner should show **"Completed: Today's Attendance Completed (X Present, Y Absent)"** in green (instead of pulsating amber "Pending").
   - StatCard for "Today's Attendance" should show the presence percentage (e.g. `95%`) instead of `"Pending"`.
   - Classroom section card should show badge **"Marked"** in green instead of `"Pending"`.
   - Absentee list should immediately populate with the recorded absentees.
