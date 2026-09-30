# Finance Management & Academic Year Operational Scoping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a comprehensive school finance management system (class-level monthly/yearly fee structures, student percentage discounts, 1-click batch billing, payment collection with partial payments, printable receipts and bills, automatic dues carryover upon session change, and a dedicated `ACCOUNTANT` role with 1-accountant per school rule), while enforcing academic year operational locking strictly to the current active session outside of Dashboard and Analytics.

**Architecture:** 
- Backend: Modular domain under `src/modules/finance/` using FastAPI, SQLAlchemy 2.0 (`TenantBase`), Pydantic v2 schemas, and Alembic migrations. Identity module updated to support `ACCOUNTANT` appointment and the single-accountant invariant. Academic session rollover hooked to automatically carry forward unpaid student dues.
- Frontend: Feature slice under `src/features/finance/` adhering to the 5-file slice standard (pages, components, hooks, api, schema, types) using React 19, TanStack Router route guards (`beforeLoad`), TanStack Query, Radix UI, Lucide icons, and Tailwind CSS v4. Print-optimized A4/A5 receipt and invoice modals with `@media print`.

**Tech Stack:** Python 3.12+, FastAPI, SQLAlchemy 2.0, PostgreSQL/SQLite, pytest, React 19, TypeScript ~5.8, Vite, TanStack Router, TanStack Query, Tailwind CSS v4, Lucide React, Sonner.

**Spec:** `docs/superpowers/specs/2026-09-30-finance-management-design.md`

## Global Constraints
- Every finance entity must inherit from `TenantBase` and enforce `tenant_id` isolation.
- `ACCOUNTANT` role can only be appointed by `ADMIN` (Principal) or `SUPER_ADMIN`.
- A school tenant can have at most ONE active `ACCOUNTANT`.
- Financial operations (creating fee structures, generating bills, recording payments) are locked strictly to the active current session (`is_current: true`).
- Academic year switching is permitted ONLY on Dashboard and Academic Analytics pages.

---

### Task 1: Backend Role & Governance (Accountant Role & Single Accountant Invariant)

**Files:**
- Modify: `backend/src/common/enums.py`
- Modify: `backend/src/modules/identity/router.py`
- Modify: `backend/src/modules/identity/service.py`
- Test: `backend/tests/test_finance_management.py`

**Interfaces:**
- Consumes: `UserRole`, `TenantUserRole`, `AuthService._handle_assign_member`
- Produces: `POST /api/v1/tenants/{tenant_id}/members/accountant` endpoint

- [x] **Step 1: Write failing tests for Accountant appointment and single-accountant invariant**
  Create `backend/tests/test_finance_management.py` testing:
  - Admin assigns User A as Accountant -> returns 201 Created with role ACCOUNTANT.
  - Admin attempts to assign User B as Accountant while User A is active -> returns 400 Bad Request with explanatory message.
  - Admin deactivates User A's role and assigns User B -> returns 201 Created.

- [x] **Step 2: Run test to verify it fails**
  Run: `pytest tests/test_finance_management.py -k test_single_accountant_invariant -v` in `backend/`
  Expected: FAIL (Role/endpoint not implemented)

- [x] **Step 3: Implement minimal code in enums, identity service, and router**
  - Add `ACCOUNTANT = "ACCOUNTANT"` in `backend/src/common/enums.py`.
  - In `AuthService.assign_tenant_member`, add check: if `role == UserRole.ACCOUNTANT`, verify that no active accountant exists for `tenant_id`. If one exists and is active, raise `BadRequestException`.
  - In `backend/src/modules/identity/router.py`, add `POST /tenants/{tenant_id}/members/accountant` requiring `UserRole.ADMIN`.

- [x] **Step 4: Run test to verify it passes**
  Run: `pytest tests/test_finance_management.py -k test_single_accountant_invariant -v`
  Expected: PASS

- [x] **Step 5: Commit**
  ```bash
  git -C ../backend add src/common/enums.py src/modules/identity/router.py src/modules/identity/service.py tests/test_finance_management.py
  git -C ../backend commit -m "feat(identity): add ACCOUNTANT role with single-accountant invariant"
  ```

---

### Task 2: Backend Finance Database Models & Enums

**Files:**
- Create: `backend/src/modules/finance/enums.py`
- Create: `backend/src/modules/finance/models.py`
- Modify: `backend/alembic/env.py`
- Test: `backend/tests/test_finance_management.py`

**Interfaces:**
- Consumes: `TenantBase`, `Base`, `AcademicYear`, `Class`, `Student`, `User`
- Produces: `FeeStructure`, `StudentDiscount`, `FeeBill`, `FeeBillItem`, `FeePayment` models

