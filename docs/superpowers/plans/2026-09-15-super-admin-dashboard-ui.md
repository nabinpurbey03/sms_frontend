# Super Admin Dashboard & Telemetry UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a comprehensive, high-performance Super Admin User Interface to interact with all new Super Admin Platform Telemetry and Tenant Administration APIs (`/dashboard/super-admin`, `/dashboard/super-admin/trends`, `/dashboard/super-admin/rankings`, `/tenants/directory`, `/tenants/{id}/analytics`, and `/tenants/{id}/admins`).

**Architecture:** 
The solution extends the existing feature slices (`features/dashboard` and `features/tenants`) without introducing external chart dependencies. It implements:
1. Strongly-typed TypeScript DTOs matching backend FastAPI schemas.
2. TanStack Query hooks for real-time telemetry, time-series trends, and comparative rankings.
3. Enhanced dashboard widgets on `/dashboard`: Enriched KPI cards, a Platform Trends visualizer (with 7d/14d/30d/90d filter), and a 3-category live School Rankings leaderboard.
4. An enriched `/tenants` directory displaying live health metrics (enrolled students, teachers, student-teacher ratio, today's attendance %) and assigned school administrator details with an in-place admin management modal.
5. A dedicated `/tenants/$tenantId` 360° deep-dive analytics page presenting student enrollment breakdowns, academic structures, 7-day attendance trends, exam metrics, assigned admins, and the recent audit trail.

**Tech Stack:** React 19, TypeScript, TanStack Router, TanStack Query v5, Tailwind CSS v4, Lucide React, Radix UI, Sonner.

**Spec:** `E:\PBAC\backend\docs\superpowers\specs\2026-09-15-super-admin-tenant-analytics-design.md` & `E:\PBAC\backend\README.md`

## Global Constraints
- Strictly adhere to existing project conventions (Tailwind CSS, Lucide React icons, Radix UI dialogs/dropdowns).
- Do not introduce heavy third-party charting libraries; use clean, responsive, accessible SVG/CSS trend visualizations.
- Ensure all API calls unwrap data correctly matching `src/api/client.ts` interceptor behavior.
- Every task must pass TypeScript compilation (`npx tsc --noEmit`) and linter checks (`npm run lint`).

---

### Task 1: TypeScript Data Contracts & DTOs

**Files:**
- Modify: `src/features/dashboard/api.ts`
- Modify: `src/features/tenants/types.ts`

**Interfaces:**
- Produces:
  - In `src/features/dashboard/api.ts`: `SuperAdminDashboardMetrics` (enriched), `PlatformTrendPointDTO`, `PlatformTrendsSummaryDTO`, `PlatformTrendsResponseDTO`, `TenantEnrollmentRankDTO`, `TenantAttendanceRankDTO`, `TenantActivityRankDTO`, `TenantRankingsResponseDTO`.
  - In `src/features/tenants/types.ts`: `TenantAdminSummaryDTO`, `TenantLiveStatsDTO`, `TenantDirectoryItemDTO`, `TenantDailyAttendancePointDTO`, `TenantEnrollmentBreakdownDTO`, `TenantStaffCommunityBreakdownDTO`, `TenantAcademicStructureDTO`, `TenantAttendanceOverviewDTO`, `TenantAcademicYearBriefDTO`, `TenantExamsOverviewDTO`, `TenantRecentAuditActivityDTO`, `TenantDeepDiveAnalyticsDTO`, `TenantAdminResponseDTO`, `TenantAdminAssignRequest`.

- [ ] **Step 1: Update dashboard DTO types**

In `src/features/dashboard/api.ts`, update `SuperAdminDashboardMetrics` to include enriched platform fields:
```typescript
export interface SuperAdminDashboardMetrics {
  total_platform_users: number;
  active_users: number;
  inactive_users: number;
  total_super_admins: number;
  total_regular_users: number;
  total_admins: number;
  total_office_admins: number;
  total_teachers: number;
  total_parents: number;
  total_tenants: number;
  active_tenants: number;
  inactive_tenants: number;
  recent_tenants: Array<{
    id: string;
    name: string;
    domain: string;
    is_active: boolean;
    created_at: string;
  }>;
  total_students_across_platform?: number;
  today_attendance_records_count?: number;
  today_platform_attendance_rate?: number | null;
}

export interface PlatformTrendPointDTO {
  date: string;
  new_tenants: number;
  new_users: number;
  total_attendance_records: number;
  platform_attendance_rate: number | null;
}

export interface PlatformTrendsSummaryDTO {
  period_days: number;
  total_new_tenants: number;
  total_new_users: number;
  period_average_attendance_rate: number | null;
}

export interface PlatformTrendsResponseDTO {
  daily_metrics: PlatformTrendPointDTO[];
  summary: PlatformTrendsSummaryDTO;
}

export interface TenantEnrollmentRankDTO {
  tenant_id: string;
  name: string;
  domain_name: string;
  student_count: number;
  teacher_count: number;
  student_teacher_ratio: number | null;
}

export interface TenantAttendanceRankDTO {
  tenant_id: string;
  name: string;
  domain_name: string;
  attendance_percentage: number;
  total_marked: number;
}

export interface TenantActivityRankDTO {
  tenant_id: string;
  name: string;
  domain_name: string;
  mutation_count_24h: number;
  last_activity_at: string | null;
}

export interface TenantRankingsResponseDTO {
  top_by_enrollment: TenantEnrollmentRankDTO[];
  top_by_attendance_today: TenantAttendanceRankDTO[];
  most_active_24h: TenantActivityRankDTO[];
}
```

- [ ] **Step 2: Update tenant DTO types**

In `src/features/tenants/types.ts`, add:
```typescript
export interface TenantAdminSummaryDTO {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

export interface TenantLiveStatsDTO {
  total_students: number;
  total_teachers: number;
  total_classes: number;
  total_sections: number;
  today_attendance_percentage: number | null;
  student_teacher_ratio: number | null;
}

export interface TenantDirectoryItemDTO {
  id: string;
  name: string;
  domain_name: string;
  email?: string | null;
  phone?: string | null;
  logo_url?: string | null;
  is_active: boolean;
  created_at: string;
  admin: TenantAdminSummaryDTO | null;
  metrics: TenantLiveStatsDTO;
}

export interface TenantDirectoryResponse {
  items: TenantDirectoryItemDTO[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface TenantDailyAttendancePointDTO {
  date: string;
  total_records: number;
  present_count: number;
  absent_count: number;
  attendance_percentage: number | null;
}

export interface TenantEnrollmentBreakdownDTO {
  total_students: number;
  active_students: number;
  transferred_students: number;
  graduated_students: number;
  suspended_students: number;
}

export interface TenantStaffCommunityBreakdownDTO {
  total_teachers: number;
  total_office_admins: number;
  total_parents: number;
}

export interface TenantAcademicStructureDTO {
  total_classes: number;
  total_sections: number;
  total_subjects: number;
  student_teacher_ratio: number | null;
}

export interface TenantAttendanceOverviewDTO {
  today_records: number;
  today_present: number;
  today_absent: number;
  today_attendance_percentage: number | null;
  seven_days_trend: TenantDailyAttendancePointDTO[];
  thirty_days_average_percentage: number | null;
}

export interface TenantAcademicYearBriefDTO {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
}

export interface TenantExamsOverviewDTO {
  total_exams: number;
  approved_exams: number;
  pending_exams: number;
  draft_exams: number;
}

export interface TenantRecentAuditActivityDTO {
  id: string;
  action: string;
  status: string;
  user_id?: string | null;
  actor_email?: string | null;
  resource_id?: string | null;
  resource_type?: string | null;
  created_at: string;
  details?: string | null;
}

export interface TenantDeepDiveAnalyticsDTO {
  tenant_id: string;
  name: string;
  domain_name: string;
  is_active: boolean;
  created_at: string;
  enrollment: TenantEnrollmentBreakdownDTO;
  staff: TenantStaffCommunityBreakdownDTO;
  academic: TenantAcademicStructureDTO;
  attendance: TenantAttendanceOverviewDTO;
  academic_year: TenantAcademicYearBriefDTO | null;
  exams: TenantExamsOverviewDTO;
  recent_activity: TenantRecentAuditActivityDTO[];
}

export interface TenantAdminResponseDTO {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  is_active: boolean;
  assigned_at: string;
}

export interface TenantAdminAssignRequest {
  phone?: string;
  email?: string;
  user_id?: string;
}
```

- [ ] **Step 3: Verification**

Run: `npx tsc --noEmit`
Expected: 0 errors.

---

### Task 2: API Client & TanStack Query Hooks

**Files:**
- Modify: `src/features/dashboard/api.ts`
- Modify: `src/features/dashboard/hooks.ts`
- Modify: `src/features/tenants/api.ts`
- Modify: `src/features/tenants/hooks.ts`

**Interfaces:**
- Consumes: DTO types from Task 1, `apiClient` from `src/api/client.ts`.
- Produces:
  - In `src/features/dashboard/hooks.ts`: `useSuperAdminDashboard()`, `usePlatformTrends(days)`, `useTenantRankings(limit)`.
  - In `src/features/tenants/hooks.ts`: `useTenantDirectory(params)`, `useTenantAnalytics(tenantId)`, `useTenantAdmins(tenantId)`, `useAssignTenantAdmin()`.

- [ ] **Step 1: Add API client functions in `dashboard/api.ts`**

In `src/features/dashboard/api.ts`, add methods to `dashboardApi`:
```typescript
  getPlatformTrends: async (days: number = 7): Promise<PlatformTrendsResponseDTO> => {
    const data = await apiClient.get('/dashboard/super-admin/trends', { params: { days } });
    return data as unknown as PlatformTrendsResponseDTO;
  },

  getTenantRankings: async (limit: number = 5): Promise<TenantRankingsResponseDTO> => {
    const data = await apiClient.get('/dashboard/super-admin/rankings', { params: { limit } });
    return data as unknown as TenantRankingsResponseDTO;
  },
```

- [ ] **Step 2: Add query hooks in `dashboard/hooks.ts`**

In `src/features/dashboard/hooks.ts`:
```typescript
export const PLATFORM_TRENDS_QUERY_KEY = 'platform-trends';
export const TENANT_RANKINGS_QUERY_KEY = 'tenant-rankings';

export const usePlatformTrends = (days: number = 7, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: [PLATFORM_TRENDS_QUERY_KEY, days],
    queryFn: () => dashboardApi.getPlatformTrends(days),
    enabled: options?.enabled !== undefined ? options.enabled : true,
    staleTime: 60 * 1000,
  });
};

export const useTenantRankings = (limit: number = 5, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: [TENANT_RANKINGS_QUERY_KEY, limit],
    queryFn: () => dashboardApi.getTenantRankings(limit),
    enabled: options?.enabled !== undefined ? options.enabled : true,
    staleTime: 60 * 1000,
  });
};
```

- [ ] **Step 3: Add API client methods in `tenants/api.ts`**

In `src/features/tenants/api.ts`:
```typescript
  getTenantDirectory: async (params?: TenantFilterParams): Promise<TenantDirectoryResponse> => {
    const res = await apiClient.get('/tenants/directory', { params }) as any;
    if (res && res.meta) {
      return {
        items: res.data || [],
        total: res.meta.total_records || 0,
        page: res.meta.page || 1,
        page_size: res.meta.page_size || 20,
        total_pages: res.meta.total_pages || 1,
      };
    }
    return {
      items: res || [],
      total: Array.isArray(res) ? res.length : 0,
      page: 1,
      page_size: 20,
      total_pages: 1,
    };
  },

  getTenantAnalytics: async (tenantId: string): Promise<TenantDeepDiveAnalyticsDTO> => {
    const data = await apiClient.get(`/tenants/${tenantId}/analytics`);
    return data as unknown as TenantDeepDiveAnalyticsDTO;
  },

  getTenantAdmins: async (tenantId: string): Promise<TenantAdminResponseDTO[]> => {
    const data = await apiClient.get(`/tenants/${tenantId}/admins`);
    return data as unknown as TenantAdminResponseDTO[];
  },

  assignTenantAdmin: async (
    tenantId: string,
    payload: TenantAdminAssignRequest
  ): Promise<TenantAdminResponseDTO> => {
    const cleanPhone = (val?: string | null) => {
      if (!val) return undefined;
      const stripped = String(val).trim().replace(/[\s-]/g, '');
      if (!stripped) return undefined;
      if (stripped.startsWith('+977')) return stripped.slice(4);
      if (stripped.startsWith('977') && stripped.length === 13) return stripped.slice(3);
      return stripped;
    };

    const cleanPayload: TenantAdminAssignRequest = {
      phone: cleanPhone(payload.phone),
      email: payload.email?.trim() || undefined,
      user_id: payload.user_id?.trim() || undefined,
    };

    const data = await apiClient.post(`/tenants/${tenantId}/admins`, cleanPayload);
    return data as unknown as TenantAdminResponseDTO;
  },
```

- [ ] **Step 4: Add query & mutation hooks in `tenants/hooks.ts`**

In `src/features/tenants/hooks.ts`:
```typescript
export const TENANT_DIRECTORY_QUERY_KEY = 'tenants-directory';
export const TENANT_ANALYTICS_QUERY_KEY = 'tenant-analytics';
export const TENANT_ADMINS_QUERY_KEY = 'tenant-admins';

export const useTenantDirectory = (
  params?: TenantFilterParams,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: [TENANT_DIRECTORY_QUERY_KEY, params],
    queryFn: () => tenantsApi.getTenantDirectory(params),
    enabled: options?.enabled !== undefined ? options.enabled : true,
    placeholderData: (prev) => prev,
  });
};

export const useTenantAnalytics = (
  tenantId: string | null | undefined,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: [TENANT_ANALYTICS_QUERY_KEY, tenantId],
    queryFn: () => tenantsApi.getTenantAnalytics(tenantId!),
    enabled: Boolean(tenantId) && (options?.enabled !== undefined ? options.enabled : true),
  });
};

export const useTenantAdmins = (
  tenantId: string | null | undefined,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: [TENANT_ADMINS_QUERY_KEY, tenantId],
    queryFn: () => tenantsApi.getTenantAdmins(tenantId!),
    enabled: Boolean(tenantId) && (options?.enabled !== undefined ? options.enabled : true),
  });
};

export const useAssignTenantAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      tenantId,
      payload,
    }: {
      tenantId: string;
      payload: TenantAdminAssignRequest;
    }) => tenantsApi.assignTenantAdmin(tenantId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [TENANT_ADMINS_QUERY_KEY, variables.tenantId] });
      queryClient.invalidateQueries({ queryKey: [TENANT_DIRECTORY_QUERY_KEY] });
      toast.success('School Administrator assigned successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to assign school administrator');
    },
  });
};
```

- [ ] **Step 5: Verification**

Run: `npx tsc --noEmit`
Expected: 0 errors.

---

### Task 3: Super Admin Dashboard Enriched KPI Grid & Telemetry Widgets

**Files:**
- Modify: `src/features/dashboard/components/SuperAdminGrid.tsx`
- Create: `src/features/dashboard/components/PlatformTrendsSection.tsx`
- Create: `src/features/dashboard/components/PlatformRankingsSection.tsx`
- Modify: `src/features/dashboard/pages/DashboardPage.tsx`

**Interfaces:**
- Consumes: `useSuperAdminDashboard`, `usePlatformTrends`, `useTenantRankings` from `features/dashboard/hooks`.
- Produces: Integrated visual telemetry on `/dashboard` for Super Admins.

- [ ] **Step 1: Enhance `SuperAdminGrid.tsx` with Live Enriched Platform KPIs**

Modify `SuperAdminGrid.tsx`:
1. Card 1: **Total Schools** - Displays `metrics.total_tenants` with active vs inactive badges and link to `/tenants`.
2. Card 2: **Total Students Across Platform** - Displays `metrics.total_students_across_platform ?? 0`, showing live student enrollment across all schools.
3. Card 3: **Platform Attendance Today** - Displays `metrics.today_platform_attendance_rate !== null ? `${metrics.today_platform_attendance_rate}%` : 'Pending'` and `metrics.today_attendance_records_count` total records marked.
4. Card 4: **Platform Users & Roles** - Displays `metrics.total_platform_users` with active user count and role badge counters (Teachers, Parents, School Admins).

- [ ] **Step 2: Create `PlatformTrendsSection.tsx`**

Create `src/features/dashboard/components/PlatformTrendsSection.tsx`:
- Header with icon (`TrendingUp`), title ("Platform Telemetry & Growth Trends"), and pill button selector for `7 Days`, `14 Days`, `30 Days`, `90 Days`.
- Summary Cards:
  - Period New Schools (`summary.total_new_tenants`)
  - Period New Users (`summary.total_new_users`)
  - Period Average Attendance Rate (`summary.period_average_attendance_rate` %)
- Responsive CSS/SVG Trend Visualizer:
  - Daily Attendance Rate % bar/trend line.
  - Daily New Users & New Schools activity bars.
  - Interactive hover state showing date, present count, records marked, and rates.
- Refresh button and smooth loading skeletons.

- [ ] **Step 3: Create `PlatformRankingsSection.tsx`**

Create `src/features/dashboard/components/PlatformRankingsSection.tsx`:
- Header with icon (`Award`), title ("School Comparative Leaderboards"), and limit toggle (`Top 5` / `Top 10`).
- 3 Tabs:
  1. **Top by Enrollment**:
     - Columns / items: Rank (1st, 2nd, 3rd badges), School Name, Domain slug, Students count, Teachers count, Student-to-Teacher ratio, and "Deep Dive" button linking to `/tenants/${tenant_id}`.
  2. **Top by Attendance Today**:
     - Columns / items: Rank, School Name, Attendance Rate % with colored progress indicator, Total Records marked, and "Deep Dive" button.
  3. **Most Active Schools (24h Activity)**:
     - Columns / items: Rank, School Name, 24h Mutation Audit Log Count badge, Last Activity timestamp, and "Deep Dive" button.
- Empty states for tabs if no data has been recorded yet.

- [ ] **Step 4: Update `DashboardPage.tsx`**

In `src/features/dashboard/pages/DashboardPage.tsx`:
- Under `{isSuperAdmin && !activeTenantId ? (...) : ...}`, render:
  ```tsx
  <div className="space-y-6">
    <SuperAdminGrid metrics={superAdminMetrics} />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <PlatformTrendsSection />
      <PlatformRankingsSection />
    </div>
  </div>
  ```

- [ ] **Step 5: Verification**

Run: `npx tsc --noEmit && npm run build`
Expected: 0 errors, build succeeds.

---

### Task 4: School Administrator Management Dialogs

**Files:**
- Create: `src/features/tenants/components/TenantAdminAssignDialog.tsx`
- Create: `src/features/tenants/components/TenantAdminsDialog.tsx`

**Interfaces:**
- Consumes: `useTenantAdmins`, `useAssignTenantAdmin` from `features/tenants/hooks`.
- Produces: Modal dialogs for Super Admins to view assigned school admins and assign a new admin by phone, email, or user ID.

- [ ] **Step 1: Create `TenantAdminAssignDialog.tsx`**

Create `src/features/tenants/components/TenantAdminAssignDialog.tsx`:
- Inputs:
  - Mode selector: `Phone Number (Recommended)`, `Email Address`, or `User ID`.
  - Input field corresponding to selection with validation and helpful placeholder (`e.g. 9812345678` or `+977-9812345678`).
- Submits via `useAssignTenantAdmin()`.
- On success: closes dialog, clears input, displays success toast.
- On error: displays error message from backend (e.g. user not found or already assigned).

- [ ] **Step 2: Create `TenantAdminsDialog.tsx`**

Create `src/features/tenants/components/TenantAdminsDialog.tsx`:
- Displays tenant name and active status.
- Lists all active administrators (`useTenantAdmins(tenant.id)`):
  - Admin name, phone, email, assigned date (`assigned_at`).
  - Active status badge.
- Includes a "+ Assign Another Admin" button that opens `TenantAdminAssignDialog`.
- Empty state: "No administrators currently assigned to this school." with prominent "Assign Administrator" button.

- [ ] **Step 3: Verification**

Run: `npx tsc --noEmit`
Expected: 0 errors.

---

### Task 5: Enriched Tenant Directory Table & Grid Views

**Files:**
- Modify: `src/features/tenants/components/TenantTableView.tsx`
- Modify: `src/features/tenants/components/TenantGridView.tsx`
- Modify: `src/features/tenants/pages/TenantsPage.tsx`

**Interfaces:**
- Consumes: `TenantDirectoryItemDTO` from Task 1, `useTenantDirectory` from Task 2, `TenantAdminsDialog` from Task 4.
- Produces: Live health telemetry in the Tenant Directory.

- [ ] **Step 1: Update `TenantTableView.tsx`**

Update `TenantTableView.tsx` props and columns:
- Accept `tenants: (TenantDirectoryItemDTO | Tenant)[]` and `onManageAdmins: (tenant: TenantDirectoryItemDTO) => void`.
- Columns:
  1. **School Entity**: Logo, Name, Domain slug, Active Scope badge.
  2. **Health Metrics**:
     - Students count & Teachers count (with `student_teacher_ratio`).
     - Today's Attendance Rate % badge with visual indicator (`today_attendance_percentage`).
  3. **School Administrator**:
     - If assigned: Name, phone/email, clickable to manage admins.
     - If unassigned: "Unassigned" warning badge with "+ Assign" button.
  4. **Domain & Contact**:
     - Email, Phone, and Status (Active / Suspended).
  5. **Actions**:
     - Direct "360° Analytics" action button linking to `/tenants/${tenant.id}`.
     - Dropdown menu items: Switch to School, Manage Admins, Edit Details, Update Logo, Suspend/Reactivate, Delete.

- [ ] **Step 2: Update `TenantGridView.tsx`**

Update `TenantGridView.tsx`:
- Cards display live metrics grid:
  - Enrolled Students count
  - Teachers count & Ratio
  - Today's Attendance %
  - Assigned Admin name & contact badge
- Footer actions include:
  - "360° Analytics" primary button (navigates to `/tenants/${tenant.id}`).
  - Dropdown menu for Admin management, logo, edit, suspend, delete.

- [ ] **Step 3: Update `TenantsPage.tsx`**

In `src/features/tenants/pages/TenantsPage.tsx`:
- Replace `useTenants` with `useTenantDirectory`.
- Wire up `TenantAdminsDialog` state (`selectedTenantForAdmins`).
- When user clicks "Manage Admins" or "+ Assign" on a row/card, opens `TenantAdminsDialog`.

- [ ] **Step 4: Verification**

Run: `npx tsc --noEmit && npm run build`
Expected: 0 errors, clean build.

---

### Task 6: Dedicated School 360° Deep-Dive Analytics Page & Router Registration

**Files:**
- Create: `src/features/tenants/pages/TenantAnalyticsPage.tsx`
- Modify: `src/app/router.tsx`

**Interfaces:**
- Consumes: `useTenantAnalytics`, `useTenantAdmins`, `useAssignTenantAdmin` from `features/tenants/hooks`.
- Produces: Complete 360° analytics view on `/tenants/$tenantId`.

- [ ] **Step 1: Create `TenantAnalyticsPage.tsx`**

Create `src/features/tenants/pages/TenantAnalyticsPage.tsx`:
1. **Header & Navigation**:
   - `← Back to School Directory` link.
   - School name, domain badge, active status badge, created date.
   - Action buttons: "Switch to School Context", "Manage Admins", "Edit Settings".
2. **Key Metric Overview Cards**:
   - Total Students (Active, Transferred, Graduated, Suspended).
   - Staff Community (Teachers, Office Admins, Parents).
   - Academic Structure (Classes, Sections, Subjects, Student-to-Teacher Ratio).
   - Current Academic Year (Name, start date, end date, status).
3. **Attendance Telemetry Hub**:
   - Today's Presence: Total Records Marked, Present count, Absent count, Attendance Rate %.
   - 7-Day Attendance Trend: Day-by-day interactive cards/bars showing date, present vs absent counts, and attendance %.
   - 30-Day Average Attendance rate badge.
4. **Academic & Examinations Overview**:
   - Total Exams, Approved, Pending, Draft exams counters and badges.
5. **Assigned Administrators Section**:
   - List of designated administrators with contacts and assignment timestamps.
   - "+ Assign School Admin" button.
6. **Recent Mutation Audit Trail**:
   - Timeline list of the recent audit actions performed on this school: Action name, Actor email, Status badge, Timestamp, and Context details.

- [ ] **Step 2: Register `/tenants/$tenantId` in `src/app/router.tsx`**

In `src/app/router.tsx`:
1. Import `TenantAnalyticsPage`.
2. Define route:
```typescript
const tenantDetailRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/tenants/$tenantId',
  component: TenantAnalyticsPage,
});
```
3. Add `tenantDetailRoute` to `protectedLayoutRoute.addChildren([...])`.

- [ ] **Step 3: Verification**

Run: `npx tsc --noEmit && npm run build && npm run lint`
Expected: 0 errors, production build succeeds.

---

### Task 7: End-to-End Verification & Walkthrough

- [ ] **Step 1: Verify TypeScript & Lint**
Run:
```bash
npx tsc --noEmit
npm run lint
npm run build
```
Ensure all checks pass with zero errors.

- [ ] **Step 2: Manual Verification Flow**
1. Log in as Super Admin (`superadmin@gmail.com` / `SuperAdmin123!`).
2. Navigate to `/dashboard`:
   - Verify enriched live KPI cards (Total Schools, Total Students Across Platform, Platform Attendance Today, Platform Users).
   - Verify Platform Telemetry Trends section (toggle 7d, 14d, 30d, 90d, view daily metrics and summary).
   - Verify School Rankings section (toggle between Enrollment, Today's Attendance %, and 24h Activity; verify ranking badges and metrics).
3. From the rankings or navigation menu, open `/tenants`:
   - Verify schools are listed with live health metrics (Students, Teachers, Ratio, Today's Attendance %) and assigned admin names.
   - Open "Manage Admins" dialog for a school; test assigning an admin by phone.
   - Click "360° Analytics" on a school.
4. In `/tenants/$tenantId`:
   - Verify all 360° telemetry loads: Enrollment breakdown, Staff counts, 7-day attendance trend, active academic year, exam stats, assigned admins, and forensic audit activity.
   - Test "Switch to School" button.
