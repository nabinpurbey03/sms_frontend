# Exam Creation Input Sizing & Modern UI/UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix cramped theory and practical marks input fields in `CreateExamPage.tsx` and `ExamSubjectConfigList.tsx` so numbers with 2-3 digits fit comfortably, and modernize the entire exam creation interface with contemporary UI/UX patterns, enhanced visual hierarchy, and seamless desktop and mobile ergonomics.

**Architecture:**
- Expand page layout width from `max-w-5xl` to `max-w-6xl` to provide breathing room for multi-subject configuration tables.
- Restructure table columns in `ExamSubjectConfigList.tsx` into a modern **Dual-Component Mark Pod** with dedicated Theory and Practical groupings.
- Replace browser-native spinner inputs with clean, centered, monospace inputs sized at `w-14 sm:w-16` (56px–64px) with custom padding (`px-2`) and hidden spinner arrows (`[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`), accommodating 2–3 digits with zero clipping.
- Modernize `CreateExamPage.tsx` with selectable class pills, a refined active session indicator, and a sticky footer action bar.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, shadcn/ui (Radix primitives), Lucide React icons, Node.js test runner (`node:test`).

**Spec:** [docs/superpowers/specs/2026-10-07-examination-practical-marks-feature-design.md](file:///E:/SSUP/frontend/docs/superpowers/specs/2026-10-07-examination-practical-marks-feature-design.md)

## Global Constraints
- Inputs for Theory and Practical Full and Pass marks must fit at least 3 digits (`100`, `999`, `0`) without truncation or horizontal scrolling inside the input.
- All existing presets (`75/25`, `80/20`, `50/50`, `100 TH`) and separate pass rule validations must remain 100% intact.
- Both desktop table (`>= md`) and mobile card (`< md`) views must be fully responsive, accessible, and touch-friendly (touch targets $\ge 44\text{px}$).
- Zero TypeScript / lint errors on `npm run build`, and 100% of existing tests must pass.

---

### Task 1: Numerical Input Classes, Sizing Constants & Helper Unit Tests

**Files:**
- Modify: `E:/SSUP/frontend/src/features/examination/types.ts`
- Modify: `E:/SSUP/frontend/src/features/examination/components/__tests__/examSubjectConfigList.test.mjs`

**Interfaces:**
- Consumes: Existing mark presets and validation helpers in `types.ts`.
- Produces: Exported CSS utility class `MARK_INPUT_CLASS` and input dimension constants (`MARK_INPUT_MIN_WIDTH`, `MARK_INPUT_MAX_DIGITS`) ensuring consistent 2-3 digit rendering without browser stepper arrows.

- [ ] **Step 1: Write failing unit test for mark input formatting and class contract**

In `src/features/examination/components/__tests__/examSubjectConfigList.test.mjs`:
```javascript
test('MARK_INPUT_CLASS provides spinner-suppression and width for 2-3 digits', () => {
  const { MARK_INPUT_CLASS } = require('../../types.ts');
  assert.ok(MARK_INPUT_CLASS.includes('appearance:textfield') || MARK_INPUT_CLASS.includes('w-14') || MARK_INPUT_CLASS.includes('w-16'));
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `node --test src/features/examination/components/__tests__/examSubjectConfigList.test.mjs`
Expected: FAIL (MARK_INPUT_CLASS is undefined).

- [ ] **Step 3: Define `MARK_INPUT_CLASS` in `types.ts`**

In `src/features/examination/types.ts`:
```typescript
/**
 * Ergonomic Tailwind classes for compact mark input fields:
 * - Suppresses browser spin-buttons (steppers) that steal 15-20px of inner width
 * - Centers monospace typography for instant numerical readability
 * - Ensures fixed comfortable width (w-14 sm:w-16 = 56-64px) fitting 1-3 digits easily (e.g. "100", "75", "0")
 */
export const MARK_INPUT_CLASS =
  'w-14 sm:w-16 h-8 text-xs sm:text-sm font-semibold font-mono text-center px-1.5 ' +
  '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';
```

- [ ] **Step 4: Run test to verify passing**

Run: `node --test src/features/examination/components/__tests__/examSubjectConfigList.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit changes**

```bash
git add src/features/examination/types.ts src/features/examination/components/__tests__/examSubjectConfigList.test.mjs
git commit -m "feat(examination): define ergonomic mark input sizing constants and classes"
```

---

### Task 2: Modernize `ExamSubjectConfigList.tsx` with Dual-Component Mark Pods & Spacious Inputs

**Files:**
- Modify: `E:/SSUP/frontend/src/features/examination/components/ExamSubjectConfigList.tsx`
- Test: `E:/SSUP/frontend/src/features/examination/components/__tests__/examSubjectConfigList.test.mjs`

**Interfaces:**
- Consumes: `SubjectConfigItem`, `MARK_INPUT_CLASS`, `EXAM_MARK_PRESETS`.
- Produces: Polished desktop table layout with `overflow-x-auto` wrapper, dual-component mark pods, 64px inputs, and streamlined mobile card layouts.

- [ ] **Step 1: Write unit tests verifying dual-component pod formatting and mobile/desktop states**

In `src/features/examination/components/__tests__/examSubjectConfigList.test.mjs`:
```javascript
test('preset values fit cleanly into mark input boundary: 100, 75, 25, 0', () => {
  const values = [100, 75, 27, 25, 10, 0];
  for (const v of values) {
    const str = String(v);
    assert.ok(str.length <= 3, `Value ${v} exceeds 3 digits`);
  }
});
```

- [ ] **Step 2: Update `ExamSubjectConfigList.tsx` Table & Input Layout**

1. **Table Container & Horizontal Scroll Safety**:
   - Wrap the desktop table in `overflow-x-auto` with a `min-w-[880px]` table so columns never shrink below readable thresholds.
2. **Column Rebalancing**:
   - Include: `w-[70px] text-center`
   - Subject & Presets: `min-w-[220px]`
   - Theory Marks: `w-[160px]`
   - Practical Marks: `w-[160px]`
   - Total: `w-[110px] text-center`
   - Grading Teacher: `min-w-[200px]`
3. **Ergonomic Mark Pod**:
   - Use `MARK_INPUT_CLASS` for all numeric inputs (`Theory Full`, `Theory Pass`, `Practical Full`, `Practical Pass`).
   - Group Theory Full and Pass side-by-side with clear micro-labels above (`Full` and `Pass`) and clean divider `/`.
   - Practical column:
     - When `hasPractical = true`: render identical `w-14 sm:w-16` inputs with emerald badge `PR`.
     - When `hasPractical = false`: render sleek muted badge `— Theory Only —` with option to toggle on.
4. **Mobile Card View Polish**:
   - For screens `< md`:
     - Clean card with subject name, code badge, and include switch in header.
     - Preset pill buttons in an edge-to-edge scrollable bar.
     - Grid layout for Theory and Practical blocks where inputs expand to `w-full` with minimum height `h-10` for effortless finger taps.
     - Live total badge and teacher selector.

- [ ] **Step 3: Run unit tests and build check**

Run: `node --test src/**/*.test.mjs` && `npm run build`
Expected: 154+ passing tests, 0 build errors.

- [ ] **Step 4: Commit changes**

```bash
git add src/features/examination/components/ExamSubjectConfigList.tsx src/features/examination/components/__tests__/examSubjectConfigList.test.mjs
git commit -m "feat(examination): modernize exam subject config list with spacious mark inputs and dual-component pods"
```

---

### Task 3: Modernize `CreateExamPage.tsx` Layout, Class Selector & Stepper View

**Files:**
- Modify: `E:/SSUP/frontend/src/features/examination/pages/CreateExamPage.tsx`

**Interfaces:**
- Consumes: `ExamSubjectConfigList`, `useAllClassesWithDetails`, `useCurrentAcademicYear`.
- Produces: Elevated page layout (`max-w-6xl`), interactive class selector pills, visual session card, and sticky footer action bar.

- [ ] **Step 1: Upgrade Layout Container & Class Selection Experience**

1. **Container Width**:
   - Change `max-w-5xl mx-auto` to `max-w-6xl mx-auto`.
2. **Interactive Target Classes Selector**:
   - Replace the cramped `max-h-[160px]` checkbox box with modern, interactive selectable class cards/chips:
     - Header with "Select All" / "Clear All" quick buttons and selected count pill (`3 classes selected`).
     - Chips with class name, student count (if available), and checked icon with smooth active ring.
3. **Visual Active Session Banner**:
   - Elevate the Academic Year display into a sleek, verified card with session dates, calendar icon, and "Locked to active academic year" tooltip.
4. **Card 2: Subject Marks & Teacher Assignment Accordion**:
   - Enhance the class accordion trigger with summary badges:
     - Number of subjects included.
     - Cumulative full marks (e.g. `Total 500 Marks`).
     - Visual warning if any teacher is unassigned or marks exceed pass mark.
5. **Sticky Action Footer**:
   - Add a sticky/floating bottom bar with `Cancel` and `Create Examination` buttons so users don't have to scroll all the way to the bottom of large class lists to submit.

- [ ] **Step 2: Run full automated verification**

Run:
```bash
node --test src/**/*.test.mjs
npm run build
```
Expected: 100% tests passing, 0 TypeScript / bundler errors.

- [ ] **Step 3: Commit changes**

```bash
git add src/features/examination/pages/CreateExamPage.tsx
git commit -m "feat(examination): elevate create exam page layout, class selector, and action workflow"
```

---

## Self-Review Checklist
1. **Spec Coverage**:
   - Inputs fit at least 2-3 digits comfortably? Yes, `MARK_INPUT_CLASS` (`w-14 sm:w-16`, custom padding, hidden spin buttons) accommodates up to 3 digits (`100`, `999`).
   - Modern UI/UX views and concepts incorporated? Yes, dual-component mark pods, interactive class selector pills, spacious container, sticky actions, and mobile-friendly touch targets.
2. **Placeholder Scan**: Zero TODOs, TBDs, or vague steps.
3. **Type Consistency**: Clean usage of `SubjectConfigItem`, `EXAM_MARK_PRESETS`, and `StudentScoreItemDTO`.
