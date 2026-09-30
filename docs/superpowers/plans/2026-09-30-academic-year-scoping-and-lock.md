# Academic Year Scoping & Operational Locking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restrict academic year switching exclusively to retrospective analytics surfaces (Dashboard and Academic Analytics pages), and permanently lock operational workflows (Exam Creation, Attendance Reports, Academic Calendar, Student Enrollment, and Teacher Assignments) to the current active academic year (`is_current: true`).

**Architecture:** Create a dedicated `useCurrentAcademicYear` hook that deterministically resolves the current active session without reading or mutating global persistent storage. Replace all ad-hoc dropdown selectors on operational pages (`CreateExamPage`, `AttendanceReportsPage`, `AcademicCalendarView`, `StudentsPage`, `TeacherAssignmentsPage`) with accessible, locked current-session UI indicators. Retain interactive multi-year dropdown switchers strictly on `DashboardPage` and `AcademicAnalyticsPage`.

**Tech Stack:** React 19, TypeScript strict mode, TanStack Query, Zustand, Tailwind CSS v4, Lucide Icons, Shadcn UI primitives (`Badge`, `Card`, `Tooltip`).

**Spec:** Academic Year Policy: Operational school tasks (examination creation, student enrolment, daily/session attendance, teacher duties, calendar scheduling) must operate strictly in the school's **current active academic year**. Historical academic years can only be inspected on retrospective reporting surfaces (**Dashboard** and **Academic Analytics**).

---

## Global Constraints

- Strict TypeScript compilation: `npx tsc -b` must pass with 0 errors.
- Strict linter compliance: `npm run lint` must pass with 0 errors.
- Clean production build: `npm run build` must succeed cleanly.
- Accessible, semantic design tokens matching `shadcn/ui` and the application's unified design system (`bg-muted/30`, `border-border/70`, `text-primary`, `Badge`).
- No interactive selector allowed on operational pages: display locked badges with `<Lock className="w-3 h-3" />` and explicit "Current Academic Year" tags.
- Fallback resilience: If no active academic year is configured in the database, operational forms must display a descriptive alert banner and prevent invalid entity creation.

---

### Task 1: Create `useCurrentAcademicYear` Hook & Standardize Query Exports

**Files:**
- Create: `src/features/academic-year/hooks/useCurrentAcademicYear.ts`
- Modify: `src/features/academic-year/hooks.ts:1-20`

**Interfaces:**
- Consumes: `useAcademicYears` from `./hooks`, `AcademicYearResponse` from `./types`
- Produces: `useCurrentAcademicYear(tenantId: string | null)` returning `{ currentYear, currentYearId, years, isLoading, isError }`

- [ ] **Step 1: Create `src/features/academic-year/hooks/useCurrentAcademicYear.ts`**

Write the hook:
```tsx
import { useMemo } from 'react';
import { useAcademicYears } from '../hooks';
import type { AcademicYearResponse } from '../types';

export interface UseCurrentAcademicYearReturn {
  currentYear: AcademicYearResponse | null;
  currentYearId: string | null;
  years: AcademicYearResponse[];
  isLoading: boolean;
  isError: boolean;
}

export const useCurrentAcademicYear = (
  tenantId: string | null
): UseCurrentAcademicYearReturn => {
  const { data: years = [], isLoading, isError } = useAcademicYears(tenantId);

  const currentYear = useMemo(() => {
    if (!years || years.length === 0) return null;
    return years.find((y) => y.is_current) || years[0] || null;
  }, [years]);

  return {
    currentYear,
    currentYearId: currentYear?.id || null,
    years,
    isLoading,
    isError,
  };
};
```

- [ ] **Step 2: Export `useCurrentAcademicYear` in `src/features/academic-year/hooks.ts`**

Add export:
```tsx
export * from './hooks/useCurrentAcademicYear';
```

- [ ] **Step 3: Verify TypeScript Compilation**

Run: `npx tsc -b`
Expected: PASS (0 errors)

- [ ] **Step 4: Commit Task 1**

```bash
git add src/features/academic-year/hooks/useCurrentAcademicYear.ts src/features/academic-year/hooks.ts
git commit -m "feat(academic-year): create useCurrentAcademicYear hook for operational workflows"
```

---

### Task 2: Lock Exam Creation (`CreateExamPage.tsx`) to Current Academic Year

**Files:**
- Modify: `src/features/examination/pages/CreateExamPage.tsx:20-85`
- Modify: `src/features/examination/pages/CreateExamPage.tsx:445-480`

