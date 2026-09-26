# Daily Absent Students List Implementation Plan (Admin & Office Admin)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable School Administrators and Office Administrators to view, search, filter, and export the list of students absent today (or on any selected date), complete with parent/guardian contact numbers for rapid morning attendance follow-ups, accessible via both the main Dashboard and Attendance Reports.

**Architecture:** 
1. **Backend (`E:/SSUP/backend`)**: Introduce a dedicated, high-performance endpoint `GET /api/v1/attendance/tenants/{tenant_id}/absent-students` with single-query SQL joins across `attendance_records`, `students`, `classes`, `sections`, and `parent_student_mappings` + `users` (parent phone).
2. **Frontend API & State (`E:/SSUP/frontend`)**: Add `getAbsentStudents` in `src/features/attendance/api.ts` and `useAbsentStudents` TanStack Query hook in `src/features/attendance/hooks.ts`.
3. **Frontend UI Components**: Build a slide-over `AbsentStudentsDrawer` with instant search, class/section filtering, click-to-call phone links, and CSV export. Wire it into the **"Absent" StatCard** in `AttendanceDashboardHub.tsx` (Dashboard) and embed a dedicated **"Daily Absentees"** tab inside `AttendanceReportsPage.tsx`.

**Tech Stack:** 
- Backend: Python 3.12, FastAPI, SQLAlchemy 2.0, Pydantic v2, Pytest.
- Frontend: React 19, TypeScript, TanStack Router & Query v5, Tailwind CSS v4, Radix UI Dialog/Sheet, Lucide React.

**Spec:** Direct user requirement: "for admin and office admin, i want them to see the list of student who are absent today, how can we implement that in this existing project? You can see backend api in E:/SSUP/backend, if you have enough api you can start implementing forntend."

## Global Constraints
- Access is strictly restricted to `ADMIN` and `OFFICE_ADMIN` roles (403 for unauthorized roles).
- Date defaults to today's date (`date.today()`), but allows querying past dates.
- Avoid N+1 frontend requests; all student and parent contact info must be returned in a single query.
- Maintain existing attendance features (marking, CSV reports, at-risk detection) without breaking changes.
- Backend must pass `pytest tests/test_absent_students.py` with 0 failures.
- Frontend must pass `npx tsc -b`, `npm run lint`, and `npm run build` with 0 errors.

---

### Task 1: Backend Absent Students API & Test Suite

**Files:**
- Modify: `E:/SSUP/backend/src/modules/attendance/schemas.py`
- Modify: `E:/SSUP/backend/src/modules/attendance/service.py`
- Modify: `E:/SSUP/backend/src/modules/attendance/router.py`
- Create: `E:/SSUP/backend/tests/test_absent_students.py`

**Interfaces:**
- Consumes: `AttendanceRecord`, `Student`, `Class`, `Section`, `ParentStudentMapping`, `User`.
- Produces: `GET /api/v1/attendance/tenants/{tenant_id}/absent-students` returning `ApiResponse[AbsentStudentsResponse]`.

- [ ] **Step 1: Define Schemas in `src/modules/attendance/schemas.py`**

Add schemas for individual absent student item and envelope response:
```python
class AbsentStudentItem(BaseModel):
    student_id: str
    first_name: str
    middle_name: Optional[str] = None
    last_name: str
    class_id: str
    class_name: str
    section_id: Optional[str] = None
    section_name: Optional[str] = None
    date: date
    is_present: bool = False
    remarks: Optional[str] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    parent_relationship: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AbsentStudentsResponse(BaseModel):
    date: date
    total_absent: int
    items: List[AbsentStudentItem] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
```

- [ ] **Step 2: Implement `get_absent_students` in `src/modules/attendance/service.py`**

