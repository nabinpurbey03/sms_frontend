# Strict Sequential Monthly Billing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce strict chronological invoice generation (Baishakh $\to$ Jestha $\to$ Ashadh $\dots \to$ Chaitra) in SSUP's finance module, preventing skipped months and retroactively generating past months out-of-order, thereby guaranteeing rolling arrears integrity.

**Architecture:** 
1. **Backend Validation Guard:** Introduce `validate_sequential_billing_month` in `FinanceService` that verifies both predecessor completeness (no skipped months) and successor absence (no backdated billing when future bills exist) for both batch and single bill generation endpoints.
2. **Frontend Sequential Engine:** Update `cashierUtils.ts:computeMonthStatus` and helper `getNextSequentialMonth` to classify months into strict states (`GENERATED`, `AVAILABLE_NEXT`, `AVAILABLE_RUNNING`, `LOCKED_SEQUENCE`, `LOCKED_PAST`, `FUTURE_LOCKED`).
3. **BatchBillingPage UI/UX:** Automatically highlight and pre-select the exact next sequential month, display intuitive status badges and lock tooltips, and prevent submitting out-of-order months.

**Tech Stack:** FastAPI, SQLAlchemy, PostgreSQL, React 19, TypeScript, Tailwind CSS, Lucide icons, Vite, Node test runner (`node --test`), pytest.

**Spec / Alignment:** Brainstorming session on 2026-10-05 adopting Approach 1 (Strict Sequential Enforcement).

---

## Global Constraints

- **Single Next Month Rule:** Within any academic session, for any class or student, billing must strictly advance from Baishakh through Chaitra. At any given time, only the immediate next unbilled month is eligible for generation.
- **Back-Billing Prohibition:** Once month $M$ is generated, any prior month $< M$ can never be generated out-of-order. Backdated generation raises HTTP 409 Conflict.
- **Rollback via LIFO Cancellation:** If an accountant generated Shrawan in error and must re-bill Ashadh, they must first cancel Shrawan (if unpaid), maintaining reverse-chronological integrity.
- **All 94 existing frontend tests and backend pytest suites must continue to pass.**

---

### Task 1: Backend Sequential Month Validation Engine & Unit Tests

**Files:**
- Modify: `E:/SSUP/backend/src/modules/finance/enums.py`
- Modify: `E:/SSUP/backend/src/modules/finance/service.py`
- Modify: `E:/SSUP/backend/tests/test_monthly_billing_engine.py`
- Create: `E:/SSUP/backend/tests/test_strict_sequential_billing.py`

**Interfaces:**
- `NepaliMonth.get_index(cls, month: Union[NepaliMonth, str]) -> int`: Returns 0-based month index (0 for Baishakh, 11 for Chaitra).
- `NepaliMonth.get_preceding_months(cls, month: Union[NepaliMonth, str]) -> list[str]`: Returns list of all months strictly before `month`.
- `NepaliMonth.get_subsequent_months(cls, month: Union[NepaliMonth, str]) -> list[str]`: Returns list of all months strictly after `month`.
- `FinanceService.validate_sequential_billing_month(cls, db: Session, tenant_id: str, academic_year_id: str, billing_month: str, class_id: Optional[str] = None, student_id: Optional[str] = None) -> None`: Raises `ConflictException` if predecessor missing or successor exists.

- [ ] **Step 1: Write failing backend unit tests in `tests/test_strict_sequential_billing.py`**

