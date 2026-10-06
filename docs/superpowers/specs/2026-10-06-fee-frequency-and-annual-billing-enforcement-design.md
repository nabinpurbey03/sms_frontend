# Fee Frequency Semantics & Annual Billing Enforcement Design

**Document ID:** `2026-10-06-fee-frequency-and-annual-billing-enforcement-design`  
**Date:** 2026-10-06  
**Status:** Approved  
**Author:** Antigravity & User Pair

---

## 1. Executive Summary & Problem Statement

In the SSUP Finance module, fee structures are classified into four frequency categories:
- `MONTHLY` (e.g., Tuition Fee, Transport Fee, Monthly Lab)
- `YEARLY` (e.g., Annual Charges, Development Fee, Sports & Cultural Fee, Library Annual Charge)
- `ONE_TIME` (e.g., Admission Fee, Registration Fee, Security Deposit)
- `TERMWISE` (e.g., Terminal Examination Fees)

### The Defect
Previously, when an accountant or school cashier opened the Batch Invoicing wizard ([`BatchBillingPage.tsx`](file:///E:/SSUP/frontend/src/features/finance/pages/BatchBillingPage.tsx)), the system defaulted to auto-selecting all fee heads (`[...schoolFees, ...classFees]`) indiscriminately. 

Because neither the frontend nor the backend verified whether a `YEARLY` or `ONE_TIME` fee head had already been billed in the current academic session, annual charges remained checked by default every subsequent billing month (Jestha, Ashadh, Shrawan...). If the cashier did not manually uncheck annual charges every month, parents were billed the full annual charge up to 12 times per year, causing inflated arrears, ledger corruption, and accounting discrepancies.

---

## 2. Core Business Rules & Frequency Invariants

We establish strict, deterministic invariants governing when and how fee frequencies are invoiced:

| Fee Frequency | Eligible Billing Months | Batch Billing Eligible? | Single Bill Eligible? | Annual Limit per Student |
|---|---|---|---|---|
| **`MONTHLY`** | Any BS month (Baishakh $\to$ Chaitra, sequentially) | **Yes** — Default for every monthly run | **Yes** | 12 cycles per year |
| **`YEARLY`** | **Baishakh** (for existing classes) OR admission month for mid-year joiners | **Yes, but strictly in Baishakh** (Session opening cycle) | **Yes** (used for mid-year admissions or specific annual adjustments) | **At most ONCE per student per session** |
| **`ONE_TIME`** | Upon initial admission / enrollment | **No** (excluded from monthly batch billing) | **Yes** (issued upon admission) | **At most ONCE per student lifetime/session** |
| **`TERMWISE`** | In designated exam billing cycles or ad-hoc | **Optional** (opt-in only, never auto-selected) | **Yes** | Up to 3–4 terms per session |

### Operational Workflows
1. **Existing Enrolled Classes**:
   - In **Baishakh**, batch billing allows selecting both `MONTHLY` and `YEARLY` fee heads, allowing annual charges and first-month tuition to be billed together.
   - In **Jestha through Chaitra**, `YEARLY` and `ONE_TIME` fee heads are automatically excluded and disabled from batch billing.
2. **Mid-Year Admissions (Option B Workflow)**:
   - Monthly batch billing runs strictly manage recurring `MONTHLY` tuition.
   - When a student enrolls mid-year (e.g., in Shrawan or Kartik), the cashier generates their initial enrollment invoice via **Single Bill**, itemizing their `ONE_TIME` admission fee, `YEARLY` annual fee, and initial month tuition.
3. **Session-Level Duplicate Shield**:
   - Within the same `academic_year_id`, a student cannot have more than one active (non-cancelled) line item referencing the same `YEARLY` or `ONE_TIME` fee structure.

---

## 3. Backend Architecture & Validation Engine

All validation is enforced at the service layer in [`src/modules/finance/service.py`](file:///E:/SSUP/backend/src/modules/finance/service.py).

### 3.1 Batch Billing Validation (`generate_batch_bills`)

1. **Month Frequency Guard**:
   - When `data.billing_month != "Baishakh"`:
     - The engine inspects all structures in `data.fee_structure_ids`.
     - If any structure has `frequency in (FeeFrequency.YEARLY.value, FeeFrequency.ONE_TIME.value)`:
       - Raises `BadRequestException`:
         > `"Fee head '{structure.name}' ({structure.frequency}) cannot be included in {billing_month} batch billing. Yearly fees are only billable in Baishakh."`
   - When `data.billing_month == "Baishakh"`:
     - `YEARLY` fees are allowed.
     - `ONE_TIME` fees (admission fees) are rejected in batch runs:
       > `"Fee head '{structure.name}' (ONE_TIME) cannot be billed in batch mode. One-time fees must be billed via individual admission invoices."`

2. **Per-Student Duplicate Shield Query**:
   - In a Baishakh batch run, what if a student was already billed an annual fee early via a single bill?
   - The engine performs a single indexed query for all students in the class:
     ```python
     billed_structures_query = (
         select(FeeBill.student_id, FeeBillItem.fee_structure_id)
         .join(FeeBillItem, FeeBill.id == FeeBillItem.bill_id)
         .where(
             FeeBill.tenant_id == tenant_id,
             FeeBill.academic_year_id == ay.id,
             FeeBill.student_id.in_(student_ids),
             FeeBill.status != BillStatus.CANCELLED.value,
             FeeBillItem.fee_structure_id.isnot(None),
         )
     )
     billed_set = set(db.execute(billed_structures_query).all())
     ```
   - When assembling bill items for student $S$, if `(S.id, structure.id) in billed_set`, that specific `YEARLY` structure is **silently skipped** for student $S$. The student receives their tuition bill without duplicate annual charges.

### 3.2 Single Bill Validation (`generate_single_bill`)

When generating an individual invoice for a student:
1. For each item in `data.fee_items`:
   - If the item references a `fee_structure_id`:
     - Load the structure. If `structure.frequency in (FeeFrequency.YEARLY.value, FeeFrequency.ONE_TIME.value)`:
       - Check if the student already has an active bill containing `fee_structure_id` in the current session:
         ```python
         already_billed = db.scalar(
             select(FeeBill.bill_number)
             .join(FeeBillItem, FeeBill.id == FeeBillItem.bill_id)
             .where(
                 FeeBill.tenant_id == tenant_id,
                 FeeBill.academic_year_id == ay.id,
                 FeeBill.student_id == student.id,
                 FeeBill.status != BillStatus.CANCELLED.value,
                 FeeBillItem.fee_structure_id == structure.id,
             )
         )
         ```
       - If `already_billed` exists, raise `ConflictException`:
         > `"Fee head '{structure.name}' ({structure.frequency}) has already been billed to this student in Bill #{already_billed} for this academic session."`

---

## 4. Frontend Architecture & User Experience

Enhancements in [`src/features/finance/pages/BatchBillingPage.tsx`](file:///E:/SSUP/frontend/src/features/finance/pages/BatchBillingPage.tsx) and supporting utilities.

### 4.1 Month-Sensitive Fee Pre-Selection & Filtering
- Helper utility: `filterApplicableBatchFeeStructures(month: string, structures: FeeStructure[]): { applicable: FeeStructure[], disabled: FeeStructure[] }`
  - When `month === 'Baishakh'`:
    - `applicable`: includes `MONTHLY` and `YEARLY` structures.
    - `disabled`: includes `ONE_TIME` structures (badged `"Admission Only"`).
  - When `month !== 'Baishakh'` (Jestha $\to$ Chaitra):
    - `applicable`: includes only `MONTHLY` structures.
    - `disabled`: includes `YEARLY` (badged `"Yearly (Baishakh Only)"`) and `ONE_TIME` structures.
- Auto-selection effect:
  - When `selectedMonth` changes, `fee_structure_ids` automatically prunes any disabled IDs and auto-selects only applicable fee heads.
  - "Select All" button only toggles applicable fee heads.

### 4.2 Forecast & Live Calculation Accuracy
- `calculateBaseMonthlyFee(structures, adHocAmount)` only sums applicable fee heads.
- In **Baishakh**, forecast displays: `Tuition + Annual Charges + Facilities`.
- In **Jestha $\to$ Chaitra**, forecast displays: `Tuition + Facilities`.

### 4.3 Single Bill Form Enhancement
- When cashier selects a fee head for a student:
  - If that student was already billed that `YEARLY` or `ONE_TIME` head in the current session, the dropdown / item picker marks it with a disabled badge: `Already Billed (Session)`.

---

## 5. Edge Cases & Error Handling

1. **Void & Cancelled Invoices**:
   - When a cashier voids an unpaid bill (e.g. `POST /finance/bills/{id}/cancel`), the bill's status transitions to `CANCELLED`.
   - The duplicate check strictly filters `FeeBill.status != BillStatus.CANCELLED.value`. Cancelled line items do not block regeneration.
2. **Academic Session Rollover**:
   - The query boundary is strictly scoped to `academic_year_id == ay.id`.
   - When the school rolls over into 2083 BS, all annual fee limits reset for the new academic year.
3. **Mid-Year Student Enrollment**:
   - A student admitted in Ashwin is never billed annual charges during Ashwin's batch tuition run. Their annual and admission fees are charged cleanly on their initial admission bill.

---

## 6. Verification & Testing Strategy

### 6.1 Backend Pytest (`tests/test_fee_frequency_enforcement.py`)
1. `test_batch_billing_baishakh_includes_yearly_fees`: Baishakh batch bills correctly itemize both tuition and annual fees.
2. `test_batch_billing_jestha_rejects_yearly_fee_heads`: Submitting yearly fee IDs in Jestha returns HTTP 400 Bad Request.
3. `test_batch_billing_baishakh_skips_prebilled_yearly_fees`: If a student already received an annual fee, Baishakh batch billing generates their bill without duplicating the annual fee.
4. `test_single_bill_blocks_duplicate_yearly_fee`: Attempting to bill the same yearly fee twice to a student in the same session returns HTTP 409 Conflict.
5. `test_cancelled_bill_allows_yearly_rebilling`: Cancelling an unpaid bill frees the annual fee to be billed again.

### 6.2 Frontend Unit Tests (`src/features/finance/components/__tests__/cashierAndReceipt.test.mjs`)
1. Test `filterApplicableBatchFeeStructures` with Baishakh vs non-Baishakh months.
2. Test fee estimation calculation with frequency-filtered fee heads.
3. Full frontend test suite verification (`node --test src/**/*.test.mjs`).
4. Production bundle compilation verification (`npm run build`).
