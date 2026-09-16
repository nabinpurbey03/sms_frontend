# Platform-Wide Academic Year Rollover & Cohort Promotion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide a SuperAdmin-only platform-wide rollover workflow that closes the active academic year for all tenants, creates/activates the new academic year, promotes continuing students to the next sequential class while preserving their sections, and marks final-class students as graduated.

**Architecture:** A single transactional backend service method `AcademicYearService.platform_wide_rollover` callable exclusively by users passing `require_super_admin`. On the frontend, a SuperAdmin-only action in `AcademicYearsPage` backed by React Query mutations and confirmation dialogs.

**Tech Stack:** FastAPI, SQLAlchemy 2.0, PostgreSQL/SQLite, React 19, Vite, TanStack Query, TailwindCSS, Lucide Icons, Sonner.

**Spec:** Designed and approved during brainstorming on 2026-09-16.

---

## Tasks

### Task 1: Backend Schemas and Models Preparation
**Files:**
- Modify: `E:\PBAC\backend\src\modules\academic\schemas.py`
- Test: `tests/test_platform_rollover.py`

**Interfaces:**
- Produces: `PlatformAcademicYearRolloverRequest(name: str, start_date: date, end_date: date)`
- Produces: `PlatformRolloverSummaryResponse(academic_year_name: str, total_tenants_affected: int, total_students_promoted: int, total_students_graduated: int)`

- [ ] **Step 1: Write test for schemas validation**
Create `E:\PBAC\backend\tests\test_platform_rollover.py`:
```python
import pytest
from datetime import date
from pydantic import ValidationError
from src.modules.academic.schemas import (
    PlatformAcademicYearRolloverRequest,
    PlatformRolloverSummaryResponse,
)

def test_platform_rollover_schemas():
    req = PlatformAcademicYearRolloverRequest(
        name="2081-2082",
        start_date=date(2024, 4, 14),
        end_date=date(2025, 4, 13),
    )
    assert req.name == "2081-2082"
    assert req.start_date < req.end_date

    res = PlatformRolloverSummaryResponse(
        academic_year_name="2081-2082",
        total_tenants_affected=3,
        total_students_promoted=120,
        total_students_graduated=15,
    )
    assert res.total_students_promoted == 120
```

- [ ] **Step 2: Run test to verify it fails**
Run: `.venv\Scripts\python.exe -m pytest tests/test_platform_rollover.py -v`
Expected: FAIL (ImportError / cannot import name)

- [ ] **Step 3: Implement schemas in `src/modules/academic/schemas.py`**
Add:
```python
class PlatformAcademicYearRolloverRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=50, description="Academic year label, e.g. 2081-2082")
    start_date: date
    end_date: date

    @field_validator("end_date")
    @classmethod
    def validate_dates(cls, v: date, info) -> date:
        start_date = info.data.get("start_date")
        if start_date and v < start_date:
            raise ValueError("end_date cannot be earlier than start_date")
        return v


class PlatformRolloverSummaryResponse(BaseModel):
    academic_year_name: str
    total_tenants_affected: int
    total_students_promoted: int
    total_students_graduated: int
```

- [ ] **Step 4: Run test to verify it passes**
Run: `.venv\Scripts\python.exe -m pytest tests/test_platform_rollover.py -v`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/modules/academic/schemas.py tests/test_platform_rollover.py
git commit -m "feat(academic): add platform rollover request and response schemas"
```

---

### Task 2: Service Layer Platform Rollover & Promotion Logic
**Files:**
- Modify: `E:\PBAC\backend\src\modules\academic\service.py`
- Test: `E:\PBAC\backend\tests\test_platform_rollover.py`

**Interfaces:**
- Consumes: `PlatformAcademicYearRolloverRequest`, `Tenant`, `AcademicYear`, `Class`, `Section`, `Student`, `StudentEnrollment`
- Produces: `AcademicYearService.platform_wide_rollover(db, payload, user_id, ip_address, user_agent) -> PlatformRolloverSummaryResponse`

- [ ] **Step 1: Write unit/integration test for platform rollover**
Append to `tests/test_platform_rollover.py`:
```python
def test_platform_wide_rollover_logic(db_session, test_tenant, test_admin_user):
    # Setup 2 sequential classes with 1 section each and students
    pass
