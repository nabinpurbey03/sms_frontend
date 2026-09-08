# Examination Feature Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete `examination` feature slice in Schools Up Pro following the 5-file slice architecture standard (`schema.ts`, `types.ts`, `api.ts`, `hooks.ts`, `pages/`, `components/`) with exam creation (admin), mobile-first responsive score entry with "AB" absent toggles and submission locking (teacher ReBAC), and full approval review matrix with inline score editing (admin approval).

**Architecture:** 
- Frontend slice in `src/features/examination/` interfacing with the existing FastAPI examination backend endpoints under `/academic/tenants/{tenant_id}/`.
- Mobile-first responsive layouts using `ResponsiveDataTable` (table on md+, stacked cards on mobile).
- Strict Zod validation mirroring backend rules: mutually exclusive numeric score vs absent flag, pass mark <= full mark.
- TanStack Query hooks with targeted query cache invalidation.
- RBAC and ReBAC security guards via `usePermission()` and teacher assignment matching.

**Tech Stack:** React 19, TypeScript, TanStack Query v5, TanStack Router, Tailwind CSS v4, Zod, Sonner, Lucide React, Radix UI.

**Spec:** User request for `examination` feature slice with 3 screens (Exam Creation, Score Entry, Approval Review), Zod validation, TanStack Query hooks, ReBAC scoping, and mobile-first responsive tables.

---

## Global Constraints

- 5-file slice architecture standard: `schema.ts`, `types.ts`, `api.ts`, `hooks.ts`, `pages/`, `components/`.
- Validation: Zod schema with `.refine()` enforcing that a row's score is a number between 0 and `full_mark`, OR the row is marked absent (mutually exclusive). Full mark and pass mark must be positive with `pass_mark <= full_mark`.
- Teacher ReBAC: Score entry is strictly restricted to teachers assigned to that `exam_subject` (or Admins). Teachers are locked out of edits once `status === 'SUBMITTED'`.
- Responsive design: Mobile-first responsive tables using `ResponsiveDataTable` (stacked cards on `< md`, table on `>= md`), minimum 40px touch targets.
- Feedback: Toast notifications via `sonner` (`toast.success`, `toast.error`).
- Zero compilation errors (`tsc -b && vite build`) and zero linter errors (`oxlint`).

---

### Task 1: Examination Schemas & Types

**Files:**
- Create: `src/features/examination/schema.ts`
- Create: `src/features/examination/types.ts`

**Interfaces:**
- Consumes: Zod library (`z`)
- Produces: `studentScoreItemSchema`, `examSubjectConfigSchema`, `examCreateSchema`, and corresponding TypeScript types (`ExamResponse`, `ExamSubjectResponse`, `StudentScoreResponse`, `BulkUpsertScoresResponse`, `ExamFullReviewResponse`, `ExamSubjectReviewItem`, `StudentExamReviewRow`, `PublishedExamResultsResponse`).

- [ ] **Step 1: Create `src/features/examination/types.ts`**
  Define all domain models, enums, and DTOs matching backend models in `backend/src/modules/examination/schemas.py`:
  - `ExamStatus = 'DRAFT' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'APPROVED' | 'CANCELLED'`
  - `ExamSubjectStatus = 'PENDING' | 'SUBMITTED'`
  - `ExamResponse`, `ExamSubjectResponse`, `StudentScoreItemDTO`, `StudentScoreResponse`, `BulkUpsertScoresResponse`, `ExamSubjectReviewItem`, `StudentExamReviewRow`, `ExamFullReviewResponse`, `PublishedExamResultsResponse`.

