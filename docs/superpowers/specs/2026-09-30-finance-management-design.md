# Finance Management System & Academic Year Operational Scoping Design Document

**Date:** 2026-09-30  
**Status:** Approved by User  
**Author:** Antigravity  
**Domain:** School Finance Management, Role Governance, Academic Year Scoping  

---

## 1. Executive Summary

This specification defines the architecture, data models, APIs, and frontend interfaces for the **School Finance Management System** in Schools Up Pro (SSUP / PBAC), alongside formalizing the **Academic Year Scoping & Operational Locking Policy**.

The Finance module acts as an audit-proof financial record-keeping system for schools, enabling administrators and accountants to:
1. Configure class-based fee structures across monthly frequencies (e.g. Tuition Fee) and yearly frequencies (e.g. School Management Fee, Lab Fee).
2. Appoint a dedicated **`ACCOUNTANT`** role with a strict **one active accountant per school** constraint.
3. Manage student percentage discounts (scholarship/sibling concessions) with automatic calculation during bill generation and per-bill manual overrides.
4. Batch-generate monthly or annual bills for entire classes in 1-click, or generate fine-tuned individual bills.
5. Record full or partial payments across various payment modes (Cash, Bank Transfer, Cheque, Online/Digital).
6. Generate and print official payment receipts (A4/A5 browser-printable with school branding, student details, line items, and cashier signature) and student bills.
7. Automatically roll over unpaid student dues into an opening "Previous Session Dues" bill when the academic session changes or rolls over.
8. Enforce strict **Academic Year Operational Locking**: Retrospective surfaces (Dashboard and Academic Analytics) allow switching academic years for historical inspection, while all operational workflows (Exams, Attendance, and Finance) strictly lock to the current active session (`is_current: true`) with zero manual switching.

---

## 2. Academic Year Scoping & Operational Locking Policy

### 2.1 Separation of Concerns

```
┌─────────────────────────────────────────────────────────────┐
│          Retrospective Surfaces (Multi-Year Switcher)       │
│  - Dashboard (historical KPIs, classes, attendance trends)   │
│  - Academic Analytics (cohort retention, growth, capacity)  │
│  👉 Year selector dropdown enabled                          │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│         Operational Workflows (Strictly Current Year)       │
│  - Exam Creation & Scoring                                  │
│  - Daily Attendance Marking                                 │
│  - Student Enrollment & Class Duties                        │
│  - 🌟 Finance Management (Fee Structures, Billing, Payments) │
│  👉 Bound strictly to useCurrentAcademicYear (is_current)   │
│  👉 Switcher eliminated; replaced with <Lock /> status card │
│  👉 Zero accidental mutations of past academic sessions     │
└─────────────────────────────────────────────────────────────┘
```

1. **Retrospective Surfaces**:
   * Dashboard (`DashboardPage.tsx`) and Academic Analytics (`AcademicAnalyticsPage.tsx`) retain year dropdown selectors so leadership can review historical metrics, past enrollment figures, and attendance patterns.
2. **Operational Surfaces**:
   * Examination creation (`CreateExamPage.tsx`) is hard-bound to `useCurrentAcademicYear(tenantId).currentYearId`.
   * Attendance marking (`MarkAttendancePage.tsx`) is bound to the current academic calendar.
   * Finance Hub (`/finance` and all sub-routes) displays a locked session badge:
     ```tsx
     <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary text-xs py-1 px-2.5">
       <Lock className="w-3 h-3 mr-1.5 text-primary" />
       Academic Session: 2081/82 (Current Active)
     </Badge>
     ```
   * All mutating finance endpoints validate that operations target the currently active session (`is_current = True`).

---

## 3. Role Governance & Single Accountant Policy

### 3.1 Role Definition
* **Backend Enum**: Add `ACCOUNTANT = "ACCOUNTANT"` to `src/common/enums.py::UserRole`.
* **Frontend Type**: Add `'ACCOUNTANT'` to `src/config/permissions.ts::Role`.
* **Badge Styling**: Teal/Emerald tone (`bg-teal-500/15 text-teal-700 border-teal-500/30 dark:text-teal-300`).
* **Persona Formatter**: `formatRole('ACCOUNTANT')` returns `"Accountant"`.

