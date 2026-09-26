# School Settings Page UX Improvements Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all identified UI/UX issues across the School Settings page and its child components to deliver a polished, consistent, and accessible settings hub.

**Architecture:** The School Settings page (`SchoolSettingsPage.tsx`) is a tabbed container with 4 tabs (Sessions, Days, Calendar, Profile), each rendering a dedicated child component. Fixes are scoped per-component, moving from structural bugs outward to polish.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, shadcn/ui (Radix primitives), TanStack Router, TanStack Query v5, react-hook-form + zod, Sonner toasts

**Spec:** No external spec — this plan is derived from a thorough audit of the current code.

## Global Constraints

- **shadcn/ui consistency:** All interactive controls must use the project's existing shadcn/ui primitives (`Select`, `Tabs`, `Dialog`, `Tooltip`, etc.) — never raw HTML `<select>`, `<textarea>`, or `window.confirm()` / `alert()`.
- **No backend changes:** Every fix is frontend-only.
- **No new npm dependencies:** All needed components (`Select`, `Tabs`, `Textarea`) either already exist in `src/components/ui/` or can be added via `npx shadcn@latest add <component>`.
- **Existing test suites must pass:** `npx tsc --noEmit`, `npm run build`, all existing unit tests.
- **Preserve all existing comments and docstrings** unrelated to changes.

---

## Identified Issues (Audit Summary)

| # | Severity | Component | Issue |
|---|----------|-----------|-------|
| 1 | 🔴 Critical | SchoolSettingsPage + AcademicYearsPage | **Duplicate school selector for Super Admins.** `AcademicYearsPage` renders its own `SchoolSearchSelect` + header, completely disconnected from the parent page's selector. Two overlapping selectors controlling different state. |
| 2 | 🟠 High | SchoolSettingsPage | **Custom tab bar instead of shadcn `Tabs`.** Tab navigation is a hand-rolled `<nav>` with `<button>` elements — no keyboard Arrow Left/Right navigation, no `role="tablist"`, no ARIA tab panel association. |
| 3 | 🟠 High | AcademicYearsPage, AcademicCalendarView, CalendarEventDialog | **Native `window.confirm()` and `alert()` calls** break the design system, are not accessible, lose keyboard focus trap in dialogs, and look jarring. |
| 4 | 🟠 High | SchoolGeneralSettings | **Input text/icon overlap.** Icons (`Globe`, `Mail`, `Phone`) are positioned `absolute right-3 top-3`, but inputs have no right padding — typed text runs underneath the icon. |
| 5 | 🟡 Medium | CalendarEventDialog | **Raw `<select>` for Category** instead of shadcn `Select`. Raw `<textarea>` for Description instead of shadcn `Textarea`. Visually inconsistent with the rest of the dialog. |
| 6 | 🟡 Medium | AcademicCalendarView | **Raw `<select>` for Academic Session picker** instead of shadcn `Select`. BS/AD toggle lacks `aria-pressed`. |
| 7 | 🟡 Medium | SchoolGeneralSettings | **No dirty-state tracking.** "Save Profile Changes" button is always enabled even when nothing changed — user can't tell if they have unsaved edits. |
| 8 | 🟡 Medium | AcademicYearsPage | **Dates shown as AD-only.** Uses `new Date().toLocaleDateString()` ignoring the user's BS/AD calendar preference. |

---

## Proposed Changes

### Task 1: Fix Duplicate School Selector — Make `AcademicYearsPage` Embeddable

The root structural bug. When embedded inside `SchoolSettingsPage`, `AcademicYearsPage` must NOT render its own header, school selector, or `TenantRequiredState` guard — those are already handled by the parent.

**Files:**
- Modify: `src/features/academic-year/pages/AcademicYearsPage.tsx`
- Modify: `src/features/school-settings/pages/SchoolSettingsPage.tsx`

**Interfaces:**
- Produces: `AcademicYearsPage` accepts optional `tenantId?: string` and `canManage?: boolean` props. When provided, it skips rendering its own header, school selector, and permission check.

- [ ] **Step 1: Update `AcademicYearsPage` to accept optional props**

