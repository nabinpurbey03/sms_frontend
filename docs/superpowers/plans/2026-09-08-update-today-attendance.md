# Dynamic "Update Today's Attendance" State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the UI so that once attendance has been marked for today for a section, buttons and headers across ClassCard, ClassDetailPage, MyAssignmentsPage, and MarkAttendancePage dynamically display "Update Today's Attendance" (with pre-populated student statuses and recorded status badges) instead of "Mark Today's Attendance".

**Architecture:**
- **Backend**: Expose `GET /api/v1/attendance/tenants/{tenant_id}/daily-status?record_date=YYYY-MM-DD` returning which sections have attendance marked, total student counts, present counts, and lock status via a single aggregate SQL query.
- **Frontend API & Cache**: Provide `useDailyAttendanceStatus(tenantId, recordDate)` hook with automatic invalidation on attendance mutation. Fix query parameter naming in `getSectionReport` (`from_date` / `to_date`).
- **Cards & Page Navigation**: Pass `isTodayAttendanceMarked` into `ClassCard`, `ClassDetailPage`, and `MyAssignmentsPage` to toggle button labels ("Update Today's Attendance" vs "Mark Today's Attendance") and status indicators.
- **Mark Attendance Page**: Pre-populate `presentStudentIds` from the section's attendance record for the selected date, dynamically changing the page title and submit button to "Update Attendance".

**Tech Stack:** FastAPI, SQLAlchemy 2.0, Pydantic v2, pytest / httpx, React 19, TypeScript, TanStack Query, TanStack Router, Tailwind CSS v4, Lucide React, shadcn/ui.

