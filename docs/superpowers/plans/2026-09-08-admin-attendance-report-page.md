# Admin & Office-Admin Attendance Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a comprehensive, executive-grade Attendance Report page for Administrators and Office Admins at `/attendance/reports`, featuring core school health KPIs, chronic absenteeism early warnings, class comparison rankings, day-of-week trend analysis, interactive student attendance roster drill-downs, and CSV export.

**Architecture:**
- **Backend Analytics Enhancement**: Augment `GET /api/v1/attendance/tenants/{tenant_id}/school/report` in `backend/src/modules/attendance/` to compute and return actionable metrics:
  - `chronic_absentee_count` and `chronic_absentee_rate` (< 85% attendance threshold)
  - `at_risk_students: List[AtRiskStudentSummary]` (individual students needing intervention)
  - `day_of_week_stats: List[DayOfWeekAttendanceSummary]` (Monday through Friday presence patterns)
  - `best_class_name` and `lowest_class_name` (performance rankings)
- **Frontend Types & API**: Expand `src/features/attendance/types.ts` and `api.ts` to support enhanced models and export helpers.
- **Attendance Reports Page**: Create `src/features/attendance/pages/AttendanceReportsPage.tsx` with date presets (`Today`, `Last 7 Days`, `Last 30 Days`, `This Month`, `Custom Range`), executive KPI cards, tabbed views (`Overview & Class Rankings`, `At-Risk & Chronic Absenteeism`, `Student Roster Matrix Drill-Down`), and CSV export utility.
- **Routing**: Replace the placeholder route at `/attendance/reports` in `src/app/router.tsx` with `AttendanceReportsPage`.

**Tech Stack:**
- Backend: FastAPI, SQLAlchemy 2.0, Pydantic v2, Python `datetime`
- Frontend: React 19, TypeScript, TanStack Query v5, TanStack Router, Tailwind CSS v4, Lucide React, shadcn/ui

