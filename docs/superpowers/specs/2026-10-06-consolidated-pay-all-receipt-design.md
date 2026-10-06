# Consolidated "Pay All" Receipt & Multi-Bill Settlement Design

**Date**: 2026-10-06  
**Status**: Approved  
**Author**: Antigravity & Engineering Team  
**Scope**: Full-Stack (Backend FastAPI + SQLAlchemy & Frontend React + Vite + Tailwind)  
**Related Features**: Strict Sequential Monthly Billing, Itemized Monthly Ledgers, Fee Frequency Enforcement  

---

## 1. Problem Statement & Motivation
Currently, in the Finance Module (`StudentLedgerPage.tsx`), cashiers and parents can click **"Pay All Dues"** to settle multiple outstanding monthly invoices (e.g. Baishakh, Jestha, and Ashadh) in a single payment transaction. The backend waterfall allocation engine allocates the funds across each outstanding bill, generating separate `FeePayment` records (each with its own `receipt_number` and `amount_paid`).

However:
1. The payment response and UI only open the receipt modal for a single `primary_payment` (one bill), omitting the other months settled in that same transaction.
2. There is no single **Consolidated Payment Receipt** (एकमुष्ठ शुल्क भुक्तानी रसिद) document that parents can take home summarizing all settled months, their respective invoice numbers, allocated amounts, and overall remaining balance.
3. In the student ledger's receipt history table, there is no way to re-open or re-print a consolidated receipt for a multi-bill payment group later.

---

## 2. Goals & Success Criteria
1. **Transaction Grouping**: When `apply_waterfall=True` allocates payments across multiple bills, all created `FeePayment` records share a unique, human-readable `payment_group_id` (e.g., `CREC-2081/82-0001`).
2. **Dedicated Consolidated Receipt Endpoint**:
   - `GET /api/v1/finance/tenants/{tenant_id}/receipts/consolidated/{identifier}`
   - Returns complete school details, student/parent information, and an itemized breakdown of each settled bill, amounts paid, remaining dues, and overall student account balance.
3. **Immediate Auto-Print Modal**: Immediately upon completing "Pay All Dues", `<PrintableConsolidatedReceiptModal />` automatically opens with the consolidated receipt.
4. **Persistent Re-Print Action in Ledger**: In `StudentLedgerPage.tsx`'s receipt history table, payments belonging to a consolidated group display a `[Pay All: CREC-...]` badge and a dedicated `Consolidated Receipt` button to re-print anytime.
5. **UI/UX Pro Max Standards**:
   - Monospace tabular financial figures (`tabular-nums font-mono`).
   - High print contrast (Slate 900 on crisp white with sharp hairlines).
   - Dual calendar date formatting (Bikram Sambat + Gregorian).
   - `@media print` print stylesheet ensuring clean, border-aligned A4 portrait output without browser margins or UI clutter.
   - Accessible keyboard shortcuts (`Ctrl+P` / `Cmd+P` to print, `Escape` to close).
6. **ReBAC Security**: Parents can view consolidated receipts only for their linked children; accountants and school admins have full tenant access.
7. **Zero Regressions**: 100% pass across backend pytest suite, frontend node test suite, and production `npm run build`.

---

## 3. Architecture & Data Flow

```
[Cashier: Pay All Dues Modal]
             │
             ▼
   POST /bills/{first_unpaid_id}/payments
   { amount_paid: 15000, apply_waterfall: true, ... }
             │
             ▼
   [Backend: FinanceService.record_payment]
      ├─ Waterfall allocates across Bill 1, Bill 2, Bill 3
      ├─ Generates unique group receipt: CREC-2081/82-0001
      ├─ Creates FeePayment 1 (REC-01, payment_group_id: CREC-...)
      ├─ Creates FeePayment 2 (REC-02, payment_group_id: CREC-...)
      ├─ Creates FeePayment 3 (REC-03, payment_group_id: CREC-...)
      └─ Returns FeePaymentResponseDTO with:
            payment_group_id: "CREC-2081/82-0001",
            is_consolidated: true,
            allocations: [PaymentAllocationDTO, ...]
             │
             ▼
   [Frontend: onPaymentSuccess]
      └─ Automatically opens <PrintableConsolidatedReceiptModal
            groupId="CREC-2081/82-0001"
         />
             │
             ▼
   [Student Ledger Page History]
      └─ In Payments Table: Displays "Consolidated Receipt" button
         allowing reprint of CREC-2081/82-0001 anytime.
```

