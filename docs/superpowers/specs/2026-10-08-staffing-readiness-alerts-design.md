# Design Specification: Staffing Readiness Alerts & Unassigned Teacher Awareness

**Date**: 2026-10-08  
**Author**: Antigravity  
**Status**: Approved  
**Target Roles**: `ADMIN`, `OFFICE_ADMIN`

---

## 1. Executive Summary

In a school management system, unassigned Class Teachers (responsible for daily homeroom activities and attendance) and unassigned Subject Teachers (responsible for syllabus progression, grading, and exams) lead to operational disruptions if left unnoticed.

This feature introduces an automated **Staffing Readiness & Gaps Detection System** that keeps School Admins and Office Admins informed through a two-tier UI/UX model:
1. **High-Level Awareness**: A prominent, non-intrusive **Staffing Readiness Alert Banner** on the main Admin Dashboard (`DashboardPage.tsx`) highlighting the exact number of unassigned sections and subjects with a direct `"Review & Assign Teachers →"` action button.
2. **Actionable Workspace Highlighting**: An **`Unassigned (X)`** quick-filter tab on the Teacher Assignments page (`/academic/teacher-assignments?filter=unassigned`) that presents empty teaching slots and allows 1-click assignment via pre-filled dialogs.

---

## 2. Architecture & Data Flow

```
┌────────────────────────────────────────────────────────┐
│                   Admin Dashboard                      │
│            [StaffingReadinessBanner]                   │
│   "⚠️ 2 Sections missing Class Teacher • 4 Subjects"   │
│             [ Review & Assign Teachers → ]             │
└───────────────────────────┬────────────────────────────┘
                            │ Deep links with ?filter=unassigned
                            ▼
┌────────────────────────────────────────────────────────┐
│               Teacher Assignments Page                 │
│  [All]  [Class Teachers]  [Subject Teachers]  [Unassigned (6)]
│  ────────────────────────────────────────────────────  │
│  • Class 10 - Sec B | Class Teacher | [+ Assign]       │
│  • Class 10 - Sec B | Mathematics   | [+ Assign]       │
└───────────────────────────┬────────────────────────────┘
                            │ Calls REST API
                            ▼
┌────────────────────────────────────────────────────────┐
│     GET /academic/tenants/{tenant_id}/teachers/        │
│                    staffing-status                     │
│  Computes active Classes ⨯ Sections ⨯ Subjects vs      │
│  TeacherAssignment records in current Academic Year     │
└────────────────────────────────────────────────────────┘
```

---

## 3. Backend Specification

### 3.1 Endpoint Definition

* **Route**: `GET /api/v1/academic/tenants/{tenant_id}/teachers/staffing-status`
* **Tags**: `Academic · Teachers`
* **Access Control**: `require_roles(UserRole.ADMIN, UserRole.OFFICE_ADMIN)`
* **Query Parameters**:
  * `academic_year_id` *(optional, string)*: ID of the academic year. If omitted or null, defaults to the school's active current academic year.

### 3.2 Response Schema (`StaffingStatusResponse`)

```python
class MissingClassTeacherItem(BaseModel):
    class_id: str
    class_name: str
    section_id: str
    section_name: str

class MissingSubjectTeacherItem(BaseModel):
    class_id: str
    class_name: str
    section_id: str
    section_name: str
    subject_id: str
    subject_name: str
    subject_code: Optional[str] = None

class StaffingSummary(BaseModel):
    total_sections: int
    sections_with_class_teacher: int
    missing_class_teachers_count: int
    total_subject_slots: int
    slots_with_subject_teacher: int
    missing_subject_teachers_count: int

class StaffingStatusResponse(BaseModel):
    academic_year_id: Optional[str] = None
    academic_year_name: Optional[str] = None
    is_fully_staffed: bool
    summary: StaffingSummary
    missing_class_teachers: List[MissingClassTeacherItem]
    missing_subject_teachers: List[MissingSubjectTeacherItem]
```

### 3.3 Business Logic (`AcademicService.get_staffing_status`)

1. **Resolve Academic Year**:
   * If `academic_year_id` is provided, fetch the active record.
   * If omitted, query `AcademicYear` where `is_current == True`, `deleted_at == None`.
   * If no academic year exists, return an empty `StaffingStatusResponse` with `is_fully_staffed = True` and all counts as `0`.
2. **Fetch Structural Entities**:
   * Classes: `Class` where `tenant_id == tenant_id`, `deleted_at == None` ordered by `sequence_order`.
   * Sections: `Section` where `tenant_id == tenant_id`, `deleted_at == None`.
   * Subjects: `Subject` where `tenant_id == tenant_id`, `deleted_at == None`.
   * Existing Assignments: `TeacherAssignment` where `tenant_id == tenant_id`, `academic_year_id == target_year.id`.
