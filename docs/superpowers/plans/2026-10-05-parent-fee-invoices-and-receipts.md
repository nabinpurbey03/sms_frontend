# Parent Fee Invoices & Payment Receipts Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable parents to securely view, inspect, and print official fee invoices (bills) and payment receipt vouchers for their linked children in the Parent Portal with full ReBAC security and UI/UX Pro Max standards.

**Architecture:**
- **Backend ReBAC Layer:** Expand `GET /tenants/{tenant_id}/bills/{bill_id}` and `GET /tenants/{tenant_id}/payments/{payment_id}/receipt` to permit `UserRole.PARENT`. Enforce relation-based access control (ReBAC) ensuring parents can strictly only fetch records where `student_id` is linked to them via `ParentStudentMapping`.
- **Payment Linkage on Bills:** Add a lightweight `FeeBillPaymentDTO` list to `FeeBillResponseDTO` and populate it in `get_parent_children_fees` and `get_bill`, enabling the frontend to link bills directly to their payment receipts.
- **Frontend Portal Experience:** In `ParentFeeStatusPage.tsx`, integrate direct "View Invoice" (`PrintableBillModal`) and "View Receipt" (`PrintableReceiptModal`) action buttons with dual-calendar formatting and accessible modals.

**Tech Stack:** FastAPI, SQLAlchemy 2.0, Pydantic v2, React 19, Vite, Tailwind CSS, Radix UI, Lucide Icons.

**Spec / Requirements:**
- ReBAC enforcement: non-linked parents must receive HTTP 403 Forbidden.
- Accountants and Admins maintain full school-wide access without regressions.
- Mobile and desktop responsive layout with zero UI layout shifts.
- Print-ready modal preview matching existing school branding.

## Global Constraints
- ReBAC: Always query `ParentStudentMapping` with `tenant_id` and `deleted_at.is_(None)` for parent role checks.
- Backwards compatibility: `FeeBillResponseDTO.payments` defaults to empty list `[]`.
- Testing: 100% test pass rate in both `pytest` and `npm run test` / `npm run build`.

---

### Task 1: Backend - ReBAC Access Control for Parent Invoices & Receipts

**Files:**
- Modify: `backend/src/modules/finance/router.py:410-424, 526-540`
- Modify: `backend/src/modules/finance/schemas.py:213-249`
- Modify: `backend/src/modules/finance/service.py:1645-1710, 2337-2380, 3025-3075`
- Test: `backend/tests/test_parent_receipt_access.py`

**Interfaces:**
- Consumes: `ParentStudentMapping`, `FeeBill`, `FeePayment`, `UserRole.PARENT`
- Produces:
  - `FeeBillPaymentDTO(id, receipt_number, amount_paid, payment_date, payment_method, transaction_reference)`
  - `FeeBillResponseDTO.payments: list[FeeBillPaymentDTO]`
  - ReBAC checks on `get_bill` and `get_receipt_document`

- [ ] **Step 1: Write failing automated tests for Parent ReBAC invoice & receipt access**
Create `backend/tests/test_parent_receipt_access.py`:
- Test that Parent 1 can fetch their child's bill (`GET /bills/{bill_id}`) and payment receipt (`GET /payments/{payment_id}/receipt`).
- Test that Parent 2 cannot fetch Parent 1's child's bill or receipt (assert HTTP 403 Forbidden).
- Test that `GET /parents/me/children-fees` returns `payments` array on each bill.

- [ ] **Step 2: Run pytest to verify tests fail**
Run: `.venv\Scripts\pytest tests/test_parent_receipt_access.py -v`
Expected: FAIL (403 on parent role or missing endpoint permission / schema field).

- [ ] **Step 3: Update `schemas.py` with `FeeBillPaymentDTO`**
Add `FeeBillPaymentDTO` and include `payments: list[FeeBillPaymentDTO] = []` on `FeeBillResponseDTO`.

- [ ] **Step 4: Update `service.py` to populate payments and enforce ReBAC checks**
In `service.py`:
- In `get_bill`, accept `current_user: Optional[User] = None`. If `current_user` is parent, assert `ParentStudentMapping` exists.
- In `get_receipt_document`, accept `current_user: Optional[User] = None`. If `current_user` is parent, assert `ParentStudentMapping` exists between parent and `payment.student_id`.
- In `get_parent_children_fees`, populate `payments` on each `FeeBillResponseDTO`.

