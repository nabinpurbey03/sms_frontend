import React from 'react';
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  Navigate,
  Link,
} from '@tanstack/react-router';

import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { ProtectedLayout } from './ProtectedLayout';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { TenantsPage } from '@/features/tenants/pages/TenantsPage';
import { TenantOnboardPage } from '@/features/tenants/pages/TenantOnboardPage';
import { TenantAnalyticsPage } from '@/features/tenants/pages/TenantAnalyticsPage';
import { MembersPage } from '@/features/members/pages/MembersPage';
import { MyChildrenPage } from '@/features/members/pages/MyChildrenPage';
import { ClassesPage } from '@/features/academic/pages/ClassesPage';
import { ClassDetailPage } from '@/features/academic/pages/ClassDetailPage';
import { StudentsPage } from '@/features/academic/pages/StudentsPage';
import { AlumniPage } from '@/features/academic/pages/AlumniPage';
import { SubjectsPage } from '@/features/academic/pages/SubjectsPage';
import { TeacherAssignmentsPage } from '@/features/academic/pages/TeacherAssignmentsPage';
import { MyTeachersPage } from '@/features/academic/pages/MyTeachersPage';
import { TeacherParentDirectoryPage } from '@/features/academic/pages/TeacherParentDirectoryPage';
import { AcademicAnalyticsPage } from '@/features/academic/pages/AcademicAnalyticsPage';
import { MarkAttendancePage } from '@/features/attendance/pages/MarkAttendancePage';
import { MyAssignmentsPage } from '@/features/attendance/pages/MyAssignmentsPage';
import { AttendanceReportsPage } from '@/features/attendance/pages/AttendanceReportsPage';
import { ExamsListPage } from '@/features/examination/pages/ExamsListPage';
import { CreateExamPage } from '@/features/examination/pages/CreateExamPage';
import { ScoreEntryPage } from '@/features/examination/pages/ScoreEntryPage';
import { ExamReviewPage } from '@/features/examination/pages/ExamReviewPage';
import { ParentReportCardsPage } from '@/features/examination/pages/ParentReportCardsPage';
import { OfficialReportCardViewPage } from '@/features/examination/pages/OfficialReportCardViewPage';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { AcademicYearsPage } from '@/features/academic-year/pages/AcademicYearsPage';
import { SchoolSettingsPage } from '@/features/school-settings/pages/SchoolSettingsPage';
import { AcademicCalendarPage } from '@/features/school-settings/pages/AcademicCalendarPage';
import { PlatformUsersPage } from '@/features/platform-users/pages/PlatformUsersPage';
import { AuditLogsPage } from '@/features/audit-log/pages/AuditLogsPage';
import { FinanceDashboardPage } from '@/features/finance/pages/FinanceDashboardPage';
import { BillsPage } from '@/features/finance/pages/BillsPage';
import { CollectPaymentPage } from '@/features/finance/pages/CollectPaymentPage';
import { FeeStructuresPage } from '@/features/finance/pages/FeeStructuresPage';
import { TransactionsPage } from '@/features/finance/pages/TransactionsPage';
import { StudentLedgerPage } from '@/features/finance/pages/StudentLedgerPage';
import { useAuth } from '@/auth/useAuth';

const IndexRedirect: React.FC = () => {
  const { activeRole } = useAuth();
  if (activeRole === 'ACCOUNTANT') {
    return <Navigate to="/finance" replace />;
  }
  return <Navigate to="/dashboard" replace />;
};

const DisallowedRoleGuard: React.FC<{
  disallowedRoles: string[];
  redirectTo?: string;
  children: React.ReactNode;
}> = ({ disallowedRoles, redirectTo = '/finance', children }) => {
  const { activeRole } = useAuth();
  if (activeRole && disallowedRoles.includes(activeRole)) {
    return <Navigate to={redirectTo as any} replace />;
  }
  return <>{children}</>;
};

// Root Route
const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <Toaster position="top-right" richColors closeButton />
    </>
  ),
});

// Index Route -> redirects to /dashboard (or /finance for accountants)
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: IndexRedirect,
});

// Login Route
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: () => <LoginPage />,
});

// Register Route
const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: () => <RegisterPage />,
});

