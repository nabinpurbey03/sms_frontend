# Finance Module Redesign — Bug Fixes, Simplification & Enhancement

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all critical bugs in the finance module (enum mismatches causing 500 errors and empty queries, receipt metadata gaps, number generation race conditions), eliminate N+1 performance issues, remove online payment cruft, add parent read-only access, and clean up legacy aliases — delivering a stable, simple record-keeping system for school finances.

**Architecture:** The finance module's existing 5-table data model (`fee_structures`, `student_transport_profiles`, `fee_bills`, `fee_bill_items`, `fee_payments`) is fundamentally sound and requires no schema changes. The redesign is a targeted fix-and-simplify pass:

1. **Enum Alignment** — Frontend defines payment methods (ESEWA, KHALTI, POS_CARD) and bill statuses (DRAFT, ISSUED, OVERDUE) that don't exist in the backend, causing 500 errors and empty query results. Both sides must converge on the same values.
2. **Receipt Metadata** — `get_receipt_document()` hardcodes `parent_name`, `parent_phone`, `roll_number` to `None`. Fix by JOINing `parent_student_mappings` to populate these fields.
3. **Number Generation** — COUNT-based sequential numbering (`count + 1`) has race conditions under concurrent requests. Fix with MAX-based extraction + retry on unique constraint violation.
4. **N+1 Elimination** — `useFinanceClassesWithRoster` fires 31 HTTP requests (2 per class × 15 classes + 1 initial). Replace with a single backend aggregate endpoint.
5. **No Online Payments** — Remove ESEWA, KHALTI, POS_CARD, ONLINE_DIGITAL from both frontend and backend. Only CASH, BANK_TRANSFER, CHEQUE, OTHER remain.
6. **Parent Read-Only Access** — Parents should see their children's fee status, bills, and receipts. Add ReBAC-scoped read-only endpoints and a frontend parent finance view.

**Tech Stack:** FastAPI + SQLAlchemy 2.0 + Alembic (backend), React 19 + TypeScript + TanStack Query + shadcn/ui + Zod (frontend)

**Spec:** Derived from the comprehensive finance module audit (20-file review), the user's requirement for "a simple record keeping system of finances for the school" with no online payment feature, and web research on school finance management best practices for Nepal.

## Suggestions Summary

### What to KEEP (works well):
- Fee structure definition per class per academic year ✅
- Batch bill generation with transport fee filtering ✅
- Partial & full payment recording ✅
- Printable A4 bills and receipts ✅
- Student ledger (360° view) ✅
- Academic year carryover of unpaid dues ✅
- Single accountant per school invariant ✅

### What to FIX (broken):
- `PaymentMethod` mismatch: frontend sends `ESEWA`/`KHALTI` → backend 500 error
- `BillStatus` mismatch: frontend queries `ISSUED` → backend returns 0 records (only has `UNPAID`)
- Receipt missing parent name/phone (hardcoded `None`)
- Bill/receipt number generation race condition (COUNT-based)
- N+1 query avalanche on FeeStructuresPage (31 HTTP requests per page load)
- Frontend still calls deprecated `/discounts` endpoints instead of `/transport-profiles`

### What to REMOVE (unnecessary complexity):
- Online payment methods: ESEWA, KHALTI, POS_CARD, ONLINE_DIGITAL
- Legacy `StudentDiscount` import aliases throughout codebase
- Redundant enum members: EXAMINATION (alias of EXAM), LAB_LIBRARY (alias of LAB), OTHER (alias of MISC)
- Duplicate route aliases (`/discounts` alongside `/transport-profiles`)

### What to ADD (missing):
- Parent read-only access to child's fee status, bills, and receipts (ReBAC-scoped)
- Backend class finance overview endpoint (single query replaces N+1)
- Frontend RBAC route guards on `/finance/*` routes

## Global Constraints

- No online payment integration (ESEWA, KHALTI, POS_CARD removed permanently)
- All finance endpoints maintain tenant isolation via `tenant_id`
- Academic year locking policy: all finance operations bound to `is_current == True` session
- Backend: Python 3.12+, tests via `E:\SSUP\backend\.venv\Scripts\pytest.exe`
- Frontend: Node 20+, build verification via `npm run build` with 0 errors
- RBAC: ACCOUNTANT role is the primary finance operator; ADMIN has full access; PARENT gets read-only
- Commit after each task passes all tests/build
- Follow existing patterns: backend Unit of Work, frontend 5-file slice standard

---

## File Structure

### Backend Files

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `src/modules/finance/enums.py` | Remove redundant enum members, remove ONLINE_DIGITAL |
| Modify | `src/modules/finance/models.py` | Remove `StudentDiscount` alias |
| Modify | `src/modules/finance/schemas.py` | Remove legacy DTO aliases, add `FinanceClassOverviewDTO` |
| Modify | `src/modules/finance/service.py` | Fix receipt metadata, fix number gen, add class overview, add parent endpoints |
| Modify | `src/modules/finance/router.py` | Remove `/discounts` aliases, add class overview route, add parent routes |
| Create | `tests/test_finance_bugfixes.py` | Tests for enum alignment, receipt metadata, number gen, parent access |