```tsx
// Add props interface
interface AcademicYearsPageProps {
  /** When provided, the component acts as an embedded panel — no header, no school selector */
  tenantId?: string;
  canManage?: boolean;
}

export const AcademicYearsPage: React.FC<AcademicYearsPageProps> = ({
  tenantId: externalTenantId,
  canManage: externalCanManage,
}) => {
  const { activeTenantId } = useAuth();
  const { can, isSuperAdmin } = usePermission();

  const isEmbedded = externalTenantId !== undefined;

  // When embedded, use external props; when standalone, use internal state
  const internalCanManage = can('MANAGE_TENANT_SETTINGS') || isSuperAdmin;
  const canManage = externalCanManage ?? internalCanManage;

  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const effectiveTenantId = isEmbedded
    ? (externalTenantId || '')
    : (selectedTenantId || activeTenantId || '');
  // ...rest of component
```

- [ ] **Step 2: Conditionally skip header and school selector when embedded**

Wrap the header section and school selector in `{!isEmbedded && (...)}`:

```tsx
  // Non-superadmins require an active tenant — skip when embedded
  if (!isEmbedded && !activeTenantId && !isSuperAdmin) {
    return <TenantRequiredState featureName="academic years management" />;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Only show header when standalone */}
      {!isEmbedded && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* ... existing header with title + buttons ... */}
        </div>
      )}

      {/* Only show school selector when standalone */}
      {!isEmbedded && isSuperAdmin && (
        <Card className="p-4 bg-muted/40 border-dashed ...">
          {/* ... existing SchoolSearchSelect ... */}
        </Card>
      )}

      {/* When embedded, show action buttons inline above the table */}
      {isEmbedded && canManage && (
        <div className="flex items-center justify-end gap-2">
          {isSuperAdmin && (
            <Button variant="destructive" onClick={() => setIsRolloverOpen(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white">
              <RefreshCw className="w-4 h-4 mr-2" />
              Platform Rollover
            </Button>
          )}
          <Button onClick={() => setIsFormOpen(true)} disabled={!effectiveTenantId}>
            <Plus className="w-4 h-4 mr-2" />
            Create Year
          </Button>
        </div>
      )}

      {/* ... rest of component (table, dialogs) unchanged ... */}
    </div>
  );
```

- [ ] **Step 3: Update `SchoolSettingsPage` to pass props**

```tsx
{currentTab === 'sessions' && (
  <AcademicYearsPage tenantId={effectiveTenantId} canManage={canManage} />
)}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm run build`
Expected: 0 errors, successful build. Super Admin should see only ONE school selector at the top of the page, not two.

- [ ] **Step 5: Commit**

```bash
git add src/features/academic-year/pages/AcademicYearsPage.tsx src/features/school-settings/pages/SchoolSettingsPage.tsx
git commit -m "fix(school-settings): eliminate duplicate school selector by making AcademicYearsPage embeddable"
```

---

### Task 2: Replace Custom Tab Bar with shadcn `Tabs`

The existing tab bar is a hand-rolled `<nav>` with buttons. Replace it with the project's existing Radix `Tabs` component (`src/components/ui/tabs.tsx`) for proper keyboard navigation and ARIA semantics.

**Files:**
- Modify: `src/features/school-settings/pages/SchoolSettingsPage.tsx`

**Interfaces:**
- Consumes: `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` from `@/components/ui/tabs`
- Consumes: `SchoolSettingsTab` type stays the same (`'sessions' | 'days' | 'calendar' | 'profile'`)

- [ ] **Step 1: Replace the tab bar and panels with shadcn Tabs**

Replace the `<div className="border-b ..."><nav>` and the conditional `{currentTab === ...}` blocks:

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// Inside the component's return JSX, replace the tab bar + panels:
<Tabs
  value={currentTab}
  onValueChange={(value) => handleTabChange(value as SchoolSettingsTab)}
  className="space-y-4"
