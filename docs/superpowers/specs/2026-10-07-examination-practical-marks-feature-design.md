# Examination Practical Marks Feature Design Specification

- **Date:** 2026-10-07
- **Status:** Approved
- **Scope:** Full-Stack (Backend DB & Engine + Frontend Exam Creation, Score Entry, and Report Cards)
- **Target Branch:** `nabin`

---

## 1. Overview & Business Requirements

In modern secondary and high school education (including Nepal Curriculum Development Centre [CDC] and National Examination Board [NEB] standards), many subjects comprise both theoretical (written) and practical (laboratory / project / internal) components:
- Subjects like *Science*, *Computer Science*, *Accountancy*, and *Health & Physical Education* divide marks into Theory (e.g., 75 full / 27 pass) and Practical (e.g., 25 full / 10 pass).
- Subjects like *Mathematics*, *Nepali*, and *English* may be purely theoretical (100 full / 40 pass) or feature internal assessments.

### Core Problems Solved
1. **Unified Mark Limitation:** Previously, the examination module only supported a single `full_mark` and `pass_mark` per subject. Teachers had no native mechanism to record theory vs. practical marks independently.
2. **Missing Independent Pass Criteria:** Standard academic rules mandate that students pass both Theory and Practical independently. A student failing the practical lab test or absent from the written theory paper cannot pass the subject based merely on combined points.
3. **Report Card Transcript Ambiguity:** Official report cards collapsed marks into a single column, obscuring practical project and laboratory contributions.

---

## 2. Architectural Design & Data Models

### 2.1 Academic Subject Master Model (`src/modules/academic/models.py`)
To enable smart defaults when creating examinations, the `subjects` table stores optional default marks:

```python
class Subject(TenantBase):
    __tablename__ = "subjects"

    class_id: Mapped[str] = mapped_column(String(36), ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Practical Marks Configuration Template
    has_practical: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    theory_full_mark: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2), nullable=True, default=Decimal("100.00"))
    theory_pass_mark: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2), nullable=True, default=Decimal("40.00"))
    practical_full_mark: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2), nullable=True, default=Decimal("0.00"))
    practical_pass_mark: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2), nullable=True, default=Decimal("0.00"))
```

### 2.2 Exam Subject Model (`src/modules/examination/models.py`)
Stores the actual mark scheme configured for a subject in a specific examination:

```python
class ExamSubject(TenantBase):
    __tablename__ = "exam_subjects"

    exam_id: Mapped[str] = mapped_column(String(36), ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id: Mapped[str] = mapped_column(String(36), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)

    # Component breakdown
    has_practical: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    theory_full_mark: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False, default=Decimal("100.00"))
    theory_pass_mark: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False, default=Decimal("40.00"))
    practical_full_mark: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False, default=Decimal("0.00"))
    practical_pass_mark: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False, default=Decimal("0.00"))

    # Cumulative fields (preserved for 100% backward compatibility & fast indexing)
    full_mark: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)  # theory_full_mark + practical_full_mark
    pass_mark: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)  # theory_pass_mark + practical_pass_mark

    assigned_teacher_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(20), default=ExamSubjectStatus.PENDING.value, nullable=False, index=True)
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, default=None)

    __table_args__ = (
        CheckConstraint("theory_pass_mark <= theory_full_mark", name="ck_exam_subject_theory_pass_le_full"),
        CheckConstraint("practical_pass_mark <= practical_full_mark", name="ck_exam_subject_practical_pass_le_full"),
        CheckConstraint("full_mark > 0", name="ck_exam_subject_full_mark_positive"),
        CheckConstraint("pass_mark >= 0", name="ck_exam_subject_pass_mark_non_negative"),
        Index("uq_exam_subject_active", "exam_id", "subject_id", unique=True,
              postgresql_where=text("deleted_at IS NULL"),
              sqlite_where=text("deleted_at IS NULL")),
    )
```

### 2.3 Exam Score Model (`src/modules/examination/models.py`)
Tracks student achievements per component and supports independent absenteeism:

```python
class ExamScore(TenantBase):
    __tablename__ = "exam_scores"

    exam_subject_id: Mapped[str] = mapped_column(String(36), ForeignKey("exam_subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)

    # Theory Component
    theory_score: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2), nullable=True)
    is_theory_absent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Practical Component
    practical_score: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2), nullable=True)
    is_practical_absent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Cumulative fields (preserved for backward compatibility)
    score: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2), nullable=True)  # (theory_score or 0) + (practical_score or 0)
    is_absent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False) # true if absent in all applicable components

    __table_args__ = (
        CheckConstraint(
            "(is_theory_absent = true AND theory_score = 0) OR (is_theory_absent = false AND theory_score IS NOT NULL)",
            name="ck_exam_score_theory_absent",
        ),
        Index("uq_exam_score_student_active", "exam_subject_id", "student_id", unique=True,
              postgresql_where=text("deleted_at IS NULL"),
              sqlite_where=text("deleted_at IS NULL")),
    )
```

---

## 3. Backend Logic & Evaluation Engine