- [ ] **Step 2: Create `src/features/examination/schema.ts`**
  Implement Zod schemas:
  - `studentScoreItemSchema`:
    ```ts
    export const studentScoreItemSchema = z
      .object({
        student_id: z.string().min(1, 'Student ID is required'),
        score: z.number().nullable().optional(),
        is_absent: z.boolean().default(false),
      })
      .refine(
        (data) => {
          if (data.is_absent) {
            return data.score === null || data.score === undefined;
          }
          return data.score !== null && data.score !== undefined && !Number.isNaN(data.score);
        },
        {
          message: 'Score must be empty when student is absent, and a valid number when present',
          path: ['score'],
        }
      );
    ```
  - `examSubjectConfigSchema`:
    ```ts
    export const examSubjectConfigSchema = z
      .object({
        subject_id: z.string().min(1, 'Subject is required'),
        full_mark: z
          .number({ invalid_type_error: 'Full mark is required' })
          .positive('Full mark must be greater than 0')
          .max(1000, 'Full mark cannot exceed 1000'),
        pass_mark: z
          .number({ invalid_type_error: 'Pass mark is required' })
          .nonnegative('Pass mark cannot be negative'),
        assigned_teacher_id: z.string().optional().nullable(),
      })
      .refine((data) => data.pass_mark <= data.full_mark, {
        message: 'Pass mark cannot be greater than full mark',
        path: ['pass_mark'],
      });
    ```
  - `examCreateSchema`:
    ```ts
    export const examCreateSchema = z.object({
      name: z.string().trim().min(2, 'Exam name must be at least 2 characters').max(100),
      class_id: z.string().min(1, 'Class is required'),
      academic_term: z.string().trim().max(50).optional().or(z.literal('')),
      start_date: z.string().optional().or(z.literal('')),
      end_date: z.string().optional().or(z.literal('')),
      subjects: z.array(examSubjectConfigSchema).min(1, 'At least one subject must be configured'),
    });
    ```

- [ ] **Step 3: Run TypeScript compiler check**
  Run: `npm run build`
  Expected: Success with 0 errors.

- [ ] **Step 4: Commit**
  ```bash
  git add src/features/examination/schema.ts src/features/examination/types.ts
  git commit -m "feat(examination): add domain types and zod schemas with mutual exclusivity validation"
  ```

---

### Task 2: API Client, TanStack Query Hooks, and Permission Matrix

**Files:**
- Create: `src/features/examination/api.ts`
- Create: `src/features/examination/hooks.ts`
- Create: `src/features/examination/hooks/index.ts`
- Modify: `src/config/permissions.ts`

**Interfaces:**
- Consumes: `apiClient` from `@/api/client`, types from `./types`, schemas from `./schema`
- Produces: `examinationApi`, TanStack Query hooks (`useCreateExam`, `useAddExamSubject`, `useAssignExamTeacher`, `useSaveExamScores`, `useSubmitExamSubject`, `useExamReview`, `useApproveExam`, `useExams`), and permission keys (`MANAGE_EXAMS`, `ENTER_EXAM_SCORES`, `APPROVE_EXAMS`, `VIEW_EXAM_RESULTS`).

- [ ] **Step 1: Update `src/config/permissions.ts`**
  Add examination permissions to `PERMISSION_MATRIX`:
  ```ts
  MANAGE_EXAMS: ['SUPER_ADMIN', 'ADMIN', 'OFFICE_ADMIN'],
  ENTER_EXAM_SCORES: ['SUPER_ADMIN', 'ADMIN', 'OFFICE_ADMIN', 'TEACHER'],
  APPROVE_EXAMS: ['SUPER_ADMIN', 'ADMIN', 'OFFICE_ADMIN'],
  VIEW_EXAM_RESULTS: ['SUPER_ADMIN', 'ADMIN', 'OFFICE_ADMIN', 'TEACHER', 'PARENT'],
  ```

- [ ] **Step 2: Create `src/features/examination/api.ts`**
  Implement API calls matching FastAPI backend routes:
  - `getExams(tenantId, params)` -> `GET /academic/tenants/${tenantId}/exams`
  - `createExam(tenantId, data)` -> `POST /academic/tenants/${tenantId}/exams`
  - `addExamSubject(tenantId, examId, data)` -> `POST /academic/tenants/${tenantId}/exams/${examId}/subjects`
  - `assignExamTeacher(tenantId, examId, subjectId, teacherId)` -> `POST /academic/tenants/${tenantId}/exams/${examId}/subjects/${subjectId}/assign-teacher`
  - `saveExamScores(tenantId, examSubjectId, scores)` -> `PUT /academic/tenants/${tenantId}/exam-subjects/${examSubjectId}/scores`
  - `submitExamSubject(tenantId, examSubjectId)` -> `POST /academic/tenants/${tenantId}/exam-subjects/${examSubjectId}/submit`
  - `getExamReview(tenantId, examId)` -> `GET /academic/tenants/${tenantId}/exams/${examId}`
  - `approveExam(tenantId, examId)` -> `POST /academic/tenants/${tenantId}/exams/${examId}/approve`
  - `getExamResults(tenantId, examId)` -> `GET /academic/tenants/${tenantId}/exams/${examId}/results`