### 3.2 Appointment Authority & Single-Accountant Invariant
* **Appointment**: Strictly **School Principal (`ADMIN`)** or **Super Admin**.
* **Endpoint**: `POST /api/v1/tenants/{tenant_id}/members/accountant`
* **Invariant**:
  ```python
  active_accountants = db.execute(
      select(TenantUserRole).where(
          TenantUserRole.tenant_id == tenant_id,
          TenantUserRole.role == UserRole.ACCOUNTANT.value,
          TenantUserRole.is_active == True,
      )
  ).scalars().all()

  if active_accountants:
      raise BadRequestException(
          message=f"School already has an active Accountant ({active_accountants[0].user.full_name}). "
                  f"A school can have only one active accountant. Please revoke or deactivate the current accountant before assigning a new one."
      )
  ```
* **Reassignment**: Principals can toggle `is_active` or delete the existing accountant's role from the School Members page to appoint a new accountant.

### 3.3 Authorization Matrix
```typescript
export const PERMISSION_MATRIX = {
  // Existing permissions ...
  MANAGE_FINANCE: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'],
  VIEW_FINANCE: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'],
} as const;
```
* **Accountant Scope**:
  * Unrestricted access to the Finance Hub (Fee structures, Bill generation, Payment collection, Student fee profiles, Receipts, Financial metrics).
  * Read-only access to Class catalogs and Student rosters for billing purposes.
  * **Cannot** create exams, grade exams, mark student attendance, or alter school configuration.
* **School Principal (`ADMIN`)**:
  * Retains full administrative access to all finance operations alongside the Accountant.

---

## 4. Backend Architecture & Database Models

The module resides under `backend/src/modules/finance/` and is registered in `alembic` and `src/api/v1_router.py`.

```
┌───────────────────────────┐         ┌───────────────────────────┐
│       FeeStructure        │         │      StudentDiscount      │
├───────────────────────────┤         ├───────────────────────────┤
│ id (UUID)                 │         │ id (UUID)                 │
│ tenant_id (UUID)          │         │ tenant_id (UUID)          │
│ academic_year_id (UUID)   │         │ academic_year_id (UUID)   │
│ class_id (UUID)           │         │ student_id (UUID)         │
│ name (String 100)         │         │ discount_percent (Numeric)│
│ fee_category (String 30)  │         │ reason (String 100)       │
│ frequency (String 20)     │         │ is_active (Boolean)       │
│ amount (Numeric 10,2)     │         └───────────────────────────┘
│ description (Text)        │
│ is_active (Boolean)       │
└─────────────┬─────────────┘
              │ 1:N
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                            FeeBill                              │
├─────────────────────────────────────────────────────────────────┤
│ id (UUID)                                                       │
│ tenant_id (UUID)                                                │
│ bill_number (String 50, UNIQUE per tenant, e.g. BILL-2081-0001) │
│ student_id (UUID -> students.id)                                │
│ class_id (UUID -> classes.id)                                   │
│ academic_year_id (UUID -> academic_years.id)                    │
│ bill_title (String 150)                                         │
│ billing_month (String 30, optional)                             │
│ issue_date (Date), due_date (Date)                              │
│ subtotal_amount (Numeric 12,2)                                  │
│ discount_percent (Numeric 5,2)                                  │
│ discount_amount (Numeric 12,2)                                  │
│ previous_due_amount (Numeric 12,2)                              │
│ total_payable (Numeric 12,2)                                    │
│ paid_amount (Numeric 12,2)                                      │
│ due_amount (Numeric 12,2)                                       │
│ status (String 20: UNPAID, PARTIAL, PAID, CANCELLED)            │
│ notes (Text, optional)                                          │
│ created_by_user_id (UUID -> users.id)                           │
└──────────────┬──────────────────────────────────────────────────┘
               │ 1:N
               ├──────────────────────────────┐
               ▼                              ▼
┌─────────────────────────────┐  ┌────────────────────────────────┐
│         FeeBillItem         │  │           FeePayment           │
├─────────────────────────────┤  ├────────────────────────────────┤
│ id (UUID)                   │  │ id (UUID)                      │
│ bill_id (UUID)              │  │ receipt_number (REC-2081-0001) │
│ fee_structure_id (optional) │  │ tenant_id (UUID)               │
│ fee_name (String 100)       │  │ bill_id (UUID -> fee_bills.id) │
│ amount (Numeric 10,2)       │  │ student_id (UUID)              │
└─────────────────────────────┘  │ academic_year_id (UUID)        │
                                 │ amount_paid (Numeric 10,2)     │
                                 │ payment_method (String 30)     │
                                 │ transaction_reference (String) │
                                 │ payment_date (Date)            │
                                 │ received_by_user_id (UUID)     │
                                 │ remarks (Text)                 │
                                 └────────────────────────────────┘
```