Add static method to `AttendanceService`:
```python
    @staticmethod
    def get_absent_students(
        db: Session,
        tenant_id: str,
        target_date: date,
        class_id: Optional[str] = None,
        section_id: Optional[str] = None,
        search: Optional[str] = None,
    ) -> AbsentStudentsResponse:
        from src.modules.academic.models import Class, Section, Student, ParentStudentMapping
        from src.modules.identity.models import User
        from sqlalchemy import or_, and_

        # Base query joining AttendanceRecord with Student, Class, and Section
        query = (
            select(
                AttendanceRecord.student_id,
                Student.first_name,
                Student.middle_name,
                Student.last_name,
                AttendanceRecord.class_id,
                Class.name.label("class_name"),
                AttendanceRecord.section_id,
                Section.name.label("section_name"),
                AttendanceRecord.date,
                AttendanceRecord.remarks,
                User.first_name.label("parent_first_name"),
                User.last_name.label("parent_last_name"),
                User.phone.label("parent_phone"),
                ParentStudentMapping.relationship_type.label("parent_relationship"),
            )
            .join(Student, and_(Student.id == AttendanceRecord.student_id, Student.deleted_at == None))
            .join(Class, and_(Class.id == AttendanceRecord.class_id, Class.deleted_at == None))
            .outerjoin(Section, and_(Section.id == AttendanceRecord.section_id, Section.deleted_at == None))
            .outerjoin(
                ParentStudentMapping,
                and_(
                    ParentStudentMapping.student_id == Student.id,
                    ParentStudentMapping.tenant_id == tenant_id,
                    ParentStudentMapping.deleted_at == None,
                ),
            )
            .outerjoin(User, and_(User.id == ParentStudentMapping.parent_id, User.deleted_at == None))
            .where(
                AttendanceRecord.tenant_id == tenant_id,
                AttendanceRecord.date == target_date,
                AttendanceRecord.is_present == False,
                AttendanceRecord.deleted_at == None,
            )
        )

        if class_id:
            query = query.where(AttendanceRecord.class_id == class_id)
        if section_id:
            query = query.where(AttendanceRecord.section_id == section_id)
        if search and search.strip():
            term = f"%{search.strip()}%"
            query = query.where(
                or_(
                    Student.first_name.ilike(term),
                    Student.last_name.ilike(term),
                )
            )

        query = query.order_by(Class.name, Section.name, Student.first_name, Student.last_name)
        rows = db.execute(query).all()

        items = []
        for r in rows:
            parent_full_name = None
            if r.parent_first_name or r.parent_last_name:
                parent_full_name = f"{r.parent_first_name or ''} {r.parent_last_name or ''}".strip()

            items.append(
                AbsentStudentItem(
                    student_id=str(r.student_id),
                    first_name=r.first_name,
                    middle_name=r.middle_name,
                    last_name=r.last_name,
                    class_id=str(r.class_id),
                    class_name=r.class_name,
                    section_id=str(r.section_id) if r.section_id else None,
                    section_name=r.section_name if r.section_name else None,
                    date=r.date,
                    is_present=False,
                    remarks=r.remarks,
                    parent_name=parent_full_name,
                    parent_phone=r.parent_phone,
                    parent_relationship=r.parent_relationship,
                )
            )

        return AbsentStudentsResponse(
            date=target_date,
            total_absent=len(items),
            items=items,
        )
```

- [ ] **Step 3: Register Route in `src/modules/attendance/router.py`**

```python
@router.get(
    "/absent-students",
    status_code=status.HTTP_200_OK,
    response_model=ApiResponse[AbsentStudentsResponse],
    summary="Get list of absent students for a specific date with contact info (Admin & Office Admin)",
    dependencies=[Depends(require_roles(UserRole.ADMIN, UserRole.OFFICE_ADMIN))],
)
def get_absent_students(
    tenant_id: str,
    record_date: date = Query(default_factory=date.today, description="The date to check absentees for (YYYY-MM-DD)"),
    class_id: Optional[str] = Query(None, description="Optional filter by class ID"),
    section_id: Optional[str] = Query(None, description="Optional filter by section ID"),
    search: Optional[str] = Query(None, description="Search by student name"),
    db: Session = Depends(get_db),
):
    result = AttendanceService.get_absent_students(
        db=db,
        tenant_id=tenant_id,
        target_date=record_date,
        class_id=class_id,
        section_id=section_id,
        search=search,
    )
    return ApiResponse(
        status=True,
        message="Absent students retrieved successfully.",
        data=result,
    )
```

- [ ] **Step 4: Write and Run Pytest in `tests/test_absent_students.py`**

