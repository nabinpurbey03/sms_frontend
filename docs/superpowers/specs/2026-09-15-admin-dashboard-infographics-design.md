# Admin & Office Admin Dashboard Infographics Redesign

**Date**: 2026-09-15
**Status**: Draft
**Approach**: Incremental Enhancement (Approach A)

---

## Overview

Upgrade the Admin and Office Admin dashboards from plain number cards and HTML tables to a professional infographic dashboard with real charts, trend indicators, and data visualizations. The existing information architecture and layout structure are preserved — this redesign targets the **visualization layer** only.

## Goals

1. Replace plain HTML tables and CSS progress bars with proper interactive charts
2. Build a reusable, themed chart component library usable across all role dashboards
3. Fix missing shared UI primitives (StatCard, Tabs, Select) that are currently re-implemented or unstyled
4. Make dashboard data instantly comprehensible through visual patterns rather than raw numbers

## Non-Goals

- Full layout/navigation redesign (Approach B)
- Configurable widget system (Approach C)
- New backend API endpoints (existing endpoints provide sufficient data)
- Teacher or Parent dashboard redesign (separate future effort, but shared components will support them)

---

## Section 1: Shared Component Library Foundation

### New Dependency

- `recharts` — React-native composable charting library. Lightweight (~200KB gzipped), pairs well with shadcn/ui + Tailwind, supports responsive containers and custom theming.

### New Shared UI Components

All new components are placed in `src/components/ui/` following the existing shadcn/ui patterns: composable exports, `className` prop with `cn()` merging, CSS variable-based theming for automatic light/dark mode support.

#### Core UI Primitives

| Component | File | Purpose |
|---|---|---|
| `StatCard` | `src/components/ui/stat-card.tsx` | Reusable metric card with icon, formatted value, label, optional trend indicator (↑/↓ percentage with color), and optional mini sparkline. Replaces 4+ custom card re-implementations across dashboards. |
| `ChartCard` | `src/components/ui/chart-card.tsx` | Wrapper card providing consistent header (title, description, optional timeframe filter pills) around any chart content. Handles loading skeleton, empty state (via `EmptyState`), and error state (via `ErrorState`). |
| `Tabs` | `src/components/ui/tabs.tsx` | Radix UI Tabs primitive (`@radix-ui/react-tabs`). Replaces all custom inline button tab arrays across dashboards. Follows existing Radix pattern in the project. |
| `Select` | `src/components/ui/select.tsx` | Radix UI Select primitive (`@radix-ui/react-select`). Replaces unstyled native `<select>` elements in filter bars. |

#### Chart Components

All chart components wrap Recharts primitives with project theming. Each uses `ResponsiveContainer` for fluid sizing and accepts data as a typed prop.

| Component | File | Recharts Base | Purpose |
|---|---|---|---|
| `DonutChart` | `src/components/ui/charts/donut-chart.tsx` | `PieChart` + `Pie` (inner/outer radius) | Themed donut with center label, legend, and responsive sizing. Used for present/absent breakdowns, pass/fail ratios. |
| `TrendAreaChart` | `src/components/ui/charts/trend-area-chart.tsx` | `AreaChart` + `Area` | Gradient-filled area chart with configurable time X-axis, tooltip, and optional reference lines. Used for daily attendance trends, at-risk student tracking. |
| `ComparisonBarChart` | `src/components/ui/charts/comparison-bar-chart.tsx` | `BarChart` + `Bar` | Horizontal or vertical bar chart with labels and value axis. Used for class comparisons, leaderboards, exam pipeline. |
| `RadarChart` | `src/components/ui/charts/radar-chart.tsx` | `RadarChart` + `Radar` + `PolarGrid` | Multi-axis spider chart for subject performance comparisons. |
| `CalendarHeatmap` | `src/components/ui/charts/calendar-heatmap.tsx` | Custom SVG (no Recharts) | GitHub-contribution-style grid showing daily intensity over 30 days. Hover tooltip reveals date and attendance rate. Color scale: light → dark green. |

### Design Principles