>
  <TabsList className="w-full justify-start h-auto flex-wrap gap-1 bg-transparent p-0 border-b border-border rounded-none">
    {tabs.map((tab) => {
      const Icon = tab.icon;
      return (
        <TabsTrigger
          key={tab.id}
          value={tab.id}
          className="flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:font-semibold text-muted-foreground hover:text-foreground hover:border-border"
        >
          <Icon className="w-4 h-4" />
          <span>{tab.label}</span>
        </TabsTrigger>
      );
    })}
  </TabsList>

  <TabsContent value="sessions">
    <AcademicYearsPage tenantId={effectiveTenantId} canManage={canManage} />
  </TabsContent>

  <TabsContent value="days">
    {effectiveTenantId ? (
      <AcademicDaysConfig tenantId={effectiveTenantId} canManage={canManage} />
    ) : (
      <Card className="p-8 text-center text-muted-foreground">
        Please select a school to configure weekly academic days.
      </Card>
    )}
  </TabsContent>

  <TabsContent value="calendar">
    {effectiveTenantId ? (
      <AcademicCalendarView tenantId={effectiveTenantId} canManage={canManage} />
    ) : (
      <Card className="p-8 text-center text-muted-foreground">
        Please select a school to view or configure its academic calendar.
      </Card>
    )}
  </TabsContent>

  <TabsContent value="profile">
    {effectiveTenantId ? (
      <SchoolGeneralSettings tenantId={effectiveTenantId} canManage={canManage} />
    ) : (
      <Card className="p-8 text-center text-muted-foreground">
        Please select a school to view or edit institutional profile details.
      </Card>
    )}
  </TabsContent>
</Tabs>
```

- [ ] **Step 2: Remove the old `tabs` array definition and `<nav>` block**

The `tabs` array is still useful for the `TabsTrigger` map — keep it. Remove the old `<div className="border-b border-border">` and `<div className="pt-2">` wrapper blocks.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && npm run build`
Expected: 0 errors. Tabs should be keyboard-navigable with Arrow keys. Active tab should remain URL-synced via `?tab=`.

- [ ] **Step 4: Commit**

```bash
git add src/features/school-settings/pages/SchoolSettingsPage.tsx
git commit -m "refactor(school-settings): replace custom tab bar with shadcn Tabs for accessibility"
```

---

### Task 3: Eliminate `window.confirm()` and `alert()` — Add `AlertDialog` and Sonner Toasts

**Files:**
- Create: `src/components/ui/alert-dialog.tsx` (via `npx shadcn@latest add alert-dialog`, or manually)
- Modify: `src/features/academic-year/pages/AcademicYearsPage.tsx` — replace 2x `window.confirm()`
- Modify: `src/features/school-settings/components/AcademicCalendarView.tsx` — replace 1x `window.confirm()`
- Modify: `src/features/school-settings/components/CalendarEventDialog.tsx` — replace 2x `alert()`

**Interfaces:**
- Produces: Reusable `ConfirmDialog` pattern or inline `AlertDialog` usage

- [ ] **Step 1: Install the shadcn AlertDialog component**

```bash
npx shadcn@latest add alert-dialog
```

If the CLI doesn't work, manually create `src/components/ui/alert-dialog.tsx` using the standard shadcn AlertDialog code from [shadcn/ui docs](https://ui.shadcn.com/docs/components/alert-dialog).

- [ ] **Step 2: Create a reusable `ConfirmDialog` wrapper**

Create `src/components/common/ConfirmDialog.tsx`:

```tsx
import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void;
  isPending?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  isPending,
}) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={isPending}>{cancelLabel}</AlertDialogCancel>
        <AlertDialogAction
          onClick={onConfirm}
          disabled={isPending}
          className={variant === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
        >
          {confirmLabel}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
```

- [ ] **Step 3: Replace `window.confirm()` in `AcademicYearsPage`**

Add state variables for confirmation dialog:

```tsx
const [confirmAction, setConfirmAction] = useState<{
  type: 'set-current' | 'close-year';
  yearId: string;
  yearName: string;
} | null>(null);
```

Replace `handleSetCurrent` and `handleCloseYear` to open the dialog instead of `window.confirm()`:

