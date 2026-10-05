# Automatic Fee Structure Rollover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically duplicate all active School-level and Class-level fee structures when rolling over academic sessions in backend, and eliminate manual "Clone from Previous Session" buttons, banners, and modals from the frontend Fee Structures page.

**Architecture:** During `tenant_rollover` and `platform_rollover`, copy active `FeeStructure` records from `old_year` into `new_year` with exact amounts and category mappings while preserving idempotency. Remove manual cloning artifacts from `FeeStructuresPage.tsx`, leaving a clean in-place Add & Edit interface.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2.0, PostgreSQL, React 19, Vite, TanStack Router/Query, Tailwind CSS, Radix UI.

**Spec:** [`docs/superpowers/specs/2026-10-05-automatic-fee-structure-rollover-design.md`](file:///E:/SSUP/frontend/docs/superpowers/specs/2026-10-05-automatic-fee-structure-rollover-design.md)

## Global Constraints
- Multi-tenant data isolation: all queries and insertions scoped strictly by `tenant_id` and `academic_year_id`.
- Idempotency: Re-running rollover or executing rollover for an existing year never creates duplicate fee structure rows.
- Zero manual clone buttons: The Fee Structures page must not show any "Clone from Previous Session" button, banner, or dropdown.
- Clean code and strict typing: 100% tests passing in both backend and frontend.

---

### Task 1: Backend Automatic Fee Structure Rollover & Automated Tests

**Files:**
- Modify: `E:\SSUP\backend\src\modules\academic\service.py`
- Test: `E:\SSUP\backend\tests\test_academic_rollover.py` (or new test file `tests/test_fee_structure_rollover.py`)

**Interfaces:**
- Consumes: `FeeStructure` from `src.modules.finance.models`
- Produces: Auto-duplicated `FeeStructure` rows in `new_year` upon `tenant_rollover` and `platform_rollover`.

- [ ] **Step 1: Write the failing tests**
  In `tests/test_fee_structure_rollover.py`:
  - Test 1: `test_tenant_rollover_automatically_clones_fee_structures`:
    - Setup tenant, classes, `old_year`.
    - Create 1 School-wide fee structure (`amount=500.00`, `fee_level="SCHOOL"`, `class_id=None`).
    - Create 1 Class-level fee structure for Class 1 (`amount=1200.00`, `fee_level="CLASS"`, `class_id=class1.id`).
    - Execute `AcademicService.tenant_rollover(...)`.
    - Assert that `new_year` has exactly 2 fee structures with matching names, amounts, categories, and frequencies.
  - Test 2: `test_tenant_rollover_fee_cloning_is_idempotent`:
    - Running duplicate check does not insert duplicate rows.

- [ ] **Step 2: Run test to verify failure**
  ```bash
  .venv\Scripts\pytest tests/test_fee_structure_rollover.py -v
  ```

- [ ] **Step 3: Implement fee structure duplication in `src/modules/academic/service.py`**
  - In `tenant_rollover`:
    - After student promotions and teacher assignments, query all active `FeeStructure` records in `old_year`.
    - Loop through and insert corresponding `FeeStructure` records into `new_year` if not already present.
  - In `platform_rollover`:
    - Ensure the same duplication logic runs for each tenant affected.

- [ ] **Step 4: Run tests to verify passing**
  ```bash
  .venv\Scripts\pytest tests/test_fee_structure_rollover.py -v
  ```

- [ ] **Step 5: Commit changes**
  ```bash
  git add src/modules/academic/service.py tests/test_fee_structure_rollover.py
  git commit -m "feat(academic,finance): automatically carry over fee structures during session rollover"
  ```

---

### Task 2: Frontend Fee Structures Page Simplification

**Files:**
- Modify: `E:\SSUP\frontend\src\features\finance\pages\FeeStructuresPage.tsx`
- Remove / Clean: Unused imports from `src/features/finance/components/` and `src/features/finance/utils/feeCloneUtils.ts`

**Interfaces:**
- Consumes: `useFeeStructures`, `useCurrentAcademicYear`
- Produces: Streamlined `FeeStructuresPage` with no clone button, banner, or dropdown.

- [ ] **Step 1: Clean up `FeeStructuresPage.tsx`**
  - Remove `isCloneDialogOpen` and `setIsCloneDialogOpen`.
  - Remove `CloneFeeStructuresDialog`.
  - Remove `SessionFeeOnboardingBanner`.
  - Remove `computeSessionCloneBannerState` and `bannerState`.
  - Remove `DropdownMenu` ("More actions" / `MoreHorizontal`) next to `Add Fee Head`.
  - The header actions now cleanly display:
    ```tsx
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
        <Calendar className="w-3.5 h-3.5 text-primary" />
        <span>Session: {currentYear?.name || 'Active Session'}</span>
      </div>

      <Button
        size="sm"
        onClick={() => {
          setEditingFeeStructure(null);
          setSelectedClassIdForAdd('');
          setIsFeeStructureOpen(true);
        }}
        className="gap-1.5 text-xs shadow-xs cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Add Fee Head</span>
      </Button>
    </div>
    ```

- [ ] **Step 2: Run frontend unit tests & build**
  ```bash
  node --test src/**/*.test.mjs
  npm run build
  ```

- [ ] **Step 3: Commit changes**
  ```bash
  git add src/features/finance/pages/FeeStructuresPage.tsx
  git commit -m "refactor(finance): remove manual clone button and onboarding banner from fee structures page"
  ```

---

### Task 3: Full End-to-End Verification & Remote Push

**Files:**
- Both repositories (`E:\SSUP\backend` and `E:\SSUP\frontend`)

- [ ] **Step 1: Backend full test suite run**
  ```bash
  .venv\Scripts\pytest -v
  ```

- [ ] **Step 2: Frontend full test suite run & production build**
  ```bash
  node --test src/**/*.test.mjs
  npm run build
  ```

- [ ] **Step 3: Push changes to remote**
  - Push backend changes to `sms_backend`.
  - Push frontend changes to `sms_frontend`.