```python
import uuid
from decimal import Decimal
from datetime import date
import pytest
from sqlalchemy import select

from src.core.database import SessionLocal
from src.core.exceptions import ConflictException
from src.modules.tenant.models import Tenant
from src.modules.academic.models import Class, Section, Student
from src.modules.finance.enums import BillStatus, FeeCategory, FeeFrequency, FeeLevel, NepaliMonth
from src.modules.finance.models import FeeBill, FeeStructure
from src.modules.finance.schemas import BatchBillGenerateDTO, SingleBillGenerateDTO
from src.modules.finance.service import FinanceService


@pytest.fixture
def sequential_setup(default_academic_year):
    db = SessionLocal()
    suffix = uuid.uuid4().hex[:6]
    tenant = Tenant(
        id=str(uuid.uuid4()),
        name=f"Sequential Academy {suffix}",
        domain_name=f"seq-{suffix}",
        email=f"seq_{suffix}@test.com",
        phone="9841000000",
        is_active=True,
    )
    db.add(tenant)
    db.commit()
    db.refresh(tenant)

    ay = default_academic_year(db, tenant.id)

    cls_a = Class(id=str(uuid.uuid4()), tenant_id=tenant.id, name="Grade 5", sequence_order=5)
    db.add(cls_a)
    db.commit()

    student = Student(
        id=str(uuid.uuid4()),
        tenant_id=tenant.id,
        class_id=cls_a.id,
        first_name="Rohan",
        last_name="Shrestha",
        status="ACTIVE",
    )
    db.add(student)

    fs = FeeStructure(
        id=str(uuid.uuid4()),
        tenant_id=tenant.id,
        academic_year_id=ay.id,
        class_id=cls_a.id,
        name="Monthly Tuition",
        fee_category=FeeCategory.TUITION.value,
        fee_level=FeeLevel.CLASS.value,
        frequency=FeeFrequency.MONTHLY.value,
        amount=Decimal("2000.00"),
        is_active=True,
    )
    db.add(fs)
    db.commit()

    yield {
        "db": db,
        "tenant": tenant,
        "ay": ay,
        "class_obj": cls_a,
        "student": student,
        "fs": fs,
    }
    db.close()


def test_nepali_month_ordering_helpers():
    assert NepaliMonth.get_index("Baishakh") == 0
    assert NepaliMonth.get_index("Jestha") == 1
    assert NepaliMonth.get_index("Chaitra") == 11
    assert NepaliMonth.get_preceding_months("Baishakh") == []
    assert NepaliMonth.get_preceding_months("Jestha") == ["Baishakh"]
    assert NepaliMonth.get_preceding_months("Ashadh") == ["Baishakh", "Jestha"]
    assert NepaliMonth.get_subsequent_months("Falgun") == ["Chaitra"]
    assert NepaliMonth.get_subsequent_months("Chaitra") == []


def test_batch_billing_blocks_skipping_months(sequential_setup):
    data = sequential_setup
    db = data["db"]
    tenant = data["tenant"]
    cls_a = data["class_obj"]
    fs = data["fs"]

    # Attempting to generate Shrawan (Month 4) when Baishakh (Month 1) has not been generated must fail
    dto = BatchBillGenerateDTO(
        class_id=cls_a.id,
        billing_month="Shrawan",
        fee_structure_ids=[fs.id],
        due_date=date(2026, 8, 15),
    )
    with pytest.raises(ConflictException) as exc_info:
        FinanceService.generate_batch_bills(db, tenant.id, dto)

    assert "preceding month 'baishakh' has not been billed yet" in str(exc_info.value).lower()


def test_batch_billing_sequential_progression_and_backbill_block(sequential_setup):
    data = sequential_setup
    db = data["db"]
    tenant = data["tenant"]
    cls_a = data["class_obj"]
    fs = data["fs"]

    # 1. Baishakh succeeds
    dto_bais = BatchBillGenerateDTO(
        class_id=cls_a.id,
        billing_month="Baishakh",
        fee_structure_ids=[fs.id],
        due_date=date(2026, 5, 15),
    )
    resp_bais = FinanceService.generate_batch_bills(db, tenant.id, dto_bais)
    assert resp_bais.generated_count == 1

    # 2. Ashadh fails because Jestha is skipped
    dto_ashadh = BatchBillGenerateDTO(
        class_id=cls_a.id,
        billing_month="Ashadh",
        fee_structure_ids=[fs.id],
        due_date=date(2026, 7, 15),
    )
    with pytest.raises(ConflictException) as exc_info:
        FinanceService.generate_batch_bills(db, tenant.id, dto_ashadh)
    assert "preceding month 'jestha' has not been billed yet" in str(exc_info.value).lower()

    # 3. Jestha succeeds
    dto_jestha = BatchBillGenerateDTO(
        class_id=cls_a.id,
        billing_month="Jestha",
        fee_structure_ids=[fs.id],
        due_date=date(2026, 6, 15),
    )
    resp_jes = FinanceService.generate_batch_bills(db, tenant.id, dto_jestha)
    assert resp_jes.generated_count == 1

    # 4. Attempting to back-bill Baishakh after Jestha is blocked
    with pytest.raises(ConflictException) as exc_info:
        FinanceService.generate_batch_bills(db, tenant.id, dto_bais)
    assert "already been generated" in str(exc_info.value).lower()


def test_single_bill_enforces_sequential_order(sequential_setup):
    data = sequential_setup
    db = data["db"]
    tenant = data["tenant"]
    student = data["student"]

    dto = SingleBillGenerateDTO(
        student_id=student.id,
        billing_month="Ashwin",
        fee_items=[],
        due_date=date(2026, 10, 15),
    )
    with pytest.raises(ConflictException) as exc_info:
        FinanceService.generate_single_bill(db, tenant.id, dto)

    assert "preceding month 'baishakh' has not been billed yet" in str(exc_info.value).lower()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv\Scripts\pytest tests/test_strict_sequential_billing.py -v` in `E:\SSUP\backend`
