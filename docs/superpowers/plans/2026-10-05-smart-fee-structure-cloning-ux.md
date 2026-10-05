# Smart Fee Structure Cloning UX (Onboarding Banner + Header Overflow Menu) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the fee cloning user experience by replacing the permanent header button with a smart combined pattern: an onboarding hero banner when a session has zero fee structures, and an unobtrusive `...` (More Actions) header dropdown for ongoing access.

**Architecture:** 
- In `feeCloneUtils.ts`, introduce `computeSessionCloneBannerState` to evaluate whether the onboarding banner should be visible based on active fee counts, candidate previous academic years, and loading state.
- In `FeeStructuresPage.tsx`, remove the standalone header `Clone from Previous Session` button and add a compact `MoreHorizontal` (`...`) dropdown menu containing the clone action.
- Add a responsive, accessible `SessionFeeOnboardingBanner` component that renders right below the header when the active academic session has zero fee heads, offering 1-click cloning from the preceding session or manual creation.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Radix UI Dropdown Menu (`@radix-ui/react-dropdown-menu`), Lucide Icons (`CopyPlus`, `MoreHorizontal`, `Sparkles`, `Plus`).

**Spec:** Brainstormed with user on 2026-10-05 (Option 1 + Option 2 combined).

## Global Constraints
- **Preserve Existing Functionality:** `CloneFeeStructuresDialog` remains the engine for previewing, percentage markup adjustments, and cloning fee structures across years.
- **Role Permission Integrity:** Only users with `MANAGE_FINANCE` (`SUPER_ADMIN`, `ADMIN`, `ACCOUNTANT`) can trigger the clone dialog or see management CTAs.
- **Zero Layout Shifts:** The banner and header controls must adapt gracefully across mobile, tablet, and desktop viewports without horizontal scrollbars.
- **Clean Typing & 100% Test Pass:** 0 TypeScript compiler warnings, clean `npm run build`, and 100% passing tests in `node --test src/**/*.test.mjs`.

---

### Task 1: Onboarding Banner Helper Utilities & Unit Tests

**Files:**
- Modify: `src/features/finance/utils/feeCloneUtils.ts`
- Test: `src/features/finance/components/__tests__/feeCloneAndBulkLogic.test.mjs`

**Interfaces:**
- Produces:
  ```ts
  export interface SessionCloneBannerState {
    shouldShowBanner: boolean;
    hasPreviousSessions: boolean;
    latestPreviousYearName?: string;
    totalFeeHeadsCount: number;
  }

  export function computeSessionCloneBannerState(params: {
    totalFeeHeadsCount: number;
    candidateYears: Array<{ id: string; name: string }>;
    isLoading: boolean;
  }): SessionCloneBannerState;
  ```

- [ ] **Step 1: Write failing unit tests in `feeCloneAndBulkLogic.test.mjs`**

Add tests to `src/features/finance/components/__tests__/feeCloneAndBulkLogic.test.mjs`:
```js
test('computeSessionCloneBannerState: returns shouldShowBanner=false while loading', () => {
  const result = computeSessionCloneBannerState({
    totalFeeHeadsCount: 0,
    candidateYears: [{ id: '1', name: '2081 BS' }],
    isLoading: true,
  });
  assert.equal(result.shouldShowBanner, false);
});

test('computeSessionCloneBannerState: shows banner when totalFeeHeadsCount is 0 and previous sessions exist', () => {
  const result = computeSessionCloneBannerState({
    totalFeeHeadsCount: 0,
    candidateYears: [{ id: '1', name: '2081 BS' }, { id: '2', name: '2080 BS' }],
    isLoading: false,
  });
  assert.equal(result.shouldShowBanner, true);
  assert.equal(result.hasPreviousSessions, true);
  assert.equal(result.latestPreviousYearName, '2081 BS');
});

test('computeSessionCloneBannerState: shows banner without previous session CTA when candidateYears is empty (new school)', () => {
  const result = computeSessionCloneBannerState({
    totalFeeHeadsCount: 0,
    candidateYears: [],
    isLoading: false,
  });
  assert.equal(result.shouldShowBanner, true);
  assert.equal(result.hasPreviousSessions, false);
  assert.equal(result.latestPreviousYearName, undefined);
});

test('computeSessionCloneBannerState: hides banner when fee heads already exist (> 0)', () => {
  const result = computeSessionCloneBannerState({
    totalFeeHeadsCount: 5,
    candidateYears: [{ id: '1', name: '2081 BS' }],
    isLoading: false,
  });
  assert.equal(result.shouldShowBanner, false);
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `node --test src/features/finance/components/__tests__/feeCloneAndBulkLogic.test.mjs`
Expected: FAIL (`computeSessionCloneBannerState is not defined`).

- [ ] **Step 3: Implement `computeSessionCloneBannerState` in `feeCloneUtils.ts`**

Add to `src/features/finance/utils/feeCloneUtils.ts`:
```ts
export interface SessionCloneBannerState {
  shouldShowBanner: boolean;
  hasPreviousSessions: boolean;
  latestPreviousYearName?: string;
  totalFeeHeadsCount: number;
}