- **Theme-aware**: All charts consume CSS custom properties from the existing Tailwind/shadcn theme. Automatic light/dark mode adaptation.
- **Responsive**: Every chart uses Recharts' `ResponsiveContainer` to fill parent width. Touch-friendly tooltips with ≥44px targets (WCAG 2.5.5 per project convention).
- **Composable**: Chart components accept `className`, can be wrapped in `ChartCard` or used standalone.
- **Consistent states**: Loading shows skeleton pulse animation. Empty shows `EmptyState` component. Error shows `ErrorState` with retry.

### File Structure

```
src/components/ui/
├── stat-card.tsx              (new)
├── chart-card.tsx             (new)
├── tabs.tsx                   (new - Radix UI)
├── select.tsx                 (new - Radix UI)
└── charts/
    ├── donut-chart.tsx        (new)
    ├── trend-area-chart.tsx   (new)
    ├── comparison-bar-chart.tsx (new)
    ├── radar-chart.tsx        (new)
    └── calendar-heatmap.tsx   (new)
```

---

## Section 2: Attendance Dashboard Infographics

**File**: `src/features/dashboard/components/AttendanceDashboardHub.tsx`
**Scope**: Admin and Office Admin view only (Teacher and Parent views unchanged in this iteration)

### Visualization Upgrades

| Area | Before | After |
|---|---|---|
| Top KPI row | 4 plain number cards | 4 `StatCard` components with trend indicators (e.g., "↑ 3.2% vs yesterday") and mini sparklines |
| Today's breakdown | Single CSS progress bar | `DonutChart` — 3 segments: Present (emerald), Absent (rose), Unmarked (gray). Center label shows overall rate %. |
| 7d/30d trends | Plain HTML table with rows of date/enrolled/present/absent/rate | `TrendAreaChart` — smooth daily attendance % line with gradient fill, hover tooltips showing date + rate + counts |
| Class comparison | Not visualized (section checklist only) | `ComparisonBarChart` — horizontal bars per class, sorted by attendance %, color-coded: emerald ≥80%, blue ≥60%, amber <60% |
| Attendance patterns | Nothing | `CalendarHeatmap` — 30-day grid showing daily attendance intensity. Only appears in 30-day mode. |
| Section checklist | Card list with status badges | Unchanged — it's functional and actionable (direct "Mark Attendance" links) |
| Filter bar | Native `<input type="date">` | Styled date input component. Timeframe pills unchanged. |

### Layout (Admin View)

```
┌──────────────────────────────────────────────────┐
│  Filter Bar (timeframe pills + styled date input)│
├────────┬────────┬────────┬───────────────────────┤
│StatCard│StatCard│StatCard│ StatCard               │
│ Rate ↑ │Enrolled│Present │ Absent                 │
├────────┴────────┴────────┴───────────────────────┤
│                                                   │
│  ┌─── Today Mode ───────────────────────────┐    │
│  │  2-col grid:                              │    │
│  │  [DonutChart]        [Section Checklist]  │    │
│  └───────────────────────────────────────────┘    │
│                                                   │
│  ┌─── Range Mode (7d/30d) ──────────────────┐    │
│  │  [TrendAreaChart - full width]            │    │
│  │  2-col grid:                              │    │
│  │  [ComparisonBarChart]  [CalendarHeatmap*] │    │
│  └───────────────────────────────────────────┘    │
│  * CalendarHeatmap only in 30-day mode            │
└──────────────────────────────────────────────────┘
```

### Decisions

- Section checklist kept as-is — it's the most actionable part with direct "Mark Attendance" navigation links
- Donut chart (Today) shows 3-way split (present/absent/unmarked) which a single progress bar cannot
- Calendar heatmap only in 30-day mode — insufficient data density for 7-day view
- Class comparison bar chart replaces the table of class-by-class numbers in range mode
- All data sourced from existing `attendanceApi` endpoints

---

## Section 3: Exam Results Dashboard Infographics

**File**: `src/features/dashboard/components/SchoolResultsDashboardHub.tsx`
**Scope**: Admin and Office Admin view

### Visualization Upgrades

