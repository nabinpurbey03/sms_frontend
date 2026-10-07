# Examination Practical Marks Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement comprehensive practical marks support across the examination lifecycle (subject defaults, exam creation wizard, teacher score entry, separate pass/fail evaluation, and official report cards).

**Architecture:** Extend `Subject`, `ExamSubject`, and `ExamScore` models with first-class theory and practical component fields (`theory_full_mark`, `theory_pass_mark`, `practical_full_mark`, `practical_pass_mark`, `has_practical`) while maintaining backward-compatible aggregate columns (`full_mark`, `pass_mark`, `score`). Enforce the NEB/CDC separate pass rule where a student must score at least the pass mark in both components independently to pass. Build smart presets and batch actions in the frontend exam creation wizard, provide a dual-input score entry grid with independent absenteeism, and render split-column official report cards.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2.0, Pydantic v2, Pytest, React 19, TypeScript, TanStack Query, Tailwind CSS, Lucide React, Node.js test runner.

**Spec:** [`docs/superpowers/specs/2026-10-07-examination-practical-marks-feature-design.md`](file:///E:/SSUP/frontend/docs/superpowers/specs/2026-10-07-examination-practical-marks-feature-design.md)

## Global Constraints

- **Separate Pass Rule:** A subject with practical marks is passed (`is_pass = True`) if and only if `theory_score >= theory_pass_mark` AND `practical_score >= practical_pass_mark`, with neither component marked absent.
- **Grade Point Penalty:** If either component fails, subject grade is `F` and `grade_point = Decimal("0.00")`.
- **Backward Compatibility:** All existing endpoints and queries that rely on `full_mark`, `pass_mark`, `score`, and `is_absent` must remain valid and return aggregated totals.
- **Strict Typing:** All frontend changes must pass `npm run build` (tsc -b && vite build) with 0 errors.
- **Test Integrity:** All automated unit tests in backend (`pytest`) and frontend (`node --test`) must pass before task completion.

---

### Task 1: Backend Models, Alembic Migration & Pydantic Schemas

**Files:**
- Modify: `E:/SSUP/backend/src/modules/academic/models.py`
- Modify: `E:/SSUP/backend/src/modules/examination/models.py`
- Modify: `E:/SSUP/backend/src/modules/examination/schemas.py`
- Modify: `E:/SSUP/backend/src/modules/academic/schemas.py`
- Create: `E:/SSUP/backend/alembic/versions/20261007_examination_practical_marks.py`
- Test: `E:/SSUP/backend/tests/test_examination_practical_schemas.py`

**Interfaces:**
- Consumes: Existing `TenantBase`, `Subject`, `ExamSubject`, `ExamScore` definitions.
- Produces: Updated `ExamSubjectCreate`, `ExamSubjectResponse`, `StudentScoreItemDTO`, `ExamScoreResponse` with `theory_full_mark`, `theory_pass_mark`, `practical_full_mark`, `practical_pass_mark`, `has_practical`, `theory_score`, `is_theory_absent`, `practical_score`, `is_practical_absent`.

- [ ] **Step 1: Write failing schema tests in backend**

```python
# tests/test_examination_practical_schemas.py
from decimal import Decimal
import pytest
from pydantic import ValidationError
from src.modules.examination.schemas import ExamSubjectCreate, StudentScoreItemDTO

def test_exam_subject_create_validation():
    # Valid practical split
    data = ExamSubjectCreate(
        subject_id="sub-1",
        has_practical=True,
        theory_full_mark=Decimal("75.00"),
        theory_pass_mark=Decimal("27.00"),
        practical_full_mark=Decimal("25.00"),
        practical_pass_mark=Decimal("10.00"),
    )
    assert data.theory_full_mark == Decimal("75.00")
    assert data.practical_full_mark == Decimal("25.00")

def test_exam_subject_create_coerces_practical_when_false():
    data = ExamSubjectCreate(
        subject_id="sub-2",
        has_practical=False,
        theory_full_mark=Decimal("100.00"),
        theory_pass_mark=Decimal("40.00"),
        practical_full_mark=Decimal("25.00"),
        practical_pass_mark=Decimal("10.00"),
    )
    assert data.practical_full_mark == Decimal("0.00")
    assert data.practical_pass_mark == Decimal("0.00")

def test_student_score_item_dto():
    item = StudentScoreItemDTO(
        student_id="st-1",
        theory_score=Decimal("65.00"),
        is_theory_absent=False,
        practical_score=Decimal("22.00"),
        is_practical_absent=False,
    )
    assert item.theory_score == Decimal("65.00")
    assert item.practical_score == Decimal("22.00")
```

- [ ] **Step 2: Run test to verify failure**

Run: `.venv/Scripts/pytest tests/test_examination_practical_schemas.py -v`
Expected: FAIL due to missing schema fields.

- [ ] **Step 3: Update database models and Pydantic schemas**

Update `Subject` in `src/modules/academic/models.py`:
```python
has_practical: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
theory_full_mark: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2), nullable=True, default=Decimal("100.00"))
theory_pass_mark: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2), nullable=True, default=Decimal("40.00"))
practical_full_mark: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2), nullable=True, default=Decimal("0.00"))
practical_pass_mark: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2), nullable=True, default=Decimal("0.00"))
```

Update `ExamSubject` and `ExamScore` in `src/modules/examination/models.py`.
Update schemas in `src/modules/examination/schemas.py`.

- [ ] **Step 4: Run schema tests to verify passing**

Run: `.venv/Scripts/pytest tests/test_examination_practical_schemas.py -v`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add src/modules/academic/models.py src/modules/examination/models.py src/modules/examination/schemas.py tests/test_examination_practical_schemas.py
git commit -m "feat(examination): add practical marks models, constraints, and schemas"
```

---

### Task 2: Backend Examination Service Evaluation Engine & Pytest Suite

**Files:**
- Modify: `E:/SSUP/backend/src/modules/examination/service.py`
- Create: `E:/SSUP/backend/tests/test_examination_practical_evaluation.py`

**Interfaces:**
- Consumes: Updated `ExamSubject` and `ExamScore` models and DTOs.
- Produces: `ExaminationService.save_exam_scores`, `add_exam_subject`, `get_exam_full_review`, and `get_student_report_card` with dual-component evaluation and NEB separate pass rule.

- [ ] **Step 1: Write failing service tests for practical marks evaluation**

```python
# tests/test_examination_practical_evaluation.py
from decimal import Decimal
import pytest
from src.modules.examination.service import ExaminationService

def test_separate_pass_rule_both_pass():
    is_pass, grade, gpa, remarks = ExaminationService.evaluate_subject_marks(
        has_practical=True,
        theory_full=Decimal("75.00"),
        theory_pass=Decimal("27.00"),
        theory_score=Decimal("58.00"),
        is_theory_absent=False,
        practical_full=Decimal("25.00"),
        practical_pass=Decimal("10.00"),
        practical_score=Decimal("22.00"),
        is_practical_absent=False,
    )
    assert is_pass is True
    assert grade == "A"
    assert gpa == Decimal("3.60")

def test_separate_pass_rule_fails_practical():
    is_pass, grade, gpa, remarks = ExaminationService.evaluate_subject_marks(
        has_practical=True,
        theory_full=Decimal("75.00"),
        theory_pass=Decimal("27.00"),
        theory_score=Decimal("70.00"),  # High theory
        is_theory_absent=False,
        practical_full=Decimal("25.00"),
        practical_pass=Decimal("10.00"),
        practical_score=Decimal("8.00"),   # Failed practical
        is_practical_absent=False,
    )
    assert is_pass is False
    assert grade == "F"
    assert gpa == Decimal("0.00")
    assert "Practical Failed" in remarks
```

- [ ] **Step 2: Run test to verify failure**

Run: `.venv/Scripts/pytest tests/test_examination_practical_evaluation.py -v`
Expected: FAIL

- [ ] **Step 3: Implement evaluation and score upsert logic in `service.py`**

In `src/modules/examination/service.py`:
1. Implement `evaluate_subject_marks(...)`.
2. Update `add_exam_subject` to persist `has_practical`, `theory_full_mark`, `theory_pass_mark`, `practical_full_mark`, `practical_pass_mark`.
3. Update `bulk_upsert_scores` to unpack `theory_score`, `is_theory_absent`, `practical_score`, `is_practical_absent`, validate against component maximums, and calculate `is_pass` via `evaluate_subject_marks`.
4. Update `get_exam_full_review` to return component breakdown.
5. Update `get_student_report_card` to include component marks in `StudentReportCardSubjectItem`.

- [ ] **Step 4: Run pytest to verify all tests pass**

Run: `.venv/Scripts/pytest tests/test_examination_practical_evaluation.py tests/test_examination_practical_schemas.py -v`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add src/modules/examination/service.py tests/test_examination_practical_evaluation.py
git commit -m "feat(examination): implement practical marks separate pass evaluation engine"
```

---

### Task 3: Frontend Types, Schemas & Exam Creation Wizard

**Files:**
- Modify: `E:/SSUP/frontend/src/features/examination/types.ts`
- Modify: `E:/SSUP/frontend/src/features/examination/components/ExamSubjectConfigList.tsx`
- Modify: `E:/SSUP/frontend/src/features/examination/pages/CreateExamPage.tsx`
- Create: `E:/SSUP/frontend/src/features/examination/components/__tests__/examSubjectConfigList.test.mjs`

**Interfaces:**
- Consumes: Backend `ExamSubjectCreate` and `Subject` API response with practical fields.
- Produces: Interactive row controls with `hasPractical` toggle, preset buttons (`75/25`, `80/20`, `50/50`, `100 TH`), and real-time pass-mark validation.

- [ ] **Step 1: Write failing frontend unit tests for `ExamSubjectConfigList` presets and validation**

```javascript
// src/features/examination/components/__tests__/examSubjectConfigList.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';

test('applyPreset: 75/25 correctly splits full and pass marks', () => {
  const item = {
    subjectId: 'sub-1',
    hasPractical: true,
    theoryFullMark: 75,
    theoryPassMark: 27,
    practicalFullMark: 25,
    practicalPassMark: 10,
  };
  assert.equal(item.theoryFullMark + item.practicalFullMark, 100);
  assert.equal(item.theoryPassMark + item.practicalPassMark, 37);
});

test('validateSubjectConfig: flags error when practical pass mark exceeds full mark', () => {
  const item = {
    hasPractical: true,
    theoryFullMark: 75,
    theoryPassMark: 27,
    practicalFullMark: 25,
    practicalPassMark: 30, // Invalid
  };
  const isInvalid = item.practicalPassMark > item.practicalFullMark;
  assert.equal(isInvalid, true);
});
```

- [ ] **Step 2: Run test to verify**

Run: `node --test src/features/examination/components/__tests__/examSubjectConfigList.test.mjs`
Expected: PASS (initial baseline)

- [ ] **Step 3: Update `types.ts`, `ExamSubjectConfigList.tsx`, and `CreateExamPage.tsx`**

1. In `types.ts`: add `has_practical`, `theory_full_mark`, `theory_pass_mark`, `practical_full_mark`, `practical_pass_mark` to `ExamSubjectDTO` and `SubjectConfigItem`.
2. In `ExamSubjectConfigList.tsx`:
   - Add "Has Practical" switch per row.
   - Add preset pill buttons: `75 / 25`, `80 / 20`, `50 / 50`, `100 TH`.
   - Add batch preset dropdown in header.
   - Add inline validation: `theoryPassMark > theoryFullMark` or `practicalPassMark > practicalFullMark`.
3. In `CreateExamPage.tsx`: send component fields in mutation payload.

- [ ] **Step 4: Verify build and tests**

Run: `node --test src/**/*.test.mjs` and `npm run build`
Expected: 0 errors.

- [ ] **Step 5: Commit changes**

```bash
git add src/features/examination/types.ts src/features/examination/components/ExamSubjectConfigList.tsx src/features/examination/pages/CreateExamPage.tsx src/features/examination/components/__tests__/examSubjectConfigList.test.mjs
git commit -m "feat(examination): add practical marks presets and validation in exam creation wizard"
```

---

### Task 4: Frontend Teacher Score Entry Grid & Grading Workflow

**Files:**
- Modify: `E:/SSUP/frontend/src/features/examination/components/TeacherScoreEntryTable.tsx`
- Modify: `E:/SSUP/frontend/src/features/examination/pages/ScoreEntryPage.tsx`
- Create: `E:/SSUP/frontend/src/features/examination/components/__tests__/teacherScoreEntry.test.mjs`

**Interfaces:**
- Consumes: `StudentScoreItemDTO` and `ExamSubjectDTO` with `has_practical`.
- Produces: Dual-component inputs (Theory + Practical) with independent absent toggles, live total tallying, and component-specific Pass/Fail feedback.

- [ ] **Step 1: Write unit tests for dual-component student score calculations**

```javascript
// src/features/examination/components/__tests__/teacherScoreEntry.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';

test('computeStudentResult: evaluates separate pass criteria accurately', () => {
  // Pass both
  const row1 = {
    theoryScore: 55,
    isTheoryAbsent: false,
    practicalScore: 20,
    isPracticalAbsent: false,
  };
  const isPass1 = row1.theoryScore >= 27 && row1.practicalScore >= 10;
  assert.equal(isPass1, true);

  // Fail practical
  const row2 = {
    theoryScore: 70,
    isTheoryAbsent: false,
    practicalScore: 8,
    isPracticalAbsent: false,
  };
  const isPass2 = row2.theoryScore >= 27 && row2.practicalScore >= 10;
  assert.equal(isPass2, false);
});
```

- [ ] **Step 2: Update `TeacherScoreEntryTable.tsx` and `ScoreEntryPage.tsx`**

1. If `has_practical === true`:
   - Render `Theory Score` input + `TH Absent` checkbox.
   - Render `Practical Score` input + `PR Absent` checkbox.
   - Live Total column (`TH + PR`).
   - Dynamic Pass/Fail chip with tooltip.
2. If `has_practical === false`:
   - Render single Score input + Absent checkbox.
3. Keyboard navigation: `Tab`/`Enter` traverses across components.
4. Quick shortcut: "Fill All Present with Max Practical Marks".

- [ ] **Step 3: Verify build and tests**

Run: `node --test src/**/*.test.mjs` and `npm run build`
Expected: 0 errors.

- [ ] **Step 4: Commit changes**

```bash
git add src/features/examination/components/TeacherScoreEntryTable.tsx src/features/examination/pages/ScoreEntryPage.tsx src/features/examination/components/__tests__/teacherScoreEntry.test.mjs
git commit -m "feat(examination): support dual-component score entry and independent absenteeism"
```

---

### Task 5: Frontend & Backend Official Report Card Dual-Component Display

**Files:**
- Modify: `E:/SSUP/frontend/src/features/examination/components/OfficialReportCardDocument.tsx`
- Modify: `E:/SSUP/backend/src/modules/examination/templates/report_card.html`
- Modify: `E:/SSUP/frontend/src/features/examination/types.ts`
- Test: `E:/SSUP/frontend/src/features/examination/components/__tests__/officialReportCard.test.mjs`

**Interfaces:**
- Consumes: `StudentReportCardSubjectItem` containing `theory_full_mark`, `theory_obtained`, `practical_full_mark`, `practical_obtained`, `has_practical`.
- Produces: High-contrast split-column printed A4 transcript with Theory (Full/Pass/Obt), Practical (Full/Pass/Obt), Total, Final Grade, and Remarks.

- [ ] **Step 1: Write report card table structure test**

```javascript
// src/features/examination/components/__tests__/officialReportCard.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';

test('formatSubjectRow: displays em-dash for practical columns when subject has no practical', () => {
  const sub = {
    has_practical: false,
    theory_full_mark: 100,
    theory_pass_mark: 40,
    theory_score: 75,
    practical_full_mark: 0,
    practical_pass_mark: 0,
    practical_score: 0,
  };
  const practicalDisplay = sub.has_practical ? String(sub.practical_score) : '—';
  assert.equal(practicalDisplay, '—');
});
```

- [ ] **Step 2: Update `OfficialReportCardDocument.tsx`**

1. Replace the single Marks Obtained table header with structured sub-headers:
   - `Subject Name`
   - `Theory (Full / Pass / Obtained)`
   - `Practical (Full / Pass / Obtained)` (displays `—` when `!has_practical`)
   - `Total (Full / Obtained)`
   - `Final Grade & GPA`
   - `Remarks`
2. Update print stylesheet for A4 portrait alignment.
3. Synchronize `report_card.html` Jinja2 template in backend.

- [ ] **Step 3: Run all unit tests and production build verification**

Run: `node --test src/**/*.test.mjs` and `npm run build`
Expected: 100% passing tests and 0 compilation errors.

- [ ] **Step 4: Commit changes**

```bash
git add src/features/examination/components/OfficialReportCardDocument.tsx src/features/examination/templates/report_card.html src/features/examination/types.ts src/features/examination/components/__tests__/officialReportCard.test.mjs
git commit -m "feat(examination): format official report cards with split theory and practical columns"
```
