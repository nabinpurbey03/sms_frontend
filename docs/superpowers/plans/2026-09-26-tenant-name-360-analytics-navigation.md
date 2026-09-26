# Tenant Name 360° Analytics Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In Super Admin Tenant Management, remove the standalone "360° Analytics" action button and make clicking the tenant school name navigate directly to the school's 360° Analytics page (`/tenants/$tenantId`).

**Architecture:** Update the school name elements in both `TenantTableView` and `TenantGridView` to wrap the name in TanStack Router `<Link>` components targeting `/tenants/$tenantId`. Remove the standalone "360° Analytics" action buttons from the table row actions and grid card footers, promote "Switch Scope" in grid card footers to maintain UI balance, and retain a secondary "360° Analytics" menu item in the action dropdown menus.

**Tech Stack:** React 19, TypeScript, TanStack Router (`@tanstack/react-router`), Tailwind CSS v4, Lucide React icons, Radix UI.

**Spec:** Direct user requirement: "for super admin, inside tenant management, i want to remove '360 analytics' button and clicking on tenant naame it should work as 360 analytics button."

## Global Constraints
- Must preserve active scope badge behavior next to tenant names.
- Must ensure proper text truncation and accessible title tooltips on hover.
- Keep table column alignment and widths responsive and tidy without awkward whitespace.
- Must maintain all existing dropdown actions (Switch School Scope, Manage Administrators, Edit Details, Update Logo, Suspend/Reactivate, Hard Delete).
- Must pass `npm run lint` and `npx tsc -b` (TypeScript check) without new errors or warnings.

---

### Task 1: Update `TenantTableView` to Link Tenant Name and Remove Standalone 360° Button

**Files:**
- Modify: `src/features/tenants/components/TenantTableView.tsx:55-89,228-265`

**Interfaces:**
- Consumes: `Link` from `@tanstack/react-router`, `tenant.id`, `tenant.name`.
- Produces: Clickable tenant name navigating to `/tenants/$tenantId`, compact Actions column with action dropdown menu containing "360° Analytics" item.

- [ ] **Step 1: Update School Entity column in `TenantTableView.tsx`**

Replace the non-interactive `<span className="font-bold text-sm text-foreground hover:underline cursor-pointer">` with a TanStack Router `<Link>`:
```tsx
              <div className="flex items-center gap-2 min-w-0">
                <Link
                  to={'/tenants/$tenantId' as any}
                  params={{ tenantId: tenant.id } as any}
                  className="font-bold text-sm text-foreground hover:text-primary hover:underline transition-colors truncate max-w-[220px]"
                  title={`View ${tenant.name} 360° Analytics`}
                >
                  {tenant.name}
                </Link>
                {isCurrentActive && (
                  <Badge variant="purple" className="text-[9px] px-1.5 py-0 shrink-0">
                    Active Scope
                  </Badge>
                )}
              </div>
```

- [ ] **Step 2: Remove standalone "360° Analytics" button and adjust Actions column in `TenantTableView.tsx`**

1. Change `header: 'Actions'` column definition:
```tsx
    {
      header: 'Actions',
      className: 'text-right min-w-[70px] w-[70px]',
      cell: (tenant) => (
        <div className="flex items-center justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                aria-label="Actions"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="text-xs">School Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem asChild className="cursor-pointer text-xs font-semibold text-primary">
                <Link
                  to={'/tenants/$tenantId' as any}
                  params={{ tenantId: tenant.id } as any}
                  className="flex items-center w-full"
                >
                  <BarChart2 className="h-3.5 w-3.5 mr-2" />
                  <span>360° Analytics</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => onSwitchTenant(tenant)}
                className="cursor-pointer text-xs"
              >
                <Sparkles className="h-3.5 w-3.5 mr-2 text-primary" />
                <span>Switch School Scope</span>
              </DropdownMenuItem>

              {onManageAdmins && (
                <DropdownMenuItem
                  onClick={() => onManageAdmins(tenant)}
                  className="cursor-pointer text-xs font-medium"
                >
                  <Shield className="h-3.5 w-3.5 mr-2 text-primary" />
                  <span>Manage School Administrators</span>
                </DropdownMenuItem>
              )}
...
```

- [ ] **Step 3: Run TypeScript and Lint check**

