# AppShell UI/UX & Layout Architecture Modernization Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform `AppShell.tsx` from a monolithic 1060-line component into a modular, accessible, and aesthetically elevated application shell featuring modern SaaS navigation hierarchy, persistent sidebar state, dynamic route breadcrumbs, streamlined topbar controls, and mobile touch-first drawer ergonomics.

**Architecture:**
Decompose `src/components/layout/AppShell.tsx` into focused, single-responsibility subcomponents:
1. `navConfig.ts`: Centralized navigation definitions, role-based visibility rules, category grouping, and active route matching.
2. `ViewAsBanner.tsx`: Self-contained support session countdown banner.
3. `DesktopSidebar.tsx`: Linear/Vercel-inspired collapsible sidebar with localStorage persistence, accent indicator pills, category micro-typography, keyboard shortcut (`⌘B`), and interactive profile footer.
4. `TopHeader.tsx`: Responsive top navigation bar featuring smart route breadcrumbs, centralized school portal switcher, unified command palette trigger (`⌘K`), and streamlined action controls.
5. `MobileNavDrawer.tsx`: Touch-friendly mobile slide-out drawer with WCAG-compliant ≥44px touch targets, mobile header, and ergonomic bottom preferences sheet.
6. `AppShell.tsx`: Clean layout coordinator orchestrating the modular shell components.

**Tech Stack:** React 19, TypeScript, TanStack Router, Tailwind CSS, Radix UI / shadcn/ui primitives, Lucide React, Zustand stores.

**Spec:** Modern SaaS Application Shell (Linear / Vercel style) with WCAG 2.1 AA accessibility, keyboard navigation, and responsive mobile-first ergonomics.

---

## Global Constraints
- React 19, TypeScript strict mode (`npx tsc -b`), Vite build.
- Touch targets on mobile must be at least 44x44px (WCAG 2.5.5).
- All operable controls must have visible focus indicators (`focus-visible:ring-2 focus-visible:ring-primary/40`).
- Text contrast must satisfy WCAG AA (≥4.5:1 for normal text, ≥3:1 for large/accent text).
- Active navigation items must include `aria-current="page"`.
- Sidebar collapsed state must persist across sessions in `localStorage` under key `sms_sidebar_collapsed`.
- Zero test or build regressions.

---

### Task 1: Navigation Configuration, Types & ViewAsBanner Extraction

**Files:**
- Create: `E:\SSUP\frontend\src\components\layout\navConfig.ts`
- Create: `E:\SSUP\frontend\src\components\layout\ViewAsBanner.tsx`
- Modify: `E:\SSUP\frontend\src\components\layout\AppShell.tsx:63-112`

**Interfaces:**
- Consumes: `useAuth`, `usePermission`, `useViewAsStore`
- Produces:
  - `NavItem`: `{ label: string; href: string; icon: LucideIcon; description: string; show: boolean; category: string }`
  - `getNavItems(permissions: PermissionContext): NavItem[]`
  - `isNavItemActive(currentPath: string, navHref: string): boolean`
  - `getBreadcrumbs(pathname: string, navItems: NavItem[]): { label: string; href?: string }[]`
  - `ViewAsBanner`: `React.FC`

- [ ] **Step 1: Create `src/components/layout/navConfig.ts`**

