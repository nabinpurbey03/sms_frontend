# Itemized Monthly Ledger & Independent Billing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decouple monthly invoices within the same academic session so that prior months are not collapsed into `ROLLED_OVER` with zero due, enabling parents and cashiers to view itemized monthly ledgers, pay for whichever month they choose, and display itemized previous month dues (`Due amount for Month X`, `Due amount for Month Y`) on printed invoices.

**Architecture:**
- **Backend (`E:/SSUP/backend`):**
  - In `FinanceService.generate_batch_bills` and `generate_single_bill`, discontinue changing same-year prior bills to `ROLLED_OVER` and zeroing their `due_amount`.
  - Maintain cross-academic year dues carry-over (unpaid balances from prior academic sessions are still rolled into the initial session bill as prior year arrears).
  - Add `prior_unpaid_bills` itemized breakdown to `FeeBillResponseDTO` and `StudentLedgerResponseDTO` so invoices and ledger statements can list distinct due amounts per month.
  - Ensure `record_payment` allows recording payments directly against any open monthly bill (`UNPAID` or `PARTIAL`).
- **Frontend (`E:/SSUP/frontend`):**
  - Update `PrintableBillModal.tsx` to display the itemized prior months breakdown (`Due amount for {month}`) in the financial calculation ledger instead of a single lumped arrears line.
  - Enhance `StudentLedgerPage.tsx` with high-contrast UI/UX Pro Max monthly cards/table, distinct status badges (`PAID`, `PARTIAL`, `UNPAID`), and independent "Pay This Month" buttons for any bill with `due_amount > 0`.
  - Update cashier payment collection flows and unit tests to ensure multi-month independent settlement is verified.

**Tech Stack:**
- FastAPI, SQLAlchemy 2.0, Pydantic v2, Pytest
- React 19, TypeScript 5.8, Tailwind CSS, TanStack Query, Node test runner

**Spec:** Designed based on user requirements for intra-session monthly billing independence and itemized arrears presentation.

## Global Constraints
- Cross-session academic year rollover must remain intact (prior year dues carry forward as an opening balance).
- Same-session monthly bills must never be set to `ROLLED_OVER` or have their `due_amount` set to zero upon subsequent month generation.
- Each monthly bill must maintain its own `total_payable`, `paid_amount`, and `due_amount`.
- Invoices must itemize prior unpaid months separately (`Due amount for Baishakh`, `Due amount for Jestha`).
- 0 TypeScript errors on `npm run build` and 100% passing tests on backend pytest and frontend `node --test`.

---

### Task 1: Backend DTOs & Intra-Session Monthly Decoupling

**Files:**
- Modify: `src/modules/finance/schemas.py:180-240`
- Modify: `src/modules/finance/service.py:1280-1360`
- Modify: `src/modules/finance/service.py:1470-1550`
- Modify: `src/modules/finance/service.py:1730-1775`
- Modify: `src/modules/finance/service.py:2605-2675`
- Test: `tests/test_itemized_monthly_billing.py`

**Interfaces:**
- Produces: `PriorMonthDueDTO` in `schemas.py`:
  ```python
  class PriorMonthDueDTO(BaseModel):
      bill_id: str
      bill_number: str
      billing_month: Optional[str] = None
      academic_year_name: str
      due_amount: Decimal
  ```
- Produces: `prior_unpaid_months: list[PriorMonthDueDTO]` on `FeeBillResponseDTO`.

- [ ] **Step 1: Write failing backend tests for intra-session monthly independence**

Create `tests/test_itemized_monthly_billing.py`:
```python
import pytest
from decimal import Decimal
from src.modules.finance.service import FinanceService
from src.modules.finance.models import FeeBill, FeeBillItem, BillStatus
from src.modules.finance.schemas import BatchBillGenerateDTO, SingleBillGenerateDTO, FeeBillItemCreateDTO

def test_same_year_bills_are_not_rolled_over(db_session, test_tenant, test_academic_year, test_class, test_student, test_fee_structure):
    # 1. Generate Baishakh bill for 5000
    b1_data = SingleBillGenerateDTO(
        student_id=test_student.id,
        billing_month="Baishakh",
        due_date="2082-02-15",
        fee_items=[FeeBillItemCreateDTO(fee_structure_id=test_fee_structure.id, fee_name="Tuition Fee", amount=Decimal("5000.00"))]
    )
    b1 = FinanceService.generate_single_bill(db_session, test_tenant.id, b1_data)
    assert b1.status == BillStatus.UNPAID.value
    assert b1.due_amount == Decimal("5000.00")

    # 2. Generate Jestha bill for 5000
    b2_data = SingleBillGenerateDTO(
        student_id=test_student.id,
        billing_month="Jestha",
        due_date="2082-03-15",
        fee_items=[FeeBillItemCreateDTO(fee_structure_id=test_fee_structure.id, fee_name="Tuition Fee", amount=Decimal("5000.00"))]
    )
    b2 = FinanceService.generate_single_bill(db_session, test_tenant.id, b2_data)

    # Reload b1 from DB
    b1_reloaded = db_session.get(FeeBill, b1.id)
    # B1 MUST NOT be ROLLED_OVER with 0 due! It must remain UNPAID with 5000 due
    assert b1_reloaded.status == BillStatus.UNPAID.value
    assert b1_reloaded.due_amount == Decimal("5000.00")

    # B2 total payable must reflect B2 charges (5000), not absorb B1 into itself
    assert b2.subtotal_amount == Decimal("5000.00")
    assert b2.total_payable == Decimal("5000.00")
    assert b2.due_amount == Decimal("5000.00")

    # B2 must provide itemized prior unpaid months
    assert len(b2.prior_unpaid_months) == 1
    assert b2.prior_unpaid_months[0].billing_month == "Baishakh"
    assert b2.prior_unpaid_months[0].due_amount == Decimal("5000.00")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/Scripts/pytest tests/test_itemized_monthly_billing.py -v`
