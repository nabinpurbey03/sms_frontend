# Nepali (BS) Date Support and Visual Calendar Month Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the Academic Calendar & Holiday Planner in the School Settings Hub by adding Nepali (Bikram Sambat / BS) date picker support with dual-calendar display (BS/AD), category-aware holiday defaults, dual-calendar date badges in list view, and a visual Month Grid view powered by `react-big-calendar` with overlaid Nepali dates and interactive slot/event editing.

**Architecture:**
- **Nepali Date Foundation**: Lightweight, timezone-safe date conversion module (`nepaliDate.ts`) wrapping `nepali-date-converter` for bidirectional conversion (AD $\leftrightarrow$ BS), month day length calculations, and dual-calendar range formatting (e.g. *"Ashwin 15–19, 2082 (Oct 1–5, 2025)"*).
- **Accessible Nepali DatePicker (`NepaliDatePicker.tsx`)**: Reusable, accessible popover calendar picker built with Tailwind CSS v4 and shadcn/ui design tokens. Supports BS month/year navigation, quick AD/BS toggle, today shortcut, and dual-calendar display pill. Emits ISO Gregorian `YYYY-MM-DD` strings for transparent integration with React Hook Form and backend payloads without API changes.
- **Visual Month Grid View (`AcademicCalendarGrid.tsx`)**: Full-featured calendar grid using `react-big-calendar` with `dayjsLocalizer`. Implements custom date headers showing Gregorian day numbers alongside Nepali month/day subtext (e.g. *"Asw 15"*), unified category color palettes, slot click handlers to create events with pre-filled dates, and event click handlers to edit existing items.
- **List / Calendar Toggle & Category Consistency**: Harmonized category badges and event blocks across both views in `AcademicCalendarView.tsx`, with a view mode switcher and category-aware defaulting for `is_holiday` (ON for Holiday/Vacation, OFF for Exam/Event/Other, always overridable).

**Tech Stack:**
- React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Radix UI primitives, Lucide React
- `nepali-date-converter` (v3.4.0) for astronomical BS $\leftrightarrow$ AD transformations
- `react-big-calendar` (v1.20.0) + `dayjs` (v1.11.23) for month grid rendering
- React Hook Form + Zod for type-safe form validation

**Spec:** User specification to add Nepali (BS) date support to the event form with dual calendar visibility, implement a visual month grid view with overlaid BS dates using `react-big-calendar`, default "School Closed" checkbox based on category, and display both calendars and matching badges on each row in list view.

## Global Constraints
- Backend endpoints and payload schemas (`CalendarEventCreateDTO`, `CalendarEventUpdateDTO`) remain strictly untouched — frontend sends and receives ISO Gregorian dates (`YYYY-MM-DD`).
- All interactive controls (date picker buttons, day cells, month toggles, view switchers) must maintain WCAG 2.5.5 minimum touch targets ($\ge 44\times 44\text{px}$).
- Dark and light theme modes must be fully supported with high-contrast text and border tokens.
- Academic session filtering must be respected across both list and calendar grid views.

---

### Task 1: Nepali Date Utilities (`nepaliDate.ts`)

**Files:**
- Create: `frontend/src/features/school-settings/utils/nepaliDate.ts`
- Test: `frontend/scratch/test_nepali_date.js`

**Interfaces:**
- Consumes: `nepali-date-converter`
- Produces:
  - `adToBs(adDateStr: string): string` (formats `YYYY-MM-DD` BS)
  - `bsToAd(bsDateStr: string): string` (formats `YYYY-MM-DD` AD)
  - `formatDualDate(adDateStr: string): string` (e.g. `"Ashwin 15, 2082 (Oct 1, 2025)"`)
  - `formatDualDateRange(startAdStr: string, endAdStr: string): string`
  - `getNepaliMonths(): { index: number; nameEn: string; nameNp: string }[]`
  - `getBsDaysInMonth(year: number, monthIndex: number): number`
  - `getBsMonthStartDayOfWeek(year: number, monthIndex: number): number`

- [ ] **Step 1: Create the verification test script**