Define the navigation data structures, helper functions, and active route/breadcrumb matching:
```typescript
import {
  LayoutDashboard,
  Building2,
  UsersRound,
  Shield,
  Users,
  Settings,
  HeartHandshake,
  BookOpen,
  Layers,
  UserCheck,
  TrendingUp,
  CalendarCheck,
  FileSpreadsheet,
  GraduationCap,
  Baby,
  Award,
  type LucideIcon,
} from 'lucide-react';
import type { PermissionKey } from '@/config/permissions';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
  show: boolean;
  category: 'Overview' | 'Administration' | 'Academics' | 'Attendance' | 'Examinations' | 'Teacher Desk' | 'Parent Portal';
}

export interface NavPermissionsContext {
  isSuperAdmin: boolean;
  isTeacher: boolean;
  isParent: boolean;
  can: (permission: PermissionKey) => boolean;
  activeTenantId: string | null;
}

export const getNavItems = (ctx: NavPermissionsContext): NavItem[] => [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    description: 'Overview of your school activities and metrics.',
    show: true,
    category: 'Overview',
  },
  {
    label: 'Tenant Management',
    href: '/tenants',
    icon: Building2,
    description: 'Manage school campuses and platform settings.',
    show: ctx.isSuperAdmin,
    category: 'Administration',
  },
  {
    label: 'Platform Users',
    href: '/platform-users',
    icon: UsersRound,
    description: 'Manage all global platform user accounts.',
    show: ctx.isSuperAdmin,
    category: 'Administration',
  },
  {
    label: 'Audit Logs',
    href: '/audit-logs',
    icon: Shield,
    description: 'View system audit trails.',
    show: ctx.isSuperAdmin,
    category: 'Administration',
  },
  {
    label: 'School Members',
    href: '/members',
    icon: Users,
    description: 'Manage students, teachers, and administrators.',
    show: ctx.can('CREATE_TEACHER_PARENT'),
    category: 'Administration',
  },
  {
    label: 'School Settings',
    href: '/school-settings',
    icon: Settings,
    description: 'Configure academic sessions, weekly days, calendar, and school profile.',
    show: ctx.can('MANAGE_TENANT_SETTINGS') || ctx.isSuperAdmin,
    category: 'Administration',
  },
  {
    label: 'Parent-Student Links',
    href: '/academic/parent-links',
    icon: HeartHandshake,
    description: 'Connect parents to their children.',
    show: ctx.can('LINK_PARENTS'),
    category: 'Administration',
  },
  {
    label: 'Classes & Sections',
    href: '/academic/classes',
    icon: BookOpen,
    description: 'Organize grade levels and physical sections.',
    show: ctx.can('VIEW_CLASSES_SUBJECTS'),
    category: 'Academics',
  },
  {
    label: 'Subjects',
    href: '/academic/subjects',
    icon: Layers,
    description: 'Manage curriculum subjects and codes.',
    show: ctx.can('VIEW_CLASSES_SUBJECTS'),
    category: 'Academics',
  },
  {
    label: 'Students Roster',
    href: '/academic/students',
    icon: Users,
    description: 'Directory of all enrolled students.',
    show: ctx.can('VIEW_SECTIONS_STUDENTS'),
    category: 'Academics',
  },
  {
    label: 'Teacher Assignments',
    href: '/academic/assignments',
    icon: UserCheck,
    description: 'Assign teachers to specific classes and subjects.',
    show: ctx.can('ASSIGN_TEACHERS'),
    category: 'Academics',
  },
  {
    label: 'Analytics',
    href: '/academic/analytics',
    icon: TrendingUp,
    description: 'Student retention, progression, and cohort analytics.',
    show: ctx.isSuperAdmin || ctx.can('MANAGE_TENANT_SETTINGS') || ctx.can('VIEW_TENANT_SETTINGS'),
    category: 'Academics',
  },
  {
    label: 'Mark Attendance',
    href: '/attendance/mark',
    icon: CalendarCheck,
    description: 'Record daily student attendance.',
    show: ctx.can('MARK_ATTENDANCE') && !ctx.isParent,
    category: 'Attendance',
  },
  {
    label: 'Attendance Reports',
    href: '/attendance/reports',
    icon: FileSpreadsheet,
    description: 'View and export attendance records.',
    show: ctx.can('VIEW_ATTENDANCE_REPORTS') && !ctx.isParent && !ctx.isTeacher,
    category: 'Attendance',
  },
  {
    label: 'Examinations',
    href: '/examination/exams',
    icon: GraduationCap,
    description: 'Create and manage academic assessments.',
    show: ctx.can('MANAGE_EXAMS') || ctx.can('ENTER_EXAM_SCORES'),
    category: 'Examinations',
  },
  {
    label: 'My Teaching Duties',
    href: '/academic/my-assignments',
    icon: BookOpen,
    description: 'View your assigned classes and subjects.',
    show: ctx.isTeacher,
    category: 'Teacher Desk',
  },
  {
    label: 'Student & Parent Directory',
    href: '/academic/parent-directory',
    icon: Users,
    description: 'Contact information for your students.',
    show: ctx.isTeacher,
    category: 'Teacher Desk',
  },
  {
    label: 'My Children',
    href: '/academic/my-children',
    icon: Baby,
    description: 'View your linked children profiles.',
    show: ctx.isParent,
    category: 'Parent Portal',
  },
  {
    label: "My Children's Teacher",
    href: '/academic/my-teachers',
    icon: GraduationCap,
    description: "Connect with your children's teachers.",
    show: ctx.isParent,
    category: 'Parent Portal',
  },
  {
    label: 'Report Cards',
    href: '/academic/report-cards',
    icon: Award,
    description: 'View student academic reports and grades.',
    show: ctx.isParent,
    category: 'Parent Portal',
  },
];

export const isNavItemActive = (currentPath: string, navHref: string): boolean => {
  return currentPath === navHref || currentPath.startsWith(`${navHref}/`);
};

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: LucideIcon;
}

export const getBreadcrumbs = (pathname: string, navItems: NavItem[]): BreadcrumbItem[] => {
  const active = navItems.find((n) => isNavItemActive(pathname, n.href));
  if (!active) return [{ label: 'Dashboard', href: '/dashboard' }];

  const crumbs: BreadcrumbItem[] = [
    { label: active.category },
    { label: active.label, href: active.href, icon: active.icon },
  ];

  if (pathname.includes('/classes/') && pathname.includes('/sections')) {
    crumbs.push({ label: 'Sections' });
  } else if (pathname.includes('/create')) {
    crumbs.push({ label: 'Create New' });
  } else if (pathname.includes('/edit')) {
    crumbs.push({ label: 'Edit' });
  }

  return crumbs;
};
```

