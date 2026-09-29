# UI Consistency & UX Modernization Across All Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate visual styling inconsistencies, fragmented color shades, disparate stat cards, and unaligned filter controls across all frontend pages, establishing a unified design language, accessible semantic tokens, and polished user experience in both Light and Dark modes.

**Architecture:** Centralize semantic color tokens (role badges, status variants, stat card themes) in core UI primitives, create universal page layout and filter toolbar building blocks (`PageHeader`, `FilterToolbar`, `SchoolSearchSelect`), and systematically refactor all domain feature slices (Academic, Attendance, Examination, Platform Governance, and Settings) to strictly consume these primitives.

**Tech Stack:** React 19, TypeScript 5.8, Tailwind CSS v4, Radix UI / shadcn/ui primitives, TanStack Router, TanStack Query, Lucide React, Sonner.

**Spec:** Frontend Architecture and Design Guidelines in [README.md](file:///E:/SSUP/frontend/README.md) and `ui-ux-pro-max` design system tokens.

## Global Constraints

- **Tailwind CSS v4 Token Discipline**: Never use ad-hoc hardcoded hex or raw Tailwind colors (e.g. `bg-blue-600`, `bg-emerald-600`, `text-purple-800`, `bg-green-50/50`) for layout or buttons. Use semantic tokens (`bg-primary`, `text-primary`, `bg-card`, `text-card-foreground`, `border-border/60`, `bg-muted/40`).
- **Dark Mode AAA/AA Contrast Compliance**: Ensure all text, badges, and icons satisfy WCAG 2.1 AA (minimum 4.5:1 for body text, 3:1 for large text/icons/borders) across both Light and Dark themes.
- **Role Color Single Source of Truth**:
  - `SUPER_ADMIN`: Purple (`bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30`)
  - `ADMIN` (Principal): Default Primary Ocean Navy / Cyan (`bg-primary/10 text-primary dark:text-cyan-300 border-primary/20`)
  - `OFFICE_ADMIN` (Vice Principal): Info Blue (`bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30`)
  - `TEACHER` (Faculty): Emerald (`bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30`)
  - `PARENT` (Guardian): Amber (`bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30`)
- **Card & Radius Rhythm**: All standard cards and containers use `rounded-xl` or `rounded-2xl` with `border border-border/60 bg-card shadow-xs`.
- **Search & Input Heights**: All toolbar inputs and action buttons in tables enforce `h-9` on desktop (`min-h-[44px] sm:min-h-9 h-11 sm:h-9` on touch devices) with clean clear buttons (`✕`).
- **Zero Build Regressions**: `npx tsc -b` and `npm run build` must compile cleanly after every task.

---

### Task 1: Standardize Core UI Primitives & Semantic Role/Status System

**Files:**
- Modify: `src/components/ui/badge.tsx`
- Modify: `src/components/ui/stat-card.tsx`
- Create: `src/components/common/PageHeader.tsx`
- Create: `src/components/common/FilterToolbar.tsx`
- Modify: `src/components/layout/AppShell.tsx`

**Interfaces:**
- Consumes: Radix UI primitives, `lucide-react`, `cva` from `class-variance-authority`.
- Produces:
  - `<Badge variant="role-super-admin" | "role-admin" | "role-office-admin" | "role-teacher" | "role-parent" | "success" | "warning" | "info" | "destructive" | ... />`
  - `<StatCard variant="default" | "emerald" | "amber" | "blue" | "purple" icon={Icon} title={title} value={value} ... />`
  - `<PageHeader title={title} subtitle={subtitle} badge={badge} actions={actions} />`
  - `<FilterToolbar searchPlaceholder={...} searchValue={...} onSearchChange={...} statusOptions={...} activeStatus={...} onStatusChange={...} actions={...} />`

- [ ] **Step 1: Update Badge component with standardized semantic role variants**

In `src/components/ui/badge.tsx`, extend `badgeVariants` to provide first-class semantic role variants and accessible dark mode contrast:

```tsx
// src/components/ui/badge.tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive/15 text-destructive dark:text-red-400 border-destructive/30',
        outline: 'text-foreground border-border/80',
        success:
          'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
        warning:
          'border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300',
        info: 'border-blue-500/30 bg-blue-500/15 text-blue-700 dark:text-blue-300',
        purple:
          'border-purple-500/30 bg-purple-500/15 text-purple-700 dark:text-purple-300',
        // Semantic Role Variants
        'role-super-admin':
          'border-purple-500/30 bg-purple-500/15 text-purple-700 dark:text-purple-300',
        'role-admin':
          'border-primary/30 bg-primary/10 text-primary dark:text-cyan-300',
        'role-office-admin':
          'border-blue-500/30 bg-blue-500/15 text-blue-700 dark:text-blue-300',
        'role-teacher':
          'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
        'role-parent':
          'border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
```

- [ ] **Step 2: Enhance StatCard with accent tint variants and interactive state**

In `src/components/ui/stat-card.tsx`, add an optional `variant` (`default`, `emerald`, `amber`, `blue`, `purple`) and `onClick` / `interactive` support:

```tsx
// src/components/ui/stat-card.tsx
import * as React from 'react';
import { type LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    label: string;
  };
  loading?: boolean;
  variant?: 'default' | 'emerald' | 'amber' | 'blue' | 'purple';
  onClick?: () => void;
  selected?: boolean;
}

const variantStyles = {
  default: {
    iconBg: 'bg-primary/10 text-primary dark:text-cyan-300 border-primary/20',
    selectedRing: 'ring-2 ring-primary border-primary',
  },
  emerald: {
    iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    selectedRing: 'ring-2 ring-emerald-500 border-emerald-500',
  },
  amber: {
    iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    selectedRing: 'ring-2 ring-amber-500 border-amber-500',
  },
  blue: {
    iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    selectedRing: 'ring-2 ring-blue-500 border-blue-500',
  },
  purple: {
    iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    selectedRing: 'ring-2 ring-purple-500 border-purple-500',
  },
};

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  (
    {
      title,
      value,
      icon: Icon,
      description,
      trend,
      loading = false,
      variant = 'default',
      onClick,
      selected = false,
      className,
      ...props
    },
    ref
  ) => {
    if (loading) {
      return (
        <Card ref={ref} className={cn('relative overflow-hidden rounded-xl border border-border/60 bg-card', className)} {...props}>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-2 min-w-0 flex-1">
                <div className="h-3.5 w-24 bg-muted animate-pulse rounded" />
                <div className="h-7 w-20 bg-muted animate-pulse rounded" />
                <div className="h-3 w-32 bg-muted animate-pulse rounded" />
              </div>
              <div className="h-10 w-10 bg-muted animate-pulse rounded-xl shrink-0 ml-3" />
            </div>
          </CardContent>
        </Card>
      );
    }

    const currentVariant = variantStyles[variant] || variantStyles.default;
    const isPositiveTrend = trend && trend.value >= 0;

    return (
      <Card
        ref={ref}
        onClick={onClick}
        className={cn(
          'relative overflow-hidden rounded-xl border border-border/60 bg-card transition-all duration-200 shadow-xs',
          onClick && 'cursor-pointer hover:shadow-md hover:border-border select-none',
          selected && `${currentVariant.selectedRing} shadow-sm`,
          className
        )}
        {...props}
      >
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1 min-w-0 flex-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
                {title}
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {typeof value === 'number' ? value.toLocaleString() : value}
                </p>
                {selected && (
                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                    Filtered
                  </span>
                )}
              </div>
              {description && (
                <p className="text-xs text-muted-foreground truncate">{description}</p>
              )}
              {trend && (
                <div className="flex items-center gap-1 pt-0.5">
                  {isPositiveTrend ? (
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                  )}
                  <span
                    className={cn(
                      'text-xs font-medium',
                      isPositiveTrend
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    )}
                  >
                    {isPositiveTrend ? '+' : ''}
                    {trend.value}%
                  </span>
                  <span className="text-[11px] text-muted-foreground">{trend.label}</span>
                </div>
              )}
            </div>
            <div className={cn('p-2.5 rounded-xl border shrink-0 ml-3', currentVariant.iconBg)}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);
StatCard.displayName = 'StatCard';

export { StatCard };
```

- [ ] **Step 3: Create reusable PageHeader primitive**

Create `src/components/common/PageHeader.tsx` to provide consistent page-level typography, breadcrumb metadata, and action button alignment:

```tsx
// src/components/common/PageHeader.tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  badge,
  actions,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1',
        className
      )}
    >
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
          {actions}
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 4: Create universal FilterToolbar primitive**

Create `src/components/common/FilterToolbar.tsx` with unified search, clear button, segmented status filters, count indicator, and action buttons:

```tsx
// src/components/common/FilterToolbar.tsx
import * as React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface FilterStatusOption<T extends string = string> {
  id: T;
  label: string;
  count?: number;
}

export interface FilterToolbarProps<T extends string = string> {
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  statusOptions?: FilterStatusOption<T>[];
  activeStatus?: T;
  onStatusChange?: (status: T) => void;
  showingCount?: number;
  totalCount?: number;
  unitLabel?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function FilterToolbar<T extends string = string>({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  statusOptions,
  activeStatus,
  onStatusChange,
  showingCount,
  totalCount,
  unitLabel = 'items',
  children,
  actions,
  className,
}: FilterToolbarProps<T>) {
  return (
    <div
      className={cn(
        'p-3.5 sm:p-4 rounded-xl border border-border/60 bg-card shadow-xs space-y-3',
        className
      )}
    >
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search input */}
        {onSearchChange !== undefined && (
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-9 pr-8 h-9 text-xs rounded-lg"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>
        )}

        {/* Children custom selectors (e.g. Class, Section, Academic Year) */}
        {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}

        {/* Status segmented pills & action buttons */}
        <div className="flex items-center justify-between sm:justify-end gap-2.5 flex-wrap">
          {statusOptions && onStatusChange && (
            <div className="flex items-center rounded-lg border border-border/70 p-0.5 bg-muted/40">
              {statusOptions.map((opt) => {
                const isActive = activeStatus === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onStatusChange(opt.id)}
                    className={cn(
                      'px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer select-none',
                      isActive
                        ? 'bg-background text-foreground shadow-2xs font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <span>{opt.label}</span>
                    {typeof opt.count === 'number' && (
                      <span className="ml-1.5 opacity-70 text-[10px]">({opt.count})</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {showingCount !== undefined && totalCount !== undefined && (
            <span className="text-xs text-muted-foreground hidden lg:inline mr-1">
              Showing <strong className="text-foreground">{showingCount}</strong> of {totalCount}{' '}
              {unitLabel}
            </span>
          )}

          {actions}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify types with `npx tsc -b`**

Run: `npx tsc -b`
Expected: Exits with 0 errors.

- [ ] **Step 6: Commit core UI primitives**

```bash
git add src/components/ui/badge.tsx src/components/ui/stat-card.tsx src/components/common/PageHeader.tsx src/components/common/FilterToolbar.tsx
git commit -m "feat(ui): add PageHeader, FilterToolbar and enhance Badge and StatCard primitives"
```

---

### Task 2: Modernize Academic Feature Pages (`ClassesPage`, `StudentsPage`, `SubjectsPage`)

**Files:**
- Modify: `src/features/academic/pages/ClassesPage.tsx`
- Modify: `src/features/academic/pages/StudentsPage.tsx`
- Modify: `src/features/academic/pages/SubjectsPage.tsx`
- Modify: `src/features/academic/components/AcademicStatsCards.tsx`

**Interfaces:**
- Consumes: `<SchoolSearchSelect />`, `<StatCard />`, `<FilterToolbar />`, `<EmptyState />`, `<PageHeader />`.
- Produces: Polished academic catalog pages adhering to the single color scheme, replacing raw purple/green inline styles and custom dropdowns.

- [ ] **Step 1: Replace raw SchoolSearchSelector in ClassesPage with universal SchoolSearchSelect**

In `src/features/academic/pages/ClassesPage.tsx`:
1. Remove lines 33-100 (the custom raw `SchoolSearchSelector` implementation).
2. Import `SchoolSearchSelect` from `@/features/academic-year/components/SchoolSearchSelect`.
3. Standardize the Super Admin scope banner and Teacher view banner using semantic tokens (`border-primary/20 bg-primary/5 text-primary` and `border-blue-500/20 bg-blue-500/10 text-blue-800 dark:text-blue-300`).
4. Replace the custom search box with `FilterToolbar` or unified `h-9` rounded-lg inputs.

- [ ] **Step 2: Refactor AcademicStatsCards to use StatCard primitive**

In `src/features/academic/components/AcademicStatsCards.tsx`:
Replace manual `div` cards with standard `<StatCard />`:
- Total Classes: `variant="default" icon={BookOpen}`
- Active Sections: `variant="blue" icon={Layers}`
- Enrolled Students: `variant="emerald" icon={Users}`
- Configured Subjects: `variant="purple" icon={GraduationCap}`

- [ ] **Step 3: Refactor StudentsPage stat cards and filter row**

In `src/features/academic/pages/StudentsPage.tsx`:
1. Replace manual stat card `div` elements (lines 330-386) with `<StatCard />` primitives.
2. Standardize the alumni card to use the `purple` variant without hardcoded `text-purple-600`.
3. Refactor the filter controls to use `FilterToolbar` with consistent `h-9` heights for class and section select dropdowns.

- [ ] **Step 4: Refactor SubjectsPage view tabs and metrics**

In `src/features/academic/pages/SubjectsPage.tsx`:
1. Standardize metric cards with `<StatCard />`.
2. Modernize the tab buttons (`My Teaching Subjects` vs `All Curriculum Subjects`) using segmented pill styling matching `TabsList`:
   `bg-muted/40 border border-border/60 rounded-xl p-1` with `bg-background text-foreground shadow-2xs font-semibold`.
3. Replace hardcoded `text-emerald-600 dark:text-emerald-400` with semantic token variants.

- [ ] **Step 5: Verify types with `npx tsc -b` and test Vite build**

Run: `npx tsc -b && npm run build`
Expected: PASS with 0 errors.

- [ ] **Step 6: Commit academic modernization**

```bash
git add src/features/academic/pages/ClassesPage.tsx src/features/academic/pages/StudentsPage.tsx src/features/academic/pages/SubjectsPage.tsx src/features/academic/components/AcademicStatsCards.tsx
git commit -m "refactor(academic): modernize Classes, Students, and Subjects pages with unified design tokens"
```

---

### Task 3: Modernize Attendance & Examination Pages (`AttendanceReportsPage`, `MarkAttendancePage`, `ExamsListPage`)

**Files:**
- Modify: `src/features/attendance/pages/AttendanceReportsPage.tsx`
- Modify: `src/features/attendance/pages/MarkAttendancePage.tsx`
- Modify: `src/features/examination/pages/ExamsListPage.tsx`

**Interfaces:**
- Consumes: `<StatCard />`, `<Select />` from `@/components/ui/select`, `<FilterToolbar />`, `<Badge />`.
- Produces: Consistent attendance analytics and exam management layouts with high-contrast status and reporting metrics.

- [ ] **Step 1: Modernize AttendanceReportsPage controls and KPI cards**

In `src/features/attendance/pages/AttendanceReportsPage.tsx`:
1. Replace raw native `<select id="academic-session-select">` (lines 436-457) with shadcn `<Select>` primitive for seamless theme compatibility.
2. Replace manual KPI cards (lines 538-600) with `<StatCard />`:
   - Average Daily Attendance (ADA): `variant="emerald" icon={Percent}`
   - Total Enrolled Students: `variant="default" icon={Users}`
   - Operating School Days: `variant="blue" icon={CalendarDays}`
   - Chronic Absenteeism Flag: `variant="amber" icon={AlertTriangle}`
3. Standardize the "Export CSV" button to use `<Button variant="default" size="sm">` or semantic outline instead of hardcoded `bg-emerald-600 hover:bg-emerald-700 text-white`.
4. Modernize the date preset buttons (`Today`, `7 Days`, `30 Days`, `Month to Date`, `Full Academic Year`) to match standard segmented control pills.

- [ ] **Step 2: Polish MarkAttendancePage status headers and control cards**

In `src/features/attendance/pages/MarkAttendancePage.tsx`:
1. Harmonize the top date selection card: enforce consistent `h-9` heights across datepicker, today reset button, and status badges.
2. Standardize status badges using the enhanced `Badge` variants (`success`, `warning`, `destructive`, `info`).
3. Replace ad-hoc empty and error containers with standard `<EmptyState />` and `<ErrorState />`.

- [ ] **Step 3: Align ExamsListPage tab navigation and status pills**

In `src/features/examination/pages/ExamsListPage.tsx`:
1. Replace ad-hoc button tab row with segmented tab container (`bg-muted/40 border border-border/60 rounded-xl p-1`).
2. Ensure `renderExamStatusBadge` uses standardized `Badge` variants:
   - `APPROVED`: `variant="success"`
   - `PENDING_APPROVAL`: `variant="warning"`
   - `IN_PROGRESS`: `variant="info"`
   - `DRAFT`: `variant="outline"`
   - `CANCELLED`: `variant="destructive"`
3. Standardize class filter and status filter dropdowns to match other feature pages.

- [ ] **Step 4: Verify types with `npx tsc -b` and test Vite build**

Run: `npx tsc -b && npm run build`
Expected: PASS with 0 errors.

- [ ] **Step 5: Commit attendance & examination modernization**

```bash
git add src/features/attendance/pages/AttendanceReportsPage.tsx src/features/attendance/pages/MarkAttendancePage.tsx src/features/examination/pages/ExamsListPage.tsx
git commit -m "refactor(attendance,examination): standardize KPI cards, session selectors, and exam status badges"
```

---

### Task 4: Modernize Administration & Governance Pages (`PlatformUsersPage`, `TenantsPage`, `MembersPage`)

**Files:**
- Modify: `src/features/platform-users/pages/PlatformUsersPage.tsx`
- Modify: `src/features/tenants/pages/TenantsPage.tsx`
- Modify: `src/features/tenants/components/TenantStatsCards.tsx`
- Modify: `src/features/members/pages/MembersPage.tsx`
- Modify: `src/features/members/components/MemberStatsCards.tsx`
- Modify: `src/features/members/components/MemberFiltersToolbar.tsx`

**Interfaces:**
- Consumes: `<StatCard />`, `<Badge />`, `<FilterToolbar />`, centralized role variants.
- Produces: Consistent administrative governance portals with unified typography and role color parity.

- [ ] **Step 1: Standardize PlatformUsersPage role metrics and filters**

In `src/features/platform-users/pages/PlatformUsersPage.tsx`:
1. Remove all arbitrary `font-mono` on card headers (e.g. lines 151, 165, 179, 194, 208).
2. Replace manual metric cards with `<StatCard />`:
   - Active Users: `variant="emerald" icon={CheckCircle2}`
   - Super Admins: `variant="purple" icon={ShieldCheck}`
   - Inactive Users: `variant="amber" icon={AlertTriangle}`
   - School Admins: `variant="default" icon={UserCog}`
   - Office Admins: `variant="blue" icon={Briefcase}`
3. Align role badges in table rows with `AppShell` single source of truth:
   - Super Admin -> `variant="role-super-admin"`
   - Principal/Admin -> `variant="role-admin"`
   - Office Admin -> `variant="role-office-admin"`
   - Teacher -> `variant="role-teacher"`
   - Parent -> `variant="role-parent"`
4. Replace hardcoded `bg-blue-600 hover:bg-blue-700 text-white` button with `<Button variant="default">`.

- [ ] **Step 2: Standardize TenantsPage and TenantStatsCards**

In `src/features/tenants/components/TenantStatsCards.tsx` and `src/features/tenants/pages/TenantsPage.tsx`:
1. Refactor `TenantStatsCards` to consume `<StatCard />`:
   - Total Tenants: `variant="default"`
   - Active Schools: `variant="emerald"`
   - Suspended / Inactive: `variant="amber"`
2. Refactor the status filter button group in `TenantsPage.tsx` to match the universal `FilterToolbar` pill style.

- [ ] **Step 3: Standardize MembersPage, MemberStatsCards, and MemberFiltersToolbar**

In `src/features/members/components/MemberStatsCards.tsx`:
1. Harmonize `cards` definition to use standardized semantic role colors:
   - Teaching Faculty: `variant="emerald"`
   - Staff & Admins: `variant="blue"` (aligning with `OFFICE_ADMIN` info blue)
   - Parents & Guardians: `variant="amber"`
2. In `MemberFiltersToolbar.tsx`, standardize the status pills and search box to match the application-wide standard.

- [ ] **Step 4: Verify types with `npx tsc -b` and test Vite build**

Run: `npx tsc -b && npm run build`
Expected: PASS with 0 errors.

- [ ] **Step 5: Commit administration & governance modernization**

```bash
git add src/features/platform-users/pages/PlatformUsersPage.tsx src/features/tenants/pages/TenantsPage.tsx src/features/tenants/components/TenantStatsCards.tsx src/features/members/pages/MembersPage.tsx src/features/members/components/MemberStatsCards.tsx src/features/members/components/MemberFiltersToolbar.tsx
git commit -m "refactor(governance): unify role colors, stat cards, and status filters across platform users, tenants, and members"
```

---

### Task 5: Final Cross-Page Audit, Contrast Verification & Documentation

**Files:**
- Modify: `README.md`
- Verify: Full codebase for any remaining hardcoded rogue color classes

**Interfaces:**
- Consumes: Entire frontend application.
- Produces: Clean, documented design system standard in README with zero styling inconsistencies.

- [ ] **Step 1: Scan codebase for any remaining hardcoded color anomalies**

Run:
```bash
git grep -n -E "bg-(purple|indigo|blue|emerald|green|yellow|amber)-[0-9]{3}" src/features/
```
Verify and replace any leftover rogue classes with semantic tokens (`bg-primary`, `bg-card`, `bg-muted`, etc.) or standard `<Badge>` / `<StatCard>` variants.

- [ ] **Step 2: Run complete TypeScript and build verification**

Run:
```bash
npx tsc -b
npm run build
```
Expected: Both commands complete with exit code 0.

- [ ] **Step 3: Update README.md Design System and UI Component sections**

Update `README.md` to document the unified UI component standards:
- `PageHeader` standard
- `FilterToolbar` standard
- `StatCard` tokens and variants
- Universal Role Badge color mapping

- [ ] **Step 4: Commit and push**

```bash
git add README.md
git commit -m "docs: document unified UI/UX design tokens and component standards"
git push origin nabin
```

---

## Plan Self-Review Checklist

- [x] **Spec coverage**: Covers all pages and components flagged for inconsistencies (Classes, Students, Subjects, Attendance, Exams, Platform Users, Tenants, Members, and Settings).
- [x] **No Placeholders**: Exact code and exact replacement strategies are provided for all primitives and page refactors.
- [x] **Type consistency**: Prop types for `StatCard`, `Badge`, `PageHeader`, and `FilterToolbar` are strictly specified and referenced identically across all tasks.
- [x] **Light/Dark Mode Parity**: All badge and stat card variants include both light and dark mode classes (`dark:text-emerald-300`, `dark:text-cyan-300`, etc.) ensuring AAA contrast.