- [ ] **Step 3: Create `src/features/examination/hooks.ts` and `hooks/index.ts`**
  Implement TanStack Query hooks with required naming and invalidation conventions:
  - Query keys: `EXAMS_QUERY_KEY = 'examination_exams'`, `EXAM_REVIEW_QUERY_KEY = 'examination_exam_review'`.
  - `useExams(tenantId, params)`
  - `useExamReview(tenantId, examId)`
  - `useCreateExam()`: on success invalidates `[EXAMS_QUERY_KEY, tenantId]`.
  - `useAddExamSubject()`: on success invalidates `[EXAM_REVIEW_QUERY_KEY, tenantId, examId]` and `[EXAMS_QUERY_KEY, tenantId]`.
  - `useAssignExamTeacher()`: on success invalidates `[EXAM_REVIEW_QUERY_KEY, tenantId, examId]`.
  - `useSaveExamScores()`: on success invalidates `[EXAM_REVIEW_QUERY_KEY, tenantId]` and `[EXAMS_QUERY_KEY, tenantId]`.
  - `useSubmitExamSubject()`: on success invalidates `[EXAM_REVIEW_QUERY_KEY, tenantId]` and `[EXAMS_QUERY_KEY, tenantId]`.
  - `useApproveExam()`: on success invalidates `[EXAM_REVIEW_QUERY_KEY, tenantId, examId]` and `[EXAMS_QUERY_KEY, tenantId]`.
  Create `hooks/index.ts` re-exporting all hooks to support both directory and file import patterns.

- [ ] **Step 4: Run linter and compiler**
  Run: `npm run lint` and `npm run build`
  Expected: 0 errors.

- [ ] **Step 5: Commit**
  ```bash
  git add src/config/permissions.ts src/features/examination/api.ts src/features/examination/hooks.ts src/features/examination/hooks/index.ts
  git commit -m "feat(examination): add api client, query hooks, and rbac permissions"
  ```

---

### Task 3: Screen 1 — Exam Creation Flow (ADMIN/OFFICE_ADMIN)

**Files:**
- Create: `src/features/examination/components/ExamSubjectConfigList.tsx`
- Create: `src/features/examination/pages/CreateExamPage.tsx`

**Interfaces:**
- Consumes: `useClasses` from `@/features/academic/hooks`, `useClassSubjects` from `@/features/academic/hooks`, `useMembers` from `@/features/members/hooks`, `useCreateExam`, `useAddExamSubject`, `useAssignExamTeacher` from `../hooks`.
- Produces: `CreateExamPage` component rendered at `/examination/exams/create`.

- [ ] **Step 1: Create `src/features/examination/components/ExamSubjectConfigList.tsx`**
  Build the interactive subject configuration table/card list:
  - Lists subjects belonging to the selected class.
  - Per subject: checkbox (included in exam), `full_mark` numeric input (default 100), `pass_mark` numeric input (default 40), and teacher picker dropdown (`useMembers(activeTenantId, 'TEACHER')`).
  - Strict requirement: Teacher picker is a separate picker, NOT pre-filled from existing class-teacher assignments.
  - Validates `pass_mark <= full_mark` with immediate error feedback.

- [ ] **Step 2: Create `src/features/examination/pages/CreateExamPage.tsx`**
  Implement exam creation page:
  - Access guard: `can('MANAGE_EXAMS')` (Admin and Office Admin).
  - Class selector dropdown.
  - Exam Name input (min 2 chars).
  - Academic Term input (e.g. "Term 1").
  - Date Range inputs (optional start and end dates).
  - On submit:
    1. Validates form using `examCreateSchema`.
    2. Calls `createExamMutation`.
    3. Concurrently or sequentially calls `addExamSubjectMutation` for each configured subject.
    4. For subjects with assigned teacher, calls `assignExamTeacherMutation`.
    5. Displays Sonner success toast and navigates to `/examination/exams`.

- [ ] **Step 3: Run compiler & linter**
  Run: `npm run lint && npm run build`
  Expected: 0 errors.

- [ ] **Step 4: Commit**
  ```bash
  git add src/features/examination/components/ExamSubjectConfigList.tsx src/features/examination/pages/CreateExamPage.tsx
  git commit -m "feat(examination): add exam creation screen with subject config and teacher assignments"
  ```