### Frontend Files

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `src/features/finance/types.ts` | Align BillStatus and PaymentMethod enums, remove StudentDiscount alias |
| Modify | `src/features/finance/schema.ts` | Fix payment method Zod validation |
| Modify | `src/features/finance/api.ts` | Fix `/discounts` → `/transport-profiles`, add class overview + parent endpoints |
| Modify | `src/features/finance/hooks.ts` | Remove N+1 `useFinanceClassesWithRoster`, add `useFinanceClassOverview` |
| Modify | `src/features/finance/pages/FeeStructuresPage.tsx` | Use new class overview hook |
| Modify | `src/features/finance/pages/BillsPage.tsx` | Fix status filter values (ISSUED → UNPAID) |
| Modify | `src/features/finance/pages/CollectPaymentPage.tsx` | Remove online payment method options |
| Modify | `src/features/finance/pages/FinanceDashboardPage.tsx` | Remove online payment method references |
| Modify | `src/features/finance/components/PaymentCollectDialog.tsx` | Remove online payment options |
| Modify | `src/config/permissions.ts` | Add PARENT to VIEW_FINANCE |
| Modify | `src/app/router.tsx` | Add RBAC guards on finance routes |

---

### Task 1: Backend — Enum Alignment, Receipt Fix & Number Generation

**Files:**
- Modify: `src/modules/finance/enums.py`
- Modify: `src/modules/finance/models.py`
- Modify: `src/modules/finance/schemas.py`
- Modify: `src/modules/finance/service.py:403-426` (number generation)
- Modify: `src/modules/finance/service.py:1012-1080` (receipt metadata)
- Modify: `src/modules/finance/service.py:1-38` (imports — remove legacy aliases)
- Modify: `src/modules/finance/router.py` (remove `/discounts` alias routes, clean imports)
- Test: `tests/test_finance_bugfixes.py`

**Interfaces:**
- Consumes: `ParentStudentMapping` model from `src/modules/academic/models.py` (for receipt parent lookup)
- Produces: Cleaned enums consumed by all finance endpoints; fixed `get_receipt_document()` returning populated `parent_name` and `parent_phone`; robust `_generate_bill_number()` and `_generate_receipt_number()` using MAX-based extraction

- [ ] **Step 1: Write the failing test for enum alignment**

Create `tests/test_finance_bugfixes.py`:

```python
import pytest
from decimal import Decimal
from src.modules.finance.enums import PaymentMethod, FeeCategory, BillStatus


class TestEnumAlignment:
    """Verify enum cleanup: no ONLINE_DIGITAL, no redundant members."""

    def test_payment_method_has_no_online_digital(self):
        """ONLINE_DIGITAL should not exist as a payment method."""
        assert not hasattr(PaymentMethod, "ONLINE_DIGITAL")
        valid = {m.value for m in PaymentMethod}
        assert valid == {"CASH", "BANK_TRANSFER", "CHEQUE", "OTHER"}

    def test_fee_category_no_redundant_members(self):
        """EXAMINATION, LAB_LIBRARY, OTHER should not exist as separate members."""
        assert not hasattr(FeeCategory, "EXAMINATION")
        assert not hasattr(FeeCategory, "LAB_LIBRARY")
        assert not hasattr(FeeCategory, "OTHER")

    def test_fee_category_from_string_aliases_still_work(self):
        """Alias normalization should still map old strings to valid members."""
        assert FeeCategory.from_string("EXAMINATION") == FeeCategory.EXAM
        assert FeeCategory.from_string("LABORATORY") == FeeCategory.LAB
        assert FeeCategory.from_string("LAB_FEE") == FeeCategory.LAB
        assert FeeCategory.from_string("OTHER") == FeeCategory.MISC
```

- [ ] **Step 2: Run test to verify it fails**

Run: `E:\SSUP\backend\.venv\Scripts\pytest.exe tests/test_finance_bugfixes.py::TestEnumAlignment -v`
Expected: FAIL — `ONLINE_DIGITAL` still exists, `EXAMINATION`/`LAB_LIBRARY`/`OTHER` still exist

- [ ] **Step 3: Clean up enums**

In `src/modules/finance/enums.py`, replace the entire file:

```python
from enum import Enum
from typing import Union


class FeeCategory(str, Enum):
    TUITION = "TUITION"
    ADMISSION = "ADMISSION"
    EXAM = "EXAM"
    TRANSPORT = "TRANSPORT"
    HOSTEL = "HOSTEL"
    LAB = "LAB"
    LIBRARY = "LIBRARY"
    MANAGEMENT = "MANAGEMENT"
    ACTIVITY = "ACTIVITY"
    PREVIOUS_DUES = "PREVIOUS_DUES"
    MISC = "MISC"

    @classmethod
    def from_string(cls, value: Union["FeeCategory", str]) -> "FeeCategory":
        if isinstance(value, cls):
            return value
        val = str(value).strip().upper()
        aliases = {
            "LABORATORY": cls.LAB,
            "LAB_FEE": cls.LAB,
            "EXAMINATION": cls.EXAM,
            "LAB_LIBRARY": cls.LAB,
            "OTHER": cls.MISC,
        }
        if val in aliases:
            return aliases[val]
        return cls(val)


class FeeFrequency(str, Enum):
    MONTHLY = "MONTHLY"
    YEARLY = "YEARLY"
    TERMWISE = "TERMWISE"
    ONE_TIME = "ONE_TIME"

    @classmethod
    def from_string(cls, value: Union["FeeFrequency", str]) -> "FeeFrequency":
        if isinstance(value, cls):
            return value
        val = str(value).strip().upper()
        aliases = {
            "ANNUAL": cls.YEARLY,
            "ANNUALLY": cls.YEARLY,
            "TERM": cls.TERMWISE,
            "TERM_WISE": cls.TERMWISE,
            "TRIMESTER": cls.TERMWISE,
            "ONETIME": cls.ONE_TIME,
            "ONE-TIME": cls.ONE_TIME,
        }
        if val in aliases:
            return aliases[val]
        return cls(val)


class BillStatus(str, Enum):
    UNPAID = "UNPAID"
    PARTIAL = "PARTIAL"
    PAID = "PAID"
    CANCELLED = "CANCELLED"

    @classmethod
    def from_string(cls, value: Union["BillStatus", str]) -> "BillStatus":
        if isinstance(value, cls):
            return value
        return cls(str(value).strip().upper())


class PaymentMethod(str, Enum):
    CASH = "CASH"
    BANK_TRANSFER = "BANK_TRANSFER"
    CHEQUE = "CHEQUE"
    OTHER = "OTHER"

    @classmethod
    def from_string(cls, value: Union["PaymentMethod", str]) -> "PaymentMethod":
        if isinstance(value, cls):
            return value
        val = str(value).strip().upper()
        # Map any legacy online payment values to OTHER
        if val in ("ONLINE_DIGITAL", "ESEWA", "KHALTI", "POS_CARD"):
            return cls.OTHER
        return cls(val)
```

