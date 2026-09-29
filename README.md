# 🎓 Schools Up Pro — Multi-Tenant School Management Platform (Frontend)

[![React 19](https://img.shields.io/badge/React-19.2%2B-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8%2B-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6.2%2B-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.0%2B-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![TanStack Router](https://img.shields.io/badge/TanStack_Router-v1.0%2B-FF4154?logo=react-query&logoColor=white)](https://tanstack.com/router)
[![TanStack Query](https://img.shields.io/badge/TanStack_Query-v5.0%2B-FF4154?logo=react-query&logoColor=white)](https://tanstack.com/query)
[![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-Radix_UI-000000?logo=shadcnui&logoColor=white)](https://ui.shadcn.com)
[![Zod](https://img.shields.io/badge/Zod-3.24%2B-3E67B1?logo=zod&logoColor=white)](https://zod.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A production-grade, domain-aligned **React 19 Single Page Application (SPA)** for the **SSUP** (Schools Up Pro) Multi-Tenant School Management Platform. Designed with a **hybrid authorization UX engine (Strict RBAC + ReBAC + ABAC)**, multi-role active persona support, dynamic tenant isolation, mobile-first responsive architecture with stacked data cards, centralized Axios interceptors for automatic JWT refresh rotation, and a comprehensive **Super Admin Governance & Audit Trail** suite.

---

## 📑 Table of Contents

- [✨ Recent Updates](#-recent-updates)
- [✨ Features](#-features)
- [🎨 Unified UI/UX Design System & Primitives](#-unified-uiux-design-system--primitives)
  - [Modern UI Component Primitives](#modern-ui-component-primitives)
  - [Standardized Role Badges & Status System](#standardized-role-badges--status-system)
  - [Accessible Light & Dark Mode Token Architecture](#accessible-light--dark-mode-token-architecture)
- [🏛 Architecture & Design Principles](#-architecture--design-principles)
  - [Layered Domain Alignment](#layered-domain-alignment)
  - [Per-Feature 5-File Slice Standard](#per-feature-5-file-slice-standard)
  - [Hybrid Authorization System (RBAC + ReBAC + ABAC)](#hybrid-authorization-system-rbac--rebac--abac)
  - ["View As" Support Sessions & Client-Side Guardrails](#view-as-support-sessions--client-side-guardrails)
  - [Multi-Role Active Persona Switching](#multi-role-active-persona-switching)
  - [Multi-Tenant Header & Path Resolution](#multi-tenant-header--path-resolution)
- [🛠 Tech Stack](#-tech-stack)
- [📁 Project Structure](#-project-structure)
- [🚀 Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
  - [Running the Development Server](#running-the-development-server)
  - [Production Build & Verification](#production-build--verification)
  - [Linting & Code Quality](#linting--code-quality)
- [🛡️ Permission Matrix & Route Guards](#️-permission-matrix--route-guards)
- [📱 Mobile-First Responsive Architecture](#-mobile-first-responsive-architecture)
  - [Breakpoint Reference](#breakpoint-reference)
  - [Automatic Stacked Data Tables](#automatic-stacked-data-tables)
  - [Touch Target Compliance (WCAG 2.5.5)](#touch-target-compliance-wcag-255)
- [🔌 API Client & Network Pipeline](#-api-client--network-pipeline)
  - [Response Envelope Unwrapping](#response-envelope-unwrapping)
  - [Automatic Token Refresh Queue](#automatic-token-refresh-queue)
  - [Defense-in-Depth "View As" Interceptor Block](#defense-in-depth-view-as-interceptor-block)
  - [Typed Error Handling](#typed-error-handling)
- [🧹 Client-Side Validation Rules (Zod)](#-client-side-validation-rules-zod)
- [⚙️ Environment Configuration Reference](#️-environment-configuration-reference)
- [📄 License](#-license)

---

## ✨ Recent Updates

- **UI/UX Modernization & Design System Upgrade (Phases 1–5)**:
  - **Global Command Palette (`Cmd+K` / `Ctrl+K`)**: Fast accessible command palette modal ([`CommandPalette.tsx`](file:///E:/SSUP/frontend/src/components/layout/CommandPalette.tsx)) featuring role-aware page navigation, live keyword filtering, keyboard arrows/enter support, and direct actions (theme and calendar system toggles).
  - **Interactive Notification Popover ([`NotificationPopover.tsx`](file:///E:/SSUP/frontend/src/components/layout/NotificationPopover.tsx))**: Replaced the static header bell icon with a real-time notification popover displaying today's classroom attendance pending prompts (with 1-click navigation to mark attendance), upcoming calendar events, and "Mark all as read" dismiss controls.
  - **Theme Tokens & Accessible Neutrality ([`src/index.css`](file:///E:/SSUP/frontend/src/index.css))**: Harmonized light-mode `--muted` to neutral slate (`#f1f5f9`) and `--muted-foreground` to Slate-500 (`#64748b`), eliminating saturated cyan backgrounds in tab bars, disabled elements, and table headers while guaranteeing WCAG AA (>= 4.5:1) text contrast.
  - **Content-Shaped Skeleton Loading ([`skeleton.tsx`](file:///E:/SSUP/frontend/src/components/ui/skeleton.tsx))**: Reusable Radix/shadcn skeleton primitive; enhanced [`StatCard`](file:///E:/SSUP/frontend/src/components/ui/stat-card.tsx) with built-in loading skeletons to eliminate metric flash and layout jumps during tenant or session switching.
  - **Accessible Breadcrumb System ([`breadcrumb.tsx`](file:///E:/SSUP/frontend/src/components/ui/breadcrumb.tsx))**: Radix Slot-based breadcrumb hierarchy with semantic ARIA landmarks across Create Exam, Exam Review, and Score Entry screens.
  - **Instant Search Filter Clear Buttons (`✕`)**: Integrated quick-clear buttons into all table filter search inputs across Classes, Members, Teacher Assignments, Platform Users, and Examinations.
  - **Accessible Form Error State Styling**: Enhanced `Input` and `Textarea` primitives with automatic `aria-[invalid=true]` red border and ring styling.
  - **School Setup Checklist ([`SchoolOnboardingChecklist.tsx`](file:///E:/SSUP/frontend/src/features/dashboard/components/SchoolOnboardingChecklist.tsx))**: Dynamic 5-step onboarding guide on the dashboard for newly onboarded schools (sessions, classes, members, duties, calendar) with completion progress bar.
  - **100% Elimination of Native Popups**: Replaced legacy `window.confirm` and `alert()` calls with accessible [`ConfirmDialog`](file:///E:/SSUP/frontend/src/components/common/ConfirmDialog.tsx) and Sonner `toast.error`.
- **Dashboard Upcoming Events Widget (`DashboardUpcomingCalendar.tsx`)**:
  - Positioned directly below the KPI StatCards on the dashboard for all roles (Principals/Admins, Office Admins, Parents, and Teachers in Teacher Mission Control Hub).
  - Displays the 4 upcoming school events (holidays, exams, vacations, milestones) with dual BS/AD date formatting, color-coded badges, relative time pills (`Ongoing`, `Tomorrow`, `In X days`), duration pills (`X days`), and a quick link to "View Full Calendar" (`/academic-calendar`).
  - Graceful empty state ("No upcoming events scheduled") if no events are coming up.
- **Dedicated Read-Only Academic Calendar for All Roles (`/academic-calendar`)**:
  - Dedicated route accessible to all authenticated roles.
  - Office Admin, Teacher, and Parent roles view the academic calendar in read-only mode (view holidays, exams, vacations, and school events without mutation actions).
  - School Principals (`ADMIN`) and Super Admins retain full event creation, editing, and deletion capabilities.
- **Attendance Reliability, Multi-Duty Support & Optimistic Cache Sync**:
  - Created unified attendance helper module (`src/features/attendance/utils/attendanceStatus.ts`):
    - `getLocalTodayDate()`: Standardizes all date comparisons on the user's local calendar day, resolving UTC timezone discrepancies in Nepal (UTC+5:45).
    - `resolveDutySectionId()`: Automatically resolves fallback section from class if `duty.section_id` is null or unassigned.
    - `isSectionAttendanceMarked()`: Comprehensive multi-tier check inspecting `marked_section_ids`, `sec.is_marked`, `(present_count + absent_count) > 0`, and live `sectionReport` student records.
  - **Optimistic Cache Synchronization in `useMarkAttendance`**: Directly updates `queryClient.setQueriesData` for `[DAILY_ATTENDANCE_STATUS_KEY, tenantId, recordDate]` on mutation success so the dashboard immediately shows marked upon return without cache latency.
  - **Multi-Section Awareness in Teacher Hero Alert (`TeacherDailyActionAlert.tsx`)**: Inspects all class teacher duties; displays green "Today's Attendance Completed" if all duties are marked, or specifies which section is still pending with a direct mark link.
- **Universal Dual Calendar (Bikram Sambat BS / Gregorian AD) Propagation**:
  - Propagated dual calendar representation across the entire platform:
    - Attendance Heatmap (`calendar-heatmap.tsx`)
    - Attendance Reports (`AttendanceReportsPage.tsx`, `SectionNoticeboardTab.tsx`)
    - Mark Attendance date selection & confirmation (`MarkAttendancePage.tsx`, `AttendanceConfirmDialog.tsx`)
    - Absent Students drawer (`AbsentStudentsDrawer.tsx`)
    - Dashboard Hero Banner & Dashboard Page (`DashboardHeroBanner.tsx`, `DashboardPage.tsx`)
    - Academic Calendar (`AcademicCalendarView.tsx`, `NepaliCalendarGrid.tsx`)
    - Examination schedules & score entry (`ExamsListPage.tsx`)
    - Official report cards & printable rosters (`OfficialReportCardDocument.tsx`, `PrintableRosterModal.tsx`)
    - System Audit Logs (`AuditLogsPage.tsx`)
- **School Settings UI/UX Modernization & Accessible Dialogs**:
  - Replaced custom tab nav with accessible shadcn `Tabs`.
  - Standardized accessible confirmation dialogs (`ConfirmDialog.tsx`, `alert-dialog.tsx`) replacing native `window.confirm()` and `alert()`.
  - Dual-date representation in Academic Years list.
  - Clean school search scope selector for Super Admins.
- **User Calendar Preference (Nepali BS vs Gregorian AD)**:
  - Persistent user-selectable calendar system via Zustand (`src/stores/calendarPreferenceStore.ts`), preserved in `localStorage`.
  - Accessible switchers mounted in top desktop header, mobile navigation drawer, user profile dropdown, and inline calendar view toolbar.
  - Dynamically flips date priority across the app: **BS mode** renders Nepali Bikram Sambat dates prominently with Gregorian in subtext; **AD mode** renders Gregorian dates prominently.
  - In Month Grid view, day cells dynamically display the chosen system's day number as the primary number.
- **Academic Year Bounded Calendar & Prominent Event Titles**:
  - Month Grid navigation strictly restricted to active academic session start and end dates; navigating outside session bounds is disabled.
  - Modal date pickers enforce `minDate` and `maxDate` matching the active session, guarding against accidental out-of-year scheduling.
  - Distinct category color palettes with solid left accent bars: Holidays (Rose), Exams (Purple), Vacations (Amber), Events (Emerald), Other (Blue/Slate).
  - Event titles rendered boldly with crisp typography and status dots for maximum visibility in both light and dark modes.
- **Nepali (Bikram Sambat / BS) Date Support & Dual Calendar**:
  - Full Nepali calendar integration for Academic Calendar events (`src/features/school-settings/components/NepaliDatePicker.tsx` and `src/features/school-settings/utils/nepaliDate.ts`).
  - Supports natural selection across Nepali months (Baisakh to Chaitra) with year pickers (2070–2090 BS) and instant BS/AD mode switcher.
  - Automatically translates BS selections to standard Gregorian ISO dates (`YYYY-MM-DD`) for seamless backend API compatibility without altering server schemas.
  - Live dual-date preview badges displaying formatted BS and AD equivalents side-by-side (e.g. *Ashwin 15, 2082 (Oct 1, 2025)*).
- **Visual Month Grid View (`react-big-calendar`)**:
  - Dual view toggle ("List View" vs "Month Grid") with session-level date scoping.
  - Visual month calendar with custom day cells rendering Gregorian day numbers alongside Nepali Bikram Sambat day subtext.
  - Consistent category color badging across both list and month grid modes: Holidays (`rose`), Exam Periods (`purple`), Vacations (`amber`), Events (`emerald`), and Other (`slate`).
  - Interactive grid actions: clicking an empty day pre-fills that date in the "Add Event" modal; clicking an event block opens its edit dialog.
  - Category-aware "School Closed" holiday toggle: auto-checked ON for Holidays and Vacations, auto-checked OFF for Exams, Events, and Other (fully manually overridable).
- **School Settings Hub (`/school-settings`) & Sidebar Administration**:
  - Centralized administrative hub under "Administration" in the sidebar with 4 tabbed workflows: **Academic Sessions** (`?tab=sessions`), **Weekly Academic Days** (`?tab=days`), **Academic Calendar** (`?tab=calendar`), and **School Profile** (`?tab=profile`).
  - Relocated session management from dashboard headers, and redirected `/academic-years` to `/school-settings?tab=sessions` to preserve all legacy bookmarks.
- **Weekly Academic Days Configuration**:
  - Interactive 7-day card selector with one-click presets (*Sunday–Friday*, *Monday–Friday*, *Monday–Saturday*) and RBAC save protection (`ADMIN` only).
- **Academic Calendar & Holiday Management**:
  - Unified calendar view with event category filtering (`HOLIDAY`, `EXAM`, `VACATION`, `EVENT`, `OTHER`), academic session scoping, search, and official school holiday toggles (`is_holiday`).
- **Attendance Alignment with Academic Days & Calendar**:
  - **Mark Attendance Guardrails**: Date picker displays non-academic day / holiday badges, with disabled submission actions and warning banners for off-days.
  - **Academic Year Reporting**: Integrated session filter and "Full Academic Year" date preset on attendance reports, displaying `expected_school_days` in KPI summaries and tagging non-academic days on weekly trend charts.
- **Mark Attendance UX Enhancement (State-Driven Workflow)**:
  - **Saved & Protected Mode (View Mode)**: Automatically enters a read-only protected view once attendance is recorded (or upon loading existing records) to prevent accidental clicks while scrolling on touch/desktop devices.
  - **Visual Status & Metrics Banner**: Displays live completion metrics (present count, absent count, attendance percentage) alongside prominent status badges (`Attendance Recorded`, `Editing Recorded Attendance`, `Not Yet Recorded`, `Locked (>7 days)`).
  - **Explicit Edit Workflow**: A dedicated "Edit Attendance" button unlocks the table roster, exposing "Update Attendance" (with unsaved changes detection) and "Cancel" (which rolls back any uncommitted changes).
  - **7-Day Modification Window**: Strict locking and visual indicators for attendance records outside the 7-day window.
- **Parent-Student Linking & Directory Governance (`/academic/parent-links`)**:
  - **School Leadership Access**: School Administrators (`ADMIN`), Office Admins (`OFFICE_ADMIN`), and Super Admins can now manage parent-student linkages across all school classes and sections without requiring teacher assignments.
  - **Class Roster Visibility**: Directory dropdown automatically loads all school classes for administrators and assigned class sections for teachers.
  - **Guardian Management Actions**: Added "Manage" button in the directory table allowing administrators and teachers to view, replace, or unlink existing guardian links directly via `ParentStudentLinkDialog`.
- **Audit Logs Governance Slice (`src/features/audit-log/`)**:
  - Full 5-file feature slice adhering strictly to project conventions (`pages/`, `components/`, `hooks.ts`, `api.ts`, `schema.ts`).
  - High-performance audit trail table using `ResponsiveDataTable` with debounced action filtering, date-from/date-to pickers, and responsive slide-out detail drawer (`AuditLogDetailDrawer`).
  - Integrated "View Audit Trail" quick-action workflow card on the Super Admin dashboard.
- **Tenant Management Lifecycle**:
  - Added suspend/reactivate toggles with confirmation dialogs across Table and Grid views.
  - Interactive 3-step School Onboarding Wizard (`TenantOnboardDialog`) provisioning new schools, primary admins, and instant invitation link generators.

---

## ✨ Features

| Category | Capabilities |
|---|---|
| **Multi-Tenancy** | Automatic `X-Tenant-ID` header injection across all API requests; persistent active school selection; instant tenant switcher for users holding memberships across multiple schools. |
| **Audit Logs** | Centralized global audit stream with debounced action filtering, date range constraints, pagination, and structured forensic detail drawers. |
| **Tenant Lifecycle** | Suspend, reactivate, and edit school tenants; automated 3-step school onboarding wizard (`/tenants?action=onboard`). |
| **View As Support Sessions** | 15-minute time-boxed impersonation sessions with client-side write blocking, permission lockdown, and a persistent countdown banner. |
| **Hybrid Authorization** | **RBAC** route guards (`beforeLoad` & `usePermission`), **ReBAC** relation scoping (Teacher assignments & linked parent children), and **ABAC** UX safeguards (future attendance date lock, 7-day edit window). |
| **Multi-Role Personas** | Decoupled user identity supporting simultaneous roles within a school (e.g. Teacher who is also a Parent) with dynamic persona switching in global UI state without URL disruption. |
| **Authentication & Session** | Email/Password login with Zod validation, password show/hide toggle, "Remember Me" local storage, in-memory access token storage, and background refresh rotation via `/api/v1/auth/refresh`. |
| **Mobile-First UX** | 100% responsive across phone (`375px`), tablet (`768px`), laptop (`1024px`), and desktop (`1440px`); touch targets ≥ 44x44px; hamburger drawer navigation below `lg`. |
| **Stacked Data Tables** | Automatic dual-mode rendering: wide data tables on desktop (`md+`) gracefully collapse into rich, stacked cards on mobile (`< md`). |
| **School Settings** | Centralized hub for academic sessions & rollovers, tenant-configurable weekly academic days (Sun-Fri, Mon-Fri, etc.), academic calendar events & official holidays, and school branding profile. |
| **Academic Management** | Class catalog with auto-provisioned Section A; 20-student eligibility check before sequential section expansion; single & bulk student enrollment (CSV/XLSX template download); subjects management. |
| **Attendance Tracking** | Daily section attendance checklist with batch toggle actions (Mark All Present/Absent); Class Teacher verification; date range section reports; linked child reports for parents; multi-level dashboard summary. |
| **Modern Component System** | Accessible **shadcn/ui** design tokens built on Tailwind CSS v4, Radix UI primitives, Lucide icons, and Sonner toast notifications. |

---

## 🎨 Unified UI/UX Design System & Primitives

The application implements a strict, accessible design token and component system built on **Tailwind CSS v4**, **Radix UI**, and custom primitives. All screens adhere to uniform spacing, typography scales, contrast standards, and semantic role mappings.

### Modern UI Component Primitives

#### 1. `PageHeader` (`src/components/common/PageHeader.tsx`)
A standardized responsive page header enforcing visual hierarchy across all feature views:
- **Responsive Alignment**: Responsive flex layout wrapping on mobile displays and horizontally distributing actions on desktop (`sm+`).
- **Semantic Structure**: Title (`h1`, `text-2xl` bold, tracking-tight), optional description (`text-sm text-muted-foreground`), and optional badge indicator (`badge` slot).
- **Actions Slot**: Dedicated container (`actions` prop) for primary buttons, exported reports, or session selectors.

```tsx
<PageHeader
  title="Curriculum Subjects"
  description="Manage subject codes, credit weightings, and faculty assignments."
  badge={<Badge variant="outline">Academic Year 2081/82</Badge>}
  actions={
    <Button onClick={() => setIsCreateOpen(true)}>
      <Plus className="w-4 h-4 mr-2" /> Add Subject
    </Button>
  }
/>
```

#### 2. `FilterToolbar` (`src/components/common/FilterToolbar.tsx`)
A generic, type-safe filtering and search bar primitive eliminating repetitive ad-hoc form rows:
- **Search Input**: Uniform `h-9` height, integrated clear button (`✕`), search icon with `pointer-events-none`, and debounced or live binding.
- **Status Segmented Pills**: Compact pill control with active background, borders, and badge counts (`statusOptions`, `activeStatus`, `onStatusChange`).
- **Record Counter**: Built-in "Showing X of Y records" counter (`showingCount`, `totalCount`).
- **Custom Filters Slot**: Accepts domain dropdowns (`Select`, `SchoolSearchSelect`) via children with normalized `h-9` trigger heights.
- **Actions Alignment**: Aligns export, add, or bulk buttons on the far right.

```tsx
<FilterToolbar
  searchPlaceholder="Search curriculum subjects..."
  searchValue={searchTerm}
  onSearchChange={setSearchTerm}
  showingCount={filteredSubjects.length}
  totalCount={allSubjects.length}
  statusOptions={[
    { value: 'ALL', label: 'All Subjects', count: allSubjects.length },
    { value: 'ACTIVE', label: 'Active', count: activeCount },
  ]}
  activeStatus={statusFilter}
  onStatusChange={setStatusFilter}
  actions={
    <Button size="sm" onClick={() => setIsCreateOpen(true)}>
      <Plus className="w-3.5 h-3.5 mr-1.5" /> New Subject
    </Button>
  }
>
  <Select value={classFilter} onValueChange={setClassFilter}>
    <SelectTrigger className="w-[180px] h-9">
      <SelectValue placeholder="All Classes" />
    </SelectTrigger>
    {/* options */}
  </Select>
</FilterToolbar>
```

#### 3. `StatCard` (`src/components/ui/stat-card.tsx`)
Standardized metric summary card primitive replacing inconsistent KPI boxes:
- **Semantic Color Variants**: `default` (Teal/Neutral), `emerald` (Success/Academic), `amber` (Warning/Attention), `blue` (Info/Governance), `purple` (Admin/Super).
- **Built-in Skeleton Loading**: Integrated `loading` prop rendering matching `rounded-xl` shimmering skeletons to eliminate layout shifts.
- **Trend Indicators**: Optional `trend` prop displaying positive/negative percentages with directional Lucide arrows.
- **Interactive Filtering**: `onClick` and `selected` props rendering active ring indicators (`ring-2 ring-primary/40`) and "Filtered" badges.

```tsx
<StatCard
  title="Teaching Faculty"
  value={teachersCount}
  icon={GraduationCap}
  variant="emerald"
  trend={{ value: 4.5, label: "vs last term" }}
  selected={activeFilter === 'TEACHER'}
  onClick={() => setActiveFilter('TEACHER')}
/>
```

#### 4. `SchoolSearchSelect` (`src/features/academic-year/components/SchoolSearchSelect.tsx`)
A universal school context selector utilized across Super Admin pages (`ClassesPage`, `AcademicYearsPage`, `TenantsPage`):
- Debounced live search querying the active tenant catalog.
- Popover-based interface with smooth keyboard navigation, selected checkmarks, and clear triggers.
- Uniform presentation across all multi-school administrative views.

---

### Standardized Role Badges & Status System

SSUP establishes a universal role and status color hierarchy across badges, avatar borders, and KPI cards to ensure immediate cognitive recognition:

#### Role Badges Mapping (`src/components/ui/badge.tsx`)

| Role | Badge Variant | Light Mode Tokens | Dark Mode Tokens | Usage Domain |
|---|---|---|---|---|
| **Super Admin** | `role-super-admin` | `bg-purple-500/15 text-purple-700 border-purple-500/30` | `dark:text-purple-300` | Platform Governance & Audit Trails |
| **Principal / Admin** | `role-admin` | `bg-primary/10 text-primary border-primary/30` | `dark:text-cyan-300` | School Leadership & Operations |
| **Office Admin** | `role-office-admin` | `bg-blue-500/15 text-blue-700 border-blue-500/30` | `dark:text-blue-300` | Administrative Staff & Registrars |
| **Teacher / Faculty** | `role-teacher` | `bg-emerald-500/15 text-emerald-700 border-emerald-500/30` | `dark:text-emerald-300` | Class Teachers & Subject Faculty |
| **Parent / Guardian** | `role-parent` | `bg-amber-500/15 text-amber-700 border-amber-500/30` | `dark:text-amber-300` | Student Guardians & Family Portals |

#### Universal Status Badges

| Status Variant | Color Family | Associated Entities |
|---|---|---|
| `success` | Emerald (`emerald-500`) | `ACTIVE`, `RECORDED`, `PUBLISHED`, `PASSED` |
| `warning` | Amber (`amber-500`) | `PENDING`, `LOCKED`, `UNSAVED`, `TRANSFERRED` |
| `info` | Blue (`blue-500`) | `DRAFT`, `ENROLLED`, `SCHEDULED` |
| `destructive` | Rose / Red (`destructive`) | `SUSPENDED`, `INACTIVE`, `FAILED`, `NON_ACADEMIC_DAY` |
| `purple` | Purple (`purple-500`) | `GRADUATED`, `ALUMNI`, `SPECIAL_EVENT` |
| `outline` | Neutral Slate | `PROTECTED_VIEW`, `OFFICIAL_DOCUMENT` |

---

### Accessible Light & Dark Mode Token Architecture

The design system is powered by Tailwind CSS v4 variables defined in `src/index.css` guaranteeing WCAG 2.1 AA (≥ 4.5:1 text contrast) and AAA compliance:

- **Neutral Slate Surfaces**:
  - Light mode `--muted`: `#f1f5f9` (`slate-100`)
  - Light mode `--muted-foreground`: `#64748b` (`slate-500`, contrast ratio 4.6:1 against background)
  - Eliminates artificial saturated cyan casts in table headers, disabled form controls, and segmented tabs.
- **Dark Mode Elevation & Deep Blacks**:
  - Dark mode `--background`: `#090d16` (deep obsidian slate)
  - Dark mode `--card`: `#0f172a` (`slate-900`)
  - Dark mode `--border`: `#1e293b` (`slate-800`)
- **Explicit Contrast Accents**:
  - All colored badges and interactive chips include explicit `dark:text-{color}-300` or `dark:text-{color}-400` classes to maintain high contrast legibility against dark slate card surfaces.
- **Class-Based Theme Activation**:
  - Strict `.dark` class targeting configured in `@variant dark (&:where(.dark, .dark *));`, eliminating OS media query overrides when user explicitly sets light/dark mode preference via `themeStore`.

---

## 🏛 Architecture & Design Principles

The frontend directly mirrors the backend domain architecture (`identity`, `tenant`, `academic`, `attendance`, `examination`), creating a unified mental model across both repositories.

```
┌──────────────────────────────────────────────────────────────┐
│                      React Application                        │
│  ┌──────────────┐  ┌───────────────┐  ┌────────────────────┐ │
│  │ QueryClient  │  │ AuthProvider  │  │  TenantStore /     │ │
│  │  Provider    │  │  (Context)    │  │  ViewAsStore       │ │
│  │ (TanStack Q) │  │               │  │  (Zustand)         │ │
│  └──────────────┘  └───────────────┘  └────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│              Routing Layer (TanStack Router)                  │
│   ProtectedLayout → usePermission() guard → Redirect / 403   │
├──────────────────────────────────────────────────────────────┤
│                Feature Layer (Domain Slices)                  │
│  ┌────────┐ ┌────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │  auth  │ │tenant/ │ │ academic │ │attendance│ │ audit  │ │
│  │        │ │settings│ │          │ │          │ │  -log  │ │
│  │ pages/ components/ hooks/ api.ts schema.ts  (same shape) │ │
│  └───┬────┘ └───┬────┘ └────┬─────┘ └────┬─────┘ └───┬────┘ │
├──────┼───────────┼───────────┼────────────┼────────────┼─────┤
│      ▼           ▼           ▼            ▼            ▼     │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │   Core Layer: api/ (Axios instance + Interceptors),      │ │
│  │   auth/ (AuthContext, usePermission), config/ (env,     │ │
│  │   permissions), components/ui/ (shadcn primitives)      │ │
│  └───────────────────────────┬─────────────────────────────┘ │
│                              ▼                                 │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │   TanStack Query cache  →  Axios  →  FastAPI Backend v1   │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### Layered Domain Alignment

- **Core Layer (`src/api`, `src/auth`, `src/config`, `src/components/ui`)**: Encapsulates cross-cutting concerns: Axios interceptors, JWT refresh queues, tenant headers, global permissions, and design tokens.
- **Feature Layer (`src/features/*`)**: Feature slices containing domain logic, components, data fetching, and forms.
- **State Layer (`src/stores/*`, `src/auth/*`)**: Minimal Zustand stores for UI state (`tenantStore`, `viewAsStore`, `themeStore`), while TanStack Query owns server cache.

### Per-Feature 5-File Slice Standard

Every feature slice under `src/features/` follows this standard structure:

```
src/features/<domain>/
  pages/          # Route page components (e.g. AuditLogsPage, TenantSettingsPage)
  components/     # Feature-local UI (e.g. AuditLogDetailDrawer, TenantOnboardDialog)
  hooks.ts        # TanStack Query wrappers (e.g. useAuditLogs, useTenant)
  api.ts          # Strongly typed Axios fetch functions for this domain
  schema.ts       # Zod validation schemas & inferred TypeScript types
```

---

### Hybrid Authorization System (RBAC + ReBAC + ABAC)

SSUP coordinates 3 tiers of authorization driving both UI visibility and server enforcement:

```
┌──────────────────────────────────────────────────────────┐
│  Tier 1: Tenant Boundary & Strict RBAC                   │
│  Navigation gating & route guards via permission matrix   │
└────────────────────────────┬─────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────┐
│  Tier 2: Relationship-Based Access Control (ReBAC)       │
│  - Teacher to Class/Section assignments (Class Teacher)  │
│  - Parent to Student links (My Children view)            │
└────────────────────────────┬─────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────┐
│  Tier 3: Attribute-Based Access Control (ABAC)           │
│  - Client-side future date lock on attendance picker     │
│  - Graceful handling of backend 403 edit window rules    │
│  - "View As" read-only session client-side lockdown      │
└──────────────────────────────────────────────────────────┘
```

1. **RBAC**: Evaluated client-side using `src/config/permissions.ts` and the `usePermission()` hook.
2. **ReBAC**: The frontend fetches scoped relation data from dedicated endpoints (`/academic/tenants/{id}/teachers/my-assignments` and `/academic/tenants/{id}/parents/my-children`). The UI dynamically displays Class Teacher badges or child cards based on this relation data.
3. **ABAC**: Enforced via client validation (disabling future dates in date pickers) and centralized Axios interceptors for `403 FORBIDDEN` responses.

---

### "View As" Support Sessions & Client-Side Guardrails

For troubleshooting and support, Super Admins can initiate a **15-minute read-only support session** to view the platform through the lens of a specific user:
- **Client-Side Request Interceptor**: While `viewAsStore.activeToken` is present, the Axios interceptor immediately rejects all mutating methods (`POST`, `PUT`, `PATCH`, `DELETE`) with a 403 `ApiError`, bypassing only the logout endpoint.
- **Permission Guard**: `usePermission().can()` intercepts calls during a view session and returns `false` for any non-read action (`!permission.startsWith('VIEW_') && !permission.startsWith('READ_')`).
- **Global Countdown Banner**: `ViewAsBanner.tsx` displays remaining time with automated client-side expiry and a prominent "End Session" action.

---

### Multi-Role Active Persona Switching

Users with multiple responsibilities in a school (such as a Teacher who also has a child enrolled as a Parent) do not need separate accounts:
- Global state tracks `activeRole` (`SUPER_ADMIN`, `ADMIN`, `OFFICE_ADMIN`, `TEACHER`, `PARENT`).
- The top header provides an instant **Persona Switcher** allowing users to switch contexts seamlessly.
- Navigation links and action capabilities instantly update based on the selected persona.

---

### Multi-Tenant Header & Path Resolution

To support multi-tenancy seamlessly across all backend modules:
- The Axios client attaches the active school ID via the `X-Tenant-ID: <uuid>` header on all requests.
- Endpoints requiring tenant path parameters (e.g. `/academic/tenants/{tenant_id}/...`) interpolate `activeTenantId` directly from `useTenantStore`.

---

## 🛠 Tech Stack

| Component | Technology | Version | Purpose |
|---|---|---|---|
| **Framework** | [React](https://react.dev) | `^19.2.0` | UI Component Library |
| **Language** | [TypeScript](https://typescriptlang.org) | `~5.8.0` | Strict static typing |
| **Bundler** | [Vite](https://vitejs.dev) | `^6.2.0` | Fast dev server & optimized rollup production builds |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com) | `^4.0.0` | Next-gen CSS-first utility styling |
| **Component Primitives** | [Radix UI](https://radix-ui.com) | Latest | Accessible unstyled primitives (Dialog, Dropdown, Checkbox, Label, Avatar) |
| **Routing** | [TanStack Router](https://tanstack.com/router) | `^1.160.0` | Type-safe client-side routing & route guards |
| **Server State** | [TanStack Query](https://tanstack.com/query) | `^5.69.0` | Caching, background refetching & mutation invalidation |
| **Form Validation** | [React Hook Form](https://react-hook-form.com) + [Zod](https://zod.dev) | `^7.55.0` / `^3.24.0` | Type-safe form validation mirroring backend Pydantic schemas |
| **Data Tables** | [TanStack Table](https://tanstack.com/table) + Custom Responsive Table | `^8.21.0` | Mobile stacked card view + desktop data grid |
| **HTTP Client** | [Axios](https://axios-http.com) | `^1.8.0` | Interceptors for JWT attach, tenant header, refresh queue & View As lockdown |
| **Client State** | [Zustand](https://zustand-demo.pmnd.rs) | `^5.0.0` | Lightweight stores (`tenantStore`, `viewAsStore`, `themeStore`) |
| **Icons** | [Lucide React](https://lucide.dev) | `^0.479.0` | Clean, modern vector icons |
| **Notifications** | [Sonner](https://sonner.emilkowal.ski) | `^2.0.0` | Accessible rich toast alerts |
| **Calendar Grid** | [react-big-calendar](https://github.com/jquense/react-big-calendar) | `^1.17.1` | Visual month grid view with dayjs localizer & custom date header |
| **Nepali Date Engine** | [nepali-date-converter](https://github.com/sauravmh/nepali-date-converter) | `^3.4.0` | Bidirectional Bikram Sambat (BS) ↔ Gregorian (AD) date conversions |
| **Linter** | [Oxlint](https://oxc.rs) | `^1.79.0` | High-speed Rust-based JavaScript/TypeScript linter |

---

## 📁 Project Structure

```
frontend/
├── .env                              # Local environment configuration (gitignored)
├── .env.example                      # Committed environment variables template
├── .gitignore                        # Git ignore patterns
├── .oxlintrc.json                    # Oxlint configuration
├── BACKEND_ARCHITECTURE.md           # Backend API & domain specification
├── PLAN.md                           # Master architectural build plan
├── README.md                         # Project documentation
├── index.html                        # Single-page application entrypoint
├── package.json                      # Project dependencies and npm scripts
├── tsconfig.json                     # TypeScript reference config
├── tsconfig.app.json                 # TypeScript compiler options and '@/*' alias
├── vite.config.ts                    # Vite bundler, Tailwind v4 and path aliases
└── src/
    ├── main.tsx                      # App bootstrap & DOM mount
    ├── App.tsx                       # RouterProvider and AppProviders root
    ├── index.css                     # Tailwind CSS v4 design tokens and theme variables
    ├── vite-env.d.ts                 # Ambient TypeScript declarations for Vite env
    │
    ├── api/                          # Core HTTP Client Layer
    │   ├── client.ts                 # Axios instance, Bearer attach, X-Tenant-ID & View As lockdown
    │   ├── errors.ts                 # Typed ApiError hierarchy
    │   └── types.ts                  # Universal ApiResponse<T>, TokenResponse, UserProfileDTO
    │
    ├── app/                          # Routing & Providers
    │   ├── router.tsx                # TanStack Router route tree definition
    │   ├── ProtectedLayout.tsx       # Auth route guard and session verification
    │   └── providers.tsx             # QueryClientProvider + AuthProvider wrapper
    │
    ├── auth/                         # Authentication & Permissions
    │   ├── AuthContext.tsx           # User profile, login/logout, tenant/persona switching
    │   ├── useAuth.ts                # AuthContext consumer hook
    │   └── usePermission.ts          # RBAC capability check hook (can, isRole, isAnyRole)
    │
    ├── config/                       # Configuration Modules
    │   ├── env.ts                    # Zod-validated, frozen runtime environment singleton
    │   └── permissions.ts            # Permission matrix single source of truth
    │
    ├── stores/                       # Lightweight Zustand Stores
    │   ├── tenantStore.ts            # Active tenant ID & name state
    │   ├── viewAsStore.ts            # 15-minute "View As" session store
    │   ├── themeStore.ts             # Theme mode (light, dark, system) state
    │   └── calendarPreferenceStore.ts # Dual calendar system preference (BS vs AD)
    │
    ├── components/                   # Shared UI Primitives & Layouts
    │   ├── layout/
    │   │   ├── AppShell.tsx          # Responsive mobile drawer + desktop sidebar layout
    │   │   ├── CommandPalette.tsx    # Accessible Cmd+K / Ctrl+K quick navigation modal
    │   │   ├── NotificationPopover.tsx # Header notification popover (attendance alerts, events)
    │   │   ├── ViewAsBanner.tsx      # Sticky warning banner with countdown timer
    │   │   └── SchoolHeaderBadge.tsx # Tenant indicator and switcher badge
    │   ├── common/
    │   │   ├── PageHeader.tsx        # Standard responsive page title, description & actions header
    │   │   ├── FilterToolbar.tsx     # Generic status segmented pills, search & count filter bar
    │   │   ├── ResponsiveDataTable.tsx # Auto dual-mode: stacked cards (<md) & table (md+)
    │   │   ├── ConfirmDialog.tsx     # Accessible confirmation dialog (replaces window.confirm)
    │   │   └── PlaceholderPage.tsx   # Scaffold placeholder for upcoming feature routes
    │   └── ui/                       # Accessible shadcn primitives
    │       ├── alert-dialog.tsx      # Radix-based accessible modal alert dialogs
    │       ├── avatar.tsx
    │       ├── badge.tsx
    │       ├── breadcrumb.tsx        # Radix-based accessible breadcrumb system
    │       ├── button.tsx            # 44px mobile touch target button
    │       ├── card.tsx
    │       ├── chart-card.tsx        # Styled chart container card
    │       ├── checkbox.tsx          # 44px touch row checkbox
    │       ├── dialog.tsx            # Full-screen (<sm) and centered modal (sm+)
    │       ├── dropdown-menu.tsx
    │       ├── input.tsx             # Mobile 16px/14px anti-zoom input with aria-invalid styling
    │       ├── label.tsx
    │       ├── nepali-date-picker.tsx # Universal BS/AD dual calendar date picker
    │       ├── popover.tsx           # Accessible Popover primitive for datepickers
    │       ├── sheet.tsx             # Drawer primitive for detail views
    │       ├── skeleton.tsx          # Shimmer content-shaped loading skeleton primitive
    │       ├── sonner.tsx            # Rich toast notifications
    │       ├── stat-card.tsx         # Standardized metric card primitive with loading skeleton
    │       ├── table.tsx
    │       └── textarea.tsx
    │
    ├── features/                     # Domain Feature Slices (5-file standard)
    │   ├── auth/                     # Authentication & Login
    │   ├── dashboard/                # Unified, Teacher Mission Control & Super Admin KPI Hubs
    │   │   ├── components/           # DashboardUpcomingCalendar, SchoolOnboardingChecklist, AttendanceDashboardHub, SchoolResultsDashboardHub
    │   │   └── components/teacher/   # TeacherMissionControlHub, TeacherDailyActionAlert, TeacherClassroomSectionCard
    │   ├── audit-log/                # System audit trail & detail drawers
    │   ├── tenants/                  # Tenant management & onboarding wizard
    │   ├── platform-users/           # Platform user directory & memberships
    │   ├── academic/                 # Classes, sections, subjects & teacher assignments
    │   ├── academic-year/            # Academic year management & selector
    │   ├── school-settings/          # School settings hub (sessions, days, BS/AD calendar, profile)
    │   │   ├── pages/                # SchoolSettingsPage, AcademicCalendarPage (read-only view)
    │   │   ├── components/           # AcademicCalendarView, AcademicCalendarGrid, CalendarEventDialog
    │   │   ├── styles/calendar.css   # react-big-calendar custom styling
    │   │   └── utils/nepaliDate.ts   # BS ↔ AD bidirectional date converter utilities
    │   ├── attendance/               # Daily attendance & reporting
    │   │   ├── pages/                # MarkAttendancePage, AttendanceReportsPage, MyAssignmentsPage
    │   │   ├── components/           # AbsentStudentsDrawer, AttendanceConfirmDialog
    │   │   └── utils/                # attendanceStatus.ts (local date, marked checks, duty resolution)
    │   ├── examination/              # Exams, grading & report cards
    │   └── members/                  # School member directory & parent-student links
    │
    └── lib/
        └── utils.ts                  # cn() class merging utility (clsx + twMerge)
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v20.11.0` or higher
- **Package Manager**: `npm` (v10+), `pnpm` (v9+), or `bun`
- **Backend**: FastAPI backend running at `http://localhost:8000` (see [BACKEND_ARCHITECTURE.md](file:///E:/SSUP/frontend/BACKEND_ARCHITECTURE.md))

### Installation

```bash
# Clone repository and enter frontend directory
cd frontend

# Install dependencies
npm install
```

### Environment Configuration

Create a local `.env` file from `.env.example`:

```bash
# Copy template
cp .env.example .env
```

Review and adjust `.env` if your backend runs on a different port or host:
```ini
VITE_API_BASE_URL=http://localhost:8000
VITE_API_VERSION=/api/v1
VITE_TENANT_HEADER_NAME=X-Tenant-ID
VITE_APP_NAME=Schools Up Pro
```

### Running the Development Server

```bash
npm run dev
```

The app will start at `http://localhost:5173` with instant Hot Module Replacement (HMR).

### Production Build & Verification

To compile the TypeScript project and bundle for production:

```bash
npm run build
```

The optimized bundle is output to the `dist/` directory.

To preview the production build locally:
```bash
npm run preview
```

### Linting & Code Quality

```bash
npm run lint
```

---

## 🛡️ Permission Matrix & Route Guards

Defined in [`src/config/permissions.ts`](file:///E:/SSUP/frontend/src/config/permissions.ts) as the single source of truth:

| Feature / Resource | `SUPER_ADMIN` | `ADMIN` (Principal) | `OFFICE_ADMIN` (Vice Principal) | `TEACHER` (Faculty) | `PARENT` (Guardian) |
|---|:---:|:---:|:---:|:---:|:---:|
| **Onboard / Create Tenant** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Suspend / Reactivate Tenant** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **View Audit Logs** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Start "View As" Session** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Manage Platform Users** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Manage School Settings / Logo** | ✅ | ✅ | 👁️ (View Only) | ❌ | ❌ |
| **Manage Weekly Academic Days** | ✅ | ✅ | 👁️ (View Only) | ❌ | ❌ |
| **View Academic Calendar (`/academic-calendar`)** | ✅ | ✅ | 👁️ (View Only) | 👁️ (View Only) | 👁️ (View Only) |
| **Manage Academic Calendar & Holidays** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Create Office Admin** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Create Teacher / Parent User** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Assign / Revoke Member Roles** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Create / Edit Classes & Subjects** | ✅ | ✅ | ✅ | 👁️ (View Only) | ❌ |
| **Create / Manage Sections & Students** | ✅ | ✅ | ✅ | 👁️ (View Only) | ❌ |
| **Assign Teachers to Classes/Sections** | ✅ | ✅ | ✅ | 👁️ (My Assignments) | ❌ |
| **Link Parents to Students** | ✅ | ✅ | ✅ | ❌ | 👁️ (My Children) |
| **Mark Section Attendance** | ✅ | ✅ | ✅ | 🔑 (Assigned Class Teacher Only) | ❌ |
| **View Section Attendance Report** | ✅ | ✅ | ✅ | 🔑 (Assigned Teacher Only) | ❌ |
| **View Individual Child Attendance** | ✅ | ✅ | ✅ | 🔑 (Student's Teacher) | 🔑 (Own Linked Child Only) |
| **Hard Delete Any Record** | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 📱 Mobile-First Responsive Architecture

### Breakpoint Reference

| Breakpoint | Target Screen | UI Adaptation |
|---|---|---|
| **`< 640px`** (`375px`) | Mobile Phone (iPhone, Android) | 1-column fluid layouts, 44px+ touch targets, hamburger drawer navigation, stacked data cards, full-screen/bottom modals. |
| **`640px` - `767px`** | Large Mobile / Phablet | 2-column KPI grids, compact header. |
| **`768px` - `1023px`** (`768px`) | Tablet (iPad Portrait) | 2-column action cards, drawer navigation, compact dropdowns. |
| **`1024px` - `1279px`** (`1024px`) | Small Laptop (iPad Landscape) | Fixed left sidebar (`w-64`), 3/4-column metrics, full desktop data tables, centered dialogs. |
| **`≥ 1280px`** (`1440px`) | Desktop / Large Monitor | Max-width layout constraint (`max-w-7xl mx-auto`), fluid whitespace, high information density. |

### Automatic Stacked Data Tables

Using [`ResponsiveDataTable`](file:///E:/SSUP/frontend/src/components/common/ResponsiveDataTable.tsx):
- **On `< 768px` (`< md`)**: Automatically renders each record as an individual stacked card with identifiers, names, status tags, and action buttons. Supports interactive row clicking with accessible chevron prompts.
- **On `≥ 768px` (`md+`)**: Automatically switches to the full desktop data table with sticky headers.

### Touch Target Compliance (WCAG 2.5.5)

- All buttons, navigation items, checkboxes, password show/hide toggles, pagination controls, and dropdown triggers enforce a minimum **44x44px touch area** on touch devices.
- Inputs enforce a minimum `16px` (`text-base`) font size on mobile devices to prevent automatic iOS Safari zooming.

---

## 🔌 API Client & Network Pipeline

Located in [`src/api/client.ts`](file:///E:/SSUP/frontend/src/api/client.ts):

### Response Envelope Unwrapping

All backend responses arrive in the standard envelope:
```json
{
  "status": true,
  "message": "Operation successful",
  "data": { ... },
  "error": null
}
```
The response interceptor automatically unwraps `data` and returns it directly to callers. If top-level pagination `meta` is present, the envelope is preserved to allow seamless paging.

### Automatic Token Refresh Queue

1. On encountering an `HTTP 401 Unauthorized` response on an active request, Axios pauses subsequent requests and places them into an in-memory queue.
2. An automatic refresh request is dispatched to `POST /api/v1/auth/refresh` using the stored refresh token.
3. Upon receiving new tokens, in-memory access tokens are updated, the authorization header is refreshed, and queued requests are replayed seamlessly.
4. If token refresh fails, tokens are cleared and the user is redirected to `/login`.

### Defense-in-Depth "View As" Interceptor Block

During active support impersonation sessions:
- Client-side Axios interceptors immediately reject any mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`) with a 403 `ApiError` before network dispatch.
- Authentication endpoints like `/auth/logout` are explicitly bypassed to ensure administrators never become trapped in a support session.

### Typed Error Handling

When the backend returns an error envelope:
```json
{
  "status": false,
  "message": "Input validation failed",
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [...],
    "request_id": "req-123"
  }
}
```
The client throws a strongly-typed [`ApiError`](file:///E:/SSUP/frontend/src/api/errors.ts) containing `code`, `details`, `requestId`, and `statusCode`.

---

## 🧹 Client-Side Validation Rules (Zod)

Client validation rules match the backend Pydantic sanitization layer:

| Field | Zod Validation Rule | Sanitization |
|---|---|---|
| **Email** | Valid email format required | Trimmed & lowercased |
| **Password** | Min 8 chars (registration), requires uppercase, lowercase, digit, and special char | Whitespace preserved |
| **Phone** | 10-digit Nepali mobile: `^(98|97)\d{8}$` | Trimmed & spaces removed |
| **Domain Name** | Alphanumeric & hyphens: `^[a-z0-9-]+$` | Lowercased & trimmed |
| **Names** | Required 1-50 chars | Leading/trailing whitespace stripped |
| **Subject Codes** | Max 50 chars | Trimmed & converted to uppercase |
| **Attendance Date** | Cannot be a future date | ISO `YYYY-MM-DD` |
| **Bulk File Upload** | Must be `.csv` or `.xlsx` | Max file size ≤ 5 MB, max 1,000 rows |
| **Logo Upload** | Valid image format | Max file size ≤ 2 MB |

---

## ⚙️ Environment Configuration Reference

All frontend configuration is managed through environment variables loaded and validated at startup via [`src/config/env.ts`](file:///E:/SSUP/frontend/src/config/env.ts).

| Variable | Type | Default | Description |
|---|---|---|---|
| `VITE_API_BASE_URL` | `string` (URL) | `http://localhost:8000` | Base URL of the backend API server |
| `VITE_API_VERSION` | `string` (Path) | `/api/v1` | API version route prefix |
| `VITE_TENANT_HEADER_NAME` | `string` | `X-Tenant-ID` | Header name attached to requests for active tenant scoping |
| `VITE_APP_NAME` | `string` | `Schools Up Pro` | Application display name |

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<p align="center">
  Built with ❤️ for <b>Schools Up Pro</b> — Multi-Tenant School Management Platform
</p>
