# User Calendar Preference (BS/AD) & Academic Year Bounded Calendar Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable all users to choose their preferred calendar system (Nepali Bikram Sambat / BS vs Gregorian / AD) across the application with dynamic switching, strictly enforce academic year boundaries (`start_date` to `end_date`) on the academic calendar grid and event dialogs, and render prominent event titles with distinct, vibrant colors for each event category.

**Architecture:**
- Create a persistent Zustand store `calendarPreferenceStore.ts` (`localStorage` key: `schools_up_calendar_system`) supporting `'BS' | 'AD'`.
- Mount accessible calendar switchers in the global desktop header, mobile slide-out drawer, user profile menu in `AppShell.tsx`, and an inline toggle on `AcademicCalendarView.tsx`.
- Enhance date formatting functions in `nepaliDate.ts` to respect user preference (`BS` primary vs `AD` primary).
- In `AcademicCalendarGrid.tsx`: Implement a custom calendar toolbar that enforces academic year boundaries (disabling "Previous" before session start month and "Next" after session end month, clamping navigation), and a dynamic `CustomDateHeader` that renders the primary day number in the user's preferred calendar system (BS or AD) with the alternate system in subtext.
- In `calendar.css`: Remove the transparent background override on `.rbc-event` and configure high-contrast, category-specific color tokens (Rose for Holidays, Purple for Exams, Amber for Vacations, Emerald for Events, Blue/Slate for Other) with solid accent borders and bold event names in `CustomEventComponent`.
- In `CalendarEventDialog.tsx` and `NepaliDatePicker.tsx`: Add `maxDate` support alongside `minDate` and enforce strict date selection bounds matching the active academic year.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Zustand with persist, react-big-calendar, nepali-date-converter, dayjs, Radix UI.

---

## Global Constraints

- **API & Payload Immutability**: All backend API payloads and model schemas continue to receive and transmit standard ISO Gregorian dates (`YYYY-MM-DD`). No backend modifications are made.
- **Accessibility & Touch Targets**: All interactive elements (calendar switchers, month chevrons, day cells) must adhere to WCAG 2.5.5 ($\ge 44\times 44\text{px}$ touch targets).
- **Strict Academic Year Scoping**: Calendar navigation and event creation must never extend before the active academic year's `start_date` or beyond its `end_date`.

---

## File Structure & Responsibilities

| File | Responsibility |
|---|---|
| `src/stores/calendarPreferenceStore.ts` | [NEW] Persistent Zustand store managing user's calendar system preference (`'BS'` or `'AD'`). |
| `src/features/school-settings/utils/nepaliDate.ts` | [MODIFY] Extend `formatDualDate` and `formatDualDateRange` to support preference-driven ordering (`BS` first vs `AD` first). |
| `src/components/layout/AppShell.tsx` | [MODIFY] Add global calendar system switcher (`AD / BS`) in top desktop header, mobile drawer, and user profile menu. |
| `src/features/school-settings/styles/calendar.css` | [MODIFY] Fix `.rbc-event` background and border overrides, improve event block padding, contrast, and font styling. |
| `src/features/school-settings/components/AcademicCalendarGrid.tsx` | [MODIFY] Implement bounded custom toolbar (disable prev/next outside academic year), preference-aware `dateHeader`, vibrant category colors, and bold event titles. |
| `src/features/school-settings/components/NepaliDatePicker.tsx` | [MODIFY] Add `maxDate` support, enforce `[minDate, maxDate]` bounds on day selection, and initialize default mode from calendar preference store. |
| `src/features/school-settings/components/CalendarEventDialog.tsx` | [MODIFY] Pass `minDate` and `maxDate` from active academic year into `NepaliDatePicker` instances and validate date range bounds. |
| `src/features/school-settings/components/AcademicCalendarView.tsx` | [MODIFY] Pass academic year boundaries to grid and dialog, format list cards using user preference, and provide inline calendar system toggle. |

---

## Tasks

### Task 1: Persistent Calendar Preference Store & Utilities

**Files:**
- Create: `src/stores/calendarPreferenceStore.ts`
- Modify: `src/features/school-settings/utils/nepaliDate.ts`

**Interfaces:**
- Produces: `useCalendarPreferenceStore: { calendarSystem: 'BS' | 'AD', setCalendarSystem: (s) => void, toggleCalendarSystem: () => void }`
- Produces: `formatDualDate(adDateStr: string, primary?: 'BS' | 'AD'): string`
- Produces: `formatDualDateRange(startAd: string, endAd: string, primary?: 'BS' | 'AD'): string`

