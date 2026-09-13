import React, { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Users,
  BookOpen,
  CalendarCheck,
  Building2,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  FileSpreadsheet,
  Baby,
  Sparkles,
  AlertCircle,
  GraduationCap,
  Award,
} from 'lucide-react';

import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardHeroBanner } from '../components/DashboardHeroBanner';
import { AttendanceDashboardHub } from '../components/AttendanceDashboardHub';
import { SchoolResultsDashboardHub } from '../components/SchoolResultsDashboardHub';
import { ParentReportCardsDashboardHub } from '@/features/examination/components/ParentReportCardsDashboardHub';

import { useAttendanceSummary } from '@/features/attendance/hooks';
import { useAllClassesWithDetails, useMyTeacherAssignments } from '@/features/academic/hooks';
import { useParentChildren } from '@/features/members/hooks';
import { useMyChildrenReportCards } from '@/features/examination/hooks';
import { useSuperAdminDashboard, useTenantDashboard } from '../hooks';

import { SuperAdminGrid } from '../components/SuperAdminGrid';

export const DashboardPage: React.FC = () => {
  const { user, activeRole, activeTenantName, activeTenantId } = useAuth();
  const { can, isSuperAdmin, isTeacher, isParent } = usePermission();

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Queries for live metrics
  const { data: attendanceSummary } = useAttendanceSummary(
    !isParent ? activeTenantId : null,
    todayStr,
    { enabled: !!activeTenantId && !isParent }
  );
  const { data: classes = [] } = useAllClassesWithDetails(!isParent ? activeTenantId : null);
  const { data: teacherAssignments = [] } = useMyTeacherAssignments(
    activeTenantId,
    { enabled: !!activeTenantId && isTeacher }
  );
  const { data: parentChildren = [] } = useParentChildren(
    activeTenantId,
    isParent ? (user?.id ?? null) : null
  );
  const { data: parentReportCards } = useMyChildrenReportCards(
    activeTenantId,
    { enabled: !!activeTenantId && isParent }
  );

  const { data: superAdminMetrics } = useSuperAdminDashboard(isSuperAdmin && !activeTenantId);
  const { data: tenantMetrics } = useTenantDashboard(activeTenantId);

  // Computed total students
  const totalEnrolledStudents = useMemo(() => {
    return classes.reduce((sum, c) => {
      const classStudents = (c.sections || []).reduce((secSum, s) => secSum + (s.student_count || 0), 0);
      return sum + classStudents;
    }, 0);
  }, [classes]);

  // Computed today's attendance rate
  const todayAttendanceRate = useMemo(() => {
    const total = attendanceSummary?.school?.total_students || 0;
    const present = attendanceSummary?.school?.total_present || 0;
    if (!total || total === 0) return null;
    return Math.round((present / total) * 1000) / 10;
  }, [attendanceSummary]);

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Welcome Hero Banner (Dynamic Theme-Adaptive) */}
      <DashboardHeroBanner />

      {isSuperAdmin && !activeTenantId ? (
        <SuperAdminGrid metrics={superAdminMetrics} />
      ) : (
        <>
          {/* KPI Stats Grid (1 col phone, 2 cols tablet, 4 cols desktop) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Metric 1 */}
        <Card className="border-border/60 hover:shadow-md transition-shadow rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between p-5 pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {isParent ? 'Linked Children' : 'Active Students'}
            </CardTitle>
            <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
              {isParent ? <Baby className="h-4 w-4" /> : <Users className="h-4 w-4" />}
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-2xl font-bold text-foreground">
              {isParent
                ? `${parentChildren.length} ${parentChildren.length === 1 ? 'Child' : 'Children'}`
                : (tenantMetrics?.total_students ?? totalEnrolledStudents) > 0
                ? `${tenantMetrics?.total_students ?? totalEnrolledStudents}`
                : '0 Enrolled'}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 truncate">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span>{isParent ? 'Enrolled in current school' : 'Enrolled across all classes'}</span>
            </p>
          </CardContent>
        </Card>

        {/* Metric 2 */}
        <Card className="border-border/60 hover:shadow-md transition-shadow rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between p-5 pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {isTeacher ? 'My Assignments' : 'Classes & Sections'}
            </CardTitle>
            <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <BookOpen className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-2xl font-bold text-foreground">
              {isTeacher
                ? `${teacherAssignments.length} ${teacherAssignments.length === 1 ? 'Duty' : 'Duties'}`
                : `${tenantMetrics?.total_classes ?? classes.length} ${(tenantMetrics?.total_classes ?? classes.length) === 1 ? 'Class' : 'Classes'}`}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 truncate">
              <span className="font-medium text-foreground">
                {isTeacher
                  ? `${teacherAssignments.filter((a) => a.is_class_teacher).length} Class Teacher designation(s)`
                  : `${tenantMetrics?.total_sections ?? 'Auto-provisioned'} sections`}
              </span>
            </p>
          </CardContent>
        </Card>

        {/* Metric 3: Today's Live Attendance */}
        <Card className="border-border/60 hover:shadow-md transition-shadow rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between p-5 pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {isParent ? 'Children Attendance' : "Today's Attendance"}
            </CardTitle>
            <div className="p-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg">
              <CalendarCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-2xl font-bold text-foreground">
              {isParent
                ? `${parentChildren.length > 0 ? 'Active' : 'Pending'}`
                : todayAttendanceRate !== null
                ? `${todayAttendanceRate}%`
                : 'Pending'}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 truncate">
              {isParent ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>Individual tracking below</span>
                </>
              ) : todayAttendanceRate !== null ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>
                    {attendanceSummary?.school?.total_present} of {attendanceSummary?.school?.total_students} confirmed
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span>No sections marked yet today</span>
                </>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Metric 4 */}
        <Card className="border-border/60 hover:shadow-md transition-shadow rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between p-5 pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {isParent ? 'Published Report Cards' : 'Authorization Status'}
            </CardTitle>
            <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
              {isParent ? <Award className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-2xl font-bold text-foreground">
              {isParent
                ? `${parentReportCards?.total_published_exams ?? 0} Available`
                : 'RBAC + ReBAC'}
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {isParent
                ? 'Official examination transcripts'
                : isSuperAdmin
                ? 'Super Admin Platform Access'
                : `Scoped to ${activeTenantName || 'Current School'}`}
            </p>
          </CardContent>
          </Card>
          </div>
        </>
      )}


      {/* Quick Action Hub (1 col mobile, 2 cols tablet, 3 cols desktop) */}
      <div className="space-y-3 sm:space-y-4">
        <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <span>Quick Actions & Workflows</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {/* Mark Attendance */}
          {can('MARK_ATTENDANCE') && !isParent && (
            <Card className="group border-border/60 hover:border-primary/50 transition-all rounded-xl">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-primary/10 text-primary rounded-lg group-hover:scale-105 transition-transform">
                    <CalendarCheck className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                <CardTitle className="text-base font-semibold pt-2">
                  Mark Today's Attendance
                </CardTitle>
                <CardDescription className="text-xs">
                  {isTeacher
                    ? 'Submit attendance for your designated Class Teacher section'
                    : 'Record daily attendance across school sections'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <Button
                  variant="outline"
                  className="w-full text-xs font-semibold h-10"
                  asChild
                >
                  <Link to="/attendance/mark">Open Attendance Grid</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Classes & Roster */}
          {can('VIEW_CLASSES_SUBJECTS') && (
            <Card className="group border-border/60 hover:border-primary/50 transition-all rounded-xl">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg group-hover:scale-105 transition-transform">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                <CardTitle className="text-base font-semibold pt-2">
                  Classes & Roster
                </CardTitle>
                <CardDescription className="text-xs">
                  View classes, student rosters, and sequential section expansion
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <Button
                  variant="outline"
                  className="w-full text-xs font-semibold h-10"
                  asChild
                >
                  <Link to="/academic/classes">Manage Classes</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Attendance Reports */}
          {can('VIEW_ATTENDANCE_REPORTS') && !isParent && (
            <Card className="group border-border/60 hover:border-primary/50 transition-all rounded-xl">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-purple-500/10 text-purple-600 rounded-lg group-hover:scale-105 transition-transform">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                <CardTitle className="text-base font-semibold pt-2">
                  Attendance Reports
                </CardTitle>
                <CardDescription className="text-xs">
                  {isParent
                    ? 'Check your child’s monthly attendance rate and records'
                    : 'Generate section-level and date-range attendance reports'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <Button
                  variant="outline"
                  className="w-full text-xs font-semibold h-10"
                  asChild
                >
                  <Link to="/attendance/reports">View Reports</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Examinations & Academic Results */}
          {(can('MANAGE_EXAMS') || can('ENTER_EXAM_SCORES')) && (
            <Card className="group border-border/60 hover:border-primary/50 transition-all rounded-xl">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-lg group-hover:scale-105 transition-transform">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                <CardTitle className="text-base font-semibold pt-2">
                  Examinations & Results
                </CardTitle>
                <CardDescription className="text-xs">
                  {isTeacher
                    ? 'Enter and submit student scores for your assigned subjects'
                    : 'Create term exams, configure pass marks, and review score matrices'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <Button
                  variant="outline"
                  className="w-full text-xs font-semibold h-10"
                  asChild
                >
                  <Link to="/examination/exams">Open Examinations</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Parent Linked Children */}
          {isParent && (
            <Card className="group border-border/60 hover:border-primary/50 transition-all rounded-xl">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg group-hover:scale-105 transition-transform">
                    <Baby className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                <CardTitle className="text-base font-semibold pt-2">
                  My Linked Children
                </CardTitle>
                <CardDescription className="text-xs">
                  View child profile details, class assignments, and teacher contacts
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <Button
                  variant="outline"
                  className="w-full text-xs font-semibold h-10"
                  asChild
                >
                  <Link to="/academic/my-children">View Children</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Super Admin Tenant Manager */}
          {isSuperAdmin && (
            <Card className="group border-border/60 hover:border-primary/50 transition-all rounded-xl">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-purple-500/10 text-purple-600 rounded-lg group-hover:scale-105 transition-transform">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                <CardTitle className="text-base font-semibold pt-2">
                  Tenant Administration
                </CardTitle>
                <CardDescription className="text-xs">
                  Provision new school tenants, domains, and global platform users
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <Button
                  variant="outline"
                  className="w-full text-xs font-semibold h-10"
                  asChild
                >
                  <Link to="/tenants">Manage Tenants</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Super Admin Audit Trail */}
          {isSuperAdmin && (
            <Card className="group border-border/60 hover:border-primary/50 transition-all rounded-xl">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-slate-500/10 text-slate-600 rounded-lg group-hover:scale-105 transition-transform">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                <CardTitle className="text-base font-semibold pt-2">
                  View Audit Trail
                </CardTitle>
                <CardDescription className="text-xs">
                  Review system activities, access logs, and security events
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <Button
                  variant="outline"
                  className="w-full text-xs font-semibold h-10"
                  asChild
                >
                  <Link to="/audit-logs">Open Audit Logs</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* School Member Management */}
          {can('CREATE_TEACHER_PARENT') && (
            <Card className="group border-border/60 hover:border-primary/50 transition-all rounded-xl">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg group-hover:scale-105 transition-transform">
                    <Users className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                <CardTitle className="text-base font-semibold pt-2">
                  School Members
                </CardTitle>
                <CardDescription className="text-xs">
                  Add Office Admins, Teachers, Parents, and manage role assignments
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <Button
                  variant="outline"
                  className="w-full text-xs font-semibold h-10"
                  asChild
                >
                  <Link to="/members">Manage Members</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* School Examination Results & Academic Performance Hub (Admin & Office Admin only) */}
      {(can('MANAGE_EXAMS') || isSuperAdmin) && (
        <SchoolResultsDashboardHub />
      )}

      {/* Parent Official Academic Report Cards Hub */}
      {isParent && <ParentReportCardsDashboardHub />}

      {/* Live Attendance Reporting Hub */}
      <AttendanceDashboardHub />


      {/* System Security & RBAC Summary */}
      <Card className="border-border/60 bg-card/90 rounded-2xl">
        <CardHeader className="p-5">
          <CardTitle className="text-xs sm:text-sm font-semibold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>Active Session Security Context</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0 text-xs text-muted-foreground">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-secondary/60 border">
              <p className="font-semibold text-foreground">User ID</p>
              <p className="font-mono text-[11px] truncate pt-0.5">{user?.id}</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/60 border">
              <p className="font-semibold text-foreground">Active Tenant (X-Tenant-ID)</p>
              <p className="font-mono text-[11px] truncate pt-0.5">
                {activeTenantId || 'None (Super Admin Global Scope)'}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/60 border">
              <p className="font-semibold text-foreground">Active Role Persona</p>
              <p className="font-bold text-primary pt-0.5">{activeRole || 'NONE'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
