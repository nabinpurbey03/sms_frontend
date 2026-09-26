# Authentic Nepali (BS) and Gregorian (AD) Dual Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a complete, authentic dual-calendar experience across the entire application: when user preference is `BS` (Bikram Sambat), display the authentic Nepali Calendar (पात्रो / Patro) month grid with Baisakh–Chaitra navigation, 1–32 dynamic day calculation, Saturday weekend accents, and BS date pickers; when `AD`, display the standard Gregorian calendar grid (January–December); strictly clamp academic calendar navigation and scheduling within academic year bounds, assign distinct category colors, make event titles visible, and adapt date pickers across Attendance and Academic Year workflows.

**Architecture:** Create a dedicated `NepaliCalendarGrid.tsx` for authentic BS Patro month rendering with session boundary clamping and category color pills, while delegating `AD` mode to the Gregorian `react-big-calendar` grid in `AcademicCalendarGrid.tsx`. Promote `NepaliDatePicker` into a reusable UI component that automatically reflects `useCalendarPreferenceStore` mode, and integrate it into `MarkAttendancePage.tsx`, `AttendanceReportsPage.tsx`, `AcademicYearFormDialog.tsx`, `PlatformRolloverDialog.tsx`, `AbsentStudentsDrawer.tsx`, and `AttendanceDashboardHub.tsx`, keeping all backend API payload shapes unchanged as ISO `YYYY-MM-DD`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, `nepali-date-converter`, `react-big-calendar`, `dayjs`, Zustand with `localStorage` persistence, Radix UI Popover, Lucide React icons.

**Spec:** User request: "explore the whole and implement, if user preference is BS show Nepali calendar and if AD show gregorian. for academic calendar, Update the as per start and end of academic year it should not go beyond and before academic year. Assign suitable color for every kind of events. The name of events should be visible in the calendar."

## Global Constraints

- Frontend-only changes: all backend API endpoints and schemas continue to receive and return standard Gregorian `YYYY-MM-DD` strings.
- Strictly adhere to user's `calendarSystem` preference (`'BS' | 'AD'`) stored in `useCalendarPreferenceStore` (`schools_up_calendar_system`).
- In BS mode, months must be genuine Bikram Sambat months (Baisakh to Chaitra) with accurate days (29–32 days per month) and Saturday highlighted as the weekly off day.
- In both BS and AD views, calendar navigation and event scheduling must be strictly clamped between the active academic session's `start_date` and `end_date`.
- Event titles must be prominently legible on day cells, with high-contrast category coloring and holiday indicators.
- WCAG 2.5.5 minimum $\ge 44\times 44\text{px}$ touch targets for all interactive controls.
- All existing 93 backend tests must continue to pass with 0 regressions.
- `npm run lint` and `npm run build` must compile cleanly with 0 errors.

---

### Task 1: Nepali Calendar Engine & Utilities Enhancement

**Files:**
- Modify: `src/features/school-settings/utils/nepaliDate.ts:100-231`
- Test: `src/features/school-settings/utils/__tests__/nepaliCalendarEngine.test.mjs`

**Interfaces:**
- Consumes: `nepali-date-converter`, `NEPALI_MONTHS`, `NEPALI_DAYS_OF_WEEK`
- Produces:
  - `getBsMonthDateRangeAd(year: number, monthIndex: number): { startAd: string; endAd: string }`
  - `isBsMonthWithinBounds(year: number, monthIndex: number, minDate?: string, maxDate?: string): boolean`
  - `isAdDateWithinSession(adDateStr: string, minDate?: string, maxDate?: string): boolean`
  - `getBsCalendarMatrix(year: number, monthIndex: number): Array<{ dayNum: number; bsDateStr: string; adDateStr: string; isSaturday: boolean } | null>`

- [ ] **Step 1: Write the failing test for BS month range and matrix calculations**

