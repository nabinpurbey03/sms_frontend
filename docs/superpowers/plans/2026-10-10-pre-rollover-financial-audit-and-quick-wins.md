# Phase 1 Quick Wins & Pre-Rollover Financial Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Phase 1 quick wins and financial safeguards for SSUP: expand payment methods to native Nepali digital wallets, fix cashier unpaid bills filtering, add CSV exports to billing/transactions, provide a one-click school-wide "Generate All Classes" billing engine, carry forward student advance wallets on rollover, and institute a mandatory Pre-Rollover Financial Reconciliation Audit in the academic rollover wizard.

**Architecture:**
1. **Payment Methods & Cashier Querying:** Add `ESEWA`, `KHALTI`, `FONEPAY`, and `CONNECTIPS` to the backend `PaymentMethod` enum, update frontend selectors and badges, and upgrade `list_bills` to support multi-status queries (`UNPAID,PARTIAL`) so cashiers never encounter blank bills lists.
2. **Offline Accounting CSV Export:** Add client-side CSV exporters to `BillsPage` and `TransactionsPage` with RFC 4180 compliance, UTF-8 BOM for Microsoft Excel compatibility, and formatted currency and Bikram Sambat date fields.
3. **School-Wide Batch Billing:** Add `generate_all_classes_bills` in `FinanceService` and endpoint `POST /finance/tenants/{tenant_id}/bills/generate-all-classes` to generate invoices for all classes in a single atomic operation, with UI controls in `BatchBillingPage`.
4. **Pre-Rollover Financial Audit & Wallet Rollover (Gap 1):** Add `GET /finance/tenants/{tenant_id}/rollover-financial-audit` quantifying outgoing session revenue, collection rate, carry-forward opening arrears, chronic defaulters (3+ unpaid bills), and advance wallet balances. Update `tenant_rollover` to update `StudentWallet.academic_year_id = new_year.id` for continuing students, and add a mandatory Step 0 in `TenantRolloverDialog`.

**Tech Stack:** FastAPI, SQLAlchemy 2.0, Pydantic v2, pytest, React 19, TypeScript 5.8, TanStack Query, Tailwind CSS, Lucide icons, Vitest/Node test runner.

