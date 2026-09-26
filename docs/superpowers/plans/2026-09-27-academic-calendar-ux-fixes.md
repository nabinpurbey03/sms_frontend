# Academic Calendar Grid UX Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all UX issues in the dual BS/AD Academic Calendar Grid — grid position reset on calendar toggle, color inconsistency between views, NepaliDatePicker bugs, and various visual polish items.

**Architecture:** The root `AcademicCalendarGrid` wrapper selects between `<NepaliCalendarGrid>` (BS) and `<GregorianCalendarGridInner>` (AD). Each maintains its own independent state. The fix lifts shared state (current viewed date) into the wrapper so BS↔AD switching preserves position. Color utilities and legends are unified across both views.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, nepali-date-converter, react-big-calendar, dayjs, Zustand

**Spec:** User report: "grid doesn't start from (0,0) changing AD to BS or BS to AD. Color code doesn't work well with both calendars."

## Global Constraints

- No backend changes — frontend-only.
- All dates sent/received from API remain Gregorian `YYYY-MM-DD`.
- BS months are 0-indexed (0 = Baisakh, 11 = Chaitra) internally.
- Saturday (day index 6) is the weekly off in BS mode.
- Follow existing shadcn/ui patterns, Tailwind classes, file structure.
- Run `npx tsc --noEmit` and `npm run build` after each task to verify.

---

### Task 1: Lift Shared View-Date State into the `AcademicCalendarGrid` Wrapper

**Problem:** When user switches BS↔AD, each sub-grid mounts fresh with its own `useState` initializer, ignoring where the other grid was navigated to. The grid "jumps" to the `initialDate` (or today) instead of staying at the same calendar position.

**Files:**
- Modify: `src/features/school-settings/components/AcademicCalendarGrid.tsx:435-444`
- Modify: `src/features/school-settings/components/NepaliCalendarGrid.tsx:44-55`
- Modify: `src/features/school-settings/components/AcademicCalendarGrid.tsx:124-142` (GregorianCalendarGridInner)

**Interfaces:**
- Consumes: `useCalendarPreferenceStore().calendarSystem`, `AcademicCalendarGridProps.initialDate`
- Produces: New props `viewAdDate: Date` and `onViewAdDateChange: (d: Date) => void` passed to both sub-grids. Removes internal `useState(initialDate)` from each sub-grid.

- [ ] **Step 1: Add shared state to the wrapper component**

In `AcademicCalendarGrid.tsx`, update the wrapper at bottom of file (~line 435-444):

```tsx
export const AcademicCalendarGrid: React.FC<AcademicCalendarGridProps> = (props) => {
  const { calendarSystem } = useCalendarPreferenceStore();
  
  // Lift the viewed Gregorian date so switching BS↔AD preserves position
  const [viewAdDate, setViewAdDate] = useState<Date>(props.initialDate || new Date());
  
  // Sync to initialDate when academic session changes
  useEffect(() => {
    if (props.initialDate) {
      setViewAdDate(props.initialDate);
    }
  }, [props.initialDate]);

  if (calendarSystem === 'BS') {
    return (
      <NepaliCalendarGrid
        {...props}
        viewAdDate={viewAdDate}
        onViewAdDateChange={setViewAdDate}
      />
    );
  }

  return (
    <GregorianCalendarGridInner
      {...props}
      viewAdDate={viewAdDate}
      onViewAdDateChange={setViewAdDate}
    />
  );
};
```

Add `useState` and `useEffect` to the existing import at line 1 (already imported).

- [ ] **Step 2: Update `GregorianCalendarGridInner` to use the lifted date**

Change the component signature and remove internal `currentDate` / `useEffect(initialDate)`:

```tsx
interface GregorianCalendarGridInnerProps extends AcademicCalendarGridProps {
  viewAdDate: Date;
  onViewAdDateChange: (d: Date) => void;
}

const GregorianCalendarGridInner: React.FC<GregorianCalendarGridInnerProps> = ({
  events,
  canManage,
  onSelectDate,
  onSelectEvent,
  // initialDate — no longer used internally
  minDate,
  maxDate,
  academicYearName,
  viewAdDate,
  onViewAdDateChange,
}) => {
  const { calendarSystem } = useCalendarPreferenceStore();
  // Remove: const [currentDate, setCurrentDate] = useState<Date>(initialDate || new Date());
  // Remove: useEffect for initialDate sync
  const [currentView, setCurrentView] = useState<View>('month');
```

