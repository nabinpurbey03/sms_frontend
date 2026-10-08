# Section-Scoped Exam Grading, Partial Drafts & Compulsory Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable section-scoped exam score entry so teachers only grade students in the sections they teach, allow partial draft saves without requiring all marks upfront, and strictly enforce compulsory score completion and boundary validation before submission for approval.

**Architecture:**
1. **Academic Scoping:** Relax single-teacher-per-subject constraint in `AcademicService.create_teacher_assignment` to be section-scoped, allowing different teachers to be assigned to the same subject across different sections (e.g. Teacher Ram for Class 10 Section A Math, Teacher Shyam for Class 10 Section B Math).
2. **ReBAC & Examination Access:** Update `require_exam_subject_edit_permission` and `bulk_upsert_scores` so authorization checks whether a teacher is assigned to teach that subject for the target student's section. Non-admin teachers are strictly quarantined to their assigned sections.
3. **Partial Drafts vs Compulsory Submission:** Allow `bulk_upsert_scores` to persist partial score arrays as drafts. Add a server-side completeness check in `submit_exam_subject` ensuring 100% of students in the submitted section have valid theory and practical marks (or explicit absent flags) before allowing transition to `SUBMITTED`.
4. **UX & Validation Feedback:** Update `ScoreEntryPage.tsx` and `AssignTeacherDialog.tsx` with section selectors, completion meters (`X/Y Graded`), accessible inline error highlighting on missing cells, and non-blocking "Save Draft" vs strictly validated "Submit for Approval".

**Tech Stack:** FastAPI, SQLAlchemy 2.0, Pydantic v2, PostgreSQL/SQLite, React 19, TypeScript, Tailwind CSS, Lucide Icons, sonner toast, pytest.

**Spec:** User prompt: "Now i get it what was the problem with examination grading teacher assignment - one teacher was grading every sections scores although other section was taught by some other teacher. Can we make it like, the teacher who teaches a particular section and fill the score for that particular section. The draft can be saved if some mark are not filled but cannot be ubmitted for approval. validation is compulsory."

## Global Constraints
- Strict multi-tenancy: All queries MUST filter by `tenant_id` and respect active academic year.
- ReBAC principle: Teachers can only view, edit, and submit scores for students in sections they are assigned to teach.
- Boundary validation: All entered marks must strictly adhere to `0 <= score <= full_mark`.
- Backwards compatibility: Single-section classes and class-wide assignments (`section_id is None`) continue to work seamlessly.

---

### Task 1: Academic Module - Section-Scoped Subject Teacher Assignments

**Files:**
- Modify: `backend/src/modules/academic/service.py:2760-2780`
- Modify: `frontend/src/features/academic/components/AssignTeacherDialog.tsx:220-255`
- Test: `backend/tests/test_staffing_status.py`

**Interfaces:**
- Consumes: `TeacherAssignmentCreate(teacher_id, class_id, section_id, subject_id, is_class_teacher)`
- Produces: `TeacherAssignmentResponse` allowing distinct teachers for distinct sections of the same subject.

- [ ] **Step 1: Write failing test for section-scoped subject teacher assignment**

Add test in `backend/tests/test_staffing_status.py` verifying that Teacher 1 can be assigned to Class 10 Section A for Math, and Teacher 2 can be assigned to Class 10 Section B for Math without throwing `ConflictException`.

```python
def test_section_scoped_subject_teacher_assignment(default_academic_year):
    # Setup class with 2 sections (Section A and Section B) and 1 subject (Math)
    # Assign Teacher 1 to Section A Math -> 200 OK
    # Assign Teacher 2 to Section B Math -> 200 OK (must not raise 409 Conflict)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `backend/.venv/Scripts/pytest.exe tests/test_staffing_status.py -k test_section_scoped_subject_teacher_assignment`
Expected: FAIL with `ConflictException: Subject 'Mathematics' is already assigned to teacher...`

- [ ] **Step 3: Update rule 6 in `AcademicService.create_teacher_assignment`**

In `backend/src/modules/academic/service.py`, update rule 6:
```python
        # 6. Enforce Subject Teacher uniqueness per section/class
        if obj_in.subject_id:
            query = select(TeacherAssignment).where(
                TeacherAssignment.tenant_id == tenant_id,
                TeacherAssignment.academic_year_id == current_year.id,
                TeacherAssignment.subject_id == obj_in.subject_id,
                TeacherAssignment.deleted_at == None,
            )
            if obj_in.section_id:
                # Check conflict with existing class-wide assignment OR same section assignment
                query = query.where(
                    or_(
                        TeacherAssignment.section_id == obj_in.section_id,
                        TeacherAssignment.section_id == None,
                    )
                )
            else:
                # Class-wide assignment conflicts with any existing assignment for this subject
                pass

            existing_subject_teacher = db.scalar(query)
            if existing_subject_teacher and existing_subject_teacher.teacher_id != teacher_id:
                prev_teacher = db.scalar(select(User).where(User.id == existing_subject_teacher.teacher_id, User.deleted_at == None))
                teacher_info = f" ('{prev_teacher.first_name} {prev_teacher.last_name}', phone: {prev_teacher.phone})" if prev_teacher else ""
                sec_desc = " in this section" if obj_in.section_id and existing_subject_teacher.section_id else ""
                raise ConflictException(
                    message=f"Subject '{subject_obj.name}'{sec_desc} is already assigned to teacher{teacher_info}. Please unassign the current teacher first."
                )
