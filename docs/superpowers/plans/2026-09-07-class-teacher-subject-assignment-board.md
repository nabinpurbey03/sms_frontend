# Class Teacher & Subject Assignment Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a drag-and-drop "Class Teacher & Subject Assignment" UI board for Schools Up Pro using `@dnd-kit/core` and shadcn/ui that enables administrators to assign and replace class teachers and subject teachers across sections with mouse and touch/tablet support.

**Architecture:** Create a self-contained component [TeacherAssignmentBoard.tsx](file:///E:/PBAC/frontend/src/features/academic/components/TeacherAssignmentBoard.tsx) embedded in the "Teacher assignments" tab of [ClassDetailPage.tsx](file:///E:/PBAC/frontend/src/features/academic/pages/ClassDetailPage.tsx). It uses `@dnd-kit/core`'s `DndContext`, `useDraggable`, and `useDroppable` with `PointerSensor` (configured with distance constraint) for seamless mouse and touch support. It connects directly to existing TanStack Query hooks (`useMembers`, `useAssignments`, `useAssignClassTeacher`, `useAssignSubjectTeacher`, `useDeleteAssignment`) and enforces confirmation modals before replacing already-assigned teachers.

**Tech Stack:** React 19, `@dnd-kit/core`, `@dnd-kit/utilities`, `@tanstack/react-query`, Tailwind CSS v4, Lucide React, shadcn/ui.

---

## Global Constraints

- Dependencies: `@dnd-kit/core` and `@dnd-kit/utilities` are already installed and verified with React 19.
- Responsive drag-and-drop: works identically on mouse and tablet touch input without separate touch fallbacks.
- Single teacher assignment rule: each subject and class teacher slot has at most 1 teacher.
- Many-to-many teacher reuse: teachers remain in the pool after assignment and can be dragged onto multiple subjects/sections.
- Confirmation dialog required when dropping onto an already-occupied slot (`"Replace {old} with {new} for {target}?"`). Empty slots assign immediately.
- Backend API constraint: replacing an existing teacher requires deleting the prior assignment via `academicApi.deleteAssignment` followed by creating the new assignment.

---

## File Structure

- **New Component**: `src/features/academic/components/TeacherAssignmentBoard.tsx`
  - Encapsulates DndContext, Class Teacher slot, Section Switcher, Draggable Teacher Pool, Droppable Subjects Grid, DragOverlay, and Replacement Confirmation Dialog.
- **Sub-components within the board module**:
  - `DraggableTeacherChip`: Teacher pill with avatar, name, and drag handles.
  - `DroppableClassTeacherSlot`: Class teacher target slot with active hover highlighting.
  - `DroppableSubjectCard`: Subject card with subject code, assigned teacher state, and dragover highlight.
- **Modify**: `src/features/academic/pages/ClassDetailPage.tsx`
  - Integrate `TeacherAssignmentBoard` inside the `activeTab === 'assignments'` view.

---

## Task Breakdown

### Task 1: Create `TeacherAssignmentBoard` Component

**Files:**
- Create: `src/features/academic/components/TeacherAssignmentBoard.tsx`
- Consumes:
  - `useMembers` from `@/features/members/hooks`
  - `useAssignments`, `useAssignClassTeacher`, `useAssignSubjectTeacher`, `useDeleteAssignment` from `../hooks`
  - `ClassWithDetails`, `AcademicSection`, `AcademicSubject`, `TeacherAssignment` from `../types`
  - `Card`, `Button`, `Dialog`, `Avatar` from `@/components/ui`
  - `DndContext`, `useDraggable`, `useDroppable`, `DragOverlay`, `PointerSensor`, `useSensor`, `useSensors` from `@dnd-kit/core`
- Produces:
  - `TeacherAssignmentBoard: React.FC<TeacherAssignmentBoardProps>`

- [ ] **Step 1: Implement `TeacherAssignmentBoard.tsx` with DndContext and state handling**
  - Section switcher with up-to-3-row wrap and scroll limit (`max-h-[136px] overflow-y-auto`).
  - Class teacher drop slot with dashed empty placeholder and linked teacher card.
  - Teacher pool with search filter and draggable teacher chips.
  - Subjects grid with auto-fit layout (`grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))]`) and drop targets.
  - Replacement confirmation dialog tracking `pendingReplacement: { type: 'class_teacher' | 'subject'; subjectId?: string; subjectName?: string; oldTeacher: { id: string; name: string }; newTeacher: { id: string; name: string } }`.
  - Sequential delete-then-assign mutation execution on replacement confirmation.

- [ ] **Step 2: Add quick "Add Teacher" picker fallback**
  - Clicking "Add teacher" on class teacher slot or subject card opens a quick selection dropdown or dialog for direct keyboard/mouse assignment without requiring drag.

- [ ] **Step 3: Test compilation with `npm run build`**
  - Run `npm run build` and ensure zero TypeScript or bundling errors.

---

### Task 2: Integrate `TeacherAssignmentBoard` into `ClassDetailPage`

**Files:**
- Modify: `src/features/academic/pages/ClassDetailPage.tsx:486-675`
- Consumes:
  - `TeacherAssignmentBoard` from `../components/TeacherAssignmentBoard`
- Produces:
  - Cleaned-up assignments tab rendering the board with `tenantId`, `cls`, and `canManage`.

- [ ] **Step 1: Replace legacy tab UI in `ClassDetailPage.tsx`**
  - Replace the static cards/forms in `activeTab === 'assignments'` with:
    ```tsx
    {activeTab === 'assignments' && (
      <TeacherAssignmentBoard
        cls={cls}
        tenantId={tenantId}
        canManage={canManage}
        initialSectionId={selectedSectionId || cls.sections[0]?.id}
      />
    )}
    ```

- [ ] **Step 2: Verify build and linting**
  - Run `npm run build`
  - Run `npm run lint`

---

## Verification Plan

### Automated Verification
```bash
npm run build
npm run lint
```

### Manual Verification Flow
1. Navigate to **Classes & Sections** (`/academic/classes`).
2. Click **"View Sections & Roster"** on any class (e.g. Grade 10).
3. Click the **Teacher Assignments** tab.
4. Verify the top-to-bottom layout:
   - **Class Teacher Card**: Displays class name + active section, "Add teacher" button, and dashed drop slot if unassigned.
   - **Section Switcher**: Row of section buttons (Section A, Section B...). Clicking switches active section.
   - **Teacher Pool**: Draggable chips for teachers.
   - **Subjects Grid**: Cards for all subjects in the class.
5. **Drag and Drop Testing**:
   - Drag a teacher chip onto an empty subject card -> Card highlights on hover -> Dropping immediately assigns the teacher.
   - Drag a teacher chip onto the Class Teacher slot -> Assigns immediately.
   - Drag a different teacher onto the already-assigned subject -> Confirmation modal appears (`"Replace {old} with {new} for {subject}?"`). Clicking Cancel retains original; clicking Confirm replaces teacher.
   - Drag a different teacher onto the Class Teacher slot -> Confirmation modal appears.
6. Verify teachers remain in the pool and can be dragged onto multiple subjects.
