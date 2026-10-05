# Design Spec: Automatic Fee Structure Rollover & In-Place Editing

- **Author**: Antigravity Assistant & Pair Programmer
- **Date**: 2026-10-05
- **Status**: APPROVED (in design review)
- **Scope**: Backend Academic Rollover Engine & Frontend Fee Structures Simplification

---

## 1. Overview & Problem Statement

Previously, when an academic session rolled over (e.g., from 2081 BS to 2082 BS), fee structures were not copied automatically. Instead, administrators had to discover and execute a manual "Clone Fee Structures from Previous Session" action on the Fee Structures page.

In reality, over 90% of school fee schedules remain identical from year to year (e.g., Class 1 Monthly Tuition, Computer Lab Fee, Examination Fee). Forcing administrators to manually clone fee structures creates unnecessary friction, layout clutter, and risks operational delay if fees are forgotten prior to monthly batch billing.

### Solution
1. **Automatic Backend Rollover**: During both Tenant Rollover and Platform Rollover, the engine automatically copies all active School-level and Class-level fee structures from the outgoing session into the new academic year at 1:1 rates.
2. **Frontend Simplification**: The Fee Structures page (`/finance/structures`) removes all manual "Clone from Previous Session" buttons, onboarding banners, and clone dialogs. The page becomes purely an **Add & Edit** dashboard for the active session. If rates need adjustment, administrators simply edit the fee head in place.

---

## 2. Backend Architecture: Automatic Rollover Engine

### 2.1 File Location
- `src/modules/academic/service.py` in `E:\SSUP\backend`:
  - `tenant_rollover(...)`
  - `platform_rollover(...)`

### 2.2 Duplication Logic & Data Flow
When a new academic year (`new_year`) is activated:
1. **Query Outgoing Fee Structures**:
   ```python
   old_fee_structures = list(
       db.scalars(
           select(FeeStructure).where(
               FeeStructure.tenant_id == tenant_id,
               FeeStructure.academic_year_id == old_year.id,
               FeeStructure.is_active == True,
               FeeStructure.deleted_at == None,
           )
       ).all()
   )
   ```
2. **Duplicate into New Session**:
   For each `fs` in `old_fee_structures`:
   - Check if a record with `(tenant_id, new_year.id, class_id, name)` already exists (idempotency guard).
   - If not present, create a new `FeeStructure`:
     - `tenant_id = tenant_id`
     - `academic_year_id = new_year.id`
     - `fee_level = fs.fee_level` (`SCHOOL` or `CLASS`)
     - `class_id = fs.class_id`
     - `name = fs.name`
     - `fee_category = fs.fee_category`
     - `frequency = fs.frequency`
     - `amount = fs.amount`
     - `description = fs.description`
     - `is_active = True`
3. **Student Recurring Facility Assignments**:
   When promoting an active student ($N \to N+1$), copy any active recurring `StudentFeeAssignment` records (e.g., Transport, Hostel) to `new_year.id` so student facilities continue uninterrupted.

### 2.3 Idempotency & Database Integrity
- Preserves the database unique constraint `uq_tenant_class_fee_structure_name` (`tenant_id`, `academic_year_id`, `class_id`, `name`).
- Rollback safety: Wrapped in the existing rollover database transaction (`db.flush()` and `db.commit()`).

---

## 3. Frontend Architecture: Fee Structures Page Simplification

### 3.1 File Locations
- `src/features/finance/pages/FeeStructuresPage.tsx`
- `src/features/finance/components/`

### 3.2 UI Changes in `FeeStructuresPage.tsx`
1. **Header Action Bar**:
   - Remove the `DropdownMenu` ("More actions" / `MoreHorizontal`) containing "Clone from Previous Session".
   - Keep only:
     - `Session: {currentYear?.name || 'Active Session'}` pill badge.
     - `+ Add Fee Head` primary button.
2. **Banner Removal**:
   - Remove `<SessionFeeOnboardingBanner>` and the `bannerState` calculation logic.
3. **Dialog Cleanup**:
   - Remove `<CloneFeeStructuresDialog>` component and `isCloneDialogOpen` state from `FeeStructuresPage.tsx`.
4. **Empty State for Brand-New Schools**:
   - When a school has 0 fee heads (e.g. Day 0 of a brand-new school setup), the existing standard empty state is shown inviting the user to click `+ Add Fee Head`.

---

## 4. Verification & Testing Plan

### 4.1 Backend Automated Tests (`E:\SSUP\backend`)
1. **`test_tenant_rollover_clones_fee_structures`**:
   - Create tenant, classes, `old_year`, and add School-level fee (e.g. NPR 500 Maintenance) and Class-level fee (e.g. Class 1 Tuition NPR 1,200).
   - Execute `tenant_rollover` to `new_year`.
   - Assert that `new_year` has exactly the same fee structures with identical amounts and classes.
   - Assert that re-running rollover does not create duplicate entries (idempotency).
2. **`test_platform_rollover_clones_fee_structures`**:
   - Execute platform rollover across multiple tenants; assert each tenant's fee structures carried forward.

### 4.2 Frontend Automated Tests (`E:\SSUP\frontend`)
1. **Build & Typecheck**:
   - `npm run build` passes with 0 TypeScript/bundling errors.
2. **Unit Tests**:
   - Run `node --test src/**/*.test.mjs` ensuring all 92 tests pass.
