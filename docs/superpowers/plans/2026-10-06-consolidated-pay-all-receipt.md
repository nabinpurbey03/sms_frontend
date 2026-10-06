# Consolidated "Pay All" Receipt & Multi-Bill Settlement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide a unified Consolidated Payment Receipt (एकमुष्ठ शुल्क भुक्तानी रसिद) when settling multiple monthly fee bills via "Pay All Dues", auto-opening immediately after payment and remaining re-printable anytime from the Student Ledger.

**Architecture:** 
1. When `record_payment` runs in waterfall mode across multiple bills, stamp all created `FeePayment` records with a shared `payment_group_id` (e.g., `CREC-2081/82-0001`) and return full multi-bill `allocations` in `FeePaymentResponseDTO`.
2. Provide a backend endpoint `GET /api/v1/finance/tenants/{tenant_id}/receipts/consolidated/{identifier}` returning complete school, student, parent, and itemized bill allocations data with ReBAC enforcement.
3. Build a dedicated `<PrintableConsolidatedReceiptModal />` complying with UI/UX Pro Max and print stylesheet standards, and wire it into both `PaymentCollectDialog` (for immediate auto-display) and `StudentLedgerPage` (for persistent ledger re-printing).

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy, PostgreSQL, TypeScript, React 19, Tailwind CSS, TanStack Query, Radix UI, Lucide Icons.