```tsx
const handleSetCurrent = (yearId: string, name: string) => {
  setConfirmAction({ type: 'set-current', yearId, yearName: name });
};

const handleCloseYear = (yearId: string, name: string) => {
  setConfirmAction({ type: 'close-year', yearId, yearName: name });
};

const executeConfirmAction = async () => {
  if (!confirmAction || !effectiveTenantId) return;
  setProcessingId(confirmAction.yearId);
  try {
    if (confirmAction.type === 'set-current') {
      await setCurrentMutation.mutateAsync({ tenantId: effectiveTenantId, yearId: confirmAction.yearId });
    } else {
      await closeMutation.mutateAsync({ tenantId: effectiveTenantId, yearId: confirmAction.yearId });
    }
  } finally {
    setProcessingId(null);
    setConfirmAction(null);
  }
};
```

Add the dialog at the bottom of the component:

```tsx
<ConfirmDialog
  open={!!confirmAction}
  onOpenChange={(open) => !open && setConfirmAction(null)}
  title={confirmAction?.type === 'set-current' ? 'Set Active Academic Year' : 'Close Academic Year'}
  description={
    confirmAction?.type === 'set-current'
      ? `Are you sure you want to set "${confirmAction?.yearName}" as the current academic year for the whole school?`
      : `Are you sure you want to close "${confirmAction?.yearName}"? This action might make data read-only.`
  }
  confirmLabel={confirmAction?.type === 'set-current' ? 'Set as Current' : 'Close Year'}
  variant={confirmAction?.type === 'close-year' ? 'destructive' : 'default'}
  onConfirm={executeConfirmAction}
  isPending={!!processingId}
/>
```

- [ ] **Step 4: Replace `window.confirm()` in `AcademicCalendarView`**

Same pattern for the delete event confirmation:

```tsx
const [eventToDelete, setEventToDelete] = useState<AcademicCalendarEvent | null>(null);

const handleDelete = (event: AcademicCalendarEvent) => {
  setEventToDelete(event);
};

const executeDelete = async () => {
  if (!eventToDelete) return;
  await deleteMutation.mutateAsync({ tenantId, eventId: eventToDelete.id });
  setEventToDelete(null);
};

// In JSX:
<ConfirmDialog
  open={!!eventToDelete}
  onOpenChange={(open) => !open && setEventToDelete(null)}
  title="Delete Calendar Event"
  description={`Are you sure you want to delete "${eventToDelete?.title}" from the calendar? This action cannot be undone.`}
  confirmLabel="Delete Event"
  variant="destructive"
  onConfirm={executeDelete}
  isPending={deleteMutation.isPending}
/>
```

- [ ] **Step 5: Replace `alert()` in `CalendarEventDialog` with Sonner toast**

```tsx
import { toast } from 'sonner';

// In onSubmit, replace:
//   alert(`Event date cannot be before academic session start (${minDate}).`);
// with:
toast.error('Invalid Date Range', {
  description: `Event dates must fall within the academic session (${minDate} to ${maxDate}).`,
});
return;
```

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit && npm run build`
Expected: 0 errors. No more native browser dialogs anywhere in School Settings.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "fix(school-settings): replace window.confirm/alert with AlertDialog and Sonner toasts"
```

---

### Task 4: Fix Input Icon Overlap in `SchoolGeneralSettings`

**Files:**
- Modify: `src/features/school-settings/components/SchoolGeneralSettings.tsx`

- [ ] **Step 1: Add `pr-10` padding to inputs with right-side icons**

For the email input:
```tsx
<Input
  id="email"
  name="email"
  type="email"
  value={formData.email}
  onChange={handleChange}
  disabled={!canManage}
  placeholder="info@school.edu.np"
  className="pr-10"
/>
```

For the phone input:
```tsx
<Input
  id="phone"
  name="phone"
  value={formData.phone}
  onChange={handleChange}
  disabled={!canManage}
  placeholder="01-4412345 or 98XXXXXXXX"
  className="pr-10"
/>
```

For the domain input (already disabled, but fix for consistency):
```tsx
<Input
  id="domain_name"
  name="domain_name"
  value={formData.domain_name}
  disabled
  className="bg-muted cursor-not-allowed pr-10"
/>
```