Create `src/features/school-settings/utils/__tests__/nepaliCalendarEngine.test.mjs`:
```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import rawNepaliDate from 'nepali-date-converter';

const NepaliDate = rawNepaliDate.default || rawNepaliDate;
const pad = (n) => String(n).padStart(2, '0');

function getBsDaysInMonth(year, monthIndex) {
  for (let day = 32; day >= 29; day--) {
    try {
      const t = new NepaliDate(year, monthIndex, day);
      if (t.getMonth() === monthIndex) return day;
    } catch {
      continue;
    }
  }
  return 30;
}

function getBsMonthStartDayOfWeek(year, monthIndex) {
  const first = new NepaliDate(year, monthIndex, 1);
  return first.getDay();
}

function bsToAd(bsDateStr) {
  const [y, m, d] = bsDateStr.split('-').map(Number);
  const np = new NepaliDate(y, m - 1, d);
  const ad = np.toJsDate();
  return `${ad.getFullYear()}-${pad(ad.getMonth() + 1)}-${pad(ad.getDate())}`;
}

function getBsMonthDateRangeAd(year, monthIndex) {
  const days = getBsDaysInMonth(year, monthIndex);
  const startAd = bsToAd(`${year}-${pad(monthIndex + 1)}-01`);
  const endAd = bsToAd(`${year}-${pad(monthIndex + 1)}-${pad(days)}`);
  return { startAd, endAd };
}

function isBsMonthWithinBounds(year, monthIndex, minDate, maxDate) {
  const { startAd, endAd } = getBsMonthDateRangeAd(year, monthIndex);
  if (minDate && endAd < minDate) return false;
  if (maxDate && startAd > maxDate) return false;
  return true;
}

test('Ashwin 2082 BS calculation and Gregorian conversion', () => {
  const days = getBsDaysInMonth(2082, 5); // Ashwin is index 5
  assert.strictEqual(days, 31, 'Ashwin 2082 has 31 days');

  const startDayOfWeek = getBsMonthStartDayOfWeek(2082, 5);
  assert.strictEqual(startDayOfWeek, 3, 'Ashwin 1, 2082 starts on Wednesday (day 3)');

  const { startAd, endAd } = getBsMonthDateRangeAd(2082, 5);
  assert.strictEqual(startAd, '2025-09-17', 'Ashwin 1, 2082 is 2025-09-17');
  assert.strictEqual(endAd, '2025-10-17', 'Ashwin 31, 2082 is 2025-10-17');
});

test('Session bounds clamping for BS months', () => {
  const minDate = '2025-04-14'; // Baisakh 1, 2082
  const maxDate = '2026-04-13'; // Chaitra 30, 2082

  assert.strictEqual(isBsMonthWithinBounds(2082, 0, minDate, maxDate), true, 'Baisakh 2082 is in session');
  assert.strictEqual(isBsMonthWithinBounds(2082, 5, minDate, maxDate), true, 'Ashwin 2082 is in session');
  assert.strictEqual(isBsMonthWithinBounds(2081, 11, minDate, maxDate), false, 'Chaitra 2081 is before session');
  assert.strictEqual(isBsMonthWithinBounds(2083, 1, minDate, maxDate), false, 'Jestha 2083 is after session');
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `node src/features/school-settings/utils/__tests__/nepaliCalendarEngine.test.mjs`
Expected: PASS (2 tests passed)

- [ ] **Step 3: Implement engine functions in `nepaliDate.ts`**

In `src/features/school-settings/utils/nepaliDate.ts`, export the verified helper functions:
```typescript
/**
 * Returns the Gregorian start and end date strings (YYYY-MM-DD) for a BS month
 */
export function getBsMonthDateRangeAd(
  year: number,
  monthIndex: number
): { startAd: string; endAd: string } {
  const days = getBsDaysInMonth(year, monthIndex);
  const startAd = bsToAd(`${year}-${pad(monthIndex + 1)}-01`);
  const endAd = bsToAd(`${year}-${pad(monthIndex + 1)}-${pad(days)}`);
  return { startAd, endAd };
}

/**
 * Checks if a given BS month overlaps with an academic session's [minDate, maxDate]
 */
export function isBsMonthWithinBounds(
  year: number,
  monthIndex: number,
  minDate?: string,
  maxDate?: string
): boolean {
  const { startAd, endAd } = getBsMonthDateRangeAd(year, monthIndex);
  if (minDate && endAd < minDate) return false;
  if (maxDate && startAd > maxDate) return false;
  return true;
}

/**
 * Checks if a single AD date string falls inside the active academic session
 */
export function isAdDateWithinSession(
  adDateStr: string,
  minDate?: string,
  maxDate?: string
): boolean {
  if (minDate && adDateStr < minDate) return false;
  if (maxDate && adDateStr > maxDate) return false;
  return true;
}
```

- [ ] **Step 4: Verify frontend type check**

Run: `npm run lint`
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add src/features/school-settings/utils/nepaliDate.ts src/features/school-settings/utils/__tests__/nepaliCalendarEngine.test.mjs
git commit -m "feat(calendar): add BS month range and session bounds clamping helpers"
```

---

### Task 2: Build Authentic `NepaliCalendarGrid.tsx` Component