- [ ] **Step 1: Create `src/stores/calendarPreferenceStore.ts`**

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CalendarSystem = 'BS' | 'AD';

interface CalendarPreferenceState {
  calendarSystem: CalendarSystem;
  setCalendarSystem: (calendarSystem: CalendarSystem) => void;
  toggleCalendarSystem: () => void;
}

export const useCalendarPreferenceStore = create<CalendarPreferenceState>()(
  persist(
    (set, get) => ({
      calendarSystem: 'BS', // default to BS
      setCalendarSystem: (calendarSystem: CalendarSystem) => set({ calendarSystem }),
      toggleCalendarSystem: () => {
        const next = get().calendarSystem === 'BS' ? 'AD' : 'BS';
        set({ calendarSystem: next });
      },
    }),
    {
      name: 'schools_up_calendar_system',
    }
  )
);
```

- [ ] **Step 2: Update `src/features/school-settings/utils/nepaliDate.ts`**

Update `formatDualDate` and `formatDualDateRange` to support `primary: 'BS' | 'AD' = 'BS'`:
- When `primary === 'BS'`: `Ashwin 15, 2082 (Oct 1, 2025)`
- When `primary === 'AD'`: `Oct 1, 2025 (Ashwin 15, 2082 BS)`

- [ ] **Step 3: Verify with node test script**

Run: `node -e "const { formatDualDate } = await import('./src/features/school-settings/utils/nepaliDate.ts'); console.log(formatDualDate('2025-10-01', 'BS')); console.log(formatDualDate('2025-10-01', 'AD'));"`

- [ ] **Step 4: Commit**

```bash
git add src/stores/calendarPreferenceStore.ts src/features/school-settings/utils/nepaliDate.ts
git commit -m "feat(calendar): add persistent calendar preference store and preference-aware date formatters"
```

---

### Task 2: Global Calendar System Switchers in Layout

**Files:**
- Modify: `src/components/layout/AppShell.tsx`

**Interfaces:**
- Consumes: `useCalendarPreferenceStore`

- [ ] **Step 1: Add Calendar Switcher to Desktop Header**

In `AppShell.tsx`, insert a calendar system toggle button adjacent to the Theme Toggle button in the top right header:
```tsx
{/* Calendar System Switcher (AD / BS) */}
<Tooltip>
  <TooltipTrigger asChild>
    <Button
      variant="outline"
      size="sm"
      onClick={toggleCalendarSystem}
      className="h-8 px-2.5 rounded-full text-xs font-semibold gap-1.5 border-border hover:bg-accent cursor-pointer transition-colors"
      aria-label="Toggle Calendar System (AD / BS)"
    >
      <CalendarDays className="h-3.5 w-3.5 text-primary" />
      <span className="font-mono text-[11px] font-bold">
        {calendarSystem}
      </span>
    </Button>
  </TooltipTrigger>
  <TooltipContent side="bottom" className="text-xs">
    Active Calendar: {calendarSystem === 'BS' ? 'Nepali (BS)' : 'Gregorian (AD)'}. Click to switch.
  </TooltipContent>
</Tooltip>
```

- [ ] **Step 2: Add Calendar System Option to Mobile Drawer & User Menu**

In the mobile drawer under session information, add quick toggle buttons for `Nepali (BS)` and `Gregorian (AD)`.
In the user profile dropdown, display the current calendar system and allow switching.

- [ ] **Step 3: Verify TypeScript compilation & linting**

Run: `npm run build && npm run lint`

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/AppShell.tsx
git commit -m "feat(layout): integrate global AD/BS calendar system switcher in header and mobile drawer"
```

---

### Task 3: Bounded DatePicker with `maxDate` & User Preference Default

**Files:**
- Modify: `src/features/school-settings/components/NepaliDatePicker.tsx`
- Modify: `src/features/school-settings/components/CalendarEventDialog.tsx`

**Interfaces:**
- `NepaliDatePickerProps`: add `maxDate?: string`
- `CalendarEventDialogProps`: add `minDate?: string`, `maxDate?: string`

- [ ] **Step 1: Update `NepaliDatePicker.tsx`**

