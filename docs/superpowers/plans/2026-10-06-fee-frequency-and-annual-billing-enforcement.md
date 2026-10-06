# Fee Frequency Semantics & Annual Billing Enforcement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce strict fee frequency semantics in billing so that `YEARLY` fees are billed at most once per academic session per student (in Baishakh for active classes or upon admission for mid-year joiners) and `ONE_TIME` fees are restricted to individual admission invoices, eliminating accidental duplicate billing in monthly runs.

**Architecture:** 
1. Backend `generate_batch_bills` validates that `YEARLY` fees are only submitted in Baishakh and pre-filters any already-billed annual fee heads per student in the session; `generate_single_bill` validates that `YEARLY` and `ONE_TIME` fee heads cannot be billed more than once per student per session.
2. Frontend `cashierUtils.ts` exposes `filterApplicableBatchFeeStructures` which `BatchBillingPage.tsx` integrates to automatically exclude/disable non-applicable frequencies based on the active billing month, auto-prune selections on month switch, and provide accurate live forecasts.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy, PostgreSQL, pytest, TypeScript, React 19, Tailwind CSS v4, node:test.

**Spec:** [`docs/superpowers/specs/2026-10-06-fee-frequency-and-annual-billing-enforcement-design.md`](file:///E:/SSUP/frontend/docs/superpowers/specs/2026-10-06-fee-frequency-and-annual-billing-enforcement-design.md)

## Global Constraints

- `YEARLY` fee heads can only be batch-billed in `Baishakh`. Batch billing for any other month (Jestha $\to$ Chaitra) must reject `YEARLY` and `ONE_TIME` fees with `400 Bad Request`.
- `ONE_TIME` fee heads (such as Admission Fees) cannot be batch-billed; they must be billed via single bill admission invoices.
- In Baishakh batch runs, if a student was already billed a specific `YEARLY` fee head in the session (e.g. via an earlier single bill), that specific fee item must be skipped for that student without crashing or failing other students.
- `generate_single_bill` must check whether a `YEARLY` or `ONE_TIME` fee head was already billed to the student in an active (non-cancelled) bill in the same session, blocking duplicate charges with `409 Conflict`.
- Cancelled bills (`FeeBill.status == 'CANCELLED'`) do not block re-billing.
- `npm run build` in `frontend` must compile with 0 TypeScript/bundler errors.
- All unit test suites in backend (`pytest`) and frontend (`node --test`) must pass with 100% green status.

---

### Task 1: Backend Batch Billing Frequency Guard & Duplicate Shield

**Files:**
- Create: `E:/SSUP/backend/tests/test_fee_frequency_enforcement.py`
- Modify: `E:/SSUP/backend/src/modules/finance/service.py:1261-1395`

**Interfaces:**
- Consumes: `FeeStructure.frequency`, `NepaliMonth`, `FeeBillItem`, `FeeBill.academic_year_id`
- Produces: Frequency-restricted batch bill generation with per-student duplicate annual fee protection.

- [ ] **Step 1: Write failing tests in `tests/test_fee_frequency_enforcement.py`**

```python
import os
import sys
import uuid
from datetime import date
from decimal import Decimal
import pytest
from sqlalchemy import select

sys.path.insert(0, os.path.realpath(os.path.join(os.path.dirname(__file__), "..")))

from src.core.database import SessionLocal
from src.core.exceptions import BadRequestException, ConflictException
from src.modules.tenant.models import Tenant
from src.modules.academic.models import AcademicYear, Class, Student
from src.modules.finance.enums import (
    BillStatus,
    FeeCategory,
    FeeFrequency,
    FeeLevel,
)
from src.modules.finance.models import FeeBill, FeeBillItem, FeeStructure
from src.modules.finance.schemas import (
    BatchBillGenerateDTO,
    SingleBillGenerateDTO,
    FeeItemInputDTO,
)
from src.modules.finance.service import FinanceService


@pytest.fixture
def frequency_setup(default_academic_year):
    db = SessionLocal()
    suffix = uuid.uuid4().hex[:6]
    tenant = Tenant(
        id=str(uuid.uuid4()),
        name=f"Freq Academy {suffix}",
        domain_name=f"freq-{suffix}",
        email=f"freq_{suffix}@test.com",
        phone="9841000001",
        is_active=True,
    )
    db.add(tenant)
    db.commit()
    db.refresh(tenant)

    ay = default_academic_year(db, tenant.id)

    cls = Class(
        id=str(uuid.uuid4()),
        tenant_id=tenant.id,
        name="Grade 5",
        sequence_order=5,
    )
    db.add(cls)
    db.commit()

    student1 = Student(
        id=str(uuid.uuid4()),
        tenant_id=tenant.id,
        class_id=cls.id,
        first_name="Rohan",
        last_name="Sharma",
        status="ACTIVE",
    )
    student2 = Student(
        id=str(uuid.uuid4()),
        tenant_id=tenant.id,
        class_id=cls.id,
        first_name="Pooja",
        last_name="Karki",
        status="ACTIVE",
    )
    db.add_all([student1, student2])

    fs_tuition = FeeStructure(
        id=str(uuid.uuid4()),
        tenant_id=tenant.id,
        academic_year_id=ay.id,
        class_id=cls.id,
        name="Monthly Tuition",
        fee_category=FeeCategory.TUITION.value,
        fee_level=FeeLevel.CLASS.value,
        frequency=FeeFrequency.MONTHLY.value,
        amount=Decimal("3000.00"),
        is_active=True,
    )
    fs_annual = FeeStructure(
        id=str(uuid.uuid4()),
        tenant_id=tenant.id,
        academic_year_id=ay.id,
        class_id=cls.id,
        name="Annual Development Fee",
        fee_category=FeeCategory.MANAGEMENT.value,
        fee_level=FeeLevel.CLASS.value,
        frequency=FeeFrequency.YEARLY.value,
        amount=Decimal("5000.00"),
        is_active=True,
    )
    fs_admission = FeeStructure(
        id=str(uuid.uuid4()),
        tenant_id=tenant.id,
        academic_year_id=ay.id,
        class_id=cls.id,
        name="One-Time Admission Fee",
        fee_category=FeeCategory.ADMISSION.value,
        fee_level=FeeLevel.CLASS.value,
        frequency=FeeFrequency.ONE_TIME.value,
        amount=Decimal("2000.00"),
        is_active=True,
    )
    db.add_all([fs_tuition, fs_annual, fs_admission])
    db.commit()

    yield {
        "db": db,
        "tenant": tenant,
        "ay": ay,
        "class_obj": cls,
        "student1": student1,
        "student2": student2,
        "fs_tuition": fs_tuition,
        "fs_annual": fs_annual,
        "fs_admission": fs_admission,
    }
    db.close()


def test_batch_billing_baishakh_allows_yearly_fees(frequency_setup):
    data = frequency_setup
    db = data["db"]
    tenant = data["tenant"]
    cls = data["class_obj"]
    fs_tuition = data["fs_tuition"]
    fs_annual = data["fs_annual"]

    dto = BatchBillGenerateDTO(
        class_id=cls.id,
        billing_month="Baishakh",
        fee_structure_ids=[fs_tuition.id, fs_annual.id],
        due_date=date(2026, 5, 15),
    )
    resp = FinanceService.generate_batch_bills(db, tenant.id, dto)
    assert resp.generated_count == 2
    for b in resp.bills:
        assert b.total_payable == Decimal("8000.00")
        assert len(b.items) == 2


def test_batch_billing_jestha_rejects_yearly_and_onetime_fees(frequency_setup):
    data = frequency_setup
    db = data["db"]
    tenant = data["tenant"]
    cls = data["class_obj"]
    fs_tuition = data["fs_tuition"]
    fs_annual = data["fs_annual"]
    fs_admission = data["fs_admission"]

    # First bill Baishakh with tuition only so sequential check allows Jestha
    dto_bais = BatchBillGenerateDTO(
        class_id=cls.id,
        billing_month="Baishakh",
        fee_structure_ids=[fs_tuition.id],
        due_date=date(2026, 5, 15),
    )
    FinanceService.generate_batch_bills(db, tenant.id, dto_bais)

    # Attempting to include Annual Fee in Jestha batch must raise BadRequestException
    dto_jestha_annual = BatchBillGenerateDTO(
        class_id=cls.id,
        billing_month="Jestha",
        fee_structure_ids=[fs_tuition.id, fs_annual.id],
        due_date=date(2026, 6, 15),
    )
    with pytest.raises(BadRequestException) as exc_annual:
        FinanceService.generate_batch_bills(db, tenant.id, dto_jestha_annual)
    assert "cannot be included in Jestha batch billing" in str(exc_annual.value)

    # Attempting to include ONE_TIME Admission Fee in Jestha batch must raise BadRequestException
    dto_jestha_adm = BatchBillGenerateDTO(
        class_id=cls.id,
        billing_month="Jestha",
        fee_structure_ids=[fs_tuition.id, fs_admission.id],
        due_date=date(2026, 6, 15),
    )
    with pytest.raises(BadRequestException) as exc_adm:
        FinanceService.generate_batch_bills(db, tenant.id, dto_jestha_adm)
    assert "ONE_TIME" in str(exc_adm.value)


def test_batch_billing_baishakh_rejects_onetime_fees(frequency_setup):
    data = frequency_setup
    db = data["db"]
    tenant = data["tenant"]
    cls = data["class_obj"]
    fs_tuition = data["fs_tuition"]
    fs_admission = data["fs_admission"]

    # ONE_TIME fees are excluded from batch runs even in Baishakh
    dto = BatchBillGenerateDTO(
        class_id=cls.id,
        billing_month="Baishakh",
        fee_structure_ids=[fs_tuition.id, fs_admission.id],
        due_date=date(2026, 5, 15),
    )
    with pytest.raises(BadRequestException) as exc:
        FinanceService.generate_batch_bills(db, tenant.id, dto)
    assert "ONE_TIME" in str(exc.value)


def test_batch_billing_skips_duplicate_yearly_fee_for_prebilled_student(frequency_setup):
    data = frequency_setup
    db = data["db"]
    tenant = data["tenant"]
    cls = data["class_obj"]
    student1 = data["student1"]
    student2 = data["student2"]
    fs_tuition = data["fs_tuition"]
    fs_annual = data["fs_annual"]

    # Student 1 received Annual fee early via single bill
    early_dto = SingleBillGenerateDTO(
        student_id=student1.id,
        bill_title="Early Annual Enrollment",
        billing_month="Baishakh",
        due_date=date(2026, 5, 15),
        fee_items=[FeeItemInputDTO(fee_name="Annual Development Fee", amount=Decimal("5000.00"), fee_structure_id=fs_annual.id)],
    )
    FinanceService.generate_single_bill(db, tenant.id, early_dto)

    # Now class batch bill is generated for Baishakh with tuition + annual
    dto_batch = BatchBillGenerateDTO(
        class_id=cls.id,
        billing_month="Baishakh",
        fee_structure_ids=[fs_tuition.id, fs_annual.id],
        due_date=date(2026, 5, 15),
    )
    resp = FinanceService.generate_batch_bills(db, tenant.id, dto_batch)
    assert resp.generated_count == 2

    # Student 1's batch bill has ONLY tuition (3000), annual was skipped
    bill_s1 = next(b for b in resp.bills if b.student_id == student1.id)
    assert bill_s1.total_payable == Decimal("3000.00")
    assert len(bill_s1.items) == 1
    assert bill_s1.items[0].fee_name == "Monthly Tuition"

    # Student 2's batch bill has BOTH tuition and annual (8000)
    bill_s2 = next(b for b in resp.bills if b.student_id == student2.id)
    assert bill_s2.total_payable == Decimal("8000.00")
    assert len(bill_s2.items) == 2
```

- [ ] **Step 2: Run test to verify it fails**

Run: `E:\SSUP\backend\.venv\Scripts\pytest tests/test_fee_frequency_enforcement.py -v`  
Expected: FAIL (Jestha and Baishakh batch bills do not yet enforce frequency restrictions)

- [ ] **Step 3: Implement frequency validation and duplicate shield in `src/modules/finance/service.py`**

In `generate_batch_bills` (`src/modules/finance/service.py`):
1. Validate that if `billing_month != "Baishakh"`:
   - Any structure in `structures` where `s.frequency in (FeeFrequency.YEARLY.value, FeeFrequency.ONE_TIME.value)` raises `BadRequestException(f"Fee head '{s.name}' ({s.frequency}) cannot be included in {billing_month} batch billing. Yearly fees are only billable in Baishakh.")`.
2. Validate that in `Baishakh`:
   - Any structure in `structures` where `s.frequency == FeeFrequency.ONE_TIME.value` raises `BadRequestException(f"Fee head '{s.name}' (ONE_TIME) cannot be billed in batch mode. One-time fees must be billed via individual admission invoices.")`.
3. Pre-query active billed structures for students in this class:
   ```python
   billed_items_records = db.execute(
       select(FeeBill.student_id, FeeBillItem.fee_structure_id)
       .join(FeeBillItem, FeeBill.id == FeeBillItem.bill_id)
       .where(
           FeeBill.tenant_id == tenant_id,
           FeeBill.academic_year_id == ay.id,
           FeeBill.student_id.in_(student_ids),
           FeeBill.status != BillStatus.CANCELLED.value,
           FeeBillItem.fee_structure_id.isnot(None),
       )
   ).all()
   billed_structures_by_student = set((row[0], row[1]) for row in billed_items_records)
   ```
4. In student loop when filtering `applicable_structures`:
   If `s.frequency == FeeFrequency.YEARLY.value` and `(student.id, s.id) in billed_structures_by_student`:
   Skip adding `s` to `bill_items_to_create` for this student.

- [ ] **Step 4: Run test to verify it passes**

Run: `E:\SSUP\backend\.venv\Scripts\pytest tests/test_fee_frequency_enforcement.py -v`  
Expected: PASS (all 4 tests pass)

- [ ] **Step 5: Commit backend changes**

```bash
git add src/modules/finance/service.py tests/test_fee_frequency_enforcement.py
git commit -m "feat(finance): enforce fee frequency restrictions and duplicate annual fee shield in batch billing"
```

---

### Task 2: Backend Single Bill Annual & One-Time Duplicate Validation

**Files:**
- Modify: `E:/SSUP/backend/src/modules/finance/service.py:1450-1540` (`generate_single_bill`)
- Modify: `E:/SSUP/backend/tests/test_fee_frequency_enforcement.py`

**Interfaces:**
- Consumes: `SingleBillGenerateDTO.fee_items`, `FeeStructure.frequency`
- Produces: Single bill generator blocking duplicate annual and one-time fees per student session.

- [ ] **Step 1: Add failing tests for single bill duplicate check**

Append to `E:/SSUP/backend/tests/test_fee_frequency_enforcement.py`:

```python
def test_single_bill_blocks_duplicate_yearly_fee_in_same_session(frequency_setup):
    data = frequency_setup
    db = data["db"]
    tenant = data["tenant"]
    student = data["student1"]
    fs_annual = data["fs_annual"]

    # 1. Issue first bill with Annual Development Fee
    dto1 = SingleBillGenerateDTO(
        student_id=student.id,
        bill_title="Session Opening Bill",
        billing_month="Baishakh",
        due_date=date(2026, 5, 15),
        fee_items=[FeeItemInputDTO(fee_name="Annual Development Fee", amount=Decimal("5000.00"), fee_structure_id=fs_annual.id)],
    )
    bill1 = FinanceService.generate_single_bill(db, tenant.id, dto1)
    assert bill1.total_payable == Decimal("5000.00")

    # 2. Attempting to bill the same Annual Development Fee again must raise ConflictException
    dto2 = SingleBillGenerateDTO(
        student_id=student.id,
        bill_title="Duplicate Annual Charge Attempt",
        billing_month="Jestha",
        due_date=date(2026, 6, 15),
        fee_items=[FeeItemInputDTO(fee_name="Annual Development Fee", amount=Decimal("5000.00"), fee_structure_id=fs_annual.id)],
    )
    with pytest.raises(ConflictException) as exc:
        FinanceService.generate_single_bill(db, tenant.id, dto2)
    assert "has already been billed to this student in Bill #" in str(exc.value)


def test_cancelled_bill_allows_yearly_fee_rebilling(frequency_setup):
    data = frequency_setup
    db = data["db"]
    tenant = data["tenant"]
    student = data["student1"]
    fs_annual = data["fs_annual"]

    dto1 = SingleBillGenerateDTO(
        student_id=student.id,
        bill_title="Erroneous Bill",
        billing_month="Baishakh",
        due_date=date(2026, 5, 15),
        fee_items=[FeeItemInputDTO(fee_name="Annual Development Fee", amount=Decimal("5000.00"), fee_structure_id=fs_annual.id)],
    )
    bill1 = FinanceService.generate_single_bill(db, tenant.id, dto1)

    # Cancel the unpaid bill
    FinanceService.void_and_cancel_bill(db, tenant.id, bill1.id, reason="Correction needed")

    # Now generating again succeeds because the previous bill is CANCELLED
    dto2 = SingleBillGenerateDTO(
        student_id=student.id,
        bill_title="Corrected Opening Bill",
        billing_month="Baishakh",
        due_date=date(2026, 5, 15),
        fee_items=[FeeItemInputDTO(fee_name="Annual Development Fee", amount=Decimal("5000.00"), fee_structure_id=fs_annual.id)],
    )
    bill2 = FinanceService.generate_single_bill(db, tenant.id, dto2)
    assert bill2.total_payable == Decimal("5000.00")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `E:\SSUP\backend\.venv\Scripts\pytest tests/test_fee_frequency_enforcement.py -k "test_single_bill_blocks_duplicate_yearly_fee" -v`  
Expected: FAIL (`generate_single_bill` does not currently block duplicate annual fee structures)

- [ ] **Step 3: Implement duplicate validation in `generate_single_bill`**

In `generate_single_bill` (`src/modules/finance/service.py`):
For any item in `data.fee_items` with a valid `fee_structure_id`:
1. Fetch structure `fs`.
2. If `fs.frequency in (FeeFrequency.YEARLY.value, FeeFrequency.ONE_TIME.value)`:
   Check if the student has an active bill referencing this structure in the current academic year:
   ```python
   existing_bill_number = db.scalar(
       select(FeeBill.bill_number)
       .join(FeeBillItem, FeeBill.id == FeeBillItem.bill_id)
       .where(
           FeeBill.tenant_id == tenant_id,
           FeeBill.academic_year_id == ay.id,
           FeeBill.student_id == student.id,
           FeeBill.status != BillStatus.CANCELLED.value,
           FeeBillItem.fee_structure_id == fs.id,
       )
   )
   if existing_bill_number:
       raise ConflictException(
           f"Fee head '{fs.name}' ({fs.frequency}) has already been billed to this student in Bill #{existing_bill_number} for this academic session."
       )
   ```

- [ ] **Step 4: Run all backend tests to verify they pass**

Run: `E:\SSUP\backend\.venv\Scripts\pytest tests/test_fee_frequency_enforcement.py -v`  
Expected: PASS (all 6 tests pass)

- [ ] **Step 5: Commit backend changes**

```bash
git add src/modules/finance/service.py tests/test_fee_frequency_enforcement.py
git commit -m "feat(finance): prevent duplicate annual and one-time fee structures in single bill generation"
```

---

### Task 3: Frontend Frequency-Aware Filter Helper & Unit Tests

**Files:**
- Modify: `E:/SSUP/frontend/src/features/finance/utils/cashierUtils.ts`
- Modify: `E:/SSUP/frontend/src/features/finance/components/__tests__/cashierAndReceipt.test.mjs`

**Interfaces:**
- Consumes: `FeeStructure` from `../types`
- Produces: `filterApplicableBatchFeeStructures(month: string, structures: FeeStructure[])`

- [ ] **Step 1: Write failing tests in `cashierAndReceipt.test.mjs`**

Add unit tests to `cashierAndReceipt.test.mjs`:

```javascript
test('filterApplicableBatchFeeStructures: Baishakh allows MONTHLY and YEARLY, excludes ONE_TIME', () => {
  const structures = [
    { id: '1', name: 'Tuition Fee', frequency: 'MONTHLY' },
    { id: '2', name: 'Annual Charge', frequency: 'YEARLY' },
    { id: '3', name: 'Admission Fee', frequency: 'ONE_TIME' },
    { id: '4', name: 'Exam Fee', frequency: 'TERMWISE' },
  ];

  const result = filterApplicableBatchFeeStructures('Baishakh', structures);
  assert.deepEqual(result.applicableIds, ['1', '2']);
  assert.equal(result.disabledStructures.length, 2);
  assert.equal(result.disabledStructures.find(s => s.id === '3')?.reason, 'Admission Only');
});

test('filterApplicableBatchFeeStructures: Jestha through Chaitra allows only MONTHLY', () => {
  const structures = [
    { id: '1', name: 'Tuition Fee', frequency: 'MONTHLY' },
    { id: '2', name: 'Annual Charge', frequency: 'YEARLY' },
    { id: '3', name: 'Admission Fee', frequency: 'ONE_TIME' },
  ];

  const result = filterApplicableBatchFeeStructures('Jestha', structures);
  assert.deepEqual(result.applicableIds, ['1']);
  assert.equal(result.disabledStructures.length, 2);
  assert.equal(result.disabledStructures.find(s => s.id === '2')?.reason, 'Yearly (Baishakh Only)');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/features/finance/components/__tests__/cashierAndReceipt.test.mjs`  
Expected: FAIL (`filterApplicableBatchFeeStructures` is not defined)

- [ ] **Step 3: Implement `filterApplicableBatchFeeStructures` in `cashierUtils.ts`**

In `src/features/finance/utils/cashierUtils.ts`:
```typescript
export interface BatchFeeFilterResult {
  applicableStructures: FeeStructure[];
  applicableIds: string[];
  disabledStructures: { structure: FeeStructure; reason: string }[];
}

export function filterApplicableBatchFeeStructures(
  month: string,
  structures?: FeeStructure[] | null
): BatchFeeFilterResult {
  if (!structures || structures.length === 0) {
    return { applicableStructures: [], applicableIds: [], disabledStructures: [] };
  }

  const isBaishakh = month?.toLowerCase() === 'baishakh';
  const applicableStructures: FeeStructure[] = [];
  const disabledStructures: { structure: FeeStructure; reason: string }[] = [];

  for (const s of structures) {
    const freq = (s.frequency || 'MONTHLY').toUpperCase();
    if (freq === 'ONE_TIME') {
      disabledStructures.push({ structure: s, reason: 'Admission Only' });
    } else if (freq === 'YEARLY') {
      if (isBaishakh) {
        applicableStructures.push(s);
      } else {
        disabledStructures.push({ structure: s, reason: 'Yearly (Baishakh Only)' });
      }
    } else if (freq === 'TERMWISE') {
      // Termwise fees are not auto-billed in standard monthly runs
      disabledStructures.push({ structure: s, reason: 'Termwise (Ad-hoc Only)' });
    } else {
      // MONTHLY
      applicableStructures.push(s);
    }
  }

  return {
    applicableStructures,
    applicableIds: applicableStructures.map((s) => s.id),
    disabledStructures,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/features/finance/components/__tests__/cashierAndReceipt.test.mjs`  
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add src/features/finance/utils/cashierUtils.ts src/features/finance/components/__tests__/cashierAndReceipt.test.mjs
git commit -m "feat(finance): add filterApplicableBatchFeeStructures utility and tests"
```

---

### Task 4: Frontend Batch Billing Wizard Reactive Integration

**Files:**
- Modify: `E:/SSUP/frontend/src/features/finance/pages/BatchBillingPage.tsx:158-330`

**Interfaces:**
- Consumes: `filterApplicableBatchFeeStructures` from `../utils/cashierUtils`
- Produces: Dynamic month-aware fee selection grid, auto-pruning, disabled badges, and live calculations.

- [ ] **Step 1: Integrate `filterApplicableBatchFeeStructures` in `BatchBillingPage.tsx`**

1. Import `filterApplicableBatchFeeStructures` from `../utils/cashierUtils`.
2. Compute applicable vs disabled structures reactively based on `selectedMonth`:
   ```typescript
   const feeFilterMeta = useMemo(() => {
     return filterApplicableBatchFeeStructures(selectedMonth, allAvailableStructures);
   }, [selectedMonth, allAvailableStructures]);
   ```
3. Update default auto-selection on initial load or class change:
   Instead of selecting all structures, select `feeFilterMeta.applicableIds`.
4. Add month switch listener:
   When `selectedMonth` changes (e.g. from Baishakh to Jestha), prune any IDs from `watchedFeeStructureIds` that are not in `feeFilterMeta.applicableIds`:
   ```typescript
   useEffect(() => {
     const currentSelected = watch('fee_structure_ids') || [];
     const validSelected = currentSelected.filter((id) =>
       feeFilterMeta.applicableIds.includes(id)
     );
     // If month switched to Jestha, prune yearly fee IDs immediately
     if (validSelected.length !== currentSelected.length) {
       setValue('fee_structure_ids', validSelected);
     }
   }, [feeFilterMeta.applicableIds, setValue, watch]);
   ```
5. Update "Select All":
   ```typescript
   const handleSelectAll = () => {
     setValue('fee_structure_ids', feeFilterMeta.applicableIds);
   };
   ```
6. In Fee Structure Card / Checkbox grid:
   If a structure is in `feeFilterMeta.disabledStructures`:
   - Disable checkbox.
   - Display distinct badge (e.g., amber outline badge: `Yearly (Baishakh Only)`).
   - Show helpful tooltip explaining why it cannot be selected.

- [ ] **Step 2: Run all frontend unit tests**

Run: `node --test src/**/*.test.mjs`  
Expected: 100% PASS (108+ tests pass)

- [ ] **Step 3: Run production build verification**

Run: `npm run build` in `E:\SSUP\frontend`  
Expected: SUCCESS with 0 TypeScript/bundler errors

- [ ] **Step 4: Commit frontend changes**

```bash
git add src/features/finance/pages/BatchBillingPage.tsx
git commit -m "feat(finance): integrate month-aware fee filtering and annual fee locking in BatchBillingPage"
```

---

### Task 5: Full Regression Testing & Branch Verification

**Files:**
- Run backend pytest suite: `E:\SSUP\backend\.venv\Scripts\pytest tests/`
- Run frontend unit tests: `node --test src/**/*.test.mjs`
- Run frontend build: `npm run build`

- [ ] **Step 1: Run complete backend test suite**

Run: `E:\SSUP\backend\.venv\Scripts\pytest -v`  
Expected: All tests pass

- [ ] **Step 2: Run complete frontend test suite**

Run: `node --test src/**/*.test.mjs`  
Expected: All tests pass

- [ ] **Step 3: Run production build**

Run: `npm run build`  
Expected: Clean build in ~1s

- [ ] **Step 4: Push to remote origin on branch `nabin` in both repositories**

```bash
cd E:\SSUP\backend && git push origin nabin
cd E:\SSUP\frontend && git push origin nabin
```