Create `frontend/scratch/test_nepali_date.js` to verify expected conversions:
```javascript
import NepaliDate from 'nepali-date-converter';

function pad(n) {
  return String(n).padStart(2, '0');
}

function adToBs(adStr) {
  const [y, m, d] = adStr.split('-').map(Number);
  const bs = new NepaliDate(new Date(y, m - 1, d));
  return `${bs.getYear()}-${pad(bs.getMonth() + 1)}-${pad(bs.getDate())}`;
}

function bsToAd(bsStr) {
  const [y, m, d] = bsStr.split('-').map(Number);
  const np = new NepaliDate(y, m - 1, d);
  const ad = np.toJsDate();
  return `${ad.getFullYear()}-${pad(ad.getMonth() + 1)}-${pad(ad.getDate())}`;
}

console.log('Testing AD -> BS conversion:');
const bs = adToBs('2025-10-01');
console.log('2025-10-01 =>', bs);
if (bs !== '2082-06-15') throw new Error(`Expected 2082-06-15, got ${bs}`);

console.log('Testing BS -> AD conversion:');
const ad = bsToAd('2082-06-15');
console.log('2082-06-15 =>', ad);
if (ad !== '2025-10-01') throw new Error(`Expected 2025-10-01, got ${ad}`);

console.log('All date conversions passed successfully!');
```

- [ ] **Step 2: Run test script to verify core converter functionality**

Run: `node frontend/scratch/test_nepali_date.js`
Expected: `All date conversions passed successfully!`

- [ ] **Step 3: Implement `frontend/src/features/school-settings/utils/nepaliDate.ts`**