---

### Task 3.5: Backend Helper Endpoint for Teacher Grading Scope

**Files:**
- Modify: `backend/src/modules/examination/schemas.py`
- Modify: `backend/src/modules/examination/service.py`
- Modify: `backend/src/modules/examination/router.py`
- Modify: `backend/tests/test_examination_lifecycle.py`

**Interfaces:**
- Consumes: `ExaminationService`, `ExamSubject`, `Exam`
- Produces: `GET /academic/tenants/{tenant_id}/teacher/my-exam-assignments` returning all exam subjects assigned to the logged-in teacher with exam details, class name, and status.

- [ ] **Step 1: Add `TeacherExamSubjectAssignment` schema to `backend/src/modules/examination/schemas.py`**
- [ ] **Step 2: Add `get_teacher_exam_assignments` method to `backend/src/modules/examination/service.py`**
- [ ] **Step 3: Register route `GET /academic/tenants/{tenant_id}/teacher/my-exam-assignments` in `backend/src/modules/examination/router.py`**
- [ ] **Step 4: Add test case in `backend/tests/test_examination_lifecycle.py` and run `uv run python tests/test_examination_lifecycle.py`**
- [ ] **Step 5: Commit backend changes**
  ```bash
  git add src/modules/examination/ schemas.py service.py router.py tests/test_examination_lifecycle.py
  git commit -m "feat(examination): add teacher my-exam-assignments endpoint"
  ```

---

### Task 4: Screen 2 — Teacher Score Entry Page (TEACHER ReBAC)

**Files:**
- Create: `src/features/examination/components/TeacherScoreEntryTable.tsx`
- Create: `src/features/examination/pages/ScoreEntryPage.tsx`

**Interfaces:**
- Consumes: `ResponsiveDataTable` from `@/components/common/ResponsiveDataTable`, `useExamReview`, `useSaveExamScores`, `useSubmitExamSubject` from `../hooks`.
- Produces: `ScoreEntryPage` component rendered at `/examination/exams/$examId/grade/$examSubjectId`.

- [ ] **Step 1: Create `src/features/examination/components/TeacherScoreEntryTable.tsx`**
  Implement responsive grading table using `ResponsiveDataTable`:
  - Columns / Card fields: Student Name & Section, Absent Toggle ("AB"), Numeric Score Input, Live Pass/Fail badge.
  - Toggling "AB":
    - Sets `is_absent: true`.
    - Clears numeric score to `null` or empty string.
    - Disables numeric input.
  - Untoggling "AB":
    - Sets `is_absent: false`.
    - Enables numeric input.
  - Numeric score validation: enforce `score >= 0` and `score <= full_mark`.
  - Read-only state: When subject `status === 'SUBMITTED'`, all inputs and "AB" toggles are disabled with a clear "Locked - Already Submitted" visual state.

- [ ] **Step 2: Create `src/features/examination/pages/ScoreEntryPage.tsx`**
  Implement page container:
  - ReBAC Access Guard:
    - If user has `TEACHER` role: verify `assigned_teacher_id === user.id`. If not, display restricted access view.
  - Section Filter: dropdown/pill tabs allowing teacher to filter students by section or view all.
  - Summary metrics: Graded count / Total count, Present count, Absent count.
  - "Save Draft" action: calls `saveExamScores` mutation with Sonner toast.
  - "Submit Exam Subject" action:
    - Opens confirmation dialog: "Submit Subject Scores? Once submitted, scores will be locked and cannot be edited by teachers."
    - Calls `submitExamSubject` mutation.
    - Locks the table on success and updates status badge to `SUBMITTED`.

- [ ] **Step 3: Run compiler & linter**
  Run: `npm run lint && npm run build`
  Expected: 0 errors.

- [ ] **Step 4: Commit**
  ```bash
  git add src/features/examination/components/TeacherScoreEntryTable.tsx src/features/examination/pages/ScoreEntryPage.tsx
  git commit -m "feat(examination): add teacher score entry with responsive table, absent toggle, and submit locking"
  ```

---

### Task 5: Screen 3 & Hub — Approval Review Matrix & Examinations List

