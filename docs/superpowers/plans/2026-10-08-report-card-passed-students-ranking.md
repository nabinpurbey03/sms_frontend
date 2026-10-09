# Report Card Passed-Students-Only Ranking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exclude failed students from report card ranking so that only students who pass all exam subjects receive class and section ranks, calculated strictly among passing peers.

**Architecture:**
In `backend/src/modules/examination/service.py`, update ranking aggregation in both `get_official_student_report_card` and `get_parent_children_report_cards`. For every student in the class, evaluate pass status across all exam subjects. Only students who pass every subject are placed into the ranked pool; failed students receive `rank_in_class = None` and `rank_in_section = None`. Rank denominators (e.g., `1 / P`) represent the total count of passed students in the class/section.

**Tech Stack:**
- Python 3.12, FastAPI, SQLAlchemy ORM, Pydantic v2
- Pytest, Jinja2 template rendering

**Spec:** User request: "in the backend, reportcard lets not give rank to the failed student and only provide rank to the passed students."

## Global Constraints
- Only students with `is_passed == True` across all exam subjects may receive `rank_in_class` or `rank_in_section`.
- If a student failed any subject (theory or practical component < pass mark, absent, or missing score), their `rank_in_class` and `rank_in_section` MUST be `None`.
- The rank denominator must reflect the total number of passed students in the cohort (e.g. `f"{rank} / {passed_count}"`).
- Standard competition ranking (1224 ranking) must be preserved for tied scores among passed students.
- All existing endpoints, DTOs (`ReportCardSummary`, `ChildPublishedExamItem`), templates (`report_card.html`), and frontend components must continue to function without schema regressions.

---

### Task 1: Backend Service Ranking Calculation Refactor

**Files:**
- Modify: `backend/src/modules/examination/service.py:1760-1795, 2110-2155`

**Interfaces:**
- Consumes: `calculate_subject_performance`, `ExamScore`, `ExamSubject`, `all_class_students`
- Produces:
  - `ReportCardSummary.rank_in_class: Optional[str]`
  - `ReportCardSummary.rank_in_section: Optional[str]`
  - `ChildPublishedExamItem.rank_in_class: Optional[str]`

- [x] **Step 1: Update official report card ranking in `get_official_student_report_card`**

In `backend/src/modules/examination/service.py`, replace lines 2112-2152 with passed-students-only filtering:

```python
        # Ranks across passed students in class and section
        student_totals = []
        for c_st in all_class_students:
            c_st_passed = True if exam_subjects else False
            c_st_tot = Decimal("0.00")
            for es in exam_subjects:
                sc = score_lookup.get((c_st.id, es.id))
                if not sc:
                    c_st_passed = False
                    continue
                _, _, _, is_pass = calculate_subject_performance(
                    score=sc.score,
                    pass_mark=es.pass_mark,
                    full_mark=es.full_mark,
                    is_absent=sc.is_absent,
                    has_practical=es.has_practical,
                    theory_score=sc.theory_score,
                    theory_pass_mark=es.theory_pass_mark,
                    practical_score=sc.practical_score,
                    practical_pass_mark=es.practical_pass_mark,
                    is_theory_absent=sc.is_theory_absent,
                    is_practical_absent=sc.is_practical_absent,
                )
                if not is_pass:
                    c_st_passed = False
                if not sc.is_absent and sc.score is not None:
                    c_st_tot += sc.score

            student_totals.append({
                "student_id": c_st.id,
                "section_id": c_st.section_id,
                "total_score": c_st_tot,
                "is_passed": c_st_passed,
            })

        rank_in_class = None
        rank_in_section = None

        if all_passed:
            sorted_passed_class = sorted(
                [s for s in student_totals if s["is_passed"]],
                key=lambda x: x["total_score"],
                reverse=True,
            )
            total_passed_class_cnt = len(sorted_passed_class)
            rank_class_idx = 1
            for idx, item in enumerate(sorted_passed_class):
                if idx > 0 and item["total_score"] < sorted_passed_class[idx - 1]["total_score"]:
                    rank_class_idx = idx + 1
                if item["student_id"] == student_id:
                    break
            rank_in_class = (
                f"{rank_class_idx} / {total_passed_class_cnt}"
                if total_passed_class_cnt > 0
                else str(rank_class_idx)
            )

            if student.section_id:
                sec_passed_students = [
                    s for s in sorted_passed_class if s["section_id"] == student.section_id
                ]
                total_passed_sec_cnt = len(sec_passed_students)
                rank_sec_idx = 1
                for idx, item in enumerate(sec_passed_students):
                    if idx > 0 and item["total_score"] < sec_passed_students[idx - 1]["total_score"]:
                        rank_sec_idx = idx + 1
                    if item["student_id"] == student_id:
                        break
                rank_in_section = (
                    f"{rank_sec_idx} / {total_passed_sec_cnt}"
                    if total_passed_sec_cnt > 0
                    else str(rank_sec_idx)
                )
```

- [x] **Step 2: Update parent report cards ranking in `get_parent_children_report_cards`**

In `backend/src/modules/examination/service.py`, replace lines 1762-1791 with:

