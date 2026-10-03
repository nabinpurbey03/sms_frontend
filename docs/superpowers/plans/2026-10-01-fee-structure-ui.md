# Class Fee Structure & Student Pricing UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Fee Structure interface into a class-first experience matching the "Classes & Sections" layout (`ClassesPage` & `ClassDetailPage`), allowing administrators and accountants to view all classes, manage class fee heads via a dedicated Fee Structure tab with a `+` button, and configure student-level transportation charge applicability and scholarship percentages.

**Architecture:**
1. **Backend Extension:** Add `is_transport_applicable` boolean column to `student_discounts` (alongside `discount_percent`), with an Alembic migration and updated schemas/service logic so transportation fee heads selectively apply during batch billing.
2. **Class-Wise Fee Overview Page (`/finance/structures`):** Render a grid of class cards showing enrolled students, fee heads count, monthly base fee, and concession/transport summaries, consistent with `ClassesPage.tsx`.
3. **Class Fee Detail Page (`/finance/structures/$classId`):** Mirror `ClassDetailPage.tsx` with section switching tabs, `ClassProgressionNavigator`, and two main tabs:
   - **Student Pricing & Concessions Tab:** Student roster with transportation applicability checkbox, scholarship percentage input, and live net fee calculation preview.
   - **Fee Structure & Rates Tab:** Configured class fee heads with a `+ Add Fee Head` button, edit/deactivate controls, and fee category badges.

**Tech Stack:** React 19, Vite, TanStack Router, TanStack Query, Tailwind CSS, shadcn/ui, Lucide React, FastAPI, SQLAlchemy 2.0, Alembic, PostgreSQL.

---

## Global Constraints
- Strictly adhere to `ui-ux-pro-max` standards: 8dp spacing scale, dark/light contrast, accessible touch targets (≥44px), semantic Lucide icons, monospace numbers for currency and codes.
- All operations remain strictly locked to the tenant's active academic year (`Session: 2026/2027 (Locked)`).
- Role segregation: Accountants and Admins have access to `/finance/structures` and `/finance/structures/$classId`; unauthorized roles are guarded.

---

## File Structure

```
backend/
├── alembic/versions/
│   └── 2026_10_01_1000-add_is_transport_applicable_to_student_discounts.py  # [NEW]
├── src/modules/finance/
│   ├── models.py      # [MODIFY] add is_transport_applicable to StudentDiscount
│   ├── schemas.py     # [MODIFY] update StudentDiscountCreateDTO & StudentDiscountResponseDTO
│   └── service.py     # [MODIFY] set_student_discount & selective transport in batch billing
└── tests/
    └── test_student_transport_and_fee_ui.py # [NEW] backend test suite

frontend/
├── src/
│   ├── app/
│   │   └── router.tsx                                       # [MODIFY] register /finance/structures/$classId
│   ├── components/layout/
│   │   └── navConfig.ts                                     # [MODIFY] update breadcrumbs for /finance/structures/$classId
│   └── features/finance/
│       ├── types.ts                                         # [MODIFY] add is_transport_applicable to types
│       ├── schema.ts                                        # [MODIFY] update discount zod schemas
│       ├── pages/
│       │   ├── FeeStructuresPage.tsx                        # [MODIFY] revamp into class cards overview
│       │   └── ClassFeeStructurePage.tsx                    # [NEW] class fee detail page (mirroring ClassDetailPage)
│       └── components/
│           ├── FeeStructureDialog.tsx                       # [MODIFY] support defaultClassId prefill
│           ├── ClassFeeCard.tsx                             # [NEW] class card for fee overview
│           ├── StudentFeeProfileRow.tsx                     # [NEW] student row with transport & scholarship controls
│           └── ClassFeeHeadsTable.tsx                       # [NEW] fee heads table with '+' add button
```

---

## Implementation Tasks

### Task 1: Backend Database Migration & Model Update for Student Transport

**Files:**
- Create: `backend/alembic/versions/2026_10_01_1000-b2c3d4e5f6a7_add_is_transport_applicable_to_student_discounts.py`
- Modify: `backend/src/modules/finance/models.py:58-90`
- Modify: `backend/src/modules/finance/schemas.py:48-67`
- Modify: `backend/src/modules/finance/service.py:283-389`
- Test: `backend/tests/test_student_transport_and_fee_ui.py`

**Interfaces:**
- `StudentDiscount.is_transport_applicable: bool` (default `False`)
- `StudentDiscountCreateDTO(student_id: str, discount_percent: Decimal = 0.00, is_transport_applicable: bool = False, reason: Optional[str] = None)`
- `StudentDiscountResponseDTO(..., is_transport_applicable: bool)`

- [ ] **Step 1: Write backend tests for transport toggle and scholarship percentage**

