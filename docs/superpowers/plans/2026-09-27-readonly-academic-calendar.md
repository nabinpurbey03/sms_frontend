# Read-Only Academic Calendar for All Roles — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Office Admin, Teacher, and Parent roles read-only access to the academic calendar (holidays, exams, vacations, events) via a dedicated `/academic-calendar` route and a dashboard quick-link card.

**Architecture:** Reuse the existing `AcademicCalendarView` component with `canManage={false}` — it already hides Add/Edit/Delete buttons when `canManage` is false. Create a lightweight wrapper page (`AcademicCalendarPage`) that resolves the tenant context and renders the view. Add a new nav item visible to all school roles, and a quick-action card on the dashboard for Office Admin, Teacher, and Parent.

**Tech Stack:** React, TanStack Router, Zustand (calendarPreferenceStore), shadcn/ui, existing hooks (`useCalendarEvents`, `useAcademicYears`)

**Spec:** User request — "I want office admin, teacher and parent to see (cannot edit) academic calendar. Can we put in the dashboard? Let you have any better idea."

## Global Constraints

- All new files must follow existing project patterns (feature-based directory structure, shadcn/ui components, TypeScript strict mode)
- No new npm dependencies — all components and hooks already exist
- Calendar read-only behavior is already implemented via `canManage={false}` on `AcademicCalendarView`
- Permission gating: the page must be accessible to ALL authenticated roles (Super Admin, Admin, Office Admin, Teacher, Parent)
- The existing `/school-settings?tab=calendar` route with full CRUD remains unchanged for Admin/Super Admin
- Build must pass: `npx tsc --noEmit` and `npm run build` with zero errors

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/features/school-settings/pages/AcademicCalendarPage.tsx` | **Create** | Standalone read-only calendar page wrapper |
| `src/app/router.tsx` | **Modify** | Add `/academic-calendar` route |
| `src/components/layout/AppShell.tsx` | **Modify** | Add "Academic Calendar" nav item for all school roles |
| `src/features/dashboard/pages/DashboardPage.tsx` | **Modify** | Add Academic Calendar quick-action card for non-SuperAdmin-global roles |

---

### Task 1: Create the Read-Only Academic Calendar Page

**Files:**
- Create: `src/features/school-settings/pages/AcademicCalendarPage.tsx`

**Interfaces:**
- Consumes: `AcademicCalendarView` component from `../components/AcademicCalendarView` (props: `tenantId: string`, `canManage: boolean`), `useAuth()` hook (returns `activeTenantId`), `usePermission()` hook (returns `isSuperAdmin`, `can`), `TenantRequiredState` component
- Produces: `AcademicCalendarPage` React component (default page export, no props) — consumed by router in Task 2

- [ ] **Step 1: Create the page component**

Create `src/features/school-settings/pages/AcademicCalendarPage.tsx`:

```tsx
import React from 'react';
import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import { TenantRequiredState } from '@/components/common/TenantRequiredState';
import { AcademicCalendarView } from '../components/AcademicCalendarView';
import { CalendarDays } from 'lucide-react';

export const AcademicCalendarPage: React.FC = () => {
  const { activeTenantId } = useAuth();
  const { can, isSuperAdmin } = usePermission();

  // Only Super Admin + Admin can manage (edit/delete) events
  const canManage = can('MANAGE_TENANT_SETTINGS') || isSuperAdmin;

  if (!activeTenantId) {
    return <TenantRequiredState featureName="academic calendar" />;
  }

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <CalendarDays className="w-7 h-7 text-primary" />
          Academic Calendar
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          View holidays, exam schedules, vacation periods, and important events for the academic session.
        </p>
      </div>

      <AcademicCalendarView tenantId={activeTenantId} canManage={canManage} />
    </div>
  );
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors related to `AcademicCalendarPage`

- [ ] **Step 3: Commit**

```bash
git add src/features/school-settings/pages/AcademicCalendarPage.tsx
git commit -m "feat: add read-only AcademicCalendarPage wrapper component"
```

---

### Task 2: Register the `/academic-calendar` Route

**Files:**
- Modify: `src/app/router.tsx:1-335`

**Interfaces:**
- Consumes: `AcademicCalendarPage` from `@/features/school-settings/pages/AcademicCalendarPage` (Task 1)
- Produces: `/academic-calendar` route accessible to all authenticated users via `protectedLayoutRoute`

- [ ] **Step 1: Add import for AcademicCalendarPage**

At the top of `src/app/router.tsx`, after line 42 (`import { SchoolSettingsPage }`), add:

```tsx
import { AcademicCalendarPage } from '@/features/school-settings/pages/AcademicCalendarPage';
```

- [ ] **Step 2: Create the route definition**

After the `schoolSettingsRoute` definition (after line 223), add:

```tsx
const academicCalendarRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/academic-calendar',
  component: AcademicCalendarPage,
});
```

- [ ] **Step 3: Add route to route tree**

In the `routeTree` children array (inside `protectedLayoutRoute.addChildren([...])`) after `schoolSettingsRoute,` (around line 296), add:

```tsx
    academicCalendarRoute,
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/app/router.tsx
git commit -m "feat: register /academic-calendar route for all authenticated roles"
```

