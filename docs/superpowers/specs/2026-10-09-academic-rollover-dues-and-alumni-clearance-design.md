# Academic Session Rollover: Dues Continuity & Alumni Clearance Specification

## Executive Summary
During an academic year rollover, active students are promoted to subsequent classes and terminal cohorts graduate. In school accounting, operational invoicing belongs to an academic session, but student account balances are continuous and cumulative. This specification establishes a clean three-tier financial architecture:
1. **Promoted Students (Opening Arrears):** Past unpaid dues are immediately visible as opening arrears and collectible on Day 1 of the new session without waiting for first-cycle bill generation.
2. **Graduated Students (Alumni Clearance Register):** Terminal cohorts are separated from active class rosters and managed in a dedicated clearance register for Transfer/Character Certificate issuance.
3. **Session Archive & Transparency (Zero Vanishing Data):** Past closed sessions are preserved as immutable, read-only audit archives accessible via a session switcher, while the Finance Dashboard provides a Post-Rollover Session Onboarding Banner with complete visibility into carried-forward receivables.

---

## 1. Problem Statement & Root Cause

### 1.1 The "Vanishing Data" Syndrome
When a tenant executes an academic year rollover:
- The active session `old_year.is_current` is set to `False` and `status` to `CLOSED`.
- A new session `new_year.is_current` is set to `True` and `status` to `ACTIVE`.
- Prior to this design, all primary finance endpoints (`/bills`, `/payments`, `/dashboard-summary`) hardcoded `where FeeBill.academic_year_id == current_ay.id`.
- Because no bills or payments exist in the new session immediately after rollover, all invoice and transaction tables returned 0 records, causing administrators to panic and perceive data loss.

### 1.2 The Promoted Student Dues Gap
Prior unpaid dues were previously only rolled forward into a new bill during Month 1 (Baishakh) batch bill generation. During the transition window between rollover day and billing day, promoted students appeared to have 0 dues in the current session views, preventing cashiers from collecting past balances.

### 1.3 The Graduated Student Blindspot
Graduated students (Grade 10 / Grade 12) transition to `status = "GRADUATED"` and are not enrolled in the new session. No new bills are ever generated for them. Consequently, their unpaid dues remained trapped in the closed academic session without any active clearance mechanism or reporting view.

---

## 2. Architecture & Domain Model

```
Tenant Financial Receivables Architecture
├── Current Active Session (Operational Invoicing)
│   ├── Baishakh -> Chaitra Fee Invoices
│   └── Current Cycle Collections
├── Promoted Active Students (Cumulative Balance)
│   ├── Opening Arrears from Prior Closed Sessions
│   └── Pre-Billing Direct Waterfall Collection
├── Graduated Cohorts (Alumni Clearance)
│   ├── Terminal Cohort Receivables Register
│   └── No-Dues Clearance Certification
└── Closed Session Archives (Immutable Audits)
    └── Read-Only View of 2081/82, 2080/81, etc.
```

### 2.1 Three-Tier Receivables Aggregation
When calculating school-wide financial health on the Finance Dashboard:
$$\text{Total Outstanding Receivables} = \text{Current Session Dues} + \text{Opening Arrears (Active Promoted)} + \text{Graduated Alumni Dues}$$

- **Current Session Dues:** Invoices generated within `current_ay.id` with `due_amount > 0`.
- **Opening Arrears:** Unpaid bills (`status IN ('UNPAID', 'PARTIAL')`) originating in closed academic years where `student.status == 'ACTIVE'`.
- **Graduated Alumni Dues:** Unpaid bills originating in any academic year where `student.status == 'GRADUATED'`.

---

## 3. Backend Specifications

### 3.1 Schema & DTO Enhancements

#### `FinanceDashboardSummaryDTO`
```python
class FinanceDashboardSummaryDTO(BaseModel):
    total_collected_month: Decimal
    total_collected_year: Decimal
    total_outstanding_dues: Decimal
    total_opening_arrears: Decimal = Decimal("0.00")
    total_alumni_dues: Decimal = Decimal("0.00")
    total_discount_year: Decimal = Decimal("0.00")
    total_discount_month: Decimal = Decimal("0.00")
    total_discounted_students_count: int = 0
    collection_rate_percent: float
    total_defaulters_count: int
    is_new_session_unbilled: bool = False
    recent_payments: list[FeePaymentResponseDTO] = []
```

#### `AlumniClearanceItemDTO` & `AlumniClearanceResponseDTO`
```python
class AlumniClearanceItemDTO(BaseModel):
    student_id: str
    student_name: str
    admission_number: Optional[str] = None
    roll_number: Optional[int] = None
    graduation_academic_year_name: str
    class_at_graduation: str
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    total_billed: Decimal
    total_paid: Decimal
    total_due: Decimal
    wallet_advance_balance: Decimal = Decimal("0.00")
    clearance_status: str  # "CLEARED", "PENDING_CLEARANCE", "REFUND_DUE"
    last_payment_date: Optional[date] = None

class AlumniClearanceResponseDTO(BaseModel):
    items: list[AlumniClearanceItemDTO]
    total_graduated_count: int
    pending_clearance_count: int
    total_alumni_outstanding_dues: Decimal
```

### 3.2 Endpoint Enhancements

1. **`GET /api/v1/finance/tenants/{tenant_id}/bills`**:
   - Query parameter: `academic_year_id: Optional[str] = Query(None)`
   - If `academic_year_id` is provided: filter `FeeBill.academic_year_id == academic_year_id`.
   - If `academic_year_id` is omitted: default to current active academic year.