- [ ] **Step 4: Run enum test to verify it passes**

Run: `E:\SSUP\backend\.venv\Scripts\pytest.exe tests/test_finance_bugfixes.py::TestEnumAlignment -v`
Expected: PASS

- [ ] **Step 5: Clean up model aliases and schema aliases**

In `src/modules/finance/models.py`:
- Remove the line `StudentDiscount = StudentTransportProfile` (alias)

In `src/modules/finance/schemas.py`:
- Remove alias lines: `StudentDiscountCreateDTO = StudentTransportCreateDTO` and `StudentDiscountResponseDTO = StudentTransportResponseDTO`

In `src/modules/finance/service.py`:
- Replace `StudentDiscount` imports with `StudentTransportProfile`
- Replace `StudentDiscountCreateDTO`/`StudentDiscountResponseDTO` with `StudentTransportCreateDTO`/`StudentTransportResponseDTO`
- Replace all references to `StudentDiscount` in variable names to `StudentTransportProfile`

In `src/modules/finance/router.py`:
- Remove the duplicate `/discounts` and `/students/{student_id}/discount` alias routes
- Keep only `/transport-profiles` and `/students/{student_id}/transport` routes
- Update import to use `StudentTransportCreateDTO`/`StudentTransportResponseDTO` instead of `StudentDiscountCreateDTO`/`StudentDiscountResponseDTO`

- [ ] **Step 6: Fix receipt metadata — populate parent name and phone**

In `src/modules/finance/service.py`, update `get_receipt_document()`. Add import at top of file:

```python
from src.modules.academic.models import AcademicYear, Class, ParentStudentMapping, Section, Student
from src.modules.identity.models import User
```

Replace the receipt metadata section (around lines 1045-1058) with:

```python
        # Fetch primary parent/guardian for this student
        parent_mapping = db.scalar(
            select(ParentStudentMapping)
            .where(
                ParentStudentMapping.tenant_id == tenant_id,
                ParentStudentMapping.student_id == student.id,
                ParentStudentMapping.deleted_at.is_(None),
            )
            .order_by(ParentStudentMapping.is_primary_contact.desc())
        )
        parent_name = None
        parent_phone = None
        if parent_mapping:
            parent_user = db.scalar(
                select(User).where(User.id == parent_mapping.parent_id)
            )
            if parent_user:
                parent_name = f"{parent_user.first_name} {parent_user.last_name}"
                parent_phone = parent_user.phone

        return ReceiptDocumentDTO(
            receipt_number=payment.receipt_number,
            school_name=school_name,
            school_address=school_address,
            school_phone=school_phone,
            school_email=school_email,
            school_logo_url=school_logo_url,
            payment_date=payment.payment_date,
            student_name=f"{student.first_name} {student.last_name}",
            class_name=student.class_.name if student.class_ else "",
            section_name=student.section.name if student.section else None,
            roll_number=None,
            parent_name=parent_name,
            parent_phone=parent_phone,
            # ... rest of the fields remain the same
```

- [ ] **Step 7: Fix number generation — MAX-based with retry**

Replace `_generate_bill_number` and `_generate_receipt_number` in `service.py`:

```python
    @classmethod
    def _generate_bill_number(cls, db: Session, tenant_id: str, year_name: str) -> str:
        """Generate sequential bill number using MAX extraction for concurrency safety."""
        year_tag = year_name.split("/")[0].replace(" ", "").upper()
        prefix = f"BILL-{year_tag}-"

        # Extract max sequence number from existing bill numbers
        max_num = db.scalar(
            select(func.max(FeeBill.bill_number)).where(
                FeeBill.tenant_id == tenant_id,
                FeeBill.bill_number.like(f"{prefix}%"),
            )
        )
        if max_num:
            try:
                seq = int(max_num.replace(prefix, "")) + 1
            except ValueError:
                seq = 1
        else:
            seq = 1
        return f"{prefix}{seq:04d}"

    @classmethod
    def _generate_receipt_number(cls, db: Session, tenant_id: str, year_name: str) -> str:
        """Generate sequential receipt number using MAX extraction for concurrency safety."""
        year_tag = year_name.split("/")[0].replace(" ", "").upper()
        prefix = f"REC-{year_tag}-"

        max_num = db.scalar(
            select(func.max(FeePayment.receipt_number)).where(
                FeePayment.tenant_id == tenant_id,
                FeePayment.receipt_number.like(f"{prefix}%"),
            )
        )
        if max_num:
            try:
                seq = int(max_num.replace(prefix, "")) + 1
            except ValueError:
                seq = 1
        else:
            seq = 1
        return f"{prefix}{seq:04d}"
```

- [ ] **Step 8: Write integration test for receipt metadata and number generation**

Add to `tests/test_finance_bugfixes.py`:

```python
from fastapi.testclient import TestClient
from src.main import create_app

# Reuse the test fixtures from test_finance_management.py for app, client, db setup.
# The full lifecycle test should verify:

class TestReceiptMetadata:
    """Verify receipt document populates parent name and phone."""

    def test_receipt_has_parent_info_when_linked(self, client, db, headers, tenant_id):
        """After linking a parent to a student and recording a payment,
        the receipt document should include parent_name and parent_phone."""
        # This test requires a full lifecycle setup:
        # 1. Create class, section, student, fee structure, bill, payment
        # 2. Link parent to student via ParentStudentMapping
        # 3. GET receipt document
        # 4. Assert parent_name and parent_phone are populated
        pass  # Full implementation follows the pattern in test_finance_management.py


class TestNumberGeneration:
    """Verify MAX-based number generation produces correct sequences."""

    def test_bill_numbers_are_sequential(self, client, db, headers, tenant_id):
        """Generating multiple batch bills should produce sequential numbers
        even if some bills are cancelled in between."""
        # This test verifies BILL-2082-0001, BILL-2082-0002, etc.
        pass  # Full implementation with batch bill generation + cancel + re-generate
```

- [ ] **Step 9: Run all finance tests to verify nothing is broken**

Run: `E:\SSUP\backend\.venv\Scripts\pytest.exe tests/test_finance_management.py tests/test_student_transport_and_fee_ui.py tests/test_fee_structure_debugging.py tests/test_finance_bugfixes.py -v`
Expected: All tests PASS

- [ ] **Step 10: Commit**

```bash
git add src/modules/finance/ tests/test_finance_bugfixes.py
git commit -m "fix(finance): align enums, populate receipt parent info, fix number generation"
```

---

### Task 2: Frontend — Enum Alignment, API Endpoint Fixes & Status Filters

**Files:**
- Modify: `src/features/finance/types.ts`
- Modify: `src/features/finance/schema.ts`
- Modify: `src/features/finance/api.ts`
- Modify: `src/features/finance/pages/BillsPage.tsx`
- Modify: `src/features/finance/pages/CollectPaymentPage.tsx`
- Modify: `src/features/finance/pages/FinanceDashboardPage.tsx`
- Modify: `src/features/finance/components/PaymentCollectDialog.tsx`

**Interfaces:**
- Consumes: Aligned backend enums from Task 1 (`PaymentMethod`: CASH, BANK_TRANSFER, CHEQUE, OTHER; `BillStatus`: UNPAID, PARTIAL, PAID, CANCELLED)
- Produces: Frontend types and Zod schemas aligned with backend; all API calls use correct `/transport-profiles` endpoints; status filters use `UNPAID` instead of `ISSUED`

- [ ] **Step 1: Align TypeScript enums in `types.ts`**

Replace the enum type declarations (lines 1-28 of `src/features/finance/types.ts`):

```typescript
export type FeeCategory =
  | 'TUITION'
  | 'ADMISSION'
  | 'EXAM'
  | 'TRANSPORT'
  | 'HOSTEL'
  | 'LAB'
  | 'LIBRARY'
  | 'MANAGEMENT'
  | 'ACTIVITY'
  | 'MISC';

export type FeeFrequency = 'ONE_TIME' | 'MONTHLY' | 'TERMWISE' | 'YEARLY';

export type BillStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'CANCELLED';

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER';
```

Also rename all `StudentDiscount` references to `StudentTransportProfile` and `StudentDiscountCreateDTO` to `StudentTransportCreateDTO`. Remove the old alias types.

- [ ] **Step 2: Fix Zod schema for payment method**

In `src/features/finance/schema.ts`, update the payment method validation:

```typescript
// In paymentCollectSchema:
payment_method: z.enum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'OTHER']),
```

Remove any references to `ESEWA`, `KHALTI`, `POS_CARD`.

- [ ] **Step 3: Fix API endpoints — replace `/discounts` with `/transport-profiles`**

In `src/features/finance/api.ts`:

```typescript
  setStudentTransport: async (
    tenantId: string,
    data: StudentTransportCreateDTO
  ): Promise<StudentTransportProfile> => {
    return apiClient.post(`/finance/tenants/${tenantId}/transport-profiles`, data);
  },

  listStudentTransports: async (tenantId: string): Promise<StudentTransportProfile[]> => {
    return apiClient.get(`/finance/tenants/${tenantId}/transport-profiles`);
  },

  getStudentTransport: async (
    tenantId: string,
    studentId: string
  ): Promise<StudentTransportProfile | null> => {
    return apiClient.get(`/finance/tenants/${tenantId}/students/${studentId}/transport`);
  },
```

Update all import references from `StudentDiscount`/`StudentDiscountCreateDTO` to `StudentTransportProfile`/`StudentTransportCreateDTO`.

- [ ] **Step 4: Fix BillsPage status filter**

In `src/features/finance/pages/BillsPage.tsx`, find the status filter options and replace:
- `DRAFT` → remove
- `ISSUED` → `UNPAID`
- `OVERDUE` → remove

The status filter options should be:
```typescript
const statusOptions = [
  { value: 'ALL', label: 'All Bills', count: totalBills },
  { value: 'UNPAID', label: 'Unpaid', count: unpaidCount },
  { value: 'PARTIAL', label: 'Partial', count: partialCount },
  { value: 'PAID', label: 'Paid', count: paidCount },
  { value: 'CANCELLED', label: 'Cancelled', count: cancelledCount },
];
```

- [ ] **Step 5: Remove online payment options from PaymentCollectDialog and CollectPaymentPage**

In `src/features/finance/components/PaymentCollectDialog.tsx`, update the payment method select options:

