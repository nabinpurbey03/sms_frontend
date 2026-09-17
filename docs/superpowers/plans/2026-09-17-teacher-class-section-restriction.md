# Teacher Class & Section Scoping and Parent Linking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restrict teacher login views so teachers only see and access class details for sections where they are the designated Class Teacher, while preserving their ability to mark daily attendance and link/unlink parents for their students.

**Architecture:** Dual-layer ReBAC (Relationship-Based Access Control) architecture. The backend enforces section-level data filtering in `list_sections` and `list_students`, grants teachers permission to search parent phone numbers, and verifies Class Teacher status before linking/unlinking parents. The frontend scopes `ClassDetailPage.tsx` and `ClassesPage.tsx` so only designated Class Teacher sections appear, preselects their section, displays the attendance shortcut, and exposes the parent linking dialog.

**Tech Stack:** FastAPI, SQLAlchemy 2.0, PostgreSQL, Pytest (Backend) / React 19, Vite, TanStack Router & Query, Tailwind CSS, Lucide React, Sonner (Frontend).

---

## Global Constraints

- Never allow a teacher to view or manipulate student records from sections where they are not the designated Class Teacher.
- Admins and Office Admins retain full school-wide visibility across all classes and sections.
- Strict single-parent linking rule per student is preserved.
- Existing attendance locking rules (future dates blocked, 7-day cutoff) remain in effect.
- All backend changes must pass automated Pytest tests; all frontend changes must pass `npm run build` with zero TypeScript errors.

---

## User Review Required

> [!IMPORTANT]
> **Class Teachers vs Subject Teachers Scope:**
> Under this plan, the dedicated **Class Details Page (`/academic/classes/$classId`)** becomes an administrative management portal specifically for **Class Teachers** managing their classroom roster. 
> - If a teacher is *only* a Subject Teacher in a class (e.g., teaching Science to Class 8-B, but not the Class Teacher of Class 8-B), they will not have roster management access to Class 8-B. (Subject teachers view their curriculum under `/academic/subjects` and enter exam scores under `/examinations/scores`).
> - If a teacher is the Class Teacher for **Section A** of Class 10, when they view Class 10 they will *only* see **Section A**. Other sections (Section B, Section C) are completely hidden from their view.

---

## Proposed Changes

### Backend Component (`E:\PBAC\backend`)

#### [MODIFY] `src/modules/identity/router.py`
- Update `GET /tenants/{tenant_id}/members/search-by-phone` dependency to include `UserRole.TEACHER`. This enables teachers to look up a parent's registered account by phone number in the parent link dialog.

#### [MODIFY] `src/modules/academic/routers/parents.py`
- Update `POST /parents/link`, `DELETE /parents/{parent_id}/students/{student_id}`, and `DELETE /students/{student_id}/parent` route dependencies to include `UserRole.TEACHER`.

#### [MODIFY] `src/modules/academic/service.py`
- In `AcademicService.link_parent_to_student`: If the caller is a Teacher (not Admin/Office Admin), query `TeacherAssignment` to verify the teacher is the designated Class Teacher (`is_class_teacher == True`) for the student's `class_id` and (`section_id == student.section_id` or `section_id is None`). If not, raise `ForbiddenException("Access denied: You can only link parents for students in your assigned Class Teacher section.")`.
- In `AcademicService.unlink_parent_student`: If caller is a Teacher, perform the same ReBAC verification.
- In `AcademicService.list_sections`: If the caller is a Teacher, filter the query so only sections where the teacher has `is_class_teacher == True` are returned.
- In `AcademicService.list_students`: If the caller is a Teacher, filter the student query to only include students in sections where the teacher has `is_class_teacher == True`.

#### [NEW] `tests/test_teacher_class_section_restriction.py`
- Pytest test suite testing:
  1. Teacher can only list their own section in `GET /classes/{class_id}/sections`.
  2. Teacher can only list students belonging to their section in `GET /classes/{class_id}/students`.
  3. Teacher can search parent by phone (`GET /tenants/{tenant_id}/members/search-by-phone`).
  4. Teacher can link and unlink parent for a student in their Class Teacher section.
  5. Teacher is forbidden (403) from linking a parent for a student in another section where they are NOT Class Teacher.

---

### Frontend Component (`E:\PBAC\frontend`)