### 4.1 Enums (`src/modules/finance/enums.py`)
```python
from enum import Enum

class FeeCategory(str, Enum):
    TUITION = "TUITION"
    MANAGEMENT = "MANAGEMENT"
    ADMISSION = "ADMISSION"
    EXAMINATION = "EXAMINATION"
    TRANSPORT = "TRANSPORT"
    LAB_LIBRARY = "LAB_LIBRARY"
    ACTIVITY = "ACTIVITY"
    PREVIOUS_DUES = "PREVIOUS_DUES"
    OTHER = "OTHER"

class FeeFrequency(str, Enum):
    MONTHLY = "MONTHLY"
    YEARLY = "YEARLY"
    ONE_TIME = "ONE_TIME"

class BillStatus(str, Enum):
    UNPAID = "UNPAID"
    PARTIAL = "PARTIAL"
    PAID = "PAID"
    CANCELLED = "CANCELLED"

class PaymentMethod(str, Enum):
    CASH = "CASH"
    BANK_TRANSFER = "BANK_TRANSFER"
    CHEQUE = "CHEQUE"
    ONLINE_DIGITAL = "ONLINE_DIGITAL"
    OTHER = "OTHER"
```

### 4.2 Financial Formulas & Invariants
1. **Discount Amount**:
   $$\text{discount\_amount} = \text{round}\left(\text{subtotal\_amount} \times \frac{\text{discount\_percent}}{100}, 2\right)$$
2. **Total Payable**:
   $$\text{total\_payable} = (\text{subtotal\_amount} - \text{discount\_amount}) + \text{previous\_due\_amount}$$
3. **Due Amount**:
   $$\text{due\_amount} = \text{total\_payable} - \text{paid\_amount}$$
4. **Payment Status Transition**:
   - $\text{paid\_amount} == 0 \implies \text{status} = \text{UNPAID}$
   - $0 < \text{paid\_amount} < \text{total\_payable} \implies \text{status} = \text{PARTIAL}$
   - $\text{paid\_amount} \ge \text{total\_payable} \implies \text{status} = \text{PAID}$
5. **Payment Constraints**:
   - `amount_paid` must be strictly $> 0$ and $\le \text{bill.due\_amount}$.

---

## 5. Automatic Academic Year Rollover & Dues Carryover

### 5.1 Business Requirement
*"If the academic year changes, the due amount will go to the due fee -> academic year."*

### 5.2 Implementation
Whenever `AcademicYearService.set_current_academic_year` or `rollover` transitions a new academic session to `is_current = True`:
1. Find the closing session (`from_year_id`) and the new active session (`to_year_id`).
2. Run `FinanceService.carry_forward_dues(db, tenant_id, from_year_id, to_year_id)`:
   ```python
   # Group unpaid bills by student in the closing academic year
   unpaid_balances = db.execute(
       select(
           FeeBill.student_id,
           FeeBill.class_id,
           func.sum(FeeBill.due_amount).label("total_unpaid")
       )
       .where(
           FeeBill.tenant_id == tenant_id,
           FeeBill.academic_year_id == from_year_id,
           FeeBill.status.in_([BillStatus.UNPAID.value, BillStatus.PARTIAL.value]),
           FeeBill.due_amount > 0
       )
       .group_by(FeeBill.student_id, FeeBill.class_id)
   ).all()

   for student_id, class_id, total_unpaid in unpaid_balances:
       # Check if an opening due bill already exists for this student in to_year_id
       existing = db.execute(
           select(FeeBill).where(
               FeeBill.tenant_id == tenant_id,
               FeeBill.academic_year_id == to_year_id,
               FeeBill.student_id == student_id,
               FeeBill.bill_title.like("Previous Session Dues%")
           )
       ).scalar_one_or_none()

       if not existing and total_unpaid > 0:
           bill = FeeBill(
               tenant_id=tenant_id,
               bill_number=generate_bill_number(tenant_id, to_year_name),
               student_id=student_id,
               class_id=class_id,
               academic_year_id=to_year_id,
               bill_title=f"Previous Session Dues ({from_year_name})",
               issue_date=new_year.start_date,
               due_date=new_year.start_date,
               subtotal_amount=0,
               discount_percent=0,
               discount_amount=0,
               previous_due_amount=total_unpaid,
               total_payable=total_unpaid,
               paid_amount=0,
               due_amount=total_unpaid,
               status=BillStatus.UNPAID.value
           )
           bill.items.append(FeeBillItem(
               fee_name=f"Carried Forward Dues ({from_year_name})",
               amount=total_unpaid
           ))
           db.add(bill)
   ```
