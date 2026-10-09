# Student Discount & Fee Concession Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide complete visibility, analytics, and audit tracking for fee discounts and waivers across the Finance Dashboard, Payment Transactions, Student Fee Ledger, and a dedicated Concessions Register.

**Architecture:**
- Backend: Update `FinanceDashboardSummaryDTO` to compute `total_discount_year`, `total_discount_month`, and count of discounted students. Update `StudentLedgerResponseDTO` to return `total_discount` and attach `discount_amount` on each bill item DTO. Add `has_discount: bool` filtering to `list_payments`.
- Frontend: Add "Total Concessions" KPI and recent concessions feed on `FinanceDashboardPage.tsx`; add a "Discount / Waivers Only" tab and discount column on `TransactionsPage.tsx`; add a 4th KPI card and itemized discount column to `StudentLedgerPage.tsx`.

**Tech Stack:**
- FastAPI, SQLAlchemy ORM, Pydantic v2
- React 18, TypeScript, Tailwind CSS, Lucide icons, TanStack Query

**Spec:** User request: "students are getting discount but there is no way admin or accountant can be aware of that. what can be best way to see that?"

## Global Constraints
- Preserve backward compatibility for existing endpoints, DTOs, and database tables.
- Discount formatting must clearly distinguish percentage vs fixed waivers (e.g., `NPR 500 (10%)` vs `NPR 500 (Fixed)`).
- All audit entries must show the cashier/user who granted the discount and the reason/remarks.
- Follow existing color tokens: amber/emerald tones for concession badges (`bg-amber-500/10 text-amber-600 border-amber-500/20`).
- Ensure all tests pass with 100% success and `npx tsc -b` exits with 0 errors.

---

### Task 1: Backend Service & Schema Enhancements

**Files:**
- Modify: `backend/src/modules/finance/schemas.py:460-485`
- Modify: `backend/src/modules/finance/service.py:2690-2740, 3100-3155, 3288-3395`
- Modify: `backend/src/modules/finance/router.py:503-533`
- Test: `backend/tests/test_discount_visibility.py`

**Interfaces:**
- Consumes: `FeePayment.discount_amount`, `FeePayment.discount_rate`, `FeePayment.discount_type`, `FeeBill`
- Produces:
  - `FinanceDashboardSummaryDTO.total_discount_year: Decimal`
  - `FinanceDashboardSummaryDTO.total_discount_month: Decimal`
  - `FinanceDashboardSummaryDTO.total_discounted_students_count: int`
  - `StudentLedgerResponseDTO.total_discount: Decimal`
  - `GET /api/v1/finance/tenants/{tenant_id}/payments?has_discount=true`

- [x] **Step 1: Write backend tests in `tests/test_discount_visibility.py`**
Verify:
1. `get_dashboard_summary` includes `total_discount_year`, `total_discount_month`, and `total_discounted_students_count`.
2. `get_student_ledger` includes `total_discount` and `discount_amount` on bill DTOs.
3. `list_payments` filters correctly when `has_discount=True` vs `has_discount=False` vs `None`.

- [x] **Step 2: Update `backend/src/modules/finance/schemas.py`**
In `FinanceDashboardSummaryDTO`:
```python
class FinanceDashboardSummaryDTO(BaseModel):
    total_collected_month: Decimal
    total_collected_year: Decimal
    total_outstanding_dues: Decimal
    collection_rate_percent: float
    total_defaulters_count: int
    recent_payments: list[FeePaymentResponseDTO] = []
    total_discount_year: Decimal = Decimal("0.00")
    total_discount_month: Decimal = Decimal("0.00")
    total_discounted_students_count: int = 0
```
In `StudentLedgerResponseDTO`:
```python
class StudentLedgerResponseDTO(BaseModel):
    student_id: str
    student_name: str
    class_name: Optional[str] = None
    total_billed: Decimal
    total_paid: Decimal
    total_due: Decimal
    total_discount: Decimal = Decimal("0.00")
    bills: list[FeeBillResponseDTO] = []
    payments: list[FeePaymentResponseDTO] = []
```

- [x] **Step 3: Update `backend/src/modules/finance/service.py`**
1. In `get_dashboard_summary`:
   - Compute `total_discount_year = db.scalar(select(func.coalesce(func.sum(FeePayment.discount_amount), Decimal("0.00"))).where(FeePayment.tenant_id == tenant_id, FeePayment.academic_year_id == ay.id))`.
   - Compute `total_discount_month = db.scalar(select(func.coalesce(func.sum(FeePayment.discount_amount), Decimal("0.00"))).where(FeePayment.tenant_id == tenant_id, FeePayment.academic_year_id == ay.id, FeePayment.payment_date >= first_day_of_month))`.
   - Compute `total_discounted_students_count = db.scalar(select(func.count(func.distinct(FeePayment.student_id))).where(FeePayment.tenant_id == tenant_id, FeePayment.academic_year_id == ay.id, FeePayment.discount_amount > Decimal("0.00")))`.
2. In `get_student_ledger`:
   - Compute `total_discount = sum((p.discount_amount for p in payments if p.discount_amount), Decimal("0.00"))`.
   - Attach `discount_amount` on each `FeeBillResponseDTO` inside ledger bills.