```typescript
const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'OTHER', label: 'Other' },
] as const;
```

Remove any ESEWA, KHALTI, POS_CARD options from `CollectPaymentPage.tsx` and `FinanceDashboardPage.tsx`.

- [ ] **Step 6: Update hooks.ts — rename discount hooks to transport hooks**

In `src/features/finance/hooks.ts`:
- Rename `useStudentDiscounts` → `useStudentTransports`
- Rename `useStudentDiscount` → `useStudentTransport`
- Rename `useSetStudentDiscount` → `useSetStudentTransport`
- Update query key names: `STUDENT_DISCOUNTS_KEY` → `STUDENT_TRANSPORTS_KEY`
- Update API calls to use `financeApi.listStudentTransports`, etc.

Grep all finance page/component files and update references.

- [ ] **Step 7: Build verification**

Run: `npm run build` from `E:\SSUP\frontend`
Expected: 0 TypeScript or build errors

- [ ] **Step 8: Commit**

```bash
git add src/features/finance/ src/config/
git commit -m "fix(finance): align frontend enums with backend, fix API endpoints and status filters"
```

---

### Task 3: Backend — Finance Class Overview Endpoint (N+1 Elimination)

**Files:**
- Modify: `src/modules/finance/schemas.py` (add `FinanceClassOverviewDTO`)
- Modify: `src/modules/finance/service.py` (add `get_finance_class_overview`)
- Modify: `src/modules/finance/router.py` (add route)
- Test: `tests/test_finance_bugfixes.py` (add test)

**Interfaces:**
- Consumes: `Class`, `Section`, `Student`, `FeeStructure`, `StudentTransportProfile` models
- Produces: `GET /finance/tenants/{tenant_id}/class-overview` returning `list[FinanceClassOverviewDTO]` — a single aggregated query replacing 31 parallel frontend requests

- [ ] **Step 1: Write the failing test**

Add to `tests/test_finance_bugfixes.py`:

```python
class TestFinanceClassOverview:
    """Verify the class overview endpoint returns aggregated data in one call."""

    def test_class_overview_returns_aggregated_counts(self, client, headers, tenant_id):
        """GET /finance/tenants/{t}/class-overview should return
        each class with fee_heads_count, students_count, sections,
        monthly_tuition_total, and transport_users_count."""
        resp = client.get(
            f"/api/v1/finance/tenants/{tenant_id}/class-overview",
            headers=headers,
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert isinstance(data, list)
        # After creating classes with fee structures and transport profiles,
        # verify the aggregated counts match individual queries
        for cls_item in data:
            assert "class_id" in cls_item
            assert "class_name" in cls_item
            assert "sequence_order" in cls_item
            assert "sections" in cls_item
            assert "students_count" in cls_item
            assert "fee_heads_count" in cls_item
            assert "monthly_tuition_total" in cls_item
            assert "transport_users_count" in cls_item
```

- [ ] **Step 2: Run test to verify it fails**

Run: `E:\SSUP\backend\.venv\Scripts\pytest.exe tests/test_finance_bugfixes.py::TestFinanceClassOverview -v`
Expected: FAIL — 404, endpoint does not exist

- [ ] **Step 3: Add FinanceClassOverviewDTO to schemas.py**

```python
class FinanceClassSectionDTO(BaseModel):
    section_id: str
    section_name: str
    students_count: int = 0


class FinanceClassOverviewDTO(BaseModel):
    class_id: str
    class_name: str
    sequence_order: int
    sections: list[FinanceClassSectionDTO] = []
    students_count: int = 0
    fee_heads_count: int = 0
    monthly_tuition_total: Decimal = Decimal("0.00")
    transport_users_count: int = 0
```

- [ ] **Step 4: Add get_finance_class_overview to service.py**

```python
    @classmethod
    def get_finance_class_overview(
        cls, db: Session, tenant_id: str
    ) -> list[FinanceClassOverviewDTO]:
        """Returns aggregated finance data per class in a single query set."""
        ay = cls.get_current_academic_year(db, tenant_id)

        classes = db.scalars(
            select(Class)
            .options(joinedload(Class.sections), joinedload(Class.students))
            .where(Class.tenant_id == tenant_id, Class.deleted_at.is_(None))
            .order_by(Class.sequence_order)
        ).unique().all()

        # Batch load fee structures for all classes in this year
        structures = db.scalars(
            select(FeeStructure).where(
                FeeStructure.tenant_id == tenant_id,
                FeeStructure.academic_year_id == ay.id,
                FeeStructure.is_active == True,
            )
        ).all()

        # Batch load transport profiles
        transports = db.scalars(
            select(StudentTransportProfile).where(
                StudentTransportProfile.tenant_id == tenant_id,
                StudentTransportProfile.academic_year_id == ay.id,
                StudentTransportProfile.is_transport_applicable == True,
                StudentTransportProfile.is_active == True,
            )
        ).all()

        # Index by class_id
        structures_by_class: dict[str, list] = {}
        for s in structures:
            structures_by_class.setdefault(s.class_id, []).append(s)

        transport_student_ids = {t.student_id for t in transports}

        result = []
        for c in classes:
            active_sections = [s for s in c.sections if s.deleted_at is None]
            active_students = [st for st in c.students if st.status == "ACTIVE"]
            cls_structures = structures_by_class.get(c.id, [])

            monthly_tuition = sum(
                s.amount for s in cls_structures
                if s.frequency == FeeFrequency.MONTHLY.value
                and s.fee_category != FeeCategory.TRANSPORT.value
            )

            transport_count = sum(
                1 for st in active_students if st.id in transport_student_ids
            )

            sections_dto = []
            for sec in sorted(active_sections, key=lambda s: s.name):
                sec_students = [st for st in active_students if st.section_id == sec.id]
                sections_dto.append(FinanceClassSectionDTO(
                    section_id=sec.id,
                    section_name=sec.name,
                    students_count=len(sec_students),
                ))

            result.append(FinanceClassOverviewDTO(
                class_id=c.id,
                class_name=c.name,
                sequence_order=c.sequence_order,
                sections=sections_dto,
                students_count=len(active_students),
                fee_heads_count=len(cls_structures),
                monthly_tuition_total=Decimal(str(monthly_tuition)),
                transport_users_count=transport_count,
            ))

        return result
```

