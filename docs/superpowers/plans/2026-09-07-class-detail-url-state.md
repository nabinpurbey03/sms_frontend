# Class Detail URL State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the class detail view (section rosters, subjects, teacher assignments) reflect in the URL as `/academic/classes/:classId`, supporting bookmarking, sharing, and browser back/forward.

**Architecture:** Add a TanStack Router child route with a `:classId` param. The detail page reads the classId from route params and fetches its own data via existing `useAllClassesWithDetails` and `useClassWithDetails` hooks. The parent `ClassesPage` uses the param to auto-select the detail view instead of local state.

**Tech Stack:** TanStack Router, TanStack Query, React 19, TypeScript

**Spec:** Bounded task — no separate spec doc; design approved in-chat.

## Global Constraints

- Existing per-feature 5-file slice pattern must be preserved
- Mobile-first responsive layout (375px to 1440px)
- All existing permission checks (`canManage`, etc.) remain
- TypeScript strict mode must pass; `npm run build` must succeed

---

### Task 1: Add Class Detail Route with :classId Param

**Files:**
- Modify: `src/app/router.tsx`

**Interfaces:**
- Consumes: existing `ClassDetailPage` component
- Produces: route `/academic/classes/:classId` rendering `ClassDetailPage`

- [ ] **Step 1: Read current router.tsx to understand route structure**

Read `E:\PBAC\frontend\src\app\router.tsx` to confirm import statements and route list location.

- [ ] **Step 2: Add class detail route**

In `src/app/router.tsx`, after the existing `classesRoute` definition, add:

```tsx
const classDetailRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/academic/classes/$classId',
  component: ClassDetailPage,
});
```

Also add `classDetailRoute` to the `protectedLayoutRoute.addChildren([...])` array.

- [ ] **Step 3: Verify build**

Run: `cd E:/PBAC/frontend && npm run build 2>&1 | tail -10`
Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/router.tsx
git commit -m "feat(router): add /academic/classes/:classId route"
```

---

### Task 2: Update ClassDetailPage to Read classId from Route Params

**Files:**
- Modify: `src/features/academic/pages/ClassDetailPage.tsx`

**Interfaces:**
- Consumes: `classId` from `useParams({ from: '/academic/classes/$classId' })`, `useAllClassesWithDetails(activeTenantId)` hook
- Produces: Self-contained page that fetches its own class data

- [ ] **Step 1: Read current ClassDetailPage**

Read `E:\PBAC\frontend\src\features\academic\pages\ClassDetailPage.tsx` to understand the current prop-based interface and existing imports.

- [ ] **Step 2: Replace prop-based interface with route params**

At the top of the file, add import:
```tsx
import { useParams } from '@tanstack/react-router';
```

Replace the component signature and data fetching:

```tsx
export const ClassDetailPage: React.FC = () => {
  const { classId } = useParams({ from: '/academic/classes/$classId' });
  const { activeTenantId } = useAuth();
  const { data: classesWithDetails = [] } = useAllClassesWithDetails(activeTenantId);

  const cls = useMemo(
    () => classesWithDetails.find(c => c.id === classId),
    [classesWithDetails, classId]
  );

  const handleBack = () => {
    navigate({ to: '/academic/classes' });
  };

  // ... rest of component, replacing `onBack={onBack}` with `onBack={handleBack}`
  // Remove the `cls` and `tenantId` from props since they're now derived
};
```

Also remove the props `cls`, `tenantId`, `onBack` from the function signature, and update the call site of `<ClassDetailPage>` in `ClassesPage.tsx`.

- [ ] **Step 3: Add navigate import and useNavigate hook**

Add to imports:
```tsx
import { useNavigate } from '@tanstack/react-router';
```

Inside the component:
```tsx
const navigate = useNavigate();
```

- [ ] **Step 4: Add null-guard for missing class**

Wrap the early return with a friendly "Class not found" UI if `cls` is undefined:

```tsx
if (!cls) {
  return (
    <div className="p-12 text-center">
      <p className="text-sm font-bold">Class not found</p>
      <Button onClick={handleBack} className="mt-4">Back to Classes</Button>
    </div>
  );
}
```

- [ ] **Step 5: Verify build**

Run: `cd E:/PBAC/frontend && npm run build 2>&1 | tail -10`
Expected: Build succeeds (may have errors in ClassesPage from the prop interface change — that's expected, fix in Task 3).

- [ ] **Step 6: Commit**

```bash
git add src/features/academic/pages/ClassDetailPage.tsx
git commit -m "feat(academic): ClassDetailPage reads classId from route params"
```

---

### Task 3: Update ClassesPage to Use URL-Based Selection

**Files:**
- Modify: `src/features/academic/pages/ClassesPage.tsx`

**Interfaces:**
- Consumes: `useParams({ from: '/academic/classes' })` returns `classId: string | undefined` when child route active
- Produces: Grid view when no param; detail view automatically when param present

- [ ] **Step 1: Read current ClassesPage**

Read `E:\PBAC\frontend\src\features\academic\pages\ClassesPage.tsx` to find the `selectedClassId` state and the `onOpenDetailsPage` callback.

- [ ] **Step 2: Replace local state with URL-based selection**

Remove `selectedClassId` state. Replace with URL navigation:

```tsx
import { useNavigate, useParams } from '@tanstack/react-router';

