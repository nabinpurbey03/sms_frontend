# Graduated Students & Alumni Directory Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide first-class visibility, effortless discoverability, and enhanced management for graduated students (alumni) across navigation, active student roster tabs, and the alumni directory.

**Architecture:** 
1. Expose `Alumni Directory` as a primary navigation item in `src/components/layout/navConfig.ts` under Academics with role-based access.
2. Implement a unified, bi-directional segmented roster switcher (`Active Enrolled` vs `Graduated / Alumni`) in both `StudentsPage.tsx` and `AlumniPage.tsx`.
3. Enhance `GraduatedStudentsTable.tsx` with batch filter pills, quick-action context menu, and clear alumni meta badges.

**Tech Stack:** React 18, Vite, TypeScript, Tailwind CSS, Lucide icons, TanStack Query, Radix UI.

---

## Global Constraints

- Never delete or modify historical student, user, or enrollment records.
- Preserve zero TypeScript/bundling errors (`npm run build` must succeed).
- Maintain 100% test passing rate (`node --test src/**/*.test.mjs`).
- Follow UI/UX Pro Max design standards: high contrast, accessible tap targets (>=44px), responsive overflow handling, clean badge styling.

---

### Task 1: Expose Alumni Directory in Sidebar Navigation

**Files:**
- Modify: `src/components/layout/navConfig.ts:135-150`
- Test: `src/components/layout/__tests__/navConfig.test.mjs` (or existing layout tests)

**Interfaces:**
- Consumes: `ctx.can('VIEW_SECTIONS_STUDENTS')`, `GraduationCap` icon from `lucide-react`.
- Produces: Sidebar nav item for `/academic/alumni` with label "Alumni Directory".

- [ ] **Step 1: Check existing navigation configuration**
Review `src/components/layout/navConfig.ts` to locate the `Students Roster` item under category `'Academics'`.

- [ ] **Step 2: Add Alumni Directory nav item**
Add the item right below `Students Roster`:
```typescript
{
  label: 'Alumni Directory',
  href: '/academic/alumni',
  icon: GraduationCap,
  description: 'Historical records, graduation batches, and alumni transcripts.',
  show: ctx.can('VIEW_SECTIONS_STUDENTS') && ctx.activeRole !== 'ACCOUNTANT',
  category: 'Academics',
},
```

- [ ] **Step 3: Verify build**
Run: `npm run build` in `E:\SSUP\frontend`.
Expected: Succeeded with 0 errors.

- [ ] **Step 4: Commit**
```bash
git add src/components/layout/navConfig.ts
git commit -m "feat(navigation): add Alumni Directory to main sidebar under Academics"
```

---

### Task 2: Implement Unified Roster Toggle on StudentsPage and AlumniPage

**Files:**
- Modify: `src/features/academic/pages/StudentsPage.tsx`
- Modify: `src/features/academic/pages/AlumniPage.tsx`

**Interfaces:**
- Consumes: TanStack Router `Link`, count of active students, count of graduated students (`graduatedData?.total_graduates`).
- Produces: Sleek segmented switcher allowing instant 1-click toggle between active students and graduated alumni.

- [ ] **Step 1: Add Roster Switcher to `StudentsPage.tsx`**
In the page header or directly above the stat cards / filter toolbar, render:
```tsx
<div className="flex items-center gap-1 p-1 bg-muted/60 rounded-xl w-fit border border-border/50">
  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background text-foreground shadow-2xs text-xs font-semibold">
    <Users className="w-3.5 h-3.5 text-primary" />
    <span>Active Roster</span>
    <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4">
      {allStudents.length}
    </Badge>
  </div>
  <Button variant="ghost" size="sm" asChild className="h-8 rounded-lg text-xs text-muted-foreground hover:text-foreground">
    <Link to="/academic/alumni">
      <GraduationCap className="w-3.5 h-3.5 mr-1.5 text-purple-500" />
      <span>Alumni Directory</span>
      <Badge variant="outline" className="ml-1.5 text-[10px] px-1.5 py-0 h-4 bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">
        {graduatedData?.total_graduates ?? 0}
      </Badge>
    </Link>
  </Button>
</div>
```

- [ ] **Step 2: Add Roster Switcher to `AlumniPage.tsx`**
Mirror the switcher in `AlumniPage.tsx` with "Alumni Directory" highlighted as active and "Active Roster" linking back to `/academic/students`.

- [ ] **Step 3: Verify build and unit tests**
Run: `node --test src/**/*.test.mjs` and `npm run build`.
Expected: All tests pass, build succeeds.

- [ ] **Step 4: Commit**
```bash
git add src/features/academic/pages/StudentsPage.tsx src/features/academic/pages/AlumniPage.tsx
git commit -m "feat(academic): add bi-directional roster switcher between Active Students and Alumni"
```

---

### Task 3: Enhance GraduatedStudentsTable with Batch Chips & Quick Actions

**Files:**
- Modify: `src/features/academic/components/GraduatedStudentsTable.tsx`

**Interfaces:**
- Consumes: `GraduatedStudentDTO`, `useAcademicYears`, `useClasses`.
- Produces: Polished alumni directory with graduating batch pills, parent info tooltips, and action dropdown.

- [ ] **Step 1: Add quick-filter batch chips**
Above the table, provide horizontal scrolling chip pills for recent graduation sessions (e.g. `All Batches`, `2082 BS`, `2081 BS`), allowing 1-click filtering without having to open the select dropdown.

- [ ] **Step 2: Enhance Row Actions**
Add quick-access actions to the table row:
- "Enrollment Timeline" (retains existing `StudentEnrollmentHistoryDialog`)
- "Copy Student ID"
- "View Parent Contact"

- [ ] **Step 3: Verify build and tests**
Run: `node --test src/**/*.test.mjs` and `npm run build`.
Expected: 0 errors.

- [ ] **Step 4: Commit**
```bash
git add src/features/academic/components/GraduatedStudentsTable.tsx
git commit -m "feat(academic): polish graduated students table with quick-filter pills and actions"
```

---

### Task 4: Full System Verification

- [ ] **Step 1: Run frontend test suite**
Run: `node --test src/**/*.test.mjs`
Expected: 92+ tests pass.

- [ ] **Step 2: Run frontend production build**
Run: `npm run build`
Expected: 0 errors, optimized asset bundles generated.

- [ ] **Step 3: Verification walkthrough**
Verify in browser:
1. Main navigation shows "Alumni Directory" under Academics.
2. Clicking "Alumni Directory" loads the graduated students list.
3. `/academic/students` has clear segmented toggle to switch to Alumni and back.
4. Filtering by graduating batch filters table correctly.