Expected: FAIL with AttributeError or missing validation on skipping months.

- [ ] **Step 3: Implement helpers in `enums.py` and validation in `service.py`**

In `E:/SSUP/backend/src/modules/finance/enums.py`:
```python
    @classmethod
    def get_index(cls, value: Union["NepaliMonth", str]) -> int:
        member = cls.from_string(value)
        months = cls.list_all()
        return months.index(member.value)

    @classmethod
    def get_preceding_months(cls, value: Union["NepaliMonth", str]) -> list[str]:
        idx = cls.get_index(value)
        months = cls.list_all()
        return months[:idx]

    @classmethod
    def get_subsequent_months(cls, value: Union["NepaliMonth", str]) -> list[str]:
        idx = cls.get_index(value)
        months = cls.list_all()
        return months[idx + 1 :]
```

In `E:/SSUP/backend/src/modules/finance/service.py`:
```python
    @classmethod
    def validate_sequential_billing_month(
        cls,
        db: Session,
        tenant_id: str,
        academic_year_id: str,
        billing_month: str,
        class_id: Optional[str] = None,
        student_id: Optional[str] = None,
    ) -> None:
        """
        Enforces strict chronological billing sequence (Baishakh -> Chaitra).
        1. All preceding months in the academic session must have active bills.
        2. No subsequent months may already have active bills (prevents out-of-order back-billing).
        """
        target_month = NepaliMonth.from_string(billing_month).value
        preceding = NepaliMonth.get_preceding_months(target_month)
        subsequent = NepaliMonth.get_subsequent_months(target_month)

        base_filter = [
            FeeBill.tenant_id == tenant_id,
            FeeBill.academic_year_id == academic_year_id,
            FeeBill.status != BillStatus.CANCELLED.value,
            FeeBill.billing_month.isnot(None),
        ]
        if student_id:
            base_filter.append(FeeBill.student_id == student_id)
        elif class_id:
            base_filter.append(FeeBill.class_id == class_id)

        # 1. Back-billing check: Ensure no subsequent month is already generated
        if subsequent:
            future_bill = db.scalar(
                select(FeeBill.billing_month)
                .where(*base_filter, FeeBill.billing_month.in_(subsequent))
                .limit(1)
            )
            if future_bill:
                scope_label = "this student" if student_id else "this class"
                raise ConflictException(
                    f"Cannot generate bills for {target_month} because subsequent month '{future_bill}' has already been billed for {scope_label}. Out-of-order invoice generation is prohibited to protect rolling arrears."
                )

        # 2. Sequential predecessor check: Ensure all preceding months are billed
        if preceding:
            existing_months = set(
                db.scalars(
                    select(FeeBill.billing_month)
                    .where(*base_filter, FeeBill.billing_month.in_(preceding))
                    .distinct()
                ).all()
            )
            for m in preceding:
                if m not in existing_months:
                    scope_label = "this student" if student_id else "this class"
                    raise ConflictException(
                        f"Preceding month '{m}' has not been billed yet for {scope_label}. Invoices must be generated in strict chronological sequence (Baishakh to Chaitra) to maintain accurate rolling arrears."
                    )
```