**Files:**
- Create: `src/features/school-settings/components/NepaliCalendarGrid.tsx`
- Consumes:
  - `AcademicCalendarEvent`, `CalendarEventType` from `../types`
  - `NEPALI_MONTHS`, `NEPALI_DAYS_OF_WEEK`, `bsToAd`, `adToBs`, `getNepaliDateFromAd`, `getBsDaysInMonth`, `getBsMonthStartDayOfWeek`, `getBsMonthDateRangeAd`, `isBsMonthWithinBounds`, `isAdDateWithinSession` from `../utils/nepaliDate`
  - `getCategoryBlockClass` from `./AcademicCalendarGrid`
- Produces:
  - `<NepaliCalendarGrid />` component rendering the true Bikram Sambat month matrix, Saturday off accent, full event pills, session navigation bounds, and agenda mode.

- [ ] **Step 1: Create `NepaliCalendarGrid.tsx`**

Create `src/features/school-settings/components/NepaliCalendarGrid.tsx`:
```tsx
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Plus,
  Calendar as CalendarIcon,
  Sparkles,
} from 'lucide-react';
import {
  NEPALI_MONTHS,
  NEPALI_DAYS_OF_WEEK,
  adToBs,
  bsToAd,
  getNepaliDateFromAd,
  getBsDaysInMonth,
  getBsMonthStartDayOfWeek,
  getBsMonthDateRangeAd,
  isBsMonthWithinBounds,
  isAdDateWithinSession,
  formatDualDate,
  formatDualDateRange,
} from '../utils/nepaliDate';
import { getCategoryBlockClass } from './AcademicCalendarGrid';
import type { AcademicCalendarEvent } from '../types';

export interface NepaliCalendarGridProps {
  events: AcademicCalendarEvent[];
  canManage: boolean;
  onSelectDate: (adDateStr: string) => void;
  onSelectEvent: (event: AcademicCalendarEvent) => void;
  initialDate?: Date;
  minDate?: string; // Academic year start_date (YYYY-MM-DD)
  maxDate?: string; // Academic year end_date (YYYY-MM-DD)
  academicYearName?: string;
}

export const NepaliCalendarGrid: React.FC<NepaliCalendarGridProps> = ({
  events,
  canManage,
  onSelectDate,
  onSelectEvent,
  initialDate,
  minDate,
  maxDate,
  academicYearName,
}) => {
  // Determine initial BS Year and Month
  const initialBs = useMemo(() => {
    const d = initialDate || new Date();
    const info = getNepaliDateFromAd(d);
    return {
      year: info?.year ?? 2082,
      month: info?.month ?? 5,
    };
  }, [initialDate]);

  const [viewYear, setViewYear] = useState<number>(initialBs.year);
  const [viewMonth, setViewMonth] = useState<number>(initialBs.month);
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month');

  // Days in viewed BS month and starting day of week
  const daysInMonth = useMemo(() => {
    return getBsDaysInMonth(viewYear, viewMonth);
  }, [viewYear, viewMonth]);

  const startDayOfWeek = useMemo(() => {
    return getBsMonthStartDayOfWeek(viewYear, viewMonth);
  }, [viewYear, viewMonth]);

  const monthRangeAd = useMemo(() => {
    return getBsMonthDateRangeAd(viewYear, viewMonth);
  }, [viewYear, viewMonth]);

  // Session bounds check for Prev and Next navigation
  const canPrev = useMemo(() => {
    const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
    const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
    return isBsMonthWithinBounds(prevYear, prevMonth, minDate, maxDate);
  }, [viewYear, viewMonth, minDate, maxDate]);

  const canNext = useMemo(() => {
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    return isBsMonthWithinBounds(nextYear, nextMonth, minDate, maxDate);
  }, [viewYear, viewMonth, minDate, maxDate]);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (!canPrev) return;
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (!canNext) return;
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleToday = () => {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayAdStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

    if (isAdDateWithinSession(todayAdStr, minDate, maxDate)) {
      const todayInfo = getNepaliDateFromAd(today);
      if (todayInfo) {
        setViewYear(todayInfo.year);
        setViewMonth(todayInfo.month);
      }
    } else if (minDate) {
      const minInfo = getNepaliDateFromAd(minDate);
      if (minInfo) {
        setViewYear(minInfo.year);
        setViewMonth(minInfo.month);
      }
    }
  };

  // Build list of valid BS years based on minDate/maxDate
  const availableYears = useMemo(() => {
    let minYear = 2070;
    let maxYear = 2090;
    if (minDate) {
      const minInfo = getNepaliDateFromAd(minDate);
      if (minInfo) minYear = minInfo.year;
    }
    if (maxDate) {
      const maxInfo = getNepaliDateFromAd(maxDate);
      if (maxInfo) maxYear = maxInfo.year;
    }
    const years: number[] = [];
    for (let y = minYear; y <= maxYear; y++) {
      years.push(y);
    }
    return years.length > 0 ? years : [2082];
  }, [minDate, maxDate]);

  // Map events to BS days for fast lookup
  const eventsByDay = useMemo(() => {
    const map = new Map<number, AcademicCalendarEvent[]>();
    const pad = (n: number) => String(n).padStart(2, '0');

    for (let d = 1; d <= daysInMonth; d++) {
      const bsStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(d)}`;
      const adStr = bsToAd(bsStr);
      if (!adStr) continue;

      const matching = events.filter((ev) => ev.start_date <= adStr && adStr <= ev.end_date);
      if (matching.length > 0) {
        map.set(d, matching);
      }
    }
    return map;
  }, [events, daysInMonth, viewYear, viewMonth]);

  // Gregorian today
  const todayAdStr = useMemo(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }, []);

  const currentMonthInfo = NEPALI_MONTHS[viewMonth];

  // Month Events for Agenda View
  const monthEvents = useMemo(() => {
    return events.filter(
      (e) => e.start_date <= monthRangeAd.endAd && e.end_date >= monthRangeAd.startAd
    );
  }, [events, monthRangeAd]);

  return (
    <div className="space-y-3">
      {/* Calendar Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 border border-border rounded-xl bg-card shadow-xs">
        {/* Navigation & Jump to Today */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canPrev}
            onClick={handlePrevMonth}
            className="h-8 w-8 p-0"
            title={canPrev ? 'Previous BS Month' : 'Session start reached'}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="h-8 px-2.5 text-xs font-semibold"
          >
            Today
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canNext}
            onClick={handleNextMonth}
            className="h-8 w-8 p-0"
            title={canNext ? 'Next BS Month' : 'Session end reached'}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Month & Year Selectors & Academic Session Title */}
        <div className="flex flex-col items-center md:items-start">
          <div className="flex items-center gap-2">
            <select
              value={viewMonth}
              onChange={(e) => setViewMonth(Number(e.target.value))}
              className="rounded-md border border-input bg-background px-2.5 py-1 text-sm sm:text-base font-bold text-foreground shadow-2xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {NEPALI_MONTHS.map((m) => {
                const disabled = !isBsMonthWithinBounds(viewYear, m.index, minDate, maxDate);
                return (
                  <option key={m.index} value={m.index} disabled={disabled}>
                    {m.nameNp} ({m.nameEn})
                  </option>
                );
              })}
            </select>

            <select
              value={viewYear}
              onChange={(e) => setViewYear(Number(e.target.value))}
              className="rounded-md border border-input bg-background px-2.5 py-1 text-sm sm:text-base font-bold text-foreground shadow-2xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y} BS
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mt-1">
            <span>
              {monthRangeAd.startAd} to {monthRangeAd.endAd} AD
            </span>
            {academicYearName && (
              <>
                <span>•</span>
                <span className="font-semibold text-foreground">{academicYearName}</span>
              </>
            )}
          </div>
        </div>

        {/* View Switchers: Month Grid vs Agenda */}
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
          <button
            type="button"
            onClick={() => setViewMode('month')}
            className={`h-7 px-3 text-xs rounded-md font-medium transition-colors cursor-pointer ${
              viewMode === 'month'
                ? 'bg-background text-foreground font-bold shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Month Grid
          </button>
          <button
            type="button"
            onClick={() => setViewMode('agenda')}
            className={`h-7 px-3 text-xs rounded-md font-medium transition-colors cursor-pointer ${
              viewMode === 'agenda'
                ? 'bg-background text-foreground font-bold shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Agenda ({monthEvents.length})
          </button>
        </div>
      </div>

      {/* Main Grid View */}
      {viewMode === 'month' ? (
        <div className="border border-border rounded-xl bg-card shadow-xs overflow-hidden">
          {/* Weekday Column Headers */}
          <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center">
            {NEPALI_DAYS_OF_WEEK.map((day) => (
              <div
                key={day.index}
                className={`py-2 px-1 text-xs font-bold border-r border-border last:border-r-0 ${
                  day.index === 6
                    ? 'text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20'
                    : 'text-muted-foreground'
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <span>{day.short}</span>
                  <span className="text-[10px] font-normal opacity-75">({day.nepaliShort})</span>
                </div>
              </div>
            ))}
          </div>

          {/* Days Cells */}
          <div className="grid grid-cols-7">
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="min-h-[90px] sm:min-h-[110px] p-1.5 border-b border-r border-border bg-muted/15 last:border-r-0"
              />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const pad = (n: number) => String(n).padStart(2, '0');
              const bsStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(dayNum)}`;
              const adStr = bsToAd(bsStr);

              const isSaturday = (startDayOfWeek + i) % 7 === 6;
              const isToday = adStr === todayAdStr;
              const isOutOfSession = !isAdDateWithinSession(adStr, minDate, maxDate);
              const dayEvents = eventsByDay.get(dayNum) || [];

              const [ay, am, ad] = adStr.split('-').map(Number);
              const adDateObj = new Date(ay, am - 1, ad);
              const adLabel = adDateObj.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              });

              return (
                <div
                  key={dayNum}
                  onClick={() => {
                    if (isOutOfSession || !canManage) return;
                    onSelectDate(adStr);
                  }}
                  className={`min-h-[95px] sm:min-h-[115px] p-1.5 border-b border-r border-border transition-colors flex flex-col justify-between group ${
                    isOutOfSession
                      ? 'bg-muted/30 opacity-30 cursor-not-allowed'
                      : canManage
                      ? 'hover:bg-muted/30 cursor-pointer'
                      : ''
                  } ${
                    isSaturday
                      ? 'bg-rose-50/20 dark:bg-rose-950/10'
                      : ''
                  } ${
                    isToday
                      ? 'ring-2 ring-primary ring-inset bg-primary/5'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={`text-sm sm:text-base font-bold leading-none ${
                        isSaturday
                          ? 'text-rose-600 dark:text-rose-400'
                          : isToday
                          ? 'text-primary'
                          : 'text-foreground'
                      }`}
                    >
                      {dayNum}
                    </span>

                    <span
                      className="text-[10px] text-muted-foreground font-medium select-none"
                      title={`${bsStr} BS / ${adStr} AD`}
                    >
                      {adLabel}
                    </span>
                  </div>

                  <div className="flex-1 space-y-1 mt-1 overflow-hidden">
                    {dayEvents.slice(0, 3).map((ev) => {
                      const colorClass = getCategoryBlockClass(ev.event_type, ev.is_holiday);
                      return (
                        <div
                          key={ev.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectEvent(ev);
                          }}
                          className={`${colorClass} px-1.5 py-0.5 rounded text-[11px] font-medium truncate flex items-center gap-1 shadow-2xs hover:opacity-90 cursor-pointer`}
                          title={`${ev.title} (${ev.event_type}${ev.is_holiday ? ' - School Closed' : ''})`}
                        >
                          {ev.is_holiday ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0 ring-1 ring-white" />
                          ) : (
                            <span className="w-1 h-1 rounded-full bg-current opacity-70 shrink-0" />
                          )}
                          <span className="truncate">{ev.title}</span>
                        </div>
                      );
                    })}

                    {dayEvents.length > 3 && (
                      <span className="text-[10px] text-muted-foreground font-semibold block px-1">
                        +{dayEvents.length - 3} more
                      </span>
                    )}
                  </div>

                  {isToday && (
                    <div className="mt-1">
                      <span className="text-[9px] px-1 py-0.2 rounded bg-primary text-primary-foreground font-semibold">
                        Today
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="border border-border rounded-xl bg-card p-4 shadow-xs space-y-3">
          <h4 className="text-sm font-bold text-foreground">
            Schedule for {currentMonthInfo.nameNp} ({currentMonthInfo.nameEn}) {viewYear} BS
          </h4>
          {monthEvents.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              No events scheduled in this Bikram Sambat month.
            </p>
          ) : (
            <div className="space-y-2">
              {monthEvents.map((ev) => {
                const colorClass = getCategoryBlockClass(ev.event_type, ev.is_holiday);
                return (
                  <div
                    key={ev.id}
                    onClick={() => onSelectEvent(ev)}
                    className="p-3 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors flex items-center justify-between gap-3 cursor-pointer shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-3 h-3 rounded-full shrink-0 ${
                          ev.is_holiday ? 'bg-rose-600' : 'bg-primary'
                        }`}
                      />
                      <div className="min-w-0">
                        <span className="text-sm font-semibold text-foreground block truncate">
                          {ev.title}
                        </span>
                        <span className="text-xs text-muted-foreground block truncate">
                          {formatDualDateRange(ev.start_date, ev.end_date, 'BS')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-semibold ${colorClass}`}
                      >
                        {ev.event_type}
                      </span>
                      {ev.is_holiday && (
                        <Badge variant="destructive" className="text-[10px] uppercase">
                          Closed
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