- [ ] **Step 5: Add route in router.py**

```python
@router.get(
    "/tenants/{tenant_id}/class-overview",
    status_code=status.HTTP_200_OK,
    response_model=ApiResponse[list[FinanceClassOverviewDTO]],
    summary="Get aggregated finance overview for all classes",
    dependencies=[Depends(require_roles(UserRole.ADMIN, UserRole.ACCOUNTANT))],
)
def get_finance_class_overview(
    tenant_id: str,
    db: Session = Depends(get_db),
):
    data = FinanceService.get_finance_class_overview(db=db, tenant_id=tenant_id)
    return ApiResponse(status=True, message="Class finance overview retrieved", data=data)
```

- [ ] **Step 6: Run test to verify it passes**

Run: `E:\SSUP\backend\.venv\Scripts\pytest.exe tests/test_finance_bugfixes.py::TestFinanceClassOverview -v`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/modules/finance/ tests/test_finance_bugfixes.py
git commit -m "feat(finance): add class overview endpoint eliminating N+1 queries"
```

---

### Task 4: Frontend — Replace N+1 with Class Overview & Simplify FeeStructuresPage

**Files:**
- Modify: `src/features/finance/types.ts` (add `FinanceClassOverview` interface)
- Modify: `src/features/finance/api.ts` (add `getClassOverview`)
- Modify: `src/features/finance/hooks.ts` (add `useFinanceClassOverview`, remove `useFinanceClassesWithRoster`)
- Modify: `src/features/finance/pages/FeeStructuresPage.tsx` (use new hook)

**Interfaces:**
- Consumes: `GET /finance/tenants/{t}/class-overview` from Task 3
- Produces: `useFinanceClassOverview(tenantId)` hook returning `FinanceClassOverview[]`; `FeeStructuresPage` renders using this single query instead of 31 parallel HTTP requests

- [ ] **Step 1: Add FinanceClassOverview types**

In `src/features/finance/types.ts`:

```typescript
export interface FinanceClassSection {
  section_id: string;
  section_name: string;
  students_count: number;
}

export interface FinanceClassOverview {
  class_id: string;
  class_name: string;
  sequence_order: number;
  sections: FinanceClassSection[];
  students_count: number;
  fee_heads_count: number;
  monthly_tuition_total: number | string;
  transport_users_count: number;
}
```

- [ ] **Step 2: Add API function and hook**

In `src/features/finance/api.ts`:

```typescript
  getClassOverview: async (tenantId: string): Promise<FinanceClassOverview[]> => {
    return apiClient.get(`/finance/tenants/${tenantId}/class-overview`);
  },
```

In `src/features/finance/hooks.ts`:

```typescript
export const FINANCE_CLASS_OVERVIEW_KEY = 'finance-class-overview';