Invoke `validate_sequential_billing_month` in `generate_batch_bills` (around line 1182) and `generate_single_bill` (around line 1433).

- [ ] **Step 4: Update existing tests in `tests/test_monthly_billing_engine.py`**

In `tests/test_monthly_billing_engine.py`:
- `test_batch_bill_duplicate_lock_raises_409_conflict`: Use `"Baishakh"` instead of `"Jestha"` since Baishakh is the first month.
- `test_batch_bill_duplicate_lock_allows_regen_after_cancel`: Use `"Baishakh"`.
- `test_single_bill_generation_and_duplicate_lock`: Use `"Baishakh"` instead of `"Shrawan"`.

- [ ] **Step 5: Run tests and verify 100% pass**

Run: `.venv\Scripts\pytest tests/test_strict_sequential_billing.py tests/test_monthly_billing_engine.py -v` in `E:\SSUP\backend`
Expected: 14 passed.

- [ ] **Step 6: Commit backend changes**

```bash
git add src/modules/finance/enums.py src/modules/finance/service.py tests/test_strict_sequential_billing.py tests/test_monthly_billing_engine.py
git commit -m "feat(finance): enforce strict chronological invoice generation and prevent out-of-order billing"
```

---

### Task 2: Frontend Month Status Logic & Sequential Helpers in `cashierUtils.ts`

**Files:**
- Modify: `E:/SSUP/frontend/src/features/finance/utils/cashierUtils.ts`
- Modify: `E:/SSUP/frontend/src/features/finance/components/__tests__/cashierAndReceipt.test.mjs`

**Interfaces:**
- `MonthStatusInfo`:
  - `status`: `'GENERATED' | 'AVAILABLE_RUNNING' | 'AVAILABLE_NEXT' | 'LOCKED_SEQUENCE' | 'LOCKED_PAST' | 'FUTURE_LOCKED'`
  - `isSelectable`: `boolean`
  - `badgeLabel`: `string`
  - `tooltipText`: `string`
- `getNextSequentialMonth(runningMonthIndex: number, generatedMonths: Set<string>): BsMonth | null`: Returns the exact single month that should be generated next, or `null` if all caught up through running month.

- [ ] **Step 1: Write failing unit tests in `cashierAndReceipt.test.mjs`**