Create `backend/tests/test_student_transport_and_fee_ui.py`:
```python
def test_student_transport_and_scholarship_persistence(default_academic_year):
    # Test setting both transport checkbox and scholarship percent
    ...
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_student_transport_and_fee_ui.py -v`
Expected: FAIL (missing `is_transport_applicable` attribute).

- [ ] **Step 3: Update SQLAlchemy model and write Alembic migration**

Update `backend/src/modules/finance/models.py`:
```python
class StudentDiscount(TenantBase):
    __tablename__ = "student_discounts"
    ...
    discount_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("0.00"), nullable=False)
    is_transport_applicable: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, server_default=sa.text('false'))
    reason: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
```

Create migration `backend/alembic/versions/2026_10_01_1000-b2c3d4e5f6a7_add_is_transport_applicable_to_student_discounts.py`:
```python
def upgrade():
    op.add_column('student_discounts', sa.Column('is_transport_applicable', sa.Boolean(), server_default=sa.text('false'), nullable=False))

def downgrade():
    op.drop_column('student_discounts', 'is_transport_applicable')
```

- [ ] **Step 4: Update Pydantic schemas and FinanceService**

In `backend/src/modules/finance/schemas.py`:
Add `is_transport_applicable: bool = False` to `StudentDiscountCreateDTO` and `StudentDiscountResponseDTO`. Make `discount_percent: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"), le=Decimal("100.00"))`.

In `backend/src/modules/finance/service.py`:
In `set_student_discount`, set `discount.is_transport_applicable = data.is_transport_applicable`.
In `generate_batch_bills`, selectively apply `FeeCategory.TRANSPORT` only to students with `is_transport_applicable == True`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `pytest tests/test_student_transport_and_fee_ui.py -v`
Expected: PASS

- [ ] **Step 6: Commit backend changes**

```bash
git add backend/
git commit -m "feat(finance): add is_transport_applicable to student discount settings"
```

---

### Task 2: Frontend Types, Schemas, and Router Configuration

**Files:**
- Modify: `frontend/src/features/finance/types.ts`
- Modify: `frontend/src/features/finance/schema.ts`
- Modify: `frontend/src/app/router.tsx`
- Modify: `frontend/src/components/layout/navConfig.ts`

**Interfaces:**
- Updated `StudentDiscount` interface with `is_transport_applicable: boolean`.
- Route `/finance/structures/$classId` registered and guarded.
- Breadcrumbs support for `/finance/structures/$classId`.

- [ ] **Step 1: Update frontend types and validation schemas**

In `frontend/src/features/finance/types.ts`:
Add `is_transport_applicable: boolean;` to `StudentDiscount` and `is_transport_applicable?: boolean;` to `StudentDiscountCreateDTO`.

In `frontend/src/features/finance/schema.ts`:
Add `is_transport_applicable: z.boolean().default(false)` to `studentDiscountSchema`.

- [ ] **Step 2: Register `/finance/structures/$classId` route**

In `frontend/src/app/router.tsx`:
```typescript
const financeClassStructureRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/finance/structures/$classId',
  component: ClassFeeStructurePage,
});
```
Add to `protectedLayoutRoute` route tree.

- [ ] **Step 3: Update breadcrumbs logic in `navConfig.ts`**

Ensure `/finance/structures/$classId` generates breadcrumbs:
`Finance` > `Fee Structures` > `Class Detail`.

- [ ] **Step 4: Build check**

Run: `npm run build`
Verify compilation passes.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/finance/types.ts frontend/src/features/finance/schema.ts frontend/src/app/router.tsx frontend/src/components/layout/navConfig.ts
git commit -m "feat(finance): add class fee structure route and types"
```

---

### Task 3: Revamp `FeeStructuresPage.tsx` into Classes Overview

**Files:**
- Modify: `frontend/src/features/finance/pages/FeeStructuresPage.tsx`
- Create: `frontend/src/features/finance/components/ClassFeeCard.tsx`

**Interfaces:**
- `ClassFeeCardProps`:
  - `cls: ClassWithDetails`
  - `feeStructures: FeeStructure[]`
  - `discounts: StudentDiscount[]`
  - `onOpenClass: (classId: string) => void`
  - `onAddFeeHead: (classId: string) => void`

- [ ] **Step 1: Implement `ClassFeeCard.tsx`**

Consistent with `ClassCard.tsx` in `ClassesPage`:
- Displays Grade / Sequence Badge (`Grade 10`).
- Section list pills (`Sections: A, B • 45 Students`).
- Financial metrics preview:
  - Base Monthly Tuition (sum of monthly fee heads).
  - Configured Fee Heads count badge.
  - Active Scholarship count badge.
  - Transport Users count badge.
- Action button: `Manage Fee Structure →`.

- [ ] **Step 2: Revamp `FeeStructuresPage.tsx`**

- Top KPI Stats Cards:
  - Total Classes
  - Total Fee Heads Configured
  - Total Students with Scholarship / Concession
  - Total Students using Transportation
- Search bar to filter classes by name.
- Responsive Grid (1 col mobile, 2 col md, 3 col lg/xl) of `ClassFeeCard`.
- Global action: `Add Fee Head` dialog trigger.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/finance/pages/FeeStructuresPage.tsx frontend/src/features/finance/components/ClassFeeCard.tsx
git commit -m "feat(finance): convert FeeStructuresPage to class overview layout"
```