```

- [ ] **Step 4: Enable section selection for Subject Teachers in `AssignTeacherDialog.tsx`**

In `frontend/src/features/academic/components/AssignTeacherDialog.tsx`, enable the Section dropdown for both `class_teacher` and `subject` modes:
- Option: `All Sections (Class-Wide)` (`value=""`)
- Option per section: `Section {s.name}` (`value={s.id}`)
Include helpful subtitle: `Assign instructor to a specific section or all sections of this class`.

- [ ] **Step 5: Run tests and typecheck**

Run: `backend/.venv/Scripts/pytest.exe tests/test_staffing_status.py`
Run: `npx tsc -b` in `frontend`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/academic/service.py backend/tests/test_staffing_status.py frontend/src/features/academic/components/AssignTeacherDialog.tsx
git commit -m "feat(academic): allow section-scoped subject teacher assignments"
```

---

### Task 2: Examination Module - Section-Scoped ReBAC Permissions & Queue

**Files:**
- Modify: `backend/src/core/dependencies.py:366-415`
- Modify: `backend/src/modules/examination/service.py:435-460, 1098-1137`
- Modify: `backend/src/modules/examination/schemas.py:50-80`
- Test: `backend/tests/test_examination_lifecycle.py`

**Interfaces:**
- Consumes: `teacher_id`, `exam_subject_id`, `exam.class_id`, `Student.section_id`
- Produces: Section-aware authorization and grading assignments list.

- [ ] **Step 1: Write failing test in `backend/tests/test_examination_lifecycle.py`**

Test that Teacher B (assigned to Section B Math) can edit scores for Section B students, but is rejected with 403 Forbidden if attempting to save scores for Section A students.

- [ ] **Step 2: Run test to verify it fails**

Run: `backend/.venv/Scripts/pytest.exe tests/test_examination_lifecycle.py -k test_section_permission`
Expected: FAIL

- [ ] **Step 3: Update `require_exam_subject_edit_permission` in `dependencies.py`**

In `backend/src/core/dependencies.py`:
```python
    if member.has_role(UserRole.TEACHER):
        # Teacher is permitted if:
        # 1. Directly assigned on ExamSubject, OR
        # 2. Assigned in academic TeacherAssignment for this class & subject (any section or class-wide)
        if exam_subject.assigned_teacher_id == member.user.id:
            return member

        from src.modules.academic.models import TeacherAssignment
        from src.modules.examination.models import Exam
        exam = db.scalar(select(Exam).where(Exam.id == exam_subject.exam_id))
        if exam:
            has_assignment = db.scalar(
                select(TeacherAssignment).where(
                    TeacherAssignment.tenant_id == tenant_id,
                    TeacherAssignment.teacher_id == member.user.id,
                    TeacherAssignment.class_id == exam.class_id,
                    TeacherAssignment.subject_id == exam_subject.subject_id,
                    TeacherAssignment.deleted_at == None,
                ).limit(1)
            )
            if has_assignment:
                return member

        raise ForbiddenException(
            message="Access denied: You are not assigned to grade this exam subject."
        )
```

- [ ] **Step 4: Enforce section quarantine in `bulk_upsert_scores`**

In `backend/src/modules/examination/service.py`:
If `user_id` is a Teacher (not Admin/Office Admin/Super Admin):
1. Query sections this teacher is assigned to for `(exam.class_id, exam_subject.subject_id)`.
2. If teacher has a class-wide assignment (`section_id is None`) or is `exam_subject.assigned_teacher_id`, allow all sections.
3. Otherwise, verify that every student in `payload.scores` has `student.section_id in teacher_section_ids`. If any student is outside, raise `ForbiddenException("You can only submit scores for students in your assigned section.")`.

- [ ] **Step 5: Include section details in `TeacherExamSubjectAssignment`**