**Interfaces:**
- Consumes: `useCurrentAcademicYear` from `@/features/academic-year/hooks/useCurrentAcademicYear`
- Produces: Locked read-only current session card in exam form, preventing changing or switching years

- [ ] **Step 1: Replace `useSelectedAcademicYear` with `useCurrentAcademicYear` in `CreateExamPage.tsx`**

1. Replace import:
```tsx
// Remove:
// import { useSelectedAcademicYear } from '@/features/academic-year/hooks/useSelectedAcademicYear';
// Add:
import { useCurrentAcademicYear } from '@/features/academic-year/hooks/useCurrentAcademicYear';
import { CalendarDays, Lock, AlertTriangle } from 'lucide-react';
```
2. Replace hook call:
```tsx
const { currentYear, currentYearId, isLoading: isYearLoading } = useCurrentAcademicYear(activeTenantId);
```
3. Set `academicTerm` in submit payload directly to `currentYearId`:
```tsx
academic_term: currentYearId || undefined,
academic_year_id: currentYearId || undefined,
```

- [ ] **Step 2: Replace Editable Dropdown with Locked Current Session Card**

Replace lines 451-470 (`<select id="academic-term">`) with:
```tsx
{/* Academic Year - Strictly Locked to Current Session */}
<div className="space-y-1.5">
  <Label className="text-sm font-semibold flex items-center justify-between">
    <span>Academic Year</span>
    <span className="text-xs text-muted-foreground font-normal">Active Session</span>
  </Label>
  {currentYear ? (
    <div className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-muted/30">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
          <CalendarDays className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-foreground truncate">{currentYear.name}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 bg-primary/5 text-primary font-semibold">
              Current
            </Badge>
          </div>
          {(currentYear.start_date && currentYear.end_date) && (
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              {currentYear.start_date} – {currentYear.end_date}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded-md border border-border/60 shrink-0">
        <Lock className="w-3 h-3 text-muted-foreground" />
        <span className="text-[11px] font-medium hidden sm:inline">Locked to current year</span>
      </div>
    </div>
  ) : (
    <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2">
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <span>No active academic year found for this school. Please set a current academic year in Academic Settings before creating exams.</span>
    </div>
  )}
</div>
```

- [ ] **Step 3: Guard Form Submission Against Missing Current Year**

In `handleCreateExamSubmit`, check:
```tsx
if (!currentYearId) {
  toast.error('Validation Error', {
    description: 'No active academic year found. Cannot create examinations without an active academic year.',
  });
  return;
}
```

- [ ] **Step 4: Verify TypeScript & Build**

Run: `npx tsc -b` and `npm run lint`
Expected: PASS (0 errors)

- [ ] **Step 5: Commit Task 2**

```bash
git add src/features/examination/pages/CreateExamPage.tsx
git commit -m "feat(examination): lock exam creation strictly to current academic year"
```

---

### Task 3: Lock Attendance Reports & Academic Calendar to Current Academic Year

**Files:**
- Modify: `src/features/attendance/pages/AttendanceReportsPage.tsx:430-465`
- Modify: `src/features/school-settings/components/AcademicCalendarView.tsx:40-60`
- Modify: `src/features/school-settings/components/AcademicCalendarView.tsx:230-250`

**Interfaces:**
- Consumes: `useCurrentAcademicYear`
- Produces: Locked current year display on attendance reports and academic calendar

- [ ] **Step 1: Lock Session in `AttendanceReportsPage.tsx`**

1. Replace interactive `<Select value={selectedAcademicYearId} onValueChange={...}>` in `AttendanceReportsPage.tsx` (lines 433-460) with a locked session indicator:
```tsx
{currentYear && (
  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border/60 bg-muted/30 text-xs">
    <CalendarDays className="w-3.5 h-3.5 text-primary shrink-0" />
    <span className="text-muted-foreground font-medium">Session:</span>
    <span className="font-semibold text-foreground">{currentYear.name}</span>
    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary font-medium">
      Current
    </Badge>
  </div>
)}
```
2. Ensure `selectedAcademicYearId` is strictly bound to `currentYear?.id || ''`.

- [ ] **Step 2: Lock Academic Calendar View in `AcademicCalendarView.tsx`**