1. Add `maxDate?: string` to `NepaliDatePickerProps`.
2. Initialize `calendarMode` with `calendarSystem` from `useCalendarPreferenceStore()`.
3. In BS day rendering:
   ```typescript
   const isBeforeMin = minDate ? currentAdStr < minDate : false;
   const isAfterMax = maxDate ? currentAdStr > maxDate : false;
   const isDisabledDate = isBeforeMin || isAfterMax;
   ```
   Disable the button when `isDisabledDate` is true.
4. In AD mode:
   Pass `min={minDate}` and `max={maxDate}` to `<input type="date" />`.
5. In month navigation:
   Disable `handlePrevMonth` if the entire previous BS month is before `minDate`.
   Disable `handleNextMonth` if the entire next BS month is after `maxDate`.

- [ ] **Step 2: Update `CalendarEventDialog.tsx`**

1. Accept `minDate?: string` and `maxDate?: string` in `CalendarEventDialogProps`.
2. Pass `minDate` and `maxDate` into both Start Date and End Date `<NepaliDatePicker />` instances.
3. Validate in `onSubmit` that `start_date` and `end_date` fall within `[minDate, maxDate]`.

- [ ] **Step 3: Verify compilation**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/features/school-settings/components/NepaliDatePicker.tsx src/features/school-settings/components/CalendarEventDialog.tsx
git commit -m "feat(school-settings): add maxDate constraints and preference defaulting to NepaliDatePicker"
```

---

### Task 4: Academic Calendar Grid: Year Bounds, Color Badges & Visible Event Titles

**Files:**
- Modify: `src/features/school-settings/styles/calendar.css`
- Modify: `src/features/school-settings/components/AcademicCalendarGrid.tsx`

**Interfaces:**
- `AcademicCalendarGridProps`:
  - `minDate?: string` (academic year `start_date`)
  - `maxDate?: string` (academic year `end_date`)
  - `academicYearName?: string`

- [ ] **Step 1: Fix `calendar.css` Event Overrides and Styles**

Remove `background: transparent !important; border: none !important;` from `.rbc-event`.
Configure styling:
```css
/* Event Blocks */
.rbc-event {
  padding: 0 !important;
  margin: 1.5px 2px !important;
  border-radius: 6px !important;
  outline: none !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06) !important;
}

