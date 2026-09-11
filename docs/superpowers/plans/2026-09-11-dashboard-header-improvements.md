# Dashboard Header Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the global dashboard sticky header to display the active page context, a global search bar, school name, and move the interactive profile dropdown back to the top right while making the sidebar bottom profile static.

**Architecture:** We will modify `AppShell.tsx` to handle the new top header layout. We will utilize the existing `navItems` array to inject descriptions and derive the active page context based on the current route. We will also implement a debounced search input placeholder. Finally, we will sweep the feature pages to remove redundant `<h1>` page titles.

**Tech Stack:** React, Tailwind CSS, Lucide React, Radix UI

**Spec:** N/A (User request for UX improvements)

## Global Constraints

- No specific constraints, standard React best practices apply.
- Use `lucide-react` for icons.
- Ensure responsive design (hidden on mobile if it clutters, or adapt appropriately).

---

### Task 1: Refactor User Profile Locations

**Files:**
- Modify: `src/components/layout/AppShell.tsx`

**Interfaces:**
- Consumes: Existing `AppShell` state and components.
- Produces: A static profile card in the sidebar, and an interactive profile dropdown in the top header.

- [ ] **Step 1: Extract DropdownMenu Content**
In `AppShell.tsx`, locate the `DropdownMenu` at the bottom of the sidebar (around `Sidebar Bottom Profile Card`). Extract the `DropdownMenuContent` and its children (the profile details, persona switcher, theme toggle, and sign out button).

- [ ] **Step 2: Make Sidebar Profile Static**
Replace the `<DropdownMenu>` and `<DropdownMenuTrigger>` wrappers in the `Sidebar Bottom Profile Card` with a standard static `<div className="flex items-center gap-3 p-2 bg-accent/40 rounded-xl border border-border/50">`. It should no longer be a `<button>` and should not respond to clicks.

- [ ] **Step 3: Make Top Header Profile Interactive**
In the `Sticky Top Header` section of `AppShell.tsx`, locate the static `User Profile Menu (Static)` avatar. Wrap it in a `<DropdownMenu>` and a `<DropdownMenuTrigger asChild><button>...</button></DropdownMenuTrigger>`. Paste the extracted `DropdownMenuContent` inside this new dropdown.

- [ ] **Step 4: Verify**
Ensure the app compiles and the dropdown now opens from the top-right corner, while the bottom sidebar profile is purely cosmetic.

---

### Task 2: Enhance navItems with Descriptions

**Files:**
- Modify: `src/components/layout/AppShell.tsx`

**Interfaces:**
- Consumes: N/A
- Produces: Enhanced `navItems` array.

- [ ] **Step 1: Add descriptions to navItems**
Update the `navItems` array in `AppShell.tsx` to include a short, helpful `description` string for every single route. 
Examples:
- Dashboard: 'Overview of your school activities and metrics.'
- Tenant Management: 'Manage school campuses and platform settings.'
- School Members: 'Manage students, teachers, and administrators.'
- Parent-Student Links: 'Connect parents to their children.'
- Classes & Sections: 'Organize grade levels and physical sections.'
- Subjects: 'Manage curriculum subjects and codes.'
- Students: 'Directory of all enrolled students.'
- Teacher Assignments: 'Assign teachers to specific classes and subjects.'
- Examinations: 'Create and manage academic assessments.'
- Mark Attendance: 'Record daily student attendance.'
- Attendance Reports: 'View and export attendance records.'
- My Teaching Duties: 'View your assigned classes and subjects.'
- Student & Parent Directory: 'Contact information for your students.'
- My Children: 'View your linked children profiles.'

- [ ] **Step 2: Add Search Icon Import**
Ensure `Search` is imported from `lucide-react` at the top of the file. Ensure `Input` is imported from `@/components/ui/input` (add the import if it's missing).

---

### Task 3: Implement Enhanced Top Header UI

**Files:**
- Modify: `src/components/layout/AppShell.tsx`

**Interfaces:**
- Consumes: Enhanced `navItems`, `location.pathname`
- Produces: New top header layout.

- [ ] **Step 1: Find Active Item**
Inside the `AppShell` component render body, determine the active item:
```tsx
const activeItem = navItems.find((item) => isNavItemActive(location.pathname, item.href));
```

- [ ] **Step 2: Implement Debounced Search Handler**
Add a ref and handler inside the component for the search input:
```tsx
const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
  searchTimeoutRef.current = setTimeout(() => {
    console.log("Searching for:", e.target.value);
    // Future integration: Global search API call
  }, 500);
};
```

- [ ] **Step 3: Update Header Layout**
Rewrite the `Sticky Top Header` `<header>` block to use a 3-column flex layout (`justify-between`).
- **Left Column:** Render the `activeItem`'s icon, label (font-bold), and description (text-[10px] text-muted-foreground).
- **Middle Column:** Render the school name (`activeTenantName`) and a wide `<Input>` with the `Search` icon positioned absolutely inside it. Connect `handleSearch` to `onChange`. Hide this column on mobile (`hidden md:flex`).
- **Right Column:** Keep the Theme Toggle, Notifications, and the newly interactive User Profile Dropdown.

- [ ] **Step 4: Verify Layout**
Verify the UI looks balanced and professional, adhering to the requested UX priorities.

---

### Task 4: Remove Redundant Page Titles

**Files:**
- Modify: `src/features/*/pages/*.tsx` (Various page components)

**Interfaces:**
- Consumes: The newly contextual top header.
- Produces: Cleaner page views without double-titles.

- [ ] **Step 1: Sweep and Clean**
The implementing subagent must search for `<h1 className="... text-2xl font-bold ...">` elements that render the page title across the application (e.g., `ClassesPage.tsx`, `StudentsPage.tsx`, `MembersPage.tsx`, `MarkAttendancePage.tsx`).
Carefully remove just the `<h1>` title tags. **Crucially**, if the title was in a flex container alongside action buttons (like `<Button>Add Student</Button>`), ensure the flex layout is adjusted so the action buttons remain cleanly positioned (e.g., pushed to the right using `justify-end` if the title is gone).

- [ ] **Step 2: Verify**
Ensure no layout breakage occurred on the main feature pages by checking the frontend build output and visually inspecting a few modified pages.