3. **Evaluate Gaps**:
   * For each Class and its Sections:
     * **Class Teacher Check**: Lookup assignment with `class_id == cls.id`, `section_id == sec.id`, `is_class_teacher == True`.
       * If absent: Record in `missing_class_teachers`.
     * **Subject Teacher Check**: For each Subject defined in `cls.id`:
       * Lookup assignment with `class_id == cls.id`, `section_id == sec.id`, `subject_id == subj.id`, `is_class_teacher == False`.
       * If absent: Record in `missing_subject_teachers`.
4. **Aggregate Results**:
   * Calculate totals and determine `is_fully_staffed = len(missing_class_teachers) == 0 and len(missing_subject_teachers) == 0`.

---

## 4. Frontend Specification

### 4.1 API & Hook Layer

* **API Method** (`src/features/academic/api.ts`):
  ```typescript
  getStaffingStatus: async (
    tenantId: string,
    academicYearId?: string | null
  ): Promise<StaffingStatusResponse> => {
    const res = await apiClient.get(`/academic/tenants/${tenantId}/teachers/staffing-status`, {
      params: { academic_year_id: academicYearId || undefined }
    });
    return res.data || res;
  }
  ```
* **React Query Hook** (`src/features/academic/hooks.ts`):
  * `useStaffingStatus(tenantId, academicYearId)`
  * Query Key: `['staffing_status', tenantId, academicYearId]`
  * Invalidation: Automatic on assignment creation/deletion (`useAssignClassTeacher`, `useAssignSubjectTeacher`, `useDeleteAssignment`).

### 4.2 Dashboard Banner (`StaffingReadinessBanner.tsx`)

* **Location**: Rendered within `src/features/dashboard/pages/DashboardPage.tsx` above main metric cards.
* **Visibility**: Only rendered if active user has role `ADMIN` or `OFFICE_ADMIN`.
* **State 1 — Gaps Detected (`!is_fully_staffed`)**:
  * Amber border with subtle warm background (`bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200`).
  * Icon: `AlertTriangle` in amber.
  * Summary text: *"Teaching Staffing Incomplete — {N} sections missing Class Teacher • {M} subjects without assigned teachers"*.
  * Action Button: `"Review & Assign Teachers →"` navigating to `/academic/teacher-assignments?filter=unassigned`.
  * Dismiss button (persisted in local/session state if dismissed for the session).
* **State 2 — Fully Staffed (`is_fully_staffed`)**:
  * Subtle compact banner or badge: `ShieldCheck` *"All classes and subjects are 100% staffed for this academic year"*.

### 4.3 Teacher Assignments Page (`TeacherAssignmentsPage.tsx`)

* **Query Parameter**: Inspects `searchParams.filter` (defaults to `ALL` if not set; if `unassigned`, activates unassigned tab).
* **Filter Toolbar**:
  * Tabs: `All (total)`, `Class Teachers (ctCount)`, `Subject Teachers (stCount)`, `Unassigned (gapCount)`.
* **Unassigned View**:
  * Displays vacant rows grouped by Class and Section.
  * Shows role type tag (`Class Teacher` or `Subject: [Name]`).
  * Includes direct `+ Assign Teacher` button which invokes `AssignTeacherDialog` with `classId`, `sectionId`, and `subjectId` pre-selected.

---

## 5. Security & Multi-Tenancy

* All SQL queries strictly scope by `tenant_id == tenant_id`.
* Endpoints require `UserRole.ADMIN` or `UserRole.OFFICE_ADMIN`. Teachers and Parents querying the endpoint receive `403 Forbidden`.
* ReBAC guarantees teacher assignments respect tenant boundaries.

---

## 6. Verification & Testing

1. **Backend Integration Tests** (`tests/test_staffing_status.py`):
   * Test initial state with no teachers assigned $\rightarrow$ reports all sections and subject slots as missing.
   * Test assigning a Class Teacher $\rightarrow$ decreases `missing_class_teachers_count`.
   * Test assigning Subject Teachers $\rightarrow$ decreases `missing_subject_teachers_count`.
   * Test 100% assignment $\rightarrow$ returns `is_fully_staffed == True`.
   * Test role-based authorization $\rightarrow$ non-admins receive 403.
2. **Frontend Type-Check & Build**:
   * Run `npm run build` (`tsc -b && vite build`) to confirm zero TypeScript compilation errors.