export function computeSessionCloneBannerState(params: {
  totalFeeHeadsCount: number;
  candidateYears: Array<{ id: string; name: string }>;
  isLoading: boolean;
}): SessionCloneBannerState {
  if (params.isLoading) {
    return {
      shouldShowBanner: false,
      hasPreviousSessions: false,
      totalFeeHeadsCount: params.totalFeeHeadsCount,
    };
  }

  const hasPreviousSessions = params.candidateYears.length > 0;
  const shouldShowBanner = params.totalFeeHeadsCount === 0;

  return {
    shouldShowBanner,
    hasPreviousSessions,
    latestPreviousYearName: params.candidateYears[0]?.name,
    totalFeeHeadsCount: params.totalFeeHeadsCount,
  };
}
```

- [ ] **Step 4: Run test to verify passing**

Run: `node --test src/features/finance/components/__tests__/feeCloneAndBulkLogic.test.mjs`
Expected: PASS (all tests pass).

- [ ] **Step 5: Commit**

```bash
git add src/features/finance/utils/feeCloneUtils.ts src/features/finance/components/__tests__/feeCloneAndBulkLogic.test.mjs
git commit -m "feat(finance): add computeSessionCloneBannerState helper and unit tests"
```

---

### Task 2: Session Fee Onboarding Banner Component

**Files:**
- Create: `src/features/finance/components/SessionFeeOnboardingBanner.tsx`
- Modify: `src/features/finance/components/index.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface SessionFeeOnboardingBannerProps {
    sessionName?: string;
    latestPreviousYearName?: string;
    hasPreviousSessions: boolean;
    canManage: boolean;
    onCloneClick: () => void;
    onCreateManualClick: () => void;
  }
  ```

- [ ] **Step 1: Create `SessionFeeOnboardingBanner.tsx`**

Implement `src/features/finance/components/SessionFeeOnboardingBanner.tsx`:
- Render a card with subtle gradient background (`bg-linear-to-r from-purple-500/10 via-primary/5 to-transparent border border-purple-500/30 rounded-2xl p-5 shadow-2xs`).
- Left column:
  - Icon container with `Sparkles` icon (`text-purple-600 dark:text-purple-400 bg-purple-500/15 p-2.5 rounded-xl`).
  - Title: `Set up Fee Schedules for {sessionName || 'Active Session'}`.
  - Subtitle: Explains 1-click cloning from `{latestPreviousYearName}` with inflation adjustments, or manual setup.
- Right column:
  - If `hasPreviousSessions`:
    - Button 1: `<Button onClick={onCloneClick} className="bg-purple-600 hover:bg-purple-700 text-white gap-2 shadow-xs cursor-pointer"><CopyPlus className="w-4 h-4" /> Clone from {latestPreviousYearName}</Button>`
    - Button 2: `<Button variant="outline" onClick={onCreateManualClick} className="gap-1.5 cursor-pointer"><Plus className="w-4 h-4" /> Create Manually</Button>`
  - If `!hasPreviousSessions`:
    - Button 1: `<Button onClick={onCreateManualClick} className="gap-2 cursor-pointer"><Plus className="w-4 h-4" /> Add First Fee Structure</Button>`

- [ ] **Step 2: Export component from `index.ts`**

In `src/features/finance/components/index.ts`:
Add `export * from './SessionFeeOnboardingBanner';`.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/finance/components/SessionFeeOnboardingBanner.tsx src/features/finance/components/index.ts
git commit -m "feat(finance-ui): add SessionFeeOnboardingBanner component"
```

---

### Task 3: Integrate Combined UX into `FeeStructuresPage.tsx`

**Files:**
- Modify: `src/features/finance/pages/FeeStructuresPage.tsx`

- [ ] **Step 1: Update imports & data queries**

