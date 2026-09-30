# Academic Progression Chronology Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Equip `ClassDetailPage.tsx` with an Academic Progression Chronology navigation control allowing users to seamlessly step backward ($N-1$), step forward ($N+1$), or select any grade in the annual promotion hierarchy.

**Architecture:** Create a standalone, accessible `ClassProgressionNavigator.tsx` component that consumes the school's classes list, sorts them strictly by `sequence_order` ascending, and exposes Previous/Next quick-step buttons along with a full chronological dropdown ladder. Integrate this component into the page header of `ClassDetailPage.tsx` for immediate grade switching without navigating back to the class catalog.

**Tech Stack:** React 19, TypeScript strict mode, TanStack Router (`useNavigate`, `useParams`), TanStack Query, Radix UI Dropdown Menu, Lucide Icons, Tailwind CSS v4 design tokens.

**Spec:** The academic progression chronology is defined in [`README.md`](file:///E:/SSUP/frontend/README.md) and [`ClassProgressionPipeline.tsx`](file:///E:/SSUP/frontend/src/features/academic/components/ClassProgressionPipeline.tsx), where classes follow a sequential order determining student promotion ($N \to N+1$) during annual academic year rollover, with the final step representing graduation.

## Global Constraints

- Strict TypeScript typing (`npx tsc -b` with 0 errors).
- Zero linter regressions (`npm run lint` with 0 errors).
- Production build verification (`npm run build` succeeds cleanly).
- Semantic design tokens matching `shadcn/ui` and the established design system (`bg-card`, `border-border/70`, `text-primary`, `bg-primary/10`, `Badge`).
- Mobile-first responsiveness: compact buttons that collapse labels on narrow screens (`< sm`) while preserving full tap targets (≥40px).
- Respect role access permissions: if a teacher has restricted class assignments, only allow navigation between their assigned classes.

---

### Task 1: Create `ClassProgressionNavigator.tsx` Component

**Files:**
- Create: `src/features/academic/components/ClassProgressionNavigator.tsx`

**Interfaces:**
- Consumes: `AcademicClass`, `ClassWithDetails` from `../types`
- Produces: `ClassProgressionNavigator` component accepting `{ classes, currentClassId, onSelectClass, isTeacherOnly, assignedClassIds, className }`

- [ ] **Step 1: Create `ClassProgressionNavigator.tsx`**

Write `src/features/academic/components/ClassProgressionNavigator.tsx` with:
1. Strict sorting of `classes` by `sequence_order` ascending, then `name.localeCompare`.
2. Filter for teachers when `isTeacherOnly && assignedClassIds` is provided.
3. Compute `currentIndex`, `prevClass`, `nextClass`, `isFirstStep`, `isFinalStep`, and `totalSteps`.
4. Render:
   - Previous Class Button (`<Button variant="outline" size="sm">` with `<ChevronLeft />`, disabled on first step).
   - Center Selector Dropdown (`<DropdownMenu>` with `<DropdownMenuTrigger>` displaying `Step #N • [Class Name] <ChevronDown />`, listing all chronological grades with step numbers and checkmark for current grade).
   - Next Class Button (`<Button variant="outline" size="sm">` with `<ChevronRight />`, disabled on final step with `<GraduationCap />` indicator).

- [ ] **Step 2: Verify TypeScript Compilation**

Run: `npx tsc -b`
Expected: PASS (0 errors)

- [ ] **Step 3: Commit `ClassProgressionNavigator.tsx`**

```bash
git add src/features/academic/components/ClassProgressionNavigator.tsx
git commit -m "feat(academic): create ClassProgressionNavigator component for chronology-based grade navigation"
```

---

### Task 2: Integrate Chronology Navigation into `ClassDetailPage.tsx`

**Files:**
- Modify: `src/features/academic/pages/ClassDetailPage.tsx:60-120` (add `useClasses` hook)
- Modify: `src/features/academic/pages/ClassDetailPage.tsx:410-445` (mount `ClassProgressionNavigator`)

**Interfaces:**
- Consumes: `useClasses` from `../hooks`, `ClassProgressionNavigator` from `../components/ClassProgressionNavigator`
- Produces: Live chronology navigation in `ClassDetailPage` header bar

- [ ] **Step 1: Import `useClasses` and `ClassProgressionNavigator` in `ClassDetailPage.tsx`**

1. In imports of `ClassDetailPage.tsx`:
   - Import `useClasses` from `../hooks`.
   - Import `ClassProgressionNavigator` from `../components/ClassProgressionNavigator`.
2. Fetch `allClasses`:
   ```tsx
   const { data: allClasses = [] } = useClasses(tenantId);
   ```
3. Extract `assignedClassIds` for teacher-scoped filtering:
   ```tsx
   const assignedClassIds = useMemo(() => {
     return new Set(myAssignments.map((a) => a.class_id).filter(Boolean) as string[]);
   }, [myAssignments]);
   ```
4. Define class switch navigation handler:
   ```tsx
   const handleNavigateToClass = (targetClassId: string) => {
     if (targetClassId === classId) return;
     navigate({
       to: '/academic/classes/$classId',
       params: { classId: targetClassId },
     });
   };
   ```

- [ ] **Step 2: Mount `ClassProgressionNavigator` in Page Header**

In the header section of `ClassDetailPage.tsx`, right beside the class title and status chips:
Render `<ClassProgressionNavigator>`:
```tsx
<ClassProgressionNavigator
  classes={allClasses}
  currentClassId={classId}
  onSelectClass={handleNavigateToClass}
  isTeacherOnly={isTeacherOnly}
  assignedClassIds={assignedClassIds}
/>
```

- [ ] **Step 3: Verify TypeScript Compilation & Lint**

Run:
```bash
npx tsc -b
npm run lint
```
Expected: PASS (0 errors)

- [ ] **Step 4: Verify Production Build**

Run:
```bash
npm run build
```
Expected: PASS (Vite build succeeds)

- [ ] **Step 5: Commit `ClassDetailPage.tsx`**

```bash
git add src/features/academic/pages/ClassDetailPage.tsx
git commit -m "feat(academic): mount Academic Progression Chronology navigator in ClassDetailPage header"
```