#### [MODIFY] `src/features/academic/pages/ClassDetailPage.tsx`
- Refactor access gate: require `isClassTeacherForThisClass` instead of any generic teacher assignment.
- Filter `sections` to only those where the teacher has `is_class_teacher === true`.
- Preselect their designated section so only their section roster is active.
- Ensure the "Mark Today's Attendance (Sec X)" button and "Associate / Manage Parent" dropdown action are clearly accessible and active for Class Teachers.

#### [MODIFY] `src/features/academic/pages/ClassesPage.tsx`
- In `scopedClasses`, filter classes for teachers to those where they are designated Class Teacher (`teacherScope.isClassTeacher === true`), so other classes where they only teach a subject do not clutter their roster view.
- Ensure Section pills and metrics on `ClassCard` reflect their designated section.

---

## Tasks Breakdown

### Task 1: Backend Parent Search & ReBAC Parent Linking Authorization

**Files:**
- Modify: `src/modules/identity/router.py:220-240`
- Modify: `src/modules/academic/routers/parents.py:28-55, 240-280`
- Modify: `src/modules/academic/service.py:2030-2130, 2200-2260`
- Test: `tests/test_teacher_class_section_restriction.py`

**Interfaces:**
- `GET /api/v1/identity/tenants/{tenant_id}/members/search-by-phone` -> allows `UserRole.TEACHER`.
- `POST /api/v1/academic/tenants/{tenant_id}/parents/link` -> allows `UserRole.TEACHER` with ReBAC check.
- `DELETE /api/v1/academic/tenants/{tenant_id}/parents/{parent_id}/students/{student_id}` -> allows `UserRole.TEACHER` with ReBAC check.

- [ ] **Step 1: Write failing Pytest tests for teacher parent linking**
Create `tests/test_teacher_class_section_restriction.py` testing that a Class Teacher can search a parent by phone and link a parent to their student, but is rejected (403) when attempting to link a student in another section.

- [ ] **Step 2: Run pytest to verify failure**
Run: `.\.venv\Scripts\pytest tests/test_teacher_class_section_restriction.py`
Expected: FAIL with 403 Forbidden on phone search or missing ReBAC enforcement.

- [ ] **Step 3: Update `identity/router.py` and `academic/routers/parents.py`**
Allow `UserRole.TEACHER` in `require_roles(...)` for `search_user_by_phone`, `link_parent_student`, and `unlink_parent_student`.

- [ ] **Step 4: Update `AcademicService.link_parent_to_student` and `unlink_parent_student` in `service.py`**
Add ReBAC check verifying that if caller is a Teacher, the target student is in their assigned Class Teacher section.

- [ ] **Step 5: Run pytest to verify all tests pass**
Run: `.\.venv\Scripts\pytest tests/test_teacher_class_section_restriction.py`
Expected: PASS.

- [ ] **Step 6: Commit backend parent linking changes**
```bash
git add src/modules/identity/router.py src/modules/academic/routers/parents.py src/modules/academic/service.py tests/test_teacher_class_section_restriction.py
git commit -m "feat(academic): allow class teachers to search and link parents for their assigned section students"
```

---

### Task 2: Backend Class & Section Query Scoping for Teachers

**Files:**
- Modify: `src/modules/academic/routers/sections.py:65-90`
- Modify: `src/modules/academic/routers/students.py:55-75`
- Modify: `src/modules/academic/service.py:560-585, 660-675`
- Test: `tests/test_teacher_class_section_restriction.py`

**Interfaces:**
- `GET /classes/{class_id}/sections`: returns only sections where teacher is Class Teacher.
- `GET /classes/{class_id}/students`: returns only students in the teacher's Class Teacher section.

- [ ] **Step 1: Add test cases to `tests/test_teacher_class_section_restriction.py`**
Test that when a Teacher calls `GET /classes/{class_id}/sections` and `GET /classes/{class_id}/students`, only the section and students where they are designated Class Teacher are returned.

- [ ] **Step 2: Run pytest to confirm tests fail**
Run: `.\.venv\Scripts\pytest tests/test_teacher_class_section_restriction.py -k "test_teacher_section_scoping"`
Expected: FAIL.

- [ ] **Step 3: Implement scoping in `AcademicService.list_sections` and `list_students`**
Pass `member` context or `teacher_id` to filter by `TeacherAssignment.is_class_teacher == True`.

