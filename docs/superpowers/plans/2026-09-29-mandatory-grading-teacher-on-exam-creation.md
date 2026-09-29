# Mandatory Grading Teacher on Exam Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent exam creation without assigned grading teachers by enforcing a strict validation rule in the backend exam subject configuration service and providing client-side pre-validation, visual error indicators, and transparent error toast handling in the frontend.

**Architecture:** 
1. Backend (`ExaminationService.add_exam_subject`): Require that every exam subject must have a resolved active grading teacher (`assigned_teacher_id`), either explicitly specified via `teacher_id` or auto-resolved from academic `TeacherAssignment`. If neither exists, reject with HTTP 400 Bad Request (`f"Grading teacher must be assigned for subject '{subject.name}'."`).
2. Frontend (`CreateExamPage.tsx` & `ExamSubjectConfigList.tsx`): Pre-validate all included subjects before API dispatch to ensure each has `assignedTeacherId`; mark the grading teacher field as required with real-time visual validation on unassigned rows; and surface backend API error messages directly in toast notifications instead of swallowing them.

**Tech Stack:** FastAPI, SQLAlchemy 2.0, Pydantic v2, pytest, React 19, TypeScript, Tailwind CSS, shadcn/ui (Table, Input, Select, Badge, Card, sonner toast).

**Spec:** User request: "While creating exam, if i do not assign agrding teacher although i am being able to create an exam, implement error handling and if the grading teacher is not assigned do not let creating exam. We are foucusing on a string backend so if we need to fix that from backend please do so."

## Global Constraints
- Backend: Python 3.12, strict tenant isolation, SQLAlchemy 2.0 ORM, HTTPException/BadRequestException standards.
- Frontend: React 19, TypeScript strict mode (`npx tsc -b`), Vite build.
- Maintain existing auto-assignment behavior: if a subject already has an assigned teacher in the academic class-subject assignments, it auto-populates; if not, an explicit teacher selection is strictly mandatory.

---

### Task 1: Backend - Enforce Mandatory Grading Teacher in Exam Subject Creation

**Files:**
- Modify: `E:\SSUP\backend\src\modules\examination\service.py:221-260`
- Test: `E:\SSUP\backend\tests\test_examination_lifecycle.py:220-265`
- Test: `E:\SSUP\backend\tests\test_examination_analytics.py:178-195`
- Test: `E:\SSUP\backend\tests\test_parent_report_cards.py:252-265`
- Test: `E:\SSUP\backend\tests\test_report_card_pdf_generation.py:195-205`

**Interfaces:**
- Consumes: `ExamSubjectCreate(subject_id: str, full_mark: Decimal, pass_mark: Decimal, teacher_id: Optional[str])`
- Produces: `ExamSubjectResponse` or raises `BadRequestException(message=f"Grading teacher must be assigned for subject '{subject.name}'.")` if `assigned_teacher_id is None`.

- [ ] **Step 1: Write the failing test in `test_examination_lifecycle.py`**

In `E:\SSUP\backend\tests\test_examination_lifecycle.py`, before assigning `teacher_id` to Science, assert that attempting to add `sci_subj_id` without an explicit `teacher_id` (and no auto-assigned subject teacher) returns HTTP 400 Bad Request:

```python
    # 7b. Validation test: adding exam subject without grading teacher rejected
    resp = client.post(
        f"/api/v1/academic/tenants/{tenant_id}/exams/{exam_id}/subjects",
        headers=admin_headers,
        json={"subject_id": sci_subj_id, "full_mark": 100.0, "pass_mark": 35.0},
    )
    assert resp.status_code == 400, f"Expected 400 when grading teacher missing, got {resp.status_code}: {resp.text}"
    assert "Grading teacher must be assigned" in resp.json()["message"]
    print("[PASS] 7b. Exam subject creation without grading teacher rejected with 400.")

    # Now add Science subject with explicit teacher_id
    resp = client.post(
        f"/api/v1/academic/tenants/{tenant_id}/exams/{exam_id}/subjects",
        headers=admin_headers,
        json={"subject_id": sci_subj_id, "full_mark": 100.0, "pass_mark": 35.0, "teacher_id": t2_user_id},
    )
    assert resp.status_code == 201
    exam_sci_id = resp.json()["data"]["id"]
    assert resp.json()["data"]["assigned_teacher_id"] == t2_user_id
```