```
(Include tests verifying: (1) old year is closed, (2) new year is created and marked current, (3) Class 1 students are promoted to Class 2 with matching section, (4) top class students are marked graduated, (5) Student denormalized class_id/section_id updated).

- [ ] **Step 2: Run test to verify failure**
Run: `.venv\Scripts\python.exe -m pytest tests/test_platform_rollover.py -v`
Expected: FAIL (`AttributeError: type object 'AcademicYearService' has no attribute 'platform_wide_rollover'`)

- [ ] **Step 3: Implement `platform_wide_rollover` in `AcademicYearService`**
In `E:\PBAC\backend\src\modules\academic\service.py`, add static method:
1. Query all active tenants: `select(Tenant).where(Tenant.is_active.is_(True), Tenant.deleted_at.is_(None))`.
2. For each tenant:
   - Close active years: `update(AcademicYear).where(AcademicYear.tenant_id == t.id, AcademicYear.is_current.is_(True)).values(is_current=False, status=AcademicYearStatus.CLOSED.value)`.
   - Create new `AcademicYear` with `name=payload.name, start_date=payload.start_date, end_date=payload.end_date, is_current=True, status=AcademicYearStatus.ACTIVE.value`.
   - Query all classes ordered by `sequence_order.asc()`.
   - Map each `class[i]` to `class[i+1]`.
   - For all active enrollments in the closing year:
     - If next class exists:
       - Find section with matching name in next class; create it if missing.
       - Set old enrollment `status = EnrollmentStatus.PROMOTED.value`.
       - Create new `StudentEnrollment(student_id=s.id, class_id=next_class.id, section_id=next_section.id, academic_year_id=new_year.id, status=EnrollmentStatus.ACTIVE.value)`.
       - Update `Student.class_id = next_class.id, Student.section_id = next_section.id`.
       - Increment `promoted_count`.
     - Else:
       - Set old enrollment `status = EnrollmentStatus.PROMOTED.value`.
       - Set `Student.status = StudentStatus.GRADUATED.value`.
       - Increment `graduated_count`.
   - Record audit entry for tenant.

- [ ] **Step 4: Run test to verify pass**
Run: `.venv\Scripts\python.exe -m pytest tests/test_platform_rollover.py -v`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/modules/academic/service.py tests/test_platform_rollover.py
git commit -m "feat(academic): implement platform-wide academic year rollover and cohort promotion"
```

---

### Task 3: SuperAdmin API Endpoint Registration
**Files:**
- Modify: `E:\PBAC\backend\src\modules\academic\routers\academic_years.py`
- Test: `E:\PBAC\backend\tests\test_platform_rollover.py`

**Interfaces:**
- Endpoint: `POST /academic/platform/academic-years/rollover`
- Dependencies: `[Depends(require_super_admin)]`
- Request body: `PlatformAcademicYearRolloverRequest`
- Response: `ApiResponse[PlatformRolloverSummaryResponse]`

- [ ] **Step 1: Add API endpoint test**
Append to `tests/test_platform_rollover.py`:
- Test that standard tenant admins get 403 Forbidden.
- Test that SuperAdmin gets 200 OK and receives the summary.

- [ ] **Step 2: Run test to verify failure**
Run: `.venv\Scripts\python.exe -m pytest tests/test_platform_rollover.py -k test_api -v`
Expected: FAIL (404 Not Found)

- [ ] **Step 3: Implement endpoint in `academic_years.py`**
```python
@router.post(
    "/platform/academic-years/rollover",
    status_code=status.HTTP_200_OK,
    response_model=ApiResponse[PlatformRolloverSummaryResponse],
    summary="Platform-wide Academic Year Rollover & Cohort Promotion (Super Admin only)",
    dependencies=[Depends(require_super_admin)],
)
def platform_academic_year_rollover(
    request: Request,
    body: PlatformAcademicYearRolloverRequest,
    current_user = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    ip, user_agent = _extract_client_info(request)
    result = AcademicYearService.platform_wide_rollover(
        db=db,
        obj_in=body,
        user_id=current_user.id,
        ip_address=ip,
        user_agent=user_agent,
    )
    return ApiResponse(
        status=True,
        message=f"Platform rollover to '{body.name}' completed successfully",
        data=result,
    )
```

