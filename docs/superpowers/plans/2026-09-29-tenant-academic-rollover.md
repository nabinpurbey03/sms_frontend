# Tenant-Level Academic Rollover (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Empower individual school leadership (School Principals/Admins and Office Admins) to independently rollover their own school's academic year, promote enrolled student cohorts, graduate terminal grade students, and optionally carry forward teacher assignments into the new session.

**Architecture:**
1. **Backend**: Provide a tenant-scoped endpoint `POST /api/v1/academic/tenants/{tenant_id}/academic-years/rollover` guarded by `ADMIN` and `OFFICE_ADMIN`. The service method (`AcademicYearService.tenant_rollover`) closes the active session, creates/activates the new session, sequentially advances students based on `Class.sequence_order`, graduates the terminal grade, and optionally copies `TeacherAssignment` rows to the new session so staff duties are not wiped out.
2. **Frontend**: Add `TenantRolloverDialog` in `features/academic-year/components/` with dual-calendar (BS/AD) date pickers and an option to preserve teacher assignments, wired into `AcademicYearsPage.tsx` for authorized school administrators.

**Tech Stack:** FastAPI, SQLAlchemy 2.0, Pydantic v2, pytest, React 19, TypeScript, TanStack Query, Tailwind CSS, shadcn/ui.

**Spec:** Phase 1 of Academic Lifecycle Improvements: Tenant-Level Academic Rollover.

## Global Constraints
- Backend: Python 3.12, SQLAlchemy 2.0 ORM, strict tenant isolation (`tenant_id == tenant_id`), `AuditLog` recording.
- RBAC: Accessible to `ADMIN`, `OFFICE_ADMIN`, and `SUPER_ADMIN`; forbidden to `TEACHER` and `PARENT` (HTTP 403).
- Frontend: React 19, TypeScript strict mode (`npx tsc -b`), Vite build.
- Preserve backward compatibility with existing platform-wide rollover (`/platform/academic-years/rollover`).

---

### Task 1: Backend - Schemas, Service & Endpoint for Tenant-Level Academic Rollover

**Files:**
- Create: `E:\SSUP\backend\tests\test_tenant_academic_rollover.py`
- Modify: `E:\SSUP\backend\src\modules\academic\schemas.py`
- Modify: `E:\SSUP\backend\src\modules\academic\service.py`
- Modify: `E:\SSUP\backend\src\modules\academic\routers\academic_years.py`

**Interfaces:**
- Consumes: `TenantAcademicYearRolloverRequest(name: str, start_date: date, end_date: date, copy_teacher_assignments: bool = True)`
- Produces: `TenantRolloverSummaryResponse(tenant_id: str, academic_year_id: str, academic_year_name: str, total_students_promoted: int, total_students_graduated: int, teacher_assignments_copied: int)`

- [ ] **Step 1: Write the failing test in `tests/test_tenant_academic_rollover.py`**