// inside component
const navigate = useNavigate();
const { classId } = useParams({ strict: false }) as { classId?: string };

const selectedClass = useMemo(() => {
  if (!classId) return null;
  return classesWithDetails.find(c => c.id === classId) || null;
}, [classesWithDetails, classId]);
```

Replace `onOpenDetailsPage={(id) => setSelectedClassId(id)}` with:
```tsx
onOpenDetailsPage={(id) => navigate({ to: '/academic/classes/$classId', params: { classId: id } })}
```

Remove the `<ClassDetailPage ... />` rendering block since the route component now handles it.

- [ ] **Step 3: Update the grid view condition**

The grid renders when `!selectedClass` — since `selectedClass` is now derived from URL, the existing early return logic still works.

- [ ] **Step 4: Clean up unused imports**

Remove `useState` if no longer used, and the `ClassDetailPage` import.

- [ ] **Step 5: Verify build**

Run: `cd E:/PBAC/frontend && npm run build 2>&1 | tail -10`
Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/academic/pages/ClassesPage.tsx
git commit -m "feat(academic): ClassesPage uses URL-based class selection"
```

---

### Task 4: Verify with Manual Test

**Files:** None (verification only)

- [ ] **Step 1: Start dev server**

Run: `cd E:/PBAC/frontend && npm run dev`
Expected: Server starts at `http://localhost:5173`

- [ ] **Step 2: Verify grid view loads at /academic/classes**

Navigate to `http://localhost:5173/academic/classes`
Expected: Grid of class cards visible, no detail view.

- [ ] **Step 3: Verify URL updates on class click**

Click "View Section & Roster" on any class card.
Expected: URL changes to `http://localhost:5173/academic/classes/<uuid>`, detail view loads with roster/subjects/teacher tabs.

- [ ] **Step 4: Verify browser back button**

Click browser back button.
Expected: Returns to grid view at `/academic/classes`.

- [ ] **Step 5: Verify direct URL access**

Copy a detail URL, open in new tab.
Expected: Detail view loads directly.

---

### Task 5: Final Lint Check

- [ ] **Step 1: Run linter**

Run: `cd E:/PBAC/frontend && npm run lint 2>&1 | tail -20`
Expected: No new warnings or errors in modified files.

- [ ] **Step 2: Final commit if any auto-fixes were applied**

```bash
git status
# If any changes:
git add -A
git commit -m "chore: lint fixes from URL state refactor"
```
