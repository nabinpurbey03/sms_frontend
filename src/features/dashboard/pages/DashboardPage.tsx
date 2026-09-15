import React, { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Users,
  BookOpen,
  CalendarCheck,
  Building2,
  ShieldCheck,
  ArrowRight,
  FileSpreadsheet,
  Baby,
  Sparkles,
  GraduationCap,
  Award,
  Plus,
  ChevronDown,
} from 'lucide-react';

import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { DashboardHeroBanner } from '../components/DashboardHeroBanner';
import { AttendanceDashboardHub } from '../components/AttendanceDashboardHub';
import { SchoolResultsDashboardHub } from '../components/SchoolResultsDashboardHub';
import { ParentReportCardsDashboardHub } from '@/features/examination/components/ParentReportCardsDashboardHub';

import { useAttendanceSummary, useDailyAttendanceStatus } from '@/features/attendance/hooks';
import { useAllClassesWithDetails, useMyTeacherAssignments } from '@/features/academic/hooks';
import { useParentChildren } from '@/features/members/hooks';
import { useMyChildrenReportCards } from '@/features/examination/hooks';
import { useSuperAdminDashboard, useTenantDashboard } from '../hooks';

import { SuperAdminGrid } from '../components/SuperAdminGrid';
import { PlatformTrendsSection } from '../components/PlatformTrendsSection';
import { PlatformRankingsSection } from '../components/PlatformRankingsSection';

export const DashboardPage: React.FC = () => {
  const { user, activeRole, activeTenantId } = useAuth();
  const { can, isSuperAdmin, isTeacher, isParent } = usePermission();

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Queries for live metrics
  const { data: attendanceSummary } = useAttendanceSummary(
    !isParent ? activeTenantId : null,
    todayStr,
    { enabled: !!activeTenantId && !isParent }
  );
  const { data: dailyAttendanceStatus } = useDailyAttendanceStatus(
    !isParent ? activeTenantId : null,
    todayStr,
    undefined,
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

  // Computed total sections
  const totalSections = useMemo(() => {
    return tenantMetrics?.total_sections ?? classes.reduce((sum, c) => sum + (c.sections?.length || 0), 0);
  }, [tenantMetrics?.total_sections, classes]);

  // Computed confirmed / marked sections today
  const confirmedSections = useMemo(() => {
    return dailyAttendanceStatus?.marked_section_ids?.length ?? 0;
  }, [dailyAttendanceStatus?.marked_section_ids]);

  // Computed class teacher duties
  const classTeacherDuties = useMemo(() => {
    return teacherAssignments.filter((a) => a.is_class_teacher).length;
  }, [teacherAssignments]);

  // Computed today's attendance rate
  const attendanceRate = useMemo(() => {
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
        <div className="space-y-6">
          <SuperAdminGrid metrics={superAdminMetrics} />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <PlatformTrendsSection />
            <PlatformRankingsSection />
          </div>
        </div>
      ) : (
        <>
          {/* KPI Stats Grid (1 col phone, 2 cols tablet, 4 cols desktop) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <StatCard
              title={isParent ? 'Linked Children' : 'Active Students'}
              value={isParent ? (parentChildren?.length ?? 0) : (tenantMetrics?.total_students ?? totalEnrolledStudents)}
              icon={isParent ? Baby : GraduationCap}
              description={isParent ? 'Children linked to your account' : 'Total enrolled students'}
            />

            <StatCard
              title={isTeacher ? 'My Assignments' : 'Classes & Sections'}
              value={isTeacher ? (teacherAssignments?.length ?? 0) : (tenantMetrics?.total_classes ?? classes.length)}
              icon={BookOpen}
              description={
                isTeacher
                  ? `${classTeacherDuties} class teacher duties`
                  : `${totalSections} sections`
              }
            />

            <StatCard
              title="Attendance Today"
              value={
                isParent
                  ? (parentChildren?.length ? 'Active' : 'Pending')
                  : `${attendanceRate != null ? `${attendanceRate.toFixed(1)}%` : 'Pending'}`
              }
              icon={CalendarCheck}
              description={
                isParent
                  ? 'Children tracking status'
                  : `${confirmedSections} of ${totalSections} sections confirmed`
              }
              trend={
                !isParent && attendanceRate != null
                  ? { value: attendanceRate >= 80 ? 2.1 : -1.5, label: 'vs yesterday' }
                  : undefined
              }
            />

            <StatCard
              title={isParent ? 'Report Cards' : 'Staff Members'}
              value={
                isParent
                  ? (parentReportCards?.total_published_exams ?? 0)
                  : (tenantMetrics?.total_teachers ?? 0)
              }
              icon={isParent ? Award : Users}
              description={
                isParent
                  ? 'Published exam report cards'
                  : 'Teachers & staff in your school'
              }
            />
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
                  {totalSections > 0 && (
                    <span className="block text-xs mt-1 font-medium text-primary">
                      {confirmedSections} of {totalSections} sections marked today
                    </span>
                  )}
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
                  {totalSections > 0 && (
                    <span className="block text-xs mt-1 font-medium text-emerald-600 dark:text-emerald-400">
                      {classes.length} classes, {totalSections} sections active
                    </span>
                  )}
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
                  {parentChildren.length > 0 && (
                    <span className="block text-xs mt-1 font-medium text-amber-600 dark:text-amber-400">
                      {parentChildren.length} {parentChildren.length === 1 ? 'child' : 'children'} linked
                    </span>
                  )}
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
            <>
              <Card className="group border-border/60 hover:border-primary/50 transition-all rounded-xl">
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg group-hover:scale-105 transition-transform">
                      <Plus className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                  <CardTitle className="text-base font-semibold pt-2">
                    Onboard New School
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Quick wizard to provision a new school and invite an admin
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                  <Button
                    variant="outline"
                    className="w-full text-xs font-semibold h-10"
                    asChild
                  >
                    <Link to="/tenants/onboard">Launch Wizard</Link>
                  </Button>
                </CardContent>
              </Card>

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
                    Manage school tenants, domains, and global platform users
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
            </>
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


      {/* Session Context — collapsed by default */}
      <details className="mt-6">
        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors flex items-center gap-1 select-none">
          <ChevronDown className="h-3 w-3" />
          Session Context
        </summary>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
          <div className="p-3 rounded-xl bg-secondary/60 border text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">User ID</p>
            <p className="font-mono text-[11px] truncate pt-0.5">{user?.id}</p>
          </div>
          <div className="p-3 rounded-xl bg-secondary/60 border text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Active Tenant (X-Tenant-ID)</p>
            <p className="font-mono text-[11px] truncate pt-0.5">
              {activeTenantId || 'None (Super Admin Global Scope)'}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-secondary/60 border text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Active Role Persona</p>
            <p className="font-bold text-primary pt-0.5">{activeRole || 'NONE'}</p>
          </div>
        </div>
      </details>
    </div>
  );
};
