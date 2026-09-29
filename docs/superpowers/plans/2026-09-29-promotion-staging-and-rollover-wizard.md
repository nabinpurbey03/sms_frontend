# Promotion Staging & Rollover Wizard (Phases 2 & 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement an interactive Promotion & Retention Staging Wizard with backend preview and selective student promotion/retention/transfer overrides, allowing school administrators to review class cohorts, retain failing students, record transfers, graduate final grades, and replicate faculty duties with full confidence.

**Architecture:**
1. **Backend**:
   - Add preview endpoint `POST /api/v1/academic/tenants/{tenant_id}/academic-years/rollover/preview` that performs a dry-run calculation returning class progression breakdowns, student default actions, and projected counts without database mutations.
   - Enhance `POST /api/v1/academic/tenants/{tenant_id}/academic-years/rollover` to accept optional `student_overrides` specifying per-student actions (`PROMOTE`, `RETAIN`, `TRANSFER`, `GRADUATE`).
   - For `RETAIN`: creates new enrollment in the *same class* for the new year with status `ACTIVE`, marks previous enrollment `RETAINED`, and preserves `student.class_id`.
   - For `TRANSFER`: marks previous enrollment `TRANSFERRED`, updates `student.status = TRANSFERRED`, and excludes from new year enrollments.
   - For `GRADUATE`: marks student `GRADUATED` into alumni.
2. **Frontend**:
   - Transform `TenantRolloverDialog.tsx` into a guided 3-step Promotion & Rollover Wizard:
     - **Step 1: Session Timeline**: Session name, dual-calendar BS/AD dates, and faculty assignment preservation switch.
     - **Step 2: Cohort Staging & Review**: Class-by-class tabs with student roster, live target class previews, and individual action toggles (`Promote`, `Retain`, `Transfer Out`, `Graduate`).
     - **Step 3: Verification & Execution**: Review scorecard with breakdown of promotions, retentions, transfers, and graduations, accompanied by execution and post-rollover outcome metrics.

**Tech Stack:** FastAPI, SQLAlchemy 2.0, Pydantic v2, pytest, React 19, TypeScript, TanStack Query, Tailwind CSS, shadcn/ui.

**Spec:** Phases 2 & 3 of Academic Lifecycle Improvements: Promotion Staging & Rollover Wizard.

## Global Constraints
- Backend: Python 3.12, strict tenant isolation (`tenant_id == tenant_id`), SQLAlchemy 2.0 ORM, `AuditLog` logging.
- RBAC: Accessible to `ADMIN`, `OFFICE_ADMIN`, and `SUPER_ADMIN`; forbidden to `TEACHER` and `PARENT` (HTTP 403).
- Frontend: React 19, TypeScript strict mode (`npx tsc -b`), Vite build.
- Maintain backward compatibility: if `student_overrides` is omitted, default to standard sequential cohort promotion.

---

### Task 1: Backend - Preview Endpoint, Selective Student Overrides, and Retention Logic

**Files:**
- Modify: `E:\SSUP\backend\src\modules\academic\schemas.py`
- Modify: `E:\SSUP\backend\src\modules\academic\service.py`
- Modify: `E:\SSUP\backend\src\modules\academic\routers\academic_years.py`
- Test: `E:\SSUP\backend\tests\test_tenant_academic_rollover.py`

**Interfaces:**
- Consumes:
  - `RolloverAction = 'PROMOTE' | 'RETAIN' | 'TRANSFER' | 'GRADUATE'`
  - `StudentRolloverOverride(student_id: str, action: RolloverAction)`
  - `TenantAcademicYearRolloverRequest(name: str, start_date: date, end_date: date, copy_teacher_assignments: bool = True, student_overrides: Optional[List[StudentRolloverOverride]] = None)`
- Produces:
  - `RolloverPreviewResponse(classes: List[ClassRolloverPreviewItem], total_students: int, default_promoted: int, default_graduated: int, teacher_assignments_count: int)`
  - `TenantRolloverSummaryResponse(tenant_id: str, academic_year_id: str, academic_year_name: str, total_students_promoted: int, total_students_retained: int, total_students_transferred: int, total_students_graduated: int, teacher_assignments_copied: int)`

- [ ] **Step 1: Write the failing test in `tests/test_tenant_academic_rollover.py`**