---

## 4. Backend Technical Specifications

### 4.1 Schema Migration (`src/modules/finance/models.py`)
Add `payment_group_id` to `FeePayment`:
```python
class FeePayment(TenantBase):
    ...
    payment_group_id: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True, index=True
    )
```

### 4.2 DTO Schemas (`src/modules/finance/schemas.py`)
```python
class PaymentAllocationDTO(BaseModel):
    payment_id: str
    receipt_number: str
    bill_id: str
    bill_number: str
    billing_month: Optional[str] = None
    bill_title: str
    amount_allocated: Decimal
    remaining_due_after: Decimal
    status: str  # PAID or PARTIAL

    model_config = ConfigDict(from_attributes=True)


class ConsolidatedReceiptDocumentDTO(BaseModel):
    consolidated_receipt_number: str  # e.g., CREC-2081/82-0001
    school_name: str
    school_address: Optional[str] = None
    school_phone: Optional[str] = None
    school_email: Optional[str] = None
    school_logo_url: Optional[str] = None
    payment_date: date
    student_name: str
    class_name: str
    section_name: Optional[str] = None
    roll_number: Optional[int] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    payment_method: str
    transaction_reference: Optional[str] = None
    remarks: Optional[str] = None
    received_by_name: Optional[str] = None
    allocations: list[PaymentAllocationDTO] = []
    total_amount_paid: Decimal
    amount_in_words: str
    total_account_balance_remaining: Decimal

    model_config = ConfigDict(from_attributes=True)
```
In `FeePaymentResponseDTO`:
```python
    payment_group_id: Optional[str] = None
    allocations: list[PaymentAllocationDTO] = []
    is_consolidated: bool = False
    total_transaction_amount: Optional[Decimal] = None
```

### 4.3 Service Implementation (`src/modules/finance/service.py`)
1. In `record_payment`:
   - If `len(created_payments) > 1` (or if `apply_waterfall` was requested and settled multiple bills):
     - Generate group receipt number: `group_id = cls._generate_receipt_number(db, tenant_id, ay.name, prefix="CREC")`.
     - Set `p.payment_group_id = group_id` for each created payment.
     - Build `allocations` list from `created_payments` and their associated bills.
     - Stamp `payment_group_id`, `allocations`, `is_consolidated = True`, and `total_transaction_amount` on `FeePaymentResponseDTO`.
   - If `len(created_payments) == 1`:
     - Keep `payment_group_id = None`, `is_consolidated = False`.
2. Implement `get_consolidated_receipt_document`:
   ```python
   @classmethod
   def get_consolidated_receipt_document(
       cls,
       db: Session,
       tenant_id: str,
       identifier: str,  # payment_group_id OR payment_id
       requesting_user_id: Optional[str] = None,
       requesting_roles: Optional[set[str]] = None,
   ) -> ConsolidatedReceiptDocumentDTO:
       ...
   ```
   - If `identifier` matches `payment_group_id`, fetch all payments with that `payment_group_id`.
   - If `identifier` matches a `payment.id`, fetch the payment. If it has `payment_group_id`, fetch the sibling group payments; if not, package this single payment as a 1-item allocation.
   - Enforce ReBAC checks: parent must be linked to student; staff have full access.
   - Calculate cumulative student account balance remaining across all remaining unpaid bills.
   - Format `amount_in_words` via `number_to_words`.

### 4.4 API Router (`src/modules/finance/router.py`)
```python
@router.get(
    "/tenants/{tenant_id}/receipts/consolidated/{identifier}",
    response_model=ApiResponse[ConsolidatedReceiptDocumentDTO],
    summary="Get consolidated payment receipt document for multi-bill settlement",
)
def get_consolidated_receipt_document(...)
```

---

## 5. Frontend Technical Specifications