- [ ] **Step 2: Create `src/components/layout/ViewAsBanner.tsx`**

Extract `ViewAsBanner` with smooth animations and alert styling:
```tsx
import React, { useState, useEffect } from 'react';
import { useViewAsStore } from '@/stores/viewAsStore';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Clock, X } from 'lucide-react';

export const ViewAsBanner: React.FC = () => {
  const { activeToken, targetUserId, expiresAt, endSession } = useViewAsStore();
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!activeToken || !expiresAt) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        endSession();
        return;
      }

      const minutes = Math.floor(diff / 1000 / 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeToken, expiresAt, endSession]);

  if (!activeToken) return null;

  return (
    <div className="bg-amber-600 dark:bg-amber-700 text-amber-50 px-4 py-2 flex items-center justify-between z-50 text-xs sm:text-sm font-medium shadow-md">
      <div className="flex items-center gap-2 min-w-0">
        <ShieldAlert className="w-4 h-4 shrink-0 text-amber-200" />
        <span className="truncate">
          <strong>Support Session:</strong> Viewing as User ID <code className="font-mono bg-black/20 px-1.5 py-0.5 rounded text-xs">{targetUserId}</code>. Mutating actions are disabled.
        </span>
        <span className="hidden sm:inline-flex items-center gap-1 text-amber-200 shrink-0 font-mono text-xs ml-2">
          <Clock className="w-3.5 h-3.5" /> {timeLeft}
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={endSession}
        className="text-amber-900 bg-amber-50 hover:bg-white border-transparent h-7 px-2.5 text-xs font-semibold shrink-0 ml-3"
      >
        <X className="w-3.5 h-3.5 mr-1" />
        End Session
      </Button>
    </div>
  );
};
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npx tsc -b`
Expected: PASS (code 0)

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/navConfig.ts src/components/layout/ViewAsBanner.tsx
git commit -m "refactor(layout): extract navConfig and ViewAsBanner components"
```

---

### Task 2: Desktop Sidebar Overhaul (`DesktopSidebar.tsx`)

**Files:**
- Create: `E:\SSUP\frontend\src\components\layout\DesktopSidebar.tsx`

**Interfaces:**
- Consumes:
  - `navItems: NavItem[]`
  - `user: AuthUser | null`
  - `activeRole: string | null`
  - `formatRole: (role: string | null) => string`
  - `getRoleBadgeVariant: (role: string | null) => BadgeVariant`
  - `userInitials: string`
  - `isCollapsed: boolean`
  - `onToggleCollapse: () => void`
  - `onOpenProfileMenu?: () => void`
- Produces: `DesktopSidebar: React.FC<DesktopSidebarProps>`

- [ ] **Step 1: Implement `DesktopSidebar.tsx`**

Features:
- Sleek branding bar with logo, app title, and collapse toggle button with keyboard hint `⌘B`.
- Active item styling:
  - Soft tinted background (`bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary-foreground font-semibold`).
  - Left indicator pill (`before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-r-full before:bg-primary`).
  - Smooth hover transition (`hover:bg-accent/60 hover:text-foreground`).
  - Accessible `aria-current="page"`.
- When collapsed:
  - Accessible `Tooltip` displaying the item name and shortcut.
  - Subtle divider line separating categories.
- User profile footer card:
  - User avatar with initials and online status dot.
  - User full name, role badge, and expand indicator.

- [ ] **Step 2: Add keyboard shortcut `⌘B` / `Ctrl+B` for sidebar toggle**

Wire keyboard event listener in AppShell to toggle `isDesktopSidebarCollapsed`.

- [ ] **Step 3: Persist collapsed state to `localStorage`**

Initialize state with `localStorage.getItem('sms_sidebar_collapsed') === 'true'`. Save on change.

- [ ] **Step 4: Verify TypeScript compilation**

Run: `npx tsc -b`
Expected: PASS (code 0)

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/DesktopSidebar.tsx
git commit -m "feat(layout): implement modern collapsible DesktopSidebar with active indicator pills and local storage persistence"
```

