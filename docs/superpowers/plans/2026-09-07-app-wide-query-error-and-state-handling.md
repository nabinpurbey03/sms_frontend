# App-Wide Query Error, Tenant Guard & State Handling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the "Class Not Found" issue when clicking "View Sections & Roster" by correcting the backend endpoint contract in `academicApi.getClassWithDetails`, and systematically standardize tenant guards, error handling with retry actions, loading states, and empty states across the entire application.

**Architecture:** 
1. Fix `academicApi.getClassWithDetails` to find the target class from `getClasses(tenantId)` (which is cached and valid) and fetch sections, students, and subjects using valid endpoints, eliminating the non-existent single-class endpoint call.
2. Introduce reusable core state components (`TenantRequiredState`, `ErrorState`, `EmptyState`) in `src/components/common/` to replace ad-hoc, duplicated JSX.
3. Update all major feature pages (`ClassDetailPage`, `ClassesPage`, `TeacherAssignmentsPage`, `StudentsPage`, `SubjectsPage`) to follow a strict 4-tier state guard order: Tenant Check → Loading State → Error State (with Retry) → Empty State / Content.
4. Add global `defaultErrorComponent` and `defaultNotFoundComponent` in `src/app/router.tsx` to guard against unexpected route crashes.

**Tech Stack:** React 19, TanStack Router, TanStack Query v5, Tailwind CSS, Lucide React, TypeScript.

**Spec:** Bounded/Systemic task — design and approach detailed in this plan.

## Global Constraints

- Must maintain strict TypeScript checking (`npm run build` with zero errors)
- Must maintain `npm run lint` clean
- Existing Per-Feature 5-File Slice pattern must be preserved
- Existing permission checks (`canManage`, `canAssign`, `isSuperAdmin`) must remain intact
- Mobile-first responsive layout (375px to 1440px)

---

### Task 1: Fix Academic Class Detail API Endpoint Contract

**Files:**
- Modify: `src/features/academic/api.ts:186-206`
- Modify: `src/features/academic/hooks.ts:68-78`

**Interfaces:**
- Consumes: `academicApi.getClasses(tenantId)`, `academicApi.getSections(tenantId, classId)`, `academicApi.getStudents(tenantId, classId)`, `academicApi.getSubjects(tenantId, classId)`
- Produces: `academicApi.getClassWithDetails(tenantId, classId): Promise<ClassWithDetails | null>`
- Produces: `useClassWithDetails(tenantId, classId)` returning `ClassWithDetails | null` with clean `isError` and `refetch`

- [ ] **Step 1: Inspect and update `getClassWithDetails` in `src/features/academic/api.ts`**

Replace the non-existent `apiClient.get('/academic/tenants/${tenantId}/classes/${classId}')` with `academicApi.getClasses(tenantId)`. Find the target class in the array. If missing, return `null`.

```ts
  getClassWithDetails: async (tenantId: string, classId: string): Promise<ClassWithDetails | null> => {
    const [classes, sections, students, subjects] = await Promise.all([
      academicApi.getClasses(tenantId),
      academicApi.getSections(tenantId, classId),
      academicApi.getStudents(tenantId, classId),
      academicApi.getSubjects(tenantId, classId),
    ]);

    const cls = classes.find((c) => c.id === classId);
    if (!cls) {
      return null;
    }

    const sectionsWithCounts = sections.map((sec: AcademicSection) => ({
      ...sec,
      student_count: (students as AcademicStudent[]).filter(
        (s: AcademicStudent) => s.section_id === sec.id && s.status === 'ACTIVE'
      ).length,
    }));

    return {
      ...cls,
      sections: sectionsWithCounts,
      students: students as AcademicStudent[],
      subjects: subjects as AcademicSubject[],
    };
  },
```

- [ ] **Step 2: Update return type in `src/features/academic/hooks.ts`**

Ensure `useClassWithDetails` expects `ClassWithDetails | null`:

```ts
export const useClassWithDetails = (tenantId: string | null, classId: string | null) => {
  return useQuery<ClassWithDetails | null>({
    queryKey: ['academic_class_with_details', tenantId, classId],
    queryFn: async () => {
      const data = await academicApi.getClassWithDetails(tenantId!, classId!);
      return data;
    },
    enabled: !!tenantId && !!classId,
    staleTime: 1000 * 30,
  });
};
```

- [ ] **Step 3: Verify TypeScript build**