Replace every `currentDate` → `viewAdDate` and `setCurrentDate` → `onViewAdDateChange` inside the component (~4 references in `handleNavigate` and the `<Calendar>` JSX).

- [ ] **Step 3: Update `NepaliCalendarGrid` to use the lifted date**

Add the new props to the interface and initialise BS year/month from `viewAdDate` instead of `initialDate`:

```tsx
export interface NepaliCalendarGridProps {
  events: AcademicCalendarEvent[];
  canManage: boolean;
  onSelectDate: (adDateStr: string) => void;
  onSelectEvent: (event: AcademicCalendarEvent) => void;
  initialDate?: Date;
  minDate?: string;
  maxDate?: string;
  academicYearName?: string;
  viewAdDate?: Date;
  onViewAdDateChange?: (d: Date) => void;
}
```

Replace the `initialBs` memo to use `viewAdDate ?? initialDate`:

```tsx
const initialBs = useMemo(() => {
  const d = viewAdDate ?? initialDate ?? new Date();
  const info = getNepaliDateFromAd(d);
  return {
    year: info?.year ?? 2082,
    month: info?.month ?? 5,
  };
}, [viewAdDate, initialDate]);
```

In navigation handlers (`handlePrevMonth`, `handleNextMonth`, `handleToday`), after updating `viewYear`/`viewMonth`, also call `onViewAdDateChange` with the AD equivalent of BS month's first day:

```tsx
const handlePrevMonth = () => {
  if (!canPrev) return;
  const newMonth = viewMonth === 0 ? 11 : viewMonth - 1;
  const newYear = viewMonth === 0 ? viewYear - 1 : viewYear;
  setViewYear(newYear);
  setViewMonth(newMonth);
  // Sync AD date for cross-calendar position
  const adStr = bsToAd(`${newYear}-${pad(newMonth + 1)}-01`);
  if (adStr && onViewAdDateChange) {
    const [y, m, d] = adStr.split('-').map(Number);
    onViewAdDateChange(new Date(y, m - 1, d));
  }
};
```

Apply the same pattern to `handleNextMonth` and `handleToday`.

- [ ] **Step 4: Verify the fix**

Run: `npx tsc --noEmit && npm run build`
Expected: 0 errors.

Manual test scenario:
1. Open Academic Calendar in AD mode, navigate to e.g. March 2026.
2. Toggle to BS — grid should show the BS month that covers March 2026 (Chaitra 2082).
3. Navigate BS to Baisakh 2083, toggle back to AD — grid should show ~April 2026.

- [ ] **Step 5: Commit**

```bash
git add src/features/school-settings/components/AcademicCalendarGrid.tsx src/features/school-settings/components/NepaliCalendarGrid.tsx
git commit -m "fix: lift shared view-date so BS↔AD toggle preserves calendar position"
```

---

### Task 2: Unify Category Colors Across Both Calendar Grids

**Problem:** The AD grid uses `getCategoryBlockClass()` which returns Tailwind utility classes with `border-l-[4px]` and background tints. The BS grid also calls `getCategoryBlockClass()` for event pills, but the visual styles appear different between react-big-calendar's event blocks (AD) and the custom BS grid's pills because:
1. The AD grid's `eventPropGetter` adds extra classes (`border rounded-md shadow-2xs`) on top of the color class.
2. The BS grid's agenda view dot color is hardcoded (`bg-rose-600` or `bg-primary`) instead of using the category color.
3. The `OTHER` category uses `blue` in the calendar grid but `slate` in the list view's `getEventBadgeColor()`.

**Files:**
- Modify: `src/features/school-settings/components/AcademicCalendarGrid.tsx:34-49` (getCategoryBlockClass)
- Modify: `src/features/school-settings/components/NepaliCalendarGrid.tsx:443-456` (agenda view dot)
- Modify: `src/features/school-settings/components/AcademicCalendarView.tsx:130-145` (getEventBadgeColor)

**Interfaces:**
- Consumes: `getCategoryBlockClass()` from AcademicCalendarGrid.tsx
- Produces: New `getCategoryDotColor(type, isHoliday): string` export for agenda dot colors, aligned `OTHER` color across all three color functions.

