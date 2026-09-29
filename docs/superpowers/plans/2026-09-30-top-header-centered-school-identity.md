# Modern Centered School Identity in TopHeader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize `TopHeader.tsx` and `SchoolHeaderBadge.tsx` by placing the school name and formatted address prominently in the visual center of the top header with the school logo positioned on the left side of that centered info, wrapped in a polished, responsive 3-column layout.

**Architecture:** 
1. Redesign `SchoolHeaderBadge.tsx` into a high-polish identity component featuring a crisp logo container (with fallback icon support), stacked school name and address with location icon, and interactive multi-school switching dropdown.
2. Upgrade `TopHeader.tsx` layout into a balanced 3-column architecture (`Left: Menu + Breadcrumbs`, `Center: Centered School Identity`, `Right: Command Palette + Preferences + Notifications + Profile`) that guarantees true horizontal centering across all viewport sizes (mobile, tablet, desktop) without content collisions.
3. Add accessibility labels, tooltips for truncated names/addresses, and smooth dark/light mode surface styling matching the SSUP design system.

**Tech Stack:** React 19, TypeScript strict mode (`npx tsc -b`), Tailwind CSS v4, Lucide React, Radix UI Dropdown & Tooltip primitives.

---

## Global Constraints

- React 19, TypeScript strict mode (`npx tsc -b`) with 0 errors.
- Build must succeed via `npm run build`.
- Preserve all existing top header functionalities:
  - Mobile slide-out drawer trigger.
  - Route breadcrumbs with icons and deep linking.
  - Command palette shortcut (`⌘K`) and triggers.
  - Calendar switcher (`BS` / `AD`).
  - Theme toggler (`Light` / `Dark`).
  - Notifications popover.
  - User account dropdown (user info, role badge, multi-school switch, persona switch, preferences, logout).
- Logo must be placed on the left side of the school name and address text.
- School name and address block must be visually centered in the top header.
- Proper fallback handling when no logo is uploaded (render polished `School` icon container instead of an empty space).
- Responsive down to 360px viewport without overflow or layout breakage.

---

### Task 1: Redesign `SchoolHeaderBadge.tsx` with Left Logo & Centered School Name and Address

**Files:**
- Modify: `src/components/layout/SchoolHeaderBadge.tsx`

**Interfaces:**
- Consumes:
  - `useTenant(tenantId)` from `@/features/tenants/hooks`
  - `TenantAddress` from `@/features/tenants/types`
  - `UserMembershipDTO` from `@/api/types`
  - `getMediaUrl` from `@/lib/utils`
- Produces:
  - `<SchoolHeaderBadge />` with props:
    ```typescript
    interface SchoolHeaderBadgeProps {
      tenantId: string | null;
      tenantName: string | null;
      isSuperAdmin: boolean;
      memberships?: UserMembershipDTO[];
      onSwitchTenant: (tenantId: string) => void;
      className?: string;
    }
    ```

- [ ] **Step 1: Inspect and refine `SchoolHeaderBadge.tsx`**

Implement the new visual structure for `SchoolHeaderBadge`:
1. **Logo Container (Left)**:
   - Size: `h-8 w-8 sm:h-9 sm:w-9 shrink-0`.
   - Style: `rounded-xl bg-card border border-border/70 p-1 flex items-center justify-center shadow-2xs overflow-hidden ring-1 ring-border/40`.
   - Content: If `resolvedLogoUrl` exists, render `<img src={resolvedLogoUrl} alt="" className="h-full w-full object-contain" />`. If no logo exists or while loading, render `<div className="h-full w-full rounded-lg bg-primary/10 flex items-center justify-center text-primary"><School className="h-4 w-4 sm:h-4.5 sm:w-4.5 shrink-0" /></div>`.
2. **Text Block (Right of Logo)**:
   - Vertically stacked: `flex flex-col min-w-0 text-left justify-center`.
   - Line 1 (School Name):
     - Bold, high-contrast: `text-xs sm:text-sm font-bold text-foreground truncate tracking-tight leading-tight`.
     - If multi-school switching is available (`memberships.length > 1`), include `<ChevronDown className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0 group-hover:text-foreground transition-colors" />`.
   - Line 2 (School Address):
     - Subtitle styling: `text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 truncate leading-tight font-normal pt-0.5`.
     - Location pin: `<MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary/70 shrink-0" />`.
     - Address string formatted as `Tole, Municipality-Ward, District` or domain name fallback.
3. **Container**:
   - Interactive badge wrapper: `group flex items-center gap-2 sm:gap-2.5 px-2 py-1 rounded-xl hover:bg-accent/50 transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary max-w-[220px] xs:max-w-[280px] sm:max-w-[360px] md:max-w-[420px]`.
   - Accessible tooltip showing full school name and full address on hover.