```typescript
import NepaliDate from 'nepali-date-converter';

export interface NepaliMonthOption {
  index: number; // 0 to 11
  nameEn: string;
  nameNp: string;
}

export const NEPALI_MONTHS: NepaliMonthOption[] = [
  { index: 0, nameEn: 'Baisakh', nameNp: 'वैशाख' },
  { index: 1, nameEn: 'Jestha', nameNp: 'जेठ' },
  { index: 2, nameEn: 'Asar', nameNp: 'असार' },
  { index: 3, nameEn: 'Shrawan', nameNp: 'साउन' },
  { index: 4, nameEn: 'Bhadra', nameNp: 'भदौ' },
  { index: 5, nameEn: 'Ashwin', nameNp: 'असोज' },
  { index: 6, nameEn: 'Kartik', nameNp: 'कात्तिक' },
  { index: 7, nameEn: 'Mangsir', nameNp: 'मंसिर' },
  { index: 8, nameEn: 'Poush', nameNp: 'पुस' },
  { index: 9, nameEn: 'Magh', nameNp: 'माघ' },
  { index: 10, nameEn: 'Falgun', nameNp: 'फागुन' },
  { index: 11, nameEn: 'Chaitra', nameNp: 'चैत' },
];

export const NEPALI_DAYS_OF_WEEK = [
  { index: 0, short: 'Sun', nepaliShort: 'आइत' },
  { index: 1, short: 'Mon', nepaliShort: 'सोम' },
  { index: 2, short: 'Tue', nepaliShort: 'मङ्गल' },
  { index: 3, short: 'Wed', nepaliShort: 'बुध' },
  { index: 4, short: 'Thu', nepaliShort: 'बिही' },
  { index: 5, short: 'Fri', nepaliShort: 'शुक्र' },
  { index: 6, short: 'Sat', nepaliShort: 'शनि' },
];

const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * Converts Gregorian YYYY-MM-DD string to Bikram Sambat YYYY-MM-DD string
 */
export function adToBs(adDateStr: string): string {
  try {
    const [y, m, d] = adDateStr.split('-').map(Number);
    if (!y || !m || !d) return '';
    const bs = new NepaliDate(new Date(y, m - 1, d));
    return `${bs.getYear()}-${pad(bs.getMonth() + 1)}-${pad(bs.getDate())}`;
  } catch {
    return '';
  }
}

/**
 * Converts Bikram Sambat YYYY-MM-DD string to Gregorian YYYY-MM-DD string
 */
export function bsToAd(bsDateStr: string): string {
  try {
    const [y, m, d] = bsDateStr.split('-').map(Number);
    if (!y || !m || !d) return '';
    const np = new NepaliDate(y, m - 1, d);
    const ad = np.toJsDate();
    return `${ad.getFullYear()}-${pad(ad.getMonth() + 1)}-${pad(ad.getDate())}`;
  } catch {
    return '';
  }
}

/**
 * Get NepaliDate instance from Gregorian YYYY-MM-DD or Date
 */
export function getNepaliDateFromAd(adDate: string | Date): NepaliDate | null {
  try {
    if (typeof adDate === 'string') {
      const [y, m, d] = adDate.split('-').map(Number);
      return new NepaliDate(new Date(y, m - 1, d));
    }
    return new NepaliDate(adDate);
  } catch {
    return null;
  }
}

/**
 * Returns number of days in a given BS month
 */
export function getBsDaysInMonth(year: number, monthIndex: number): number {
  try {
    // nepali-date-converter provides days count by probing month boundaries
    for (let day = 32; day >= 29; day--) {
      try {
        const test = new NepaliDate(year, monthIndex, day);
        if (test.getMonth() === monthIndex) {
          return day;
        }
      } catch {
        continue;
      }
    }
    return 30;
  } catch {
    return 30;
  }
}

/**
 * Returns day of week (0=Sunday ... 6=Saturday) for the 1st of a BS month
 */
export function getBsMonthStartDayOfWeek(year: number, monthIndex: number): number {
  try {
    const firstDay = new NepaliDate(year, monthIndex, 1);
    return firstDay.getDay();
  } catch {
    return 0;
  }
}

/**
 * Formats a Gregorian date into formatted English and Nepali strings
 * e.g. "Ashwin 15, 2082 (Oct 1, 2025)"
 */
export function formatDualDate(adDateStr: string): string {
  if (!adDateStr) return '';
  try {
    const [y, m, d] = adDateStr.split('-').map(Number);
    const adDate = new Date(y, m - 1, d);
    const npDate = new NepaliDate(adDate);

    const monthName = NEPALI_MONTHS[npDate.getMonth()]?.nameEn || 'Ashwin';
    const bsFormatted = `${monthName} ${npDate.getDate()}, ${npDate.getYear()}`;
    const adFormatted = adDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return `${bsFormatted} (${adFormatted})`;
  } catch {
    return adDateStr;
  }
}

/**
 * Formats a date range into dual calendar display
 * e.g. "Ashwin 15–19, 2082 (Oct 1–5, 2025)"
 */
export function formatDualDateRange(startAdStr: string, endAdStr: string): string {
  if (!startAdStr) return '';
  if (!endAdStr || startAdStr === endAdStr) {
    return formatDualDate(startAdStr);
  }

  try {
    const [sy, sm, sd] = startAdStr.split('-').map(Number);
    const [ey, em, ed] = endAdStr.split('-').map(Number);
    const startDate = new Date(sy, sm - 1, sd);
    const endDate = new Date(ey, em - 1, ed);

    const startNp = new NepaliDate(startDate);
    const endNp = new NepaliDate(endDate);

    const startMonth = NEPALI_MONTHS[startNp.getMonth()]?.nameEn || '';
    const endMonth = NEPALI_MONTHS[endNp.getMonth()]?.nameEn || '';

    let bsText = '';
    if (startNp.getYear() === endNp.getYear()) {
      if (startNp.getMonth() === endNp.getMonth()) {
        bsText = `${startMonth} ${startNp.getDate()}–${endNp.getDate()}, ${startNp.getYear()}`;
      } else {
        bsText = `${startMonth} ${startNp.getDate()} – ${endMonth} ${endNp.getDate()}, ${startNp.getYear()}`;
      }
    } else {
      bsText = `${startMonth} ${startNp.getDate()}, ${startNp.getYear()} – ${endMonth} ${endNp.getDate()}, ${endNp.getYear()}`;
    }

    let adText = '';
    const startAdMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
    const endAdMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
    if (sy === ey) {
      if (sm === em) {
        adText = `${startAdMonth} ${sd}–${ed}, ${sy}`;
      } else {
        adText = `${startAdMonth} ${sd} – ${endAdMonth} ${ed}, ${sy}`;
      }
    } else {
      adText = `${startAdMonth} ${sd}, ${sy} – ${endAdMonth} ${ed}, ${ey}`;
    }

    return `${bsText} (${adText})`;
  } catch {
    return `${startAdStr} to ${endAdStr}`;
  }
}
```

- [ ] **Step 4: Verify typecheck passes**