---

### Task 4: Implement `ClassFeeStructurePage.tsx` (Consistent with `ClassDetailPage.tsx`)

**Files:**
- Create: `frontend/src/features/finance/pages/ClassFeeStructurePage.tsx`
- Create: `frontend/src/features/finance/components/StudentFeeProfileRow.tsx`
- Create: `frontend/src/features/finance/components/ClassFeeHeadsTable.tsx`
- Modify: `frontend/src/features/finance/components/FeeStructureDialog.tsx` (add `defaultClassId`)

**Interfaces:**
- `ClassFeeStructurePage`:
  - Header: Back button, `ClassProgressionNavigator`, title, active session locked badge.
  - Section switcher pills: `All Sections`, `Section A`, `Section B`...
  - **Tab 1: Student Fee Profiles & Concessions**:
    - Search student by name or roll number.
    - Checkbox: Transportation charge applicable.
    - Checkbox & Input: Scholarship toggle + percentage (`%`) + reason.
    - Live estimated net fee calculation.
  - **Tab 2: Fee Structure & Rates**:
    - Header with `+ Add Fee Head` button (with `Plus` icon).
    - Table of fee heads with edit and deactivate actions.
    - Fee category badges (Tuition, Transport, Exam, Admission, etc.).

- [ ] **Step 1: Update `FeeStructureDialog.tsx` with `defaultClassId`**

Allow pre-selecting and locking the class when opened from within a class detail page.

- [ ] **Step 2: Create `StudentFeeProfileRow.tsx`**

- Student Name, Roll No, Section badge.
- Transport checkbox with visual badge (`🚌 Transport` vs `None`).
- Scholarship checkbox with inline percentage input (`0% - 100%`) and quick presets (10%, 25%, 50%, 100%).
- Estimated Net Monthly Fee preview = `Tuition + (Transport if enabled) - Discount`.
- Immediate optimistic update with toast feedback.

- [ ] **Step 3: Create `ClassFeeHeadsTable.tsx`**

- Table displaying fee heads for this specific class.
- Prominent `+ Add Fee Head` button in header.
- Fee head name, category badge, frequency, amount in bold monospace `NPR`, status, edit/delete actions.

- [ ] **Step 4: Create `ClassFeeStructurePage.tsx`**

Assemble header, section switcher, and the two primary tabs with seamless navigation.

- [ ] **Step 5: Verify build & tests**

Run: `npm run build`
Run: `pytest tests/test_student_transport_and_fee_ui.py`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/finance/
git commit -m "feat(finance): implement ClassFeeStructurePage matching ClassDetailPage consistency"
```

---

## Verification Plan

### Automated Tests
1. Backend tests:
   ```bash
   cd E:\SSUP\backend
   pytest tests/test_student_transport_and_fee_ui.py -v
   pytest tests/test_finance_management.py -v
   ```
2. Frontend build verification:
   ```bash
   cd E:\SSUP\frontend
   npm run build
   ```

### Manual Verification
1. Login as `ADMIN` or `ACCOUNTANT`.
2. Navigate to **Fee Structures** (`/finance/structures`):
   - Confirm it renders the grid of all school classes (similar to Classes & Sections).
   - Check that KPI stats at top reflect class counts, fee heads, scholarships, and transport.
3. Click any class card (e.g. `Class 10`):
   - Confirm URL navigates to `/finance/structures/$classId`.
   - Verify header shows `ClassProgressionNavigator` allowing 1-click hop to next/prev class.
   - Verify section tabs ("All Sections", "Section A", "Section B") filter student roster.
4. On **Student Pricing & Concessions Tab**:
   - Toggle "Transportation" checkbox for a student: verify status saves and badge updates.
   - Toggle "Scholarship", enter `25%`: verify discount saves and net fee updates.
5. On **Fee Structure & Rates Tab**:
   - Confirm table lists all class fee heads.
   - Click `+ Add Fee Head` button with `+` icon: verify dialog opens with current class preselected.
   - Add a fee head and verify it appears in the table.