In `E:\SSUP\backend\tests\test_tenant_academic_rollover.py`, add tests for preview and student overrides:
```python
def test_tenant_rollover_preview_endpoint(default_academic_year):
    db = SessionLocal()
    suffix = uuid.uuid4().hex[:6]

    sa_email = f"sa_prev_{suffix}@platform.com"
    super_admin = User(email=sa_email, password=hash_password("SuperSecret123!"), first_name="Super", last_name="Admin", phone=f"98{random.randint(10000000, 99999999)}", is_super_admin=True)
    db.add(super_admin)
    db.commit()

    sa_token = client.post("/api/v1/auth/login", json={"email": sa_email, "password": "SuperSecret123!"}).json()["access_token"]
    sa_headers = {"Authorization": f"Bearer {sa_token}"}

    school_domain = f"school-prev-{suffix}"
    tenant_id = client.post("/api/v1/tenants/", headers=sa_headers, json={"name": f"School Prev {suffix}", "domain_name": school_domain, "email": f"info@{school_domain}.com", "phone": "9812345678"}).json()["data"]["id"]
    default_academic_year(db, tenant_id)

    admin_phone = f"98{random.randint(10000000, 99999999)}"
    client.post("/api/v1/auth/register", json={"email": f"admin_{suffix}@school.com", "password": "AdminPass1!", "first_name": "Admin", "last_name": "Prev", "phone": admin_phone})
    client.post(f"/api/v1/tenants/{tenant_id}/members/admin/assign", headers=sa_headers, json={"phone": admin_phone})
    admin_token = client.post("/api/v1/auth/login", json={"email": f"admin_{suffix}@school.com", "password": "AdminPass1!"}).json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}", "X-Tenant-ID": tenant_id}

    c1_id = client.post(f"/api/v1/academic/tenants/{tenant_id}/classes", headers=admin_headers, json={"name": "Grade 1"}).json()["data"]["id"]
    c2_id = client.post(f"/api/v1/academic/tenants/{tenant_id}/classes", headers=admin_headers, json={"name": "Grade 2"}).json()["data"]["id"]
    client.put(f"/api/v1/academic/tenants/{tenant_id}/classes/reorder", headers=admin_headers, json={"class_ids": [c1_id, c2_id]})

    sec1_id = client.get(f"/api/v1/academic/tenants/{tenant_id}/classes/{c1_id}/sections", headers=admin_headers).json()["data"][0]["id"]
    client.post(f"/api/v1/academic/tenants/{tenant_id}/classes/{c1_id}/students?section_id={sec1_id}", headers=admin_headers, json={"first_name": "Sam", "last_name": "One"})

    # Test preview endpoint
    resp = client.post(
        f"/api/v1/academic/tenants/{tenant_id}/academic-years/rollover/preview",
        headers=admin_headers,
    )
    assert resp.status_code == 200, f"Preview failed: {resp.text}"
    preview = resp.json()["data"]
    assert preview["total_students"] == 1
    assert preview["default_promoted"] == 1
    assert len(preview["classes"]) >= 1


def test_tenant_rollover_with_student_retention_and_transfer(default_academic_year):
    db = SessionLocal()
    suffix = uuid.uuid4().hex[:6]

    sa_email = f"sa_over_{suffix}@platform.com"
    super_admin = User(email=sa_email, password=hash_password("SuperSecret123!"), first_name="Super", last_name="Admin", phone=f"98{random.randint(10000000, 99999999)}", is_super_admin=True)
    db.add(super_admin)
    db.commit()

    sa_token = client.post("/api/v1/auth/login", json={"email": sa_email, "password": "SuperSecret123!"}).json()["access_token"]
    sa_headers = {"Authorization": f"Bearer {sa_token}"}

    school_domain = f"school-over-{suffix}"
    tenant_id = client.post("/api/v1/tenants/", headers=sa_headers, json={"name": f"School Over {suffix}", "domain_name": school_domain, "email": f"info@{school_domain}.com", "phone": "9812345678"}).json()["data"]["id"]
    default_academic_year(db, tenant_id)

    admin_phone = f"98{random.randint(10000000, 99999999)}"
    client.post("/api/v1/auth/register", json={"email": f"admin_{suffix}@school.com", "password": "AdminPass1!", "first_name": "Admin", "last_name": "Over", "phone": admin_phone})
    client.post(f"/api/v1/tenants/{tenant_id}/members/admin/assign", headers=sa_headers, json={"phone": admin_phone})
    admin_token = client.post("/api/v1/auth/login", json={"email": f"admin_{suffix}@school.com", "password": "AdminPass1!"}).json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}", "X-Tenant-ID": tenant_id}

    c1_id = client.post(f"/api/v1/academic/tenants/{tenant_id}/classes", headers=admin_headers, json={"name": "Grade 1"}).json()["data"]["id"]
    c2_id = client.post(f"/api/v1/academic/tenants/{tenant_id}/classes", headers=admin_headers, json={"name": "Grade 2"}).json()["data"]["id"]
    client.put(f"/api/v1/academic/tenants/{tenant_id}/classes/reorder", headers=admin_headers, json={"class_ids": [c1_id, c2_id]})

    sec1_id = client.get(f"/api/v1/academic/tenants/{tenant_id}/classes/{c1_id}/sections", headers=admin_headers).json()["data"][0]["id"]
    s1_id = client.post(f"/api/v1/academic/tenants/{tenant_id}/classes/{c1_id}/students?section_id={sec1_id}", headers=admin_headers, json={"first_name": "Student", "last_name": "Promoted"}).json()["data"]["id"]
    s2_id = client.post(f"/api/v1/academic/tenants/{tenant_id}/classes/{c1_id}/students?section_id={sec1_id}", headers=admin_headers, json={"first_name": "Student", "last_name": "Retained"}).json()["data"]["id"]
    s3_id = client.post(f"/api/v1/academic/tenants/{tenant_id}/classes/{c1_id}/students?section_id={sec1_id}", headers=admin_headers, json={"first_name": "Student", "last_name": "Transferred"}).json()["data"]["id"]

    # Execute rollover with overrides: s1 promoted (default), s2 retained in Grade 1, s3 transferred out
    resp = client.post(
        f"/api/v1/academic/tenants/{tenant_id}/academic-years/rollover",
        headers=admin_headers,
        json={
            "name": "Academic Session 2084/2085",
            "start_date": "2027-04-14",
            "end_date": "2028-04-13",
            "copy_teacher_assignments": True,
            "student_overrides": [
                {"student_id": s2_id, "action": "RETAIN"},
                {"student_id": s3_id, "action": "TRANSFER"},
            ],
        },
    )
    assert resp.status_code == 200, f"Rollover with overrides failed: {resp.text}"
    summary = resp.json()["data"]
    assert summary["total_students_promoted"] == 1
    assert summary["total_students_retained"] == 1
    assert summary["total_students_transferred"] == 1

    # Verify S1 is in Grade 2 (Promoted)
    s1_res = client.get(f"/api/v1/academic/tenants/{tenant_id}/students/{s1_id}", headers=admin_headers).json()["data"]
    assert s1_res["class_id"] == c2_id
    assert s1_res["status"] == "ACTIVE"

    # Verify S2 remains in Grade 1 (Retained)
    s2_res = client.get(f"/api/v1/academic/tenants/{tenant_id}/students/{s2_id}", headers=admin_headers).json()["data"]
    assert s2_res["class_id"] == c1_id
    assert s2_res["status"] == "ACTIVE"

    # Verify S3 is marked TRANSFERRED
    s3_res = client.get(f"/api/v1/academic/tenants/{tenant_id}/students/{s3_id}", headers=admin_headers).json()["data"]
    assert s3_res["status"] == "TRANSFERRED"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `E:\SSUP\backend\.venv\Scripts\pytest.exe tests/test_tenant_academic_rollover.py`
Expected: FAIL (preview endpoint returns 404, overrides not recognized).

- [ ] **Step 3: Define preview & override schemas in `src/modules/academic/schemas.py`**

Add schemas:
```python
from enum import Enum