- [x] **Step 1: Write model instantiation and relationship tests**
  Add unit tests in `test_finance_management.py` testing creation of `FeeStructure`, `StudentDiscount`, `FeeBill` with items, and `FeePayment`.

- [x] **Step 2: Run test to verify it fails**
  Run: `pytest tests/test_finance_management.py -k test_finance_models -v`
  Expected: FAIL

- [x] **Step 3: Implement enums and SQLAlchemy models**
  - In `enums.py`: `FeeCategory`, `FeeFrequency`, `BillStatus`, `PaymentMethod`.
  - In `models.py`:
    - `FeeStructure(TenantBase)`: `academic_year_id`, `class_id`, `name`, `fee_category`, `frequency`, `amount`, `description`, `is_active`.
    - `StudentDiscount(TenantBase)`: `academic_year_id`, `student_id`, `discount_percent`, `reason`, `is_active`.
    - `FeeBill(TenantBase)`: `bill_number`, `student_id`, `class_id`, `academic_year_id`, `bill_title`, `billing_month`, `issue_date`, `due_date`, `subtotal_amount`, `discount_percent`, `discount_amount`, `previous_due_amount`, `total_payable`, `paid_amount`, `due_amount`, `status`, `notes`, `created_by_user_id`.
    - `FeeBillItem`: `id`, `bill_id`, `fee_structure_id`, `fee_name`, `amount`.
    - `FeePayment(TenantBase)`: `receipt_number`, `bill_id`, `student_id`, `academic_year_id`, `amount_paid`, `payment_method`, `transaction_reference`, `payment_date`, `received_by_user_id`, `remarks`.
  - Import models in `alembic/env.py` and run migration or auto-create metadata.

- [x] **Step 4: Run test to verify it passes**
  Run: `pytest tests/test_finance_management.py -k test_finance_models -v`
  Expected: PASS

- [x] **Step 5: Commit**
  ```bash
  git -C ../backend add src/modules/finance/ alembic/ tests/
  git -C ../backend commit -m "feat(finance): add database models and enums for school finance"
  ```

---

### Task 3: Backend Finance Service, Schemas & API Endpoints

**Files:**
- Create: `backend/src/modules/finance/schemas.py`
- Create: `backend/src/modules/finance/service.py`
- Modify: `backend/src/modules/finance/router.py`
- Modify: `backend/src/api/v1_router.py`
- Modify: `backend/src/modules/academic/service.py` (hook dues carryover into session activation)
- Test: `backend/tests/test_finance_management.py`

**Interfaces:**
- Consumes: Finance models, `TenantMembershipContext`, `require_roles(ADMIN, ACCOUNTANT)`
- Produces: REST endpoints under `/api/v1/finance/tenants/{tenant_id}/...`

- [x] **Step 1: Write tests for fee structures, bill generation, discount calculations, payments, and rollover carryover**
  In `test_finance_management.py`:
  - `test_fee_structure_lifecycle`: Create, list by class, update, delete.
  - `test_batch_bill_generation_with_discounts`: Create 2 students (one with 20% discount), generate batch bills, verify math.
  - `test_payment_collection_partial_and_full`: Pay partial, verify status `PARTIAL`; pay balance, verify status `PAID` and receipt number generated.
  - `test_academic_year_dues_carryover`: Student has unpaid dues in Year 1; when Year 2 is activated, verify opening due bill is created in Year 2.

- [x] **Step 2: Run test to verify it fails**
  Run: `pytest tests/test_finance_management.py -v`
  Expected: FAIL

- [x] **Step 3: Implement schemas, service, and router**
  - Implement Pydantic DTOs in `schemas.py`.
  - Implement `FinanceService` in `service.py`:
    - `create_fee_structure`, `list_fee_structures`, `update_fee_structure`, `delete_fee_structure`.
    - `set_student_discount`, `get_student_discount`, `list_student_discounts`.
    - `generate_batch_bills`, `generate_single_bill`, `list_bills`, `get_bill`, `cancel_bill`.
    - `record_payment`, `list_payments`, `get_receipt_document`.
    - `get_student_ledger`, `get_dashboard_summary`.
    - `carry_forward_dues(tenant_id, from_year_id, to_year_id)`.
  - Mount all routes in `router.py` guarded by `require_roles(UserRole.ADMIN, UserRole.ACCOUNTANT)`.
  - Call `FinanceService.carry_forward_dues` inside `AcademicYearService.set_current_academic_year`.
  - Mount router in `src/api/v1_router.py`.