Expected: FAIL because previously `b1_reloaded.status` becomes `ROLLED_OVER` and `due_amount` becomes `0.00`.

- [ ] **Step 3: Implement PriorMonthDueDTO and update bill generation logic**

In `src/modules/finance/schemas.py`:
Add `PriorMonthDueDTO` and include `prior_unpaid_months: list[PriorMonthDueDTO] = Field(default_factory=list)` on `FeeBillResponseDTO`.

In `src/modules/finance/service.py`:
- In `generate_batch_bills` and `generate_single_bill`:
  - When querying `prior_unpaid_bills`:
    - Separate them into `cross_year_unpaid_bills` (where `old_bill.academic_year_id != ay.id`) and `same_year_unpaid_bills` (where `old_bill.academic_year_id == ay.id`).
    - ONLY `cross_year_unpaid_bills` are rolled over (`status = ROLLED_OVER`, balance carried into initial bill items).
    - `same_year_unpaid_bills` are NOT modified (`status` stays `UNPAID`/`PARTIAL`, `due_amount` remains intact).
  - Bill's `total_payable` is calculated as `student_subtotal + cross_year_previous_due - advance_to_apply`.
  - Populate `prior_unpaid_months` on `FeeBillResponseDTO` by querying active prior unpaid bills for the student.

- [ ] **Step 4: Run backend tests to verify they pass**

Run: `.venv/Scripts/pytest tests/test_itemized_monthly_billing.py tests/test_strict_sequential_billing.py -v`
Expected: ALL PASS.

- [ ] **Step 5: Commit backend changes**

```bash
git add src/modules/finance/schemas.py src/modules/finance/service.py tests/test_itemized_monthly_billing.py
git commit -m "feat(finance): decouple intra-session monthly billing and provide itemized prior dues"
```

---

### Task 2: Update Printable Invoice to Itemize Prior Monthly Dues

**Files:**
- Modify: `src/features/finance/types.ts:160-210`
- Modify: `src/features/finance/components/PrintableBillModal.tsx:290-375`
- Test: `src/features/finance/components/__tests__/cashierAndReceipt.test.mjs`

**Interfaces:**
- Consumes: `prior_unpaid_months?: { bill_id: string; bill_number: string; billing_month?: string; academic_year_name: string; due_amount: number | string }[]` from `FeeBill`.
- Produces: Visual breakdown in `PrintableBillModal` showing:
  - "Outstanding Prior Months Breakdown:"
    - "Due amount for Baishakh: NPR 5,000.00"
    - "Due amount for Jestha: NPR 3,000.00"
  - "Cumulative Student Account Due: NPR 13,000.00"

- [ ] **Step 1: Write unit tests for invoice prior dues itemization**

In `src/features/finance/components/__tests__/cashierAndReceipt.test.mjs`:
```javascript
test('invoice calculation ledger displays itemized prior monthly dues without bundling into single line', () => {
  const mockBill = {
    subtotal_amount: '5000.00',
    total_payable: '5000.00',
    due_amount: '5000.00',
    prior_unpaid_months: [
      { billing_month: 'Baishakh', due_amount: '5000.00' },
      { billing_month: 'Jestha', due_amount: '2500.00' }
    ]
  };
  const totalAccountDue = Number(mockBill.due_amount) + mockBill.prior_unpaid_months.reduce((acc, m) => acc + Number(m.due_amount), 0);
  assert.strictEqual(totalAccountDue, 12500);
});
```

- [ ] **Step 2: Update types.ts and PrintableBillModal.tsx**