```javascript
test('computeMonthStatus: strict sequential ordering enforces chronological queue', () => {
  // Running month is Ashwin (index 5)
  const runningIndex = 5;

  // Case 1: Fresh session (0 generated months). Only Baishakh (index 0) is selectable!
  const emptyGen = new Set();
  const baisEmpty = computeMonthStatus('Baishakh', runningIndex, emptyGen);
  assert.equal(baisEmpty.status, 'AVAILABLE_NEXT');
  assert.equal(baisEmpty.isSelectable, true);
  assert.equal(baisEmpty.badgeLabel, 'Next to Bill');

  const jesthaEmpty = computeMonthStatus('Jestha', runningIndex, emptyGen);
  assert.equal(jesthaEmpty.status, 'LOCKED_SEQUENCE');
  assert.equal(jesthaEmpty.isSelectable, false);
  assert.equal(jesthaEmpty.badgeLabel, 'Sequence Locked');
  assert.ok(jesthaEmpty.tooltipText.includes('Baishakh'));

  // Case 2: Baishakh generated. Jestha (index 1) is now Next to Bill.
  const baisGen = new Set(['Baishakh']);
  const baisStatus = computeMonthStatus('Baishakh', runningIndex, baisGen);
  assert.equal(baisStatus.status, 'GENERATED');
  assert.equal(baisStatus.isSelectable, false);

  const jesthaNext = computeMonthStatus('Jestha', runningIndex, baisGen);
  assert.equal(jesthaNext.status, 'AVAILABLE_NEXT');
  assert.equal(jesthaNext.isSelectable, true);

  const ashadhLocked = computeMonthStatus('Ashadh', runningIndex, baisGen);
  assert.equal(ashadhLocked.status, 'LOCKED_SEQUENCE');
  assert.equal(ashadhLocked.isSelectable, false);

  // Case 3: All past months generated up to running month (Ashwin). Ashwin is AVAILABLE_RUNNING.
  const caughtUp = new Set(['Baishakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra']);
  const ashwinRunning = computeMonthStatus('Ashwin', runningIndex, caughtUp);
  assert.equal(ashwinRunning.status, 'AVAILABLE_RUNNING');
  assert.equal(ashwinRunning.isSelectable, true);
  assert.equal(ashwinRunning.badgeLabel, 'Current Month');

  // Case 4: Future month beyond running month is FUTURE_LOCKED.
  const kartikFuture = computeMonthStatus('Kartik', runningIndex, caughtUp);
  assert.equal(kartikFuture.status, 'FUTURE_LOCKED');
  assert.equal(kartikFuture.isSelectable, false);

  // Case 5: Out-of-order legacy scenario (Shrawan generated, Baishakh wasn't). Baishakh is LOCKED_PAST.
  const legacyGen = new Set(['Shrawan']);
  const baisLegacy = computeMonthStatus('Baishakh', runningIndex, legacyGen);
  assert.equal(baisLegacy.status, 'LOCKED_PAST');
  assert.equal(baisLegacy.isSelectable, false);
  assert.equal(baisLegacy.badgeLabel, 'Locked (Past)');
});

test('getNextSequentialMonth: returns exact next month or null when caught up', () => {
  const runningIndex = 3; // Shrawan
  assert.equal(getNextSequentialMonth(runningIndex, new Set()), 'Baishakh');
  assert.equal(getNextSequentialMonth(runningIndex, new Set(['Baishakh'])), 'Jestha');
  assert.equal(getNextSequentialMonth(runningIndex, new Set(['Baishakh', 'Jestha'])), 'Ashadh');
  assert.equal(getNextSequentialMonth(runningIndex, new Set(['Baishakh', 'Jestha', 'Ashadh'])), 'Shrawan');
  // All caught up through Shrawan:
  assert.equal(getNextSequentialMonth(runningIndex, new Set(['Baishakh', 'Jestha', 'Ashadh', 'Shrawan'])), null);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `node --test src/features/finance/components/__tests__/cashierAndReceipt.test.mjs`
Expected: FAIL due to existing non-sequential logic in `computeMonthStatus`.

- [ ] **Step 3: Implement sequential logic in `cashierUtils.ts`**

Update `computeMonthStatus` and export `getNextSequentialMonth`:
```typescript
export type MonthStatus =
  | 'GENERATED'
  | 'AVAILABLE_RUNNING'
  | 'AVAILABLE_NEXT'
  | 'LOCKED_SEQUENCE'
  | 'LOCKED_PAST'
  | 'FUTURE_LOCKED';