- [ ] **Step 2: Run test to verify it fails**

Run: `E:\SSUP\backend\.venv\Scripts\pytest.exe tests/test_examination_lifecycle.py`
Expected: FAIL with `AssertionError: Expected 400 when grading teacher missing, got 201`

- [ ] **Step 3: Implement validation in `ExaminationService.add_exam_subject`**

In `E:\SSUP\backend\src\modules\examination\service.py` inside `add_exam_subject`:
```python
        assigned_teacher_id = None
        if obj_in.teacher_id:
            t_role = db.scalar(
                select(TenantUserRole).where(
                    TenantUserRole.tenant_id == tenant_id,
                    TenantUserRole.user_id == obj_in.teacher_id,
                    TenantUserRole.role == UserRole.TEACHER.value,
                    TenantUserRole.is_active == True,
                )
            )
            if not t_role:
                raise BadRequestException(message="Specified user is not an active teacher in this school.")
            assigned_teacher_id = obj_in.teacher_id
        else:
            # Auto-assign from existing subject teacher assignment in this class
            from src.modules.academic.models import TeacherAssignment
            subject_assignment = db.scalar(
                select(TeacherAssignment).where(
                    TeacherAssignment.tenant_id == tenant_id,
                    TeacherAssignment.class_id == exam.class_id,
                    TeacherAssignment.subject_id == obj_in.subject_id,
                    TeacherAssignment.is_class_teacher == False,
                    TeacherAssignment.deleted_at == None,
                ).order_by(TeacherAssignment.created_at.desc())
            )
            if subject_assignment:
                assigned_teacher_id = subject_assignment.teacher_id

        if not assigned_teacher_id:
            raise BadRequestException(
                message=f"Grading teacher must be assigned for subject '{subject.name}'."
            )
```

Also update calls in `tests/test_examination_analytics.py`, `tests/test_parent_report_cards.py`, and `tests/test_report_card_pdf_generation.py` where `POST /exams/{id}/subjects` was invoked without `teacher_id` or an auto-assigned teacher, supplying the test teacher's ID.

- [ ] **Step 4: Run backend tests to verify they pass**

Run:
```bash
E:\SSUP\backend\.venv\Scripts\pytest.exe tests/test_examination_lifecycle.py tests/test_examination_analytics.py tests/test_parent_report_cards.py tests/test_report_card_pdf_generation.py
```
Expected: PASS (all tests pass, 0 failures)

- [ ] **Step 5: Commit backend changes**

```bash
git add src/modules/examination/service.py tests/test_examination_lifecycle.py tests/test_examination_analytics.py tests/test_parent_report_cards.py tests/test_report_card_pdf_generation.py
git commit -m "fix(examination): enforce mandatory grading teacher on exam subject creation"
```

---

### Task 2: Frontend - Client-Side Validation, Visual Warnings, and Error Handling

**Files:**
- Modify: `E:\SSUP\frontend\src\features\examination\components\ExamSubjectConfigList.tsx`
- Modify: `E:\SSUP\frontend\src\features\examination\pages\CreateExamPage.tsx`

**Interfaces:**
- Consumes: `SubjectConfigItem.assignedTeacherId`, `classSubjectConfigs`
- Produces: Form pre-validation blocking submission if any included subject lacks `assignedTeacherId`, visual warning/error state on select dropdowns, and transparent error toast handling.

- [ ] **Step 1: Update `ExamSubjectConfigList.tsx` to highlight mandatory grading teacher**