- [ ] **Step 2: Add `aria-hidden="true"` to decorative icons**

```tsx
<Globe className="w-4 h-4 text-muted-foreground absolute right-3 top-3" aria-hidden="true" />
<Mail className="w-4 h-4 text-muted-foreground absolute right-3 top-3" aria-hidden="true" />
<Phone className="w-4 h-4 text-muted-foreground absolute right-3 top-3" aria-hidden="true" />
```

- [ ] **Step 3: Add dirty-state tracking**

```tsx
const isDirty = useMemo(() => {
  if (!tenant) return false;
  return (
    formData.name !== (tenant.name || '') ||
    formData.email !== (tenant.email || '') ||
    formData.phone !== (tenant.phone || '') ||
    formData.province !== (tenant.address?.province || '') ||
    formData.district !== (tenant.address?.district || '') ||
    formData.municipality !== (tenant.address?.municipality || '') ||
    formData.ward !== (tenant.address?.ward || 1) ||
    formData.tole !== (tenant.address?.tole || '')
  );
}, [formData, tenant]);
```

Update the save button:

```tsx
<Button type="submit" disabled={updateTenantMutation.isPending || !isDirty}>
  {updateTenantMutation.isPending ? (
    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
  ) : (
    <Save className="w-4 h-4 mr-2" />
  )}
  Save Profile Changes
</Button>
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm run build`
Expected: 0 errors. Icons should never overlap typed text. Save button should be disabled when nothing changed.

- [ ] **Step 5: Commit**

```bash
git add src/features/school-settings/components/SchoolGeneralSettings.tsx
git commit -m "fix(school-profile): fix input icon overlap, add dirty-state tracking, add aria-hidden to icons"
```

---

### Task 5: Replace Raw `<select>` and `<textarea>` with shadcn Components

**Files:**
- Create: `src/components/ui/textarea.tsx` (via `npx shadcn@latest add textarea`, or manually)
- Modify: `src/features/school-settings/components/CalendarEventDialog.tsx`
- Modify: `src/features/school-settings/components/AcademicCalendarView.tsx`

- [ ] **Step 1: Install the shadcn Textarea component**

```bash
npx shadcn@latest add textarea
```

If the CLI doesn't work, create `src/components/ui/textarea.tsx` manually:

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentPropsWithoutRef<'textarea'>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        'flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

export { Textarea };
```

- [ ] **Step 2: Replace raw `<select>` in CalendarEventDialog with shadcn `Select`**

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Replace the <select id="event_type"> block:
<Select value={selectedType} onValueChange={(val) => handleTypeChange(val as (typeof CALENDAR_EVENT_TYPES)[number])}>
  <SelectTrigger id="event_type" className="w-full">
    <SelectValue placeholder="Select category" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="HOLIDAY">Holiday (Public or School Holiday)</SelectItem>
    <SelectItem value="EXAM">Examination Window</SelectItem>
    <SelectItem value="VACATION">Vacation / Term Break</SelectItem>
    <SelectItem value="EVENT">School Event / Celebration</SelectItem>
    <SelectItem value="OTHER">Other Academic Milestone</SelectItem>
  </SelectContent>
</Select>
```

- [ ] **Step 3: Replace raw `<textarea>` in CalendarEventDialog with shadcn `Textarea`**

```tsx
import { Textarea } from '@/components/ui/textarea';

// Replace the <textarea id="description"> block:
<Textarea
  id="description"
  rows={3}
  placeholder="Additional notes, schedule remarks, or notices..."
  {...register('description')}
/>
```