- [ ] **Step 1: Add a `getCategoryDotColor` helper and align OTHER color**

In `AcademicCalendarGrid.tsx`, below `getCategoryBlockClass`, add:

```tsx
/** Returns a Tailwind bg class for the category indicator dot */
export const getCategoryDotColor = (type: CalendarEventType, isHoliday: boolean): string => {
  if (isHoliday || type === 'HOLIDAY') return 'bg-rose-600';
  switch (type) {
    case 'EXAM': return 'bg-purple-600';
    case 'VACATION': return 'bg-amber-600';
    case 'EVENT': return 'bg-emerald-600';
    case 'OTHER':
    default: return 'bg-blue-600';
  }
};
```

- [ ] **Step 2: Fix BS agenda view dot color**

In `NepaliCalendarGrid.tsx`, import `getCategoryDotColor` alongside `getCategoryBlockClass`:

```tsx
import { getCategoryBlockClass, getCategoryDotColor } from './AcademicCalendarGrid';
```

Replace the hardcoded dot (lines ~453-455):

```tsx
// Before:
<div className={`w-3 h-3 rounded-full shrink-0 ${ev.is_holiday ? 'bg-rose-600' : 'bg-primary'}`} />

// After:
<div className={`w-3 h-3 rounded-full shrink-0 ${getCategoryDotColor(ev.event_type, ev.is_holiday)}`} />
```

- [ ] **Step 3: Align `getEventBadgeColor` in AcademicCalendarView.tsx**

Change the `OTHER` case (line 143) from `bg-slate-500/10 text-slate-600 ...` to `bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900` to match the `blue` used everywhere else for OTHER.