In `get_teacher_exam_assignments`:
If teacher is assigned to specific section(s), return section names and IDs so the teacher's grading queue cards clearly show e.g. `Class 10 - Section A • Mathematics`.

- [ ] **Step 6: Run tests and commit**

```bash
git add backend/src/core/dependencies.py backend/src/modules/examination/service.py backend/src/modules/examination/schemas.py backend/tests/test_examination_lifecycle.py
git commit -m "feat(examination): enforce section-level ReBAC for score entry"
```

---

### Task 3: Backend - Partial Draft Saving & Compulsory Submission Validation

**Files:**
- Modify: `backend/src/modules/examination/service.py:415-500, 600-660`
- Modify: `backend/src/modules/examination/router.py:230-265`
- Test: `backend/tests/test_examination_lifecycle.py`

**Interfaces:**
- Consumes: `BulkUpsertScoresRequest(scores: list[StudentScoreItemDTO])`, `submit_exam_subject(exam_subject_id, section_id=None)`
- Produces: Partial drafts saved; submission blocked with HTTP 400 if any student marks are missing.

- [ ] **Step 1: Write failing tests for partial draft and compulsory submission**

In `backend/tests/test_examination_lifecycle.py`:
1. `test_partial_draft_saving_allowed`: Saving 1 student score out of 5 enrolled students succeeds with 200 OK.
2. `test_incomplete_submission_rejected`: Calling `/submit` when 4 students are missing scores fails with HTTP 400 Bad Request (`f"Cannot submit: 4 student(s) have missing scores."`).
3. `test_complete_submission_succeeds`: Filling remaining 4 students and calling `/submit` succeeds with 200 OK and status `SUBMITTED`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `backend/.venv/Scripts/pytest.exe tests/test_examination_lifecycle.py -k "test_partial_draft or test_incomplete_submission"`
Expected: FAIL

- [ ] **Step 3: Support partial draft saving in `bulk_upsert_scores`**

In `backend/src/modules/examination/service.py`:
- In `bulk_upsert_scores`, only validate items that are actually present in `payload.scores`.
- Each provided item MUST satisfy:
  - If `is_theory_absent is False`, `theory_score` must not be None, and `0 <= theory_score <= theory_full_mark`.
  - If `has_practical` and `is_practical_absent is False`, `practical_score` must not be None, and `0 <= practical_score <= practical_full_mark`.
- Unsent students remain unpersisted without causing errors.

- [ ] **Step 4: Implement compulsory completeness validation in `submit_exam_subject`**

In `backend/src/modules/examination/service.py`:
Inside `submit_exam_subject`:
1. Query all active enrolled students for the exam's class (filtered by `section_id` if section-scoped submission is provided).
2. Query existing `ExamScore` records for `exam_subject_id` and those student IDs.
3. Check each student:
   - Does student have an `ExamScore`?
   - Is `theory_score is not None` OR `is_theory_absent == True`?
   - If `has_practical`: is `practical_score is not None` OR `is_practical_absent == True`?
4. If any student fails:
   ```python
   missing_list = [f"{s.first_name} {s.last_name}" for s in missing_students]
   raise BadRequestException(
       message=f"Cannot submit exam subject for approval: {len(missing_students)} student(s) have missing scores. All scores must be completed before submission.",
       details={"missing_count": len(missing_students), "missing_students": missing_list[:10]},
   )
   ```
5. If 100% complete: mark status as `SUBMITTED`.

- [ ] **Step 5: Run tests and verify all pass**

Run: `backend/.venv/Scripts/pytest.exe tests/test_examination_lifecycle.py`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/examination/service.py backend/src/modules/examination/router.py backend/tests/test_examination_lifecycle.py
git commit -m "feat(examination): support partial drafts and enforce compulsory validation on submission"
```

---

### Task 4: Frontend - Section-Scoped Score Entry & Compulsory Validation UX

**Files:**
- Modify: `frontend/src/features/examination/pages/ScoreEntryPage.tsx`
- Modify: `frontend/src/features/examination/components/TeacherScoreEntryTable.tsx`
- Modify: `frontend/src/features/examination/types.ts`
- Test: `frontend/src/features/examination/components/__tests__/teacherScoreEntry.test.mjs`

**Interfaces:**
- Consumes: `useExamReview`, `useSaveExamScores`, `useSubmitExamSubject`, `useAuth`
- Produces: Section-filtered UI, progress indicators, inline cell warnings, non-blocking draft save, blocking submit with error summary.

- [ ] **Step 1: Write frontend unit tests for draft filtering and submission validation**

In `frontend/src/features/examination/components/__tests__/teacherScoreEntry.test.mjs`:
- Test that `buildDraftScorePayload` only includes rows where `isTheoryAbsent || theoryScore !== null`.
- Test that `validateAllScoresComplete` returns a list of missing student names when any row has `theoryScore === null && !isTheoryAbsent`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node frontend/src/features/examination/components/__tests__/teacherScoreEntry.test.mjs`
Expected: FAIL