class StudentRolloverAction(str, Enum):
    PROMOTE = "PROMOTE"
    RETAIN = "RETAIN"
    TRANSFER = "TRANSFER"
    GRADUATE = "GRADUATE"


class StudentRolloverOverride(BaseModel):
    student_id: str
    action: StudentRolloverAction


class StudentPreviewItem(BaseModel):
    student_id: str
    name: str
    current_class_id: str
    current_class_name: str
    current_section_id: Optional[str] = None
    current_section_name: Optional[str] = None
    target_class_id: Optional[str] = None
    target_class_name: Optional[str] = None
    default_action: StudentRolloverAction


class ClassRolloverPreviewItem(BaseModel):
    class_id: str
    class_name: str
    sequence_order: int
    target_class_id: Optional[str] = None
    target_class_name: Optional[str] = None
    total_students: int
    students: List[StudentPreviewItem]


class RolloverPreviewResponse(BaseModel):
    current_academic_year_id: str
    current_academic_year_name: str
    total_students: int
    default_promoted: int
    default_graduated: int
    teacher_assignments_count: int
    classes: List[ClassRolloverPreviewItem]


class TenantAcademicYearRolloverRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=50, description="Academic year label, e.g. 2083/2084")
    start_date: date
    end_date: date
    copy_teacher_assignments: bool = Field(True, description="Whether to copy teacher duties into the new session")
    student_overrides: Optional[List[StudentRolloverOverride]] = Field(None, description="Optional per-student promotion/retention overrides")

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
    total_students_retained: int = 0
    total_students_transferred: int = 0
    total_students_graduated: int
    teacher_assignments_copied: int