**Files:**
- Create: `src/features/examination/components/InlineScoreCell.tsx`
- Create: `src/features/examination/components/ExamApprovalMatrix.tsx`
- Create: `src/features/examination/pages/ExamReviewPage.tsx`
- Create: `src/features/examination/pages/ExamsListPage.tsx`

**Interfaces:**
- Consumes: `useExamReview`, `useSaveExamScores`, `useApproveExam`, `useExams` from `../hooks`.
- Produces: `ExamReviewPage` at `/examination/exams/$examId/review`, `ExamsListPage` at `/examination/exams`.

- [ ] **Step 1: Create `src/features/examination/components/InlineScoreCell.tsx`**
  Inline editable score cell for admin approval review:
  - Displays score / absent pill.
  - Clicking enters edit mode with score input and "AB" button.
  - On blur / Enter, saves changes via `saveExamScores` mutation.

- [ ] **Step 2: Create `src/features/examination/components/ExamApprovalMatrix.tsx`**
  Build the full grid:
  - Rows: Students in the class.
  - Columns: Student Name/Section + All configured subjects (header displays Subject name, Full Mark, Pass Mark, Teacher Name, Submission status badge) + Total Score + Percentage + Result.
  - Cells: `InlineScoreCell` allowing Admin inline score edits.

- [ ] **Step 3: Create `src/features/examination/pages/ExamReviewPage.tsx`**
  Approval review page for ADMIN/OFFICE_ADMIN:
  - Progress tracker: "N of M subjects submitted" with progress bar.
  - "Approve Exam" button:
    - Enabled ONLY when `all_subjects_submitted === true` and status is not yet `APPROVED`.
    - If any subject is not submitted: disabled with tooltip explaining which subjects are still pending.
    - On click: confirmation dialog -> calls `useApproveExam` -> updates exam status to `APPROVED` -> Sonner toast.

- [ ] **Step 4: Create `src/features/examination/pages/ExamsListPage.tsx`**
  Main examinations hub:
  - Header: "Examinations" with "Create Exam" button for Admins.
  - Filter by class and exam status (`DRAFT`, `IN_PROGRESS`, `PENDING_APPROVAL`, `APPROVED`).
  - Admin view: list of exams with status badges, subject counts, "Review & Approve" or "View Matrix" buttons.
  - Teacher view: shows exams and highlights assigned subjects with direct "Enter Scores" or "View Scores (Submitted)" buttons.

- [ ] **Step 5: Run compiler & linter**
  Run: `npm run lint && npm run build`
  Expected: 0 errors.

- [ ] **Step 6: Commit**
  ```bash
  git add src/features/examination/components/InlineScoreCell.tsx src/features/examination/components/ExamApprovalMatrix.tsx src/features/examination/pages/ExamReviewPage.tsx src/features/examination/pages/ExamsListPage.tsx
  git commit -m "feat(examination): add approval review matrix with inline editing and examinations hub"
  ```

---

### Task 6: Router & Navigation Integration & End-to-End Verification

**Files:**
- Modify: `src/app/router.tsx`
- Modify: `src/components/layout/AppShell.tsx`

**Interfaces:**
- Consumes: All 4 examination pages (`ExamsListPage`, `CreateExamPage`, `ScoreEntryPage`, `ExamReviewPage`).
- Produces: Integrated routes and sidebar navigation item.

- [ ] **Step 1: Update `src/app/router.tsx`**
  Register routes:
  - `/examination/exams` -> `ExamsListPage`
  - `/examination/exams/create` -> `CreateExamPage`
  - `/examination/exams/$examId/review` -> `ExamReviewPage`
  - `/examination/exams/$examId/grade/$examSubjectId` -> `ScoreEntryPage`

- [ ] **Step 2: Update `src/components/layout/AppShell.tsx`**
  Add "Examinations" sidebar item with `GraduationCap` icon, visible if `can('MANAGE_EXAMS') || can('ENTER_EXAM_SCORES')`.

- [ ] **Step 3: Verification**
  - Run `npm run lint` in `E:\PBAC\frontend` (0 errors).
  - Run `npm run build` in `E:\PBAC\frontend` (0 errors).
  - Run `uv run python tests/test_examination_lifecycle.py` in `E:\PBAC\backend` (all tests pass).

- [ ] **Step 4: Commit**
  ```bash
  git add src/app/router.tsx src/components/layout/AppShell.tsx
  git commit -m "feat(examination): integrate routes and sidebar navigation"
  ```
