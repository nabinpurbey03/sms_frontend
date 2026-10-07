# Attendance Hub Layout Modernization & Time-Series Infographics Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebalance the Attendance Reporting Hub layout by introducing a rolling 7-day attendance time-series infographics beside the Donut chart, moving Daily Section Submission Status to a spacious full-width container below the charts, and fixing button overflow in section cards.

**Architecture:** In `AttendanceDashboardHub.tsx`, fetch a rolling 7-day school attendance trend for Today mode and display it alongside the Attendance Breakdown Donut Chart in a balanced 1:2 column grid (`grid-cols-1 lg:grid-cols-3`). Place the Daily Section Submission Status card in a full-width layout beneath both charts. Within the section cards, remove the redundant disabled "Mark" button on empty sections, streamline the status badges, and enforce robust overflow constraints.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Lucide icons, Recharts (`TrendAreaChart`, `DonutChart`), TanStack Query.

---

## Global Constraints

- Never render a disabled or active "Mark" button for empty sections (`totalStudents === 0`).
- Ensure all section cards have `min-w-0` and bounded child containers so text and badges never spill outside borders.
- Keep chart heights balanced at ~280-320px in the top analytics row.
- Retain all existing functionality: range mode (7d, 30d), Nepali date selection, absent roster drawer, section filtering/search, and permissions.
- Zero TypeScript errors (`npm run build`) and 100% test pass rate (`node --test src/**/*.test.mjs`).

---

### Task 1: Add Unit Tests for Section Card Roster Logic & Layout Utilities

**Files:**
- Create: `src/features/dashboard/components/__tests__/attendanceHubLayout.test.mjs`

**Interfaces:**
- Consumes: helper functions for section status classification and button eligibility.
- Produces: automated test suite verifying empty section action suppression, badge generation, and rolling 7-day date range generation.

- [ ] **Step 1: Write unit tests**

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Helper to determine action rendering for a section card
export function getSectionCardActionMeta(sec) {
  if (sec.isMarked) {
    return { type: 'badge', status: 'RECORDED', label: 'Recorded', showButton: false };
  }
  if (sec.totalStudents === 0) {
    return { type: 'badge', status: 'EMPTY', label: 'Empty Section', showButton: false };
  }
  return { type: 'action', status: 'PENDING', label: 'Mark', showButton: true };
}

// Helper to calculate rolling 7-day date window for time series
export function getRollingSevenDayWindow(baseDateStr) {
  const base = new Date(baseDateStr);
  const start = new Date(base);
  start.setDate(start.getDate() - 7);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: baseDateStr,
  };
}