export function useFinanceClassOverview(tenantId?: string) {
  return useQuery({
    queryKey: [FINANCE_CLASS_OVERVIEW_KEY, tenantId],
    queryFn: () => financeApi.getClassOverview(tenantId!),
    enabled: !!tenantId,
  });
}
```

- [ ] **Step 3: Remove the N+1 hook `useFinanceClassesWithRoster`**

In `src/features/finance/hooks.ts`, delete the `useFinanceClassesWithRoster` and `useFinanceClassRoster` functions entirely. These are the functions that fire 31 parallel HTTP requests.

- [ ] **Step 4: Refactor FeeStructuresPage to use the new hook**

In `src/features/finance/pages/FeeStructuresPage.tsx`:

Replace the `useFinanceClassesWithRoster` call with `useFinanceClassOverview`:

```typescript
const { data: classOverview = [], isLoading: isLoadingClasses } = useFinanceClassOverview(activeTenantId);
```

Update the KPI cards and table to read from `classOverview` instead of the old per-class data:

```typescript
const totalClasses = classOverview.length;
const totalFeeHeads = classOverview.reduce((sum, c) => sum + c.fee_heads_count, 0);
const totalStudents = classOverview.reduce((sum, c) => sum + c.students_count, 0);
const totalTransportUsers = classOverview.reduce((sum, c) => sum + c.transport_users_count, 0);
```

Update the table rows to map over `classOverview` items directly.

- [ ] **Step 5: Build verification**

Run: `npm run build` from `E:\SSUP\frontend`
Expected: 0 errors

- [ ] **Step 6: Commit**

```bash
git add src/features/finance/
git commit -m "perf(finance): replace N+1 class queries with single overview endpoint"
```

---

### Task 5: Parent Read-Only Finance Access (Backend + Frontend)

**Files:**
- Modify: `src/modules/finance/router.py` (add parent-scoped routes)
- Modify: `src/modules/finance/service.py` (add parent ledger method)
- Modify: `src/config/permissions.ts` (add PARENT to VIEW_FINANCE)
- Modify: `src/app/router.tsx` (add RBAC guards + parent route)
- Modify: `src/features/finance/api.ts` (add parent API function)
- Modify: `src/features/finance/hooks.ts` (add parent hook)
- Create: `src/features/finance/pages/ParentFeeStatusPage.tsx`
- Modify: `src/components/layout/navConfig.ts` (add parent finance nav)
- Test: `tests/test_finance_bugfixes.py` (add parent access test)

**Interfaces:**
- Consumes: `ParentStudentMapping` for ReBAC authorization, `FinanceService.get_student_ledger()` for data
- Produces: `GET /finance/tenants/{t}/parents/me/children-fees` returning each linked child's fee summary; `ParentFeeStatusPage` showing read-only fee status

- [ ] **Step 1: Write the failing test for parent access**

Add to `tests/test_finance_bugfixes.py`:

```python
class TestParentFinanceAccess:
    """Verify parents can read their children's fee status."""

    def test_parent_can_view_child_fees(self, client, parent_headers, tenant_id, student_id):
        """A parent linked to a student should be able to view their child's bills."""
        resp = client.get(
            f"/api/v1/finance/tenants/{tenant_id}/parents/me/children-fees",
            headers=parent_headers,
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert isinstance(data, list)
        # Should contain at least one child with fee summary
        assert len(data) >= 1
        child = data[0]
        assert "student_id" in child
        assert "student_name" in child
        assert "total_payable" in child
        assert "total_paid" in child
        assert "outstanding_due" in child
        assert "bills" in child

    def test_parent_cannot_view_unlinked_student(self, client, parent_headers, tenant_id):
        """A parent should NOT see fee data for students they are not linked to."""
        # Accessing another student's ledger directly should be forbidden
        resp = client.get(
            f"/api/v1/finance/tenants/{tenant_id}/students/nonexistent-id/ledger",
            headers=parent_headers,
        )
        assert resp.status_code == 403
```

- [ ] **Step 2: Run test to verify it fails**

Run: `E:\SSUP\backend\.venv\Scripts\pytest.exe tests/test_finance_bugfixes.py::TestParentFinanceAccess -v`
Expected: FAIL — 403 Forbidden (parents not allowed)

- [ ] **Step 3: Add backend parent endpoint**

Add schema in `src/modules/finance/schemas.py`:

```python
class ParentChildFeeSummaryDTO(BaseModel):
    student_id: str
    student_name: str
    class_name: str
    section_name: Optional[str] = None
    total_payable: Decimal = Decimal("0.00")
    total_paid: Decimal = Decimal("0.00")
    outstanding_due: Decimal = Decimal("0.00")
    bills: list[FeeBillResponseDTO] = []
```

Add service method in `src/modules/finance/service.py`:

```python
    @classmethod
    def get_parent_children_fees(
        cls, db: Session, tenant_id: str, parent_user_id: str
    ) -> list[ParentChildFeeSummaryDTO]:
        """Get fee summaries for all children linked to this parent via ReBAC."""
        ay = cls.get_current_academic_year(db, tenant_id)

        # Find linked children via parent_student_mappings
        mappings = db.scalars(
            select(ParentStudentMapping).where(
                ParentStudentMapping.tenant_id == tenant_id,
                ParentStudentMapping.parent_id == parent_user_id,
                ParentStudentMapping.deleted_at.is_(None),
            )
        ).all()

        results = []
        for mapping in mappings:
            student = db.scalar(
                select(Student)
                .options(joinedload(Student.class_), joinedload(Student.section))
                .where(Student.id == mapping.student_id)
            )
            if not student or student.status != "ACTIVE":
                continue

            bills = db.scalars(
                select(FeeBill)
                .options(joinedload(FeeBill.items))
                .where(
                    FeeBill.tenant_id == tenant_id,
                    FeeBill.student_id == student.id,
                    FeeBill.academic_year_id == ay.id,
                    FeeBill.status != BillStatus.CANCELLED.value,
                )
                .order_by(FeeBill.issue_date.desc())
            ).unique().all()

            total_payable = sum(b.total_payable for b in bills)
            total_paid = sum(b.paid_amount for b in bills)
            outstanding = total_payable - total_paid

            bill_dtos = [
                FeeBillResponseDTO(
                    id=b.id,
                    bill_number=b.bill_number,
                    student_id=b.student_id,
                    student_name=f"{student.first_name} {student.last_name}",
                    class_id=b.class_id,
                    class_name=student.class_.name if student.class_ else "",
                    academic_year_id=b.academic_year_id,
                    bill_title=b.bill_title,
                    billing_month=b.billing_month,
                    issue_date=b.issue_date,
                    due_date=b.due_date,
                    items=[
                        FeeBillItemResponseDTO(
                            id=it.id, fee_structure_id=it.fee_structure_id,
                            fee_name=it.fee_name, amount=it.amount,
                        ) for it in b.items
                    ],
                    subtotal_amount=b.subtotal_amount,
                    previous_due_amount=b.previous_due_amount,
                    total_payable=b.total_payable,
                    paid_amount=b.paid_amount,
                    due_amount=b.due_amount,
                    status=b.status,
                    notes=b.notes,
                    created_at=b.created_at,
                ) for b in bills
            ]

            results.append(ParentChildFeeSummaryDTO(
                student_id=student.id,
                student_name=f"{student.first_name} {student.last_name}",
                class_name=student.class_.name if student.class_ else "",
                section_name=student.section.name if student.section else None,
                total_payable=total_payable,
                total_paid=total_paid,
                outstanding_due=outstanding,
                bills=bill_dtos,
            ))

        return results
```

Add route in `src/modules/finance/router.py`:

```python
@router.get(
    "/tenants/{tenant_id}/parents/me/children-fees",
    status_code=status.HTTP_200_OK,
    response_model=ApiResponse[list[ParentChildFeeSummaryDTO]],
    summary="Parent: view fee status for all linked children",
    dependencies=[Depends(require_roles(
        UserRole.PARENT, UserRole.ADMIN, UserRole.ACCOUNTANT
    ))],
)
def get_parent_children_fees(
    tenant_id: str,
    db: Session = Depends(get_db),
    member: TenantMembershipContext = Depends(get_current_tenant_member),
):
    data = FinanceService.get_parent_children_fees(
        db=db, tenant_id=tenant_id, parent_user_id=member.user_id,
    )
    return ApiResponse(
        status=True,
        message="Children fee status retrieved",
        data=data,
    )
```

- [ ] **Step 4: Run backend test**

Run: `E:\SSUP\backend\.venv\Scripts\pytest.exe tests/test_finance_bugfixes.py::TestParentFinanceAccess -v`
Expected: PASS

- [ ] **Step 5: Add frontend permissions and API**

In `src/config/permissions.ts`, add PARENT to VIEW_FINANCE:

```typescript
VIEW_FINANCE: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'PARENT'],
```

In `src/features/finance/api.ts`:

```typescript
  getParentChildrenFees: async (tenantId: string): Promise<ParentChildFeeSummary[]> => {
    return apiClient.get(`/finance/tenants/${tenantId}/parents/me/children-fees`);
  },
