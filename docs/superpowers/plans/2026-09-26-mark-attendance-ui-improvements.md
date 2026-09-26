# Mark Attendance Page UI Improvements Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the user experience of the Mark Attendance page with better visual feedback, accessibility, confirmation flows, and responsive design — without changing any core attendance-marking logic.

**Architecture:** Pure presentation-layer changes across a single file (`MarkAttendancePage.tsx`). Replace native HTML `<select>` elements with Radix UI `Select` components. Add a confirmation `Dialog` before submitting. Enhance the table with sticky headers, better loading states, and a visual progress bar. Protect against accidental navigation when there are unsaved changes. All changes are UI-only; hooks, API calls, and state management remain untouched.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Radix UI (Select, Dialog, Tooltip, Checkbox), Lucide React icons, TanStack Query v5

**Spec:** User request — "improve UI of this page for great user experience without changing the core logic"

## Global Constraints

- Do NOT modify any hook calls, API calls, mutation logic, or state management patterns.
- Do NOT change attendance-marking business rules (7-day window, class teacher restrictions, etc.).
- All imports must come from existing `@/components/ui/*` modules — no new dependencies.
- Must pass `npx tsc -b` and `npm run lint` with zero new errors.
- Keep the file under ~1000 lines. If it grows beyond, extract sub-components into `src/features/attendance/components/`.
- Maintain all existing dark mode support via Tailwind `dark:` variants.
- Preserve all existing accessibility (labels, disabled states, role checks).

---

### Task 1: Replace Native `<select>` with Radix UI `Select` Components

**Files:**
- Modify: `src/features/attendance/pages/MarkAttendancePage.tsx:427-478` (Class and Section selectors)

**Interfaces:**
- Consumes: `availableClasses: AcademicClass[]`, `accessibleSections`, `selectedClassId`, `selectedSectionId`, `setUserSelected()`, `setPresentStudentIds()`
- Produces: Same visual selection behavior, now with Radix UI Select components matching the design system