2. **`GET /api/v1/finance/tenants/{tenant_id}/payments`**:
   - Query parameter: `academic_year_id: Optional[str] = Query(None)`
   - If provided: filter `FeePayment.academic_year_id == academic_year_id`.
   - If omitted: default to current active academic year.
3. **`GET /api/v1/finance/tenants/{tenant_id}/alumni-clearance`**:
   - Query parameters:
     - `search: Optional[str] = Query(None)`
     - `clearance_status: Optional[str] = Query(None)` (`CLEARED`, `PENDING_CLEARANCE`)
     - `academic_year_id: Optional[str] = Query(None)`
     - `page: int = Query(1, ge=1)`
     - `page_size: int = Query(50, ge=1, le=100)`
   - Returns paginated graduated students with cumulative dues and clearance status.
4. **`GET /api/v1/finance/tenants/{tenant_id}/students/{student_id}/dues-breakdown`**:
   - Already supports `past_academic_years_due`. Verified to correctly separate prior year arrears from current cycle obligations.

---

## 4. Frontend Specifications

### 4.1 Post-Rollover Session Onboarding Banner
- Rendered on [`FinanceDashboardPage`](file:///E:/SSUP/frontend/src/features/finance/pages/FinanceDashboardPage.tsx) when `summary.is_new_session_unbilled` is `true`.
- Displays:
  - Current Active Session badge (e.g., *2082/83 - Active Session*).
  - Promoted Students Carried-Forward Arrears indicator (*NPR {total_opening_arrears} across active students*).
  - Graduated Alumni Pending Clearance indicator (*NPR {total_alumni_dues} across alumni*).
  - CTA button: *"Generate Month 1 (Baishakh) Bills"* opening [`BatchBillGenerateDialog`](file:///E:/SSUP/frontend/src/features/finance/components/BatchBillGenerateDialog.tsx).

### 4.2 Read-Only Session Archive Switcher
- Added to [`BillsPage`](file:///E:/SSUP/frontend/src/features/finance/pages/BillsPage.tsx) and [`TransactionsPage`](file:///E:/SSUP/frontend/src/features/finance/pages/TransactionsPage.tsx).
- Component: `AcademicSessionSelect` dropdown with sessions categorized into:
  - `Active Session (2082/83)`
  - `Archived Closed Sessions (2081/82, 2080/81, ...)`
- When an archived session is selected:
  - Display sticky amber badge: `Viewing Archived Session {name} (Read-Only)`.
  - Disable/hide creation and cancellation buttons (`Cancel Bill`, `Batch Generate`).
  - Keep viewing, printing, and exporting active.

### 4.3 Alumni Clearance Register Tab
- Added to Finance navigation under `/finance/alumni-clearance` (or dedicated tab in Bills / Transactions).
- Features:
  - Search by student name, roll number, or phone.
  - Filter by clearance status (`All`, `Pending Clearance`, `Cleared`).
  - Table displaying student, graduation class/session, total due, and status badge.
  - **"Collect & Settle"** action button launching [`PaymentCollectDialog`](file:///E:/SSUP/frontend/src/features/finance/components/PaymentCollectDialog.tsx) targeting the student's unpaid invoices.
  - **"Print Clearance Slip"** action launching [`PrintableStatementModal`](file:///E:/SSUP/frontend/src/features/finance/components/PrintableStatementModal.tsx).

### 4.4 Academic Module Alumni Clearance Badge
- In [`GraduatedStudentsTable`](file:///E:/SSUP/frontend/src/features/academic/components/GraduatedStudentsTable.tsx):
  - Add a **Financial Clearance** column.
  - Displays `Cleared` (emerald) or `Pending Due: NPR {due}` (amber).
  - Link directly to the clearance settlement dialog.

---

## 5. Error Handling & Edge Cases

1. **Pre-Billing Overpayment to Wallet:**
   If a parent pays opening arrears and adds extra cash before Month 1 bill is generated, the excess is stored in `StudentWallet.advance_balance` and automatically deducted when Month 1 bill is generated.
2. **Archived Session Immutability:**
   Attempting to create, modify, or cancel a bill for a closed academic year raises `BadRequestException("Cannot modify bills in a closed academic session.")`.
3. **Rollover Reversal / Retry:**
   If bills were marked `ROLLED_OVER` and the subsequent bill is cancelled, the existing restore mechanism in `cancel_bill` cleanly unrolls the balance back to its origin.

---

## 6. Verification & Testing Strategy

1. **Automated Backend Tests (`pytest`):**
   - `test_dashboard_summary_includes_opening_arrears_and_alumni_dues`: Verifies that right after rollover, dashboard metrics include carried-forward dues and alumni balances instead of dropping to 0.
   - `test_list_bills_and_payments_session_archive_filter`: Verifies that querying bills/payments with `academic_year_id` returns historical records for closed sessions.
   - `test_alumni_clearance_lifecycle`: Verifies graduated students with dues appear in `alumni-clearance`, settlement via waterfall clears their dues, and updates clearance status to `CLEARED`.
   - `test_promoted_student_pre_billing_payment`: Verifies that paying opening arrears before Month 1 bill creation reduces dues to 0 and does not duplicate arrears on subsequent bill generation.
2. **Frontend Typecheck (`npx tsc -b`):**
   - Zero compilation errors across all enhanced DTOs and page components.
