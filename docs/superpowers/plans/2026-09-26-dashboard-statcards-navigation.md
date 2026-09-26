# Dashboard Clickable StatCards Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the top 4 KPI StatCards on the dashboard clickable links that navigate directly to their respective management pages: "Active Students" -> Students Roster, "Classes & Sections" -> Classes & Sections, "Attendance Today" -> Attendance Reports, and "Staff Members" -> School Members.

**Architecture:** Wrap the 4 StatCard elements in `src/features/dashboard/pages/DashboardPage.tsx` with TanStack Router `<Link>` components, applying accessible focus rings, hover lift (`group-hover:-translate-y-0.5`), and border glow (`group-hover:border-primary/50`). Provide role-aware routing fallbacks for parent and teacher roles.

**Tech Stack:** React 19, TypeScript, TanStack Router (`<Link>`), Tailwind CSS v4, Lucide icons

**Spec:** User prompt: "inside dashboards i want to make top 4 statcards clickable, "Active Students" card should redirect to "Students roster", "Classes & Sections" to "Classes & Sections", "Attendance Today" to "Attendance Reports" and "Staff Members" to "School Members"."

## Global Constraints

- Use genuine TanStack Router `<Link>` components (supports Cmd/Ctrl+Click, keyboard Tab/Enter navigation, URL previews).
- Maintain responsive grid layout (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`).
- All cards must use `h-full` so row height remains uniform.
- Zero regressions in TypeScript build (`npx tsc -b`) and linting (`npm run lint`).
- Preserve dark mode styles and existing card metrics.

---

## Navigation Mapping

| StatCard Title | Target Destination | Route Path | Role Context |
|---|---|---|---|
| **Active Students** | Students Roster | `/academic/students` | Default for Admin / Staff (`/academic/my-children` for Parent) |
| **Classes & Sections** | Classes & Sections | `/academic/classes` | Default for Admin / Staff (`/academic/my-assignments` for Teacher) |
| **Attendance Today** | Attendance Reports | `/attendance/reports` | All roles (`/attendance/reports`) |
| **Staff Members** | School Members | `/members` | Default for Admin / Staff (`/academic/my-children` for Parent) |

---

### Task 1: Wrap Top 4 StatCards in `DashboardPage.tsx` with Interactive Links

**Files:**
- Modify: `src/features/dashboard/pages/DashboardPage.tsx:267-322`

**Interfaces:**
- Consumes: `<Link>` from `@tanstack/react-router`, `isParent`, `isTeacher`, `StatCard`
- Produces: 4 interactive cards with tactile hover affordance and direct routing

- [ ] **Step 1: Update the KPI Stats Grid in `DashboardPage.tsx`**

  In `src/features/dashboard/pages/DashboardPage.tsx`, locate the KPI Stats Grid (lines ~267–321):

  ```tsx
  {/* KPI Stats Grid (1 col phone, 2 cols tablet, 4 cols desktop) */}
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
    {/* 1. Active Students -> Students Roster */}
    <Link
      to={isParent ? '/academic/my-children' : '/academic/students'}
      className="block group rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      title={isParent ? 'View Linked Children' : 'View Students Roster'}
    >
      <StatCard
        title={isParent ? 'Linked Children' : 'Active Students'}
        value={isParent ? (parentChildren?.length ?? 0) : (tenantMetrics?.total_students ?? totalEnrolledStudents)}
        icon={isParent ? Baby : GraduationCap}
        description={isParent ? 'Children linked to your account' : 'Total enrolled students'}
        className="h-full cursor-pointer transition-all duration-200 group-hover:border-primary/50 group-hover:shadow-md group-hover:-translate-y-0.5 active:scale-[0.99]"
      />
    </Link>

    {/* 2. Classes & Sections -> Classes & Sections */}
    <Link
      to={isTeacher ? '/academic/my-assignments' : '/academic/classes'}
      className="block group rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      title={isTeacher ? 'View My Teaching Duties' : 'View Classes & Sections'}
    >
      <StatCard
        title={isTeacher ? 'My Assignments' : 'Classes & Sections'}
        value={isTeacher ? (teacherAssignments?.length ?? 0) : (tenantMetrics?.total_classes ?? classes.length)}
        icon={BookOpen}
        description={
          isTeacher
            ? `${classTeacherDuties} class teacher duties`
            : `${totalSections} sections`
        }
        className="h-full cursor-pointer transition-all duration-200 group-hover:border-primary/50 group-hover:shadow-md group-hover:-translate-y-0.5 active:scale-[0.99]"
      />
    </Link>

    {/* 3. Attendance Today -> Attendance Reports */}
    <Link
      to="/attendance/reports"
      className="block group rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      title="View Attendance Reports"
    >
      <StatCard
        title="Attendance Today"
        value={
          isParent
            ? (parentChildren?.length ? 'Active' : 'Pending')
            : `${attendanceRate != null ? `${attendanceRate.toFixed(1)}%` : 'Pending'}`
        }
        icon={CalendarCheck}
        description={
          isParent
            ? 'Children tracking status'
            : `${confirmedSections} of ${totalSections} sections confirmed`
        }
        trend={
          !isParent && attendanceRate != null
            ? { value: attendanceRate >= 80 ? 2.1 : -1.5, label: 'vs yesterday' }
            : undefined
        }
        className="h-full cursor-pointer transition-all duration-200 group-hover:border-primary/50 group-hover:shadow-md group-hover:-translate-y-0.5 active:scale-[0.99]"
      />
    </Link>

    {/* 4. Staff Members -> School Members */}
    <Link
      to={isParent ? '/academic/my-children' : '/members'}
      className="block group rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      title={isParent ? 'View Report Cards' : 'View School Members'}
    >
      <StatCard
        title={isParent ? 'Report Cards' : 'Staff Members'}
        value={
          isParent
            ? (parentReportCards?.total_published_exams ?? 0)
            : (tenantMetrics?.total_teachers ?? 0)
        }
        icon={isParent ? Award : Users}
        description={
          isParent
            ? 'Published exam report cards'
            : 'Teachers & staff in your school'
        }
        className="h-full cursor-pointer transition-all duration-200 group-hover:border-primary/50 group-hover:shadow-md group-hover:-translate-y-0.5 active:scale-[0.99]"
      />
    </Link>
  </div>
  ```

- [ ] **Step 2: Run verification checks**

  Run: `npx tsc -b`
  Expected: 0 errors

  Run: `npm run lint`
  Expected: 0 errors

- [ ] **Step 3: Commit**

  ```bash
  git add src/features/dashboard/pages/DashboardPage.tsx
  git commit -m "feat(dashboard): link top 4 statcards to students roster, classes, attendance reports, and members"
  ```

---

### Task 2: (Optional Enhancement) Link Scoped Teacher KPI Cards in `TeacherMissionControlHub.tsx`

**Files:**
- Modify: `src/features/dashboard/components/teacher/TeacherMissionControlHub.tsx:176-225`

**Interfaces:**
- Consumes: `<Link>` from `@tanstack/react-router`, `StatCard`
- Produces: Interactive links for teachers viewing their scoped mission control dashboard:
  - "My Students" -> `/academic/parent-directory` (or `/academic/classes/$classId`)
  - "Today's Attendance" -> `/attendance/mark`
  - "Teaching Subjects" -> `/academic/my-assignments`
  - "Pending Exam Marks" -> `/examination/exams`

- [ ] **Step 1: Add Link import and wrap teacher KPI cards in `TeacherMissionControlHub.tsx`**

  Import `Link` from `@tanstack/react-router`:
  ```tsx
  import { Link } from '@tanstack/react-router';
  ```

  Wrap the 4 cards around line 176 with their respective routes.

- [ ] **Step 2: Run verification checks**

  Run: `npx tsc -b`
  Expected: 0 errors

  Run: `npm run lint`
  Expected: 0 errors

- [ ] **Step 3: Commit**

  ```bash
  git add src/features/dashboard/components/teacher/TeacherMissionControlHub.tsx
  git commit -m "feat(dashboard): link teacher mission control kpi cards to relevant workflows"
  ```