4. **Global Platform Scope State**:
   - When `!tenantId && isSuperAdmin`:
     - Logo container: `h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center`.
     - Icon: `<Sparkles className="h-4 w-4" />`.
     - Text: "Global Platform Scope", subtitle "Super Admin Administration".

- [ ] **Step 2: Update `SchoolHeaderBadge.tsx` with complete implementation**

Write the updated code to `src/components/layout/SchoolHeaderBadge.tsx`.

- [ ] **Step 3: Run TypeScript compiler to verify zero errors**

Run: `npx tsc -b`
Expected: 0 errors.

- [ ] **Step 4: Commit `SchoolHeaderBadge.tsx`**

```bash
git add src/components/layout/SchoolHeaderBadge.tsx
git commit -m "feat(layout): redesign SchoolHeaderBadge with left logo and stacked name and address"
```

---

### Task 2: Modernize `TopHeader.tsx` Layout with True Centering & Responsive 3-Column Grid

**Files:**
- Modify: `src/components/layout/TopHeader.tsx`

**Interfaces:**
- Consumes:
  - `<SchoolHeaderBadge />` from `./SchoolHeaderBadge`
  - `<NotificationPopover />` from `./NotificationPopover`
  - Navigation types & action props from `TopHeaderProps`
- Produces:
  - `<TopHeader />` component rendered in `AppShell.tsx`

- [ ] **Step 1: Re-architect header layout grid**

Replace the asymmetric flex containers with a balanced 3-column layout:
```tsx
<header className="sticky top-0 z-20 flex h-14 md:h-15 items-center justify-between px-3 sm:px-4 md:px-6 border-b border-border/40 bg-card/90 backdrop-blur-md shrink-0 gap-2">
  {/* Column 1: Left Section (Mobile trigger & Breadcrumbs) */}
  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 justify-start">
    ...
  </div>

  {/* Column 2: Center Section (Centered School Identity) */}
  <div className="flex items-center justify-center shrink-0 px-1 sm:px-2 max-w-[50%] sm:max-w-[45%] md:max-w-[40%]">
    <SchoolHeaderBadge ... />
  </div>

  {/* Column 3: Right Section (Command Palette, Controls & Account Dropdown) */}
  <div className="flex items-center justify-end gap-1.5 sm:gap-2 flex-1 min-w-0 shrink-0">
    ...
  </div>
</header>
```

Key enhancements:
1. **Center Visibility on Mobile**:
   - Remove `hidden md:flex` so the school identity is visible across mobile, tablet, and desktop viewports.
   - On small screens (`< 640px`), the breadcrumbs show the active page crumb or icon, while the center identity remains visible and neatly truncated.
2. **Left Section (Breadcrumbs)**:
   - Clean truncation for long labels.
   - Home icon / category icon badge `bg-primary/10 text-primary p-1 rounded-md`.
   - Subtle chevron separators with `aria-hidden="true"`.
3. **Right Section (Quick Controls)**:
   - Command palette trigger with keyboard shortcut badge `⌘K`.
   - Calendar switcher pill with high-contrast text and tooltip.
   - Theme toggle button with smooth icon rendering.
   - Notifications popover.
   - User profile dropdown trigger with avatar ring.

- [ ] **Step 2: Update `TopHeader.tsx` with complete implementation**

Write the updated code to `src/components/layout/TopHeader.tsx`.

- [ ] **Step 3: Run TypeScript compiler and production build**

Run: `npx tsc -b && npm run build`
Expected: 0 errors and successful production build.

- [ ] **Step 4: Commit `TopHeader.tsx`**

```bash
git add src/components/layout/TopHeader.tsx
git commit -m "feat(layout): modernize TopHeader with centered school identity and balanced 3-column layout"
```

---

### Task 3: Visual Polish, Dark Mode Verification & Final Sanity Check

**Files:**
- Verify: `src/components/layout/TopHeader.tsx`
- Verify: `src/components/layout/SchoolHeaderBadge.tsx`

- [ ] **Step 1: Inspect dark mode contrast and responsive behavior**
- Verify contrast ratios in both light and dark modes:
  - School name text: `>= 4.5:1` against header background.
  - School address text: `>= 4.5:1` against header background.
  - Logo container border and shadow: visible in both themes.
  - Focus outlines: visible when navigating with keyboard (`Tab` key).

- [ ] **Step 2: Run linter and full build**

Run: `npm run lint` and `npm run build`
Expected: 0 lint errors, 0 build errors.

- [ ] **Step 3: Commit any refinements**

```bash
git commit -am "chore(layout): polish top header typography, contrast, and responsive spacing"
```