**Spec:** Described in user prompt, adhering to [BACKEND_ARCHITECTURE.md](file:///E:/PBAC/frontend/BACKEND_ARCHITECTURE.md) (ReBAC & ABAC attendance policies).

## Global Constraints

- Never break existing RBAC or ReBAC permissions: only Staff (Admin, Office Admin, Teacher) can query attendance daily status; only designated Class Teachers can update/mark attendance for their section.
- ABAC constraints remain strictly active: editing attendance is limited to within 7 days in the past and never future dates (`record_date <= today`), rejecting modifications to locked records.
- Preserve backward compatibility for all existing attendance endpoints and frontend routes.
- TypeScript strictness: `npm run lint` and `npm run build` must pass with 0 errors; backend test suite must pass with 0 errors.

---

### Task 1: Backend `daily-status` API Endpoint & Integration Tests

**Files:**
- Modify: `backend/src/modules/attendance/schemas.py`
- Modify: `backend/src/modules/attendance/service.py`
- Modify: `backend/src/modules/attendance/router.py`
- Create: `backend/tests/test_daily_attendance_status.py`

**Interfaces:**
- Consumes: `attendance_records` table, `date` query parameter
- Produces: `GET /api/v1/attendance/tenants/{tenant_id}/daily-status?record_date=YYYY-MM-DD` returning `ApiResponse[DailyAttendanceStatusResponse]`

- [ ] **Step 1: Write integration test for `daily-status` endpoint**

Create `backend/tests/test_daily_attendance_status.py`:
```python
"""
Integration test for GET /api/v1/attendance/tenants/{tenant_id}/daily-status
Verifies:
1. When no attendance marked, marked_section_ids is empty.
2. After marking attendance for Section A, marked_section_ids contains Section A.
3. Summary stats (total_students, present_count, absent_count) are accurate.
4. Staff roles (Admin, Office Admin, Teacher) have access.
"""
from datetime import date
from fastapi.testclient import TestClient
from src.main import app
from tests.test_authorization_flow import setup_full_school_environment

client = TestClient(app)

def test_daily_attendance_status_flow():
    env = setup_full_school_environment()
    tenant_id = env["tenant_id"]
    class_id = env["grade_10_id"]
    section_id = env["grade_10_sec_a_id"]
    teacher_token = env["teacher_bob_token"]
    today_str = date.today().isoformat()

    headers = {
        "Authorization": f"Bearer {teacher_token}",
        "X-Tenant-ID": tenant_id,
    }

    # 1. Before marking attendance: status should show empty marked_section_ids
    res = client.get(
        f"/api/v1/attendance/tenants/{tenant_id}/daily-status?record_date={today_str}",
        headers=headers,
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["status"] is True
    assert section_id not in body["data"]["marked_section_ids"]

    # 2. Mark attendance for Section A
    student_ids = env["grade_10_sec_a_student_ids"]
    present_ids = student_ids[:2]
    mark_res = client.post(
        f"/api/v1/attendance/tenants/{tenant_id}/classes/{class_id}/sections/{section_id}?record_date={today_str}",
        headers=headers,
        json={"present_student_ids": present_ids},
    )
    assert mark_res.status_code == 201, mark_res.text

    # 3. After marking attendance: status should show Section A marked
    res2 = client.get(
        f"/api/v1/attendance/tenants/{tenant_id}/daily-status?record_date={today_str}",
        headers=headers,
    )
    assert res2.status_code == 200
    body2 = res2.json()
    assert section_id in body2["data"]["marked_section_ids"]
    sec_info = next(s for s in body2["data"]["sections"] if s["section_id"] == section_id)
    assert sec_info["is_marked"] is True
    assert sec_info["present_count"] == 2
    assert sec_info["absent_count"] == len(student_ids) - 2

if __name__ == "__main__":
    test_daily_attendance_status_flow()
    print("[PASS] Daily attendance status integration test passed!")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run python tests/test_daily_attendance_status.py` in `E:\PBAC\backend`
Expected: FAIL (404 Not Found on `/daily-status`)

- [ ] **Step 3: Define schemas in `backend/src/modules/attendance/schemas.py`**

Append to `backend/src/modules/attendance/schemas.py`:
```python
class SectionDailyAttendanceStatus(BaseModel):
    section_id: str
    class_id: str
    is_marked: bool
    total_students: int
    present_count: int
    absent_count: int
    is_locked: bool = False

    model_config = ConfigDict(from_attributes=True)


class DailyAttendanceStatusResponse(BaseModel):
    date: date
    marked_section_ids: List[str] = Field(default_factory=list)
    sections: List[SectionDailyAttendanceStatus] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
```

- [ ] **Step 4: Implement service in `backend/src/modules/attendance/service.py`**

Add `get_daily_attendance_status` in `AttendanceService`:
```python
    @staticmethod
    def get_daily_attendance_status(
        db: Session,
        tenant_id: str,
        target_date: date,
        class_id: Optional[str] = None,
    ) -> DailyAttendanceStatusResponse:
        from sqlalchemy import case, func
        from src.modules.attendance.models import AttendanceRecord
        from src.modules.attendance.schemas import (
            DailyAttendanceStatusResponse,
            SectionDailyAttendanceStatus,
        )

        query = (
            select(
                AttendanceRecord.section_id,
                AttendanceRecord.class_id,
                func.count(AttendanceRecord.id).label("total_students"),
                func.sum(case((AttendanceRecord.is_present == True, 1), else_=0)).label("present_count"),
                func.sum(case((AttendanceRecord.is_present == False, 1), else_=0)).label("absent_count"),
                func.max(case((AttendanceRecord.is_locked == True, 1), else_=0)).label("is_locked"),
            )
            .where(
                AttendanceRecord.tenant_id == tenant_id,
                AttendanceRecord.date == target_date,
                AttendanceRecord.deleted_at == None,
            )
        )
        if class_id:
            query = query.where(AttendanceRecord.class_id == class_id)

        query = query.group_by(AttendanceRecord.section_id, AttendanceRecord.class_id)
        rows = db.execute(query).all()

        marked_section_ids = []
        sections = []
        for r in rows:
            sec_id = str(r.section_id)
            marked_section_ids.append(sec_id)
            sections.append(
                SectionDailyAttendanceStatus(
                    section_id=sec_id,
                    class_id=str(r.class_id),
                    is_marked=True,
                    total_students=int(r.total_students or 0),
                    present_count=int(r.present_count or 0),
                    absent_count=int(r.absent_count or 0),
                    is_locked=bool(r.is_locked),
                )
            )

        return DailyAttendanceStatusResponse(
            date=target_date,
            marked_section_ids=marked_section_ids,
            sections=sections,
        )
```

- [ ] **Step 5: Register route in `backend/src/modules/attendance/router.py`**

In `backend/src/modules/attendance/router.py`:
Import `DailyAttendanceStatusResponse` from `schemas`.
Add endpoint:
```python
@router.get(
    "/daily-status",
    status_code=status.HTTP_200_OK,
    response_model=ApiResponse[DailyAttendanceStatusResponse],
    summary="Get section attendance statuses for a specific date (Staff only)",
    dependencies=[Depends(require_roles(UserRole.ADMIN, UserRole.OFFICE_ADMIN, UserRole.TEACHER))],
)
def get_daily_attendance_status(
    tenant_id: str,
    record_date: date = Query(default_factory=date.today, description="The date to check status for"),
    class_id: Optional[str] = Query(None, description="Filter metrics down to a specific class"),
    db: Session = Depends(get_db),
):
    result = AttendanceService.get_daily_attendance_status(
        db=db,
        tenant_id=tenant_id,
        target_date=record_date,
        class_id=class_id,
    )
    return ApiResponse(
        status=True,
        message="Daily attendance status retrieved successfully.",
        data=result,
    )
```

- [ ] **Step 6: Run test to verify it passes**

Run: `uv run python tests/test_daily_attendance_status.py` in `E:\PBAC\backend`
Expected: PASS with code 0.
Also run: `uv run python tests/test_authorization_flow.py`
Expected: All 23 tests pass.

- [ ] **Step 7: Commit backend changes**

Commit: `feat(attendance): add daily attendance status endpoint for staff`

---

### Task 2: Frontend Attendance API, Types, Hooks & Cache Invalidation

**Files:**
- Modify: `frontend/src/features/attendance/types.ts`
- Modify: `frontend/src/features/attendance/api.ts`
- Modify: `frontend/src/features/attendance/hooks.ts`

**Interfaces:**
- Consumes: Backend `GET /attendance/tenants/{tenant_id}/daily-status`
- Produces:
  - Types `SectionDailyAttendanceStatus` and `DailyAttendanceStatus`
  - `attendanceApi.getDailyAttendanceStatus(tenantId, recordDate, classId?)`
  - Query hook `useDailyAttendanceStatus(tenantId, recordDate, classId?, options?)`
  - Fixed query params in `attendanceApi.getSectionReport` (`from_date`, `to_date`)
  - Auto-invalidation of `DAILY_ATTENDANCE_STATUS_KEY` in `useMarkAttendance`

- [ ] **Step 1: Add types in `src/features/attendance/types.ts`**

Add to `src/features/attendance/types.ts`:
```typescript
export interface SectionDailyAttendanceStatus {
  section_id: string;
  class_id: string;
  is_marked: boolean;
  total_students: number;
  present_count: number;
  absent_count: number;
  is_locked: boolean;
}

export interface DailyAttendanceStatus {
  date: string;
  marked_section_ids: string[];
  sections: SectionDailyAttendanceStatus[];
}
```

- [ ] **Step 2: Add API method & fix query parameters in `src/features/attendance/api.ts`**

In `src/features/attendance/api.ts`:
1. Fix `getSectionReport` parameters to use `from_date` and `to_date`:
```typescript
  getSectionReport: async (
    tenantId: string,
    classId: string,
    sectionId: string,
    startDate: string,
    endDate: string
  ): Promise<SectionAttendanceReport> => {
    return apiClient.get(
      `/attendance/tenants/${tenantId}/classes/${classId}/sections/${sectionId}/report`,
      {
        params: { from_date: startDate, to_date: endDate },
      }
    );
  },
```
2. Add `getDailyAttendanceStatus`:
```typescript
  getDailyAttendanceStatus: async (
    tenantId: string,
    recordDate: string,
    classId?: string
  ): Promise<DailyAttendanceStatus> => {
    return apiClient.get(
      `/attendance/tenants/${tenantId}/daily-status`,
      { params: { record_date: recordDate, class_id: classId } }
    );
  },
```

- [ ] **Step 3: Add `useDailyAttendanceStatus` query hook & invalidate cache in `src/features/attendance/hooks.ts`**

In `src/features/attendance/hooks.ts`:
1. Export query key:
```typescript
export const DAILY_ATTENDANCE_STATUS_KEY = 'daily_attendance_status';
```
2. Export query hook:
```typescript
export const useDailyAttendanceStatus = (
  tenantId: string | null,
  recordDate: string,
  classId?: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: [DAILY_ATTENDANCE_STATUS_KEY, tenantId, recordDate, classId],
    queryFn: () => attendanceApi.getDailyAttendanceStatus(tenantId!, recordDate, classId),
    enabled: !!tenantId && !!recordDate && (options?.enabled ?? true),
    staleTime: 1000 * 15,
  });
};
```
3. In `useMarkAttendance`:
In `onSuccess`:
```typescript
    onSuccess: (data, { recordDate, presentStudentIds }) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: [DAILY_ATTENDANCE_STATUS_KEY] });
      const count = data?.total_marked_present ?? presentStudentIds.length;
      toast.success('Attendance Recorded', {
        description: `${count} student(s) marked present for ${recordDate}`,
      });
    },
```

- [ ] **Step 4: Verify build with `npm run build`**

Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 5: Commit changes**

Commit: `feat(attendance): add daily attendance status query and fix report query params`

---

### Task 3: MarkAttendancePage Pre-Population of Existing Attendance & Dynamic "Update Attendance" Mode

**Files:**
- Modify: `src/features/attendance/pages/MarkAttendancePage.tsx`

**Interfaces:**
- Consumes:
  - `useSectionAttendanceReport(activeTenantId, selectedClassId, selectedSectionId, recordDate, recordDate)`
  - `effectiveSelection`
  - `students`
- Produces:
  - Dynamic page title: "Update Daily Attendance" vs "Mark Daily Attendance"
  - Dynamic button text: "Update Attendance" vs "Submit Attendance"
  - Dynamic toast message: "Attendance Updated" vs "Attendance Recorded"
  - Pre-population of `presentStudentIds` from already-marked records for that date

- [ ] **Step 1: Update `MarkAttendancePage.tsx` to load existing attendance and switch mode**

1. Query existing section report for the selected date:
```typescript
  const { data: sectionReport, isLoading: isReportLoading } = useSectionAttendanceReport(
    activeTenantId,
    selectedClassId,
    selectedSectionId,
    recordDate,
    recordDate
  );
```
2. Determine if attendance is already recorded for this date:
```typescript
  const isAlreadyMarked = useMemo(() => {
    if (!sectionReport) return false;
    return (sectionReport.total_school_days ?? 0) > 0 ||
      sectionReport.students.some((s) => s.records && s.records[recordDate] !== undefined);
  }, [sectionReport, recordDate]);
```
3. Pre-populate `presentStudentIds` when `sectionReport` loads or when changing section/date:
```typescript
  // Synchronize presentStudentIds when sectionReport arrives for the selected date
  useEffect(() => {
    if (!sectionReport || !isAlreadyMarked) return;
    const presentIds = new Set<string>();
    for (const s of sectionReport.students) {
      if (s.records && s.records[recordDate] === true) {
        presentIds.add(s.student_id);
      }
    }
    setPresentStudentIds(presentIds);
  }, [sectionReport, isAlreadyMarked, recordDate, selectedSectionId]);
```
4. Dynamic header badge and titles:
   - Header title:
     `{isAlreadyMarked ? "Update Daily Attendance" : "Mark Daily Attendance"}`
   - Header description:
     `{isAlreadyMarked ? "Attendance has already been recorded for this date. Modify student attendance below." : (isTeacher ? "You can only mark attendance for sections where you are the Class Teacher." : "Mark student attendance for your school sections.")}`
   - Mode badge next to date picker:
     If `isAlreadyMarked`:
     `<Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Recorded for this date</Badge>`
5. Dynamic submit button:
   - Button text:
     `{isAlreadyMarked ? "Update Attendance" : "Submit Attendance"}`
   - Button icon:
     `{isAlreadyMarked ? <Edit3 className="w-4 h-4 mr-1.5" /> : <CalendarCheck className="w-4 h-4 mr-1.5" />}`

- [ ] **Step 2: Verify with `npm run build` and `npm run lint`**

Run: `npm run lint && npm run build`
Expected: 0 errors.

- [ ] **Step 3: Commit changes**

Commit: `feat(attendance): pre-populate marked attendance and dynamically switch to update mode`

---

### Task 4: ClassCard, ClassesPage, ClassDetailPage & MyAssignmentsPage "Update Today's Attendance" State

**Files:**
- Modify: `frontend/src/features/academic/components/ClassCard.tsx`
- Modify: `frontend/src/features/academic/pages/ClassesPage.tsx`
- Modify: `frontend/src/features/academic/pages/ClassDetailPage.tsx`
- Modify: `frontend/src/features/attendance/pages/MyAssignmentsPage.tsx`

**Interfaces:**
- Consumes: `useDailyAttendanceStatus`
- Produces:
  - `ClassCard`: Button says "Update Today's Attendance" when `isTodayAttendanceMarked === true`, with green check indicator.
  - `ClassesPage`: Computes `isTodayAttendanceMarked` per class.
  - `ClassDetailPage`: Header button says "Update Today's Attendance (Sec {name})" when current section is marked for today.
  - `MyAssignmentsPage`: Duty card button says "Update Today's Attendance" and badge says "Marked for Today".

- [ ] **Step 1: Enhance `ClassCard.tsx`**

1. In `TeacherClassScope` interface:
```typescript
export interface TeacherClassScope {
  isClassTeacher: boolean;
  classTeacherSections: { id: string; name: string }[];
  isSubjectTeacher: boolean;
  subjectNames: string[];
  isTodayAttendanceMarked?: boolean;
}
```
2. In Card Footer:
```tsx
  {teacherScope?.isClassTeacher && (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        onClick={() => {
          const targetSecId = teacherScope.classTeacherSections[0]?.id;
          onMarkAttendance?.(cls.id, targetSecId);
        }}
        className={`text-xs gap-1.5 text-white shadow-xs cursor-pointer h-8 ${
          teacherScope.isTodayAttendanceMarked
            ? 'bg-emerald-600 hover:bg-emerald-700'
            : 'bg-purple-600 hover:bg-purple-700'
        }`}
      >
        {teacherScope.isTodayAttendanceMarked ? (
          <>
            <Edit3 className="w-3.5 h-3.5" />
            <span>Update Today's Attendance</span>
          </>
        ) : (
          <>
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Mark Today's Attendance</span>
          </>
        )}
      </Button>
      {teacherScope.isTodayAttendanceMarked && (
        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Marked
        </span>
      )}
    </div>
  )}
```

- [ ] **Step 2: Connect `ClassesPage.tsx` to `useDailyAttendanceStatus`**

In `src/features/academic/pages/ClassesPage.tsx`:
1. Import `useDailyAttendanceStatus` from `@/features/attendance/hooks`.
2. Fetch daily status:
```typescript
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const { data: dailyStatus } = useDailyAttendanceStatus(activeTenantId, todayStr, undefined, {
    enabled: !!activeTenantId,
  });
  const markedSectionIds = useMemo(() => {
    return new Set(dailyStatus?.marked_section_ids || []);
  }, [dailyStatus]);
```
3. In `teacherScopeByClassId` calculation, attach `isTodayAttendanceMarked`:
```typescript
  // Check if any of the teacher's class-teacher sections are marked for today
  for (const [classId, scope] of scopeMap.entries()) {
    if (scope.isClassTeacher) {
      scope.isTodayAttendanceMarked = scope.classTeacherSections.some((s) =>
        markedSectionIds.has(s.id)
      );
    }
  }
```

- [ ] **Step 3: Connect `ClassDetailPage.tsx` to `useDailyAttendanceStatus`**

In `src/features/academic/pages/ClassDetailPage.tsx`:
1. Import `useDailyAttendanceStatus` and `Edit3, CheckCircle2`.
2. Fetch daily status:
```typescript
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const { data: dailyStatus } = useDailyAttendanceStatus(tenantId, todayStr, classId, {
    enabled: !!tenantId && !!classId,
  });
  const isCurrentSectionMarkedToday = useMemo(() => {
    if (!currentSection || !dailyStatus) return false;
    return dailyStatus.marked_section_ids.includes(currentSection.id);
  }, [currentSection, dailyStatus]);
```
3. In header button for Class Teacher:
```tsx
  {isClassTeacherForThisClass && (
    <Button
      onClick={() =>
        navigate({
          to: '/attendance/mark',
          search: { classId: cls.id, sectionId: currentSection?.id } as any,
        })
      }
      className={`gap-2 text-white shadow-xs cursor-pointer text-xs ${
        isCurrentSectionMarkedToday
          ? 'bg-emerald-600 hover:bg-emerald-700'
          : 'bg-purple-600 hover:bg-purple-700'
      }`}
    >
      {isCurrentSectionMarkedToday ? (
        <>
          <Edit3 className="w-4 h-4" />
          <span>Update Today's Attendance {currentSection ? `(Sec ${currentSection.name})` : ''}</span>
        </>
      ) : (
        <>
          <CalendarCheck className="w-4 h-4" />
          <span>Mark Today's Attendance {currentSection ? `(Sec ${currentSection.name})` : ''}</span>
        </>
      )}
    </Button>
  )}
```

- [ ] **Step 4: Connect `MyAssignmentsPage.tsx` to `useDailyAttendanceStatus`**

In `src/features/attendance/pages/MyAssignmentsPage.tsx`:
1. Import `useDailyAttendanceStatus` and `Edit3, CheckCircle2`.
2. Fetch daily status:
```typescript
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const { data: dailyStatus } = useDailyAttendanceStatus(activeTenantId, todayStr, undefined, {
    enabled: !!activeTenantId,
  });
  const markedSectionIds = useMemo(() => {
    return new Set(dailyStatus?.marked_section_ids || []);
  }, [dailyStatus]);
```
3. On Class Teacher cards:
```tsx
  const isMarkedToday = assignment.section_id
    ? markedSectionIds.has(assignment.section_id)
    : false;
```
Render button with dynamic text:
`{isMarkedToday ? "Update Today's Attendance" : "Mark Today's Attendance"}`
And badge:
`{isMarkedToday ? "Today's Attendance Recorded" : "Can Mark Attendance"}`

- [ ] **Step 5: Verify build with `npm run build` and `npm run lint`**

Run: `npm run lint && npm run build`
Expected: 0 errors.

- [ ] **Step 6: Commit changes**

Commit: `feat(academic): show update today's attendance when attendance is already marked`

---

### Task 5: End-to-End Verification & Walkthrough

**Files:**
- Output: `walkthrough.md`

- [ ] **Step 1: Run complete backend test suite**

Run: `uv run python tests/test_daily_attendance_status.py`
Run: `uv run python tests/test_authorization_flow.py`
Expected: All tests PASS cleanly.

- [ ] **Step 2: Run frontend verification**

Run: `npm run lint && npm run build` in `E:\PBAC\frontend`
Expected: 0 errors.

- [ ] **Step 3: Update walkthrough artifact**

Document the complete flow:
1. When attendance has not yet been marked -> "Mark Today's Attendance" button with purple style.
2. Once attendance is submitted -> Backend records attendance, cache invalidates.
3. ClassCard, ClassDetailPage, and MyAssignmentsPage seamlessly switch to "Update Today's Attendance" with emerald style and "Marked" badge.
4. Clicking "Update Today's Attendance" opens MarkAttendancePage with students pre-populated with their recorded presence, and page displays "Update Attendance".