```tsx
case 'OTHER':
default:
  return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900';
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm run build`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/school-settings/components/AcademicCalendarGrid.tsx src/features/school-settings/components/NepaliCalendarGrid.tsx src/features/school-settings/components/AcademicCalendarView.tsx
git commit -m "fix: unify category colors and dot indicators across BS/AD grids and list view"
```

---

### Task 3: Add Legend to the NepaliCalendarGrid (Parity with AD Grid)

**Problem:** The AD (Gregorian) grid has a color-coded category legend bar ("Categories: Holiday / Closed, Examinations, Vacations, Events, Other") and a management tip below the grid. The BS (Nepali) grid has no legend, so users can't decode event pill colors.

**Files:**
- Modify: `src/features/school-settings/components/NepaliCalendarGrid.tsx:178-180` (add legend before grid)

**Interfaces:**
- Consumes: `canManage` prop.
- Produces: Visual legend matching the AD grid's legend, rendered above the BS month grid.

- [ ] **Step 1: Add the legend section**

In `NepaliCalendarGrid.tsx`, insert the legend between the toolbar `<div>` (ends ~line 288) and the `{viewMode === 'month' ? (` block (~line 291):

```tsx
{/* Legend & Help Banner — matches Gregorian grid */}
<div className="flex flex-wrap items-center justify-between gap-3 px-1">
  <div className="flex flex-wrap items-center gap-3 text-xs">
    <span className="text-muted-foreground font-medium">Categories:</span>
    <div className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
      <span className="text-foreground font-medium">Holiday / Closed</span>
    </div>
    <div className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
      <span className="text-foreground font-medium">Examinations</span>
    </div>
    <div className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
      <span className="text-foreground font-medium">Vacations</span>
    </div>
    <div className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
      <span className="text-foreground font-medium">Events</span>
    </div>
    <div className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
      <span className="text-foreground font-medium">Other</span>
    </div>
  </div>

  {canManage && (
    <span className="text-xs text-muted-foreground italic">
      Tip: Click any calendar date within the session to schedule an event.
    </span>
  )}
</div>
```

- [ ] **Step 2: Remove unused `Badge` import**

`Badge` is imported at line 3 but used only in the agenda view. It's still used there (line 474), so keep it. However, if `Badge` was already removed in a previous commit, skip this step.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && npm run build`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/school-settings/components/NepaliCalendarGrid.tsx
git commit -m "feat: add category legend to NepaliCalendarGrid for visual parity with AD grid"
```

---

### Task 4: Fix the `viewMonthPad` Hoisting Bug in NepaliDatePicker

**Problem:** In `src/components/ui/nepali-date-picker.tsx`, the function `handleSelectBsDay` (line 123) calls `viewMonthPad(viewBsMonth)` at line 125, but `viewMonthPad` is defined at line 133 — after its usage. While JavaScript hoists `function` declarations, `const` arrow functions are NOT hoisted. This function is declared as `const viewMonthPad = (m: number) => m + 1;` — a `const` binding. In strict mode (and with React/TypeScript), this will throw a `ReferenceError` at runtime when `handleSelectBsDay` is called because `viewMonthPad` is not yet initialized at that point in execution.

Additionally, `viewMonthPad` is unnecessary indirection — it just adds 1. Replace with inline `viewBsMonth + 1`.

**Files:**
- Modify: `src/components/ui/nepali-date-picker.tsx:123-133`

**Interfaces:**
- Consumes: `viewBsYear`, `viewBsMonth` state
- Produces: Correctly formatted BS date string `YYYY-MM-DD` when selecting a day

- [ ] **Step 1: Inline `viewMonthPad` and remove the declaration**

In `nepali-date-picker.tsx`, replace `handleSelectBsDay` (lines 123-131):

```tsx
const handleSelectBsDay = (day: number) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  const bsDateStr = `${viewBsYear}-${pad(viewBsMonth + 1)}-${pad(day)}`;
  const adDateStr = bsToAd(bsDateStr);
  if (adDateStr) {
    onChange(adDateStr);
    setOpen(false);
  }
};
```

Remove line 133: `const viewMonthPad = (m: number) => m + 1;`

Also fix the grid cell rendering at line 336 which also uses `viewMonthPad`:

```tsx
// Before (line 336):
const currentBsStr = `${viewBsYear}-${pad(viewMonthPad(viewBsMonth))}-${pad(dayNum)}`;

// After:
const currentBsStr = `${viewBsYear}-${pad(viewBsMonth + 1)}-${pad(dayNum)}`;
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npm run build`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/nepali-date-picker.tsx
git commit -m "fix: remove viewMonthPad hoisting bug in NepaliDatePicker, inline month+1"
```

---

### Task 5: Improve NepaliDatePicker AD Mode — Show Mini Calendar Instead of Native Input

**Problem:** When the NepaliDatePicker is toggled to AD mode, it shows a raw `<input type="date">` (line 300-308) which looks inconsistent with the polished BS grid above it. The AD mode should show a proper calendar grid for visual consistency.

**Files:**
- Modify: `src/components/ui/nepali-date-picker.tsx:298-309`

**Interfaces:**
- Consumes: `value`, `onChange`, `minDate`, `maxDate` props
- Produces: AD month grid with the same visual style as the BS grid but using Gregorian day numbers

- [ ] **Step 1: Add AD state variables**

Add Gregorian view state alongside the existing BS state, after line 79:

```tsx
// Viewed AD year and month
const [viewAdYear, setViewAdYear] = useState<number>(() => {
  if (value) {
    const [y] = value.split('-').map(Number);
    return y || new Date().getFullYear();
  }
  return new Date().getFullYear();
});

const [viewAdMonth, setViewAdMonth] = useState<number>(() => {
  if (value) {
    const [, m] = value.split('-').map(Number);
    return m ? m - 1 : new Date().getMonth();
  }
  return new Date().getMonth();
});
```

Add AD sync effect alongside the existing BS sync (after line 90):

```tsx
useEffect(() => {
  if (value) {
    const [y, m] = value.split('-').map(Number);
    if (y && m) {
      setViewAdYear(y);
      setViewAdMonth(m - 1);
    }
  }
}, [value, open]);
```

- [ ] **Step 2: Replace the native date input with a Gregorian mini-grid**

Replace lines 298-309 (the `<input type="date">` block) with:

```tsx
) : (
  <div className="flex items-center justify-between gap-1">
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => {
        if (viewAdMonth === 0) {
          setViewAdYear((y) => y - 1);
          setViewAdMonth(11);
        } else {
          setViewAdMonth((m) => m - 1);
        }
      }}
      className="h-8 w-8 p-0 cursor-pointer"
    >
      <ChevronLeft className="w-4 h-4" />
    </Button>

    <div className="flex items-center gap-1.5 flex-1 justify-center">
      <select
        value={viewAdMonth}
        onChange={(e) => setViewAdMonth(Number(e.target.value))}
        className="rounded-md border border-input bg-background px-2 py-1 text-xs font-semibold shadow-xs cursor-pointer"
      >
        {Array.from({ length: 12 }, (_, i) => (
          <option key={i} value={i}>
            {new Date(2000, i).toLocaleDateString('en-US', { month: 'long' })}
          </option>
        ))}
      </select>

      <select
        value={viewAdYear}
        onChange={(e) => setViewAdYear(Number(e.target.value))}
        className="rounded-md border border-input bg-background px-2 py-1 text-xs font-semibold shadow-xs cursor-pointer"
      >
        {Array.from({ length: 21 }, (_, i) => 2015 + i).map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>

    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => {
        if (viewAdMonth === 11) {
          setViewAdYear((y) => y + 1);
          setViewAdMonth(0);
        } else {
          setViewAdMonth((m) => m + 1);
        }
      }}
      className="h-8 w-8 p-0 cursor-pointer"
    >
      <ChevronRight className="w-4 h-4" />
    </Button>
  </div>
)}
```

- [ ] **Step 3: Add the AD calendar grid below the BS grid**

After the `{calendarMode === 'BS' && ( ... )}` block (line 376), add:

```tsx
{calendarMode === 'AD' && (
  <div className="pt-2">
    <div className="grid grid-cols-7 gap-1 text-center mb-1">
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
        <span
          key={d}
          className={`text-[11px] font-semibold py-1 ${
            i === 0 ? 'text-destructive font-bold' : 'text-muted-foreground'
          }`}
        >
          {d}
        </span>
      ))}
    </div>

    <div className="grid grid-cols-7 gap-1">
      {(() => {
        const firstDay = new Date(viewAdYear, viewAdMonth, 1).getDay();
        const daysInAdMonth = new Date(viewAdYear, viewAdMonth + 1, 0).getDate();
        const pad = (n: number) => String(n).padStart(2, '0');
        const cells = [];

        for (let i = 0; i < firstDay; i++) {
          cells.push(<div key={`empty-${i}`} className="h-9 w-full" />);
        }

        for (let d = 1; d <= daysInAdMonth; d++) {
          const adStr = `${viewAdYear}-${pad(viewAdMonth + 1)}-${pad(d)}`;
          const isSelected = value === adStr;
          const isToday = adStr === todayAdStr;
          const isSunday = (firstDay + d - 1) % 7 === 0;
          const isBeforeMin = minDate ? adStr < minDate : false;
          const isAfterMax = maxDate ? adStr > maxDate : false;
          const isDisabled = isBeforeMin || isAfterMax;

          cells.push(
            <button
              key={d}
              type="button"
              disabled={isDisabled}
              onClick={() => {
                onChange(adStr);
                setOpen(false);
              }}
              className={`h-9 w-full rounded-md flex flex-col items-center justify-center text-xs transition-colors cursor-pointer relative ${
                isSelected
                  ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                  : isToday
                  ? 'border border-primary text-primary font-semibold hover:bg-muted'
                  : isSunday
                  ? 'text-destructive hover:bg-destructive/10'
                  : 'text-foreground hover:bg-muted'
              } ${isDisabled ? 'opacity-25 cursor-not-allowed hover:bg-transparent pointer-events-none' : ''}`}
            >
              <span>{d}</span>
              {isSelected && (
                <span className="absolute bottom-0.5 w-1 h-1 bg-primary-foreground rounded-full" />
              )}
            </button>
          );
        }

        return cells;
      })()}
    </div>
  </div>
)}
```

Note: Sunday is highlighted in AD mode (Nepal uses Sunday as the first day; Saturday is the weekend).

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm run build`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/nepali-date-picker.tsx
git commit -m "feat: replace raw date input in AD mode with proper calendar mini-grid"
```

---

### Task 6: Sync NepaliCalendarGrid `viewYear`/`viewMonth` When `viewAdDate` Changes

**Problem:** After Task 1, the wrapper passes `viewAdDate` to `NepaliCalendarGrid`, but if the user was in AD mode and navigated to a different month, then switched to BS, the `initialBs` memo will compute the correct initial values, but `viewYear`/`viewMonth` state will already be stale from the last BS session. This is because `useState` initial values only run on mount.

**Files:**
- Modify: `src/features/school-settings/components/NepaliCalendarGrid.tsx:44-55`

**Interfaces:**
- Consumes: `viewAdDate` prop
- Produces: Updated `viewYear`/`viewMonth` whenever `viewAdDate` changes

- [ ] **Step 1: Add a `useEffect` to sync BS state from `viewAdDate`**

After the `initialBs` memo and the `useState` lines (~line 55), add:

```tsx
// Sync BS view position when the AD date changes (e.g. from Gregorian grid navigation)
useEffect(() => {
  if (viewAdDate) {
    const info = getNepaliDateFromAd(viewAdDate);
    if (info) {
      setViewYear(info.year);
      setViewMonth(info.month);
    }
  }
}, [viewAdDate]);
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npm run build`
Expected: 0 errors.

Manual test: Navigate AD grid to December 2025, toggle to BS → should show Poush 2082 (not jump to initial date).

- [ ] **Step 3: Commit**

```bash
git add src/features/school-settings/components/NepaliCalendarGrid.tsx
git commit -m "fix: sync NepaliCalendarGrid viewYear/viewMonth from lifted viewAdDate"
```

---

### Task 7: Visual Polish — Saturday/Sunday Highlighting & Grid Cell Consistency

**Problem:** Several visual inconsistencies:
1. The AD grid (react-big-calendar) doesn't highlight Saturdays — it uses default Sunday-start week with no day-of-week styling.
2. The BS grid marks Saturday (col 6) as the off-day with rose color. AD grid has no equivalent visual.
3. `rbc-off-range-bg` cells (days outside the viewed month) look different from BS grid's out-of-session styling.
4. The AD grid's weekday headers show English-only ("SUN", "MON"...) while BS grid shows dual ("Sun (आइत)"). When in AD mode, there's no BS subtext.

**Files:**
- Modify: `src/features/school-settings/styles/calendar.css` (add Saturday column highlighting)
- Modify: `src/features/school-settings/components/AcademicCalendarGrid.tsx:54-100` (CustomDateHeader)

**Interfaces:**
- Consumes: `calendarSystem` from preference store
- Produces: Visual CSS class for Saturday column, dual-script weekday headers

- [ ] **Step 1: Add Saturday column highlight CSS**

In `calendar.css`, append:

```css
/* Highlight Saturday column (7th column) as weekly off */
.rbc-month-view .rbc-header:nth-child(7) {
  color: var(--color-rose-600, #e11d48) !important;
  background-color: rgba(225, 29, 72, 0.04) !important;
}

.rbc-month-view .rbc-day-bg:nth-child(7) {
  background-color: rgba(225, 29, 72, 0.02) !important;
}

.dark .rbc-month-view .rbc-day-bg:nth-child(7) {
  background-color: rgba(225, 29, 72, 0.04) !important;
}
```

- [ ] **Step 2: Add BS subtext to the AD grid's CustomDateHeader**

Currently `CustomDateHeader` already shows dual dates. No code change needed for the header — it already shows BS subtext when in AD mode (lines 70-75). Verify and skip if already correct.

- [ ] **Step 3: Verify**

Run: `npm run build`
Expected: 0 errors. Saturday columns should have a subtle rose tint.

- [ ] **Step 4: Commit**

```bash
git add src/features/school-settings/styles/calendar.css
git commit -m "style: highlight Saturday column in Gregorian calendar grid as weekly off"
```

---

### Task 8: Final Verification & Cleanup

**Files:**
- Read (verify): All modified files from Tasks 1-7.

- [ ] **Step 1: Run full build and lint check**

Run: `npx tsc --noEmit && npm run build`
Expected: 0 type errors, successful build.

- [ ] **Step 2: Run existing tests**

Run: `npx vitest run --reporter=verbose`
Expected: All existing tests pass.

- [ ] **Step 3: Check for unused imports**

Scan modified files for unused imports (e.g., `Badge`, `CalendarDays`, `Sparkles` if still lingering). Remove any.

- [ ] **Step 4: Commit any cleanup**

```bash
git add -A
git commit -m "chore: remove unused imports, final cleanup after calendar UX fixes"
```
