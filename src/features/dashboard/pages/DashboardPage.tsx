import React from 'react';
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
  Check,
  X,
} from 'lucide-react';

import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ResponsiveDataTable, type Column } from '@/components/common/ResponsiveDataTable';
import { DashboardHeroBanner } from '../components/DashboardHeroBanner';

interface QuickRecord {
  id: string;
  studentName: string;
  rollNo: string;
  className: string;
  section: string;
  status: 'PRESENT' | 'ABSENT';
  time: string;
}

const SAMPLE_ATTENDANCE_LOG: QuickRecord[] = [
  { id: '1', studentName: 'Aarav Sharma', rollNo: '101', className: 'Grade 10', section: 'Section A', status: 'PRESENT', time: '09:05 AM' },
  { id: '2', studentName: 'Pooja Thapa', rollNo: '102', className: 'Grade 10', section: 'Section A', status: 'PRESENT', time: '09:08 AM' },
  { id: '3', studentName: 'Rohan Shrestha', rollNo: '103', className: 'Grade 10', section: 'Section A', status: 'ABSENT', time: '-' },
  { id: '4', studentName: 'Ananya Joshi', rollNo: '104', className: 'Grade 10', section: 'Section A', status: 'PRESENT', time: '09:02 AM' },
];

export const DashboardPage: React.FC = () => {
  const { user, activeRole, activeTenantName, activeTenantId } = useAuth();
  const { can, isSuperAdmin, isTeacher, isParent } = usePermission();

  const columns: Column<QuickRecord>[] = [
    {
      header: 'Roll No',
      accessorKey: 'rollNo',
      cell: (item) => <span className="font-mono text-xs font-semibold">{item.rollNo}</span>,
    },
    {
      header: 'Student Name',
      accessorKey: 'studentName',
      cell: (item) => <span className="font-medium text-foreground">{item.studentName}</span>,
    },
    {
      header: 'Class & Section',
      cell: (item) => (
        <span className="text-xs text-muted-foreground">
          {item.className} - {item.section}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (item) =>
        item.status === 'PRESENT' ? (
          <Badge variant="success" className="gap-1 text-[10px] px-2 py-0.5">
            <Check className="h-3 w-3" />
            Present
          </Badge>
        ) : (
          <Badge variant="destructive" className="gap-1 text-[10px] px-2 py-0.5">
            <X className="h-3 w-3" />
            Absent
          </Badge>
        ),
    },
    {
      header: 'Marked At',
      accessorKey: 'time',
      cell: (item) => <span className="text-xs font-mono text-muted-foreground">{item.time}</span>,
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 w-full min-w-0">
      {/* Welcome Hero Banner (Dynamic Theme-Adaptive) */}
      <DashboardHeroBanner />

      {/* KPI Stats Grid (1 col phone, 2 cols tablet, 4 cols desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1 */}
        <Card className="border-border/60 hover:shadow-md transition-shadow rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 sm:p-6 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {isParent ? 'Linked Children' : 'Active Students'}
            </CardTitle>
            <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
              {isParent ? <Baby className="h-4 w-4" /> : <Users className="h-4 w-4" />}
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <div className="text-2xl font-bold text-foreground">
              {isParent ? '1 Child' : '240+'}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 truncate">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span>{isParent ? 'Enrolled in Class 6A' : 'Enrolled across all sections'}</span>
            </p>
          </CardContent>
        </Card>

        {/* Metric 2 */}
        <Card className="border-border/60 hover:shadow-md transition-shadow rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 sm:p-6 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {isTeacher ? 'My Assignments' : 'Classes & Sections'}
            </CardTitle>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <BookOpen className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <div className="text-2xl font-bold text-foreground">
              {isTeacher ? '3 Classes' : '10 Classes'}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 truncate">
              <span className="font-medium text-foreground">
                {isTeacher ? 'Class Teacher: Grade 10-A' : 'Auto-provisioned sections'}
              </span>
            </p>
          </CardContent>
        </Card>

        {/* Metric 3 */}
        <Card className="border-border/60 hover:shadow-md transition-shadow rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 sm:p-6 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Today's Attendance
            </CardTitle>
            <div className="p-2.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl">
              <CalendarCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <div className="text-2xl font-bold text-foreground">94.8%</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 truncate">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span>Daily presence rate</span>
            </p>
          </CardContent>
        </Card>

        {/* Metric 4 */}
        <Card className="border-border/60 hover:shadow-md transition-shadow rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 sm:p-6 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Authorization Status
            </CardTitle>
            <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <div className="text-2xl font-bold text-foreground">RBAC + ReBAC</div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {isSuperAdmin
                ? 'Super Admin Platform Access'
                : `Scoped to ${activeTenantName || 'Current School'}`}
            </p>
          </CardContent>
        </Card>
      </div>

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
              <CardHeader className="p-4 sm:p-5 pb-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 bg-primary/10 text-primary rounded-xl group-hover:scale-105 transition-transform">
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
              <CardContent className="p-4 sm:p-5 pt-0">
                <Button
                  variant="outline"
                  className="w-full text-xs font-semibold min-h-[44px] sm:min-h-9"
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
              <CardHeader className="p-4 sm:p-5 pb-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl group-hover:scale-105 transition-transform">
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
              <CardContent className="p-4 sm:p-5 pt-0">
                <Button
                  variant="outline"
                  className="w-full text-xs font-semibold min-h-[44px] sm:min-h-9"
                  asChild
                >
                  <Link to="/academic/classes">Manage Classes</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Attendance Reports */}
          {can('VIEW_ATTENDANCE_REPORTS') && (
            <Card className="group border-border/60 hover:border-primary/50 transition-all rounded-xl">
              <CardHeader className="p-4 sm:p-5 pb-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 bg-purple-500/10 text-purple-600 rounded-xl group-hover:scale-105 transition-transform">
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
              <CardContent className="p-4 sm:p-5 pt-0">
                <Button
                  variant="outline"
                  className="w-full text-xs font-semibold min-h-[44px] sm:min-h-9"
                  asChild
                >
                  <Link to="/attendance/reports">View Reports</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Parent Linked Children */}
          {isParent && (
            <Card className="group border-border/60 hover:border-primary/50 transition-all rounded-xl">
              <CardHeader className="p-4 sm:p-5 pb-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl group-hover:scale-105 transition-transform">
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
              <CardContent className="p-4 sm:p-5 pt-0">
                <Button
                  variant="outline"
                  className="w-full text-xs font-semibold min-h-[44px] sm:min-h-9"
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
              <CardHeader className="p-4 sm:p-5 pb-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 bg-purple-500/10 text-purple-600 rounded-xl group-hover:scale-105 transition-transform">
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
              <CardContent className="p-4 sm:p-5 pt-0">
                <Button
                  variant="outline"
                  className="w-full text-xs font-semibold min-h-[44px] sm:min-h-9"
                  asChild
                >
                  <Link to="/tenants">Manage Tenants</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* School Member Management */}
          {can('CREATE_TEACHER_PARENT') && (
            <Card className="group border-border/60 hover:border-primary/50 transition-all rounded-xl">
              <CardHeader className="p-4 sm:p-5 pb-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 bg-blue-500/10 text-blue-600 rounded-xl group-hover:scale-105 transition-transform">
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
              <CardContent className="p-4 sm:p-5 pt-0">
                <Button
                  variant="outline"
                  className="w-full text-xs font-semibold min-h-[44px] sm:min-h-9"
                  asChild
                >
                  <Link to="/members">Manage Members</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Live Responsive Data Table Section (Demonstrating Stacked Cards on Mobile vs Table on Desktop) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              Recent Attendance Log
            </h2>
            <p className="text-xs text-muted-foreground">
              Real-time daily attendance entries for active school section
            </p>
          </div>
          <Badge variant="outline" className="w-fit text-[11px] font-mono">
            Live Section A
          </Badge>
        </div>

        <ResponsiveDataTable
          data={SAMPLE_ATTENDANCE_LOG}
          columns={columns}
          keyExtractor={(item) => item.id}
          renderCard={(item) => (
            <Card className="border-border/60 shadow-xs p-3.5 space-y-2.5 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-muted">
                    #{item.rollNo}
                  </span>
                  <span className="font-semibold text-sm text-foreground">
                    {item.studentName}
                  </span>
                </div>
                {item.status === 'PRESENT' ? (
                  <Badge variant="success" className="text-[10px] px-2 py-0.5">
                    Present
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-[10px] px-2 py-0.5">
                    Absent
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
                <span>{item.className} - {item.section}</span>
                <span className="font-mono">{item.time}</span>
              </div>
            </Card>
          )}
        />
      </div>

      {/* System Security & RBAC Summary */}
      <Card className="border-border/60 bg-card/90 rounded-2xl">
        <CardHeader className="p-4 sm:p-5">
          <CardTitle className="text-xs sm:text-sm font-semibold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>Active Session Security Context</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 pt-0 text-xs text-muted-foreground">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
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
