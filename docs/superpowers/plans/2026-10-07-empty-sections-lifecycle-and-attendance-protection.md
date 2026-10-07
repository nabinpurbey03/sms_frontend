# Empty Sections Lifecycle Management & Attendance Analytics Protection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Proactively prompt school administrators to fill or delete empty sections (0 active enrolled students) following academic rollover and daily operations, protecting attendance analytics from false "unmarked" distortion and preventing deadlock with the backend 20-student section creation eligibility rule.

**Architecture:** 
1. Backend adds discovery (`GET /classes/empty-sections`) and safe LIFO soft-deletion (`POST /classes/sections/cleanup-empty`) with section 'A' protection and non-active student filter refinement. Rollover response includes empty section audit info.
2. Backend attendance service ensures dashboard summaries evaluate only sections with active students.
3. Frontend attendance dashboard excludes 0-student sections from pending unmarked counts and tags them with an amber setup badge.
4. Frontend classes page displays an empty sections alert banner with an interactive cleanup modal (`EmptySectionsCleanupModal`).
5. Frontend tenant rollover dialog introduces an "Empty Sections Audit" card upon rollover completion.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2.0, PostgreSQL, React 19, Vite, TypeScript, Tailwind CSS, TanStack Query, Vitest/Node Test runner.

**Spec:** [docs/superpowers/specs/2026-10-07-empty-sections-and-attendance-analytics-design.md](file:///E:/SSUP/frontend/docs/superpowers/specs/2026-10-07-empty-sections-and-attendance-analytics-design.md)

## Global Constraints
- Preserve Section 'A': Section 'A' is the foundational section of each class and can never be deleted; admins must be directed to enroll/assign students.
- LIFO Reverse Deletion Order: When deleting multiple sections (e.g., B and C), higher sections (C) must be deleted before lower sections (B) to satisfy database and academic constraints.
- Soft Deletes Only: Empty section deletion must set `deleted_at = now()`, keeping all historical foreign keys, past attendance records, and past student enrollments intact.
- Active Students Only: Graduated, transferred, or deleted historical students must not block deletion of empty sections in the current academic year.
- Preserve 20-Student Rule: Do NOT bypass `AcademicService.check_next_section_eligibility`; deleting empty sections directly restores compliance with this rule.

---

### Task 1: Backend Schemas, Service Methods & Section Endpoints

**Files:**
- Modify: `E:\SSUP\backend\src\modules\academic\schemas.py`
- Modify: `E:\SSUP\backend\src\modules\academic\service.py`
- Modify: `E:\SSUP\backend\src\modules\academic\routers\sections.py`
- Test: `E:\SSUP\backend\tests\test_academic_empty_sections.py`

**Interfaces:**
- Produces:
  - `GET /academic/tenants/{tenant_id}/classes/empty-sections` -> `ApiResponse[List[EmptySectionResponse]]`
  - `POST /academic/tenants/{tenant_id}/classes/sections/cleanup-empty` -> `ApiResponse[EmptySectionCleanupResult]`
  - `TenantRolloverSummaryResponse.empty_sections_count: int` & `empty_sections: List[EmptySectionSummaryItem]`
  - `AcademicService.get_empty_sections(...) -> List[EmptySectionResponse]`
  - `AcademicService.cleanup_empty_sections(...) -> EmptySectionCleanupResult`

- [ ] **Step 1: Write failing tests in `tests/test_academic_empty_sections.py`**
  - Test `get_empty_sections` identifying sections with 0 active enrollments in the current academic year.
  - Test `cleanup_empty_sections` executing LIFO reverse deletion (deleting C before B).
  - Test that Section 'A' is protected and returned with `can_delete=False`.
  - Test that `check_next_section_eligibility` succeeds after empty Section B is deleted when Section A has $\ge 20$ students.

- [ ] **Step 2: Run pytest to verify failures**
  ```bash
  .venv\Scripts\pytest tests/test_academic_empty_sections.py -v
  ```

- [ ] **Step 3: Define Pydantic schemas in `src/modules/academic/schemas.py`**
  - `EmptySectionResponse`: `section_id: str`, `section_name: str`, `class_id: str`, `class_name: str`, `student_count: int = 0`, `can_delete: bool`, `reason_if_cannot_delete: Optional[str] = None`.
  - `EmptySectionCleanupRequest`: `section_ids: Optional[List[str]] = None`.
  - `EmptySectionSummaryItem`: `section_id: str`, `section_name: str`, `class_name: str`.
  - `EmptySectionCleanupResult`: `deleted_count: int`, `deleted_sections: List[EmptySectionSummaryItem]`, `skipped_sections: List[dict]`.
  - Update `TenantRolloverSummaryResponse`: add `empty_sections_count: int = 0` and `empty_sections: List[EmptySectionSummaryItem] = Field(default_factory=list)`.

- [ ] **Step 4: Refine `_validate_section_deletion` & Implement `get_empty_sections` and `cleanup_empty_sections` in `src/modules/academic/service.py`**
  - Update `_validate_section_deletion`: check `Student.status == StudentStatus.ACTIVE.value` so inactive/graduated student records do not block soft deletion.
  - Implement `get_empty_sections(db, tenant_id, academic_year_id=None)`:
    - Queries active classes and sections where enrollment count in target academic year is 0.
    - Evaluates `can_delete` (False for section 'A' or if higher active sections are not empty).
  - Implement `cleanup_empty_sections(db, tenant_id, section_ids=None, user_id=None, ip_address=None, user_agent=None)`:
    - Sorts target sections by class and index descending (LIFO).
    - Safely soft-deletes eligible sections and logs audit events.
  - In `tenant_rollover`: compute `empty_sections` after student promotion and populate `TenantRolloverSummaryResponse`.

- [ ] **Step 5: Register routes in `src/modules/academic/routers/sections.py`**
  - Add `GET /classes/empty-sections`.
  - Add `POST /classes/sections/cleanup-empty`.

- [ ] **Step 6: Run pytest and ensure all tests pass**
  ```bash
  .venv\Scripts\pytest tests/test_academic_empty_sections.py -v
  ```

- [ ] **Step 7: Commit backend changes**
  ```bash
  git add src/modules/academic/schemas.py src/modules/academic/service.py src/modules/academic/routers/sections.py tests/test_academic_empty_sections.py
  git commit -m "feat(academic): implement empty sections audit and lifo cleanup engine"
  ```

---

### Task 2: Backend Attendance Service 0-Student Section Analytics Protection

**Files:**
- Modify: `E:\SSUP\backend\src\modules\attendance\service.py`
- Test: `E:\SSUP\backend\tests\test_attendance_empty_sections.py`

**Interfaces:**
- Consumes: `AttendanceService.get_dashboard_summary`
- Produces: Daily attendance summary excluding 0-student sections from unmarked counts.

- [ ] **Step 1: Write failing test in `tests/test_attendance_empty_sections.py`**
  - Setup a class with Section A (20 students) and Section B (0 students).
  - Call attendance summary; verify that pending/unmarked sections count is 1 (Section A), not 2.

- [ ] **Step 2: Run pytest to verify failure**
  ```bash
  .venv\Scripts\pytest tests/test_attendance_empty_sections.py -v
  ```

- [ ] **Step 3: Update `src/modules/attendance/service.py`**
  - In `get_dashboard_summary`, ensure section level and school level aggregates only evaluate sections having at least 1 active student.

- [ ] **Step 4: Run pytest and ensure tests pass**
  ```bash
  .venv\Scripts\pytest tests/test_attendance_empty_sections.py tests/test_attendance_lifecycle.py -v
  ```

- [ ] **Step 5: Commit backend attendance changes**
  ```bash
  git add src/modules/attendance/service.py tests/test_attendance_empty_sections.py
  git commit -m "fix(attendance): protect daily dashboard summary from 0-student sections"
  ```

---

### Task 3: Frontend API, Hooks & Attendance Dashboard Hub Filtering

**Files:**
- Modify: `E:\SSUP\frontend\src\features\academic\types.ts`
- Modify: `E:\SSUP\frontend\src\features\academic\api.ts`
- Modify: `E:\SSUP\frontend\src\features\academic\hooks.ts`
- Modify: `E:\SSUP\frontend\src\features\dashboard\components\AttendanceDashboardHub.tsx`
- Test: `E:\SSUP\frontend\src\features\academic\components\__tests__\emptySectionsCleanup.test.mjs`

**Interfaces:**
- Produces:
  - `academicApi.getEmptySections(tenantId, academicYearId)`
  - `academicApi.cleanupEmptySections(tenantId, sectionIds)`
  - `useEmptySections(tenantId, academicYearId)`
  - `useCleanupEmptySections()`
  - `AttendanceDashboardHub.tsx` filtering empty sections from pending count and displaying `Empty (0 Students)` tag.

- [ ] **Step 1: Write unit tests in `src/features/academic/components/__tests__/emptySectionsCleanup.test.mjs`**
  - Test helper logic that filters `sectionsStatusList` for active vs empty sections.
  - Test pending count calculation verifying 0-student sections are not counted as pending.

- [ ] **Step 2: Run test runner to verify test failure/success**
  ```bash
  node --test src/features/academic/components/__tests__/emptySectionsCleanup.test.mjs
  ```

- [ ] **Step 3: Update `src/features/academic/types.ts`, `api.ts`, and `hooks.ts`**
  - Add `EmptySectionResponse`, `EmptySectionCleanupResult`, and `EmptySectionCleanupRequest` types.
  - Add API calls `getEmptySections` and `cleanupEmptySections`.
  - Add React Query hooks `useEmptySections` and `useCleanupEmptySections` with cache invalidation for `['all-classes-details']` and `['empty-sections']`.

- [ ] **Step 4: Update `src/features/dashboard/components/AttendanceDashboardHub.tsx`**
  - Calculate `activeSections = sectionsStatusList.filter(s => s.totalStudents > 0)`.
  - Update `pendingSectionsCount` to count only `activeSections.filter(s => !s.isMarked).length`.
  - Update `metrics.totalSectionsCount` to `activeSections.length`.
  - In section list row: when `sec.totalStudents === 0`, display `<Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700">Empty (0 Students)</Badge>` and disable mark attendance with tooltip.

- [ ] **Step 5: Run tests and frontend build**
  ```bash
  node --test src/features/academic/components/__tests__/emptySectionsCleanup.test.mjs
  npm run build
  ```

- [ ] **Step 6: Commit frontend API and attendance updates**
  ```bash
  git add src/features/academic/types.ts src/features/academic/api.ts src/features/academic/hooks.ts src/features/dashboard/components/AttendanceDashboardHub.tsx src/features/academic/components/__tests__/emptySectionsCleanup.test.mjs
  git commit -m "feat(academic): add empty sections api, hooks, and attendance hub analytics protection"
  ```

---

### Task 4: Frontend Classes Page Alert Banner & Empty Sections Cleanup Modal

**Files:**
- Create: `E:\SSUP\frontend\src\features\academic\components\EmptySectionsCleanupModal.tsx`
- Modify: `E:\SSUP\frontend\src\features\academic\pages\ClassesPage.tsx`
- Test: `E:\SSUP\frontend\src\features\academic\components\__tests__\emptySectionsCleanupModal.test.mjs`

**Interfaces:**
- Produces:
  - `<EmptySectionsCleanupModal isOpen={...} onClose={...} />`
  - Alert banner in `<ClassesPage />` triggering modal when empty sections exist.

- [ ] **Step 1: Write unit tests in `src/features/academic/components/__tests__/emptySectionsCleanupModal.test.mjs`**
  - Verify modal renders list of empty sections grouped by class.
  - Verify section 'A' displays warning badge explaining it cannot be deleted.
  - Verify deletable sections (B, C) have delete button and bulk delete action.

- [ ] **Step 2: Run test runner to verify failure**
  ```bash
  node --test src/features/academic/components/__tests__/emptySectionsCleanupModal.test.mjs
  ```

- [ ] **Step 3: Build `src/features/academic/components/EmptySectionsCleanupModal.tsx`**
  - Displays empty sections grouped by class name.
  - Shows warning notice for Section 'A': *"Section 'A' cannot be deleted. Please assign students to this section."*
  - Provides individual delete buttons for eligible empty sections (B, C, etc.).
  - Provides `[Delete All Deletable Sections]` button with confirmation dialog.
  - Shows clear feedback on successful deletion and invalidates query cache.

- [ ] **Step 4: Integrate banner into `src/features/academic/pages/ClassesPage.tsx`**
  - Query `useEmptySections(pageTenantId)`.
  - When empty sections count > 0, render a clean warning banner above the class cards grid:
    - `"⚠️ Empty Sections Detected: {count} section(s) have 0 enrolled students for this session. Clean up or fill them to maintain attendance analytics and section creation eligibility."`
    - Button: `[Manage Empty Sections]` which toggles `isCleanupModalOpen = true`.
  - Mount `<EmptySectionsCleanupModal />`.

- [ ] **Step 5: Run tests and frontend build**
  ```bash
  node --test src/features/academic/components/__tests__/emptySectionsCleanupModal.test.mjs
  npm run build
  ```

- [ ] **Step 6: Commit frontend modal and classes page changes**
  ```bash
  git add src/features/academic/components/EmptySectionsCleanupModal.tsx src/features/academic/pages/ClassesPage.tsx src/features/academic/components/__tests__/emptySectionsCleanupModal.test.mjs
  git commit -m "feat(academic): add empty sections cleanup modal and alert banner on classes page"
  ```

---

### Task 5: Frontend Tenant Rollover Dialog Empty Sections Audit Step & Final Verification

**Files:**
- Modify: `E:\SSUP\frontend\src\features\academic-year\components\TenantRolloverDialog.tsx`
- Modify: `E:\SSUP\frontend\src\features\academic-year\types.ts`
- Test: Full frontend test suite (`node --test src/**/*.test.mjs`) & full backend test suite (`.venv\Scripts\pytest`)

**Interfaces:**
- Produces:
  - Rollover completion Step 3 displaying "Empty Sections Audit" card when `summary.empty_sections_count > 0`.
  - 1-click cleanup button directly inside the rollover completion view.

- [ ] **Step 1: Update `src/features/academic-year/types.ts`**
  - Add `empty_sections_count?: number` and `empty_sections?: Array<{ section_id: string; section_name: string; class_name: string }>` to `TenantRolloverSummary`.

- [ ] **Step 2: Update `src/features/academic-year/components/TenantRolloverDialog.tsx`**
  - In Step 3 summary view, if `summary.empty_sections_count > 0`:
    - Display an amber card:
      - Title: `⚠️ Empty Sections Detected ({summary.empty_sections_count})`
      - Body: `Some sections have 0 students enrolled for the new session. Empty sections distort daily attendance metrics and block adding new sections (minimum 20 students rule).`
      - Provide list of empty sections.
      - Action: `[Delete Empty Sections Now]` calling `useCleanupEmptySections()` with confirmation, or `[Review in Classes Page]` navigating to `/academic/classes`.

- [ ] **Step 3: Run full verification suite across frontend and backend**
  - Frontend test suite: `node --test src/**/*.test.mjs`
  - Frontend production build: `npm run build`
  - Backend test suite: `.venv\Scripts\pytest tests/test_academic_empty_sections.py tests/test_attendance_empty_sections.py -v`

- [ ] **Step 4: Commit rollover dialog updates**
  ```bash
  git add src/features/academic-year/components/TenantRolloverDialog.tsx src/features/academic-year/types.ts
  git commit -m "feat(academic-year): integrate empty sections audit into tenant rollover summary"
  ```