// Protected Layout Route
const protectedLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_authenticated',
  component: ProtectedLayout,
});

// Official Report Card View Route (Standalone, not using ProtectedLayout so it's full screen)
const officialReportCardViewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/report-card/$tenantId/$examId/$studentId',
  component: OfficialReportCardViewPage,
});

// Dashboard Route
const dashboardRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/dashboard',
  component: DashboardPage,
});

// Feature Routes
const classesRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/academic/classes',
  component: () => (
    <DisallowedRoleGuard disallowedRoles={['ACCOUNTANT']}>
      <ClassesPage />
    </DisallowedRoleGuard>
  ),
});

const classDetailRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/academic/classes/$classId',
  component: () => (
    <DisallowedRoleGuard disallowedRoles={['ACCOUNTANT']}>
      <ClassDetailPage />
    </DisallowedRoleGuard>
  ),
});

const studentsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/academic/students',
  component: () => (
    <DisallowedRoleGuard disallowedRoles={['ACCOUNTANT']}>
      <StudentsPage />
    </DisallowedRoleGuard>
  ),
});

const alumniRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/academic/alumni',
  component: () => (
    <DisallowedRoleGuard disallowedRoles={['ACCOUNTANT']}>
      <AlumniPage />
    </DisallowedRoleGuard>
  ),
});

const subjectsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/academic/subjects',
  component: () => (
    <DisallowedRoleGuard disallowedRoles={['ACCOUNTANT']}>
      <SubjectsPage />
    </DisallowedRoleGuard>
  ),
});

const assignmentsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/academic/assignments',
  component: () => (
    <DisallowedRoleGuard disallowedRoles={['ACCOUNTANT']}>
      <TeacherAssignmentsPage />
    </DisallowedRoleGuard>
  ),
});

const myAssignmentsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/academic/my-assignments',
  component: () => (
    <DisallowedRoleGuard disallowedRoles={['ACCOUNTANT']}>
      <MyAssignmentsPage />
    </DisallowedRoleGuard>
  ),
});

const parentLinksRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/academic/parent-links',
  component: () => (
    <DisallowedRoleGuard disallowedRoles={['ACCOUNTANT']}>
      <TeacherParentDirectoryPage />
    </DisallowedRoleGuard>
  ),
});

const parentDirectoryRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/academic/parent-directory',
  component: () => (
    <DisallowedRoleGuard disallowedRoles={['ACCOUNTANT']}>
      <TeacherParentDirectoryPage />
    </DisallowedRoleGuard>
  ),
});

const myTeachersRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/academic/my-teachers',
  component: () => (
    <DisallowedRoleGuard disallowedRoles={['ACCOUNTANT']}>
      <MyTeachersPage />
    </DisallowedRoleGuard>
  ),
});

const myChildrenRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/academic/my-children',
  component: () => (
    <DisallowedRoleGuard disallowedRoles={['ACCOUNTANT']}>
      <MyChildrenPage />
    </DisallowedRoleGuard>
  ),
});

const reportCardsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/academic/report-cards',
  component: () => (
    <DisallowedRoleGuard disallowedRoles={['ACCOUNTANT']}>
      <ParentReportCardsPage />
    </DisallowedRoleGuard>
  ),
});

const academicAnalyticsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/academic/analytics',
  component: () => (
    <DisallowedRoleGuard disallowedRoles={['ACCOUNTANT']}>
      <AcademicAnalyticsPage />
    </DisallowedRoleGuard>
  ),
});

const attendanceMarkRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/attendance/mark',
  component: () => (
    <DisallowedRoleGuard disallowedRoles={['ACCOUNTANT']}>
      <MarkAttendancePage />
    </DisallowedRoleGuard>
  ),
});

const attendanceReportsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/attendance/reports',
  component: () => (
    <DisallowedRoleGuard disallowedRoles={['ACCOUNTANT']}>
      <AttendanceReportsPage />
    </DisallowedRoleGuard>
  ),
});

const membersRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/members',
  component: () => (
    <DisallowedRoleGuard disallowedRoles={['ACCOUNTANT']}>
      <MembersPage />
    </DisallowedRoleGuard>
  ),
});

const tenantsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/tenants',
  component: () => (
    <DisallowedRoleGuard disallowedRoles={['ACCOUNTANT']}>
      <TenantsPage />
    </DisallowedRoleGuard>
  ),
});

const tenantDetailRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/tenants/$tenantId',
  component: () => (
    <DisallowedRoleGuard disallowedRoles={['ACCOUNTANT']}>
      <TenantAnalyticsPage />
    </DisallowedRoleGuard>
  ),
});

const tenantOnboardRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/tenants/onboard',
  component: () => (
    <DisallowedRoleGuard disallowedRoles={['ACCOUNTANT']}>
      <TenantOnboardPage />
    </DisallowedRoleGuard>
  ),
});

const academicYearsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/academic-years',
  component: () => <Navigate to="/school-settings" search={{ tab: 'sessions' }} replace />,
});

const schoolSettingsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/school-settings',
  component: () => (
    <DisallowedRoleGuard disallowedRoles={['ACCOUNTANT']}>
      <SchoolSettingsPage />
    </DisallowedRoleGuard>
  ),
});

const academicCalendarRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/academic-calendar',
  component: () => (
    <DisallowedRoleGuard disallowedRoles={['ACCOUNTANT']}>
      <AcademicCalendarPage />
    </DisallowedRoleGuard>
  ),
});

const examsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/examination/exams',
  component: () => (
    <DisallowedRoleGuard disallowedRoles={['ACCOUNTANT']}>
      <ExamsListPage />
    </DisallowedRoleGuard>
  ),
});

const createExamRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/examination/exams/create',
  component: () => (
    <DisallowedRoleGuard disallowedRoles={['ACCOUNTANT']}>
      <CreateExamPage />
    </DisallowedRoleGuard>
  ),
});

const examReviewRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/examination/exams/$examId/review',
  component: () => (
    <DisallowedRoleGuard disallowedRoles={['ACCOUNTANT']}>
      <ExamReviewPage />
    </DisallowedRoleGuard>
  ),
});

const scoreEntryRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/examination/exams/$examId/grade/$examSubjectId',
  component: () => (
    <DisallowedRoleGuard disallowedRoles={['ACCOUNTANT']}>
      <ScoreEntryPage />
    </DisallowedRoleGuard>
  ),
});

const scoreEntryQueryRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/examination/scores',
  component: () => (
    <DisallowedRoleGuard disallowedRoles={['ACCOUNTANT']}>
      <ScoreEntryPage />
    </DisallowedRoleGuard>
  ),
});

const platformUsersRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/platform-users',
  component: PlatformUsersPage,
});

const auditLogsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/audit-logs',
  component: AuditLogsPage,
});

const financeDashboardRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/finance',
  component: FinanceDashboardPage,
});

const financeBillsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/finance/bills',
  component: BillsPage,
});

const financeCollectRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/finance/collect',
  component: CollectPaymentPage,
});

const financeStructuresRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/finance/structures',
  component: FeeStructuresPage,
});

const financeTransactionsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/finance/transactions',
  component: TransactionsPage,
});

const financeLedgerRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/finance/ledger/$studentId',
  component: StudentLedgerPage,
});

// Build Route Tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  officialReportCardViewRoute,
  protectedLayoutRoute.addChildren([
    dashboardRoute,
    classesRoute,
    classDetailRoute,
    studentsRoute,
    alumniRoute,
    subjectsRoute,
    assignmentsRoute,
    myAssignmentsRoute,
    parentLinksRoute,
    parentDirectoryRoute,
    myTeachersRoute,
    myChildrenRoute,
    reportCardsRoute,
    academicAnalyticsRoute,
    attendanceMarkRoute,
    attendanceReportsRoute,
    membersRoute,
    tenantsRoute,
    tenantDetailRoute,
    tenantOnboardRoute,
    platformUsersRoute,
    academicYearsRoute,
    schoolSettingsRoute,
    academicCalendarRoute,
    examsRoute,
    createExamRoute,
    examReviewRoute,
    scoreEntryRoute,
    scoreEntryQueryRoute,
    auditLogsRoute,
    financeDashboardRoute,
    financeBillsRoute,
    financeCollectRoute,
    financeStructuresRoute,
    financeTransactionsRoute,
    financeLedgerRoute,
  ]),
]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
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

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