Create `E:\SSUP\backend\tests\test_tenant_academic_rollover.py`:
```python
import os
import sys
import uuid
import random
from datetime import date

sys.path.insert(0, os.path.realpath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from src.main import create_app
from src.core.database import SessionLocal
from src.modules.identity.models import User
from src.core.security import hash_password

app = create_app()
client = TestClient(app)


def test_tenant_academic_rollover_lifecycle(default_academic_year):
    db = SessionLocal()
    suffix = uuid.uuid4().hex[:6]

    # 1. Setup Super Admin & Tenant
    sa_email = f"sa_{suffix}@platform.com"
    super_admin = User(
        email=sa_email,
        password=hash_password("SuperSecret123!"),
        first_name="Super",
        last_name="Admin",
        phone=f"98{random.randint(10000000, 99999999)}",
        is_super_admin=True,
    )
    db.add(super_admin)
    db.commit()

    sa_token = client.post("/api/v1/auth/login", json={"email": sa_email, "password": "SuperSecret123!"}).json()["access_token"]
    sa_headers = {"Authorization": f"Bearer {sa_token}"}

    school_domain = f"school-rollover-{suffix}"
    resp = client.post(
        "/api/v1/tenants/",
        headers=sa_headers,
        json={"name": f"School {suffix}", "domain_name": school_domain, "email": f"info@{school_domain}.com", "phone": "9812345678"},
    )
    assert resp.status_code == 201
    tenant_id = resp.json()["data"]["id"]
    default_academic_year(db, tenant_id)

    # 2. Setup Principal (ADMIN)
    admin_phone = f"98{random.randint(10000000, 99999999)}"
    client.post("/api/v1/auth/register", json={"email": f"admin_{suffix}@school.com", "password": "AdminPass1!", "first_name": "Principal", "last_name": "Skinner", "phone": admin_phone})
    client.post(f"/api/v1/tenants/{tenant_id}/members/admin/assign", headers=sa_headers, json={"phone": admin_phone})
    admin_token = client.post("/api/v1/auth/login", json={"email": f"admin_{suffix}@school.com", "password": "AdminPass1!"}).json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}", "X-Tenant-ID": tenant_id}

    # Setup Teacher
    t_phone = f"98{random.randint(10000000, 99999999)}"
    t_id = client.post("/api/v1/auth/register", json={"email": f"t_{suffix}@school.com", "password": "TeacherPass1!", "first_name": "Teach", "last_name": "One", "phone": t_phone}).json()["data"]["id"]
    client.post(f"/api/v1/tenants/{tenant_id}/members/teacher", headers=admin_headers, json={"phone": t_phone})
    t_token = client.post("/api/v1/auth/login", json={"email": f"t_{suffix}@school.com", "password": "TeacherPass1!"}).json()["access_token"]
    t_headers = {"Authorization": f"Bearer {t_token}", "X-Tenant-ID": tenant_id}

    # 3. Create Grade 9 (seq=1) and Grade 10 (seq=2)
    resp = client.post(f"/api/v1/academic/tenants/{tenant_id}/classes", headers=admin_headers, json={"name": "Grade 9"})
    c9_id = resp.json()["data"]["id"]
    resp = client.post(f"/api/v1/academic/tenants/{tenant_id}/classes", headers=admin_headers, json={"name": "Grade 10"})
    c10_id = resp.json()["data"]["id"]

    # Reorder sequence explicitly
    client.put(f"/api/v1/academic/tenants/{tenant_id}/classes/reorder", headers=admin_headers, json={"class_orders": [{"class_id": c9_id, "sequence_order": 1}, {"class_id": c10_id, "sequence_order": 2}]})

    # Add Students: S1 to Grade 9, S2 to Grade 10
    resp = client.post(f"/api/v1/academic/tenants/{tenant_id}/classes/{c9_id}/students", headers=admin_headers, json={"first_name": "Alice", "last_name": "Nine"})
    s1_id = resp.json()["data"]["id"]
    resp = client.post(f"/api/v1/academic/tenants/{tenant_id}/classes/{c10_id}/students", headers=admin_headers, json={"first_name": "Bob", "last_name": "Ten"})
    s2_id = resp.json()["data"]["id"]

    # Assign Teacher as Class Teacher to Grade 9
    client.post(f"/api/v1/academic/tenants/{tenant_id}/classes/{c9_id}/teachers/batch", headers=admin_headers, json={"teacher_ids": [t_id]})

    # 4. RBAC Check: Teacher cannot execute rollover
    resp = client.post(
        f"/api/v1/academic/tenants/{tenant_id}/academic-years/rollover",
        headers=t_headers,
        json={"name": "Academic Session 2083/2084", "start_date": "2026-04-14", "end_date": "2027-04-13", "copy_teacher_assignments": True},
    )
    assert resp.status_code == 403, f"Expected 403 for teacher, got {resp.status_code}"

    # 5. Admin executes Tenant Rollover
    resp = client.post(
        f"/api/v1/academic/tenants/{tenant_id}/academic-years/rollover",
        headers=admin_headers,
        json={"name": "Academic Session 2083/2084", "start_date": "2026-04-14", "end_date": "2027-04-13", "copy_teacher_assignments": True},
    )
    assert resp.status_code == 200, f"Rollover failed: {resp.text}"
    data = resp.json()["data"]
    assert data["academic_year_name"] == "Academic Session 2083/2084"
    assert data["total_students_promoted"] == 1  # Alice promoted to Grade 10
    assert data["total_students_graduated"] == 1  # Bob graduated from Grade 10
    assert data["teacher_assignments_copied"] >= 1  # Teacher assignment preserved

    # 6. Verify student status and new class
    resp_s1 = client.get(f"/api/v1/academic/tenants/{tenant_id}/students/{s1_id}", headers=admin_headers)
    assert resp_s1.json()["data"]["class_id"] == c10_id
    assert resp_s1.json()["data"]["status"] == "ACTIVE"

    resp_s2 = client.get(f"/api/v1/academic/tenants/{tenant_id}/students/{s2_id}", headers=admin_headers)
    assert resp_s2.json()["data"]["status"] == "GRADUATED"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `E:\SSUP\backend\.venv\Scripts\pytest.exe tests/test_tenant_academic_rollover.py`
Expected: FAIL with 404 or 405 (endpoint not yet defined).

- [ ] **Step 3: Define schemas in `src/modules/academic/schemas.py`**

In `E:\SSUP\backend\src\modules\academic\schemas.py`:
```python
class TenantAcademicYearRolloverRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=50, description="Academic year label, e.g. 2083/2084")
    start_date: date
    end_date: date
    copy_teacher_assignments: bool = Field(True, description="Whether to copy teacher duties into the new session")

    @field_validator("end_date")
    @classmethod
    def validate_dates(cls, v: date, info) -> date:
        start_date = info.data.get("start_date")
        if start_date and v < start_date:
            raise ValueError("end_date cannot be earlier than start_date")
        return v