export interface MonthStatusInfo {
  month: BsMonth;
  index: number;
  status: MonthStatus;
  isSelectable: boolean;
  badgeLabel: string;
  tooltipText: string;
  description: string;
}

export function computeMonthStatus(
  month: BsMonth,
  runningMonthIndex: number,
  generatedMonths: Set<string>
): MonthStatusInfo {
  const monthIdx = BS_MONTHS.indexOf(month);

  // 1. If already generated -> GENERATED
  if (generatedMonths.has(month)) {
    const tooltipText = `${month} invoices have already been generated for this class.`;
    return {
      month,
      index: monthIdx,
      status: 'GENERATED',
      isSelectable: false,
      badgeLabel: 'Generated',
      tooltipText,
      description: tooltipText,
    };
  }

  // 2. If any subsequent month has already been generated -> LOCKED_PAST (out-of-order back-billing block)
  const hasSubsequentGenerated = BS_MONTHS.slice(monthIdx + 1).some((m) => generatedMonths.has(m));
  if (hasSubsequentGenerated) {
    const tooltipText = `Cannot bill ${month} because subsequent invoices have already been generated for this class.`;
    return {
      month,
      index: monthIdx,
      status: 'LOCKED_PAST',
      isSelectable: false,
      badgeLabel: 'Locked (Past)',
      tooltipText,
      description: tooltipText,
    };
  }

  // 3. Find the first ungenerated month in the calendar
  let firstUngeneratedIdx = -1;
  for (let i = 0; i < BS_MONTHS.length; i++) {
    if (!generatedMonths.has(BS_MONTHS[i])) {
      firstUngeneratedIdx = i;
      break;
    }
  }

  // If this month is NOT the first ungenerated month, it is blocked by an unbilled predecessor -> LOCKED_SEQUENCE
  if (monthIdx > firstUngeneratedIdx) {
    const missingPredecessor = BS_MONTHS[firstUngeneratedIdx];
    const tooltipText = `Sequential billing required. Please generate ${missingPredecessor} first.`;
    return {
      month,
      index: monthIdx,
      status: 'LOCKED_SEQUENCE',
      isSelectable: false,
      badgeLabel: 'Sequence Locked',
      tooltipText,
      description: tooltipText,
    };
  }

  // 4. This month IS the next unbilled month!
  // If it's beyond running month -> FUTURE_LOCKED
  if (monthIdx > runningMonthIndex) {
    const tooltipText = `${month} is an upcoming month in this academic session.`;
    return {
      month,
      index: monthIdx,
      status: 'FUTURE_LOCKED',
      isSelectable: false,
      badgeLabel: 'Upcoming',
      tooltipText,
      description: tooltipText,
    };
  }

  // If it matches the running month -> AVAILABLE_RUNNING
  if (monthIdx === runningMonthIndex) {
    const tooltipText = `${month} is the current running cycle and ready for generation.`;
    return {
      month,
      index: monthIdx,
      status: 'AVAILABLE_RUNNING',
      isSelectable: true,
      badgeLabel: 'Current Month',
      tooltipText,
      description: tooltipText,
    };
  }

  // If it's before running month -> AVAILABLE_NEXT
  const tooltipText = `${month} is the next required month to bill in chronological sequence.`;
  return {
    month,
    index: monthIdx,
    status: 'AVAILABLE_NEXT',
    isSelectable: true,
    badgeLabel: 'Next to Bill',
    tooltipText,
    description: tooltipText,
  };
}