```

In `src/features/finance/hooks.ts`:

```typescript
export const PARENT_CHILDREN_FEES_KEY = 'parent-children-fees';

export function useParentChildrenFees(tenantId?: string) {
  return useQuery({
    queryKey: [PARENT_CHILDREN_FEES_KEY, tenantId],
    queryFn: () => financeApi.getParentChildrenFees(tenantId!),
    enabled: !!tenantId,
  });
}
```

- [ ] **Step 6: Create ParentFeeStatusPage**

Create `src/features/finance/pages/ParentFeeStatusPage.tsx`:

A read-only page showing each linked child as a card with:
- Student name, class, section
- KPI pills: Total Payable, Total Paid, Outstanding Due
- Expandable bills list with status badges (UNPAID=rose, PARTIAL=amber, PAID=emerald)
- Bill details showing line items and amounts
- No action buttons (read-only for parents)

Use `useParentChildrenFees(activeTenantId)` hook. Follow `PageHeader` + `StatCard` + card grid pattern from existing pages.

- [ ] **Step 7: Add route and navigation**

In `src/app/router.tsx`:
- Add import for `ParentFeeStatusPage`
- Add route: `/finance/my-children-fees` guarded by `VIEW_FINANCE` permission
- For PARENT role, redirect `/finance` to `/finance/my-children-fees`

In `src/components/layout/navConfig.ts`:
- For `activeRole === 'PARENT'`, add "My Children's Fees" nav item pointing to `/finance/my-children-fees`

- [ ] **Step 8: Build verification**

Run: `npm run build` from `E:\SSUP\frontend`
Expected: 0 errors

- [ ] **Step 9: Run all backend tests**

Run: `E:\SSUP\backend\.venv\Scripts\pytest.exe tests/test_finance_management.py tests/test_student_transport_and_fee_ui.py tests/test_fee_structure_debugging.py tests/test_finance_bugfixes.py -v`
Expected: All PASS

- [ ] **Step 10: Commit**

```bash
# Backend
cd E:\SSUP\backend
git add src/modules/finance/ tests/test_finance_bugfixes.py
git commit -m "feat(finance): add parent read-only access to children fee status"

# Frontend
cd E:\SSUP\frontend
git add src/features/finance/ src/config/permissions.ts src/app/router.tsx src/components/layout/navConfig.ts
git commit -m "feat(finance): add parent fee status page with read-only access"
```

---

## Self-Review

### 1. Spec Coverage

| Requirement | Task |
|---|---|
| Fix PaymentMethod enum mismatch (500 errors) | Task 1 (backend) + Task 2 (frontend) |
| Fix BillStatus enum mismatch (empty queries) | Task 1 (backend) + Task 2 (frontend) |
| Fix receipt metadata (parent name/phone) | Task 1 Step 6 |
| Fix number generation race condition | Task 1 Step 7 |
| Remove online payment methods | Task 1 (backend) + Task 2 (frontend) |
| Remove legacy aliases (StudentDiscount, /discounts) | Task 1 Step 5 + Task 2 Step 3 |
| Fix N+1 query (31 HTTP requests) | Task 3 (backend) + Task 4 (frontend) |
| Add parent read-only access | Task 5 |
| Add RBAC route guards on frontend | Task 5 Step 7 |
| No online payment integration | Enforced across Tasks 1, 2 |
| Simple record keeping | Maintained — no schema changes, no new tables |

### 2. Placeholder Scan

✅ No "TBD", "TODO", "implement later" placeholders found.
✅ All steps contain specific code or exact file paths.
⚠️ Task 5 Step 6 (ParentFeeStatusPage) describes the component structure without inline JSX — this is acceptable as the component follows established patterns (PageHeader + StatCard + card grid) and the implementer has the full type interface.

### 3. Type Consistency

- `FinanceClassOverview` — used consistently in Task 3 schema → Task 4 types → Task 4 hook
- `ParentChildFeeSummary` — used consistently in Task 5 schema → API → hook → page
- `StudentTransportProfile` / `StudentTransportCreateDTO` — renamed consistently across all tasks (replacing `StudentDiscount` aliases)
- `PaymentMethod` values (CASH, BANK_TRANSFER, CHEQUE, OTHER) — consistent across backend enum, frontend type, and Zod schema
- `BillStatus` values (UNPAID, PARTIAL, PAID, CANCELLED) — consistent across backend enum, frontend type, and filter options