class TenantRolloverSummaryResponse(BaseModel):
    tenant_id: str
    academic_year_id: str
    academic_year_name: str
    total_students_promoted: int
    total_students_graduated: int
    teacher_assignments_copied: int
```

- [ ] **Step 4: Implement `tenant_rollover` in `AcademicYearService`**

In `E:\SSUP\backend\src\modules\academic\service.py`:
```python
    @staticmethod
    def tenant_rollover(
        db: Session,
        tenant_id: str,
        obj_in: TenantAcademicYearRolloverRequest,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> TenantRolloverSummaryResponse:
        """
        Executes an academic year rollover for a single tenant school:
        - Closes the active session
        - Creates and activates the new session
        - Sequentially promotes students based on Class.sequence_order
        - Graduates terminal grade students
        - Optionally copies TeacherAssignment duties to the new session
        """
        old_year = db.scalar(
            select(AcademicYear).where(
                AcademicYear.tenant_id == tenant_id,
                AcademicYear.is_current == True,
                AcademicYear.deleted_at == None,
            )
        )
        if not old_year:
            raise BadRequestException(message="No active academic year found for this school to rollover from.")

        # Close old year
        old_year.is_current = False
        old_year.status = AcademicYearStatus.CLOSED.value

        # Create or activate new year
        existing_year = db.scalar(
            select(AcademicYear).where(
                AcademicYear.tenant_id == tenant_id,
                AcademicYear.name == obj_in.name,
                AcademicYear.deleted_at == None,
            )
        )
        if existing_year:
            new_year = existing_year
            new_year.start_date = obj_in.start_date
            new_year.end_date = obj_in.end_date
            new_year.status = AcademicYearStatus.ACTIVE.value
            new_year.is_current = True
        else:
            new_year = AcademicYear(
                tenant_id=tenant_id,
                name=obj_in.name,
                start_date=obj_in.start_date,
                end_date=obj_in.end_date,
                status=AcademicYearStatus.ACTIVE.value,
                is_current=True,
            )
            db.add(new_year)
        db.flush()

        # Query classes ordered by sequence_order
        classes = list(
            db.scalars(
                select(Class)
                .where(Class.tenant_id == tenant_id, Class.deleted_at == None)
                .order_by(Class.sequence_order.asc())
            ).all()
        )
        seq_map = {c.sequence_order: c for c in classes}
        next_class_map = {
            c.id: seq_map[c.sequence_order + 1]
            for c in classes
            if (c.sequence_order + 1) in seq_map
        }

        total_promoted = 0
        total_graduated = 0

        old_enrollments = list(
            db.scalars(
                select(StudentEnrollment).where(
                    StudentEnrollment.tenant_id == tenant_id,
                    StudentEnrollment.academic_year_id == old_year.id,
                    StudentEnrollment.status == EnrollmentStatus.ACTIVE.value,
                    StudentEnrollment.deleted_at == None,
                )
            ).all()
        )

        for enr in old_enrollments:
            student = db.scalar(
                select(Student).where(Student.id == enr.student_id, Student.deleted_at == None)
            )
            if not student:
                continue

            current_class = next((c for c in classes if c.id == enr.class_id), None)
            next_class = next_class_map.get(current_class.id) if current_class else None

            if next_class:
                old_section = (
                    db.scalar(select(Section).where(Section.id == enr.section_id))
                    if enr.section_id
                    else None
                )
                target_sec_name = old_section.name if old_section else "A"
                next_section = db.scalar(
                    select(Section).where(
                        Section.class_id == next_class.id,
                        Section.name == target_sec_name,
                        Section.deleted_at == None,
                    )
                )
                if not next_section:
                    next_section = Section(
                        tenant_id=tenant_id,
                        class_id=next_class.id,
                        name=target_sec_name,
                    )
                    db.add(next_section)
                    db.flush()

                enr.status = EnrollmentStatus.PROMOTED.value
                new_enr = StudentEnrollment(
                    tenant_id=tenant_id,
                    student_id=student.id,
                    class_id=next_class.id,
                    section_id=next_section.id,
                    academic_year_id=new_year.id,
                    status=EnrollmentStatus.ACTIVE.value,
                    enrolled_on=obj_in.start_date,
                )
                db.add(new_enr)
                student.class_id = next_class.id
                student.section_id = next_section.id
                total_promoted += 1
            else:
                enr.status = EnrollmentStatus.PROMOTED.value
                student.status = StudentStatus.GRADUATED.value
                total_graduated += 1

        # Optionally copy teacher assignments
        assignments_copied = 0
        if obj_in.copy_teacher_assignments:
            from src.modules.academic.models import TeacherAssignment
            old_assignments = list(
                db.scalars(
                    select(TeacherAssignment).where(
                        TeacherAssignment.tenant_id == tenant_id,
                        TeacherAssignment.academic_year_id == old_year.id,
                        TeacherAssignment.deleted_at == None,
                    )
                ).all()
            )
            for ta in old_assignments:
                new_ta = TeacherAssignment(
                    tenant_id=tenant_id,
                    teacher_id=ta.teacher_id,
                    class_id=ta.class_id,
                    section_id=ta.section_id,
                    subject_id=ta.subject_id,
                    academic_year_id=new_year.id,
                    is_class_teacher=ta.is_class_teacher,
                )
                db.add(new_ta)
                assignments_copied += 1

        db.flush()
        record_audit(
            db=db,
            action=AuditAction.ACADEMIC_YEAR_ACTIVATED,
            status=AuditStatus.SUCCESS,
            user_id=user_id,
            tenant_id=tenant_id,
            resource_id=new_year.id,
            resource_type="academic_year",
            ip_address=ip_address,
            user_agent=user_agent,
            details=f"Tenant rollover to {new_year.name}: promoted={total_promoted}, graduated={total_graduated}, duties_copied={assignments_copied}",
        )

        return TenantRolloverSummaryResponse(
            tenant_id=tenant_id,
            academic_year_id=new_year.id,
            academic_year_name=new_year.name,
            total_students_promoted=total_promoted,
            total_students_graduated=total_graduated,
            teacher_assignments_copied=assignments_copied,
        )
```

- [ ] **Step 5: Register endpoint in `src/modules/academic/routers/academic_years.py`**

```python
@router.post(
    "/academic-years/rollover",
    status_code=status.HTTP_200_OK,
    response_model=ApiResponse[TenantRolloverSummaryResponse],
    summary="Tenant-scoped Academic Year Rollover & Cohort Promotion (Admin & Office Admin)",
    dependencies=[Depends(require_roles(UserRole.ADMIN, UserRole.OFFICE_ADMIN))],
)
def tenant_academic_year_rollover(
    request: Request,
    tenant_id: str,
    body: TenantAcademicYearRolloverRequest,
    member: TenantMembershipContext = Depends(get_current_tenant_member),
    db: Session = Depends(get_db),
):
    ip, user_agent = _extract_client_info(request)
    result = AcademicYearService.tenant_rollover(
        db=db,
        tenant_id=tenant_id,
        obj_in=body,
        user_id=member.user.id,
        ip_address=ip,
        user_agent=user_agent,
    )
    return ApiResponse(
        status=True,
        message=f"Academic year rollover to '{body.name}' completed successfully",
        data=result,
    )
```

- [ ] **Step 6: Run backend test to verify it passes**

Run: `E:\SSUP\backend\.venv\Scripts\pytest.exe tests/test_tenant_academic_rollover.py`
Expected: PASS (all assertions pass).

- [ ] **Step 7: Commit backend changes**

```bash
git add tests/test_tenant_academic_rollover.py src/modules/academic/schemas.py src/modules/academic/service.py src/modules/academic/routers/academic_years.py
git commit -m "feat(academic): implement tenant-level academic year rollover endpoint and service"
```

---

### Task 2: Frontend - API Client, Hook, Dialog & Page Integration

**Files:**
- Modify: `E:\SSUP\frontend\src\features\academic-year\schema.ts`
- Modify: `E:\SSUP\frontend\src\features\academic-year\api.ts`
- Modify: `E:\SSUP\frontend\src\features\academic-year\hooks.ts`
- Create: `E:\SSUP\frontend\src\features\academic-year\components\TenantRolloverDialog.tsx`
- Modify: `E:\SSUP\frontend\src\features\academic-year\pages\AcademicYearsPage.tsx`

**Interfaces:**
- Consumes: `POST /api/v1/academic/tenants/{tenantId}/academic-years/rollover`
- Produces: UI action in `AcademicYearsPage` with accessible `TenantRolloverDialog` for school leadership.

- [ ] **Step 1: Add types and API method in frontend**

In `E:\SSUP\frontend\src\features\academic-year\schema.ts`:
```typescript
export interface TenantAcademicYearRolloverRequest {
  name: string;
  start_date: string;
  end_date: string;
  copy_teacher_assignments: boolean;
}

export interface TenantRolloverSummaryResponse {
  tenant_id: string;
  academic_year_id: string;
  academic_year_name: string;
  total_students_promoted: int;
  total_students_graduated: int;
  teacher_assignments_copied: int;
}
```

In `E:\SSUP\frontend\src\features\academic-year\api.ts`:
```typescript
tenantRollover: async (
  tenantId: string,
  data: TenantAcademicYearRolloverRequest
): Promise<ApiResponse<TenantRolloverSummaryResponse>> => {
  return apiClient.post(`/academic/tenants/${tenantId}/academic-years/rollover`, data);
},
```

In `E:\SSUP\frontend\src\features\academic-year\hooks.ts`:
```typescript
export const useTenantRollover = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantId, data }: { tenantId: string; data: TenantAcademicYearRolloverRequest }) =>
      academicYearsApi.tenantRollover(tenantId, data),
    onSuccess: (res, variables) => {
      toast.success(
        `Academic session rollover to '${res.data.academic_year_name}' successful! Promoted: ${res.data.total_students_promoted}, Graduated: ${res.data.total_students_graduated}`
      );
      queryClient.invalidateQueries({ queryKey: [ACADEMIC_YEARS_QUERY_KEY, variables.tenantId] });
      queryClient.invalidateQueries({ queryKey: ['classes', variables.tenantId] });
      queryClient.invalidateQueries({ queryKey: ['students', variables.tenantId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', variables.tenantId] });
      queryClient.invalidateQueries({ queryKey: ['assignments', variables.tenantId] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.response?.data?.detail || err?.message || 'Failed to execute academic rollover';
      toast.error('Rollover Failed', { description: msg });
    },
  });
};
```

- [ ] **Step 2: Create `TenantRolloverDialog.tsx`**

Create `E:\SSUP\frontend\src\features\academic-year\components\TenantRolloverDialog.tsx`:
Interactive modal containing:
- Name input (e.g. "Academic Session 2083/2084")
- Dual date picker (`NepaliDatePicker` for start date and end date)
- Checkbox: "Preserve Teacher Class & Subject Assignments" (checked by default)
- Warning card detailing cohort promotion and graduation of the final grade
- Submit button triggering `useTenantRollover` with loading state

- [ ] **Step 3: Integrate into `AcademicYearsPage.tsx`**

In `E:\SSUP\frontend\src\features\academic-year\pages\AcademicYearsPage.tsx`:
- Import `TenantRolloverDialog`
- Add state `const [isTenantRolloverOpen, setIsTenantRolloverOpen] = useState(false)`
- Add "Rollover Session" button for authorized users (`canManage`) when an active school is selected:
  ```tsx
  {canManage && effectiveTenantId && (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setIsTenantRolloverOpen(true)}
      className="text-amber-700 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/10"
    >
      <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
      Rollover Session
    </Button>
  )}
  ```
- Mount `<TenantRolloverDialog open={isTenantRolloverOpen} onOpenChange={setIsTenantRolloverOpen} tenantId={effectiveTenantId} tenantName={effectiveTenant?.name} />`

- [ ] **Step 4: Verify TypeScript compilation & frontend build**

Run:
`npx tsc -b`
`npm run build`
Expected: Both pass with 0 errors.

- [ ] **Step 5: Commit frontend changes**

```bash
git add src/features/academic-year/schema.ts src/features/academic-year/api.ts src/features/academic-year/hooks.ts src/features/academic-year/components/TenantRolloverDialog.tsx src/features/academic-year/pages/AcademicYearsPage.tsx
git commit -m "feat(academic): add tenant-level rollover modal and workflow for school leadership"
```

---

### Task 3: Full End-to-End Verification

**Files:**
- N/A (Cross-repo verification)

- [ ] **Step 1: Run backend test suites**

Run:
```bash
E:\SSUP\backend\.venv\Scripts\pytest.exe tests/test_tenant_academic_rollover.py tests/test_platform_rollover.py
```
Expected: PASS (all tests pass).

- [ ] **Step 2: Run frontend build**

Run:
```bash
npx tsc -b
npm run build
```
Expected: Clean build with code 0.