- [x] **Step 4: Run test to verify it passes**
  Run: `pytest tests/test_finance_management.py -v`
  Expected: ALL TESTS PASS

- [x] **Step 5: Commit**
  ```bash
  git -C ../backend add src/modules/finance/ src/api/v1_router.py src/modules/academic/service.py tests/
  git -C ../backend commit -m "feat(finance): implement finance service, schemas, endpoints and dues carryover"
  ```

---

### Task 4: Frontend Core Config (Permissions, Role Formatting, Navigation)

**Files:**
- Modify: `frontend/src/config/permissions.ts`
- Modify: `frontend/src/components/layout/AppShell.tsx`
- Modify: `frontend/src/components/layout/TopHeader.tsx`
- Modify: `frontend/src/components/layout/navConfig.ts`
- Modify: `frontend/src/components/ui/badge.tsx`

**Interfaces:**
- Consumes: `Role`, `PERMISSION_MATRIX`, `getNavItems`
- Produces: `MANAGE_FINANCE`, `VIEW_FINANCE` permissions, Finance nav group, Accountant role formatting

- [x] **Step 1: Update permissions and roles**
  - Add `'ACCOUNTANT'` to `Role` type in `permissions.ts`.
  - Add `MANAGE_FINANCE` and `VIEW_FINANCE` in `PERMISSION_MATRIX`.
  - Update `formatRole` in `AppShell.tsx` and `TopHeader.tsx` to handle `'ACCOUNTANT' -> 'Accountant'`.
  - Add `role-accountant` badge variant in `badge.tsx`.

- [x] **Step 2: Add Finance navigation section in navConfig.ts**
  - Add nav items for `ADMIN` and `ACCOUNTANT`:
    - Finance Overview (`/finance`)
    - Bills & Invoices (`/finance/bills`)
    - Collect Payment (`/finance/collect`)
    - Fee Structures (`/finance/structures`)
    - Receipts & History (`/finance/transactions`)

- [x] **Step 3: Verify TypeScript and Oxlint**
  Run: `npm run build` in `frontend/`
  Expected: Passes without role or permission errors.

- [x] **Step 4: Commit**
  ```bash
  git add src/config/permissions.ts src/components/layout/ src/components/ui/badge.tsx
  git commit -m "feat(nav): add ACCOUNTANT role, finance permissions, and sidebar navigation"
  ```

---

### Task 5: Frontend Finance Feature Slice (Types, Schema, API, Hooks)

**Files:**
- Create: `frontend/src/features/finance/types.ts`
- Create: `frontend/src/features/finance/schema.ts`
- Create: `frontend/src/features/finance/api.ts`
- Create: `frontend/src/features/finance/hooks.ts`

**Interfaces:**
- Consumes: Axios client `@/api/client`, `useAuth`, TanStack Query
- Produces: `useFeeStructures`, `useBills`, `usePayments`, `useStudentLedger`, `useFinanceSummary`, `useCollectPayment`, `useBatchGenerateBills`

- [x] **Step 1: Define TypeScript models and enums in types.ts**
  `FeeStructure`, `FeeBill`, `FeeBillItem`, `FeePayment`, `StudentDiscount`, `StudentLedgerResponse`, `FinanceDashboardSummary`.

- [x] **Step 2: Define Zod validation schemas in schema.ts**
  `feeStructureFormSchema`, `batchBillGenerateSchema`, `paymentCollectSchema`, `studentDiscountSchema`.

- [x] **Step 3: Implement strongly typed Axios client calls in api.ts**
  All API calls injecting tenant path `/api/v1/finance/tenants/${tenantId}/...`.

- [x] **Step 4: Implement TanStack Query hooks in hooks.ts**
  Standard query hooks and mutation hooks with automatic cache invalidation (`invalidateQueries(['finance'])`).

- [x] **Step 5: Verify build**
  Run: `npm run build`
  Expected: Clean compile.

- [x] **Step 6: Commit**
  ```bash
  git add src/features/finance/
  git commit -m "feat(finance): add frontend types, schemas, API client and query hooks"
  ```

---

### Task 6: Frontend Dialogs & Printable Document Modals

**Files:**
- Create: `frontend/src/features/finance/components/FeeStructureDialog.tsx`
- Create: `frontend/src/features/finance/components/BatchBillGenerateDialog.tsx`
- Create: `frontend/src/features/finance/components/PaymentCollectDialog.tsx`
- Create: `frontend/src/features/finance/components/StudentDiscountDialog.tsx`
- Create: `frontend/src/features/finance/components/PrintableReceiptModal.tsx`
- Create: `frontend/src/features/finance/components/PrintableBillModal.tsx`

