# Student Ledger Date Formatting Calendar Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make "Issue Date", "Due Date", and "Payment Date" displays in `StudentLedgerPage.tsx` strictly rely on the active calendar preference (`calendarSystem` from `useCalendarPreferenceStore`): displaying only the Nepali date when BS is selected, and only the Gregorian date when AD is selected, while providing dual date context on hover.

**Architecture:** Replace dual-parenthetical date formatting (`formatDualDate`) across invoice cards, invoice tables, and payment history tables in `StudentLedgerPage.tsx` with single-system calendar formatting (`formatDate`), utilizing `formatDualDate` as a tooltip/hover `title` attribute for frictionless cross-calendar verification adhering to UI/UX Pro Max guidelines.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide React, `nepali-date-converter`, Node test runner (`node:test`).

**Spec:** User request: `inside @[src/features/finance/pages/StudentLedgerPage.tsx] for "issue date", "due data" and "payment date" should rely on calendar silection. If BS only nepali date and if ad gregorian.`

## Global Constraints

- **Single Calendar Display**: When `calendarSystem === 'BS'`, display only Nepali date (e.g. `Baisakh 2, 2083`). When `calendarSystem === 'AD'`, display only Gregorian date (e.g. `Apr 15, 2026`).
- **No Awkward Dual Brackets**: Remove default dual bracketed text like `Baisakh 2, 2083 (Apr 15, 2026)` from table cells and card rows to prevent column overflow and layout wrapping.
- **Accessible Hover Context**: Set `title={formatDualDate(date, calendarSystem)}` on formatted date elements so users can hover to view the corresponding alternate calendar date instantly.
- **Zero Breakages**: Preserve all existing table structures, sorting, and modal triggers.
- **Test Coverage**: Validate calendar system switching behavior in automated tests.
- **Build Quality**: `npm run build` must succeed with 0 TypeScript and bundling errors.

---

### Task 1: Unit Tests for Calendar-Selected Date Formatting

**Files:**
- Modify: `src/features/finance/components/__tests__/cashierAndReceipt.test.mjs`

**Interfaces:**
- Consumes: `formatDate` and `formatDualDate` from `src/features/school-settings/utils/nepaliDate.ts`
- Produces: Test coverage ensuring single calendar formatting produces pure Nepali dates for BS and pure Gregorian dates for AD, with dual date available for tooltips.

- [ ] **Step 1: Write failing/new unit test in `cashierAndReceipt.test.mjs`**

Add tests to `src/features/finance/components/__tests__/cashierAndReceipt.test.mjs`:

```javascript
// -------------------------------------------------------------------------
// 20. Student Ledger Calendar Selection Date Formatting
// -------------------------------------------------------------------------

test('Student Ledger: formatDate respects calendarSystem selection (BS vs AD)', async () => {
  const { formatDate, formatDualDate } = await import('../../../school-settings/utils/nepaliDate.ts');
  const sampleIsoDate = '2026-04-15';

  // BS Mode: returns only Nepali date without Gregorian parentheses
  const bsResult = formatDate(sampleIsoDate, 'BS');
  assert.equal(bsResult.includes('('), false, 'BS output must not contain bracketed date');
  assert.equal(bsResult.includes('2083'), true, 'BS output must contain Bikram Sambat year');
  assert.equal(bsResult.includes('Baisakh'), true, 'BS output must contain Nepali month name');

  // AD Mode: returns only Gregorian date without Nepali parentheses
  const adResult = formatDate(sampleIsoDate, 'AD');
  assert.equal(adResult.includes('('), false, 'AD output must not contain bracketed date');
  assert.equal(adResult.includes('2026'), true, 'AD output must contain Gregorian year');
  assert.equal(adResult.includes('Apr'), true, 'AD output must contain Gregorian month');

  // Hover Tooltip: formatDualDate provides full context
  const bsDual = formatDualDate(sampleIsoDate, 'BS');
  assert.equal(bsDual.includes('('), true, 'Dual date contains secondary calendar in brackets');
  assert.equal(bsDual.includes('Apr 15, 2026'), true);
});
```

- [ ] **Step 2: Run test to verify it executes and passes**

Run: `node --test src/features/finance/components/__tests__/cashierAndReceipt.test.mjs`
Expected: PASS (all tests pass)

- [ ] **Step 3: Commit unit test**

```bash
git add src/features/finance/components/__tests__/cashierAndReceipt.test.mjs
git commit -m "test(finance): add calendar system date formatting test for student ledger"
```

---

### Task 2: Update `StudentLedgerPage.tsx` to Rely on Calendar Selection

**Files:**
- Modify: `src/features/finance/pages/StudentLedgerPage.tsx`