### 3.1 Pass / Fail Evaluation Rules
A subject result is marked as `is_pass = True` if and only if:
1. `is_theory_absent is False` and `theory_score >= exam_subject.theory_pass_mark`.
2. If `exam_subject.has_practical is True`:
   `is_practical_absent is False` and `practical_score >= exam_subject.practical_pass_mark`.

If either component fails:
- `is_pass = False`
- `grade = "F"` (or `"NG"`)
- `grade_point = Decimal("0.00")`
- Remarks accurately reflect the deficient component:
  - If Theory failed: `"Theory Failed (scored X < pass Y)"`
  - If Practical failed: `"Practical Failed (scored X < pass Y)"`
  - If absent in Theory: `"Absent (Theory)"`
  - If absent in Practical: `"Absent (Practical)"`
  - If absent in both: `"Absent (AB)"`

### 3.2 GPA & Grade Calculation
When both components pass:
$$\text{Percentage} = \frac{\text{Theory Obtained} + \text{Practical Obtained}}{\text{Total Full Marks}} \times 100$$
Standard NEB/CDC Letter Grade mapping:
- $\ge 90\%$: **A+** (GPA: 4.00, Outstanding)
- $\ge 80\%$: **A** (GPA: 3.60, Excellent)
- $\ge 70\%$: **B+** (GPA: 3.20, Very Good)
- $\ge 60\%$: **B** (GPA: 2.80, Good)
- $\ge 50\%$: **C+** (GPA: 2.40, Satisfactory)
- $\ge 40\%$: **C** (GPA: 2.00, Acceptable)
- $< 40\%$ (or failed component): **F / NG** (GPA: 0.00, Needs Improvement)

---

## 4. Frontend User Experience (UI/UX Pro Max)

### 4.1 Exam Creation Wizard (`CreateExamPage.tsx` & `ExamSubjectConfigList.tsx`)
1. **Catalog Auto-Inheritance:** When classes are selected, subjects inherit `has_practical`, `theory_full_mark`, and `practical_full_mark` from the subject catalog.
2. **Interactive Row Controls:**
   - "Has Practical" switch toggle.
   - When active, reveals dual input boxes: `Theory (Full/Pass)` and `Practical (Full/Pass)`.
   - Preset chips:
     - `75 / 25` (Auto Pass: `27 / 10`)
     - `80 / 20` (Auto Pass: `32 / 8`)
     - `50 / 50` (Auto Pass: `20 / 20`)
     - `100 TH` (Pure theory)
3. **Batch Action Header:** A dropdown menu allows applying `75/25` or `100 TH` to all selected subjects simultaneously.
4. **Validation Guard:** Prevents creation if pass mark exceeds full mark in any component.

### 4.2 Teacher Score Entry Grid (`ScoreEntryPage.tsx` & `TeacherScoreEntryTable.tsx`)
1. **Dynamic Columns:**
   - Pure Theory subjects show a single score box and absent toggle.
   - Dual-component subjects display:
     - `Theory Score` input + `TH Absent` checkbox.
     - `Practical Score` input + `PR Absent` checkbox.
     - Live auto-summed `Total Obtained` pill.
     - Dynamic Pass/Fail chip with descriptive tooltip.
2. **Keyboard Ergonomics:** Tab/Enter cycles cleanly across TH and PR fields for rapid keyboard entry.
3. **Batch Practical Fill:** Quick shortcut in the Practical column header to populate full lab marks for all present students.

### 4.3 Official Report Card (`OfficialReportCardDocument.tsx` & `report_card.html`)
1. **Standard Split-Column Matrix:**
   - Table columns:
     - `Subject Name`
     - `Theory (Full / Pass / Obtained)`
     - `Practical (Full / Pass / Obtained)` — renders clean em-dash `—` for non-practical subjects.
     - `Total (Full / Obtained)`
     - `Final Grade & GPA`
     - `Remarks`
2. **Grand Total Summary:** Computes Total Full Marks, Total Marks Obtained, Cumulative Percentage, Overall GPA, and Overall Pass/Fail status.
3. **Print Layout:** Tuned for standard A4 portrait print with high-contrast text and zero table clipping.

---

## 5. Verification & Testing Strategy

### Backend Automated Tests (`tests/test_examination_practical_marks.py`):
1. Create exam with mixed subjects (some with practicals, some pure theory).
2. Validate check constraints preventing pass mark > full mark in both components.
3. Verify independent absenteeism (absent in Theory, present in Practical).
4. Verify separate pass rule (student scoring 70/75 in Theory but 8/25 in Practical fails the subject with `F / 0.00`).
5. Verify student passing both components receives proper letter grade and GPA.
6. Verify report card PDF rendering and summary math.

### Frontend Automated Tests (`src/features/examination/**/__tests__`):
1. Unit test `ExamSubjectConfigList` presets and validation behavior.
2. Unit test `TeacherScoreEntryTable` dual-component score calculation and absent states.
3. Unit test `OfficialReportCardDocument` split-column rendering and dash placement.
4. Run `npm run build` to confirm 0 TypeScript / bundling errors.