### 5.1 Type Definitions (`src/features/finance/types.ts`)
```typescript
export interface PaymentAllocation {
  payment_id: string;
  receipt_number: string;
  bill_id: string;
  bill_number: string;
  billing_month?: string | null;
  bill_title: string;
  amount_allocated: number;
  remaining_due_after: number;
  status: string;
}

export interface ConsolidatedReceiptDocument {
  consolidated_receipt_number: string;
  school_name: string;
  school_address?: string | null;
  school_phone?: string | null;
  school_email?: string | null;
  school_logo_url?: string | null;
  payment_date: string;
  student_name: string;
  class_name: string;
  section_name?: string | null;
  roll_number?: number | null;
  parent_name?: string | null;
  parent_phone?: string | null;
  payment_method: string;
  transaction_reference?: string | null;
  remarks?: string | null;
  received_by_name?: string | null;
  allocations: PaymentAllocation[];
  total_amount_paid: number;
  amount_in_words: string;
  total_account_balance_remaining: number;
}
```

### 5.2 API Hooks (`src/features/finance/hooks.ts`)
```typescript
export function useConsolidatedReceiptDocument(tenantId: string | null, identifier: string | null) {
  return useQuery({
    queryKey: ['consolidated-receipt-document', tenantId, identifier],
    queryFn: async () => {
      if (!tenantId || !identifier) return null;
      const resp = await apiClient.get<ApiResponse<ConsolidatedReceiptDocument>>(
        `/finance/tenants/${tenantId}/receipts/consolidated/${identifier}`
      );
      return resp.data.data;
    },
    enabled: Boolean(tenantId && identifier),
    staleTime: 5 * 60 * 1000,
  });
}
```

### 5.3 `<PrintableConsolidatedReceiptModal />` Component
Located in `src/features/finance/components/PrintableConsolidatedReceiptModal.tsx`:
- Header: School logo, name, phone, address, official title **"CONSOLIDATED FEE PAYMENT RECEIPT / एकमुष्ठ शुल्क भुक्तानी रसिद"**, receipt number, dual date.
- Student & Parent block: Student Name, Class, Section, Roll, Guardian Name, Phone.
- Table: S.N., Billing Month / Title, Bill #, Settled Amount, Remaining Due, Status Badge, Sub-Receipt #.
- Financial Totals: Total Amount Paid, Amount in Words, Total Remaining Account Due.
- Signatures: Cashier & School Seal.
- Action Bar: Print button (`Ctrl+P` hotkey support), Close button.
- Clean `@media print` rules: Portrait A4 formatting, no background clutter, no URL footers.

### 5.4 Integration in `StudentLedgerPage.tsx`
- State: `activeConsolidatedReceiptId: string | null`.
- When "Pay All Dues" finishes in `PaymentCollectDialog`:
  - If `payment.payment_group_id || payment.is_consolidated`:
    `setActiveConsolidatedReceiptId(payment.payment_group_id || payment.id)`.
  - Else:
    `setActivePrintReceiptId(payment.id)`.
- In `Receipts & Payment History` table:
  - If payment has `payment_group_id`:
    - Renders a small badge `[Pay All: CREC-...]`.
    - Renders action button `Consolidated Receipt` alongside standard `Receipt` button.
- Mount `<PrintableConsolidatedReceiptModal />` with `activeConsolidatedReceiptId`.

---

## 6. Verification & Test Plan

1. **Backend Tests (`tests/test_consolidated_receipt.py`)**:
   - `test_pay_all_waterfall_stamps_payment_group_id`: Verifies multi-bill payment generates matching `payment_group_id` starting with `CREC-` across all created payments.
   - `test_single_bill_payment_leaves_payment_group_id_null`: Verifies single-bill payment does not assign a group.
   - `test_get_consolidated_receipt_by_group_id`: Verifies `GET /receipts/consolidated/{group_id}` returns full student, parent, school, and allocations data.
   - `test_get_consolidated_receipt_by_payment_id`: Verifies looking up via one payment ID resolves the full consolidated group.
   - `test_parent_rebac_access_to_consolidated_receipt`: Verifies parent can view their child's receipt, but is blocked from others (`403 Forbidden`).
2. **Frontend Tests (`cashierAndReceipt.test.mjs`)**:
   - Verify calculation of consolidated allocations, total account balances, and dual date parsing.
3. **Full Regression & Build**:
   - `pytest tests/` in backend.
   - `node --test src/**/*.test.mjs` in frontend.
   - `npm run build` in frontend (0 errors).
