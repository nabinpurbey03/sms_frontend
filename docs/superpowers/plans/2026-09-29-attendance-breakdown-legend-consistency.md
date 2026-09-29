# Attendance Breakdown Donut Chart Legend Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the redundant footer legend in the "Attendance Breakdown" donut chart on the Admin and Office Admin Dashboard, ensuring a single unified legend consistent with other dashboard donut charts (like "Pass / Fail Distribution").

**Architecture:** 
- In `AttendanceDashboardHub.tsx`, the "Attendance Breakdown" card currently renders two legends:
  1. `<DonutChart>`'s built-in Recharts legend (`● Present  ● Absent  ● Unmarked`).
  2. A custom footer `div` duplicated right below it (`● Present: {count}  ● Absent: {count}  ● Unmarked: {count}`).
- Remove the redundant footer `div` so only `<DonutChart>`'s clean legend is displayed, aligning with `SchoolResultsDashboardHub.tsx`'s "Pass / Fail Distribution" donut chart. The Present, Absent, and Total metrics remain fully visible and actionable in the 4 StatCards directly adjacent to the donut chart.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, shadcn/ui.

---

### Task 1: Remove Redundant Legend in Attendance Breakdown Donut Chart

**Files:**
- Modify: `E:\SSUP\frontend\src\features\dashboard\components\AttendanceDashboardHub.tsx:540-583`

**Interfaces:**
- Consumes: `<DonutChart>` from `@/components/ui/charts/donut-chart`

- [ ] **Step 1: Inspect `AttendanceDashboardHub.tsx` lines 540-583**

Verify the current markup of the card content:
```tsx
<CardContent className="p-5 pt-0 flex-1 flex flex-col justify-between space-y-4">
  <div className="flex-1 min-h-[210px] flex items-center justify-center py-1">
    <DonutChart
      data={[
        { name: 'Present', value: totalPresent, color: '#10b981' },
        { name: 'Absent', value: totalAbsent, color: '#f43f5e' },
        {
          name: 'Unmarked',
          value: Math.max(0, totalEnrolled - totalPresent - totalAbsent),
          color: '#94a3b8',
        },
      ]}
      centerValue={`${presenceRate != null ? presenceRate.toFixed(0) : '—'}%`}
      centerLabel="Attendance"
    />
  </div>

  {/* Compact Legend & Totals Footer */}
  <div className="flex items-center justify-around border-t border-border/60 pt-3 text-xs">
    ...
  </div>
</CardContent>
```

- [ ] **Step 2: Remove redundant footer div and adjust CardContent layout**

Replace with:
```tsx
<CardContent className="p-5 pt-0 flex-1 flex flex-col items-center justify-center">
  <div className="w-full flex items-center justify-center py-2">
    <DonutChart
      data={[
        { name: 'Present', value: totalPresent, color: '#10b981' },
        { name: 'Absent', value: totalAbsent, color: '#f43f5e' },
        {
          name: 'Unmarked',
          value: Math.max(0, totalEnrolled - totalPresent - totalAbsent),
          color: '#94a3b8',
        },
      ]}
      centerValue={`${presenceRate != null ? presenceRate.toFixed(0) : '—'}%`}
      centerLabel="Attendance"
    />
  </div>
</CardContent>
```

- [ ] **Step 3: Run TypeScript typecheck**

Run:
```powershell
npx tsc --noEmit
```
Expected: PASS with 0 errors.

- [ ] **Step 4: Run Vite build**

Run:
```powershell
npm run build
```
Expected: PASS with exit code 0.

- [ ] **Step 5: Run linter**

Run:
```powershell
npm run lint
```
Expected: 0 errors on modified files.