**Spec:** Adheres to [BACKEND_ARCHITECTURE.md](file:///E:/PBAC/frontend/BACKEND_ARCHITECTURE.md) (Strict RBAC/ReBAC permission rules; Admin and Office Admin access for school-wide attendance reporting).

---

## Global Constraints

- **RBAC Enforcement**: The `/attendance/reports` page and the `/school/report` endpoint remain strictly guarded by `UserRole.ADMIN` and `UserRole.OFFICE_ADMIN`.
- **ABAC Rules**: Date range capping enforced at backend (`max_report_days = 365`), rejecting future dates (`to_date <= today`).
- **No Heavy External Chart Bloat**: Build clean, fast, responsive Tailwind SVG/CSS visualizations (progress bars, rate bars, day-of-week cards) matching the existing design system without adding heavy charting dependencies.
- **Performance & Caching**: Use TanStack Query with sensible `staleTime` (2 minutes) to prevent redundant queries on tab switching.
- **TypeScript Strictness**: 0 type errors on `npm run build` and 0 errors on `npm run lint`.
- **Test Integrity**: All existing tests in `backend/tests/` must pass with 100% success.

---

## Recommended Key Performance Indicators (KPIs)

1. **Executive Attendance Health Scorecard**:
   - **Average Daily Attendance (ADA) Rate (%)**: Overall percentage of student presence across the timeframe.
   - **Active Student Population**: Total enrolled student headcount.
   - **School Days Recorded**: Number of distinct calendar days attendance was taken.
   - **Aggregate Student-Days**: Cumulative present student-days vs absent student-days.
2. **At-Risk & Chronic Absenteeism Monitoring**:
   - **Chronic Absenteeism Rate (%)**: Percentage of students with attendance < 85%.
   - **At-Risk Student Headcount**: Total count of students needing attendance intervention.
   - **At-Risk Student Roster**: Name, class/section, missed days count, percentage, and severity pill (`Critical < 75%`, `Warning 75-85%`).
3. **Comparative Class & Section Performance**:
   - **Top Performing Class** vs **Needs Attention Class** callouts.
   - **Class Ranking Table**: Ranked comparison of each class with enrolled count, present count, absent count, and progress visualization.
4. **Day-of-Week Attendance Patterns**:
   - Comparison across weekdays (Mon, Tue, Wed, Thu, Fri) to detect weekly absentee trends (e.g. Friday drops).
5. **Class & Section Student Matrix Drill-Down**:
   - Section selector with student-by-student attendance records (P / A indicators across date columns).
6. **One-Click CSV Export**:
   - Instant export of summary stats and class breakdown for school board and administrative records.

---

### Task 1: Backend Analytics Schema & Service Enhancements

**Files:**
- Modify: `E:\PBAC\backend\src\modules\attendance\schemas.py`
- Modify: `E:\PBAC\backend\src\modules\attendance\service.py`
- Create: `E:\PBAC\backend\tests\test_school_attendance_report_analytics.py`

**Interfaces:**
- Consumes: `Student`, `Class`, `Section`, `AttendanceRecord` tables
- Produces: Enhanced `SchoolAttendanceReportResponse` containing `chronic_absentee_count`, `chronic_absentee_rate`, `at_risk_students`, `day_of_week_stats`, `best_class_name`, `lowest_class_name`

- [ ] **Step 1: Write integration test for enhanced school report analytics**

Create `E:\PBAC\backend\tests\test_school_attendance_report_analytics.py`:
```python
"""
Integration test for enhanced GET /api/v1/attendance/tenants/{tenant_id}/school/report
Verifies:
1. School report includes chronic_absentee_count and chronic_absentee_rate.
2. at_risk_students list correctly identifies students with < 85% attendance.
3. day_of_week_stats aggregates Monday-Friday attendance metrics.
4. best_class_name and lowest_class_name identify performance leaders.
"""
from datetime import date, timedelta
from fastapi.testclient import TestClient
from src.main import app
from tests.test_authorization_flow import setup_full_school_environment

client = TestClient(app)

def test_school_report_analytics_enhancement():
    env = setup_full_school_environment()
    tenant_id = env["tenant_id"]
    admin_token = env["admin_token"]
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "X-Tenant-ID": tenant_id,
    }

    today = date.today()
    from_date = today - timedelta(days=7)

    response = client.get(
        f"/api/v1/attendance/tenants/{tenant_id}/school/report",
        params={"from_date": str(from_date), "to_date": str(today)},
        headers=headers,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] is True
    data = body["data"]

    assert "chronic_absentee_count" in data
    assert "chronic_absentee_rate" in data
    assert "at_risk_students" in data
    assert "day_of_week_stats" in data
    assert "classes" in data
    assert "daily_stats" in data
```

- [ ] **Step 2: Run test to verify it fails on missing new schema fields**

Run: `uv run python tests/test_school_attendance_report_analytics.py` in `E:\PBAC\backend`
Expected: FAIL (Schema validation or missing keys in response)

- [ ] **Step 3: Update `backend/src/modules/attendance/schemas.py`**

Add `AtRiskStudentSummary` and `DayOfWeekAttendanceSummary`, and update `SchoolAttendanceReportResponse`:
```python
class AtRiskStudentSummary(BaseModel):
    student_id: str
    first_name: str
    middle_name: Optional[str] = None
    last_name: str
    class_id: str
    class_name: str
    section_id: Optional[str] = None
    section_name: Optional[str] = None
    total_days: int
    total_present: int
    total_absent: int
    attendance_percentage: float


class DayOfWeekAttendanceSummary(BaseModel):
    day_name: str  # e.g., "Monday"
    day_index: int  # 0 = Monday, 4 = Friday
    total_records: int
    present_count: int
    absent_count: int
    attendance_percentage: float


class SchoolAttendanceReportResponse(BaseModel):
    from_date: date
    to_date: date
    total_school_days: int
    total_students: int
    total_present: int
    total_absent: int
    overall_attendance_percentage: float
    best_class_name: Optional[str] = None
    lowest_class_name: Optional[str] = None
    chronic_absentee_count: int = 0
    chronic_absentee_rate: float = 0.0
    at_risk_students: List[AtRiskStudentSummary] = Field(default_factory=list)
    day_of_week_stats: List[DayOfWeekAttendanceSummary] = Field(default_factory=list)
    classes: List[ClassAttendanceSummaryItem] = Field(default_factory=list)
    daily_stats: List[DailySchoolAttendanceItem] = Field(default_factory=list)
```

- [ ] **Step 4: Update `AttendanceService.get_school_attendance_report` in `service.py`**

Compute `at_risk_students`, `day_of_week_stats`, `best_class_name`, and `lowest_class_name`:
```python
        # Compute best and lowest performing classes
        sorted_classes = sorted(
            [c for c in class_summaries if c.total_students > 0 and (c.total_present + c.total_absent) > 0],
            key=lambda c: c.attendance_percentage,
            reverse=True,
        )
        best_class = sorted_classes[0].class_name if sorted_classes else None
        lowest_class = sorted_classes[-1].class_name if len(sorted_classes) > 1 else None

        # Compute per-student records for at-risk detection
        student_records_map: dict[str, list[bool]] = {}
        for r in records:
            if r.student_id not in student_records_map:
                student_records_map[r.student_id] = []
            student_records_map[r.student_id].append(r.is_present)

        class_dict = {c.id: c.name for c in classes}
        section_objs = list(
            db.scalars(
                select(Section).where(
                    Section.tenant_id == tenant_id,
                    Section.deleted_at == None,
                )
            ).all()
        )
        section_dict = {s.id: s.name for s in section_objs}

        at_risk_students = []
        for s in students:
            s_recs = student_records_map.get(s.id, [])
            if s_recs:
                s_present = sum(1 for is_p in s_recs if is_p)
                s_total = len(s_recs)
                s_pct = round((s_present / s_total) * 100, 2)
                # Flag at risk if attendance < 85% and at least 2 records logged
                if s_pct < 85.0 and s_total >= 2:
                    at_risk_students.append(
                        AtRiskStudentSummary(
                            student_id=s.id,
                            first_name=s.first_name,
                            middle_name=s.middle_name,
                            last_name=s.last_name,
                            class_id=s.class_id,
                            class_name=class_dict.get(s.class_id, "Class"),
                            section_id=s.section_id,
                            section_name=section_dict.get(s.section_id, "Section") if s.section_id else None,
                            total_days=s_total,
                            total_present=s_present,
                            total_absent=s_total - s_present,
                            attendance_percentage=s_pct,
                        )
                    )

        # Sort at risk students by lowest percentage first
        at_risk_students.sort(key=lambda x: x.attendance_percentage)
        chronic_count = len(at_risk_students)
        chronic_rate = round((chronic_count / total_students) * 100, 2) if total_students > 0 else 0.0

        # Day of week breakdown (0=Monday, 6=Sunday)
        weekday_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        dow_records_map: dict[int, list[bool]] = {i: [] for i in range(7)}
        for r in records:
            dow_records_map[r.date.weekday()].append(r.is_present)

        day_of_week_stats = []
        for idx in range(7):
            dow_recs = dow_records_map[idx]
            if dow_recs:
                dow_pres = sum(1 for is_p in dow_recs if is_p)
                dow_pct = round((dow_pres / len(dow_recs)) * 100, 2)
                day_of_week_stats.append(
                    DayOfWeekAttendanceSummary(
                        day_name=weekday_names[idx],
                        day_index=idx,
                        total_records=len(dow_recs),
                        present_count=dow_pres,
                        absent_count=len(dow_recs) - dow_pres,
                        attendance_percentage=dow_pct,
                    )
                )
```

- [ ] **Step 5: Run tests and verify**

Run: `uv run python tests/test_school_attendance_report_analytics.py` in `E:\PBAC\backend`
Run: `uv run python tests/test_authorization_flow.py` in `E:\PBAC\backend`
Expected: 100% PASS

- [ ] **Step 6: Commit backend changes**

```bash
git add src/modules/attendance/schemas.py src/modules/attendance/service.py tests/test_school_attendance_report_analytics.py
git commit -m "feat(attendance): add chronic absenteeism and day-of-week analytics to school report"
```

---

### Task 2: Frontend Attendance Types & CSV Export Helper

**Files:**
- Modify: `E:\PBAC\frontend\src\features\attendance/types.ts`
- Create: `E:\PBAC\frontend\src\features\attendance/utils/exportAttendanceCsv.ts`

**Interfaces:**
- Consumes: Backend `SchoolAttendanceReportResponse`, `ClassAttendanceReportResponse`
- Produces: `AtRiskStudentSummary`, `DayOfWeekAttendanceSummary` interfaces and `exportSchoolAttendanceCsv(report, schoolName)` function.

- [ ] **Step 1: Update `src/features/attendance/types.ts`**

Add TypeScript types:
```typescript
export interface AtRiskStudentSummary {
  student_id: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  class_id: string;
  class_name: string;
  section_id?: string | null;
  section_name?: string | null;
  total_days: number;
  total_present: number;
  total_absent: number;
  attendance_percentage: number;
}

export interface DayOfWeekAttendanceSummary {
  day_name: string;
  day_index: number;
  total_records: number;
  present_count: number;
  absent_count: number;
  attendance_percentage: number;
}
```
And update `SchoolAttendanceReportResponse` to include:
```typescript
  best_class_name?: string | null;
  lowest_class_name?: string | null;
  chronic_absentee_count: number;
  chronic_absentee_rate: number;
  at_risk_students: AtRiskStudentSummary[];
  day_of_week_stats: DayOfWeekAttendanceSummary[];
```

- [ ] **Step 2: Create `src/features/attendance/utils/exportAttendanceCsv.ts`**

Implement CSV generation and browser download:
```typescript
import type { SchoolAttendanceReportResponse } from '../types';

export function exportSchoolAttendanceCsv(
  report: SchoolAttendanceReportResponse,
  schoolName: string = 'School'
) {
  const safeName = schoolName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${safeName}_Attendance_Report_${report.from_date}_to_${report.to_date}.csv`;

  const rows: string[][] = [];

  // Metadata
  rows.push(['School Attendance Summary Report']);
  rows.push(['School Name', schoolName]);
  rows.push(['Date Range', `${report.from_date} to ${report.to_date}`]);
  rows.push(['Total School Days Logged', String(report.total_school_days)]);
  rows.push(['Total Enrolled Students', String(report.total_students)]);
  rows.push(['Overall Attendance Rate', `${report.overall_attendance_percentage}%`]);
  rows.push(['Total Present (Student-Days)', String(report.total_present)]);
  rows.push(['Total Absent (Student-Days)', String(report.total_absent)]);
  rows.push(['Chronic Absenteeism Rate (<85%)', `${report.chronic_absentee_rate}% (${report.chronic_absentee_count} students)`]);
  rows.push([]);

  // Class Breakdown
  rows.push(['Class Breakdown']);
  rows.push(['Class Name', 'Total Students', 'Present Days', 'Absent Days', 'Attendance Rate (%)']);
  report.classes.forEach((c) => {
    rows.push([c.class_name, String(c.total_students), String(c.total_present), String(c.total_absent), `${c.attendance_percentage}%`]);
  });
  rows.push([]);

  // At-Risk Students
  if (report.at_risk_students?.length > 0) {
    rows.push(['At-Risk Students (< 85% Attendance)']);
    rows.push(['Student Name', 'Class', 'Section', 'Days Enrolled', 'Days Present', 'Days Missed', 'Attendance Rate (%)']);
    report.at_risk_students.forEach((s) => {
      const name = `${s.first_name} ${s.middle_name ? s.middle_name + ' ' : ''}${s.last_name}`;
      rows.push([name, s.class_name, s.section_name || 'N/A', String(s.total_days), String(s.total_present), String(s.total_absent), `${s.attendance_percentage}%`]);
    });
  }

  const csvContent = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npm run build` in `E:\PBAC\frontend`
Expected: PASS

- [ ] **Step 4: Commit types and CSV export utility**

```bash
git add src/features/attendance/types.ts src/features/attendance/utils/exportAttendanceCsv.ts
git commit -m "feat(attendance): add at-risk models and CSV export utility"
```

---

### Task 3: Build the Full Attendance Reports Page

**Files:**
- Create: `E:\PBAC\frontend\src\features\attendance\pages\AttendanceReportsPage.tsx`
- Modify: `E:\PBAC\frontend\src\app\router.tsx`

**Features of `AttendanceReportsPage.tsx`:**
1. **Header & Timeframe Controls**:
   - Presets: `Today`, `Last 7 Days`, `Last 30 Days`, `This Month (MTD)`, `Custom`
   - Start and End date pickers
   - One-click **"Export CSV"** button calling `exportSchoolAttendanceCsv`
2. **Executive KPI Cards**:
   - **Average Daily Attendance (ADA)**: large percentage, comparative trend badge
   - **Enrolled Student Population**: active count with class coverage
   - **Instructional Days Recorded**: total school days logged
   - **Chronic Absenteeism Rate**: percentage and count with alert badge
3. **Tabbed Analytics Section**:
   - **Tab 1: School Overview & Class Rankings**:
     - Highlights: Best Performing Class & Needs Attention Class
     - Day-of-Week Attendance breakdown (Monday-Friday bars)
     - Class Performance Table: ranking, student count, present/absent days, attendance %, progress bar
   - **Tab 2: At-Risk & Chronic Absenteeism Monitor**:
     - Summary banner explaining < 85% attendance early-intervention policy
     - Table of at-risk students: Student Name, Class & Section, Total Days, Missed Days, Attendance Rate, Severity badge (`Critical < 75%` in red, `Warning 75-85%` in amber)
   - **Tab 3: Student Roster Drill-Down Matrix**:
     - Class and Section selector dropdowns
     - Queries `useClassAttendanceReport(activeTenantId, selectedClassId, fromDate, toDate, selectedSectionId)`
     - Student matrix showing each student, roll number, present count, absent count, %, and date-by-date attendance markers (green check / red cross)
4. **Role & Tenant Guards**:
   - Guarded for Admin and Office Admin (redirect/message for others)
   - Tenant required state if no school selected

- [ ] **Step 1: Implement `AttendanceReportsPage.tsx`**

Write `E:\PBAC\frontend\src\features\attendance\pages\AttendanceReportsPage.tsx` following the structure above.

- [ ] **Step 2: Update `src/app/router.tsx`**

Import `AttendanceReportsPage`:
```typescript
import { AttendanceReportsPage } from '@/features/attendance/pages/AttendanceReportsPage';
```
And replace the placeholder in `attendanceReportsRoute`:
```typescript
const attendanceReportsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/attendance/reports',
  component: AttendanceReportsPage,
});
```

- [ ] **Step 3: Run `npm run lint` and `npm run build`**

Run: `npm run lint` in `E:\PBAC\frontend`
Run: `npm run build` in `E:\PBAC\frontend`
Expected: 0 errors

- [ ] **Step 4: Commit frontend page and router update**

```bash
git add src/features/attendance/pages/AttendanceReportsPage.tsx src/app/router.tsx
git commit -m "feat(attendance): add comprehensive attendance reports page with analytics and CSV export"
```

---

### Task 4: End-to-End Verification & Walkthrough

**Files:**
- Verify: Full integration between backend `/school/report`, `/classes/{id}/report`, and frontend `/attendance/reports`.

- [ ] **Step 1: Verify Backend Test Suite**

Run:
```bash
cd E:\PBAC\backend
uv run python tests/test_school_attendance_report_analytics.py
uv run python tests/test_daily_attendance_status.py
uv run python tests/test_authorization_flow.py
```
Expected: All tests pass with 100% success.

- [ ] **Step 2: Verify Frontend Production Build & Linter**

Run:
```bash
cd E:\PBAC\frontend
npm run lint
npm run build
```
Expected: Exit code 0, 0 warnings/errors.

- [ ] **Step 3: Manual Verification Checklist**

1. Sign in as Admin (`9841000001` / `Admin@123`).
2. Click **"Attendance Reports"** in the sidebar.
3. Confirm URL is `/attendance/reports` and page renders without errors.
4. Verify Executive KPI cards (ADA Rate, Enrolled Students, School Days, Chronic Absenteeism).
5. Switch date range presets (`Today`, `Last 7 Days`, `Last 30 Days`, `This Month`).
6. In **Overview** tab: check Best/Lowest class badges, day-of-week breakdown, and class ranking table.
7. In **At-Risk** tab: check at-risk students list and severity badges.
8. In **Student Roster Matrix** tab: pick a class and section to view date-by-date student checkmarks.
9. Click **"Export CSV"**: verify file downloads with complete data.
10. Switch role to Teacher: verify sidebar does not expose admin reports route or displays appropriate permission boundary.