- [ ] **Step 3: Implement helper functions in `types.ts`**

In `frontend/src/features/examination/types.ts`:
1. `buildDraftScorePayload(rows: StudentGradingRow[], hasPractical: boolean): StudentScoreItemDTO[]`:
   Filters to rows where `r.isTheoryAbsent || r.theoryScore !== null || (hasPractical && (r.isPracticalAbsent || r.practicalScore !== null))`.
2. `validateAllScoresComplete(rows: StudentGradingRow[], options: { hasPractical: boolean }): { isComplete: boolean; missingStudents: string[] }`:
   Checks every student. Returns `missingStudents` list.

- [ ] **Step 4: Update `ScoreEntryPage.tsx`**

1. **Section Isolation:**
   - Detect if current user is a Teacher assigned to a specific section.
   - If teacher is assigned to Section A, lock section filter to Section A and display banner:
     `"Section A • Assigned Grading Instructor"`.
2. **Draft Saving:**
   - In `handleSaveDraft`:
     - Calls `buildDraftScorePayload(visibleStudents, hasPractical)`.
     - Validates bounds only on entered scores.
     - Saves payload without error if some students are empty.
     - Toast: `"Draft Saved: {gradedCount} of {totalStudents} students recorded."`
3. **Compulsory Submission Validation:**
   - In `handleSubmitFinal`:
     - Runs `validateAllScoresComplete(visibleStudents, { hasPractical })`.
     - If incomplete:
       - Displays alert dialog / toast: `"Cannot Submit for Approval: {count} student(s) have missing scores ({names...}). Please complete all marks before submitting."`
       - Sets `highlightMissing: true` so unfilled rows glow amber/red.
       - Focuses first incomplete row.
     - If 100% complete:
       - Opens confirmation modal with total student count and pass/fail summary.
       - Dispatches save and submit mutations.

- [ ] **Step 5: Run frontend tests and typecheck**

Run: `node frontend/src/features/examination/components/__tests__/teacherScoreEntry.test.mjs`
Run: `npx tsc -b` in `frontend`
Run: `npm run build` in `frontend`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/examination/pages/ScoreEntryPage.tsx frontend/src/features/examination/components/TeacherScoreEntryTable.tsx frontend/src/features/examination/types.ts frontend/src/features/examination/components/__tests__/teacherScoreEntry.test.mjs
git commit -m "feat(examination): add section-scoped grading UX and compulsory submit validation"
```

---

### Task 5: End-to-End Verification & Integration Test Suite

**Files:**
- Create: `backend/tests/test_examination_section_grading.py`
- Test: Full lifecycle test from multi-teacher assignment to section draft and final submission.

- [ ] **Step 1: Write end-to-end integration test**

In `backend/tests/test_examination_section_grading.py`:
1. Create Class 10 with Section A and Section B.
2. Enroll 2 students in Section A and 2 students in Section B.
3. Assign Teacher Ram to Section A Math, Teacher Shyam to Section B Math.
4. Create Exam for Class 10 with Math subject.
5. Verify Teacher Ram can view and save draft for Section A (1 of 2 students).
6. Verify Teacher Ram attempting to submit Section A fails (1 student missing).
7. Verify Teacher Ram completing Section A and submitting succeeds.
8. Verify Teacher Ram attempting to grade Section B gets 403 Forbidden.
9. Verify Teacher Shyam can save draft and submit Section B.
10. Verify Exam transitions to `PENDING_APPROVAL` once both sections are submitted.

- [ ] **Step 2: Run backend test suite**

Run: `backend/.venv/Scripts/pytest.exe tests/test_examination_section_grading.py`
Expected: 100% PASS

- [ ] **Step 3: Run full backend regression suite**

Run: `backend/.venv/Scripts/pytest.exe tests/test_staffing_status.py tests/test_examination_lifecycle.py tests/test_student_actions.py`
Expected: ALL PASS

- [ ] **Step 4: Run full frontend build**

Run: `npm run build` in `frontend`
Expected: Clean build in ~1.1s with code 0

- [ ] **Step 5: Final Commit**

```bash
git add backend/tests/test_examination_section_grading.py
git commit -m "test(examination): add end-to-end section-scoped grading and validation integration tests"
```
