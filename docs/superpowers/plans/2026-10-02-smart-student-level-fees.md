# Smart Student-Level Fee Management (Transport, Hostel, Meals & Add-ons) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform student-level fee handling from an isolated transportation checkbox into an extensible, unified **Student Facilities & Services Hub** that seamlessly supports Hostel/Boarding, Transportation, Canteen/Meals, Coaching/Activities, and Concessions, complete with School Facility Presets, 1-Click Bulk Subscriptions, and a Live Fee Simulator Drawer.

**Architecture:**
- **Backend:** Expand `FeeCategory` with `CANTEEN`, `COACHING`, and `SCHOLARSHIP` (with aliases). Introduce a dedicated bulk assignment endpoint `POST /student-fees/bulk`. Support `fee_level = 'STUDENT'` in `FeeStructure` as reusable school-wide facility presets. Update `generate_batch_bills` to itemize all facility subscriptions accurately with clear labels and category tags.
- **Frontend (UI/UX Pro Max):** Implement a **Student Facility Drawer** (`StudentFacilityDrawer.tsx`) with a live financial projection simulator, interactive facility chips in the roster table, a multi-facility filter bar, and a **Bulk Facility Assignment Dialog** (`BulkAssignFacilityDialog.tsx`) for fast batch enrollment.

**Tech Stack:** FastAPI, SQLAlchemy 2.0 (Async/Sync Session), PostgreSQL, Alembic, React 19, TypeScript, TanStack Query, TanStack Router, Tailwind CSS v4, Lucide Icons, Radix UI / shadcn/ui.

---

## 1. Problem Statement & Why Current Approach Needs Upgrade

Currently:
1. **Isolated Transportation Silo:** Transportation is treated in a hardcoded table (`StudentTransportProfile`), while any other student-level facility (Hostel, Meal plans, Coaching) has to be manually typed into an ad-hoc modal without templates.
2. **No Facility Catalog / Presets:** If a school has 3 hostel types ("Boys Hostel - Deluxe", "Girls Hostel - Standard") or 5 bus routes, accountants must re-type the fee name and amount for each student manually.
3. **No Bulk Subscriptions:** Assigning 25 students to a hostel or bus route requires 25 individual modal workflows.
4. **Poor Visibility:** The roster table only shows "Transport Applicable" and hides other opted facilities.

---

## 2. Proposed Smart Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                             SMART STUDENT FEE & FACILITY ARCHITECTURE                            │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘

   [ 1. SCHOOL FACILITY PRESETS (FeeStructure with fee_level = 'STUDENT') ]
   ├── 🚌 Transport Routes: "Route 1 - City Center (NPR 1,500/mo)", "Route 2 - Suburbs (NPR 2,000/mo)"
   ├── 🏢 Hostel / Boarding: "Boys Hostel Deluxe (NPR 5,500/mo)", "Girls Hostel Standard (NPR 4,000/mo)"
   ├── 🍽️ Canteen / Meals: "Full Board Lunch Plan (NPR 1,800/mo)", "Day-Scholar Snack (NPR 800/mo)"
   ├── 🎯 Coaching & Clubs: "Robotics Club (NPR 1,000/mo)", "Music Academy (NPR 1,200/mo)"
   └── 🏷️ Concessions: "Sibling Discount (-20% / NPR 600)", "Merit Scholarship (-NPR 1,000)"

                                       │
                                       ▼ (1-Click or Bulk Subscribed)

   [ 2. UNIFIED STUDENT SUBSCRIPTION LEDGER (StudentFeeAssignment) ]
   ├── student_id: UUID
   ├── fee_structure_id: Optional[UUID] (links to preset if chosen)
   ├── fee_name: e.g. "Boys Hostel (Block B, Room 204)"
   ├── fee_category: HOSTEL | TRANSPORT | CANTEEN | COACHING | SCHOLARSHIP | MISC
   ├── frequency: MONTHLY | TERMWISE | ONE_TIME | YEARLY
   ├── amount: Decimal (e.g. 5500.00)
   ├── notes: Optional room, route, or concession remarks
   └── is_active: True

                                       │
                                       ▼ (Batch Bill Generation Run)

   [ 3. BATCH BILLING ENGINE (Itemized Multi-Tier Invoice) ]
   ├── School Universal Fee: School Management ................. NPR   500.00
   ├── Class Tuition: Grade 8 Monthly Tuition .................. NPR 3,000.00
   ├── Subscribed Facility: Bus Route 2 ........................ NPR 2,000.00
   ├── Subscribed Facility: Boys Hostel (Block B) .............. NPR 5,500.00
   ├── Subscribed Facility: Full Board Lunch Plan .............. NPR 1,800.00
   └── Concession: Sibling Waiver .............................. -NPR  600.00
   ────────────────────────────────────────────────────────────────────────
   TOTAL PAYABLE .............................................. NPR 12,200.00