In `E:\SSUP\frontend\src\features\examination\components\ExamSubjectConfigList.tsx`:
1. In desktop table header (`<TableHead className="w-[280px]">`):
   Change label to:
   ```tsx
   <TableHead className="w-[280px]">
     Grading Teacher <span className="text-destructive">*</span>
   </TableHead>
   ```
2. In `<select>` element (desktop and mobile):
   Change the unassigned placeholder option from:
   `-- Select Grading Teacher (Optional) --`
   to:
   `-- Select Grading Teacher --`
3. Style the `<select>` with validation borders when `item.included && !item.assignedTeacherId`:
   ```tsx
   className={cn(
     "w-full h-9 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
     item.included && !item.assignedTeacherId
       ? "border-amber-500/80 focus:ring-amber-500 text-amber-900 dark:text-amber-100"
       : "border-input focus:ring-primary"
   )}
   ```
4. Below the select dropdown, if `item.included && !item.assignedTeacherId`:
   Render a clear warning message:
   ```tsx
   <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
     * Grading teacher is required
   </p>
   ```
5. Apply the same updates to the mobile card layout.

- [ ] **Step 2: Update `CreateExamPage.tsx` client-side validation and error handling**

In `E:\SSUP\frontend\src\features\examination\pages\CreateExamPage.tsx`:
1. In `handleSubmit`, add validation for missing grading teachers across all selected classes:
   ```tsx
   // Pre-validate subjects for all selected classes
   for (const classId of selectedClassIds) {
     const classConfigs = classSubjectConfigs[classId] || [];
     const included = classConfigs.filter((s) => s.included);
     
     if (included.length === 0) {
       toast.error('Validation Error', {
         description: `At least one subject must be included for each selected class.`,
       });
       return;
     }
     
     const hasInvalidMarks = included.some(
       (s) => s.passMark > s.fullMark || s.fullMark < 1 || s.passMark < 0
     );
     if (hasInvalidMarks) {
       toast.error('Validation Error', {
         description: 'Pass mark cannot exceed full mark, and full mark must be at least 1.',
       });
       return;
     }

     const unassignedSubjects = included.filter((s) => !s.assignedTeacherId);
     if (unassignedSubjects.length > 0) {
       const cls = classes.find((c) => c.id === classId);
       const subjectNames = unassignedSubjects.map((s) => s.subjectName).join(', ');
       toast.error('Validation Error', {
         description: `Please assign a grading teacher for all included subjects in ${cls?.name || 'the selected class'}: ${subjectNames}.`,
       });
       return;
     }
   }
   ```
2. In the `catch (err: any)` block of `handleSubmit`, extract the backend error message:
   ```tsx
   } catch (err: any) {
     console.error('Failed to create examinations:', err);
     const errorMessage =
       err?.response?.data?.message ||
       err?.response?.data?.detail ||
       err?.message ||
       'Failed to create some examinations. Please check the logs.';
     toast.error('Failed to create examinations', {
       description: errorMessage,
     });
   }
   ```

- [ ] **Step 3: Verify TypeScript compilation and frontend build**

Run: `npx tsc -b`
Expected: Exits with code 0.
Run: `npm run build`
Expected: Build succeeds without errors.

- [ ] **Step 4: Commit frontend changes**

```bash
git add src/features/examination/components/ExamSubjectConfigList.tsx src/features/examination/pages/CreateExamPage.tsx
git commit -m "fix(examination): add validation and visual feedback for required grading teachers"
```

---

### Task 3: Full Verification

**Files:**
- N/A (Verification across backend & frontend repositories)

- [ ] **Step 1: Run complete backend pytest suite for examination module**

Run:
```bash
E:\SSUP\backend\.venv\Scripts\pytest.exe tests/test_examination_lifecycle.py tests/test_examination_analytics.py tests/test_parent_report_cards.py tests/test_report_card_pdf_generation.py
```
Expected: All 8 test cases pass.

- [ ] **Step 2: Run frontend build verification**

Run:
```bash
npx tsc -b
npm run build
```
Expected: Build succeeds cleanly.