---

### Task 3: Top Navigation Bar & Responsive Breadcrumb (`TopHeader.tsx`)

**Files:**
- Create: `E:\SSUP\frontend\src\components\layout\TopHeader.tsx`

**Interfaces:**
- Consumes:
  - `breadcrumbs: BreadcrumbItem[]`
  - `activeTenantId: string | null`
  - `activeTenantName: string | null`
  - `isSuperAdmin: boolean`
  - `memberships?: TenantMembership[]`
  - `onSwitchTenant: (id: string) => void`
  - `onOpenCommandPalette: () => void`
  - `onOpenMobileDrawer: () => void`
  - `calendarSystem: 'AD' | 'BS'`
  - `onToggleCalendar: () => void`
  - `theme: string`
  - `onToggleTheme: () => void`
  - `user: AuthUser | null`
  - `activeRole: string | null`
  - `onLogout: () => void`
  - `onSwitchPersona: (role: Role) => void`
- Produces: `TopHeader: React.FC<TopHeaderProps>`

- [ ] **Step 1: Implement `TopHeader.tsx`**

Features:
- Left: Dynamic breadcrumb trail on tablet/desktop:
  - Category icon/pill > Page label (with subtle chevron separator `ChevronRight`).
  - Mobile hamburger menu trigger with smooth active state.