| Area | Before | After |
|---|---|---|
| Executive KPI row | 4 plain number cards | 4 `StatCard` components with trend arrows and contextual color coding |
| Pass rate | Single number + CSS bar | `DonutChart` — Pass (emerald) / Fail (rose) segments, center label shows pass % |
| Exam pipeline | Number + inline badges (Draft/Grading/Pending/Published) | `ComparisonBarChart` (stacked horizontal) — proportional visual flow of exam stages |
| Class Performance tab | `ResponsiveDataTable` with CSS bars | **Added**: Grouped vertical `ComparisonBarChart` above table comparing pass rates across classes. Table kept below for detail. |
| Subject Analytics tab | Unpaginated card grid | **Added**: `RadarChart` showing avg score per subject on each axis for multi-subject comparison. Card grid below with pagination added. |
| At-Risk Students tab | Plain student table | **Added**: `TrendAreaChart` at top showing at-risk student count across recent exams (tracking intervention effectiveness). Table kept below. |
| Top Achievers tab | Cards with rank badges | `ComparisonBarChart` (horizontal) — visual leaderboard with score bars, rank medals on Y-axis |
| Filter selects | Unstyled native `<select>` | Themed Radix `Select` component |
| Tab navigation | Custom inline button array | Shared `Tabs` component |

### Layout

```
┌──────────────────────────────────────────────────┐
│  Header (title, CSV export, refresh, create exam)│
├──────────────────────────────────────────────────┤
│  Filter Bar: [Select: Class] [Select: Exam] [🔍] │
├──────────────────────────────────────────────────┤
│  Urgent Attention Banner (if pending approvals)  │
├────────┬────────┬─────────┬──────────────────────┤
│StatCard│StatCard│ StatCard│ StatCard              │
│Pass % ↑│Avg Scr │Pipeline │ At-Risk ↓            │
├────────┴────────┴─────────┴──────────────────────┤
│  2-col grid:                                     │
│  [Pass/Fail DonutChart]  [Pipeline Stacked Bar]  │
├──────────────────────────────────────────────────┤
│  [Tabs: Classes | Subjects | At-Risk | Achievers]│
│                                                  │
│  Classes tab:                                    │
│    [ComparisonBarChart - class pass rates]        │
│    [ResponsiveDataTable - detail rows]            │
│                                                  │
│  Subjects tab:                                   │
│    [RadarChart - multi-subject overlay]            │
│    [Paginated Subject Cards]                      │
│                                                  │
│  At-Risk tab:                                    │
│    [TrendAreaChart - at-risk count over exams]     │
│    [ResponsiveDataTable - student detail]          │
│                                                  │
│  Achievers tab:                                  │
│    [ComparisonBarChart - horizontal leaderboard]   │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Decisions

- Tables kept alongside charts — tables provide detail (names, subjects, scores) that charts summarize visually. Charts go above tables as visual summaries.
- Radar chart answers "which subjects is the school strong/weak in?" at a glance
- At-risk trend line is the most actionable new chart — answers "are interventions working?"
- Exam pipeline stacked bar turns badge soup into a proportional visual flow
- Subject Analytics cards get pagination (currently unbounded — problematic for large schools)
- Native `<select>` elements replaced with themed Radix `Select`
- Custom tab buttons replaced with shared `Tabs` component

---

## Section 4: DashboardPage Top-Level Upgrades

**File**: `src/features/dashboard/pages/DashboardPage.tsx`
**Scope**: Admin and Office Admin view of the main dashboard orchestrator page

### Changes

| Area | Before | After |
|---|---|---|
| KPI Card 1 | Plain "Total Students" number | `StatCard` with count, trend vs last month, `GraduationCap` icon |
| KPI Card 2 | Plain "Classes & Sections" | `StatCard` with class count, sections as subtitle, `BookOpen` icon |
| KPI Card 3 | Plain "Attendance Today" % | `StatCard` with rate %, trend vs yesterday, color-coded, `CalendarCheck` icon |
| KPI Card 4 | "Security Scope" — RBAC + tenant UUID | **Replaced** → `StatCard` showing "Staff Members" count (teachers + office admins). The security info is developer-facing, not admin-facing. |
| Quick Actions | 3-col card grid | Keep structure, add inline completion indicators (e.g., "3 of 12 sections marked") |
| Session footer | User ID, Tenant ID, Role — full cards | Collapsed by default with small toggle — debugging tool, not dashboard content |
| Hero Banner | Greeting + role + date + logo | Unchanged (recently redesigned, works well) |
| Hub ordering | Attendance → Results | Unchanged (attendance is daily-urgent, results are periodic) |

### Layout

```
┌──────────────────────────────────────────────────┐
│  DashboardHeroBanner (unchanged)                 │
├────────┬────────┬────────┬───────────────────────┤
│StatCard│StatCard│StatCard│ StatCard               │
│Students│Classes │Attend% │ Staff                  │
│ +12 ↑  │8 / 24  │ 87% ↑  │ 15 members            │
├────────┴────────┴────────┴───────────────────────┤
│  Quick Actions (with inline progress hints)      │
│  [Mark Attendance (3/12)] [Manage Classes] [...]  │
├──────────────────────────────────────────────────┤
│  AttendanceDashboardHub (Section 2 upgrades)     │
├──────────────────────────────────────────────────┤
│  SchoolResultsDashboardHub (Section 3 upgrades)  │
├──────────────────────────────────────────────────┤
│  ▸ Session Context (collapsed by default)        │
└──────────────────────────────────────────────────┘
```

### Decisions

- Security Scope card replaced with Staff count — "RBAC + ReBAC" and a tenant UUID are developer-facing diagnostics, not actionable admin information
- Session footer collapsed — still accessible for debugging but no longer occupies prime dashboard real estate
- Quick action progress hints give at-a-glance awareness without opening full hubs
- Hero banner untouched — recently improved
- Hub ordering preserved — attendance (daily urgency) before results (periodic review)

---

## Component Dependency Graph

```
DashboardPage.tsx
├── DashboardHeroBanner.tsx (unchanged)
├── StatCard (new, ×4)
├── Quick Action Cards (enhanced with progress hints)
├── AttendanceDashboardHub.tsx (upgraded)
│   ├── StatCard (×4)
│   ├── DonutChart (today mode)
│   ├── TrendAreaChart (range mode)
│   ├── ComparisonBarChart (range mode)
│   ├── CalendarHeatmap (30-day mode)
│   └── Section Checklist (unchanged)
└── SchoolResultsDashboardHub.tsx (upgraded)
    ├── StatCard (×4)
    ├── DonutChart (pass/fail)
    ├── ComparisonBarChart (pipeline + classes + achievers)
    ├── RadarChart (subjects)
    ├── TrendAreaChart (at-risk trends)
    ├── Tabs (new shared)
    ├── Select (new shared, ×2)
    └── ResponsiveDataTable (kept)