---

### Task 3: Add Navigation Item in AppShell Sidebar

**Files:**
- Modify: `src/components/layout/AppShell.tsx:160-321`

**Interfaces:**
- Consumes: `navItems` array in `AppShell` component, `CalendarDays` icon (already imported at line 28)
- Produces: New nav item visible to all school-level roles (Admin, Office Admin, Teacher, Parent) — not shown for Super Admin global scope (no tenant selected)

- [ ] **Step 1: Add the Academic Calendar nav item**

In the `navItems` array (starting around line 160), add a new entry after the "School Settings" item (after line 208) and before "Parent-Student Links" (line 209). Insert this item:

```tsx
    {
      label: 'Academic Calendar',
      href: '/academic-calendar',
      icon: CalendarDays,
      description: 'View holidays, exams, vacations, and school events.',
      show: !!activeTenantId,
      category: 'Academics',
    },
```

> **Note:** `show: !!activeTenantId` ensures it's visible to ALL roles when they have a school context active. Super Admin without a school selected won't see it (they use `/school-settings?tab=calendar` instead). `CalendarDays` is already imported at line 28.

- [ ] **Step 2: Add `activeTenantId` to the `useMemo` dependency array**

The `navItems` useMemo (line 160) currently has dependencies `[isSuperAdmin, can, isTeacher, isParent]`. Add `activeTenantId` to the dependency array:

```tsx
  ], [isSuperAdmin, can, isTeacher, isParent, activeTenantId]);
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: `✓ built` with no errors

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/AppShell.tsx
git commit -m "feat: add Academic Calendar nav item visible to all school roles"
```

---

### Task 4: Add Dashboard Quick-Action Card

**Files:**
- Modify: `src/features/dashboard/pages/DashboardPage.tsx:362-654`

**Interfaces:**
- Consumes: `CalendarDays` icon (needs to be added to imports), `Link` from TanStack Router, `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `Button` (all already imported)
- Produces: "Academic Calendar" quick-action card visible to all non-SuperAdmin-global views, placed in the Quick Actions grid

- [ ] **Step 1: Add `CalendarDays` to the icon imports**

In `DashboardPage.tsx`, the lucide-react import block (lines 3-20) does not include `CalendarDays`. Add it to the import:

```tsx
import {
  Users,
  BookOpen,
  CalendarCheck,
  Calendar,
  CalendarDays,
  Building2,
  ShieldCheck,
  ArrowRight,
  FileSpreadsheet,
  Baby,
  Sparkles,
  GraduationCap,
  Award,
  Plus,
  ChevronDown,
  TrendingUp,
  Settings,
} from 'lucide-react';
```

- [ ] **Step 2: Add the Academic Calendar quick-action card**

In the Quick Actions grid (inside `<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">`, around line 371), add the following card. Place it after the "Examinations & Results" card block (after line 502) and before the "Parent Linked Children" card (line 504):

```tsx
          {/* Academic Calendar — visible to all school roles */}
          {!!activeTenantId && (
            <Card className="group border-border/60 hover:border-primary/50 transition-all rounded-xl">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-cyan-500/10 text-cyan-600 rounded-lg group-hover:scale-105 transition-transform">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                <CardTitle className="text-base font-semibold pt-2">
                  Academic Calendar
                </CardTitle>
                <CardDescription className="text-xs">
                  {isParent
                    ? 'Check school holidays, exam schedules, and vacation dates'
                    : 'View holidays, exam periods, events, and vacation planner'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <Button
                  variant="outline"
                  className="w-full text-xs font-semibold h-10"
                  asChild
                >
                  <Link to="/academic-calendar">View Calendar</Link>
                </Button>
              </CardContent>
            </Card>
          )}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Verify full build**

Run: `npm run build`
Expected: `✓ built` with no errors

- [ ] **Step 5: Commit and push**

```bash
git add src/features/dashboard/pages/DashboardPage.tsx
git commit -m "feat: add Academic Calendar quick-action card to dashboard"
git push origin nabin
```

---

## Summary of Changes

| What | Where | Who Sees It |
|------|-------|-------------|
| `/academic-calendar` route | `router.tsx` | All authenticated users |
| Read-only calendar page | `AcademicCalendarPage.tsx` | All roles; CRUD only for Admin/Super Admin |
| Sidebar nav item "Academic Calendar" | `AppShell.tsx` | All roles with active school context |
| Dashboard quick-action card | `DashboardPage.tsx` | All roles with active school context |

**Key design decisions:**
1. **Dedicated route over dashboard embed** — The calendar is too complex (KPIs, filters, list/grid toggle, session switcher) to embed inline in the dashboard. A dedicated page provides the full experience without cluttering the dashboard.
2. **Dashboard card as entry point** — A quick-action card on the dashboard gives everyone a clear path to the calendar without needing to discover it in the sidebar.
3. **Reuse `canManage` pattern** — `AcademicCalendarView` already supports read-only mode. No component changes needed.
4. **Admin/Super Admin still has CRUD** — When they access `/academic-calendar`, they'll see edit/delete buttons because `canManage` resolves to `true` for them. The existing `/school-settings?tab=calendar` route continues to work unchanged.