**Interfaces:**
- Consumes: Radix Dialog primitives, `sonner`, `useCollectPayment`, `useBatchGenerateBills`
- Produces: Reusable finance modals with `@media print` CSS for official receipts and invoices

- [x] **Step 1: Implement FeeStructureDialog & StudentDiscountDialog**
  Clean accessible dialogs using React Hook Form + Zod.

- [x] **Step 2: Implement BatchBillGenerateDialog**
  Wizard to choose class, billing month, fee heads, due date, preview student count and estimated revenue with discounts.

- [x] **Step 3: Implement PaymentCollectDialog**
  Modal to search student, display unpaid bills & carried dues, input payment amount (supporting partial payment), select mode, and trigger instant print.

- [x] **Step 4: Implement PrintableReceiptModal & PrintableBillModal**
  Official A4/A5 receipt document containing school header, student info, line items, discounts, previous dues, paid amount, amount in words, and cashier signature line with `@media print` rules.

- [x] **Step 5: Verify build**
  Run: `npm run build`
  Expected: Clean compile.

- [x] **Step 6: Commit**
  ```bash
  git add src/features/finance/components/
  git commit -m "feat(finance): add finance modals, batch billing wizard and printable receipt"
  ```

---

### Task 7: Frontend Pages & Router Integration

**Files:**
- Create: `frontend/src/features/finance/pages/FinanceDashboardPage.tsx`
- Create: `frontend/src/features/finance/pages/BillsPage.tsx`
- Create: `frontend/src/features/finance/pages/CollectPaymentPage.tsx`
- Create: `frontend/src/features/finance/pages/FeeStructuresPage.tsx`
- Create: `frontend/src/features/finance/pages/TransactionsPage.tsx`
- Create: `frontend/src/features/finance/pages/StudentLedgerPage.tsx`
- Modify: `frontend/src/app/router.tsx`

**Interfaces:**
- Consumes: Feature components, `usePermission`, `useCurrentAcademicYear`
- Produces: Protected finance routes mounted under `/finance/*`

- [x] **Step 1: Implement FinanceDashboardPage.tsx**
  - Displays locked session badge (`Academic Session: 2081/82 (Current Active)`).
  - KPI StatCards (Total Collected, Outstanding Dues, Collection Rate, Defaulters).
  - Quick action buttons (Collect Payment, Batch Generate, New Structure).
  - Recent payment activity stream with 1-click receipt print.

- [x] **Step 2: Implement BillsPage, CollectPaymentPage, FeeStructuresPage, TransactionsPage, StudentLedgerPage**
  - Fully responsive with stacked data tables on mobile (`ResponsiveDataTable`).
  - Search, filter by status and class, clear filter buttons.

- [x] **Step 3: Register routes in router.tsx**
  - Guard `/finance` and sub-routes with `beforeLoad` checking `hasPermission(role, 'VIEW_FINANCE')`.

- [x] **Step 4: Verify build & router generation**
  Run: `npm run build`
  Expected: Clean build with 0 TypeScript errors.

- [x] **Step 5: Commit**
  ```bash
  git add src/features/finance/pages/ src/app/router.tsx
  git commit -m "feat(finance): implement finance pages and route registrations"
  ```

---

### Task 8: Member Management Integration & Academic Year Operational Locking Verification

**Files:**
- Modify: `frontend/src/features/members/pages/MembersPage.tsx` (Add Appoint Accountant action with single-accountant guidance)
- Verify: Academic year selectors strictly restricted to Dashboard and Analytics pages.
- Test: Full backend pytest test suite & frontend production build.

- [x] **Step 1: Add "Appoint Accountant" in MembersPage.tsx**
  Allows Principal (`ADMIN`) to search a registered user by 10-digit mobile number and assign the `ACCOUNTANT` role.

- [x] **Step 2: Audit and verify Academic Year locking**
  Verify that exam creation, attendance, and finance remain locked to the current academic year, while Dashboard and Analytics retain the selector dropdown.

- [x] **Step 3: Run full backend test suites**
  Run: `uv run pytest tests/test_finance_management.py -v`
  Run: `uv run pytest tests/test_authorization_flow.py -v`
  Expected: PASS

- [x] **Step 4: Run full frontend production build**
  Run: `npm run build`
  Expected: PASS

- [x] **Step 5: Commit**
  ```bash
  git add src/features/members/
  git commit -m "feat(members): integrate accountant appointment action for school principals"
  ```