- [ ] **Step 4: Run pytest to verify pass**
Run: `.\.venv\Scripts\pytest tests/test_teacher_class_section_restriction.py`
Expected: PASS.

- [ ] **Step 5: Commit backend section scoping**
```bash
git add src/modules/academic/routers/sections.py src/modules/academic/routers/students.py src/modules/academic/service.py tests/test_teacher_class_section_restriction.py
git commit -m "feat(academic): scope section and student listings to designated class teacher section for teachers"
```

---

### Task 3: Frontend Class Detail Page Scoping & Section Lock

**Files:**
- Modify: `src/features/academic/pages/ClassDetailPage.tsx:130-225, 410-440`

- [ ] **Step 1: Scope `ClassDetailPage.tsx` to Class Teachers only**
Replace `isTeacherAssignedToThisClass` with `isClassTeacherForThisClass`. If a teacher is only a subject teacher, show the restricted access card informing them that only designated Class Teachers manage student rosters.

- [ ] **Step 2: Filter `sections` to designated Class Teacher sections**
Compute `teacherClassSections` from `myAssignments`. Default `currentSection` to the assigned section. Hide other sections from the section pills.

- [ ] **Step 3: Verify Attendance and Parent Link action buttons**
Ensure the top "Mark/Update Today's Attendance (Sec X)" button is active. Ensure student roster dropdown "Associate / Manage Parent" opens `ParentStudentLinkDialog` seamlessly for the Class Teacher.

- [ ] **Step 4: Verify build**
Run: `npm run build` in `E:\PBAC\frontend`.
Expected: Exit code 0.

- [ ] **Step 5: Commit frontend ClassDetailPage changes**
```bash
git add src/features/academic/pages/ClassDetailPage.tsx
git commit -m "feat(academic): restrict class detail page to class teacher section and enable parent linking"
```

---

### Task 4: Frontend Classes Page Scoping & Section Badge Refinement

**Files:**
- Modify: `src/features/academic/pages/ClassesPage.tsx:170-255`
- Modify: `src/features/academic/components/ClassCard.tsx:170-220`

- [ ] **Step 1: Scope `ClassesPage.tsx` for teachers**
Update `scopedClasses` so teachers only see classes where they are designated Class Teacher (`teacherScope.isClassTeacher === true`).

- [ ] **Step 2: Update `ClassCard.tsx`**
For teachers, only show section pills for sections where they are the Class Teacher, and indicate attendance status for that section.

- [ ] **Step 3: Run frontend build and verification**
Run: `npm run build` in `E:\PBAC\frontend`.
Expected: Exit code 0.

- [ ] **Step 4: Commit frontend ClassesPage changes**
```bash
git add src/features/academic/pages/ClassesPage.tsx src/features/academic/components/ClassCard.tsx
git commit -m "feat(academic): scope classes list page and class card sections for class teachers"
```

---

## Verification Plan

### Automated Tests
1. **Backend Pytest Suite:**
   ```bash
   cd E:\PBAC\backend
   .\.venv\Scripts\pytest tests/test_teacher_class_section_restriction.py -v
   ```
   Must pass 100% with no regressions on existing tests (`tests/test_daily_attendance_status.py`).

2. **Frontend Build Verification:**
   ```bash
   cd E:\PBAC\frontend
   npm run build
   ```
   Must compile with 0 TypeScript and Vite bundling errors.

### Manual Verification
1. Log in as **School Administrator**:
   - Assign Teacher A as Class Teacher for **Class 10 - Section A**.
   - Assign Teacher B as Class Teacher for **Class 10 - Section B**.
   - Assign Teacher A as Subject Teacher for **Class 8 - Mathematics** (no class teacher).
2. Log in as **Teacher A**:
   - Navigate to **Classes & Sections**:
     - Verify only **Class 10** appears (not Class 8).
     - Verify only **Section A** is listed under Class 10.
   - Click into **Class 10 Details**:
     - Verify only **Section A** is available; Section B is not visible.
     - Verify only students enrolled in Section A are visible.
     - Click **"Mark Today's Attendance (Sec A)"** -> navigates directly to `/attendance/mark?classId=...&sectionId=...` and saves attendance.
     - On any student in the roster, click **"Associate Parent"** -> search phone number, select relationship, and successfully link parent.
   - Attempt to access `/academic/classes/{class_8_id}` via direct URL:
     - Verify restricted access screen is displayed with an explanation.