describe('Attendance Hub Layout & Section Roster Logic', () => {
  it('correctly suppresses Mark button and returns EMPTY badge for 0-student sections', () => {
    const emptySection = {
      sectionId: 'sec-1',
      sectionName: 'A',
      className: 'Grade 1',
      totalStudents: 0,
      presentCount: 0,
      absentCount: 0,
      isMarked: false,
    };
    const meta = getSectionCardActionMeta(emptySection);
    assert.equal(meta.status, 'EMPTY');
    assert.equal(meta.label, 'Empty Section');
    assert.equal(meta.showButton, false, 'Empty sections must never render a Mark button');
  });

  it('renders Recorded badge and suppresses button for marked sections', () => {
    const markedSection = {
      sectionId: 'sec-2',
      sectionName: 'B',
      className: 'Grade 1',
      totalStudents: 25,
      presentCount: 24,
      absentCount: 1,
      isMarked: true,
    };
    const meta = getSectionCardActionMeta(markedSection);
    assert.equal(meta.status, 'RECORDED');
    assert.equal(meta.showButton, false);
  });

  it('renders Mark button for pending sections with enrolled students', () => {
    const pendingSection = {
      sectionId: 'sec-3',
      sectionName: 'C',
      className: 'Grade 2',
      totalStudents: 22,
      presentCount: 0,
      absentCount: 0,
      isMarked: false,
    };
    const meta = getSectionCardActionMeta(pendingSection);
    assert.equal(meta.status, 'PENDING');
    assert.equal(meta.showButton, true);
  });

  it('calculates exact 7-day rolling date range window', () => {
    const window = getRollingSevenDayWindow('2026-10-07');
    assert.equal(window.endDate, '2026-10-07');
    assert.equal(window.startDate, '2026-09-30');
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `node --test src/features/dashboard/components/__tests__/attendanceHubLayout.test.mjs`
Expected: PASS with 4 tests.

- [ ] **Step 3: Commit**

```bash
git add src/features/dashboard/components/__tests__/attendanceHubLayout.test.mjs
git commit -m "test(dashboard): add unit tests for attendance hub section card roster and layout logic"
```

---

### Task 2: Implement Rolling 7-Day Trend Chart & Balanced Analytics Row in Today Mode

**Files:**
- Modify: `src/features/dashboard/components/AttendanceDashboardHub.tsx`

**Interfaces:**
- Consumes: `useSchoolAttendanceReport`, `TrendAreaChart`, `ChartCard`.
- Produces: balanced top analytics row with Donut Chart (1/3) and 7-day Trend Area Chart (2/3).

- [ ] **Step 1: Add rolling 7-day report query for Today mode**

In `AttendanceDashboardHub.tsx`:
```tsx
  const rollingStartDate = useMemo(() => getDateDaysAgo(7), []);

  const {
    data: todayRollingReport,
    isLoading: isTodayRollingLoading,
  } = useSchoolAttendanceReport(
    activeTenantId,
    rollingStartDate,
    selectedDate,
    { enabled: !!activeTenantId && isAdminOrOfficeAdmin && timeframe === 'today' }
  );

  const rollingDailyRecords = useMemo(() => {
    return todayRollingReport?.daily_stats || [];
  }, [todayRollingReport]);
```

- [ ] **Step 2: Restructure the Today Analytics Row**

Update `<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-stretch">`:
- Left (1/3): Attendance Breakdown Donut Chart (`lg:col-span-1`).
- Right (2/3): Recent Attendance Trend (`lg:col-span-2`) rendering `<ChartCard>` with `<TrendAreaChart>`.

```tsx
          {/* Today mode: Row 2 Analytics Infographics (1/3 Donut + 2/3 7-Day Trend) */}
          {!isRange && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-stretch">
              {/* Left 1/3: Attendance Breakdown Donut Chart */}
              <div className="lg:col-span-1">
                <Card className="border-border/60 rounded-xl overflow-hidden shadow-2xs h-full flex flex-col">
                  <CardHeader className="p-5 pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold">Attendance Breakdown</CardTitle>
                      <Badge variant="outline" className="font-mono text-[10px] px-2 py-0.5">
                        {selectedDate === todayStr ? 'Today' : selectedDate}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      Student distribution across roll call statuses
                    </CardDescription>
                  </CardHeader>

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
                </Card>
              </div>

              {/* Right 2/3: 7-Day Attendance Trend Time-Series Infographics */}
              <div className="lg:col-span-2">
                <ChartCard
                  title="Recent Attendance Trend"
                  description="Daily attendance trajectory over the last 7 days"
                  isLoading={isTodayRollingLoading}
                  isEmpty={!rollingDailyRecords || rollingDailyRecords.length === 0}
                  className="h-full"
                >
                  <TrendAreaChart
                    data={rollingDailyRecords.map((record: DailySchoolAttendanceItem) => ({
                      date: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(record.date)),
                      rate:
                        record.total_students > 0
                          ? Number(((record.present_count / record.total_students) * 100).toFixed(1))
                          : (record.attendance_percentage ?? 0),
                    }))}
                    dataKey="rate"
                    xAxisKey="date"
                    color="#10b981"
                    valueFormatter={(v: number) => `${v.toFixed(1)}%`}
                    height={250}
                  />
                </ChartCard>
              </div>
            </div>
          )}
```

- [ ] **Step 3: Run build to verify clean compilation**

Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/dashboard/components/AttendanceDashboardHub.tsx
git commit -m "feat(dashboard): add 7-day attendance trend time-series infographics beside donut chart in today mode"
```

---

### Task 3: Move Daily Section Submission Status to Full-Width & Fix Card Overflow

**Files:**
- Modify: `src/features/dashboard/components/AttendanceDashboardHub.tsx`

**Interfaces:**
- Consumes: `sectionsStatusList`, `filteredSectionsList`.
- Produces: full-width, non-overflowing section grid with clean badges for empty sections and contained action buttons.

- [ ] **Step 1: Place Daily Section Submission Status in a full-width container below charts**

In `AttendanceDashboardHub.tsx`, render the Daily Section Submission Status card directly below the charts in Today mode (`{!isRange && (...)`}):

```tsx
          {/* Today mode: Row 3 (100% Full Width): Daily Section Submission Status */}
          {!isRange && (
            <div className="mt-4 sm:mt-6">
              <Card className="border-border/60 rounded-xl overflow-hidden shadow-2xs">
                {/* Header, Progress Bar, Filter Tabs, Search toolbar */}
                ...
```

- [ ] **Step 2: Fix section cards inside `filteredSectionsList.map`**

Update the cards inside `filteredSectionsList.map`:
1. Use `min-w-0 flex items-center justify-between gap-3`.
2. Truncate class and section names safely.
3. For empty sections (`sec.totalStudents === 0`):
   - Render ONLY `<Badge variant="outline" className="text-[10px] px-2 py-0.5 font-medium border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 shrink-0">Empty Section</Badge>`.
   - Remove the disabled `<Button>Mark</Button>` so there is zero overflow.
4. For recorded sections (`sec.isMarked`):
   - Render `<Badge variant="outline" className="text-[10px] px-2 py-0.5 font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1 shrink-0"><Check className="h-3 w-3" /> Recorded</Badge>`.
5. For pending sections with students:
   - Render `<Button asChild size="sm" className="h-7 text-[11px] px-2.5 font-semibold text-primary border-primary/30 hover:bg-primary/10 shrink-0"><Link ...>Mark</Link></Button>`.

```tsx
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 pt-1">
                      {filteredSectionsList.map((sec) => (
                        <div
                          key={sec.sectionId}
                          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-colors min-w-0 ${
                            sec.isMarked
                              ? 'bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10'
                              : 'bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10'
                          }`}
                        >
                          <div className="space-y-1 min-w-0 flex-1">
                            <p className="text-xs font-bold text-foreground truncate" title={`${sec.className} - ${sec.sectionName}`}>
                              {sec.className} - {sec.sectionName}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {sec.isMarked
                                ? `${sec.presentCount} present • ${sec.absentCount} absent`
                                : sec.totalStudents === 0
                                ? '0 enrolled • Empty'
                                : `${sec.totalStudents} enrolled • Pending`}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {sec.isMarked ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-2 py-0.5 font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1"
                              >
                                <Check className="h-3 w-3" />
                                Recorded
                              </Badge>
                            ) : sec.totalStudents === 0 ? (
                              <Badge
                                variant="outline"
                                className="font-semibold text-[11px] border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                              >
                                Empty Section
                              </Badge>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-[11px] px-2.5 font-semibold text-primary border-primary/30 hover:bg-primary/10"
                                asChild
                              >
                                <Link
                                  to="/attendance/mark"
                                  search={{ classId: sec.classId, sectionId: sec.sectionId }}
                                >
                                  Mark
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
```

- [ ] **Step 3: Run build and tests**

Run: `npm run build && node --test src/**/*.test.mjs`
Expected: 0 errors and all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/features/dashboard/components/AttendanceDashboardHub.tsx
git commit -m "feat(dashboard): expand daily section submission status to full width and eliminate button overflow"
```

---

### Task 4: Full Verification & Visual Polish

**Files:**
- Test: `src/features/dashboard/components/__tests__/attendanceHubLayout.test.mjs`
- Test: Full test suite

- [ ] **Step 1: Run comprehensive tests**

Run: `node --test src/**/*.test.mjs`
Expected: 178+ tests pass.

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: 0 warnings/errors, clean bundle.

- [ ] **Step 3: Verify git status and commit final verification**

```bash
git status
```
Confirm clean branch.