```

- [ ] **Step 4: Implement `preview_rollover` and enhance `tenant_rollover` in `src/modules/academic/service.py`**

1. Implement `AcademicYearService.preview_rollover`:
   - Retrieves active `old_year`.
   - Reads classes ordered by sequence.
   - Builds consecutive `next_class_map`.
   - Collects active `StudentEnrollment` records and maps each student to default `PROMOTE` or `GRADUATE`.
   - Counts active `TeacherAssignment` records.
   - Returns `RolloverPreviewResponse`.

2. Enhance `AcademicYearService.tenant_rollover`:
   - Build lookup map from `obj_in.student_overrides`: `override_map = {o.student_id: o.action for o in (obj_in.student_overrides or [])}`.
   - For each active enrollment:
     - Check `action = override_map.get(student.id, default_action)`:
       - If `action == StudentRolloverAction.RETAIN`:
         - `enr.status = EnrollmentStatus.RETAINED.value`
         - `new_enr = StudentEnrollment(..., class_id=current_class.id, section_id=enr.section_id, academic_year_id=new_year.id, status=EnrollmentStatus.ACTIVE.value)`
         - `student.class_id = current_class.id`
         - Increment `total_retained`.
       - If `action == StudentRolloverAction.TRANSFER`:
         - `enr.status = EnrollmentStatus.TRANSFERRED.value`
         - `student.status = StudentStatus.TRANSFERRED.value`
         - Increment `total_transferred`.
       - If `action == StudentRolloverAction.GRADUATE`:
         - `enr.status = EnrollmentStatus.PROMOTED.value`
         - `student.status = StudentStatus.GRADUATED.value`
         - Increment `total_graduated`.
       - If `action == StudentRolloverAction.PROMOTE` and `next_class`:
         - Standard promotion: `enr.status = PROMOTED`, `new_enr` in `next_class`, `student.class_id = next_class.id`.
         - Increment `total_promoted`.
       - If `action == StudentRolloverAction.PROMOTE` and no `next_class`:
         - Terminal grade: `enr.status = PROMOTED`, `student.status = GRADUATED`.
         - Increment `total_graduated`.

- [ ] **Step 5: Register `/academic-years/rollover/preview` in `academic_years.py`**

```python
@router.post(
    "/academic-years/rollover/preview",
    status_code=status.HTTP_200_OK,
    response_model=ApiResponse[RolloverPreviewResponse],
    summary="Preview Tenant Academic Year Rollover (Admin & Office Admin)",
    dependencies=[Depends(require_roles(UserRole.ADMIN, UserRole.OFFICE_ADMIN))],
)
def preview_tenant_academic_year_rollover(
    tenant_id: str,
    member: TenantMembershipContext = Depends(get_current_tenant_member),
    db: Session = Depends(get_db),
):
    result = AcademicYearService.preview_rollover(db=db, tenant_id=tenant_id)
    return ApiResponse(
        status=True,
        message="Academic year rollover preview generated successfully",
        data=result,
    )
```

- [ ] **Step 6: Run backend tests to verify they pass**

Run: `E:\SSUP\backend\.venv\Scripts\pytest.exe tests/test_tenant_academic_rollover.py`
Expected: PASS (all 7 test cases pass).

- [ ] **Step 7: Commit backend changes**

```bash
git add tests/test_tenant_academic_rollover.py src/modules/academic/schemas.py src/modules/academic/service.py src/modules/academic/routers/academic_years.py
git commit -m "feat(academic): implement rollover preview and selective student promotion/retention overrides"
```

---

### Task 2: Frontend - Staging Wizard with Class Tabs, Student Overrides, and Execution Flow

**Files:**
- Modify: `E:\SSUP\frontend\src\features\academic-year\schema.ts`
- Modify: `E:\SSUP\frontend\src\features\academic-year\api.ts`
- Modify: `E:\SSUP\frontend\src\features\academic-year\hooks.ts`
- Modify: `E:\SSUP\frontend\src\features\academic-year\components\TenantRolloverDialog.tsx`

**Interfaces:**
- Consumes:
  - `POST /api/v1/academic/tenants/{tenantId}/academic-years/rollover/preview`
  - `POST /api/v1/academic/tenants/{tenantId}/academic-years/rollover` with `student_overrides`
- Produces: 3-step interactive UI wizard with class progression navigation, live override counters, and execution confirmation.

- [ ] **Step 1: Add preview and override DTOs in frontend schema and API client**

In `src/features/academic-year/schema.ts`:
```typescript
export type RolloverAction = 'PROMOTE' | 'RETAIN' | 'TRANSFER' | 'GRADUATE';