```

---

## 3. UI/UX Pro Max Design Specifications

Following the **UI/UX Pro Max** guidelines:
- **Design System:** Educational SaaS with soft, rounded cards (`rounded-xl` to `rounded-2xl`), indigo & slate palette, purposeful category color coding:
  - 🚌 **Transport:** Emerald theme (`bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20`)
  - 🏢 **Hostel / Boarding:** Indigo theme (`bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20`)
  - 🍽️ **Canteen / Meals:** Amber theme (`bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20`)
  - 🎯 **Activities / Coaching:** Purple theme (`bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20`)
  - 🏷️ **Scholarship / Concession:** Blue theme (`bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20`)
- **No Emojis as Structural Icons:** Use crisp SVG icons from `lucide-react` (`Bus`, `Building2`, `Utensils`, `Trophy`, `Tag`, `Plus`, `Trash2`, `Sparkles`).
- **Responsive Handling:** Roster table with horizontal scroll and responsive facility wrap.
- **Accessible Touch Targets:** Minimum 44x44px hit areas on mobile and cursor-pointer on interactive chips.
- **Live Simulator Drawer:** Real-time arithmetic recalculation as facilities are toggled or added.

---

## 4. Work Breakdown & Tasks

### Task 1: Backend Enums, Schemas & Bulk DTOs
**Files:**
- Modify: `backend/src/modules/finance/enums.py`
- Modify: `backend/src/modules/finance/schemas.py`

**Steps:**
1. In `FeeCategory` enum: Add `CANTEEN = "CANTEEN"`, `COACHING = "COACHING"`, `SCHOLARSHIP = "SCHOLARSHIP"`. Add aliases (`MEAL`, `MEALS` $\rightarrow$ `CANTEEN`, `TUTORING`, `REMEDIAL` $\rightarrow$ `COACHING`, `CONCESSION`, `DISCOUNT` $\rightarrow$ `SCHOLARSHIP`).
2. In `schemas.py`:
   - Add `BulkStudentFeeAssignmentDTO`:
     ```python
     class BulkStudentFeeAssignmentDTO(BaseModel):
         student_ids: list[str] = Field(..., min_length=1)
         fee_structure_id: Optional[str] = None
         fee_name: str = Field(..., min_length=1, max_length=100)
         fee_category: str
         frequency: str = "MONTHLY"
         amount: Decimal = Field(..., gt=Decimal("0.00"))
         notes: Optional[str] = Field(None, max_length=200)
     ```
   - Add `BulkStudentFeeAssignmentResponseDTO` returning count of created/updated assignments and list of records.

---

### Task 2: Backend Service & Endpoints for Smart Facility Management
**Files:**
- Modify: `backend/src/modules/finance/service.py`
- Modify: `backend/src/modules/finance/router.py`
- Test: `backend/tests/test_smart_student_fees.py`

**Steps:**
1. In `FinanceService`:
   - Add `bulk_assign_student_fees`: Iterates through `student_ids`, validates each student in tenant, creates or activates `StudentFeeAssignment`, commits in one atomic transaction.
   - Update `generate_batch_bills`:
     - Ensures all active `StudentFeeAssignment` records (Hostel, Canteen, Coaching, etc.) for each student are mapped cleanly with their category and description into `FeeBillItem`.
     - Ensures proper aggregation and arithmetic.
2. In `router.py`:
   - Add `POST /finance/tenants/{tenant_id}/student-fees/bulk` (Admin, Accountant permission).
   - Ensure `GET /finance/tenants/{tenant_id}/fee-structures?fee_level=STUDENT` returns facility presets.
3. Write automated unit/integration tests in `backend/tests/test_smart_student_fees.py` verifying:
   - Bulk facility assignment across multiple students.
   - Batch billing with mixed facilities (School fee + Class fee + Transport + Hostel + Canteen).
   - 100% test pass.

---

### Task 3: Frontend Types, API Client & TanStack Query Hooks
**Files:**
- Modify: `frontend/src/features/finance/types.ts`
- Modify: `frontend/src/features/finance/schema.ts`
- Modify: `frontend/src/features/finance/api.ts`
- Modify: `frontend/src/features/finance/hooks.ts`

**Steps:**
1. In `types.ts`:
   - Add `BulkStudentFeeAssignmentDTO`, expand `FeeCategory` type with `'CANTEEN' | 'COACHING' | 'SCHOLARSHIP'`.
2. In `schema.ts`:
   - Add Zod validation schema for bulk assignment and quick facility assignment.
3. In `api.ts`:
   - Add `bulkAssignStudentFees(tenantId, data)`.
4. In `hooks.ts`:
   - Add `useBulkAssignStudentFees(tenantId)` mutation hook that invalidates `STUDENT_FEES_KEY`.

---

### Task 4: Frontend UI - Student Facility Drawer & Live Simulator
**Files:**
- Create: `frontend/src/features/finance/components/StudentFacilityDrawer.tsx`
- Create: `frontend/src/features/finance/components/StudentFacilityBadge.tsx`

**Features of `StudentFacilityDrawer`:**
- **Header:** Student full name, avatar, class, section, roll number badge, and status.
- **Live Fee Simulator Bento Card:**
  - School Baseline: `NPR {schoolTotal}`
  - Class Tuition: `NPR {classTuition}`
  - Facility Add-ons: `+NPR {facilityTotal}`
  - Concessions: `-NPR {concessionsTotal}`
  - **Projected Monthly Bill:** Big, crisp display (`NPR {projectedNet}/month`).
- **Active Subscriptions Section:**
  - Interactive cards showing each active facility (Transport, Hostel, Canteen, etc.).
  - 1-click delete/deactivate with confirmation.
- **"Subscribe New Facility" Form:**
  - Radio/Tab to select:
    - **Use School Preset:** Dropdown of predefined facilities (e.g. "Boys Hostel Deluxe", "AC Bus Route", "Cafeteria Lunch"). Selecting a preset auto-populates category, name, frequency, and standard rate.
    - **Custom Facility:** Freeform entry for special one-off arrangements.
  - Rate override field (allows customized discount or surcharge per student).
  - Notes field (e.g., Room #, Stop name, or reason).
  - Submit button with instant optimistic UI update.

---

### Task 5: Frontend UI - Bulk Facility Assignment & Enhanced Roster Table
**Files:**
- Create: `frontend/src/features/finance/components/BulkAssignFacilityDialog.tsx`
- Modify: `frontend/src/features/finance/components/StudentLevelFeesTab.tsx`
- Modify: `frontend/src/features/finance/pages/ClassFeeStructurePage.tsx`

**Features:**
1. **Interactive Facility Badges in Roster Table:**
   - Instead of just a transport column, each row displays a dynamic collection of facility badges:
     - `[Bus: Route 2 - NPR 1,200]`
     - `[Hostel: Room 102 - NPR 4,500]`
     - `[Meal Plan - NPR 1,500]`
   - Clicking a badge or clicking `[+ Add]` opens the `StudentFacilityDrawer`.
2. **Facility Filter Toolbar:**
   - Filter students by: `All`, `Transport Users`, `Hostel Residents`, `Canteen Subscribers`, `Special Activities`.
3. **Bulk Selection & Action Bar:**
   - Checkbox on table header (Select All) and on each row.
   - When 1 or more students are checked, a floating action bar appears:
     - `"X students selected"`
     - Button: **"Assign Facility in Bulk"** $\rightarrow$ Opens `BulkAssignFacilityDialog`.
   - `BulkAssignFacilityDialog` lets the user select any preset (e.g. "Hostel Block A") or enter custom details and assigns it to all selected students simultaneously.

---

### Task 6: Verification & End-to-End Validation
**Steps:**
1. Run backend tests: `pytest tests/test_smart_student_fees.py` and full suite `pytest -q`.
2. Run frontend type-check & build: `npm run build` in `frontend` (0 errors).
3. Verify backward compatibility: Existing transportation profiles and batch billing remain 100% functional.
4. Prepare walkthrough documentation.