```

## New Radix UI Dependencies

- `@radix-ui/react-tabs` — for the shared `Tabs` component
- `@radix-ui/react-select` — for the shared `Select` component

These follow the existing Radix pattern already used throughout the project (`@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, etc.).

---

## Testing Strategy

- **Visual verification**: Each chart component tested in light and dark mode, at mobile/tablet/desktop breakpoints
- **Empty/loading/error states**: Each `ChartCard` wrapper tested with no data, loading, and API error scenarios
- **Data accuracy**: Chart values cross-checked against the existing table/number displays they replace
- **Accessibility**: Chart tooltips keyboard-navigable, color-coded elements have non-color differentiation (patterns/labels)
- **TypeScript**: All chart data props strictly typed. `npx tsc --noEmit` must pass.
- **Lint**: `npm run lint` must pass
- **Build**: `npm run build` must pass

## Migration Notes

- Existing hand-rolled CSS bars in `PlatformTrendsSection.tsx` (Super Admin) are **not** changed in this iteration — they work acceptably and are out of scope (Admin/Office Admin focus)
- Teacher and Parent views in `AttendanceDashboardHub.tsx` are **not** changed — they can adopt `StatCard` in a follow-up
- The new `StatCard`, `Tabs`, `Select`, and chart components are immediately available for other features to adopt progressively