export interface StudentRolloverOverride {
  student_id: string;
  action: RolloverAction;
}

export interface StudentPreviewItem {
  student_id: string;
  name: string;
  current_class_id: string;
  current_class_name: string;
  current_section_id?: string | null;
  current_section_name?: string | null;
  target_class_id?: string | null;
  target_class_name?: string | null;
  default_action: RolloverAction;
}

export interface ClassRolloverPreviewItem {
  class_id: string;
  class_name: string;
  sequence_order: number;
  target_class_id?: string | null;
  target_class_name?: string | null;
  total_students: number;
  students: StudentPreviewItem[];
}

export interface RolloverPreviewResponse {
  current_academic_year_id: string;
  current_academic_year_name: string;
  total_students: number;
  default_promoted: number;
  default_graduated: number;
  teacher_assignments_count: number;
  classes: ClassRolloverPreviewItem[];
}

export interface TenantAcademicYearRolloverRequest {
  name: string;
  start_date: string;
  end_date: string;
  copy_teacher_assignments: boolean;
  student_overrides?: StudentRolloverOverride[];
}

export interface TenantRolloverSummaryResponse {
  tenant_id: string;
  academic_year_id: string;
  academic_year_name: string;
  total_students_promoted: number;
  total_students_retained: number;
  total_students_transferred: number;
  total_students_graduated: number;
  teacher_assignments_copied: number;
}
```

In `src/features/academic-year/api.ts`:
```typescript
previewRollover: async (tenantId: string): Promise<RolloverPreviewResponse> => {
  return apiClient.post(`/academic/tenants/${tenantId}/academic-years/rollover/preview`);
},
```

In `src/features/academic-year/hooks.ts`:
```typescript
export const useRolloverPreview = (tenantId: string | null, enabled: boolean = false) => {
  return useQuery({
    queryKey: ['rollover_preview', tenantId],
    queryFn: () => (tenantId ? academicYearApi.previewRollover(tenantId) : Promise.reject('No tenant')),
    enabled: !!tenantId && enabled,
    staleTime: 0,
  });
};
```

- [ ] **Step 2: Build 3-Step Wizard in `TenantRolloverDialog.tsx`**

Upgrade `TenantRolloverDialog.tsx` to handle 3 wizard steps:
1. **Step 1: Session Details**:
   - Session Name input
   - Start Date & End Date pickers (`NepaliDatePicker`)
   - "Preserve Teacher Class & Subject Assignments" toggle
   - "Next: Review Students" button (fetches preview query)
2. **Step 2: Student Staging & Review**:
   - Class selector tabs (`TabsList` with class name and student counts)
   - Student roster table:
     - Student Name
     - Current Section
     - Target Class
     - Action Select:
       - `Promote` (Target: Next Class)
       - `Retain` (Target: Repeat Current Class)
       - `Transfer Out` (Target: Withdraw)
       - `Graduate` (Target: Alumni)
   - Live counter banner: `X to Promote • Y Retained • Z Transferred • W Graduating`
   - "Back" and "Next: Final Review" buttons
3. **Step 3: Verification & Execution**:
   - High-level review scorecard
   - "Execute Rollover" button
   - Outcome summary card (Promoted, Retained, Transferred, Graduated, Teachers Copied) with button to close

- [ ] **Step 3: Verify TypeScript compilation & frontend build**

Run:
`npx tsc -b`
`npm run build`
Expected: Both pass with code 0.

- [ ] **Step 4: Commit frontend changes**

```bash
git add src/features/academic-year/schema.ts src/features/academic-year/api.ts src/features/academic-year/hooks.ts src/features/academic-year/components/TenantRolloverDialog.tsx
git commit -m "feat(academic): build 3-step promotion staging and rollover wizard with student overrides"
```

---

### Task 3: Full End-to-End Verification

**Files:**
- N/A (Cross-repo verification)

- [ ] **Step 1: Run complete backend pytest suite**

Run:
```bash
E:\SSUP\backend\.venv\Scripts\pytest.exe tests/test_tenant_academic_rollover.py tests/test_platform_rollover.py
```
Expected: PASS (all tests pass).

- [ ] **Step 2: Run frontend build verification**

Run:
```bash
npx tsc -b
npm run build
```
Expected: Clean build with code 0.
