# Academic Session Rollover: Dues Continuity & Alumni Clearance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide zero-gap dues continuity and historical transparency upon academic year rollover by introducing three-tier receivables on the dashboard, a post-rollover onboarding banner, a read-only closed session archive switcher, and a dedicated graduation clearance register for alumni.

**Architecture:** 
1. Backend partitions receivables into current session, carried-forward opening arrears (active promoted students), and alumni dues (graduated students).
2. Finance list endpoints (`/bills`, `/payments`) accept an optional `academic_year_id` parameter to enable querying immutable closed session archives while defaulting to the active operational session.
3. A dedicated backend endpoint `GET /api/v1/finance/tenants/{tenant_id}/alumni-clearance` provides a clearance register with status (`CLEARED`, `PENDING_CLEARANCE`).
4. Frontend adds a post-rollover welcome banner on the Finance Dashboard, a `SessionArchiveSelect` switcher on Bills/Transactions, an Alumni Clearance tab in Finance, and financial clearance badges in the Graduated Students directory.

**Tech Stack:** FastAPI, SQLAlchemy 2.0, PostgreSQL, Pydantic v2, React 19, TypeScript, Tailwind CSS, TanStack Query.

**Spec:** [`docs/superpowers/specs/2026-10-09-academic-rollover-dues-and-alumni-clearance-design.md`](file:///E:/SSUP/frontend/docs/superpowers/specs/2026-10-09-academic-rollover-dues-and-alumni-clearance-design.md)

## Global Constraints

- Preserve complete backward compatibility for all existing finance and academic endpoints.
- Total Outstanding Receivables must equal: Current Session Dues + Opening Arrears (Active Promoted) + Graduated Alumni Dues.
- Daily operational billing views (`/bills`, `/payments`) must strictly default to the current active session (`is_current = True`) unless an explicit `academic_year_id` archive filter is selected.
- Archived past sessions must be read-only: bill creation and cancellation controls must be hidden when viewing an archived session.
- Graduated students must never be mixed into active classroom rosters; their dues are managed exclusively via the Alumni Clearance Register.
- All backend tests must run via `.venv\Scripts\pytest.exe` with 100% pass rate.
- Frontend must pass `npx tsc -b` with 0 type errors.

---

### Task 1: Backend - Dashboard Receivables & Session Archive Filtering

**Files:**
- Modify: `backend/src/modules/finance/schemas.py`
- Modify: `backend/src/modules/finance/service.py`
- Modify: `backend/src/modules/finance/router.py`
- Create: `backend/tests/test_rollover_finance_visibility.py`

**Interfaces:**
- Consumes: `AcademicYear`, `FeeBill`, `Student` models
- Produces: Enhanced `FinanceDashboardSummaryDTO` with `total_opening_arrears`, `total_alumni_dues`, `is_new_session_unbilled`; `list_bills` & `list_payments` with `academic_year_id` filter.

- [ ] **Step 1: Write the failing tests**

```python
# backend/tests/test_rollover_finance_visibility.py
import pytest
from decimal import Decimal
from datetime import date
from fastapi.testclient import TestClient
from src.main import create_app
from src.core.database import SessionLocal
from src.modules.academic.models import Student, StudentEnrollment
from src.modules.finance.models import FeeBill
from src.modules.finance.enums import BillStatus
from src.modules.academic.service import AcademicService
from src.modules.academic.schemas import TenantAcademicYearRolloverRequest

app = create_app()
client = TestClient(app)

def test_dashboard_summary_includes_opening_arrears_and_alumni_dues(default_academic_year):
    db = SessionLocal()
    # Setup tenant, old academic year 2081/82, Class 9 and Class 10
    # Create 1 active student in Class 9 with 4,000 unpaid due
    # Create 1 student in Class 10 with 6,000 unpaid due
    # Execute rollover to 2082/83: Class 9 promotes to Class 10, Class 10 graduates
    # Assert GET /api/v1/finance/tenants/{tenant_id}/dashboard-summary:
    # - total_opening_arrears == Decimal("4000.00")
    # - total_alumni_dues == Decimal("6000.00")
    # - total_outstanding_dues == Decimal("10000.00")
    # - is_new_session_unbilled is True
    # - total_collected_year == Decimal("0.00")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv\Scripts\pytest.exe tests/test_rollover_finance_visibility.py -v`
Expected: FAIL (missing fields in `FinanceDashboardSummaryDTO` or zero dues reported).

- [ ] **Step 3: Implement DTO & Service enhancements**

In `backend/src/modules/finance/schemas.py`:
Add `total_opening_arrears: Decimal = Decimal("0.00")`, `total_alumni_dues: Decimal = Decimal("0.00")`, and `is_new_session_unbilled: bool = False` to `FinanceDashboardSummaryDTO`.

In `backend/src/modules/finance/service.py`:
- In `get_finance_dashboard_summary`:
  - Query opening arrears:
    ```python
    total_opening_arrears = db.scalar(
        select(func.coalesce(func.sum(FeeBill.due_amount), Decimal("0.00")))
        .join(Student, FeeBill.student_id == Student.id)
        .where(
            FeeBill.tenant_id == tenant_id,
            FeeBill.academic_year_id != ay.id,
            Student.status == StudentStatus.ACTIVE.value,
            FeeBill.status.in_([BillStatus.UNPAID.value, BillStatus.PARTIAL.value]),
            FeeBill.due_amount > Decimal("0.00"),
        )
    ) or Decimal("0.00")
    ```
  - Query alumni dues:
    ```python
    total_alumni_dues = db.scalar(
        select(func.coalesce(func.sum(FeeBill.due_amount), Decimal("0.00")))
        .join(Student, FeeBill.student_id == Student.id)
        .where(
            FeeBill.tenant_id == tenant_id,
            Student.status == StudentStatus.GRADUATED.value,
            FeeBill.status.in_([BillStatus.UNPAID.value, BillStatus.PARTIAL.value]),
            FeeBill.due_amount > Decimal("0.00"),
        )
    ) or Decimal("0.00")
    ```
  - Current session dues:
    ```python
    current_session_dues = db.scalar(
        select(func.coalesce(func.sum(FeeBill.due_amount), Decimal("0.00")))
        .where(
            FeeBill.tenant_id == tenant_id,
            FeeBill.academic_year_id == ay.id,
            FeeBill.status.in_([BillStatus.UNPAID.value, BillStatus.PARTIAL.value]),
        )
    ) or Decimal("0.00")
    ```
  - `total_outstanding_dues = current_session_dues + total_opening_arrears + total_alumni_dues`
  - `is_new_session_unbilled`: `(current_session_bill_count == 0)`
- In `list_bills` and `list_payments`:
  - Accept `academic_year_id: Optional[str] = None`.
  - If `academic_year_id`: use `target_ay_id = academic_year_id`. Else: `target_ay_id = ay.id`.

In `backend/src/modules/finance/router.py`:
- In `list_bills` and `list_payments`: add `academic_year_id: Optional[str] = Query(None)`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `.venv\Scripts\pytest.exe tests/test_rollover_finance_visibility.py -v`
Expected: PASS.

- [ ] **Step 5: Commit changes**

```bash
git add src/modules/finance/schemas.py src/modules/finance/service.py src/modules/finance/router.py tests/test_rollover_finance_visibility.py
git commit -m "feat(finance): add opening arrears, alumni dues, and session archive filtering"
```

---

### Task 2: Backend - Dedicated Alumni Clearance Register API

**Files:**
- Modify: `backend/src/modules/finance/schemas.py`
- Modify: `backend/src/modules/finance/service.py`
- Modify: `backend/src/modules/finance/router.py`
- Create: `backend/tests/test_alumni_clearance.py`

**Interfaces:**
- Consumes: `Student`, `StudentEnrollment`, `FeeBill`, `ParentStudentMapping`
- Produces: `GET /api/v1/finance/tenants/{tenant_id}/alumni-clearance` returning `AlumniClearanceResponseDTO`.

- [ ] **Step 1: Write the failing tests**

```python
# backend/tests/test_alumni_clearance.py
import pytest
from decimal import Decimal
from fastapi.testclient import TestClient

def test_alumni_clearance_lifecycle(default_academic_year):
    # Setup graduated student with unpaid bill of NPR 5,000
    # Setup graduated student with zero dues (NPR 0)
    # Query GET /api/v1/finance/tenants/{tenant_id}/alumni-clearance
    # Assert item 1 has clearance_status == 'PENDING_CLEARANCE' and total_due == 5000
    # Assert item 2 has clearance_status == 'CLEARED' and total_due == 0
    # Pay bill of item 1 using waterfall payment
    # Re-query alumni-clearance: item 1 now has clearance_status == 'CLEARED'
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv\Scripts\pytest.exe tests/test_alumni_clearance.py -v`
Expected: FAIL (404 Not Found on `/alumni-clearance`).

- [ ] **Step 3: Implement Alumni Clearance Schemas, Service & Route**

In `backend/src/modules/finance/schemas.py`:
Add `AlumniClearanceItemDTO` and `AlumniClearanceResponseDTO`.

In `backend/src/modules/finance/service.py`:
Add `get_alumni_clearance(cls, db: Session, tenant_id: str, search: Optional[str] = None, clearance_status: Optional[str] = None, academic_year_id: Optional[str] = None, page: int = 1, page_size: int = 50) -> AlumniClearanceResponseDTO`.
- Query students with `Student.status == StudentStatus.GRADUATED.value`.
- Join terminal enrollment to get graduation class and academic session.
- Calculate total billed, total paid, and total due from `FeeBill`.
- Determine `clearance_status`: `"CLEARED"` if `total_due <= 0`, else `"PENDING_CLEARANCE"`.

In `backend/src/modules/finance/router.py`:
Add route `@router.get("/tenants/{tenant_id}/alumni-clearance")`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `.venv\Scripts\pytest.exe tests/test_alumni_clearance.py -v`
Expected: PASS.

- [ ] **Step 5: Commit changes**

```bash
git add src/modules/finance/schemas.py src/modules/finance/service.py src/modules/finance/router.py tests/test_alumni_clearance.py
git commit -m "feat(finance): implement alumni clearance register endpoint"
```

---

### Task 3: Frontend - Post-Rollover Session Banner & Session Archive Switcher

**Files:**
- Modify: `frontend/src/features/finance/types.ts`
- Modify: `frontend/src/features/finance/pages/FinanceDashboardPage.tsx`
- Create: `frontend/src/features/finance/components/SessionArchiveSelect.tsx`
- Modify: `frontend/src/features/finance/pages/BillsPage.tsx`
- Modify: `frontend/src/features/finance/pages/TransactionsPage.tsx`

**Interfaces:**
- Consumes: `FinanceDashboardSummary`, `useAcademicYears`, `useBills`, `usePayments`
- Produces: `SessionArchiveSelect` component; post-rollover banner on dashboard; session archive switcher in invoices & transactions.

- [ ] **Step 1: Update Frontend Types**

In `frontend/src/features/finance/types.ts`:
Update `FinanceDashboardSummary`:
```typescript
export interface FinanceDashboardSummary {
  total_collected_month: number | string;
  total_collected_year: number | string;
  total_outstanding_dues: number | string;
  total_opening_arrears?: number | string;
  total_alumni_dues?: number | string;
  is_new_session_unbilled?: boolean;
  // ... other fields
}
```

- [ ] **Step 2: Add Post-Rollover Session Onboarding Banner to FinanceDashboardPage**

In `frontend/src/features/finance/pages/FinanceDashboardPage.tsx`:
When `summary?.is_new_session_unbilled` is true:
Render an informative, welcoming session transition banner:
- Display current active session name.
- Highlight carried-forward opening arrears from active students.
- Highlight pending alumni clearance dues.
- Direct CTA button: "Generate Month 1 (Baishakh) Bills" opening `BatchBillGenerateDialog`.

- [ ] **Step 3: Create SessionArchiveSelect Component**

In `frontend/src/features/finance/components/SessionArchiveSelect.tsx`:
Dropdown using `useAcademicYears`:
- Options divided into:
  - `● Active Session ({currentYear.name})`
  - `Past Sessions (Read-Only Archive):`
    - `{year.name} (Closed)`
- Callback `onSelectSession(academicYearId: string | null)`.

- [ ] **Step 4: Integrate Session Archive into BillsPage and TransactionsPage**

In `frontend/src/features/finance/pages/BillsPage.tsx` and `TransactionsPage.tsx`:
- Add `selectedSessionId` state (default `null`).
- Pass `academic_year_id: selectedSessionId || undefined` to `useBills` / `usePayments`.
- If `selectedSessionId` is a past closed session:
  - Render an amber banner: `Viewing Archived Session {year.name} (Read-Only Audit Record)`.
  - Hide action buttons (`Cancel Bill`, `Generate Bills`).

- [ ] **Step 5: Verify TypeScript compilation**

Run: `npx tsc -b` in `frontend`
Expected: 0 errors.

- [ ] **Step 6: Commit changes**

```bash
git add src/features/finance/types.ts src/features/finance/pages/FinanceDashboardPage.tsx src/features/finance/components/SessionArchiveSelect.tsx src/features/finance/pages/BillsPage.tsx src/features/finance/pages/TransactionsPage.tsx
git commit -m "feat(finance): add post-rollover banner and session archive switcher"
```

---

### Task 4: Frontend - Dedicated Alumni Clearance Register Page & Directory Badges

**Files:**
- Modify: `frontend/src/features/finance/types.ts`
- Modify: `frontend/src/features/finance/hooks.ts`
- Create: `frontend/src/features/finance/pages/AlumniClearancePage.tsx`
- Modify: `frontend/src/features/academic/components/GraduatedStudentsTable.tsx`
- Modify: `frontend/src/features/finance/pages/index.ts` (or router setup)

**Interfaces:**
- Consumes: `GET /api/v1/finance/tenants/{tenant_id}/alumni-clearance`
- Produces: `AlumniClearancePage` UI with clearance status indicators, waterfall settlement modal trigger, and printable clearance slip launcher.

- [ ] **Step 1: Add Alumni Clearance Types & Hook**

In `frontend/src/features/finance/types.ts`:
Add `AlumniClearanceItem`, `AlumniClearanceResponse`.
In `frontend/src/features/finance/hooks.ts`:
Add `useAlumniClearance(tenantId, params)`.

- [ ] **Step 2: Create AlumniClearancePage Component**

In `frontend/src/features/finance/pages/AlumniClearancePage.tsx`:
- Header with search, batch filter, and clearance status filter (`ALL`, `PENDING_CLEARANCE`, `CLEARED`).
- Summary metrics: Total Graduated Students, Pending Clearance Count, Total Alumni Dues.
- Table listing alumni, contact, total due, and clearance status badge.
- Actions: "Collect & Settle" opening `PaymentCollectDialog`, "Print Clearance Slip" opening `PrintableStatementModal`.

- [ ] **Step 3: Add Financial Clearance Status to GraduatedStudentsTable**

In `frontend/src/features/academic/components/GraduatedStudentsTable.tsx`:
Add a `Financial Clearance` column:
- If dues exist: `Pending Due: NPR {due}` (amber).
- If cleared: `Cleared (No Dues)` (emerald).

- [ ] **Step 4: Verify TypeScript compilation**

Run: `npx tsc -b` in `frontend`
Expected: 0 errors.

- [ ] **Step 5: Commit changes**

```bash
git add src/features/finance/types.ts src/features/finance/hooks.ts src/features/finance/pages/AlumniClearancePage.tsx src/features/academic/components/GraduatedStudentsTable.tsx
git commit -m "feat(finance): add alumni clearance register and directory badges"
```

---

### Task 5: End-to-End Regression & Verification

**Files:**
- Run all backend tests: `.venv\Scripts\pytest.exe tests/`
- Run frontend typecheck: `npx tsc -b`

- [ ] **Step 1: Run complete backend test suite**
Run: `.venv\Scripts\pytest.exe tests/test_rollover_finance_visibility.py tests/test_alumni_clearance.py tests/test_discount_visibility.py tests/test_consolidated_receipt.py -v`
Expected: All pass.

- [ ] **Step 2: Run complete frontend build check**
Run: `npx tsc -b`
Expected: Exit code 0.

- [ ] **Step 3: Final Commit & Review**
Confirm git working tree is clean.