3. In `list_payments`:
   - Add parameter `has_discount: Optional[bool] = None`.
   - If `has_discount is True`: `query = query.where(FeePayment.discount_amount > Decimal("0.00"))`.
   - If `has_discount is False`: `query = query.where(FeePayment.discount_amount == Decimal("0.00"))`.

- [x] **Step 4: Update `backend/src/modules/finance/router.py`**
Add `has_discount: Optional[bool] = Query(None)` to `list_payments` endpoint and pass to service.

- [x] **Step 5: Run tests to verify**
Run: `backend/.venv/Scripts/pytest.exe tests/test_discount_visibility.py -v`
Expected: 100% PASS

---

### Task 2: Finance Dashboard Macro Visibility

**Files:**
- Modify: `frontend/src/features/finance/types.ts`
- Modify: `frontend/src/features/finance/pages/FinanceDashboardPage.tsx`

**Interfaces:**
- Consumes: `summary.total_discount_year`, `summary.total_discount_month`, `summary.total_discounted_students_count`

- [x] **Step 1: Update `frontend/src/features/finance/types.ts`**
Add `total_discount_year`, `total_discount_month`, `total_discounted_students_count` to `FinanceDashboardSummary`.

- [x] **Step 2: Add "Total Concessions & Waivers" KPI Card to `FinanceDashboardPage.tsx`**
Add KPI card in the top metric grid:
- Title: "Total Concessions & Waivers"
- Value: `NPR {Number(summary?.total_discount_year || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
- Subtext: `This Month: NPR {Number(summary?.total_discount_month || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} • {summary?.total_discounted_students_count || 0} students granted waivers`
- Color tone: Amber accent with `Percent` / `Tag` icon.

- [x] **Step 3: Add Recent Concessions Audit Feed Widget to `FinanceDashboardPage.tsx`**
In the dashboard payments section:
- Filter `concessionPayments = recentPayments.filter(p => Number(p.discount_amount || 0) > 0)`.
- If present, show a clean "Recent Waivers & Concessions" card showing the student name, discount amount (`-NPR X.XX`), rate, cashier name, and a button linking to `/finance/transactions?tab=discounts`.

- [x] **Step 4: Verify typecheck**
Run: `npx tsc -b` in `frontend`
Expected: Exits with code 0.

---

### Task 3: Dedicated Concessions Register & Transactions Page Tab

**Files:**
- Modify: `frontend/src/features/finance/api.ts`
- Modify: `frontend/src/features/finance/hooks.ts`
- Modify: `frontend/src/features/finance/pages/TransactionsPage.tsx`

- [x] **Step 1: Update API & hooks with `has_discount` filter**
In `usePayments` hook and `api.ts`, add `has_discount?: boolean` to payment query parameters.

- [x] **Step 2: Add Segmented View Tabs to `TransactionsPage.tsx`**
- Tab 1: `All Payment Records` (Default)
- Tab 2: `Concessions & Waivers Register` (Passes `has_discount: true` to `usePayments`)

- [x] **Step 3: Add Discount Column to Payments Table**
In both tabs (and especially in the Concessions Register):
- Add column header: `Discount / Waiver`.
- When discount > 0: render badge `<Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 font-mono text-[10px]">-NPR {p.discount_amount} ({p.discount_type === 'PERCENT' ? `${p.discount_rate}%` : 'Fixed'})</Badge>`.
- Display reason / remarks tooltip or note.
- When viewing the Concessions tab, show summary strip at the top:
  - Total Concessions Granted in Current View: `NPR {totalFilteredDiscounts}`
  - Total Receipts with Concession: `{meta.total_records}`

- [x] **Step 4: Verify typecheck**
Run: `npx tsc -b` in `frontend`
Expected: Exits with code 0.

---

### Task 4: Student Fee Account Ledger Contextual Visibility

**Files:**
- Modify: `frontend/src/features/finance/types.ts`
- Modify: `frontend/src/features/finance/pages/StudentLedgerPage.tsx`

- [x] **Step 1: Update `StudentLedgerResponse` type**
Add `total_discount?: number | string` to `StudentLedgerResponse`.

- [x] **Step 2: Add 4th KPI Card in `StudentLedgerPage.tsx`**
In the summary cards:
- Grid becomes 4 cards:
  1. Total Invoiced
  2. Total Paid to Date
  3. Total Discounts / Waivers (`NPR {totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`)
  4. Outstanding Balance Due
- If `totalDiscount > 0`, render a subtle amber banner or badge under the student profile header:
  `🏷️ Concession Beneficiary: NPR {totalDiscount} waived across bills`.

- [x] **Step 3: Add "Discount / Waived" Column in Invoices History Table**
In the table:
- Columns: Bill # | Month & Description | Issue Date | Due Date | Subtotal | Total Payable | **Discount / Waived** | Paid | Balance Due | Status | Actions
- If `b.discount_amount > 0`:
  Render font-mono text in amber: `-NPR {Number(b.discount_amount).toFixed(2)}`
  Otherwise render `—`.
- This makes `Total Payable - Discount - Paid = Balance Due` mathematically and visually intuitive for any accountant or parent!

- [x] **Step 4: Run full verification**
Run:
- Backend: `.venv/Scripts/pytest.exe tests/test_discount_visibility.py tests/test_parent_report_cards.py tests/test_examination_section_grading.py`
- Frontend: `npx tsc -b`
Expected: All pass cleanly.