- [ ] **Step 4: Run test to verify pass**
Run: `.venv\Scripts\python.exe -m pytest tests/test_platform_rollover.py -v`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/modules/academic/routers/academic_years.py tests/test_platform_rollover.py
git commit -m "feat(academic): add superadmin platform rollover endpoint"
```

---

### Task 4: Frontend API & React Query Hooks
**Files:**
- Modify: `E:\PBAC\frontend\src\features\academic-year\types.ts`
- Modify: `E:\PBAC\frontend\src\features\academic-year\api.ts`
- Modify: `E:\PBAC\frontend\src\features\academic-year\hooks.ts`

**Interfaces:**
- Produces: `PlatformRolloverDTO`, `PlatformRolloverSummaryDTO`
- Produces: `academicYearApi.platformRollover(data)`
- Produces: `usePlatformRollover()`

- [ ] **Step 1: Add types in `types.ts`**
```typescript
export interface PlatformRolloverDTO {
  name: string;
  start_date: string;
  end_date: string;
}

export interface PlatformRolloverSummaryDTO {
  academic_year_name: string;
  total_tenants_affected: number;
  total_students_promoted: number;
  total_students_graduated: number;
}
```

- [ ] **Step 2: Add API call in `api.ts`**
```typescript
platformRollover: async (data: PlatformRolloverDTO): Promise<PlatformRolloverSummaryDTO> => {
  return apiClient.post('/academic/platform/academic-years/rollover', data);
},
```

- [ ] **Step 3: Add mutation hook in `hooks.ts`**
`usePlatformRollover()` invalidating queries and showing toast notifications.

- [ ] **Step 4: Build & verify TypeScript**
Run: `npm run build` in `E:\PBAC\frontend`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/features/academic-year/types.ts src/features/academic-year/api.ts src/features/academic-year/hooks.ts
git commit -m "feat(academic-year): add frontend API and hooks for platform rollover"
```

---

### Task 5: Frontend SuperAdmin Rollover Dialog & UI Integration
**Files:**
- Create: `E:\PBAC\frontend\src\features\academic-year\components\PlatformRolloverDialog.tsx`
- Modify: `E:\PBAC\frontend\src\features\academic-year\pages\AcademicYearsPage.tsx`

**Interfaces:**
- Produces: `PlatformRolloverDialog` component with safety confirmation and summary dialog on completion.
- Consumes: `isSuperAdmin` from `usePermission()`.

- [ ] **Step 1: Create `PlatformRolloverDialog.tsx`**
Form with Name, Start Date, End Date, explicit red warning regarding irreversible multi-tenant cohort promotion, and a secondary result dialog showing counts of promoted students, graduated students, and schools updated.

- [ ] **Step 2: Integrate into `AcademicYearsPage.tsx`**
If `isSuperAdmin` is true, render a highlighted "Platform Rollover" action button in the header and bind state to open `PlatformRolloverDialog`.

- [ ] **Step 3: Run frontend typecheck and build**
Run: `npm run build` in `E:\PBAC\frontend`
Expected: PASS

- [ ] **Step 4: Commit**
```bash
git add src/features/academic-year/components/PlatformRolloverDialog.tsx src/features/academic-year/pages/AcademicYearsPage.tsx
git commit -m "feat(academic-year): add superadmin platform rollover UI and dialog"
```

---

### Task 6: End-to-End Verification
**Files:**
- Test: Backend pytest suite
- Test: Frontend build & lint

- [ ] **Step 1: Run full backend test suite**
Run: `.venv\Scripts\python.exe -m pytest tests/test_platform_rollover.py tests/test_batch_teacher_assignment.py -v`
Expected: PASS

- [ ] **Step 2: Run frontend build and lint**
Run: `npm run build && npm run lint` in `E:\PBAC\frontend`
Expected: PASS