Run: `npm run build` in `frontend/`
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add src/features/school-settings/utils/nepaliDate.ts
git commit -m "feat(school-settings): add Nepali date conversion and dual calendar formatting utilities"
```

---

### Task 2: Accessible Nepali DatePicker Component (`NepaliDatePicker.tsx`)

**Files:**
- Create: `frontend/src/features/school-settings/components/NepaliDatePicker.tsx`

**Interfaces:**
- Consumes:
  - `adToBs`, `bsToAd`, `getNepaliDateFromAd`, `getBsDaysInMonth`, `getBsMonthStartDayOfWeek`, `NEPALI_MONTHS`, `NEPALI_DAYS_OF_WEEK` from `../utils/nepaliDate`
  - Radix/shadcn UI button, input, label, badge, popover
- Produces: `NepaliDatePicker` React component
  ```typescript
  interface NepaliDatePickerProps {
    id?: string;
    label?: string;
    value: string; // ISO YYYY-MM-DD Gregorian
    onChange: (adDateStr: string) => void;
    minDate?: string; // ISO YYYY-MM-DD Gregorian
    error?: string;
    disabled?: boolean;
  }
  ```

- [ ] **Step 1: Implement `NepaliDatePicker.tsx`**

Features to include:
- Native click trigger opening popover modal
- View mode switcher inside picker: "Nepali (BS)" vs "English (AD)"
- Month dropdown (Baisakh to Chaitra) + Year dropdown (2070 to 2090 BS)
- Navigation chevrons (`ChevronLeft`, `ChevronRight`)
- 7-column calendar grid with weekday labels (Sun to Sat)
- Selection indicator and today indicator
- Live preview showing: `Ashwin 15, 2082 (BS) • Oct 1, 2025 (AD)`
- Accessible touch targets $\ge 44\times 44\text{px}$

- [ ] **Step 2: Build verification**

Run: `npm run build` in `frontend/`
Expected: Clean build with 0 TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add src/features/school-settings/components/NepaliDatePicker.tsx
git commit -m "feat(school-settings): implement accessible Nepali (BS) date picker with dual-calendar preview"
```

---

### Task 3: Category-Aware Holiday Default & Nepali DatePicker Integration in `CalendarEventDialog.tsx`

**Files:**
- Modify: `frontend/src/features/school-settings/components/CalendarEventDialog.tsx`

**Interfaces:**
- Consumes: `NepaliDatePicker`
- Updates:
  - Replaces native `<Input type="date" />` with `<NepaliDatePicker />` for `start_date` and `end_date` via React Hook Form `Controller`.
  - When `event_type` is changed or initialized:
    - `HOLIDAY` or `VACATION` $\to$ `is_holiday: true`
    - `EXAM`, `EVENT`, or `OTHER` $\to$ `is_holiday: false`
    - Checkbox remains completely overridable manually.
  - Adds optional `initialDate?: string` prop to pre-fill start/end dates when clicked from the Calendar Grid.

- [ ] **Step 1: Update `CalendarEventDialog.tsx` props and imports**

Add `initialDate?: string` to `CalendarEventDialogProps`:
```typescript
interface CalendarEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  academicYearId: string;
  eventToEdit?: AcademicCalendarEvent | null;
  initialDate?: string; // Pre-filled Gregorian date (YYYY-MM-DD) from grid click
}
```

- [ ] **Step 2: Update category-aware default logic**

```typescript
const handleTypeChange = (type: (typeof CALENDAR_EVENT_TYPES)[number]) => {
  setValue('event_type', type);
  if (type === 'HOLIDAY' || type === 'VACATION') {
    setValue('is_holiday', true);
  } else {
    setValue('is_holiday', false);
  }
};
```

- [ ] **Step 3: Replace start_date and end_date with `<NepaliDatePicker />`**

Wire using `<Controller>` with dual preview and validation error display.

- [ ] **Step 4: Verify build and lint**

Run: `npm run build && npm run lint` in `frontend/`
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add src/features/school-settings/components/CalendarEventDialog.tsx
git commit -m "feat(school-settings): integrate Nepali datepicker and category-aware holiday defaults in event modal"
```

---

### Task 4: Visual Month Grid Component with Overlaid BS Dates (`AcademicCalendarGrid.tsx`)

**Files:**
- Create: `frontend/src/features/school-settings/styles/calendar.css`
- Create: `frontend/src/features/school-settings/components/AcademicCalendarGrid.tsx`

**Interfaces:**
- Consumes: `react-big-calendar`, `dayjs`, `nepaliDate.ts`, `AcademicCalendarEvent`
- Produces: `AcademicCalendarGrid` component
  ```typescript
  interface AcademicCalendarGridProps {
    events: AcademicCalendarEvent[];
    academicYear?: AcademicYear;
    canManage: boolean;
    onSelectDate: (adDateStr: string) => void;
    onSelectEvent: (event: AcademicCalendarEvent) => void;
  }
  ```

- [ ] **Step 1: Create `src/features/school-settings/styles/calendar.css`**

Import base `react-big-calendar/lib/css/react-big-calendar.css` and add custom CSS variables and overrides for shadcn/ui and dark mode:
- Border colors aligned with `--border`
- Header background and text aligned with `--card` / `--foreground`
- Rounded event pills with appropriate category badges
- Hover states on calendar day cells

- [ ] **Step 2: Implement `AcademicCalendarGrid.tsx`**

- Initialize `dayjsLocalizer(dayjs)`.
- Configure `dateHeader` to display Gregorian day number + small Nepali date overlay (e.g. `15 Asw` or `Aswin 15`).
- Map `AcademicCalendarEvent` objects into Big Calendar items (`start`, `end`, `title`, `resource`).
- Use category colors:
  - `HOLIDAY`: Rose (`#f43f5e`)
  - `EXAM`: Purple (`#a855f7`)
  - `VACATION`: Amber (`#f59e0b`)
  - `EVENT`: Emerald / Blue (`#10b981`)
  - `OTHER`: Slate / Gray (`#64748b`)