- [ ] **Step 4: Replace raw `<select>` in AcademicCalendarView with shadcn `Select`**

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Replace the <select id="calendar-year"> block:
<Select value={activeYearId} onValueChange={(val) => setSelectedYearId(val)}>
  <SelectTrigger id="calendar-year" className="w-[220px]">
    <SelectValue placeholder="Select session" />
  </SelectTrigger>
  <SelectContent>
    {years.map((y) => (
      <SelectItem key={y.id} value={y.id}>
        {y.name} {y.is_current ? '(Current Active)' : ''}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

- [ ] **Step 5: Add `aria-pressed` to BS/AD toggle buttons in AcademicCalendarView**

```tsx
<button
  type="button"
  onClick={() => setCalendarSystem('BS')}
  aria-pressed={calendarSystem === 'BS'}
  className={...}
>
  BS (बि.सं.)
</button>
<button
  type="button"
  onClick={() => setCalendarSystem('AD')}
  aria-pressed={calendarSystem === 'AD'}
  className={...}
>
  AD (Gregorian)
</button>
```

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit && npm run build`
Expected: 0 errors. Selects should render styled Radix popovers. Textarea should match design system.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(school-settings): replace raw selects and textarea with shadcn Select and Textarea"
```

---

### Task 6: Show Dual Calendar Dates in AcademicYearsPage Table

**Files:**
- Modify: `src/features/academic-year/pages/AcademicYearsPage.tsx`

**Interfaces:**
- Consumes: `formatDualDateRange` from `../school-settings/utils/nepaliDate`
- Consumes: `useCalendarPreferenceStore` from `@/stores/calendarPreferenceStore`

- [ ] **Step 1: Import calendar utilities and show dual dates**

```tsx
import { formatDualDateRange } from '@/features/school-settings/utils/nepaliDate';
import { useCalendarPreferenceStore } from '@/stores/calendarPreferenceStore';

// Inside the component:
const { calendarSystem } = useCalendarPreferenceStore();

// In the table cell for Duration, replace:
//   {new Date(year.start_date).toLocaleDateString()} - {new Date(year.end_date).toLocaleDateString()}
// with:
<span className="text-sm">
  {formatDualDateRange(year.start_date, year.end_date, calendarSystem)}
</span>
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npm run build`
Expected: 0 errors. Duration column now shows BS dates when user preference is BS.

- [ ] **Step 3: Commit**

```bash
git add src/features/academic-year/pages/AcademicYearsPage.tsx
git commit -m "feat(academic-years): show dual BS/AD dates in session table respecting user preference"
```

---

### Task 7: Final Verification & Cleanup

**Files:**
- All modified files from Tasks 1–6

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```
Expected: 0 errors

- [ ] **Step 2: Run production build**

```bash
npm run build
```
Expected: Successful build

- [ ] **Step 3: Run existing tests**

```bash
node src/features/school-settings/utils/__tests__/nepaliCalendarEngine.test.mjs
node src/components/ui/__tests__/nepaliDatePickerLogic.test.mjs
```
Expected: All tests pass

- [ ] **Step 4: Check for dead imports**

Scan modified files for any unused imports introduced or left behind during refactoring. Remove them.

- [ ] **Step 5: Commit cleanup if needed**

```bash
git add -A
git commit -m "chore: final cleanup for school settings UX improvements"
```

---

## Verification Plan

### Automated Tests
```bash
npx tsc --noEmit
npm run build
node src/features/school-settings/utils/__tests__/nepaliCalendarEngine.test.mjs
node src/components/ui/__tests__/nepaliDatePickerLogic.test.mjs
```

### Manual Verification
1. **Super Admin view:** Navigate to School Settings → only ONE school selector should appear (at the top), NOT two. Switching schools should update all tabs.
2. **Tab navigation:** Use Arrow Left/Right keys to navigate between tabs. Tab should update URL `?tab=`.
3. **Confirm dialogs:** In Sessions tab, click "Set Current" or "Close" — should see a styled AlertDialog, not a browser popup. In Calendar tab, click the trash icon on an event — same.
4. **School Profile:** Type a long email into the email field — text should NOT run underneath the Mail icon. Change a field and verify "Save Profile Changes" enables; revert it and verify it disables.
5. **Calendar dialog:** Open "Add Event / Holiday" — Category should be a styled shadcn Select dropdown, not a native `<select>`. Description should be a styled textarea.
6. **Academic Year dates:** Toggle calendar preference to BS — the Duration column in Sessions table should show Nepali dates.