**Interfaces:**
- Consumes: `formatDate`, `formatDualDate` from `@/features/school-settings/utils/nepaliDate`
- Consumes: `calendarSystem` from `useCalendarPreferenceStore()`
- Produces: Clean single-calendar date display on "Issue Date", "Due Date", and "Payment Date" with dual-date hover tooltips.

- [ ] **Step 1: Update import in `StudentLedgerPage.tsx`**

In `src/features/finance/pages/StudentLedgerPage.tsx`:
Change:
```typescript
import { formatDualDate } from '@/features/school-settings/utils/nepaliDate';
```
To:
```typescript
import { formatDate, formatDualDate } from '@/features/school-settings/utils/nepaliDate';
```

- [ ] **Step 2: Update Mobile Invoice Card (Issue Date & Due Date)**

In `src/features/finance/pages/StudentLedgerPage.tsx` around line 390:
Change:
```tsx
<div>
  <span className="text-muted-foreground text-[11px] block">Issue Date</span>
  <span className="font-medium text-foreground">
    {formatDualDate(b.issue_date, calendarSystem)}
  </span>
</div>
<div>
  <span className="text-muted-foreground text-[11px] block">Due Date</span>
  <span className="font-medium text-foreground">
    {formatDualDate(b.due_date, calendarSystem)}
  </span>
</div>
```
To:
```tsx
<div>
  <span className="text-muted-foreground text-[11px] block">Issue Date</span>
  <span
    className="font-medium text-foreground cursor-default"
    title={formatDualDate(b.issue_date, calendarSystem)}
  >
    {formatDate(b.issue_date, calendarSystem)}
  </span>
</div>
<div>
  <span className="text-muted-foreground text-[11px] block">Due Date</span>
  <span
    className="font-medium text-foreground cursor-default"
    title={formatDualDate(b.due_date, calendarSystem)}
  >
    {formatDate(b.due_date, calendarSystem)}
  </span>
</div>
```

- [ ] **Step 3: Update Desktop Invoices Table (Issue Date & Due Date Columns)**

In `src/features/finance/pages/StudentLedgerPage.tsx` around line 525:
Change:
```tsx
<td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
  {formatDualDate(b.issue_date, calendarSystem)}
</td>
<td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
  {formatDualDate(b.due_date, calendarSystem)}
</td>
```
To:
```tsx
<td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
  <span
    className="cursor-default"
    title={formatDualDate(b.issue_date, calendarSystem)}
  >
    {formatDate(b.issue_date, calendarSystem)}
  </span>
</td>
<td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
  <span
    className="cursor-default"
    title={formatDualDate(b.due_date, calendarSystem)}
  >
    {formatDate(b.due_date, calendarSystem)}
  </span>
</td>
```

- [ ] **Step 4: Update Desktop Payment History Table (Payment Date Column)**

In `src/features/finance/pages/StudentLedgerPage.tsx` around line 665:
Change:
```tsx
<td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap">
  {formatDualDate(p.payment_date, calendarSystem)}
</td>
```
To:
```tsx
<td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap">
  <span
    className="cursor-default"
    title={formatDualDate(p.payment_date, calendarSystem)}
  >
    {formatDate(p.payment_date, calendarSystem)}
  </span>
</td>
```

- [ ] **Step 5: Run tests and production build**

Run:
```bash
node --test src/**/*.test.mjs
npm run build
```
Expected: All tests pass, build succeeds with 0 errors.

- [ ] **Step 6: Commit changes**

```bash
git add src/features/finance/pages/StudentLedgerPage.tsx
git commit -m "feat(finance): format issue, due, and payment dates by calendar preference in student ledger"
```

---

### Task 3: Regression & Verification

- [ ] **Step 1: Run complete test suite**

Run: `node --test src/**/*.test.mjs`
Expected: 100% passing tests.

- [ ] **Step 2: Run production TypeScript and bundle compilation**

Run: `npm run build`
Expected: Build succeeds with 0 errors.

- [ ] **Step 3: Push changes**

```bash
git push origin nabin
```

---

## Self-Review Checklist

1. **Spec coverage**:
   - Issue date relies on calendar selection: Yes (mobile card and desktop table).
   - Due date relies on calendar selection: Yes (mobile card and desktop table).
   - Payment date relies on calendar selection: Yes (payment history table).
   - BS shows only Nepali date: Yes (`formatDate(d, 'BS')`).
   - AD shows only Gregorian date: Yes (`formatDate(d, 'AD')`).
   - UI/UX polish: Dual-date preserved in hover `title` attribute for rapid verification without visual clutter.
2. **No Placeholders**: All code snippets, commands, and expected outputs are fully detailed.
3. **Type consistency**: `calendarSystem` is `'BS' | 'AD'` matching `useCalendarPreferenceStore` and `formatDate` parameter signatures.