Run: `npm run build`
Expected: Passes with no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/academic/api.ts src/features/academic/hooks.ts
git commit -m "fix(academic): use valid endpoints in getClassWithDetails to resolve 404"
```

---

### Task 2: Create Standardized App-Wide State Components

**Files:**
- Create: `src/components/common/TenantRequiredState.tsx`
- Create: `src/components/common/ErrorState.tsx`
- Create: `src/components/common/EmptyState.tsx`

**Interfaces:**
- `TenantRequiredState`: `{ featureName?: string; className?: string }`
- `ErrorState`: `{ title?: string; message?: string; error?: Error | unknown; onRetry?: () => void; className?: string }`
- `EmptyState`: `{ icon?: LucideIcon; title: string; description?: string; action?: React.ReactNode; className?: string }`

- [ ] **Step 1: Create `TenantRequiredState.tsx`**

Create `src/components/common/TenantRequiredState.tsx`:

```tsx
import React from 'react';
import { Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@tanstack/react-router';

interface TenantRequiredStateProps {
  featureName?: string;
  className?: string;
}

export const TenantRequiredState: React.FC<TenantRequiredStateProps> = ({
  featureName = 'academic records and settings',
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center min-h-[55vh] text-center p-6 space-y-4 ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
        <Building2 className="w-8 h-8" />
      </div>
      <div className="space-y-1 max-w-md">
        <h2 className="text-xl font-bold text-foreground">Select a School Portal</h2>
        <p className="text-sm text-muted-foreground">
          You must switch to an active school tenant in order to view and manage {featureName}.
        </p>
      </div>
      <Button asChild>
        <Link to="/tenants">View All Schools</Link>
      </Button>
    </div>
  );
};
```

- [ ] **Step 2: Create `ErrorState.tsx`**

Create `src/components/common/ErrorState.tsx`:

```tsx
import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: unknown;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  error,
  onRetry,
  className = '',
}) => {
  const errorMessage =
    message ||
    (error instanceof Error ? error.message : null) ||
    'Unable to load data from the server. Please check your connection and try again.';

  return (
    <div className={`flex flex-col items-center justify-center min-h-[50vh] text-center p-6 space-y-4 ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
        <AlertTriangle className="w-7 h-7" />
      </div>
      <div className="space-y-1.5 max-w-md">
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{errorMessage}</p>
      </div>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="gap-2 text-xs">
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Try Again</span>
        </Button>
      )}
    </div>
  );
};
```

- [ ] **Step 3: Create `EmptyState.tsx`**

Create `src/components/common/EmptyState.tsx`:

```tsx
import React from 'react';
import { Inbox, type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div className={`rounded-xl border border-dashed border-border/80 bg-card p-10 sm:p-12 text-center space-y-3 ${className}`}>
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
        <Icon className="w-6 h-6" />
      </div>
      <div className="space-y-1 max-w-md mx-auto">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {description && <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="pt-2 flex justify-center">{action}</div>}
    </div>
  );
};
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Zero TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/common/TenantRequiredState.tsx src/components/common/ErrorState.tsx src/components/common/EmptyState.tsx
git commit -m "feat(ui): add standard TenantRequiredState, ErrorState, and EmptyState components"
```

---

### Task 3: Refactor ClassDetailPage with Strict 4-Tier State Handling

**Files:**
- Modify: `src/features/academic/pages/ClassDetailPage.tsx`

**Interfaces:**
- Consumes: `useClassWithDetails`, `TenantRequiredState`, `ErrorState`, `EmptyState`
- Enforces state order:
  1. `if (!tenantId)` -> `<TenantRequiredState featureName="class details" />`
  2. `if (isLoading)` -> Loading spinner / skeleton
  3. `if (isError)` -> `<ErrorState title="Failed to load class" error={error} onRetry={refetch} />`
  4. `if (!cls)` -> Genuine 404 Empty State with "Back to Classes" CTA
  5. Full Class Detail UI

- [ ] **Step 1: Update `ClassDetailPage.tsx`**

Import `TenantRequiredState` and `ErrorState`. Destructure `isError`, `error`, `refetch` from `useClassWithDetails`. Wire the 4-tier checks cleanly before accessing `cls` properties.

```tsx
  const { data: cls, isLoading, isError, error, refetch } = useClassWithDetails(tenantId, classId);

  // 1. Tenant guard
  if (!tenantId) {
    return <TenantRequiredState featureName="class rosters and sections" />;
  }

  // 2. Loading state guard
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading class details...</p>
      </div>
    );
  }

  // 3. Error state guard (prevents masking API/network failures as 404s)
  if (isError) {
    return (
      <ErrorState
        title="Failed to Load Class Details"
        error={error}
        onRetry={() => refetch()}
      />
    );
  }

  // 4. Genuine 404 Not Found guard
  if (!cls) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <BookOpen className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="space-y-1 max-w-md">
          <h2 className="text-xl font-bold text-foreground">Class Not Found</h2>
          <p className="text-sm text-muted-foreground">
            The class you're looking for doesn't exist or has been removed.
          </p>
        </div>
        <Button onClick={handleBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Classes
        </Button>
      </div>
    );
  }
```

- [ ] **Step 2: Verify build and lint**

Run: `npm run build && npm run lint`
Expected: Zero build or lint errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/academic/pages/ClassDetailPage.tsx
git commit -m "fix(academic): implement strict 4-tier state handling in ClassDetailPage"
```

---

### Task 4: Standardize State Handling in ClassesPage and TeacherAssignmentsPage

**Files:**
- Modify: `src/features/academic/pages/ClassesPage.tsx`
- Modify: `src/features/academic/pages/TeacherAssignmentsPage.tsx`

**Interfaces:**
- Replace duplicated inline JSX with `TenantRequiredState`, `ErrorState`, and `EmptyState`
- Add missing `isError` handling to `TeacherAssignmentsPage`

- [ ] **Step 1: Update `ClassesPage.tsx`**

Replace the 18-line inline `!activeTenantId` block with `<TenantRequiredState featureName="academic classes and sections" />`.
Replace the custom `EmptyState` with `<EmptyState ... />`.

- [ ] **Step 2: Update `TeacherAssignmentsPage.tsx`**

Destructure `isError`, `error`, `refetch` from `useAssignments`.
Add `if (!activeTenantId)` check using `<TenantRequiredState featureName="teacher assignments" />`.
Add error banner/card if `isError` is true.

- [ ] **Step 3: Verify build and lint**

Run: `npm run build && npm run lint`
Expected: Zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/academic/pages/ClassesPage.tsx src/features/academic/pages/TeacherAssignmentsPage.tsx
git commit -m "refactor(academic): use standard TenantRequiredState, ErrorState, and EmptyState"
```

---

### Task 5: Add Global Router-Level Error Boundary & 404 Fallback

**Files:**
- Modify: `src/app/router.tsx`

**Interfaces:**
- Configures `defaultErrorComponent` and `defaultNotFoundComponent` in `createRouter`

- [ ] **Step 1: Update `src/app/router.tsx`**

Add `defaultErrorComponent` and `defaultNotFoundComponent` using `ErrorState`:

```tsx
export const router = createRouter({
  routeTree,
  defaultErrorComponent: ({ error, reset }) => (
    <ErrorState
      title="Application Route Error"
      error={error}
      onRetry={reset}
      className="min-h-[70vh]"
    />
  ),
  defaultNotFoundComponent: () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
      <h2 className="text-2xl font-extrabold text-foreground">404 - Page Not Found</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        The requested page does not exist or you don't have permission to access it.
      </p>
      <Button asChild>
        <Link to="/dashboard">Return to Dashboard</Link>
      </Button>
    </div>
  ),
});
```

- [ ] **Step 2: Verify production build and lint**

Run: `npm run build && npm run lint`
Expected: Passes cleanly.

- [ ] **Step 3: Commit**

```bash
git add src/app/router.tsx
git commit -m "feat(router): add global defaultErrorComponent and defaultNotFoundComponent"
```

---

## Verification Plan

### Automated Verification
1. **TypeScript strict compilation:**
   `npm run build`
2. **Linter inspection:**
   `npm run lint`

### Manual Verification
1. **Navigate to Classes:** Open browser at `http://localhost:5173/academic/classes`.
2. **Click "View Sections & Roster":**
   - Confirm URL transitions to `/academic/classes/:classId`.
   - Confirm loading spinner briefly appears.
   - Confirm class details (sections, students roster, subjects, teacher assignments) render with real data.
3. **Direct URL Access & Bookmarking:**
   - Refresh the page on `/academic/classes/:classId`.
   - Verify it fetches data cleanly and renders the class without flashing "Class Not Found".
4. **Invalid Class ID (True 404):**
   - Manually type `/academic/classes/invalid-class-id-999`.
   - Verify the "Class Not Found" empty state is displayed with "Back to Classes" button.
5. **No Tenant Selected:**
   - Log in without selecting a tenant or navigate with no tenant; verify clean "Select a School Portal" prompt with button to `/tenants`.