- Middle: School context badge (`SchoolHeaderBadge`) with clean alignment.
- Right:
  - Command palette trigger (`⌘K` search button with icon and shortcut badge).
  - Dual calendar toggle button (`BS` / `AD` pill with calendar icon).
  - Theme toggle button (`Sun` / `Moon`).
  - Notification popover.
  - User profile menu trigger with avatar and dropdown menu.

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc -b`
Expected: PASS (code 0)

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/TopHeader.tsx
git commit -m "feat(layout): implement responsive TopHeader with route breadcrumbs and streamlined controls"
```

---

### Task 4: Mobile Drawer & Touch Ergonomics (`MobileNavDrawer.tsx`)

**Files:**
- Create: `E:\SSUP\frontend\src\components\layout\MobileNavDrawer.tsx`

**Interfaces:**
- Consumes:
  - `open: boolean`
  - `onClose: () => void`
  - `navItems: NavItem[]`
  - `user: AuthUser | null`
  - `activeRole: string | null`
  - `activeTenantName?: string | null`
  - `calendarSystem: 'AD' | 'BS'`
  - `onSetCalendarSystem: (val: 'AD' | 'BS') => void`
  - `theme: string`
  - `onSetTheme: (theme: string) => void`
  - `onLogout: () => void`
- Produces: `MobileNavDrawer: React.FC<MobileNavDrawerProps>`

- [ ] **Step 1: Implement `MobileNavDrawer.tsx`**

Features:
- Clean slide-in drawer with backdrop blur and smooth animation (`animate-in slide-in-from-left duration-200`).
- Touch-friendly navigation targets (minimum 44px height, generous padding, responsive tap states).
- Clear category dividers and active route highlighting.
- Ergonomic footer with user card, quick theme pills (Light / Dark / Auto), calendar pills (BS / AD), and Sign Out button.
- Handles Escape key and focus return.

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc -b`
Expected: PASS (code 0)

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/MobileNavDrawer.tsx
git commit -m "feat(layout): implement touch-ergonomic MobileNavDrawer with accessible targets"
```

---

### Task 5: AppShell Composition, Accessibility & Verification

**Files:**
- Modify: `E:\SSUP\frontend\src\components\layout\AppShell.tsx`

**Interfaces:**
- Assembles `ViewAsBanner`, `DesktopSidebar`, `TopHeader`, `MobileNavDrawer`, and `CommandPalette` around `<Outlet />`.

- [ ] **Step 1: Rewrite `AppShell.tsx` as clean coordinator**

Drastically reduce line count from 1060 down to ~150 lines:
```tsx
export const AppShell: React.FC = () => {
  // Authentication & permissions
  // Navigation & breadcrumbs
  // Sidebar collapsed state with localStorage & keyboard shortcut (⌘B)
  // Command palette state & items
  return (
    <div className="flex flex-col h-screen h-dvh overflow-hidden">
      <ViewAsBanner />
      <div className="flex-1 min-h-0 flex bg-background text-foreground antialiased selection:bg-primary/20 overflow-hidden">
        <DesktopSidebar ... />
        <MobileNavDrawer ... />
        <div className="flex-1 min-w-0 flex flex-col h-full min-h-0 bg-background overflow-hidden">
          <TopHeader ... />
          <main className="flex-1 relative overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 bg-muted/15 min-h-0 focus:outline-none">
            <div className="w-full max-w-7xl mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      <CommandPalette ... />
    </div>
  );
};
```

- [ ] **Step 2: Run TypeScript compile and Vite production build**

Run:
```bash
npx tsc -b
npm run build
```
Expected: Clean pass with code 0.

- [ ] **Step 3: Run backend test suite to guarantee 0 regressions**

Run:
```bash
E:\SSUP\backend\.venv\Scripts\pytest.exe tests/test_tenant_academic_rollover.py
```
Expected: PASS (code 0).

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/AppShell.tsx
git commit -m "refactor(layout): compose AppShell from modular subcomponents with enhanced UI/UX"
```
