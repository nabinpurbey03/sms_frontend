import React from 'react';
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  Navigate,
} from '@tanstack/react-router';

import { LoginPage } from '@/features/auth/pages/LoginPage';
import { ProtectedLayout } from './ProtectedLayout';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { TenantsPage } from '@/features/tenants/pages/TenantsPage';
import { PlaceholderPage } from '@/components/common/PlaceholderPage';
import { MembersPage } from '@/features/members/pages/MembersPage';
import { MyChildrenPage } from '@/features/members/pages/MyChildrenPage';
import { ClassesPage } from '@/features/academic/pages/ClassesPage';
import { StudentsPage } from '@/features/academic/pages/StudentsPage';
import { SubjectsPage } from '@/features/academic/pages/SubjectsPage';
import { TeacherAssignmentsPage } from '@/features/academic/pages/TeacherAssignmentsPage';
import { MarkAttendancePage } from '@/features/attendance/pages/MarkAttendancePage';
import { MyAssignmentsPage } from '@/features/attendance/pages/MyAssignmentsPage';
import { Toaster } from '@/components/ui/sonner';

// Root Route
const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <Toaster position="top-right" richColors closeButton />
    </>
  ),
});

// Index Route -> redirects to /dashboard
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <Navigate to="/dashboard" replace />,
});

// Login Route
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: () => <LoginPage defaultTab="signin" />,
});

// Register Route
const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: () => <LoginPage defaultTab="signup" />,
});

// Protected Layout Route
const protectedLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_authenticated',
  component: ProtectedLayout,
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
  component: ClassesPage,
});

const studentsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/academic/students',
  component: StudentsPage,
});

const subjectsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/academic/subjects',
  component: SubjectsPage,
});

const assignmentsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/academic/assignments',
  component: TeacherAssignmentsPage,
});

const myAssignmentsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/academic/my-assignments',
  component: MyAssignmentsPage,
});

const parentLinksRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/academic/parent-links',
  component: () => <PlaceholderPage title="Parent-Student Mappings (ReBAC)" />,
});

const myChildrenRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/academic/my-children',
  component: MyChildrenPage,
});

const attendanceMarkRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/attendance/mark',
  component: MarkAttendancePage,
});

const attendanceReportsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/attendance/reports',
  component: () => <PlaceholderPage title="Attendance Reports & Summary" />,
});

const membersRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/members',
  component: MembersPage,
});

const tenantsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/tenants',
  component: TenantsPage,
});

const tenantSettingsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: '/tenant-settings',
  component: () => <PlaceholderPage title="School Settings & Logo Upload" />,
});

// Build Route Tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  protectedLayoutRoute.addChildren([
    dashboardRoute,
    classesRoute,
    studentsRoute,
    subjectsRoute,
    assignmentsRoute,
    myAssignmentsRoute,
    parentLinksRoute,
    myChildrenRoute,
    attendanceMarkRoute,
    attendanceReportsRoute,
    membersRoute,
    tenantsRoute,
    tenantSettingsRoute,
  ]),
]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