3. Audit action `FINANCE_DUES_CARRIED_FORWARD` is recorded with affected student count and total sum.

---

## 6. API Endpoints Specification

Prefix: `/api/v1/finance/tenants/{tenant_id}`  
Guarded by `require_roles(UserRole.ADMIN, UserRole.ACCOUNTANT)`.

### 6.1 Identity Management
* `POST /api/v1/tenants/{tenant_id}/members/accountant`: Assign Accountant role to a registered user (`ADMIN` only). Rejects if school already has an active accountant.

### 6.2 Fee Structures
* `POST .../fee-structures`: Create class fee structure for current academic year.
* `GET .../fee-structures`: List class fee structures (`?class_id=`, `?frequency=`).
* `PUT .../fee-structures/{id}`: Update fee structure.
* `DELETE .../fee-structures/{id}`: Deactivate/delete fee structure.

### 6.3 Student Discounts
* `POST .../discounts`: Set or update student concession % (`student_id`, `discount_percent`, `reason`).
* `GET .../discounts`: List all active student concessions.
* `GET .../students/{student_id}/discount`: Get concession rate for a specific student.

### 6.4 Fee Invoicing & Bills
* `POST .../bills/generate-batch`:
  * **Payload**: `{ class_id: string, section_id?: string, billing_month?: string, fee_structure_ids: string[], due_date: string, notes?: string }`
  * Generates bills for all enrolled active students in the class/section. Auto-applies student discount % and calculates previous dues.
* `POST .../bills/generate-single`:
  * **Payload**: `{ student_id: string, billing_month?: string, fee_items: { fee_name: string, amount: number }[], discount_percent?: number, due_date: string, notes?: string }`
  * Generates individual bill with manual discount override.
* `GET .../bills`: Paginated list of bills with filters (`class_id`, `status`, `month`, `search`, `page`, `page_size`).
* `GET .../bills/{bill_id}`: Full bill breakdown with line items and past payment receipts.
* `DELETE .../bills/{bill_id}`: Cancel bill (only if `paid_amount == 0`).

### 6.5 Payments & Receipts
* `POST .../payments`:
  * **Payload**: `{ bill_id: string, amount_paid: number, payment_method: PaymentMethod, transaction_reference?: string, payment_date: string, remarks?: string }`
  * Records payment, updates bill `paid_amount`, `due_amount`, and `status`. Returns generated receipt details.
* `GET .../payments`: Paginated transaction list.
* `GET .../payments/{payment_id}/receipt`: Fetch structured receipt document for printing.

### 6.6 Student Fee Ledger & Dashboard Telemetry
* `GET .../students/{student_id}/ledger`: Student 360° fee profile (Billed total, Paid total, Balance, Bills list, Payments history).
* `GET .../dashboard-summary`: Real-time KPIs (Total Collected, Total Outstanding Dues, Defaulters Count, Collection Rate %, Recent Payments).

---

## 7. Frontend Architecture (React 19 + TypeScript)

Folder location: `frontend/src/features/finance/`

```
frontend/src/features/finance/
├── pages/
│   ├── FinanceDashboardPage.tsx       # Finance Hub: KPIs, collection trends, quick actions
│   ├── BillsPage.tsx                  # Bills table, status filters, batch generate trigger
│   ├── CollectPaymentPage.tsx         # Fast student fee search, bill selection & payment entry
│   ├── FeeStructuresPage.tsx          # Class-by-class monthly & yearly fee configurations
│   ├── TransactionsPage.tsx           # Payment receipt history with 1-click Print Receipt
│   └── StudentLedgerPage.tsx          # Student 360° fee profile & full transaction statement
├── components/
│   ├── BatchBillGenerateDialog.tsx    # 1-click class monthly billing wizard with discount preview
│   ├── FeeStructureDialog.tsx         # Add/edit monthly tuition or annual fee heads
│   ├── PaymentCollectDialog.tsx       # Modal to record full or partial payment with mode selector
│   ├── StudentDiscountDialog.tsx      # Set student discount % (scholarship, sibling concession)
│   ├── PrintableReceiptModal.tsx      # High-fidelity A4/A5 printable receipt with @media print CSS
│   └── PrintableBillModal.tsx         # Official student invoice document for parents
├── hooks.ts                           # TanStack Query wrappers (useBills, usePayments, useCollectPayment)
├── api.ts                             # Typed Axios endpoints with automatic X-Tenant-ID injection
├── schema.ts                          # Zod validation schemas matching backend Pydantic models
└── types.ts                           # TypeScript domain models
```

