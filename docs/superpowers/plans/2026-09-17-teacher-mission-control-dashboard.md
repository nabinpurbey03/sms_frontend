# Teacher Mission Control Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the administrator-centric dashboard view with a dedicated, role-tailored **Teacher Mission Control Dashboard** for teachers, providing immediate access to daily attendance status, today's absent pupils, parent connectivity, exam score entry queues, and assigned class teaching portfolios.

**Architecture:** Role-driven view segregation in `DashboardPage.tsx`. When `activeRole === 'TEACHER' && !can('MANAGE_TENANT_SETTINGS') && !isSuperAdmin`, the app renders `<TeacherMissionControlHub />`. The hub is decomposed into focused, single-responsibility widgets: a personalized action header with dynamic attendance alert, a Class Teacher classroom oversight card (with today's absentees and parent connectivity), an exam grading queue, an assigned teaching portfolio, and a 1-click quick-tools bar. Administrators and Office Admins continue to see the full school-wide administrative dashboard.

**Tech Stack:** React 19, Vite, TanStack Router & Query, Tailwind CSS, Lucide React, Radix UI Dialog & Select, Sonner.

---

## Global Constraints

- Admin and Office Admin dashboard experiences must remain 100% intact and untouched.
- Dual-role capability: A teacher may be a Class Teacher (for 1 section) AND a Subject Teacher (for multiple classes), OR *only* a Subject Teacher (no class teacher duties). The dashboard must dynamically adapt cleanly to both profiles without empty broken cards.
- Mobile and tablet responsive: Must stack neatly into 1 column on mobile screens (<640px) and scale to multi-column grids on desktop.
- Zero TypeScript errors (`npm run build` must compile cleanly).

---

## Proposed Changes

### Component Architecture & File Layout

```
src/features/dashboard/
├── pages/
│   └── DashboardPage.tsx                      [MODIFY] Mount TeacherMissionControlHub when isTeacherOnly
└── components/
    └── teacher/                               [NEW DIRECTORY]
        ├── TeacherMissionControlHub.tsx       [NEW] Main teacher dashboard coordinator
        ├── TeacherHeroBanner.tsx              [NEW] Personalized greeting, duty badges, session selector
        ├── TeacherDailyActionAlert.tsx        [NEW] Priority action alert (Attendance Pending vs Completed)
        ├── TeacherClassroomSectionCard.tsx    [NEW] Class Teacher classroom hub, today's absentees, parent connectivity
        ├── TeacherExamGradingQueue.tsx        [NEW] Active exam grading pipeline & score entry shortcuts
        ├── TeacherTeachingPortfolio.tsx       [NEW] Compact grid of assigned classes and subjects
        └── TeacherQuickShortcutsBar.tsx       [NEW] 1-click tools bar (Attendance, Roster, Exams, Reports, Parents)
```

---

## Tasks Breakdown

### Task 1: Main Dashboard Role Gating & Teacher Container Setup

**Files:**
- Create: `src/features/dashboard/components/teacher/TeacherMissionControlHub.tsx`
- Modify: `src/features/dashboard/pages/DashboardPage.tsx`

**Interfaces:**
- `TeacherMissionControlHub`:
  ```ts
  interface TeacherMissionControlHubProps {
    tenantId: string;
    teacherAssignments: TeacherAssignmentResponse[];
    academicYears: AcademicYearResponse[];
    selectedAcademicYearId: string;
    onSelectAcademicYearId: (id: string) => void;
    activeAcademicYear: AcademicYearResponse | null;
  }
  ```

- [ ] **Step 1: Create `TeacherMissionControlHub.tsx` scaffolding**
Create `src/features/dashboard/components/teacher/TeacherMissionControlHub.tsx` with top-level container structure, data derivations (identifying designated Class Teacher section vs Subject Teacher assignments), and placeholder child sections.

- [ ] **Step 2: Update `DashboardPage.tsx` to conditionally render `TeacherMissionControlHub`**
In `DashboardPage.tsx`, define `isTeacherOnly = activeRole === 'TEACHER' && !can('MANAGE_TENANT_SETTINGS') && !isSuperAdmin`. When true, render `<TeacherMissionControlHub />` instead of the school-wide admin stats and `AttendanceDashboardHub`.

- [ ] **Step 3: Run `npm run build` to verify clean compilation**
Run: `npm run build` in `E:\PBAC\frontend`.
Expected: Exit code 0.

- [ ] **Step 4: Commit Phase 1 container changes**
```bash
git add src/features/dashboard/pages/DashboardPage.tsx src/features/dashboard/components/teacher/TeacherMissionControlHub.tsx
git commit -m "feat(dashboard): add teacher mission control role gate and hub container"
```

---

### Task 2: Teacher Greeting Header, Scoped KPIs & Daily Action Alert

**Files:**
- Create: `src/features/dashboard/components/teacher/TeacherHeroBanner.tsx`
- Create: `src/features/dashboard/components/teacher/TeacherDailyActionAlert.tsx`
- Modify: `src/features/dashboard/components/teacher/TeacherMissionControlHub.tsx`

**Functionality:**
1. **`TeacherHeroBanner.tsx`**:
   - Greeting: Time-aware ("Good morning / Good afternoon, {name} 👋").
   - Duty Tags:
     - Purple badge: `Class Teacher: Class 10 - Section A`
     - Blue badge: `Subject Teacher: Mathematics, Science`
   - Date & Academic Session context: formatted date + session selector dropdown.
2. **`TeacherDailyActionAlert.tsx`**:
   - Checks today's attendance status for the teacher's Class Teacher section using `useDailyAttendanceStatus`.
   - **Case 1 (Attendance Pending):**
     - Amber/Rose banner with warning pulse icon: *"Daily attendance for {className} - Section {sectionName} has not been recorded yet today."*
     - Button: **[Mark Today's Attendance]** -> navigates to `/attendance/mark?classId={classId}&sectionId={sectionId}`.
   - **Case 2 (Attendance Recorded):**
     - Emerald banner with checkmark icon: *"Today's attendance completed ({presentCount} Present, {absentCount} Absent • {rate}% Presence)"*
     - Button: **[Update Attendance Records]** -> navigates to `/attendance/mark?classId={classId}&sectionId={sectionId}`.
   - **Case 3 (Subject Teacher only, no Class Teacher duty):**
     - Informative blue banner displaying upcoming grading duties or daily greeting.
3. **Teacher-Scoped KPI Cards:**
   - **My Enrolled Students**: Total students in their Class Teacher section (or taught across subjects).
   - **Today's Presence Rate**: Exact attendance % for their section today (or "Pending").
   - **Assigned Teaching Subjects**: Count of subjects taught.
   - **Pending Exam Grading**: Active exams awaiting score submission.

- [ ] **Step 1: Implement `TeacherHeroBanner.tsx`**
- [ ] **Step 2: Implement `TeacherDailyActionAlert.tsx`**
- [ ] **Step 3: Integrate Banner, Action Alert, and 4 Scoped KPI Cards into `TeacherMissionControlHub.tsx`**
- [ ] **Step 4: Run `npm run build`**
- [ ] **Step 5: Commit**
```bash
git add src/features/dashboard/components/teacher/
git commit -m "feat(dashboard): add teacher hero banner, dynamic daily action alert, and scoped KPIs"
```

---

### Task 3: Class Teacher Classroom Hub (Section Health, Today's Absentees & Parent Linking)

**Files:**
- Create: `src/features/dashboard/components/teacher/TeacherClassroomSectionCard.tsx`
- Modify: `src/features/dashboard/components/teacher/TeacherMissionControlHub.tsx`

**Functionality:**
- Rendered whenever the teacher has `is_class_teacher === true`.
- **Classroom Overview:** Class name, section name, total students, fill capacity.
- **Today's Absentee List Widget:**
  - When attendance is marked today and absentees exist:
    - Lists absent students (student name, avatar/initials, parent contact phone).
    - Quick "Call Parent" (`tel:{phone}`) link and quick copy button.
  - When attendance is marked today and 0 absentees:
    - Celebration banner: *"100% Attendance today! All {count} pupils are present 🎉"*.
  - When attendance is pending:
    - Prompt: *"Mark today's attendance to see today's absentee summary."*
- **Parent Connectivity Metric & Quick Action:**
  - Displays count of linked parents (e.g. `18 / 20 Parents Connected`).
  - If students are missing parents: Alert chip *"2 pupils have no parent linked"* with **[+ Link Parent]** button.
  - Clicking opens `ParentStudentLinkDialog` directly from the dashboard!

- [ ] **Step 1: Implement `TeacherClassroomSectionCard.tsx`**
- [ ] **Step 2: Connect `ParentStudentLinkDialog` in `TeacherMissionControlHub.tsx`**
- [ ] **Step 3: Run `npm run build`**
- [ ] **Step 4: Commit**
```bash
git add src/features/dashboard/components/teacher/TeacherClassroomSectionCard.tsx src/features/dashboard/components/teacher/TeacherMissionControlHub.tsx
git commit -m "feat(dashboard): add class teacher classroom hub with absentees list and parent connectivity"
```

---

### Task 4: Subject Teacher Grading Queue & Exam Pipeline

**Files:**
- Create: `src/features/dashboard/components/teacher/TeacherExamGradingQueue.tsx`
- Modify: `src/features/dashboard/components/teacher/TeacherMissionControlHub.tsx`

**Functionality:**
- Uses `useTeacherExamAssignments(tenantId)` to fetch active exam subjects assigned to this teacher.
- Displays cards for each exam subject:
  - Exam Name (e.g. "First Term Examination 2026")
  - Class & Subject (e.g. "Grade 10 - Mathematics")
  - Marks Breakdown (Full Mark / Pass Mark)
  - Status Badge:
    - `DRAFT` / `PENDING`: Amber badge *"Pending Score Entry"*
    - `SUBMITTED`: Emerald badge *"Submitted for Review"*
    - `APPROVED`: Blue badge *"Published"*
  - Direct Action Button: **[Enter / Review Scores]** -> deep links to `/examination/scores?examId={examId}&classId={classId}&subjectId={subjectId}`.
- If no exams are pending: Clean positive empty state (*"No active grading duties. All subject scores are up to date."*).

- [ ] **Step 1: Implement `TeacherExamGradingQueue.tsx`**
- [ ] **Step 2: Mount `TeacherExamGradingQueue` in `TeacherMissionControlHub.tsx`**
- [ ] **Step 3: Run `npm run build`**
- [ ] **Step 4: Commit**
```bash
git add src/features/dashboard/components/teacher/TeacherExamGradingQueue.tsx src/features/dashboard/components/teacher/TeacherMissionControlHub.tsx
git commit -m "feat(dashboard): add teacher exam grading queue with direct scoring deep-links"
```

---

### Task 5: Teaching Portfolio Grid, Quick Tools Bar & Verification

**Files:**
- Create: `src/features/dashboard/components/teacher/TeacherTeachingPortfolio.tsx`
- Create: `src/features/dashboard/components/teacher/TeacherQuickShortcutsBar.tsx`
- Modify: `src/features/dashboard/components/teacher/TeacherMissionControlHub.tsx`

**Functionality:**
1. **`TeacherTeachingPortfolio.tsx`**:
   - Displays all assigned classes & subjects in clean, compact cards.
   - Shows role on each card (`Class Teacher` vs `Subject Teacher`).
   - Quick action links: **[View Roster]**, **[View Curriculum]**, **[Mark Attendance]**.
2. **`TeacherQuickShortcutsBar.tsx`**:
   - 1-click tools bar:
     - 📝 **Mark Attendance** -> `/attendance/mark`
     - 👥 **My Class Roster** -> `/academic/classes`
     - 📊 **Attendance Reports** -> `/attendance/reports`
     - 🎓 **Exam Scores** -> `/examination/exams`
     - 📇 **Parent Directory** -> `/academic/parent-directory` (or parent linking)
3. **Verification & Testing:**
   - Verify layout on desktop, tablet, and mobile.
   - Verify Admin login retains full school-wide dashboard.
   - Verify Teacher login displays Teacher Mission Control cleanly.
   - Run `npm run build` and run backend tests (`pytest`).

- [ ] **Step 1: Implement `TeacherTeachingPortfolio.tsx`**
- [ ] **Step 2: Implement `TeacherQuickShortcutsBar.tsx`**
- [ ] **Step 3: Mount in `TeacherMissionControlHub.tsx`**
- [ ] **Step 4: Run `npm run build` and backend `pytest`**
- [ ] **Step 5: Commit & push**
```bash
git add src/features/dashboard/components/teacher/
git commit -m "feat(dashboard): add teacher teaching portfolio and quick shortcuts bar"
git push origin nabin
```

---

## Verification Plan

### Automated Tests
1. **Frontend Compilation:**
   ```bash
   cd E:\PBAC\frontend
   npm run build
   ```
   Must produce 0 TypeScript errors and successfully generate production bundle in `dist/`.

2. **Backend Regression:**
   ```bash
   cd E:\PBAC\backend
   .\.venv\Scripts\pytest tests/test_teacher_class_section_restriction.py tests/test_daily_attendance_status.py tests/test_academic_analytics.py -v
   ```
   Must pass 100%.

### Manual Verification
1. **Login as Administrator:**
   - Verify that the standard School-Wide Dashboard with `AttendanceDashboardHub` and `SchoolResultsDashboardHub` is displayed unchanged.
2. **Login as Class Teacher (Teacher A):**
   - Verify that **Teacher Mission Control** loads immediately upon login.
   - Verify greeting with their name and "Class Teacher: Grade 10 - Section A" badge.
   - Verify the **Daily Action Alert**:
     - Shows "Attendance Pending" before attendance is marked, with direct button to Mark.
     - After marking attendance, turns Emerald showing exact present/absent count.
   - Verify the **Absentee List**:
     - Lists pupils absent today with parent contact phone number.
   - Verify **Parent Connectivity**:
     - Shows connected parents count, with button to link parent directly.
   - Verify **Exam Grading Queue**:
     - Shows assigned exam subjects with 1-click link to enter marks.
3. **Login as Subject Teacher (without Class Teacher duty):**
   - Verify that the dashboard gracefully omits the Class Teacher section card and highlights their assigned subjects and exam grading queue.