export function getNextSequentialMonth(
  runningMonthIndex: number,
  generatedMonths: Set<string>
): BsMonth | null {
  for (let i = 0; i <= runningMonthIndex; i++) {
    const m = BS_MONTHS[i];
    if (!generatedMonths.has(m)) {
      return m;
    }
  }
  return null;
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `node --test src/**/*.test.mjs` in `E:\SSUP\frontend`
Expected: 94 passing.

- [ ] **Step 5: Commit frontend utility changes**

```bash
git add src/features/finance/utils/cashierUtils.ts src/features/finance/components/__tests__/cashierAndReceipt.test.mjs
git commit -m "feat(finance): implement strict sequential month status logic and helper"
```

---

### Task 3: BatchBillingPage UI/UX Integration & Verification

**Files:**
- Modify: `E:/SSUP/frontend/src/features/finance/pages/BatchBillingPage.tsx`

**Features & Changes:**
- Import `getNextSequentialMonth`.
- When class or running month changes, auto-select `getNextSequentialMonth(runningMonthIndex, generatedMonthsSet)` if available.
- When all months up to the running month are generated:
  - Display a clean emerald status alert: *"All class billing is completely up to date through [Month]. No pending invoices to generate."*
  - Disable generation button and state that invoices are up to date.
- Style month grid items according to the new status:
  - `AVAILABLE_NEXT`: Ring-2 ring-primary bg-primary/5 text-primary border-primary shadow-sm. Badge: "Next to Bill" with `Sparkles` icon.
  - `AVAILABLE_RUNNING`: Ring-2 ring-primary bg-primary/10 border-primary font-semibold. Badge: "Current Month".
  - `LOCKED_SEQUENCE`: Opacity-50 cursor-not-allowed bg-muted/20 border-dashed. Badge: "Sequence Locked" with `Lock` icon.
  - `LOCKED_PAST`: Opacity-50 cursor-not-allowed bg-destructive/5 text-muted-foreground. Badge: "Locked (Past)".
  - `GENERATED`: Opacity-70 bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300. Badge: "Generated" with `CheckCircle2` icon.
  - `FUTURE_LOCKED`: Opacity-40 cursor-not-allowed bg-muted/10. Badge: "Upcoming".

- [ ] **Step 1: Update `BatchBillingPage.tsx` with auto-selection and visual states**

Apply the changes to auto-selection, month grid card rendering, and validation warning messages.

- [ ] **Step 2: Run all unit tests**

Run: `node --test src/**/*.test.mjs` in `E:\SSUP\frontend`
Expected: 94 passing.

- [ ] **Step 3: Run production build check**

Run: `npm run build` in `E:\SSUP\frontend`
Expected: 0 errors, build succeeds in ~1s.

- [ ] **Step 4: Commit frontend UI changes**

```bash
git add src/features/finance/pages/BatchBillingPage.tsx
git commit -m "feat(finance): integrate sequential month selection and lock states in BatchBillingPage"
```

---

## Verification Plan

### Automated Tests
1. **Backend Tests:**
   `.venv\Scripts\pytest tests/test_strict_sequential_billing.py tests/test_monthly_billing_engine.py -v`
   - Verifies sequential month validation on batch billing.
   - Verifies sequential month validation on single bill generation.
   - Verifies blocking back-billing when future bills exist.
   - Verifies duplicate billing prevention.
2. **Frontend Tests:**
   `node --test src/**/*.test.mjs`
   - Verifies all 94 unit tests across finance, layout, academic year, and time travel.
3. **Frontend Production Build:**
   `npm run build` in `E:\SSUP\frontend`
   - Verifies strict TypeScript compliance and asset bundling.

### Manual Verification
1. Navigate to **Finance $\to$ Batch Billing**.
2. Select a class (e.g. Grade 5).
3. If no bills have been generated, observe that **Baishakh** is pre-selected and marked **Next to Bill**. All other months (Jestha through Chaitra) are greyed out with **Sequence Locked**.
4. Generate invoices for Baishakh.
5. Once generated, Baishakh turns green (**Generated**), and **Jestha** immediately becomes the only selectable month marked **Next to Bill**.
6. Hover over Ashadh or Shrawan to see the tooltip: *"Sequential billing required. Please generate Jestha first."*
