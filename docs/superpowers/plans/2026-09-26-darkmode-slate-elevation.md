# Dark Mode Palette Elevation Plan (#0a0f16 & #151a22)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the application's dark mode using `#0a0f16` (Midnight Canvas) and `#151a22` (Obsidian Card Surface), harmonizing all supporting dark mode tokens (borders, muted surfaces, popovers, and text contrast) for a sleek, cohesive modern aesthetic.

**Architecture:** Update the CSS variables inside `.dark` in `src/index.css`. Because the application consistently utilizes Tailwind semantic color tokens (`bg-background`, `bg-card`, `border-border`, `bg-muted`, `bg-popover`), updating the central CSS variables delivers an immediate, flawless visual elevation across all pages, cards, sidebars, tables, and dialogs without breaking any component layout.

**Tech Stack:** Tailwind CSS v4, CSS custom properties, HSL color tokens, React 19, TypeScript

**Spec:** User request — "i want improve darkmode with 151a22 and 0a0f16 hex colors, what would you suggest?"

## Global Constraints

- Do NOT alter any light mode tokens (`:root`).
- Maintain WCAG AA contrast compliance for text (`--foreground` > 7:1 against both `#0a0f16` and `#151a22`; `--muted-foreground` > 4.5:1).
- Ensure all token values are defined as space-separated HSL values without `hsl()` wrapper (matching the Tailwind v4 base layer format in `src/index.css`: `H S% L%`).
- Zero regressions in TypeScript build (`npx tsc -b`) and linting (`npm run lint`).
- Verify production build (`npm run build`).

---

## Token Mapping Architecture

```
Layer                   Hex Code     HSL Token              Role
──────────────────────────────────────────────────────────────────────────────────────────
Canvas Background       #0a0f16      215 37.5% 6.3%         --background (Main body & canvas)
Card / Surface          #151a22      217 23.6% 10.8%        --card (Cards, Sidebar, Navbar)
Floating Popover        #1b212c      217 24.0% 13.7%        --popover (Dialogs, Menus, Tooltips)
Muted Background        #1a212b      216 25.0% 13.5%        --muted (Table headers, Skeletons)
Subtle Hover Accent     #1f2734      217 25.0% 16.5%        --accent (Row & button hover)
Border / Dividers       #222b38      217 24.0% 17.5%        --border & --input (Card & input strokes)
Muted Text              #8b9bb0      215 18.0% 62.0%        --muted-foreground (Secondary labels)
Foreground Text         #f8fafc      210 40.0% 98.0%        --foreground & --card-foreground
Primary Brand Accent    #00B4D8      190 100.0% 42.4%       --primary & --ring (Vibrant Cyan)
```

---

### Task 1: Update Dark Mode CSS Tokens in `src/index.css`

**Files:**
- Modify: `src/features/attendance/pages/...` (None)
- Modify: `src/index.css:50-84` (The `.dark` CSS rule block)

**Interfaces:**
- Consumes: Tailwind v4 theme mapping (`--color-background`, `--color-card`, etc.)
- Produces: Cohesive midnight-slate dark mode palette across the entire application

- [ ] **Step 1: Replace `.dark` CSS variables in `src/index.css`**

  In `src/index.css`, locate the `.dark` block (lines 50–84) and replace it with:

  ```css
  /* ==========================================================================
     DARK MODE BASE TOKENS (Obsidian Slate #151a22 & Midnight #0a0f16)
     ========================================================================== */
  .dark {
    /* Midnight Canvas: #0a0f16 */
    --background: 215 37.5% 6.3%;
    --foreground: 210 40% 98%;

    /* Elevated Obsidian Card Surface: #151a22 */
    --card: 217 23.6% 10.8%;
    --card-foreground: 210 40% 98%;

    /* Floating Popover / Modals: #1b212c */
    --popover: 217 24% 13.7%;
    --popover-foreground: 210 40% 98%;

    /* Ocean Primary (Vibrant Cyan on dark slate): #00B4D8 */
    --primary: 190.0 100.0% 42.4%; 
    --primary-foreground: 239.3 93.8% 19.0%; /* Dark Navy text */

    /* Ocean Secondary: #0077B6 */
    --secondary: 200.8 100.0% 35.7%;
    --secondary-foreground: 210 40% 98%;

    /* Slate Muted Background (Table headers, skeletons): #1a212b */
    --muted: 216 25% 13.5%;
    --muted-foreground: 215 18% 62%; /* Soft Slate text #8b9bb0 */

    /* Slate Interactive Hover Accent: #1f2734 */
    --accent: 217 25% 16.5%;
    --accent-foreground: 210 40% 98%;

    --destructive: 0 72% 51%;
    --destructive-foreground: 210 40% 98%;

    /* Refined Slate Border & Input Strokes: #222b38 */
    --border: 217 24% 17.5%;
    --input: 217 24% 17.5%;
    
    /* Ocean Ring: #00B4D8 */
    --ring: 190.0 100.0% 42.4%;
  }
  ```

- [ ] **Step 2: Run verification checks**

  Run: `npx tsc -b`
  Expected: 0 errors

  Run: `npm run lint`
  Expected: 0 errors

  Run: `npm run build`
  Expected: Build succeeds cleanly

- [ ] **Step 3: Commit**

  ```bash
  git add src/index.css
  git commit -m "style(theme): elevate dark mode palette with midnight #0a0f16 canvas and obsidian #151a22 surfaces"
  ```

---

### Task 2: Polish Tooltip & Component Tokens for Complete Harmony

**Files:**
- Modify: `src/components/ui/tooltip.tsx:18` (Align tooltip container with `--popover` and `--border`)

**Interfaces:**
- Consumes: Radix UI Tooltip
- Produces: Tooltip styling that directly uses design tokens (`bg-popover text-popover-foreground border-border`) instead of hardcoded `bg-slate-900/95`

- [ ] **Step 1: Update Tooltip styling in `src/components/ui/tooltip.tsx`**

  In `src/components/ui/tooltip.tsx`, line 18, update the `className`:
  Replace:
  ```tsx
  'z-50 overflow-hidden rounded-xl border border-slate-700/50 bg-slate-900/95 px-3 py-1.5 text-xs font-semibold text-slate-50 shadow-xl shadow-black/20 backdrop-blur-md',
  ```
  With:
  ```tsx
  'z-50 overflow-hidden rounded-xl border border-border bg-popover px-3 py-1.5 text-xs font-semibold text-popover-foreground shadow-xl shadow-black/20 backdrop-blur-md',
  ```

- [ ] **Step 2: Run verification checks**

  Run: `npx tsc -b`
  Expected: 0 errors

  Run: `npm run lint`
  Expected: 0 errors

- [ ] **Step 3: Commit**

  ```bash
  git add src/components/ui/tooltip.tsx
  git commit -m "style(tooltip): align tooltip styling with semantic popover and border tokens"
  ```