```python
        # Calculate rank map per exam for passed students only: exam_id -> { student_id: "1 / N" }
        exam_rank_map: Dict[str, Dict[str, str]] = {}
        for exam in approved_exams:
            e_subjects = exam_subjects_by_exam.get(exam.id, [])
            c_students = class_students_by_class.get(exam.class_id, [])
            passed_student_totals = []
            for c_st in c_students:
                c_st_passed = True if e_subjects else False
                st_total = Decimal("0.00")
                for es in e_subjects:
                    sc = score_lookup.get((c_st.id, es.id))
                    if not sc:
                        c_st_passed = False
                        continue
                    _, _, _, is_pass = calculate_subject_performance(
                        score=sc.score,
                        pass_mark=es.pass_mark,
                        full_mark=es.full_mark,
                        is_absent=sc.is_absent,
                        has_practical=es.has_practical,
                        theory_score=sc.theory_score,
                        theory_pass_mark=es.theory_pass_mark,
                        practical_score=sc.practical_score,
                        practical_pass_mark=es.practical_pass_mark,
                        is_theory_absent=sc.is_theory_absent,
                        is_practical_absent=sc.is_practical_absent,
                    )
                    if not is_pass:
                        c_st_passed = False
                    if not sc.is_absent and sc.score is not None:
                        st_total += sc.score

                if c_st_passed:
                    passed_student_totals.append({"student_id": c_st.id, "total_score": st_total})

            sorted_totals = sorted(passed_student_totals, key=lambda x: x["total_score"], reverse=True)
            total_passed_cnt = len(sorted_totals)
            rank_map: Dict[str, str] = {}
            current_rank = 1
            for idx, item in enumerate(sorted_totals):
                if idx > 0 and item["total_score"] < sorted_totals[idx - 1]["total_score"]:
                    current_rank = idx + 1
                rank_map[item["student_id"]] = (
                    f"{current_rank} / {total_passed_cnt}" if total_passed_cnt > 0 else str(current_rank)
                )
            exam_rank_map[exam.id] = rank_map
```

- [x] **Step 3: Verification of service logic with quick syntax check**

Run: `.venv/Scripts/python.exe -m py_compile src/modules/examination/service.py` in `backend`
Expected: 0 errors

---

### Task 2: Automated Tests for Passed-Students Ranking

**Files:**
- Create: `backend/tests/test_report_card_ranking.py`
- Modify: `backend/tests/test_parent_report_cards.py:414-415` (if needed, verify existing behavior)

**Interfaces:**
- Consumes: `ExaminationService.get_student_official_report_card`, `ExaminationService.get_parent_children_report_cards`
- Produces: Comprehensive test coverage verifying ranking of passed and failed students.

- [x] **Step 1: Write comprehensive test file `backend/tests/test_report_card_ranking.py`**

Test scenarios to implement:
1. `test_official_report_card_ranking_excludes_failed_students`:
   - Setup a class with 3 students:
     - Student 1: Passes all subjects (High scores: 90, 95 -> Total 185) -> Rank 1 / 2
     - Student 2: Passes all subjects (Moderate scores: 70, 75 -> Total 145) -> Rank 2 / 2
     - Student 3: Fails one subject (Score: 20 < pass mark 40) -> Total 110, `is_passed == False`
   - Assert Student 1: `is_passed is True`, `rank_in_class == "1 / 2"`, `rank_in_section == "1 / 2"` (or matching section).
   - Assert Student 2: `is_passed is True`, `rank_in_class == "2 / 2"`, `rank_in_section == "2 / 2"`.
   - Assert Student 3: `is_passed is False`, `rank_in_class is None`, `rank_in_section is None`.
2. `test_official_report_card_ranking_with_tied_passed_students`:
   - 3 passed students:
     - S1: 180 (Rank 1 / 3)
     - S2: 180 (Rank 1 / 3 - tied)
     - S3: 160 (Rank 3 / 3 - skips rank 2)
   - Verify tied rank formatting.
3. `test_parent_report_cards_rank_excludes_failed_student`:
   - Call `get_parent_children_report_cards`.
   - For child of parent who passed: `rank_in_class == "1 / 2"`.
   - For child of parent who failed: `rank_in_class is None`.

- [x] **Step 2: Run pytest to verify all new ranking tests pass**

Run: `.venv/Scripts/pytest.exe tests/test_report_card_ranking.py -v` in `backend`
Expected: All tests pass.

- [x] **Step 3: Run existing test suites to prevent regressions**

Run:
- `.venv/Scripts/pytest.exe tests/test_parent_report_cards.py`
- `.venv/Scripts/pytest.exe tests/test_report_card_pdf_generation.py`
Expected: 100% PASS.

---

### Task 3: Full End-to-End Verification & Frontend Health Check

**Files:**
- Test verification across backend & frontend.

- [x] **Step 1: Run complete exam test suite in backend**

Run:
`.venv/Scripts/pytest.exe tests/test_report_card_ranking.py tests/test_parent_report_cards.py tests/test_report_card_pdf_generation.py tests/test_examination_lifecycle.py tests/test_examination_section_grading.py`
Expected: All tests pass without errors.

- [x] **Step 2: Verify frontend type check**

Run: `npx tsc -b` in `frontend`
Expected: Exits with code 0.