- Import `DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem` from `@/components/ui/dropdown-menu`.
- Import `MoreHorizontal` from `lucide-react`.
- Import `useAcademicYears` from `@/features/academic-year/hooks/useAcademicYears`.
- Import `filterAndSortCandidateAcademicYears` and `computeSessionCloneBannerState` from `../utils/feeCloneUtils`.
- Import `SessionFeeOnboardingBanner` from `../components/SessionFeeOnboardingBanner`.

- [ ] **Step 2: Calculate banner state and candidate sessions**

In `FeeStructuresPage.tsx`:
```tsx
const { data: academicYears = [], isLoading: isLoadingYears } = useAcademicYears(effectiveTenantId);

const candidateYears = useMemo(() => {
  return filterAndSortCandidateAcademicYears(academicYears, currentYear?.id);
}, [academicYears, currentYear?.id]);

const totalFeeHeadsCount = useMemo(() => {
  return (schoolFees?.length || 0) + totalClassFeeHeads;
}, [schoolFees, totalClassFeeHeads]);

const bannerState = useMemo(() => {
  return computeSessionCloneBannerState({
    totalFeeHeadsCount,
    candidateYears,
    isLoading: isLoadingOverview || isLoadingSchoolFees || isLoadingYears,
  });
}, [totalFeeHeadsCount, candidateYears, isLoadingOverview, isLoadingSchoolFees, isLoadingYears]);
```

- [ ] **Step 3: Replace header button with More Actions dropdown**

In the page header actions:
Replace:
```tsx
<Button
  variant="outline"
  size="sm"
  onClick={() => setIsCloneDialogOpen(true)}
  className="gap-1.5 cursor-pointer border-border/80 hover:bg-accent"
>
  <CopyPlus className="w-4 h-4 text-purple-600 dark:text-purple-400" />
  <span>Clone from Previous Session</span>
</Button>
```
With:
```tsx
<Button
  size="sm"
  onClick={() => {
    setEditingFeeStructure(null);
    setIsFeeStructureOpen(true);
  }}
  className="gap-1.5 cursor-pointer shadow-2xs"
>
  <Plus className="w-4 h-4" />
  <span>Add Fee Structure</span>
</Button>

{/* More Actions Overflow Menu */}
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button
      variant="outline"
      size="sm"
      className="h-8 w-8 p-0 cursor-pointer border-border/80 hover:bg-accent"
      aria-label="More finance actions"
    >
      <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-60">
    <DropdownMenuItem
      onClick={() => setIsCloneDialogOpen(true)}
      className="gap-2 cursor-pointer text-xs"
    >
      <CopyPlus className="w-4 h-4 text-purple-600 dark:text-purple-400" />
      <span>Clone from Previous Session</span>
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

- [ ] **Step 4: Mount `SessionFeeOnboardingBanner`**

Render right after the header and KPI cards, before the tabs:
```tsx
{bannerState.shouldShowBanner && (
  <SessionFeeOnboardingBanner
    sessionName={currentYear?.name}
    latestPreviousYearName={bannerState.latestPreviousYearName}
    hasPreviousSessions={bannerState.hasPreviousSessions}
    canManage={canManageFinance}
    onCloneClick={() => setIsCloneDialogOpen(true)}
    onCreateManualClick={() => {
      setEditingFeeStructure(null);
      setIsFeeStructureOpen(true);
    }}
  />
)}
```

- [ ] **Step 5: Run tests and build**

Run: `node --test src/**/*.test.mjs`
Run: `npm run build`
Expected: All tests pass, build completes in <3s with 0 errors.

- [ ] **Step 6: Commit and push**

```bash
git add src/features/finance/pages/FeeStructuresPage.tsx
git commit -m "feat(finance-ui): implement smart onboarding banner and header overflow menu for fee cloning"
git push origin nabin
```

---

## Verification Plan

### Automated Tests
1. Run all unit tests:
   ```bash
   node --test src/**/*.test.mjs
   ```
2. Run frontend production bundle:
   ```bash
   npm run build
   ```

### Manual Verification
1. **Empty Session (0 fee structures)**:
   - Navigate to Fee Structures page for an empty academic session.
   - Verify the `SessionFeeOnboardingBanner` appears with purple/sparkle accents.
   - Verify clicking "Clone from Previous Session" opens the modal pre-filled with the latest session.
   - Verify the header does NOT show the old clunky clone button; it shows `Add Fee Structure` and `...`.
2. **Session with Fees (> 0 fee structures)**:
   - The banner is hidden.
   - The header shows `+ Add Fee Structure` and `...` dropdown menu.
   - Clicking `...` -> "Clone from Previous Session" opens the clone dialog as expected.