**Spec:** [`docs/superpowers/specs/2026-10-06-consolidated-pay-all-receipt-design.md`](file:///E:/SSUP/frontend/docs/superpowers/specs/2026-10-06-consolidated-pay-all-receipt-design.md)

## Global Constraints
- Group receipt prefix: `CREC-` (Consolidated Receipt).
- Individual bill receipts retain standard `REC-` numbers.
- Text contrast: Pure `#0f172a` on pure `#ffffff` for paper printouts, WCAG AAA compliant.
- Numbers formatting: Monospace tabular numbers (`font-mono tabular-nums`) right-aligned.
- ReBAC: Parents can only view their linked children's receipts; staff have full tenant access.
- Non-destructive: Existing single-bill payments and receipts remain completely unaffected (`payment_group_id` is null for single bills).

---

### Task 1: Backend Data Model, Schemas, & Waterfall Stamping

**Files:**
- Modify: `E:/SSUP/backend/src/modules/finance/models.py:270-320`
- Modify: `E:/SSUP/backend/src/modules/finance/schemas.py:350-400`
- Modify: `E:/SSUP/backend/src/modules/finance/service.py:2460-2580`
- Test: `E:/SSUP/backend/tests/test_consolidated_receipt.py`

**Interfaces:**
- Produces:
  - `FeePayment.payment_group_id: Optional[str]`
  - `PaymentAllocationDTO`
  - `FeePaymentResponseDTO.payment_group_id`, `allocations`, `is_consolidated`, `total_transaction_amount`

- [ ] **Step 1: Write failing tests in `tests/test_consolidated_receipt.py`**
Test that multi-bill waterfall payment creates matching `payment_group_id` starting with `CREC-` across all payments, while single-bill payment leaves `payment_group_id` as `None`.

```python
def test_pay_all_waterfall_stamps_payment_group_id(consolidated_setup):
    # Setup student with 2 unpaid monthly bills (Baishakh 3000, Jestha 3000)
    # Pay 6000 with apply_waterfall=True
    # Verify response has is_consolidated=True, payment_group_id starting with 'CREC-'
    # Verify allocations has 2 items with bill_id, bill_number, amount_allocated=3000, remaining_due_after=0
```

- [ ] **Step 2: Run pytest to verify failure**
Run `.venv\Scripts\pytest tests/test_consolidated_receipt.py -v` and confirm failure.

- [ ] **Step 3: Update `FeePayment` model in `models.py`**
Add `payment_group_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)`.

- [ ] **Step 4: Add DTOs in `schemas.py`**
Add `PaymentAllocationDTO` and update `FeePaymentResponseDTO` with `payment_group_id`, `allocations`, `is_consolidated`, and `total_transaction_amount`.

- [ ] **Step 5: Implement group stamping in `service.py` (`record_payment`)**
When `apply_waterfall=True` and `len(created_payments) > 1`:
- Generate `group_id = cls._generate_receipt_number(db, tenant_id, ay.name, prefix="CREC")`.
- Stamp `p.payment_group_id = group_id` on each created payment.
- Return allocations and `is_consolidated=True`.

- [ ] **Step 6: Run pytest to verify tests pass**
Run `.venv\Scripts\pytest tests/test_consolidated_receipt.py -v`.

- [ ] **Step 7: Commit Task 1 in backend**
`git add src/modules/finance/models.py src/modules/finance/schemas.py src/modules/finance/service.py tests/test_consolidated_receipt.py`
`git commit -m "feat(finance): add payment_group_id and waterfall allocation stamping"`

---

### Task 2: Backend Consolidated Receipt Document Service & API Router

**Files:**
- Modify: `E:/SSUP/backend/src/modules/finance/schemas.py:400-440`
- Modify: `E:/SSUP/backend/src/modules/finance/service.py:2700-2800`
- Modify: `E:/SSUP/backend/src/modules/finance/router.py:530-580`
- Test: `E:/SSUP/backend/tests/test_consolidated_receipt.py`

**Interfaces:**
- Produces:
  - `ConsolidatedReceiptDocumentDTO`
  - `GET /api/v1/finance/tenants/{tenant_id}/receipts/consolidated/{identifier}`

- [ ] **Step 1: Write failing tests for consolidated receipt endpoint**
In `tests/test_consolidated_receipt.py`:
- `test_get_consolidated_receipt_by_group_id`: Verifies fetching by `CREC-...` returns correct school, student, parent, and allocations.
- `test_get_consolidated_receipt_by_payment_id`: Verifies fetching by one payment ID in the group resolves the whole consolidated document.
- `test_parent_rebac_access_to_consolidated_receipt`: Verifies parent can view their child's receipt, but 403 Forbidden for another student.

- [ ] **Step 2: Run pytest to verify failure**
Run `.venv\Scripts\pytest tests/test_consolidated_receipt.py -v`.

- [ ] **Step 3: Define `ConsolidatedReceiptDocumentDTO` in `schemas.py`**
Include `consolidated_receipt_number`, school details, student details, parent details, `allocations`, `total_amount_paid`, `amount_in_words`, and `total_account_balance_remaining`.

- [ ] **Step 4: Implement `get_consolidated_receipt_document` in `service.py`**
- Resolve payments by `payment_group_id` or `payment.id`.
- Fetch student, class, section, school settings, and parent mapping.
- Calculate allocations, remaining student account balance, and amount in words.

- [ ] **Step 5: Register API route in `router.py`**
`GET /tenants/{tenant_id}/receipts/consolidated/{identifier}` returning `ApiResponse[ConsolidatedReceiptDocumentDTO]`.

- [ ] **Step 6: Run pytest to verify pass**
Run `.venv\Scripts\pytest tests/test_consolidated_receipt.py -v`.

- [ ] **Step 7: Commit Task 2 in backend**
`git add src/modules/finance/schemas.py src/modules/finance/service.py src/modules/finance/router.py tests/test_consolidated_receipt.py`
`git commit -m "feat(finance): add consolidated receipt document service and endpoint"`

---

### Task 3: Frontend Types, API Hook, & Unit Tests

**Files:**
- Modify: `E:/SSUP/frontend/src/features/finance/types.ts`
- Modify: `E:/SSUP/frontend/src/features/finance/hooks.ts`
- Modify: `E:/SSUP/frontend/src/features/finance/components/__tests__/cashierAndReceipt.test.mjs`
- Test: `node --test src/features/finance/components/__tests__/cashierAndReceipt.test.mjs`

**Interfaces:**
- Produces:
  - `PaymentAllocation`, `ConsolidatedReceiptDocument` types
  - `useConsolidatedReceiptDocument(tenantId, identifier)` hook

- [ ] **Step 1: Write failing tests in `cashierAndReceipt.test.mjs`**
Add unit tests verifying parsing of consolidated receipt allocations, calculating total settled amount, and extracting group badges.

- [ ] **Step 2: Run test to verify failure**
`node --test src/features/finance/components/__tests__/cashierAndReceipt.test.mjs`

- [ ] **Step 3: Add TypeScript interfaces in `types.ts`**
Add `PaymentAllocation`, `ConsolidatedReceiptDocument`, and update `FeePayment` with `payment_group_id?: string | null` and `allocations?: PaymentAllocation[]`.

- [ ] **Step 4: Add `useConsolidatedReceiptDocument` in `hooks.ts`**
Call `apiClient.get<ApiResponse<ConsolidatedReceiptDocument>>(/finance/tenants/${tenantId}/receipts/consolidated/${identifier})`.

- [ ] **Step 5: Run tests and verify pass**
`node --test src/features/finance/components/__tests__/cashierAndReceipt.test.mjs`

- [ ] **Step 6: Commit Task 3 in frontend**
`git add src/features/finance/types.ts src/features/finance/hooks.ts src/features/finance/components/__tests__/cashierAndReceipt.test.mjs`
`git commit -m "feat(finance): add consolidated receipt types and api query hook"`

---

### Task 4: Frontend `<PrintableConsolidatedReceiptModal />` Component

**Files:**
- Create: `E:/SSUP/frontend/src/features/finance/components/PrintableConsolidatedReceiptModal.tsx`
- Modify: `E:/SSUP/frontend/src/features/finance/components/index.ts` (if exists)

**Interfaces:**
- Produces: `<PrintableConsolidatedReceiptModal isOpen onClose tenantId identifier />`

- [ ] **Step 1: Create `PrintableConsolidatedReceiptModal.tsx`**
- Dialog with responsive container.
- Header with print button and `Ctrl+P` hotkey handler.
- School letterhead: Name, Logo, Address, Phone, Email.
- Title: **CONSOLIDATED FEE PAYMENT RECEIPT** / **एकमुष्ठ शुल्क भुक्तानी रसिद**.
- Student info grid (Name, Class, Section, Roll, Parent Name, Phone).
- Table of settled invoices: S.N., Billing Month, Bill #, Amount Settled, Balance Left, Status Badge, Sub-Receipt #.
- Totals block: Total Paid, Amount in Words, Overall Student Balance Remaining.
- Signatures: Cashier Signature and Official School Seal.
- Print CSS: `@media print` with exact portrait styling.

- [ ] **Step 2: Run build to verify TypeScript compilation**
`npm run build` in `E:/SSUP/frontend`.

- [ ] **Step 3: Commit Task 4 in frontend**
`git add src/features/finance/components/PrintableConsolidatedReceiptModal.tsx`
`git commit -m "feat(finance): create printable consolidated receipt modal component"`

---

### Task 5: Frontend `PaymentCollectDialog` & `StudentLedgerPage` Integration

**Files:**
- Modify: `E:/SSUP/frontend/src/features/finance/pages/StudentLedgerPage.tsx`
- Modify: `E:/SSUP/frontend/src/features/finance/components/PaymentCollectDialog.tsx`

**Interfaces:**
- Consumes: `<PrintableConsolidatedReceiptModal />`, `FeePayment.payment_group_id`

- [ ] **Step 1: Update `PaymentCollectDialog.tsx` callback**
Ensure `onPaymentSuccess` passes the full payment response (including `payment_group_id` and `is_consolidated`).

- [ ] **Step 2: Update `StudentLedgerPage.tsx`**
- Add state `activeConsolidatedReceiptId: string | null`.
- In `onPaymentSuccess` of `isPayAllMode`:
  ```typescript
  if (payment?.payment_group_id || payment?.is_consolidated) {
    setActiveConsolidatedReceiptId(payment.payment_group_id || payment.id);
  } else {
    setActivePrintReceiptId(payment.id);
  }
  ```
- In `Receipts & Payment History` table:
  - When `p.payment_group_id` exists:
    - Display badge `[Pay All: CREC-...]`.
    - Render `Consolidated Receipt` button (with `Receipt` / `FileCheck` icon).
- Mount `<PrintableConsolidatedReceiptModal />` with `activeConsolidatedReceiptId`.

- [ ] **Step 3: Run unit tests and production build**
`node --test src/**/*.test.mjs` and `npm run build`.

- [ ] **Step 4: Commit Task 5 in frontend**
`git add src/features/finance/pages/StudentLedgerPage.tsx src/features/finance/components/PaymentCollectDialog.tsx`
`git commit -m "feat(finance): integrate consolidated receipt into pay all dues and student ledger history"`

---

### Task 6: Full Regression Verification & Push

**Files:**
- Test across backend & frontend repositories.

- [ ] **Step 1: Run full pytest suite in backend**
`pytest tests/ -v`

- [ ] **Step 2: Run full node test suite and build in frontend**
`node --test src/**/*.test.mjs && npm run build`

- [ ] **Step 3: Push both repositories to `origin/nabin`**
`git push origin nabin` in both `E:/SSUP/backend` and `E:/SSUP/frontend`.