- [ ] **Step 5: Update `router.py` to allow `UserRole.PARENT` on `/bills/{bill_id}` and `/payments/{payment_id}/receipt`**
Pass `member.user` into `FinanceService.get_bill` and `FinanceService.get_receipt_document`.

- [ ] **Step 6: Run pytest to verify all tests pass**
Run: `.venv\Scripts\pytest tests/test_parent_receipt_access.py tests/test_finance_bugfixes.py -v`
Expected: PASS.

- [ ] **Step 7: Commit backend changes**
```bash
git add src/modules/finance/ tests/test_parent_receipt_access.py
git commit -m "feat(finance): grant parents ReBAC access to children fee bills and payment receipts"
```

---

### Task 2: Frontend - Types & Integration in `ParentFeeStatusPage`

**Files:**
- Modify: `frontend/src/features/finance/types.ts:194-220`
- Modify: `frontend/src/features/finance/pages/ParentFeeStatusPage.tsx`
- Test: `frontend/src/features/finance/pages/__tests__/ParentFeeStatusPage.test.mjs` (or unit test suite)

**Interfaces:**
- Consumes: `FeeBill.payments`, `PrintableBillModal`, `PrintableReceiptModal`, `useParentChildrenFees`
- Produces:
  - Interactive "View Invoice" modal trigger for every bill
  - Interactive "View Receipt" modal trigger for paid/partially-paid bills (with multi-receipt dropdown if partial installments exist)

- [ ] **Step 1: Update `types.ts`**
Add `FeeBillPaymentSummary` interface and add `payments?: FeeBillPaymentSummary[]` to `FeeBill`.

- [ ] **Step 2: Add failing unit tests for receipt/invoice action logic**
Write unit test verifying helper/state logic for rendering receipt triggers when payments exist vs when unpaid.

- [ ] **Step 3: Implement Actions in `ParentFeeStatusPage.tsx`**
In `ParentFeeStatusPage.tsx`:
- Add state: `selectedBillId: string | null`, `selectedReceiptPaymentId: string | null`.
- Add an "Actions" column to the Bills Table:
  - Button 1: "Invoice" with `FileText` icon. Triggers `setSelectedBillId(bill.id)`.
  - Button 2: "Receipt" with `Receipt` icon.
    - If `bill.payments` has 1 payment, clicking directly sets `setSelectedReceiptPaymentId(bill.payments[0].id)`.
    - If `bill.payments` has multiple payments, renders a clean popover/dropdown listing each payment date, receipt #, and amount.
    - If no payments recorded (`bill.paid_amount == 0`), disabled or hidden with subtle placeholder.
- Mount `<PrintableBillModal isOpen={!!selectedBillId} onClose={() => setSelectedBillId(null)} tenantId={activeTenantId} billId={selectedBillId} />`.
- Mount `<PrintableReceiptModal isOpen={!!selectedReceiptPaymentId} onClose={() => setSelectedReceiptPaymentId(null)} tenantId={activeTenantId} paymentId={selectedReceiptPaymentId} />`.

- [ ] **Step 4: Verify frontend tests and production build**
Run:
```bash
node --test src/**/*.test.mjs
npm run build
```
Expected: PASS with 0 build/type errors.

- [ ] **Step 5: Commit frontend changes**
```bash
git add src/features/finance/types.ts src/features/finance/pages/ParentFeeStatusPage.tsx
git commit -m "feat(finance): add invoice and printable receipt viewer in parent portal"
```

---

### Task 3: Comprehensive Verification & Security Testing

**Files:**
- Verification only

- [ ] **Step 1: Run complete backend test suite**
Run: `.venv\Scripts\pytest tests/test_parent_receipt_access.py -v`
Expected: 100% passing.

- [ ] **Step 2: Run complete frontend build & tests**
Run: `npm run build && node --test src/**/*.test.mjs`
Expected: 0 errors.

- [ ] **Step 3: Verify git status and clean branches**
Verify both repositories are clean and ready.