Run: `npx tsc -b` and `npm run lint`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/features/tenants/components/TenantTableView.tsx
git commit -m "feat(tenants): make tenant name navigate to 360 analytics and remove action button in table view"
```

---

### Task 2: Update `TenantGridView` to Link Tenant Name and Reconfigure Card Footer

**Files:**
- Modify: `src/features/tenants/components/TenantGridView.tsx:96-115,215-265`

**Interfaces:**
- Consumes: `Link` from `@tanstack/react-router`, `tenant.id`, `tenant.name`, `onSwitchTenant`.
- Produces: Clickable tenant name in grid card header navigating to `/tenants/$tenantId`, balanced card footer with "Switch Scope" button and actions dropdown.

- [ ] **Step 1: Update CardHeader in `TenantGridView.tsx`**

Make tenant name inside `<h3>` an interactive `<Link>`:
```tsx
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-bold text-sm leading-tight truncate">
                        <Link
                          to={'/tenants/$tenantId' as any}
                          params={{ tenantId: tenant.id } as any}
                          className="text-foreground hover:text-primary hover:underline transition-colors"
                          title={`View ${tenant.name} 360° Analytics`}
                        >
                          {tenant.name}
                        </Link>
                      </h3>
                      {isCurrentActive && (
                        <Badge variant="purple" className="text-[9px] px-1.5 py-0 shrink-0">
                          Active Scope
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                      <Globe className="h-3 w-3 shrink-0 text-primary" />
                      <span className="truncate">{tenant.domain_name}</span>
                    </div>
                  </div>
```

- [ ] **Step 2: Update CardFooter and DropdownMenu in `TenantGridView.tsx`**

Remove the standalone "360° Analytics" button and promote "Switch Scope" as the primary footer action button alongside the actions dropdown:
```tsx
            {/* Card Footer */}
            <CardFooter className="p-4 sm:p-5 pt-2 border-t flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSwitchTenant(tenant)}
                className="h-8 text-xs font-semibold gap-1.5 flex-1 text-primary hover:text-primary hover:bg-primary/10 border-primary/20"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Switch Scope</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground shrink-0"
                    aria-label="School Actions"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel className="text-xs">
                    School Administration
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem asChild className="cursor-pointer text-xs font-semibold text-primary">
                    <Link
                      to={'/tenants/$tenantId' as any}
                      params={{ tenantId: tenant.id } as any}
                      className="flex items-center w-full"
                    >
                      <BarChart2 className="h-3.5 w-3.5 mr-2" />
                      <span>360° Analytics</span>
                    </Link>
                  </DropdownMenuItem>

                  {onManageAdmins && (
                    <DropdownMenuItem
                      onClick={() => onManageAdmins(tenant)}
                      className="cursor-pointer text-xs font-medium"
                    >
                      <Shield className="h-3.5 w-3.5 mr-2 text-primary" />
                      <span>Manage School Administrators</span>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem
                    onClick={() => onEdit(tenant)}
                    className="cursor-pointer text-xs"
                  >
                    <Edit2 className="h-3.5 w-3.5 mr-2" />
                    <span>Edit School Details</span>
                  </DropdownMenuItem>
...
```

- [ ] **Step 3: Run TypeScript and Lint check**

Run: `npx tsc -b` and `npm run lint`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/features/tenants/components/TenantGridView.tsx
git commit -m "feat(tenants): link tenant name to 360 analytics and clean up grid card footer"
```

---

### Task 3: Full Project Build & Verification

**Files:**
- Verify: Full repository build and routing integrity

- [ ] **Step 1: Run full TypeScript build**

Run: `npm run build`
Expected: Exit code 0, all chunks emitted cleanly.

- [ ] **Step 2: Manual UI Verification Checklist**

1. Navigate to `/tenants` in Super Admin role.
2. In **Table View**:
   - Verify the standalone "360° Analytics" button is removed from the Actions column.
   - Verify the Actions column is neatly aligned to the right.
   - Hover over the school name: verify pointer cursor, underline styling, and tooltip `View <School> 360° Analytics`.
   - Click the school name: verify immediate navigation to `/tenants/$tenantId` (the 360° deep-dive analytics dashboard).
   - Click the three dots menu: verify "360° Analytics" and other actions work as expected.
3. In **Grid Cards View**:
   - Verify the card footer no longer shows "360° Analytics" button.
   - Verify "Switch Scope" button is rendered cleanly in the footer.
   - Hover and click the school name in the card header: verify navigation to `/tenants/$tenantId`.
   - Click the three dots menu: verify actions work as expected.