### 7.1 Printable Receipt Specification (`PrintableReceiptModal.tsx`)
Designed to print crisp official documents matching Swiss minimalist aesthetics:
* **Dimensions**: Formatted for standard A4 (half-sheet A5 dual copy: School Copy & Parent Copy).
* **CSS Print Optimization**:
  ```css
  @media print {
    body * { visibility: hidden; }
    #printable-receipt, #printable-receipt * { visibility: visible; }
    #printable-receipt { position: absolute; left: 0; top: 0; width: 100%; }
    .no-print { display: none !important; }
  }
  ```
* **Header**: School name, address, contact, and logo.
* **Metadata**: Receipt No (`REC-2081-0042`), Issue Date (Dual BS & AD format), Cashier/Accountant Name.
* **Student Block**: Student Name, Class/Section, Roll No., Parent Name & Phone.
* **Table Breakdown**: S.N., Fee Description, Billing Month/Type, Amount.
* **Totals Section**: Subtotal, Concession Discount (%), Carried Dues, Net Total Payable, **Amount Paid This Receipt**, Remaining Balance Due.
* **Amount in Words**: Nepali/English number to words translation.
* **Signatures**: Cashier / Accountant Signature, School Stamp area.

### 7.2 Navigation Integration (`navConfig.ts`)
* In `src/components/layout/navConfig.ts`, render a dedicated **Finance** navigation section for `ADMIN` and `ACCOUNTANT`:
  * 💳 **Finance Hub** (`/finance`)
  * 📄 **Bills & Invoices** (`/finance/bills`)
  * 💰 **Collect Payment** (`/finance/collect`)
  * ⚙️ **Fee Structures** (`/finance/structures`)
  * 🧾 **Transactions & Receipts** (`/finance/transactions`)
* In `TopHeader.tsx` & `AppShell.tsx`:
  * Persona switcher supports switching to active **Accountant** persona.

---

## 8. Verification & Testing Strategy

### 8.1 Backend Automated Tests (`tests/test_finance_management.py`)
1. **Single Accountant Invariant Test**:
   - Admin appoints User A as Accountant $\implies 201\ \text{Created}$.
   - Admin tries to appoint User B as Accountant $\implies 400\ \text{Bad Request}$ with explanatory message.
   - Admin deactivates User A and appoints User B $\implies 201\ \text{Created}$.
2. **Fee Structure & Batch Bill Generation Test**:
   - Create monthly tuition (Rs. 3,500) and yearly fee (Rs. 5,000) for Class 10.
   - Assign 20% discount to Student A.
   - Batch generate Baisakh bill for Class 10:
     - Verify Student A's bill: subtotal = 3,500, discount = 700 (20%), payable = 2,800.
     - Verify Student B's bill: subtotal = 3,500, discount = 0, payable = 3,500.
3. **Payment Collection & Partial Payment Test**:
   - Collect Rs. 1,500 on Student A's Rs. 2,800 bill.
   - Verify status transitions to `PARTIAL`, remaining due = 1,300.
   - Collect remaining Rs. 1,300 $\implies$ status transitions to `PAID`, remaining due = 0.
4. **Academic Year Carryover Test**:
   - Student B has unpaid Rs. 3,500 in Year 2081.
   - Rollover executes to Year 2082.
   - Verify opening bill exists in Year 2082 for Student B with `previous_due_amount = 3,500`.

### 8.2 Frontend Manual & Build Verification
1. `npm run build` / `vite build` verifies zero TypeScript compiler errors.
2. `npx oxlint` verifies code quality and syntax standards.
3. Verify receipt modal print preview renders cleanly with accurate numbers and formatting.
4. Verify academic session card on `/finance` is locked to current session with no year switcher.

---

## 9. Conclusion
This design guarantees strict separation between retrospective analysis and operational locking, enforces the single-accountant governance rule, provides a high-efficiency billing and payment system with printable receipts, and ensures automated carryover of unpaid dues across academic sessions.
