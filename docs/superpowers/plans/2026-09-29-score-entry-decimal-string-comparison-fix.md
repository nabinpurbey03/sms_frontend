# Score Entry Lexicographical String Comparison Bug Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the false validation error ("Score must be between 0 and 100.00") that appears when a teacher opens a grading sheet with scores previously entered by an office admin, caused by lexicographical string comparisons between backend `Decimal` string representations (e.g. `"45.00"` > `"100.00"`).

**Architecture:**
- The backend stores and returns exam marks and scores as PostgreSQL `Numeric(6, 2)` / Pydantic `Decimal`. When serialized to JSON, these values arrive at the frontend as string representations (e.g., `full_mark: "100.00"`, `score: "45.00"`).
- In `TeacherScoreEntryTable.tsx` and `ScoreEntryPage.tsx`, the validation expression `row.score > fullMark` compares two strings lexicographically: `"45.00" > "100.00"` evaluates to `true` (since character `'4'` > `'1'`). This marks valid scores (22.00, 35.00, 45.00, 55.00, 85.00, 95.00) as invalid with red borders and error messages.
- Coerce `fullMark`, `passMark`, and `score` strictly to numeric types (`Number(...)`) in `ScoreEntryPage.tsx`, `TeacherScoreEntryTable.tsx`, and `InlineScoreCell.tsx` before performing any range or pass/fail comparisons.

**Tech Stack:** TypeScript, React 19, shadcn/ui.

---

### Task 1: Coerce Scores and Marks to Numbers in `ScoreEntryPage.tsx`

**Files:**
- Modify: `E:\SSUP\frontend\src\features\examination\pages\ScoreEntryPage.tsx:145-215, 290-355`

**Interfaces:**
- Consumes: `review?.students`, `subject.full_mark`, `subject.pass_mark`
- Produces: `StudentGradingRow.score` guaranteed to be `number | null`, `fullMark` and `passMark` as numbers

- [ ] **Step 1: Normalize `score` to `number | null` in `studentRows` mapping**

In `ScoreEntryPage.tsx`, change lines 161-163 from:
```tsx
const score =
  local !== undefined ? local.score : (existing?.score ?? null);
```
to:
```tsx
const rawScore =
  local !== undefined ? local.score : (existing?.score ?? null);
const score =
  rawScore !== null && rawScore !== undefined && rawScore !== ''
    ? Number(rawScore)
    : null;
```

- [ ] **Step 2: Coerce `fullMark` and `passMark` to numbers**

Change lines 198-199 from:
```tsx
const fullMark = subject?.full_mark ?? 100;
const passMark = subject?.pass_mark ?? 40;
```
to:
```tsx
const fullMark = Number(subject?.full_mark ?? 100);
const passMark = Number(subject?.pass_mark ?? 40);
```

- [ ] **Step 3: Update `passCount` filter and validation checks in `handleSaveDraft` / `handleSubmitFinal`**

In `passCount`:
```tsx
const passCount = studentRows.filter(
  (r) => !r.isAbsent && r.score !== null && Number(r.score) >= passMark
).length;
```

In `handleSaveDraft` and `handleSubmitFinal`:
```tsx
const invalidRow = studentRows.find((r) => {
  if (r.isAbsent || r.score === null) return false;
  const s = Number(r.score);
  return isNaN(s) || s < 0 || s > fullMark;
});
```

And in payload generation:
```tsx
const payload: StudentScoreItemDTO[] = studentRows.map((r) => ({
  student_id: r.studentId,
  score: r.isAbsent ? 0 : (r.score !== null ? Number(r.score) : null),
  is_absent: r.isAbsent,
}));
```

---

### Task 2: Coerce Scores and Marks to Numbers in `TeacherScoreEntryTable.tsx` and `InlineScoreCell.tsx`

**Files:**
- Modify: `E:\SSUP\frontend\src\features\examination\components\TeacherScoreEntryTable.tsx:41-52, 114-173, 189-285`
- Modify: `E:\SSUP\frontend\src\features\examination\components\InlineScoreCell.tsx:110-125, 150-170`

- [ ] **Step 1: Coerce scores and pass mark in `renderResultBadge`**

In `TeacherScoreEntryTable.tsx`:
```tsx
function renderResultBadge(row: StudentGradingRow, passMark: number) {
  if (row.isAbsent) {
    return <Badge variant="destructive">Absent (0)</Badge>;
  }
  const scoreNum =
    row.score !== null && row.score !== undefined && row.score !== ''
      ? Number(row.score)
      : null;
  const passMarkNum = Number(passMark);
  if (scoreNum !== null && !isNaN(scoreNum)) {
    if (scoreNum >= passMarkNum) {
      return <Badge variant="success">Pass</Badge>;
    }
    return <Badge variant="destructive">Fail</Badge>;
  }
  return <Badge variant="secondary">Pending</Badge>;
}
```

- [ ] **Step 2: Update Table Cell score validation**

In `columns` definition:
```tsx
cell: (row) => {
  const scoreNum =
    row.score !== null && row.score !== undefined && row.score !== ''
      ? Number(row.score)
      : null;
  const fullMarkNum = Number(fullMark);
  const isInvalid =
    !row.isAbsent &&
    scoreNum !== null &&
    !isNaN(scoreNum) &&
    (scoreNum < 0 || scoreNum > fullMarkNum);
```

- [ ] **Step 3: Update Mobile Card score validation in `renderCard`**

```tsx
const renderCard = (row: StudentGradingRow) => {
  const scoreNum =
    row.score !== null && row.score !== undefined && row.score !== ''
      ? Number(row.score)
      : null;
  const fullMarkNum = Number(fullMark);
  const isInvalid =
    !row.isAbsent &&
    scoreNum !== null &&
    !isNaN(scoreNum) &&
    (scoreNum < 0 || scoreNum > fullMarkNum);
```

- [ ] **Step 4: Update `InlineScoreCell.tsx` numeric comparisons**

In `handleSave`:
```tsx
const numVal = parseFloat(inputScore);
const numFull = Number(fullMark);
if (isNaN(numVal)) {
  setErrorMessage('Invalid number');
  return;
}

if (numVal < 0 || numVal > numFull) {
  setErrorMessage(`Must be 0 - ${numFull}`);
  return;
}
```

In display:
```tsx
} else if (score !== null && score !== undefined) {
  const isPassed = Number(score) >= Number(passMark);
```

---

### Task 3: Verification & Build Check

- [ ] **Step 1: Run TypeScript typecheck**
Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 2: Run production build**
Run: `npm run build`
Expected: Successful build (exit 0).

- [ ] **Step 3: Run linter**
Run: `npm run lint`
Expected: 0 errors on modified files.