- Wire `onSelectSlot`: invokes `onSelectDate(selectedDateStr)` when user clicks an empty cell.
- Wire `onSelectEvent`: invokes `onSelectEvent(item.resource)` when user clicks an event block.

- [ ] **Step 3: Verify build**

Run: `npm run build` in `frontend/`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/features/school-settings/styles/calendar.css src/features/school-settings/components/AcademicCalendarGrid.tsx
git commit -m "feat(school-settings): add react-big-calendar month grid view with overlaid Nepali BS dates"
```

---

### Task 5: View Mode Toggle & Dual-Calendar Formatting in `AcademicCalendarView.tsx`

**Files:**
- Modify: `frontend/src/features/school-settings/components/AcademicCalendarView.tsx`

**Interfaces:**
- Consumes: `AcademicCalendarGrid`, `formatDualDateRange`, `getEventBadgeColor`
- Produces: Integrated dual-mode view (List View & Calendar Grid)

- [ ] **Step 1: Add view mode state and toggle**

```typescript
const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
const [preselectedDate, setPreselectedDate] = useState<string>('');
```

Add the toggle button group right next to the filter pills:
```tsx
<div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
  <Button
    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
    size="sm"
    onClick={() => setViewMode('list')}
    className="h-8 text-xs px-3"
  >
    <List className="w-3.5 h-3.5 mr-1.5" />
    List View
  </Button>
  <Button
    variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
    size="sm"
    onClick={() => setViewMode('calendar')}
    className="h-8 text-xs px-3"
  >
    <Calendar className="w-3.5 h-3.5 mr-1.5" />
    Calendar Grid
  </Button>
</div>
```

- [ ] **Step 2: Update List View to display dual calendars and matching colored badges**

Replace the date footer in each event card with:
```tsx
<div className="flex items-center gap-1.5 font-medium text-foreground">
  <Calendar className="w-3.5 h-3.5 text-primary" />
  <span>{formatDualDateRange(event.start_date, event.end_date)}</span>
</div>
```
Ensure event category badge colors match the Calendar Grid block colors.

- [ ] **Step 3: Render `AcademicCalendarGrid` when `viewMode === 'calendar'`**

Pass `events={filteredEvents}`, `academicYear={activeYear}`, `canManage={canManage}`, `onSelectDate`, and `onSelectEvent`.

- [ ] **Step 4: Verify build and lint**

Run: `npm run build && npm run lint` in `frontend/`
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add src/features/school-settings/components/AcademicCalendarView.tsx
git commit -m "feat(school-settings): integrate List/Calendar toggle and dual-calendar display on list cards"
```

---

### Task 6: End-to-End Verification & Documentation Update

**Files:**
- Modify: `frontend/README.md`
- Test: Full build, lint, and regression test suites

- [ ] **Step 1: Run frontend build and typecheck**

Run: `npm run build` in `frontend/`
Expected: Exit code 0, 0 TypeScript errors.

- [ ] **Step 2: Run frontend linter**

Run: `npm run lint` in `frontend/`
Expected: 0 errors.

- [ ] **Step 3: Run backend regression tests**

Run: `uv run pytest tests/` in `backend/`
Expected: 93/93 tests passing.

- [ ] **Step 4: Update frontend README**

Document the new Nepali datepicker, dual-calendar formatting, and visual calendar month grid view.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: document Nepali date support, dual calendar display, and visual month grid in frontend README"
```