.rbc-event-content {
  font-size: 0.75rem !important;
  line-height: 1.25 !important;
  padding: 2px 4px !important;
  font-weight: 600 !important;
}
```

- [ ] **Step 2: Enhance Category Color Block Classes in `AcademicCalendarGrid.tsx`**

Define vivid, distinct colors with strong contrast and accent left borders:
- **HOLIDAY / School Closed**: `bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/80 dark:text-rose-100 dark:border-rose-800 border-l-[4px] border-l-rose-600`
- **EXAM (Examinations)**: `bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/80 dark:text-purple-100 dark:border-purple-800 border-l-[4px] border-l-purple-600`
- **VACATION**: `bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-100 dark:border-amber-800 border-l-[4px] border-l-amber-600`
- **EVENT**: `bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-100 dark:border-emerald-800 border-l-[4px] border-l-emerald-600`
- **OTHER**: `bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/80 dark:text-blue-100 dark:border-blue-800 border-l-[4px] border-l-blue-600`

- [ ] **Step 3: Update `CustomEventComponent` to Clearly Display Event Title**

```tsx
const CustomEventComponent: React.FC<{ event: CalendarItem }> = ({ event }) => {
  const ev = event.resource;
  return (
    <div
      className="flex items-center gap-1.5 w-full min-w-0 py-0.5 px-1 leading-tight"
      title={`${ev.title} (${ev.event_type}${ev.is_holiday ? ' - School Closed' : ''})`}
    >
      {ev.is_holiday ? (
        <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0 ring-1 ring-white dark:ring-black" />
      ) : (
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 shrink-0" />
      )}
      <span className="truncate font-semibold text-[11px] sm:text-xs tracking-tight">
        {ev.title}
      </span>
    </div>
  );
};
```

- [ ] **Step 4: Implement Custom Bounded Toolbar in `AcademicCalendarGrid.tsx`**

Create `CustomToolbar`:
- Read `calendarSystem` from `useCalendarPreferenceStore()`.
- Calculate if current month is at or before `minDate` $\rightarrow$ disable "Previous" button.
- Calculate if current month is at or after `maxDate` $\rightarrow$ disable "Next" button.
- Toolbar title displays current month/year according to `calendarSystem`:
  - If `BS`: Nepali Month Name & BS Year (e.g. `Ashwin 2082 BS (Oct 2025)`)
  - If `AD`: Gregorian Month Name & Year (e.g. `October 2025 (Ashwin 2082 BS)`)
- Show Academic Session boundary pill: `Session: {minDate} to {maxDate}`.

- [ ] **Step 5: Dynamic `CustomDateHeader` Based on Calendar System**

- If `calendarSystem === 'BS'`:
  - Primary number: BS day number (`15`)
  - Secondary subtext: Gregorian date (`Oct 1`)
- If `calendarSystem === 'AD'`:
  - Primary number: Gregorian day number (`1`)
  - Secondary subtext: BS date (`Ash 15`)
- If cell date is outside `[minDate, maxDate]`: dim visually (`opacity-35 select-none`).

- [ ] **Step 6: Guard `onSelectSlot`**

If user clicks a date outside `[minDate, maxDate]`, do not open dialog and display toast: `"Selected date is outside the active academic year"`.

- [ ] **Step 7: Commit**

```bash
git add src/features/school-settings/styles/calendar.css src/features/school-settings/components/AcademicCalendarGrid.tsx
git commit -m "feat(school-settings): enforce academic year bounds, distinct category colors, and visible event names in grid"
```

---

### Task 5: Academic Calendar View Integration & Verification

**Files:**
- Modify: `src/features/school-settings/components/AcademicCalendarView.tsx`

**Interfaces:**
- Connects `useCalendarPreferenceStore`, `AcademicCalendarGrid`, and `CalendarEventDialog`.

- [ ] **Step 1: Wire Academic Year Bounds & Preference to View**

In `AcademicCalendarView.tsx`:
1. Read `calendarSystem` and `setCalendarSystem` from `useCalendarPreferenceStore`.
2. Add inline calendar switch pill `[ BS | AD ]` next to the `List / Month Grid` switcher.
3. Pass `minDate={activeYear?.start_date}` and `maxDate={activeYear?.end_date}` to `AcademicCalendarGrid`.
4. Pass `minDate={activeYear?.start_date}` and `maxDate={activeYear?.end_date}` to `CalendarEventDialog`.
5. In List View cards, use `formatDualDateRange(event.start_date, event.end_date, calendarSystem)` so that the user's preferred calendar is highlighted first.

- [ ] **Step 2: Run Automated Tests & Build**

Run:
1. `uv run pytest tests/` in `backend` (ensure 93/93 pass).
2. `npm run lint` in `frontend` (0 errors).
3. `npm run build` in `frontend` (clean compilation).

- [ ] **Step 3: Commit**

```bash
git add src/features/school-settings/components/AcademicCalendarView.tsx
git commit -m "feat(school-settings): connect academic year bounds and calendar preference to academic calendar view"
```

---

## Verification Plan

### Automated Tests
1. **Backend API Stability**:
   ```bash
   cd E:\SSUP\backend
   uv run pytest tests/
   ```
   *Expected:* 93 passed.
2. **Frontend Linter**:
   ```bash
   cd E:\SSUP\frontend
   npm run lint
   ```
   *Expected:* 0 errors.
3. **Frontend Production Build**:
   ```bash
   cd E:\SSUP\frontend
   npm run build
   ```
   *Expected:* Clean compilation with zero TypeScript errors.

### Manual Verification
1. **Calendar Preference Switcher**:
   - Click the `AD | BS` toggle in the top header.
   - Verify that:
     - The Month Grid view flips the primary header numbers (showing BS day numbers as primary when BS is selected, and AD numbers when AD is selected).
     - The Month Grid toolbar title displays Nepali month/year prominently when in BS mode.
     - Event list view cards display the preferred date format first.
     - Reload the browser and confirm the preference is preserved via `localStorage`.
2. **Academic Year Bounds**:
   - Select an academic year (e.g. 2025-04-14 to 2026-04-13).
   - In Month Grid view, verify that:
     - Navigating backwards before April 2025 is disabled.
     - Navigating forward past April 2026 is disabled.
     - Clicking on dates outside the session bounds displays a warning and blocks event creation.
   - In "Add Calendar Event" modal, verify:
     - Date pickers do not allow choosing dates before the session start or after the session end.
3. **Event Color & Title Visibility**:
   - Create events for each category (`HOLIDAY`, `EXAM`, `VACATION`, `EVENT`, `OTHER`).
   - Verify each category displays its distinct vibrant color and left accent bar.
   - Verify event titles are boldly visible in both light and dark mode.