Write test verifying:
1. Student marked absent is returned with correct name, class, section, and date.
2. Student marked present is NOT returned.
3. Filtering by `class_id` filters correctly.
4. Unauthorized role receives 403.
Run: `python -m pytest tests/test_absent_students.py -v` in `E:/SSUP/backend`.
Expected: PASS.

- [ ] **Step 5: Commit Backend Changes**

```bash
cd E:/SSUP/backend
git add src/modules/attendance/ schemas.py service.py router.py tests/test_absent_students.py
git commit -m "feat(attendance): add absent-students endpoint with parent contact info for admin follow-ups"
```

---

### Task 2: Frontend Types, API Client, and React Query Hook

**Files:**
- Modify: `E:/SSUP/frontend/src/features/attendance/types.ts`
- Modify: `E:/SSUP/frontend/src/features/attendance/api.ts`
- Modify: `E:/SSUP/frontend/src/features/attendance/hooks.ts`

**Interfaces:**
- Produces: `AbsentStudentItem`, `AbsentStudentsResponse`, `attendanceApi.getAbsentStudents`, `useAbsentStudents`.

- [ ] **Step 1: Add TypeScript Interfaces in `src/features/attendance/types.ts`**

```typescript
export interface AbsentStudentItem {
  student_id: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  class_id: string;
  class_name: string;
  section_id?: string | null;
  section_name?: string | null;
  date: string;
  is_present: boolean;
  remarks?: string | null;
  parent_name?: string | null;
  parent_phone?: string | null;
  parent_relationship?: string | null;
}

export interface AbsentStudentsResponse {
  date: string;
  total_absent: number;
  items: AbsentStudentItem[];
}

export interface AbsentStudentsFilterParams {
  record_date?: string;
  class_id?: string;
  section_id?: string;
  search?: string;
}
```

- [ ] **Step 2: Add API Method in `src/features/attendance/api.ts`**

```typescript
  getAbsentStudents: async (
    tenantId: string,
    params?: AbsentStudentsFilterParams
  ): Promise<AbsentStudentsResponse> => {
    return apiClient.get(`/attendance/tenants/${tenantId}/absent-students`, {
      params: {
        record_date: params?.record_date,
        class_id: params?.class_id,
        section_id: params?.section_id,
        search: params?.search,
      },
    });
  },
```

- [ ] **Step 3: Add Hook in `src/features/attendance/hooks.ts`**

```typescript
export const useAbsentStudents = (
  tenantId: string | null,
  params?: AbsentStudentsFilterParams,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: ['attendance', 'absent-students', tenantId, params],
    queryFn: () => attendanceApi.getAbsentStudents(tenantId!, params),
    enabled: !!tenantId && (options?.enabled ?? true),
    staleTime: 1000 * 30, // 30 seconds
  });
};
```

- [ ] **Step 4: Verify TypeScript Baseline**