In `src/features/finance/types.ts`:
Add `prior_unpaid_months` to `FeeBill` interface.

In `src/features/finance/components/PrintableBillModal.tsx`:
In the calculation ledger section (lines 340-370):
- Display Current Cycle Payable: `NPR {bill.total_payable}`.
- If `bill.prior_unpaid_months?.length > 0`:
  Render a distinct itemized block:
  ```tsx
  <div className="space-y-1 py-1 border-t border-dashed border-zinc-200 text-zinc-600">
    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block">
      Prior Unpaid Months Breakdown:
    </span>
    {bill.prior_unpaid_months.map((p, idx) => (
      <div key={p.bill_id || idx} className="flex justify-between text-[11px] text-amber-800">
        <span>Due amount for {p.billing_month || 'Prior Cycle'}:</span>
        <span className="font-mono font-medium">+ NPR {Number(p.due_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
      </div>
    ))}
  </div>
  ```
- Display Cumulative Account Outstanding Balance:
  `Total Student Balance Due: NPR {cumulativeTotal}`.

- [ ] **Step 3: Run frontend unit tests and build check**

Run: `node --test src/**/*.test.mjs`
Run: `npm run build`
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit invoice presentation updates**

```bash
git add src/features/finance/types.ts src/features/finance/components/PrintableBillModal.tsx src/features/finance/components/__tests__/cashierAndReceipt.test.mjs
git commit -m "feat(finance): itemize prior monthly dues on printed invoice"
```

---

### Task 3: Student Ledger Page Independent Monthly Settlement

**Files:**
- Modify: `src/features/finance/pages/StudentLedgerPage.tsx:145-235`
- Test: `src/features/finance/components/__tests__/cashierAndReceipt.test.mjs`

**Interfaces:**
- Each monthly row in `StudentLedgerPage.tsx` displays:
  - Exact Month Name (`Baishakh`, `Jestha`, `Ashadh`, etc.)
  - Subtotal, Paid Amount, and Balance Due
  - Dynamic Status Badge:
    - `PAID` (Emerald, checkmark) when `due_amount === 0`
    - `PARTIAL` (Amber, clock) when `paid_amount > 0 && due_amount > 0`
    - `UNPAID` (Rose, alert) when `paid_amount === 0 && due_amount > 0`
  - Action button: `[Pay Month]` opens `PaymentCollectDialog` bound directly to that specific month's bill!

- [ ] **Step 1: Write unit tests verifying independent monthly ledger status display**

Add test to `cashierAndReceipt.test.mjs`:
```javascript
test('student ledger correctly computes individual monthly status and allows independent payment', () => {
  const bills = [
    { billing_month: 'Baishakh', total_payable: 5000, paid_amount: 5000, due_amount: 0, status: 'PAID' },
    { billing_month: 'Jestha', total_payable: 5000, paid_amount: 2000, due_amount: 3000, status: 'PARTIAL' },
    { billing_month: 'Ashadh', total_payable: 5000, paid_amount: 0, due_amount: 5000, status: 'UNPAID' }
  ];
  assert.strictEqual(bills[0].status, 'PAID');
  assert.strictEqual(bills[1].due_amount, 3000);
  assert.strictEqual(bills[2].due_amount, 5000);
});
```

- [ ] **Step 2: Update StudentLedgerPage.tsx**

- Update table and card views to prominently show:
  - Month pill / badge
  - Total Payable, Amount Paid, and Balance Due
  - Highlighted `Pay Month` button for any month where `Number(b.due_amount) > 0`.
  - When payment is recorded, query invalidation triggers automatic refresh of the student ledger and bill lists.

- [ ] **Step 3: Run tests and build**

Run: `node --test src/**/*.test.mjs`
Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 4: Commit student ledger changes**

```bash
git add src/features/finance/pages/StudentLedgerPage.tsx src/features/finance/components/__tests__/cashierAndReceipt.test.mjs
git commit -m "feat(finance): support independent monthly bill payment in student ledger"
```

---

### Task 4: Full-Stack Verification & End-to-End Regression

**Files:**
- Test: Backend pytest suite (`tests/`)
- Test: Frontend test suite (`src/**/*.test.mjs`)
- Build: Frontend production build (`npm run build`)

- [ ] **Step 1: Run complete backend test suite**

Run: `.venv/Scripts/pytest tests/ -v`
Expected: All tests pass.

- [ ] **Step 2: Run complete frontend test suite**

Run: `node --test src/**/*.test.mjs`
Expected: All tests pass.

- [ ] **Step 3: Run production frontend build**

Run: `npm run build`
Expected: Build succeeds in ~1s with 0 errors.

- [ ] **Step 4: Git status check**

Verify clean working directory on branch `nabin` in both frontend and backend repositories.
