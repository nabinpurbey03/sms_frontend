# Fix: `Tooltip` Must Be Used Within `TooltipProvider` Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve the Radix UI runtime error ``Tooltip` must be used within `TooltipProvider`` caused by `<Tooltip>` in the header being outside the sidebar-scoped `<TooltipProvider>` boundary.

**Architecture:**
- Hoist `<TooltipProvider delayDuration={150}>` to `src/app/providers.tsx` within `<AppProviders>`. This follows standard shadcn/ui and Radix UI best practices, ensuring all tooltips throughout the entire application (layouts, headers, pages, tables, forms, modals) have a valid context.
- Wrap `AppShell.tsx`'s outer container in `<TooltipProvider delayDuration={150}>` for defense-in-depth, removing the awkward local scoping around only the `<aside>` element.

**Tech Stack:** React 19, TypeScript, `@radix-ui/react-tooltip`.

---

## Global Constraints

- **Zero Breaking Changes**: Do not remove any existing tooltip functionality.
- **Provider Integrity**: Tooltips must retain smooth delay (`delayDuration={150}`) and render accessible portals.

---

## Proposed Changes

### 1. Global Provider Layer (`src/app/providers.tsx`)
Wrap `{children}` with `<TooltipProvider delayDuration={150}>`.

```tsx
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/auth/AuthContext';
import { TooltipProvider } from '@/components/ui/tooltip';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider delayDuration={150}>
          {children}
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};
```

---

### 2. Layout Layer (`src/components/layout/AppShell.tsx`)
- Ensure the `<TooltipProvider>` wraps the entire outer container of `AppShell` (or cleanly covers both `<aside>` and `<header>`), preventing any header tooltips (such as the Calendar System switcher `[ AD | BS ]` or Theme toggle) from escaping the provider boundary.

---

## Tasks

### Task 1: Add Global TooltipProvider & Re-scope AppShell

**Files:**
- Modify: `src/app/providers.tsx`
- Modify: `src/components/layout/AppShell.tsx`

- [ ] **Step 1: Update `src/app/providers.tsx` to provide `TooltipProvider` globally**
- [ ] **Step 2: Update `src/components/layout/AppShell.tsx` to ensure `TooltipProvider` wraps the whole shell**
- [ ] **Step 3: Run `npm run build` and `npm run lint`**
- [ ] **Step 4: Commit changes**

---

## Verification Plan

### Automated Tests
1. **Frontend Production Build**:
   ```bash
   cd E:\SSUP\frontend
   npm run build
   ```
   *Expected:* Clean compilation, 0 TypeScript errors.
2. **Frontend Linter**:
   ```bash
   cd E:\SSUP\frontend
   npm run lint
   ```
   *Expected:* 0 errors.

### Manual Verification
1. Open the application in the browser at `http://localhost:5173`.
2. Verify the page mounts without throwing ``Tooltip` must be used within `TooltipProvider``.
3. Hover over the `[ BS | AD ]` switcher in the top header and verify the tooltip appears cleanly (`Active Calendar: ... Click to toggle`).
4. Hover over sidebar navigation items in collapsed mode and verify tooltips appear as expected.