**Spec:** [`C:\Users\Nabin Purbey\.gemini\antigravity-cli\brain\40f89f77-0a1b-4c67-8021-068b23d7319c\school-erp-gap-analysis.md`](file:///C:/Users/Nabin%20Purbey/.gemini/antigravity-cli/brain/40f89f77-0a1b-4c67-8021-068b23d7319c/school-erp-gap-analysis.md)

## Global Constraints

- Preserve complete backward compatibility for existing endpoints, schemas, and enum values.
- Online payment gateway integration remains out of scope; digital wallets represent recorded cashier payment methods.
- All bills listed for collection must match real unpaid/partial dues (`due_amount > 0`).
- Student advance wallets are uniquely identified by `(tenant_id, student_id)` and must persist across academic years.
- Pre-rollover audit must never mutate data; it is an analytical read-only safeguard prior to session closure.
- All backend tests must run via `.venv\Scripts\pytest.exe` with 100% pass rate.
- Frontend must pass `npx tsc -b` with 0 type errors.

---

### Task 1: PaymentMethod Expansion & Cashier Dues Query Fix

**Files:**
- Modify: `backend/src/modules/finance/enums.py`
- Modify: `backend/src/modules/finance/service.py`
- Modify: `backend/src/modules/finance/router.py`
- Create: `backend/tests/test_payment_methods_and_bills_filter.py`
- Modify: `frontend/src/features/finance/types.ts`
- Modify: `frontend/src/features/finance/pages/CollectPaymentPage.tsx`
- Modify: `frontend/src/features/finance/components/PaymentCollectDialog.tsx`
- Modify: `frontend/src/features/finance/pages/TransactionsPage.tsx`
- Modify: `frontend/src/features/finance/pages/FinanceDashboardPage.tsx`

**Interfaces:**
- Consumes: `PaymentMethod`, `FeeBill`, `BillStatus`
- Produces: Expanded `PaymentMethod` with `ESEWA`, `KHALTI`, `FONEPAY`, `CONNECTIPS`; multi-status filtering on `list_bills` (`status="UNPAID,PARTIAL"`); bug fix in `CollectPaymentPage`.

- [ ] **Step 1: Write failing backend tests for PaymentMethod and multi-status bills filtering**

```python
# backend/tests/test_payment_methods_and_bills_filter.py
import pytest
from decimal import Decimal
from datetime import date
from src.modules.finance.enums import PaymentMethod, BillStatus
from src.modules.finance.service import FinanceService
from src.modules.finance.schemas import FeeBillResponseDTO

def test_payment_method_enum_supports_nepali_digital_wallets():
    assert PaymentMethod.ESEWA.value == "ESEWA"
    assert PaymentMethod.KHALTI.value == "KHALTI"
    assert PaymentMethod.FONEPAY.value == "FONEPAY"
    assert PaymentMethod.CONNECTIPS.value == "CONNECTIPS"
    assert PaymentMethod.from_string("esewa") == PaymentMethod.ESEWA
    assert PaymentMethod.from_string("E_SEWA") == PaymentMethod.ESEWA
    assert PaymentMethod.from_string("khalti") == PaymentMethod.KHALTI
    assert PaymentMethod.from_string("fonepay") == PaymentMethod.FONEPAY
    assert PaymentMethod.from_string("connectips") == PaymentMethod.CONNECTIPS

def test_list_bills_multi_status_filtering(db_session, test_tenant, test_academic_year, test_class, test_student):
    from src.modules.finance.models import FeeBill
    # Create an UNPAID bill
    bill_unpaid = FeeBill(
        tenant_id=test_tenant.id,
        bill_number="BILL-TEST-001",
        student_id=test_student.id,
        class_id=test_class.id,
        academic_year_id=test_academic_year.id,
        bill_title="Baishakh Fee",
        subtotal_amount=Decimal("1000.00"),
        total_payable=Decimal("1000.00"),
        paid_amount=Decimal("0.00"),
        due_amount=Decimal("1000.00"),
        status=BillStatus.UNPAID.value,
        issue_date=date.today(),
        due_date=date.today(),
    )
    # Create a PARTIAL bill
    bill_partial = FeeBill(
        tenant_id=test_tenant.id,
        bill_number="BILL-TEST-002",
        student_id=test_student.id,
        class_id=test_class.id,
        academic_year_id=test_academic_year.id,
        bill_title="Jestha Fee",
        subtotal_amount=Decimal("1000.00"),
        total_payable=Decimal("1000.00"),
        paid_amount=Decimal("400.00"),
        due_amount=Decimal("600.00"),
        status=BillStatus.PARTIAL.value,
        issue_date=date.today(),
        due_date=date.today(),
    )
    # Create a PAID bill
    bill_paid = FeeBill(
        tenant_id=test_tenant.id,
        bill_number="BILL-TEST-003",
        student_id=test_student.id,
        class_id=test_class.id,
        academic_year_id=test_academic_year.id,
        bill_title="Ashadh Fee",
        subtotal_amount=Decimal("1000.00"),
        total_payable=Decimal("1000.00"),
        paid_amount=Decimal("1000.00"),
        due_amount=Decimal("0.00"),
        status=BillStatus.PAID.value,
        issue_date=date.today(),
        due_date=date.today(),
    )
    db_session.add_all([bill_unpaid, bill_partial, bill_paid])
    db_session.commit()

    # Query with comma-separated status
    bills, total = FinanceService.list_bills(
        db=db_session,
        tenant_id=test_tenant.id,
        status="UNPAID,PARTIAL",
    )
    bill_numbers = {b.bill_number for b in bills}
    assert "BILL-TEST-001" in bill_numbers
    assert "BILL-TEST-002" in bill_numbers
    assert "BILL-TEST-003" not in bill_numbers
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv\Scripts\pytest.exe tests/test_payment_methods_and_bills_filter.py -v`
Expected: FAIL (PaymentMethod has no attribute ESEWA, or list_bills does not split comma-separated status)

- [ ] **Step 3: Implement backend updates in `enums.py` and `service.py`**

In `backend/src/modules/finance/enums.py`:
```python
class PaymentMethod(str, Enum):
    CASH = "CASH"
    BANK_TRANSFER = "BANK_TRANSFER"
    CHEQUE = "CHEQUE"
    ESEWA = "ESEWA"
    KHALTI = "KHALTI"
    FONEPAY = "FONEPAY"
    CONNECTIPS = "CONNECTIPS"
    OTHER = "OTHER"

    @classmethod
    def from_string(cls, value: Union["PaymentMethod", str]) -> "PaymentMethod":
        if isinstance(value, cls):
            return value
        val = str(value).strip().upper()
        aliases = {
            "ONLINE_DIGITAL": cls.OTHER,
            "POS_CARD": cls.OTHER,
            "E_SEWA": cls.ESEWA,
            "ESEWA": cls.ESEWA,
            "KHALTI": cls.KHALTI,
            "FONEPAY": cls.FONEPAY,
            "FONE_PAY": cls.FONEPAY,
            "CONNECTIPS": cls.CONNECTIPS,
            "CONNECT_IPS": cls.CONNECTIPS,
        }
        if val in aliases:
            return aliases[val]
        return cls(val)
```

In `backend/src/modules/finance/service.py` (`list_bills`):
```python
        if status:
            statuses = [s.strip().upper() for s in status.split(",") if s.strip()]
            if len(statuses) == 1:
                query = query.where(FeeBill.status == statuses[0])
            elif len(statuses) > 1:
                query = query.where(FeeBill.status.in_(statuses))
```

- [ ] **Step 4: Run backend tests to verify they pass**

Run: `.venv\Scripts\pytest.exe tests/test_payment_methods_and_bills_filter.py -v`
Expected: PASS

- [ ] **Step 5: Update frontend types, pages, and components**

1. In `frontend/src/features/finance/types.ts`:
```typescript
export type PaymentMethod =
  | 'CASH'
  | 'BANK_TRANSFER'
  | 'CHEQUE'
  | 'ESEWA'
  | 'KHALTI'
  | 'FONEPAY'
  | 'CONNECTIPS'
  | 'OTHER';
```

2. In `frontend/src/features/finance/pages/CollectPaymentPage.tsx`:
- Change line 51 from `status: 'ISSUED'` to `status: 'UNPAID,PARTIAL'`
- Add dropdown options for `ESEWA`, `KHALTI`, `FONEPAY`, `CONNECTIPS` in the payment method select element:
```tsx
<option value="CASH">Cash</option>
<option value="BANK_TRANSFER">Bank Transfer</option>
<option value="CHEQUE">Cheque</option>
<option value="ESEWA">eSewa</option>
<option value="KHALTI">Khalti</option>
<option value="FONEPAY">Fonepay / QR</option>
<option value="CONNECTIPS">ConnectIPS</option>
<option value="OTHER">Other</option>
```

3. In `frontend/src/features/finance/components/PaymentCollectDialog.tsx`:
- Add the same payment method options.

4. In `frontend/src/features/finance/pages/TransactionsPage.tsx`:
- Add the options to the payment method filter dropdown.

5. In `frontend/src/features/finance/pages/FinanceDashboardPage.tsx`:
- Update `getPaymentMethodBadge(method: string)` to include color styles for `ESEWA` (green/emerald), `KHALTI` (purple), `FONEPAY` (rose/red), `CONNECTIPS` (sky/blue).

- [ ] **Step 6: Run frontend typecheck**

Run: `npx tsc -b`
Expected: 0 errors

- [ ] **Step 7: Commit changes**

```bash
git commit -m "feat(finance): expand payment methods for nepali wallets and fix cashier unpaid bills query"
```

---

### Task 2: Financial Data CSV Export for Bills & Transactions

**Files:**
- Create: `frontend/src/features/finance/utils/exportCsv.ts`
- Modify: `frontend/src/features/finance/pages/BillsPage.tsx`
- Modify: `frontend/src/features/finance/pages/TransactionsPage.tsx`

**Interfaces:**
- Consumes: `FeeBill`, `FeePayment`, `exportBillsToCsv`, `exportPaymentsToCsv`
- Produces: Browser CSV downloads with UTF-8 BOM, sanitized cells, headers, formatted values.

- [ ] **Step 1: Create `exportCsv.ts` utility**

In `frontend/src/features/finance/utils/exportCsv.ts`:
```typescript
import type { FeeBill, FeePayment } from '../types';

export function downloadCsv(filename: string, rows: (string | number)[][]): void {
  const processCell = (cell: string | number | null | undefined): string => {
    if (cell === null || cell === undefined) return '""';
    const cellStr = String(cell).replace(/"/g, '""');
    return `"${cellStr}"`;
  };

  const csvContent = '\uFEFF' + rows.map((row) => row.map(processCell).join(',')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportBillsToCsv(bills: FeeBill[], filename = 'bills-export'): void {
  const headers = [
    'Bill Number',
    'Student Name',
    'Class',
    'Billing Month',
    'Bill Title',
    'Issue Date',
    'Due Date',
    'Subtotal (NPR)',
    'Previous Due (NPR)',
    'Total Payable (NPR)',
    'Paid Amount (NPR)',
    'Discount (NPR)',
    'Due Amount (NPR)',
    'Status',
  ];

  const rows = bills.map((b) => [
    b.bill_number,
    b.student_name || `${b.student_first_name || ''} ${b.student_last_name || ''}`.trim(),
    b.class_name || '',
    b.billing_month || '',
    b.bill_title || '',
    b.issue_date || '',
    b.due_date || '',
    Number(b.subtotal_amount || 0).toFixed(2),
    Number(b.previous_due_amount || 0).toFixed(2),
    Number(b.total_payable || 0).toFixed(2),
    Number(b.paid_amount || 0).toFixed(2),
    Number(b.discount_amount || 0).toFixed(2),
    Number(b.due_amount || 0).toFixed(2),
    b.status,
  ]);

  downloadCsv(filename, [headers, ...rows]);
}

export function exportPaymentsToCsv(payments: FeePayment[], filename = 'payments-export'): void {
  const headers = [
    'Receipt Number',
    'Payment Date',
    'Student Name',
    'Bill Number',
    'Amount Paid (NPR)',
    'Discount (NPR)',
    'Discount Type',
    'Late Fee (NPR)',
    'Payment Method',
    'Transaction Reference',
    'Received By',
    'Remarks',
  ];

  const rows = payments.map((p) => [
    p.receipt_number,
    p.payment_date || '',
    p.student_name || '',
    p.bill_number || '',
    Number(p.amount_paid || 0).toFixed(2),
    Number(p.discount_amount || 0).toFixed(2),
    p.discount_type || 'NONE',
    Number(p.late_fee_amount || 0).toFixed(2),
    p.payment_method || '',
    p.transaction_reference || '',
    p.received_by_name || '',
    p.remarks || '',
  ]);

  downloadCsv(filename, [headers, ...rows]);
}
```

- [ ] **Step 2: Add Export CSV button to `BillsPage.tsx`**

In `frontend/src/features/finance/pages/BillsPage.tsx`:
- Import `Download` icon from `lucide-react` and `exportBillsToCsv` from `../utils/exportCsv`.
- Add an "Export CSV" button in the header toolbar next to `Generate Bills`.
- When clicked, calls `exportBillsToCsv(billsData?.items || [], `bills-${selectedYear?.name || 'export'}`)`.

- [ ] **Step 3: Add Export CSV button to `TransactionsPage.tsx`**

In `frontend/src/features/finance/pages/TransactionsPage.tsx`:
- Import `Download` icon from `lucide-react` and `exportPaymentsToCsv` from `../utils/exportCsv`.
- Add an "Export CSV" button in the header toolbar.
- When clicked, calls `exportPaymentsToCsv(paymentsData?.items || [], 'transactions-export')`.

- [ ] **Step 4: Verify typecheck**

Run: `npx tsc -b`
Expected: 0 errors

- [ ] **Step 5: Commit changes**

```bash
git commit -m "feat(finance): add client-side CSV export for fee bills and transactions"
```

---

### Task 3: School-Wide "Generate All Classes" Monthly Billing

**Files:**
- Modify: `backend/src/modules/finance/schemas.py`
- Modify: `backend/src/modules/finance/service.py`
- Modify: `backend/src/modules/finance/router.py`
- Create: `backend/tests/test_generate_all_classes_billing.py`
- Modify: `frontend/src/features/finance/types.ts`
- Modify: `frontend/src/features/finance/api.ts`
- Modify: `frontend/src/features/finance/hooks.ts`
- Modify: `frontend/src/features/finance/pages/BatchBillingPage.tsx`

**Interfaces:**
- Consumes: `AllClassesBillGenerateDTO`, `Class`, `FeeStructure`, `generate_batch_bills`
- Produces: `POST /tenants/{tenant_id}/bills/generate-all-classes`, `useGenerateAllClassesBills` hook, "Bill All Classes" modal in `BatchBillingPage`.

- [ ] **Step 1: Write failing backend test for all-classes billing**

```python
# backend/tests/test_generate_all_classes_billing.py
import pytest
from decimal import Decimal
from datetime import date
from src.modules.finance.service import FinanceService
from src.modules.finance.schemas import AllClassesBillGenerateDTO
from src.modules.finance.enums import FeeLevel, FeeCategory, FeeFrequency, NepaliMonth

def test_generate_all_classes_bills_bulk(db_session, test_tenant, test_academic_year, test_class, test_student):
    from src.modules.finance.models import FeeStructure
    # Create school fee structure
    fee = FeeStructure(
        tenant_id=test_tenant.id,
        academic_year_id=test_academic_year.id,
        fee_level=FeeLevel.SCHOOL.value,
        name="Tuition Fee",
        fee_category=FeeCategory.TUITION.value,
        frequency=FeeFrequency.MONTHLY.value,
        amount=Decimal("1500.00"),
        is_active=True,
    )
    db_session.add(fee)
    db_session.commit()

    dto = AllClassesBillGenerateDTO(
        billing_month=NepaliMonth.BAISHAKH.value,
        due_date=date.today(),
        notes="Automated all classes monthly invoice",
    )
    response = FinanceService.generate_all_classes_bills(
        db=db_session,
        tenant_id=test_tenant.id,
        data=dto,
    )

    assert response.total_classes_processed >= 1
    assert response.total_bills_generated >= 1
    assert response.total_amount_generated >= Decimal("1500.00")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv\Scripts\pytest.exe tests/test_generate_all_classes_billing.py -v`
Expected: FAIL (`AllClassesBillGenerateDTO` not found)

- [ ] **Step 3: Implement backend DTOs and service method**

1. In `backend/src/modules/finance/schemas.py`:
```python
class AllClassesBillClassSummaryDTO(BaseModel):
    class_id: str
    class_name: str
    students_billed: int
    amount_generated: Decimal

class AllClassesBillGenerateDTO(BaseModel):
    billing_month: str
    due_date: date
    notes: Optional[str] = None

class AllClassesBillGenerateResponseDTO(BaseModel):
    billing_month: str
    total_classes_processed: int
    total_bills_generated: int
    total_amount_generated: Decimal
    class_summaries: list[AllClassesBillClassSummaryDTO]
    skipped_or_empty_classes: list[str]
```

2. In `backend/src/modules/finance/service.py`:
```python
    @classmethod
    def generate_all_classes_bills(
        cls,
        db: Session,
        tenant_id: str,
        data: AllClassesBillGenerateDTO,
        user_id: Optional[str] = None,
    ) -> AllClassesBillGenerateResponseDTO:
        ay = cls.get_current_academic_year(db, tenant_id)
        cls.validate_sequential_billing_month(
            db, tenant_id, ay.id, data.billing_month, class_id=None
        )

        classes = list(
            db.scalars(
                select(Class)
                .where(Class.tenant_id == tenant_id, Class.deleted_at == None)
                .order_by(Class.sequence_order.asc())
            ).all()
        )

        total_bills = 0
        total_amount = Decimal("0.00")
        summaries: list[AllClassesBillClassSummaryDTO] = []
        skipped: list[str] = []

        for c in classes:
            # Check if class has active students
            active_students_count = db.scalar(
                select(func.count(StudentEnrollment.id)).where(
                    StudentEnrollment.tenant_id == tenant_id,
                    StudentEnrollment.class_id == c.id,
                    StudentEnrollment.academic_year_id == ay.id,
                    StudentEnrollment.status == EnrollmentStatus.ACTIVE.value,
                    StudentEnrollment.deleted_at == None,
                )
            ) or 0

            if active_students_count == 0:
                skipped.append(f"{c.name} (0 active students)")
                continue

            # Check applicable structures for this class
            structures = cls.list_fee_structures(
                db, tenant_id, class_id=c.id, is_active=True
            )
            structure_ids = [s.id for s in structures]

            batch_in = BatchBillGenerateDTO(
                class_id=c.id,
                section_id=None,
                billing_month=data.billing_month,
                fee_structure_ids=structure_ids,
                due_date=data.due_date,
                notes=data.notes,
            )

            try:
                result = cls.generate_batch_bills(db, tenant_id, batch_in, user_id=user_id)
                total_bills += result.generated_count
                total_amount += result.total_amount
                summaries.append(
                    AllClassesBillClassSummaryDTO(
                        class_id=c.id,
                        class_name=c.name,
                        students_billed=result.generated_count,
                        amount_generated=result.total_amount,
                    )
                )
            except Exception as e:
                skipped.append(f"{c.name} (Error: {str(e)})")

        return AllClassesBillGenerateResponseDTO(
            billing_month=data.billing_month,
            total_classes_processed=len(summaries),
            total_bills_generated=total_bills,
            total_amount_generated=total_amount,
            class_summaries=summaries,
            skipped_or_empty_classes=skipped,
        )
```

3. In `backend/src/modules/finance/router.py`:
```python
@router.post(
    "/tenants/{tenant_id}/bills/generate-all-classes",
    response_model=AllClassesBillGenerateResponseDTO,
)
def generate_all_classes_bills(
    tenant_id: str,
    body: AllClassesBillGenerateDTO,
    member: TenantMembershipContext = Depends(get_current_tenant_member),
    db: Session = Depends(get_db),
):
    require_role(member, [UserRole.ADMIN, UserRole.OFFICE_ADMIN, UserRole.ACCOUNTANT])
    return FinanceService.generate_all_classes_bills(
        db, tenant_id, body, user_id=member.user_id
    )
```

- [ ] **Step 4: Run backend tests to verify they pass**

Run: `.venv\Scripts\pytest.exe tests/test_generate_all_classes_billing.py -v`
Expected: PASS

- [ ] **Step 5: Implement frontend API, Hook, and BatchBillingPage UI**

1. In `frontend/src/features/finance/types.ts`:
```typescript
export interface AllClassesBillClassSummary {
  class_id: string;
  class_name: string;
  students_billed: number;
  amount_generated: number;
}

export interface AllClassesBillGenerateDTO {
  billing_month: string;
  due_date: string;
  notes?: string;
}

export interface AllClassesBillGenerateResponseDTO {
  billing_month: string;
  total_classes_processed: number;
  total_bills_generated: number;
  total_amount_generated: number;
  class_summaries: AllClassesBillClassSummary[];
  skipped_or_empty_classes: string[];
}
```

2. In `frontend/src/features/finance/api.ts`:
```typescript
generateAllClassesBills: async (
  tenantId: string,
  data: AllClassesBillGenerateDTO
): Promise<AllClassesBillGenerateResponseDTO> => {
  const res = await apiClient.post(
    `/finance/tenants/${tenantId}/bills/generate-all-classes`,
    data
  );
  return res.data;
},
```

3. In `frontend/src/features/finance/hooks.ts`:
```typescript
export const useGenerateAllClassesBills = (tenantId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AllClassesBillGenerateDTO) =>
      financeApi.generateAllClassesBills(tenantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FINANCE_BILLS_KEY, tenantId] });
      queryClient.invalidateQueries({ queryKey: [FINANCE_SUMMARY_KEY, tenantId] });
      queryClient.invalidateQueries({ queryKey: ['finance', 'generated-months', tenantId] });
    },
  });
};
```

4. In `frontend/src/features/finance/pages/BatchBillingPage.tsx`:
- Add a "Generate for Entire School" secondary button next to class selection.
- Clicking opens a confirmation modal showing: target month, calculated due date, classes to be invoiced, and warning.
- On success, shows a summary modal with classes processed, total bills created, total revenue generated, and links to review invoices.

- [ ] **Step 6: Run frontend typecheck**

Run: `npx tsc -b`
Expected: 0 errors

- [ ] **Step 7: Commit changes**

```bash
git commit -m "feat(finance): add school-wide generate all classes billing endpoint and UI"
```

---

### Task 4: Pre-Rollover Financial Audit & Student Wallet Carry-Forward (Gap 1)

**Files:**
- Modify: `backend/src/modules/finance/schemas.py`
- Modify: `backend/src/modules/finance/service.py`
- Modify: `backend/src/modules/academic/schemas.py`
- Modify: `backend/src/modules/academic/service.py`
- Modify: `backend/src/modules/finance/router.py`
- Create: `backend/tests/test_rollover_financial_audit.py`
- Modify: `frontend/src/features/finance/types.ts`
- Modify: `frontend/src/features/finance/api.ts`
- Modify: `frontend/src/features/finance/hooks.ts`
- Modify: `frontend/src/features/academic-year/components/TenantRolloverDialog.tsx`

**Interfaces:**
- Consumes: `FinanceService`, `AcademicYear`, `FeeBill`, `FeePayment`, `StudentWallet`, `TenantRolloverDialog`
- Produces: `GET /finance/tenants/{tenant_id}/rollover-financial-audit`, wallet carry-forward on rollover, Step 0 in rollover dialog.

- [ ] **Step 1: Write failing backend tests for pre-rollover audit and wallet carry-forward**

```python
# backend/tests/test_rollover_financial_audit.py
import pytest
from decimal import Decimal
from datetime import date
from src.modules.finance.service import FinanceService
from src.modules.academic.service import AcademicService
from src.modules.academic.schemas import TenantAcademicYearRolloverRequest
from src.modules.finance.models import FeeBill, StudentWallet
from src.modules.finance.enums import BillStatus

def test_pre_rollover_financial_audit_metrics(db_session, test_tenant, test_academic_year, test_class, test_student):
    # Unpaid bill
    bill = FeeBill(
        tenant_id=test_tenant.id,
        bill_number="BILL-AUDIT-1",
        student_id=test_student.id,
        class_id=test_class.id,
        academic_year_id=test_academic_year.id,
        bill_title="Tuition",
        subtotal_amount=Decimal("2000.00"),
        total_payable=Decimal("2000.00"),
        paid_amount=Decimal("0.00"),
        due_amount=Decimal("2000.00"),
        status=BillStatus.UNPAID.value,
        issue_date=date.today(),
        due_date=date.today(),
    )
    # Student wallet
    wallet = StudentWallet(
        tenant_id=test_tenant.id,
        student_id=test_student.id,
        academic_year_id=test_academic_year.id,
        advance_balance=Decimal("500.00"),
    )
    db_session.add_all([bill, wallet])
    db_session.commit()

    audit = FinanceService.get_rollover_financial_audit(db_session, test_tenant.id)
    assert audit.outgoing_academic_year_id == test_academic_year.id
    assert audit.total_billed >= Decimal("2000.00")
    assert audit.total_outstanding_dues >= Decimal("2000.00")
    assert audit.total_advance_wallet_balance >= Decimal("500.00")

def test_student_wallet_carried_forward_on_rollover(db_session, test_tenant, test_academic_year, test_class, test_student, test_enrollment):
    # Wallet on current academic year
    wallet = StudentWallet(
        tenant_id=test_tenant.id,
        student_id=test_student.id,
        academic_year_id=test_academic_year.id,
        advance_balance=Decimal("1200.00"),
    )
    db_session.add(wallet)
    db_session.commit()

    req = TenantAcademicYearRolloverRequest(
        name="2083/84",
        start_date=date(2026, 4, 14),
        end_date=date(2027, 4, 13),
        copy_teacher_assignments=False,
        copy_student_facilities=True,
        financial_audit_acknowledged=True,
    )
    AcademicService.tenant_rollover(db_session, test_tenant.id, req, is_super_admin=True)

    db_session.refresh(wallet)
    assert wallet.advance_balance == Decimal("1200.00")
    assert wallet.academic_year_id != test_academic_year.id
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv\Scripts\pytest.exe tests/test_rollover_financial_audit.py -v`
Expected: FAIL (`get_rollover_financial_audit` does not exist)

- [ ] **Step 3: Implement backend schemas and audit logic**

1. In `backend/src/modules/finance/schemas.py`:
```python
class RolloverFinancialAuditDTO(BaseModel):
    outgoing_academic_year_id: str
    outgoing_academic_year_name: str
    total_billed: Decimal
    total_collected: Decimal
    total_outstanding_dues: Decimal
    collection_rate_percent: float
    total_advance_wallet_balance: Decimal
    advance_wallet_students_count: int
    chronic_defaulters_count: int
    chronic_defaulters_due_amount: Decimal
    cancelled_bills_count: int
    total_cancelled_amount: Decimal
    unreconciled_cheques_count: int
    warnings: list[str]
```

2. In `backend/src/modules/finance/service.py`:
```python
    @classmethod
    def get_rollover_financial_audit(
        cls, db: Session, tenant_id: str
    ) -> RolloverFinancialAuditDTO:
        ay = cls.get_current_academic_year(db, tenant_id)

        # Total billed in outgoing session
        total_billed = db.scalar(
            select(func.coalesce(func.sum(FeeBill.total_payable), Decimal("0.00"))).where(
                FeeBill.tenant_id == tenant_id,
                FeeBill.academic_year_id == ay.id,
                FeeBill.status.in_([BillStatus.UNPAID.value, BillStatus.PARTIAL.value, BillStatus.PAID.value]),
            )
        ) or Decimal("0.00")

        # Total collected
        total_collected = db.scalar(
            select(func.coalesce(func.sum(FeePayment.amount_paid), Decimal("0.00"))).where(
                FeePayment.tenant_id == tenant_id,
                FeePayment.academic_year_id == ay.id,
            )
        ) or Decimal("0.00")

        # Total outstanding dues in outgoing session
        total_outstanding = db.scalar(
            select(func.coalesce(func.sum(FeeBill.due_amount), Decimal("0.00"))).where(
                FeeBill.tenant_id == tenant_id,
                FeeBill.academic_year_id == ay.id,
                FeeBill.status.in_([BillStatus.UNPAID.value, BillStatus.PARTIAL.value]),
                FeeBill.due_amount > Decimal("0.00"),
            )
        ) or Decimal("0.00")

        # Advance wallet balances
        wallet_sum = db.scalar(
            select(func.coalesce(func.sum(StudentWallet.advance_balance), Decimal("0.00"))).where(
                StudentWallet.tenant_id == tenant_id,
                StudentWallet.advance_balance > Decimal("0.00"),
            )
        ) or Decimal("0.00")

        wallet_count = db.scalar(
            select(func.count(StudentWallet.id)).where(
                StudentWallet.tenant_id == tenant_id,
                StudentWallet.advance_balance > Decimal("0.00"),
            )
        ) or 0

        # Chronic defaulters (students with 3+ unpaid or partial bills in outgoing session)
        chronic_subquery = (
            select(FeeBill.student_id, func.count(FeeBill.id).label("bill_count"), func.sum(FeeBill.due_amount).label("due_sum"))
            .where(
                FeeBill.tenant_id == tenant_id,
                FeeBill.academic_year_id == ay.id,
                FeeBill.status.in_([BillStatus.UNPAID.value, BillStatus.PARTIAL.value]),
                FeeBill.due_amount > Decimal("0.00"),
            )
            .group_by(FeeBill.student_id)
            .having(func.count(FeeBill.id) >= 3)
            .subquery()
        )
        chronic_count = db.scalar(select(func.count()).select_from(chronic_subquery)) or 0
        chronic_due = db.scalar(select(func.coalesce(func.sum(chronic_subquery.c.due_sum), Decimal("0.00")))) or Decimal("0.00")

        # Cancelled bills
        cancelled_count = db.scalar(
            select(func.count(FeeBill.id)).where(
                FeeBill.tenant_id == tenant_id,
                FeeBill.academic_year_id == ay.id,
                FeeBill.status == BillStatus.CANCELLED.value,
            )
        ) or 0
        cancelled_amount = db.scalar(
            select(func.coalesce(func.sum(FeeBill.total_payable), Decimal("0.00"))).where(
                FeeBill.tenant_id == tenant_id,
                FeeBill.academic_year_id == ay.id,
                FeeBill.status == BillStatus.CANCELLED.value,
            )
        ) or Decimal("0.00")

        # Unreconciled cheques count
        cheque_count = db.scalar(
            select(func.count(FeePayment.id)).where(
                FeePayment.tenant_id == tenant_id,
                FeePayment.academic_year_id == ay.id,
                FeePayment.payment_method == PaymentMethod.CHEQUE.value,
            )
        ) or 0

        rate = (float(total_collected) / float(total_billed) * 100.0) if total_billed > 0 else 0.0

        warnings: list[str] = []
        if total_outstanding > Decimal("0.00"):
            warnings.append(
                f"There is NPR {total_outstanding:,.2f} in unpaid dues that will carry forward as opening arrears."
            )
        if chronic_count > 0:
            warnings.append(
                f"{chronic_count} students have 3 or more unpaid bills totaling NPR {chronic_due:,.2f}."
            )
        if cheque_count > 0:
            warnings.append(
                f"{cheque_count} cheque payment(s) were recorded. Ensure bank clearance is verified."
            )
        if wallet_count > 0:
            warnings.append(
                f"{wallet_count} student(s) have NPR {wallet_sum:,.2f} in prepaid advance wallets that will be carried forward."
            )

        return RolloverFinancialAuditDTO(
            outgoing_academic_year_id=ay.id,
            outgoing_academic_year_name=ay.name,
            total_billed=total_billed,
            total_collected=total_collected,
            total_outstanding_dues=total_outstanding,
            collection_rate_percent=round(rate, 2),
            total_advance_wallet_balance=wallet_sum,
            advance_wallet_students_count=wallet_count,
            chronic_defaulters_count=chronic_count,
            chronic_defaulters_due_amount=chronic_due,
            cancelled_bills_count=cancelled_count,
            total_cancelled_amount=cancelled_amount,
            unreconciled_cheques_count=cheque_count,
            warnings=warnings,
        )
```

3. In `backend/src/modules/academic/schemas.py`:
Add `financial_audit_acknowledged: Optional[bool] = False` to `TenantAcademicYearRolloverRequest`.

4. In `backend/src/modules/academic/service.py`:
In `tenant_rollover` (and `platform_wide_rollover`), after updating continuing enrollments:
```python
        # Update active student wallets to reference the new academic year
        from src.modules.finance.models import StudentWallet
        continuing_student_ids = list(
            db.scalars(
                select(StudentEnrollment.student_id).where(
                    StudentEnrollment.tenant_id == tenant_id,
                    StudentEnrollment.academic_year_id == new_year.id,
                    StudentEnrollment.status == EnrollmentStatus.ACTIVE.value,
                    StudentEnrollment.deleted_at == None,
                )
            ).all()
        )
        if continuing_student_ids:
            db.execute(
                update(StudentWallet)
                .where(
                    StudentWallet.tenant_id == tenant_id,
                    StudentWallet.student_id.in_(continuing_student_ids),
                )
                .values(academic_year_id=new_year.id)
            )
```

5. In `backend/src/modules/finance/router.py`:
```python
@router.get(
    "/tenants/{tenant_id}/rollover-financial-audit",
    response_model=RolloverFinancialAuditDTO,
)
def get_rollover_financial_audit(
    tenant_id: str,
    member: TenantMembershipContext = Depends(get_current_tenant_member),
    db: Session = Depends(get_db),
):
    require_role(member, [UserRole.ADMIN, UserRole.OFFICE_ADMIN, UserRole.ACCOUNTANT])
    return FinanceService.get_rollover_financial_audit(db, tenant_id)
```

- [ ] **Step 4: Run backend tests to verify they pass**

Run: `.venv\Scripts\pytest.exe tests/test_rollover_financial_audit.py -v`
Expected: PASS

- [ ] **Step 5: Implement frontend API, Hook, and Wizard Step in `TenantRolloverDialog.tsx`**

1. In `frontend/src/features/finance/types.ts`:
```typescript
export interface RolloverFinancialAudit {
  outgoing_academic_year_id: string;
  outgoing_academic_year_name: string;
  total_billed: number;
  total_collected: number;
  total_outstanding_dues: number;
  collection_rate_percent: number;
  total_advance_wallet_balance: number;
  advance_wallet_students_count: number;
  chronic_defaulters_count: number;
  chronic_defaulters_due_amount: number;
  cancelled_bills_count: number;
  total_cancelled_amount: number;
  unreconciled_cheques_count: number;
  warnings: string[];
}
```

2. In `frontend/src/features/finance/api.ts` & `hooks.ts`:
Add `getRolloverFinancialAudit` and `useRolloverFinancialAudit`.

3. In `frontend/src/features/academic-year/components/TenantRolloverDialog.tsx`:
- Wizard steps becomes: `0 | 1 | 2 | 3` (starting at Step 0: Pre-Rollover Financial Audit).
- Step 0 displays:
  - Header: "Step 0: Financial Reconciliation Audit (Session {audit.outgoing_academic_year_name})".
  - KPI cards: Total Billed, Total Collected, Unpaid Receivables (Carried forward as Opening Arrears), Advance Wallets, Chronic Defaulters.
  - Alert box with items from `audit.warnings`.
  - Acknowledgment checkbox: "I have reviewed and acknowledge the outgoing session's financial reconciliation status."
  - "Proceed to Session Details" button (enabled only when acknowledged).
- Include `financial_audit_acknowledged: true` when executing the rollover mutation.

- [ ] **Step 6: Run frontend typecheck**

Run: `npx tsc -b`
Expected: 0 errors

- [ ] **Step 7: Commit changes**

```bash
git commit -m "feat(academic-rollover): add pre-rollover financial audit gate and advance wallet carry-forward"
```

---

### Task 5: End-to-End Verification and Full Test Suite Execution

**Files:**
- Execute backend tests: all test files in `backend/tests`
- Execute frontend typecheck: `npx tsc -b`
- Execute frontend tests: `npm test` or `node --test`

- [ ] **Step 1: Run full backend pytest test suite**

Run: `.venv\Scripts\pytest.exe -v`
Expected: 100% PASS

- [ ] **Step 2: Run frontend typecheck**

Run: `npx tsc -b`
Expected: 0 errors

- [ ] **Step 3: Run git status on both repositories to verify clean state**

Run: `git status` in `E:\SSUP\backend` and `E:\SSUP\frontend`
Expected: Clean working tree with all commits recorded