1. In `AcademicCalendarView.tsx`, ensure `activeYearId` is locked to `currentYear?.id || ''`.
2. Replace the `<Select>` dropdown on line 239 with:
```tsx
{currentYear && (
  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border/70 bg-muted/30 text-xs">
    <CalendarDays className="w-4 h-4 text-primary shrink-0" />
    <div className="flex flex-col">
      <span className="font-bold text-foreground leading-tight">{currentYear.name}</span>
      <span className="text-[10px] text-muted-foreground font-medium">Current Academic Year</span>
    </div>
  </div>
)}
```

- [ ] **Step 3: Verify TypeScript & Build**

Run: `npx tsc -b` and `npm run lint`
Expected: PASS (0 errors)

- [ ] **Step 4: Commit Task 3**

```bash
git add src/features/attendance/pages/AttendanceReportsPage.tsx src/features/school-settings/components/AcademicCalendarView.tsx
git commit -m "feat(attendance,calendar): lock session and calendar views to current academic year"
```

---

### Task 4: Standardize Operational Pages (`StudentsPage.tsx` & `TeacherAssignmentsPage.tsx`)

**Files:**
- Modify: `src/features/academic/pages/StudentsPage.tsx:15-20, 85-95`
- Modify: `src/features/academic/pages/TeacherAssignmentsPage.tsx:5-15, 40-50`

**Interfaces:**
- Consumes: `useCurrentAcademicYear`
- Produces: Direct binding to `currentYearId` ensuring student enrollment and teacher assignments are never influenced by retrospective dashboard year selection

- [ ] **Step 1: Update `StudentsPage.tsx`**

1. Replace `useSelectedAcademicYear` with `useCurrentAcademicYear`:
```tsx
// Replace:
// import { useSelectedAcademicYear } from '@/features/academic-year/hooks/useSelectedAcademicYear';
// With:
import { useCurrentAcademicYear } from '@/features/academic-year/hooks/useCurrentAcademicYear';
```
2. Consume:
```tsx
const { currentYearId } = useCurrentAcademicYear(activeTenantId);
```
3. Pass `currentYearId` to `useAllClassesWithDetails(activeTenantId, currentYearId)`.

- [ ] **Step 2: Update `TeacherAssignmentsPage.tsx`**

1. Replace `useSelectedAcademicYear` with `useCurrentAcademicYear`:
```tsx
import { useCurrentAcademicYear } from '@/features/academic-year/hooks/useCurrentAcademicYear';
```
2. Consume:
```tsx
const { currentYear, currentYearId } = useCurrentAcademicYear(activeTenantId);
const isReadOnly = currentYear?.is_closed ?? false;
```
3. Pass `currentYearId` to queries:
```tsx
const { data: assignments = [], isLoading, isError, refetch } = useAssignments(activeTenantId, { academic_year_id: currentYearId });
const { data: classes = [] } = useAllClassesWithDetails(activeTenantId, currentYearId);
```

- [ ] **Step 3: Verify TypeScript Compilation & Lint**

Run: `npx tsc -b` and `npm run lint`
Expected: PASS (0 errors)

- [ ] **Step 4: Commit Task 4**

```bash
git add src/features/academic/pages/StudentsPage.tsx src/features/academic/pages/TeacherAssignmentsPage.tsx
git commit -m "refactor(academic): bind student enrollment and teacher assignments to current academic year"
```

---

### Task 5: Final Cross-Feature Audit, Build Verification & Documentation

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Verify Scope Isolation**

Verify that:
1. `DashboardPage.tsx` allows switching academic years to inspect historical metrics.
2. `AcademicAnalyticsPage.tsx` allows switching academic years to inspect historical retention, growth, and capacity trends.
3. All other pages (`CreateExamPage`, `AttendanceReportsPage`, `AcademicCalendarView`, `StudentsPage`, `TeacherAssignmentsPage`) are strictly bound to `currentYearId` and have no year-switching controls.

- [ ] **Step 2: Run Full Production Build**

Run:
```bash
npx tsc -b
npm run lint
npm run build
```
Expected: PASS with 0 errors across all commands.

- [ ] **Step 3: Document Policy in `README.md`**

Update the Architecture section of `README.md` documenting the **Academic Year Scoping & Locking Policy**:
- Retrospective Pages (Dashboard, Analytics): Allow multi-year inspection.
- Operational Pages (Exams, Attendance, Students, Calendar, Assignments): Locked strictly to current active academic year (`is_current: true`).

- [ ] **Step 4: Commit Task 5**

```bash
git add README.md
git commit -m "docs: document academic year scoping and operational locking policy"
```