Run: `npx tsc -b`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/attendance/types.ts src/features/attendance/api.ts src/features/attendance/hooks.ts
git commit -m "feat(attendance): add api client and react query hook for absent students"
```

---

### Task 3: Build `AbsentStudentsDrawer` Component & Wire into Dashboard

**Files:**
- Create: `E:/SSUP/frontend/src/features/attendance/components/AbsentStudentsDrawer.tsx`
- Modify: `E:/SSUP/frontend/src/features/dashboard/components/AttendanceDashboardHub.tsx`

**Interfaces:**
- Consumes: `useAbsentStudents`, `useAllClassesWithDetails`.
- Produces: Slide-over Drawer / Sheet triggered from Dashboard "Absent" card and header.

- [ ] **Step 1: Create `AbsentStudentsDrawer.tsx`**

Features:
- Slide-over Dialog/Drawer with Header: "Today's Absent Students ({count})".
- Date selector (defaults to current selected date).
- Search input (debounced search by student name).
- Class dropdown filter.
- Roster cards/table:
  - Student avatar/initials, full name.
  - Class & Section badge.
  - Parent / Guardian name, relationship badge, and clickable phone link `<a href="tel:..." className="text-primary font-mono flex items-center gap-1 hover:underline">`.
  - Attendance remark if present.
- "Export CSV" button to download `absent_students_{date}.csv`.
- Clean empty states ("All students present! No absentees recorded for this date.").

- [ ] **Step 2: Connect into `AttendanceDashboardHub.tsx`**

- In `AttendanceDashboardHub.tsx`:
  - Add state `const [absentDrawerOpen, setAbsentDrawerOpen] = useState(false)`.
  - In the "Absent" StatCard (both in Range mode and Today mode), make it interactive:
    - Add hover shadow, pointer cursor, and click handler `onClick={() => setAbsentDrawerOpen(true)}`.
    - Add a small text or badge: `"Click to view roster →"`.
  - In the Attendance Breakdown Donut legend, make the "Absent: {count}" row clickable to open the drawer.
  - Render `<AbsentStudentsDrawer open={absentDrawerOpen} onOpenChange={setAbsentDrawerOpen} tenantId={activeTenantId} initialDate={selectedDate} />`.

- [ ] **Step 3: Verify TypeScript and Lint**

Run: `npx tsc -b` and `npm run lint`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/attendance/components/AbsentStudentsDrawer.tsx src/features/dashboard/components/AttendanceDashboardHub.tsx
git commit -m "feat(dashboard): integrate absent students drawer with quick-call actions into attendance hub"
```

---

### Task 4: Integrate "Daily Absentees" Tab into Attendance Reports Page

**Files:**
- Modify: `E:/SSUP/frontend/src/features/attendance/pages/AttendanceReportsPage.tsx`

**Interfaces:**
- Consumes: `useAbsentStudents`, `AbsentStudentItem`.
- Produces: 4th tab in Attendance Reports ("Daily Absentees") with full-page tabular layout, class/section filters, search, and CSV export.

- [ ] **Step 1: Add Tab Navigation in `AttendanceReportsPage.tsx`**

- Add `'daily-absent'` to `activeTab` state:
  `const [activeTab, setActiveTab] = useState<'overview' | 'at-risk' | 'roster' | 'daily-absent'>('overview');`
- Add tab pill:
  `<button onClick={() => setActiveTab('daily-absent')}>Daily Absentees</button>` with an `AlertTriangle` or `UserX` icon.

- [ ] **Step 2: Render Daily Absentees Table Panel**

When `activeTab === 'daily-absent'`:
- Show filter bar: Date picker, Class select, Section select, and Search input.
- Show KPI stats: Total Absentees, Most Impacted Class, Unreached Parents count.
- Render clean responsive data table:
  - Student Name & Avatar
  - Class & Section
  - Primary Contact / Parent Name
  - Phone Number with quick-call button
  - Remarks
- "Export Absentees CSV" button using existing export utilities pattern.

- [ ] **Step 3: Run TypeScript and Lint**

Run: `npx tsc -b` and `npm run lint`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/attendance/pages/AttendanceReportsPage.tsx
git commit -m "feat(attendance): add dedicated daily absentees tab to attendance reports"
```

---

### Task 5: End-to-End Build & Verification

**Files:**
- Full system verification across backend and frontend.

- [ ] **Step 1: Run Backend Tests**

Run: `python -m pytest tests/test_absent_students.py -v`
Expected: PASS.

- [ ] **Step 2: Run Frontend TypeScript Check & Lint**

Run: `npx tsc -b && npm run lint`
Expected: 0 errors.

- [ ] **Step 3: Run Production Frontend Build**

Run: `npm run build`
Expected: 0 errors, assets emitted cleanly.

- [ ] **Step 4: Manual Verification Flow**
1. Log in as School Admin / Office Admin.
2. Go to **Dashboard** (`/dashboard`):
   - Locate the **"Absent"** stat card under Today's attendance.
   - Click the card: verify `AbsentStudentsDrawer` slides out.
   - Verify absent students for today are listed with class, section, parent name, and clickable phone link.
   - Test search and class filter.
   - Test CSV export.
3. Go to **Attendance Reports** (`/attendance/reports`):
   - Click the **"Daily Absentees"** tab.
   - Switch dates: verify past date absentees load dynamically.
   - Test responsive layout and parent contact formatting.