- [ ] **Step 1: Add Radix Select imports**

  At the top of `MarkAttendancePage.tsx`, add imports:

  ```tsx
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select';
  ```

  Remove `Lock` from the existing lucide import if no longer needed (it's still used elsewhere, so keep it).

- [ ] **Step 2: Replace the Class `<select>` with Radix Select**

  Replace lines 427-452 (the class selector `<select>` element) with:

  ```tsx
  {/* Class Selector */}
  <div className="space-y-1.5">
    <label className="text-xs font-semibold text-muted-foreground">Class</label>
    <Select
      value={selectedClassId}
      onValueChange={(newClassId) => {
        if (!newClassId) {
          setUserSelected({ classId: '', sectionId: '' });
        } else {
          const firstSec = accessibleSections.find((item) => item.class.id === newClassId);
          setUserSelected({
            classId: newClassId,
            sectionId: firstSec ? firstSec.section.id : '',
          });
        }
        setPresentStudentIds(new Set());
      }}
      disabled={isLoading}
    >
      <SelectTrigger className="w-full h-10">
        <SelectValue placeholder="Select a class..." />
      </SelectTrigger>
      <SelectContent>
        {availableClasses.map((cls) => (
          <SelectItem key={cls.id} value={cls.id}>
            {cls.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
  ```

- [ ] **Step 3: Replace the Section `<select>` with Radix Select**

  Replace lines 454-478 (the section selector `<select>` element) with:

  ```tsx
  {/* Section Selector */}
  <div className="space-y-1.5">
    <label className="text-xs font-semibold text-muted-foreground">Section</label>
    <Select
      value={selectedSectionId}
      onValueChange={(newSectionId) => {
        setUserSelected({
          classId: selectedClassId,
          sectionId: newSectionId,
        });
        setPresentStudentIds(new Set());
      }}
      disabled={!selectedClassId || isLoading}
    >
      <SelectTrigger className="w-full h-10">
        <SelectValue placeholder="Select a section..." />
      </SelectTrigger>
      <SelectContent>
        {accessibleSections
          .filter(({ class: cls }) => cls.id === selectedClassId)
          .map(({ section }) => (
            <SelectItem key={section.id} value={section.id}>
              Section {section.name} ({section.student_count ?? 0} students)
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  </div>
  ```

- [ ] **Step 4: Verify types and build**

  Run: `npx tsc -b`
  Expected: 0 errors

  Run: `npm run lint`
  Expected: No new errors (pre-existing warnings are fine)

- [ ] **Step 5: Commit**

  ```bash
  git add src/features/attendance/pages/MarkAttendancePage.tsx
  git commit -m "refactor(attendance): replace native selects with Radix UI Select components"
  ```

---

### Task 2: Add Loading Skeleton for Attendance Table

**Files:**
- Modify: `src/features/attendance/pages/MarkAttendancePage.tsx:491-493` (attendance table card area)

**Interfaces:**
- Consumes: `isReportLoading: boolean`, `selectedSectionId: string`
- Produces: Visual skeleton placeholder when report data is loading

- [ ] **Step 1: Add skeleton loading state inside the attendance table card**

  After line 491 (`{selectedSectionId && (`), add a loading skeleton check. Wrap the entire card content with a check for `isReportLoading`. Add this immediately after the opening `<Card>` tag on line 492:

  ```tsx
  {isReportLoading && (
    <div className="p-6 space-y-4 animate-pulse">
      {/* Status banner skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-36 rounded-full bg-muted" />
          <div className="h-4 w-40 rounded bg-muted" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-4 w-16 rounded bg-muted" />
          <div className="h-4 w-20 rounded bg-muted" />
          <div className="h-4 w-16 rounded bg-muted" />
        </div>
      </div>
      {/* Search bar skeleton */}
      <div className="flex items-center justify-between border-y py-3">
        <div className="h-8 w-56 rounded-md bg-muted" />
        <div className="flex gap-2">
          <div className="h-8 w-24 rounded-md bg-muted" />
          <div className="h-8 w-24 rounded-md bg-muted" />
        </div>
      </div>
      {/* Table rows skeleton */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-2">
          <div className="h-4 w-6 rounded bg-muted" />
          <div className="h-8 w-8 rounded-full bg-muted" />
          <div className="h-4 w-40 rounded bg-muted" />
          <div className="ml-auto h-6 w-20 rounded-full bg-muted" />
          <div className="h-8 w-22 rounded-md bg-muted" />
        </div>
      ))}
      {/* Footer skeleton */}
      <div className="flex items-center justify-between border-t pt-4">
        <div className="h-4 w-64 rounded bg-muted" />
        <div className="h-10 w-40 rounded-md bg-muted" />
      </div>
    </div>
  )}
  ```

- [ ] **Step 2: Wrap existing card content to hide during loading**

  Wrap the existing card content (Status banner, Table Header Controls, Students Table, and Submit Footer — everything from the `{/* Status & Overview Banner */}` comment through the closing `</div>` before `</Card>`) inside:

  ```tsx
  {!isReportLoading && (
    <>
      {/* ... existing card content ... */}
    </>
  )}
  ```

- [ ] **Step 3: Verify build**

  Run: `npx tsc -b`
  Expected: 0 errors

  Run: `npm run lint`
  Expected: No new errors

- [ ] **Step 4: Commit**

  ```bash
  git add src/features/attendance/pages/MarkAttendancePage.tsx
  git commit -m "feat(attendance): add loading skeleton for attendance table"
  ```

---

### Task 3: Add Confirmation Dialog Before Submitting Attendance

**Files:**
- Modify: `src/features/attendance/pages/MarkAttendancePage.tsx` (add state + Dialog component)

**Interfaces:**
- Consumes: `handleSubmit()`, `isAlreadyMarked`, `isEditing`, `totalCount`, `presentCount`, `absentCount`, `attendancePercentage`, `recordDate`, `markAttendanceMutation.isPending`
- Produces: A `Dialog` that opens when the user clicks Submit/Update, showing a summary before final confirmation

- [ ] **Step 1: Add Dialog imports and confirmation state**

  Add to imports:

  ```tsx
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '@/components/ui/dialog';
  ```

  Add state after the existing `searchQuery` state (around line 79):

  ```tsx
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  ```

- [ ] **Step 2: Create the confirmation handler**

  Add a new handler after `handleSubmit` (around line 301):

  ```tsx
  const handleConfirmAndSubmit = async () => {
    setConfirmDialogOpen(false);
    await handleSubmit();
  };
  ```

- [ ] **Step 3: Change submit buttons to open the dialog instead of calling handleSubmit directly**

  In the Submit Footer section (lines 806-881), replace all `onClick={handleSubmit}` with `onClick={() => setConfirmDialogOpen(true)}`. There are two instances:

  1. The "Update Attendance" button (around line 828): change `onClick={handleSubmit}` → `onClick={() => setConfirmDialogOpen(true)}`
  2. The "Submit Attendance" button (around line 863): change `onClick={handleSubmit}` → `onClick={() => setConfirmDialogOpen(true)}`

- [ ] **Step 4: Add the Dialog component**

  Add the Dialog just before the final closing `</div>` of the component (before line 898):

  ```tsx
  {/* Confirmation Dialog */}
  <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 text-primary" />
          {isAlreadyMarked && isEditing ? 'Update Attendance?' : 'Submit Attendance?'}
        </DialogTitle>
        <DialogDescription>
          Please review the attendance summary before confirming.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3 py-2">
        {/* Date */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Date</span>
          <span className="font-medium">
            {recordDate && new Date(recordDate + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
        {/* Section */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Section</span>
          <span className="font-medium">
            {selectedClass?.name} — Section {selectedClass?.sections.find((s) => s.id === selectedSectionId)?.name}
          </span>
        </div>
        {/* Divider */}
        <div className="border-t" />
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-emerald-500/10 p-2.5">
            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{presentCount}</p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Present</p>
          </div>
          <div className="rounded-lg bg-rose-500/10 p-2.5">
            <p className="text-lg font-bold text-rose-700 dark:text-rose-300">{absentCount}</p>
            <p className="text-[11px] text-rose-600 dark:text-rose-400">Absent</p>
          </div>
          <div className="rounded-lg bg-primary/10 p-2.5">
            <p className="text-lg font-bold text-primary">{attendancePercentage}%</p>
            <p className="text-[11px] text-muted-foreground">Rate</p>
          </div>
        </div>

        {/* Warning for 0% or 100% */}
        {(attendancePercentage === 0 || attendancePercentage === 100) && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {attendancePercentage === 0
              ? 'All students are marked absent. Please confirm this is correct.'
              : 'All students are marked present. Please confirm this is correct.'}
          </div>
        )}
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button
          variant="outline"
          onClick={() => setConfirmDialogOpen(false)}
          className="cursor-pointer"
        >
          Go Back
        </Button>
        <Button
          onClick={handleConfirmAndSubmit}
          disabled={markAttendanceMutation.isPending}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
        >
          {markAttendanceMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          {isAlreadyMarked && isEditing ? 'Confirm Update' : 'Confirm Submit'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
  ```

- [ ] **Step 5: Verify build and lint**

  Run: `npx tsc -b`
  Expected: 0 errors

  Run: `npm run lint`
  Expected: No new errors

- [ ] **Step 6: Commit**

  ```bash
  git add src/features/attendance/pages/MarkAttendancePage.tsx
  git commit -m "feat(attendance): add confirmation dialog before submitting attendance"
  ```

---

### Task 4: Sticky Table Header and Search Result Feedback

**Files:**
- Modify: `src/features/attendance/pages/MarkAttendancePage.tsx` (table header and search area)

**Interfaces:**
- Consumes: `filteredStudents.length`, `students.length`, `searchQuery`
- Produces: Sticky `<thead>`, search result count badge

- [ ] **Step 1: Make the table header sticky**

  Find the `<div className="overflow-x-auto">` wrapper around the table (line 641). Change it to:

  ```tsx
  <div className="overflow-x-auto max-h-[60vh] overflow-y-auto relative">
  ```

  Find the `<TableHeader>` element (line 643). Add a sticky class:

  ```tsx
  <TableHeader className="sticky top-0 z-10 bg-card">
  ```

- [ ] **Step 2: Add search result count feedback**

  After the search clear button (around line 591, after the closing `)}` of the `{searchQuery && (` block), add a result count indicator:

  ```tsx
  {searchQuery && (
    <span className="text-[11px] text-muted-foreground tabular-nums">
      {filteredStudents.length} of {students.length} students
    </span>
  )}
  ```

- [ ] **Step 3: Verify build and lint**

  Run: `npx tsc -b`
  Expected: 0 errors

  Run: `npm run lint`
  Expected: No new errors

- [ ] **Step 4: Commit**

  ```bash
  git add src/features/attendance/pages/MarkAttendancePage.tsx
  git commit -m "feat(attendance): add sticky table header and search result count"
  ```

---

### Task 5: Visual Attendance Progress Bar in Quick Metrics

**Files:**
- Modify: `src/features/attendance/pages/MarkAttendancePage.tsx:549-568` (Quick Metrics section)

**Interfaces:**
- Consumes: `totalCount`, `presentCount`, `absentCount`, `attendancePercentage`
- Produces: A colored progress bar under the quick metrics showing attendance percentage visually

- [ ] **Step 1: Add the progress bar below the quick metrics**

  Find the closing `</div>` of the Quick Metrics flex container (line 567). After it (but still inside the parent `<div className="p-4 border-b bg-muted/20 ...">` wrapper), add:

  ```tsx
  {/* Attendance Progress Bar */}
  {totalCount > 0 && (
    <div className="w-full mt-3 md:mt-0 md:basis-full">
      <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${attendancePercentage}%`,
            backgroundColor:
              attendancePercentage >= 90
                ? 'var(--color-emerald-500)'
                : attendancePercentage >= 75
                  ? 'var(--color-amber-500)'
                  : 'var(--color-rose-500)',
          }}
        />
      </div>
    </div>
  )}
  ```

- [ ] **Step 2: Adjust the parent flex container to allow wrapping**

  Change the parent `<div>` (line 494) from:

  ```tsx
  <div className="p-4 border-b bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
  ```

  to:

  ```tsx
  <div className="p-4 border-b bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-4 flex-wrap">
  ```

- [ ] **Step 3: Verify Tailwind CSS variable compatibility**

  The `var(--color-emerald-500)` etc. are Tailwind CSS v4 color variables. Verify they render correctly.

  Run: `npx tsc -b`
  Expected: 0 errors

  Run: `npm run lint`
  Expected: No new errors

- [ ] **Step 4: Commit**

  ```bash
  git add src/features/attendance/pages/MarkAttendancePage.tsx
  git commit -m "feat(attendance): add visual attendance progress bar in quick metrics"
  ```

---

### Task 6: Unsaved Changes Protection (beforeunload + Visual Indicator)

**Files:**
- Modify: `src/features/attendance/pages/MarkAttendancePage.tsx`

**Interfaces:**
- Consumes: `hasUnsavedChanges: boolean`, `canEdit: boolean`
- Produces: Browser beforeunload warning when navigating away with unsaved changes; visual "unsaved changes" badge in the status banner

- [ ] **Step 1: Add the `beforeunload` effect**

  Add a new `useEffect` after the existing effects (after line 207):

  ```tsx
  // Warn before leaving with unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);
  ```

- [ ] **Step 2: Add an unsaved changes indicator badge**

  In the Status & Overview Banner section (around line 543, after the Mode Indicator badges), add:

  ```tsx
  {/* Unsaved Changes Indicator */}
  {canEdit && hasUnsavedChanges && (
    <Badge
      variant="outline"
      className="text-[11px] gap-1 text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/30 animate-pulse"
    >
      <Edit3 className="w-3 h-3" />
      Unsaved Changes
    </Badge>
  )}
  ```

- [ ] **Step 3: Verify build and lint**

  Run: `npx tsc -b`
  Expected: 0 errors

  Run: `npm run lint`
  Expected: No new errors

- [ ] **Step 4: Commit**

  ```bash
  git add src/features/attendance/pages/MarkAttendancePage.tsx
  git commit -m "feat(attendance): add unsaved changes protection and visual indicator"
  ```
