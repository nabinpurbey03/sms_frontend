# Refine Class Teacher & Subject Assignment Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the `TeacherAssignmentBoard` component with 7 targeted UX, accessibility, and consistency fixes: remove duplicate add button on subject cards, standardize assigned pill badge visual language, clarify section tab student counts, make the tip banner dismissible/one-time, verify and guarantee the replace-confirmation flow, add accessible labels across all icon-only controls, and fix any placeholder typos.

**Architecture:** Modify [TeacherAssignmentBoard.tsx](file:///E:/PBAC/frontend/src/features/academic/components/TeacherAssignmentBoard.tsx) to streamline user interaction, unify visual cues, reinforce replacement safeguards, and persist user preferences in `localStorage`.

**Tech Stack:** React 19, `@dnd-kit/core`, `@tanstack/react-query`, Tailwind CSS v4, Lucide React, shadcn/ui.

---

## Proposed Changes

### Component: `TeacherAssignmentBoard.tsx`

#### [MODIFY] [TeacherAssignmentBoard.tsx](file:///E:/PBAC/frontend/src/features/academic/components/TeacherAssignmentBoard.tsx)

1. **Remove Duplicate "Add" Control on Subject Cards**:
   - In `SubjectCard`, remove the redundant `+` header icon button for unassigned subjects.
   - Keep the empty dashed drop zone as the single, clear entry point (`"Drop a teacher here / or click to pick"`), ensuring it is clickable with keyboard support (`role="button"`, `tabIndex={0}`).

2. **Unify "Assigned" Visual Language**:
   - In `SubjectCard`, replace the `<Check /> Assigned` text with a standardized pill badge matching the class teacher pattern:
     ```tsx
     <Badge variant="outline" className="text-[9px] px-2 py-0.5 font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
       Subject Teacher
     </Badge>
     ```
   - In `ClassTeacherDropCard`, maintain the purple pill badge:
     ```tsx
     <Badge variant="purple" className="text-[9px] px-2 py-0.5 font-semibold">
       Class Teacher
     </Badge>
     ```

3. **Clarify Section Tab Counts**:
   - In the section switcher tiles, update `{sec.student_count}` to show `{sec.student_count} {sec.student_count === 1 ? 'student' : 'students'}`.
   - Add a descriptive `title={`${sec.student_count ?? 0} enrolled students in Section ${sec.name}`}` so the count is never confused with subject or teacher counts.

4. **Make Tip Banner Dismissible & One-Time**:
   - Initialize tip state with `localStorage.getItem('schools_up_teacher_assignment_tip_dismissed') === 'true'`.
   - Automatically hide the banner and persist dismiss state upon any successful assignment (drag-and-drop or manual picker).
   - Render a dismiss `X` button on the tip banner so users can dismiss it immediately.

5. **Verify & Fortify Replace-Confirmation Flow**:
   - Verify `getSubjectAssignment` and `currentClassTeacherAssignment` lookup logic to properly match section-specific or class-wide assignments.
   - Verify in `handleDragEnd` and `handleSelectTeacherDirect` that dropping a different teacher on an occupied subject or class teacher slot ALWAYS triggers `setReplacementModal`.
   - Ensure Cancel leaves the existing assignment untouched, and Confirm executes `deleteAssignment` followed by `assignSubjectTeacherDirect` / `assignClassTeacherDirect`.

6. **Add Accessible Labels to Icon-Only Controls**:
   - In `SubjectCard`: Add `aria-label={`Unassign ${teacherName} from ${subject.name}`}` and `<span className="sr-only">...</span>` on the trash button.
   - In `ClassTeacherDropCard`: Add `aria-label={`Unassign ${teacherName} from Class Teacher`}` and `<span className="sr-only">...</span>`.
   - In `DraggableTeacherChip`: Add `aria-label={`Drag ${fullName} to assign as teacher`}`, `role="button"`, `tabIndex={0}`.
   - In search inputs and dialogs: Add `aria-label="Clear search"`, `aria-label="Dismiss tip"`, etc.

7. **Fix Placeholder & Copy Text**:
   - Check all subject empty states and labels to guarantee clean copy ("No subjects configured for this class", "Add Subject").

---

## Verification Plan

### Automated Verification
```bash
npm run build
npm run lint
```

### Manual Verification
1. Open **Classes & Sections** ➔ **View Sections & Roster** ➔ **Teacher Assignments**.
2. **Subject Cards**:
   - Confirm there is no `+` icon in the subject card header when unassigned; clicking the drop zone opens the picker.
   - Assign a teacher to a subject; confirm it displays the pill badge **"Subject Teacher"** (matching the **"Class Teacher"** badge style).
3. **Section Switcher**:
   - Confirm section tabs say e.g. `Section A (20 students)` instead of a raw number.
4. **Tip Banner**:
   - Confirm the tip banner has an `X` button and disappears permanently when dismissed or when an assignment completes.
5. **Replacement Flow**:
   - Drag Teacher A onto empty Subject 1 ➔ Assigns immediately without modal.
   - Drag Teacher B onto Subject 1 ➔ Confirmation dialog prompts: `"Replace Teacher A with Teacher B for Subject 1?"`.
   - Click Cancel ➔ Teacher A remains assigned.
   - Drag Teacher B onto Subject 1 again and click Confirm ➔ Teacher B successfully replaces Teacher A.
6. **Accessibility**:
   - Inspect trash buttons and drag handles with dev tools or screen reader to confirm `aria-label` attributes.
