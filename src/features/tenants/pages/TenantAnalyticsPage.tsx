import React, { useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Globe,
  Calendar,
  CalendarDays,
  ArrowRightLeft,
  Shield,
  ShieldAlert,
  RefreshCw,
  Users,
  GraduationCap,
  BookOpen,
  Activity,
  FileText,
  History,
  UserPlus,
  Mail,
  Phone,
  User,
  Clock,
  TrendingUp,
  AlertTriangle,
  Fingerprint,
  Image as ImageIcon,
} from 'lucide-react';
import { Link, useParams } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { ErrorState } from '@/components/common/ErrorState';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/auth/useAuth';
import { useTenantStore } from '@/stores/tenantStore';
import { useTenantAnalytics, useTenantAdmins, useUploadTenantLogo } from '../hooks';
import { TenantAdminsDialog } from '../components/TenantAdminsDialog';
import { TenantAdminAssignDialog } from '../components/TenantAdminAssignDialog';
import { TenantLogoDialog } from '../components/TenantLogoDialog';
import { TenantLogoAvatar } from '../components/TenantLogoAvatar';
import type { TenantAdminResponseDTO } from '../types';

export const TenantAnalyticsPage: React.FC = () => {
  const { tenantId } = useParams({ strict: false }) as { tenantId: string };
  const { activeRole, switchTenant } = useAuth();
  const isSuperAdmin = activeRole === 'SUPER_ADMIN';

  const [adminsDialogOpen, setAdminsDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [logoDialogOpen, setLogoDialogOpen] = useState(false);

  const uploadLogoMutation = useUploadTenantLogo();

  const handleLogoUpload = async (file: File) => {
    if (!tenantId) return;
    await uploadLogoMutation.mutateAsync({
      tenantId,
      file,
    });
    refetch();
  };

  const {
    data: analytics,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useTenantAnalytics(tenantId, { enabled: Boolean(tenantId) && isSuperAdmin });

  const {
    data: admins = [],
    isLoading: adminsLoading,
    refetch: refetchAdmins,
    isFetching: adminsFetching,
  } = useTenantAdmins(tenantId, { enabled: Boolean(tenantId) && isSuperAdmin });

  const adminsList: TenantAdminResponseDTO[] = Array.isArray(admins) ? admins : [];

  const handleSwitchContext = () => {
    if (!tenantId) return;
    switchTenant(tenantId);
    useTenantStore.getState().setActiveTenant(tenantId, analytics?.name || null);
    toast.success('Active Context Switched', {
      description: `Switched active school context to ${analytics?.name || 'selected school'}.`,
    });
  };

  const handleRefresh = async () => {
    await Promise.all([refetch(), refetchAdmins()]);
    toast.success('Telemetry Refreshed', {
      description: 'School analytics and administrator records updated.',
    });
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const formatShortDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Unauthorized Super Admin Check
  if (!isSuperAdmin) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <Link to="/tenants">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to School Directory</span>
          </Link>
        </Button>
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center space-y-3">
          <ShieldAlert className="h-10 w-10 text-destructive mx-auto" />
          <h2 className="text-base font-bold text-destructive">
            Super Admin Access Required
          </h2>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            School 360° analytics telemetry and cross-organization telemetry is
            restricted strictly to platform Super Administrators.
          </p>
        </div>
      </div>
    );
  }

  // Loading Skeleton State
  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto animate-pulse">
        {/* Top Nav Skeleton */}
        <div className="h-8 w-44 bg-muted rounded-lg" />

        {/* Header Skeleton */}
        <div className="p-6 rounded-2xl border border-border bg-card/60 flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-muted" />
            <div className="space-y-2">
              <div className="h-6 w-48 bg-muted rounded" />
              <div className="h-4 w-32 bg-muted rounded" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-36 bg-muted rounded-xl" />
            <div className="h-9 w-28 bg-muted rounded-xl" />
          </div>
        </div>

        {/* 4 Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-5 rounded-2xl border border-border bg-card/60 h-36 space-y-3"
            >
              <div className="h-4 w-28 bg-muted rounded" />
              <div className="h-7 w-20 bg-muted rounded" />
              <div className="h-4 w-full bg-muted rounded" />
            </div>
          ))}
        </div>

        {/* Attendance Skeleton */}
        <div className="p-6 rounded-2xl border border-border bg-card/60 h-64 space-y-4">
          <div className="h-5 w-48 bg-muted rounded" />
          <div className="h-32 bg-muted/40 rounded-xl" />
        </div>

        {/* 2-Column Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl border border-border bg-card/60 h-64" />
          <div className="p-6 rounded-2xl border border-border bg-card/60 h-64" />
        </div>
      </div>
    );
  }

  // Error State
  if (isError || !analytics) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <Link to="/tenants">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to School Directory</span>
          </Link>
        </Button>
        <ErrorState
          title="Failed to Load School Analytics"
          message="Unable to retrieve deep-dive telemetry for this school. Please verify the school identifier and try again."
          error={error}
          onRetry={refetch}
        />
      </div>
    );
  }

  const enrollmentTotal = analytics.enrollment?.total_students ?? 0;
  const staffTotal =
    (analytics.staff?.total_teachers ?? 0) +
    (analytics.staff?.total_office_admins ?? 0) +
    (analytics.staff?.total_parents ?? 0);

  const todayPercentage = analytics.attendance?.today_attendance_percentage;
  const thirtyDayPercentage = analytics.attendance?.thirty_days_average_percentage;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Nav Back Link */}
      <div className="flex items-center justify-between">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground -ml-2"
        >
          <Link to="/tenants">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to School Directory</span>
          </Link>
        </Button>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
          <Fingerprint className="h-3.5 w-3.5 text-primary" />
          <span className="truncate max-w-[200px] sm:max-w-none">{tenantId}</span>
        </div>
      </div>

      {/* 1. Top Nav & School Header Card */}
      <Card className="border-border/60 shadow-sm rounded-2xl overflow-hidden bg-card/90">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            {/* School Profile Information */}
            <div className="flex items-start sm:items-center gap-4">
              <TenantLogoAvatar
                logoUrl={analytics.logo_url}
                name={analytics.name}
                className="h-16 w-16 min-h-[64px] min-w-[64px] rounded-2xl border-primary/20 shadow-inner"
                iconClassName="h-8 w-8"
                onClick={() => setLogoDialogOpen(true)}
                editable={true}
              />

              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight truncate">
                    {analytics.name}
                  </h1>
                  <Badge
                    variant={analytics.is_active ? 'success' : 'destructive'}
                    className="text-xs font-semibold px-2.5 py-0.5"
                  >
                    {analytics.is_active ? 'Active' : 'Suspended'}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <Badge
                    variant="outline"
                    className="font-mono text-xs gap-1.5 py-0.5 px-2 bg-muted/40 border-border"
                  >
                    <Globe className="h-3 w-3 text-muted-foreground" />
                    <span>{analytics.domain_name}</span>
                  </Badge>

                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
                    <span>Created {formatDate(analytics.created_at)}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLogoDialogOpen(true)}
                className="gap-1.5 rounded-xl text-xs font-semibold h-9"
              >
                <ImageIcon className="h-3.5 w-3.5 text-primary" />
                <span>Upload Brand Logo</span>
              </Button>

              <Button
                onClick={handleSwitchContext}
                className="gap-2 shadow-sm font-semibold rounded-xl text-xs h-9"
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
                <span>Switch to School Scope</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setAdminsDialogOpen(true)}
                className="gap-1.5 rounded-xl text-xs font-semibold h-9"
              >
                <Shield className="h-3.5 w-3.5 text-primary" />
                <span>Manage Admins</span>
              </Button>

              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground"
                onClick={handleRefresh}
                disabled={isFetching || adminsFetching}
                title="Refresh school telemetry"
              >
                <RefreshCw
                  className={cn(
                    'h-3.5 w-3.5',
                    (isFetching || adminsFetching) && 'animate-spin'
                  )}
                />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Core Breakdown Cards (4 Cards Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Student Enrollment Breakdown */}
        <Card className="border-border/60 shadow-sm rounded-2xl hover:border-primary/30 transition-all">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Enrollment Breakdown
              </span>
              <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <GraduationCap className="h-4 w-4" />
              </div>
            </div>
            <div className="pt-1">
              <div className="text-2xl font-black text-foreground">
                {enrollmentTotal.toLocaleString()}
              </div>
              <p className="text-[11px] text-muted-foreground">Total enrolled students</p>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-2">
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/50">
              <Badge
                variant="success"
                className="text-[10px] px-1.5 py-0 font-medium"
                title="Active students"
              >
                Active: {analytics.enrollment?.active_students ?? 0}
              </Badge>
              <Badge
                variant="warning"
                className="text-[10px] px-1.5 py-0 font-medium"
                title="Transferred students"
              >
                Transferred: {analytics.enrollment?.transferred_students ?? 0}
              </Badge>
              <Badge
                variant="info"
                className="text-[10px] px-1.5 py-0 font-medium"
                title="Graduated students"
              >
                Graduated: {analytics.enrollment?.graduated_students ?? 0}
              </Badge>
              <Badge
                variant="destructive"
                className="text-[10px] px-1.5 py-0 font-medium"
                title="Suspended students"
              >
                Suspended: {analytics.enrollment?.suspended_students ?? 0}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Staff & Community Breakdown */}
        <Card className="border-border/60 shadow-sm rounded-2xl hover:border-primary/30 transition-all">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Staff & Community
              </span>
              <div className="h-8 w-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="pt-1">
              <div className="text-2xl font-black text-foreground">
                {staffTotal.toLocaleString()}
              </div>
              <p className="text-[11px] text-muted-foreground">Total faculty & parents</p>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-2">
            <div className="grid grid-cols-3 gap-1 pt-2 border-t border-border/50 text-center">
              <div className="p-1 rounded bg-muted/30">
                <div className="text-xs font-bold text-foreground">
                  {analytics.staff?.total_teachers ?? 0}
                </div>
                <div className="text-[10px] text-muted-foreground">Teachers</div>
              </div>
              <div className="p-1 rounded bg-muted/30">
                <div className="text-xs font-bold text-foreground">
                  {analytics.staff?.total_office_admins ?? 0}
                </div>
                <div className="text-[10px] text-muted-foreground">Admins</div>
              </div>
              <div className="p-1 rounded bg-muted/30">
                <div className="text-xs font-bold text-foreground">
                  {analytics.staff?.total_parents ?? 0}
                </div>
                <div className="text-[10px] text-muted-foreground">Parents</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Academic Structure */}
        <Card className="border-border/60 shadow-sm rounded-2xl hover:border-primary/30 transition-all">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Academic Structure
              </span>
              <div className="h-8 w-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <BookOpen className="h-4 w-4" />
              </div>
            </div>
            <div className="pt-1">
              <div className="text-2xl font-black text-foreground">
                {analytics.academic?.total_classes ?? 0}
              </div>
              <p className="text-[11px] text-muted-foreground">Configured classes</p>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-2">
            <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
              <span className="text-muted-foreground">
                <strong className="text-foreground">
                  {analytics.academic?.total_sections ?? 0}
                </strong>{' '}
                Sections
              </span>
              <span className="text-muted-foreground">
                <strong className="text-foreground">
                  {analytics.academic?.total_subjects ?? 0}
                </strong>{' '}
                Subjects
              </span>
              <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                {analytics.academic?.student_teacher_ratio !== null &&
                analytics.academic?.student_teacher_ratio !== undefined
                  ? `${analytics.academic.student_teacher_ratio}:1 S/T`
                  : 'N/A S/T'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Active Academic Year */}
        <Card className="border-border/60 shadow-sm rounded-2xl hover:border-primary/30 transition-all">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Academic Year
              </span>
              <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <CalendarDays className="h-4 w-4" />
              </div>
            </div>
            <div className="pt-1">
              {analytics.academic_year ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-lg sm:text-xl font-bold text-foreground truncate">
                      {analytics.academic_year.name}
                    </span>
                    <Badge
                      variant={
                        analytics.academic_year.status?.toUpperCase() === 'ACTIVE'
                          ? 'success'
                          : 'secondary'
                      }
                      className="text-[10px] px-1.5 py-0"
                    >
                      {analytics.academic_year.status}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {formatDate(analytics.academic_year.start_date)} -{' '}
                    {formatDate(analytics.academic_year.end_date)}
                  </p>
                </>
              ) : (
                <>
                  <div className="text-base font-bold text-muted-foreground">
                    Unconfigured
                  </div>
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                    <AlertTriangle className="h-3 w-3" />
                    <span>No active term set</span>
                  </p>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-2">
            <div className="pt-2 border-t border-border/50 text-xs text-muted-foreground">
              {analytics.academic_year
                ? 'Current operational school session'
                : 'School admin has not launched an academic year'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Attendance Telemetry Hub */}
      <Card className="border-border/60 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="p-6 pb-4 border-b bg-muted/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-foreground">
                  Attendance Telemetry Hub
                </CardTitle>
                <CardDescription className="text-xs">
                  Real-time daily student attendance metrics and rolling 7-day pattern analysis
                </CardDescription>
              </div>
            </div>

            <Badge
              variant="outline"
              className="text-xs gap-1.5 py-1 px-3 bg-muted/40 font-semibold self-start sm:self-auto border-border"
            >
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span>30-Day Avg:</span>
              <span className="font-bold text-foreground font-mono">
                {thirtyDayPercentage !== null && thirtyDayPercentage !== undefined
                  ? `${thirtyDayPercentage}%`
                  : 'N/A'}
              </span>
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Today's Summary Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Metric: Today's Rate */}
            <div className="p-4 rounded-xl border border-border/60 bg-card/60 space-y-1">
              <span className="text-xs font-semibold text-muted-foreground">
                Today's Attendance Rate
              </span>
              <div className="flex items-baseline gap-2">
                <span
                  className={cn(
                    'text-2xl sm:text-3xl font-black font-mono',
                    todayPercentage === null || todayPercentage === undefined
                      ? 'text-muted-foreground'
                      : todayPercentage >= 85
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : todayPercentage >= 70
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-rose-600 dark:text-rose-400'
                  )}
                >
                  {todayPercentage !== null && todayPercentage !== undefined
                    ? `${todayPercentage}%`
                    : 'N/A'}
                </span>
                {todayPercentage !== null && todayPercentage !== undefined && (
                  <Badge
                    variant={
                      todayPercentage >= 85
                        ? 'success'
                        : todayPercentage >= 70
                        ? 'warning'
                        : 'destructive'
                    }
                    className="text-[10px] px-1.5 py-0 font-semibold"
                  >
                    {todayPercentage >= 85
                      ? 'Optimal'
                      : todayPercentage >= 70
                      ? 'Moderate'
                      : 'Low'}
                  </Badge>
                )}
              </div>
            </div>

            {/* Metric: Present Count */}
            <div className="p-4 rounded-xl border border-border/60 bg-card/60 space-y-1">
              <span className="text-xs font-semibold text-muted-foreground">
                Present Today
              </span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {(analytics.attendance?.today_present ?? 0).toLocaleString()}
              </div>
              <span className="text-[10px] text-muted-foreground">Students in class</span>
            </div>

            {/* Metric: Absent Count */}
            <div className="p-4 rounded-xl border border-border/60 bg-card/60 space-y-1">
              <span className="text-xs font-semibold text-muted-foreground">
                Absent Today
              </span>
              <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400">
                {(analytics.attendance?.today_absent ?? 0).toLocaleString()}
              </div>
              <span className="text-[10px] text-muted-foreground">Unexcused / excused</span>
            </div>

            {/* Metric: Total Marked */}
            <div className="p-4 rounded-xl border border-border/60 bg-card/60 space-y-1">
              <span className="text-xs font-semibold text-muted-foreground">
                Total Records Marked
              </span>
              <div className="text-2xl sm:text-3xl font-black text-foreground">
                {(analytics.attendance?.today_records ?? 0).toLocaleString()}
              </div>
              <span className="text-[10px] text-muted-foreground">Daily attendance logs</span>
            </div>
          </div>

          {/* 7-Day Attendance Trend Visualizer */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  <span>7-Day Daily Attendance Trend</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Day-by-day attendance telemetry and student presence pattern
                </p>
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                Target Benchmark: 100%
              </span>
            </div>

            {!analytics.attendance?.seven_days_trend ||
            analytics.attendance.seven_days_trend.length === 0 ? (
              <div className="py-10 text-center text-xs text-muted-foreground border border-dashed rounded-xl bg-muted/10">
                No 7-day attendance trend data recorded for this school yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 pt-1">
                {analytics.attendance.seven_days_trend.map((point) => {
                  const rate = point.attendance_percentage;
                  const hasRecords = point.total_records > 0;
                  const rateDisplay =
                    hasRecords && rate !== null ? `${Math.round(rate)}%` : 'No Data';

                  return (
                    <div
                      key={point.date}
                      className="p-3.5 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 hover:border-primary/30 transition-all flex flex-col justify-between space-y-3 group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">
                          {formatShortDate(point.date)}
                        </span>
                        <Badge
                          variant={
                            !hasRecords
                              ? 'outline'
                              : rate! >= 85
                              ? 'success'
                              : rate! >= 70
                              ? 'warning'
                              : 'destructive'
                          }
                          className="text-[10px] px-1.5 py-0 font-mono font-bold"
                        >
                          {rateDisplay}
                        </Badge>
                      </div>

                      {/* Visual colored progress bar */}
                      <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-300',
                            !hasRecords
                              ? 'bg-transparent'
                              : rate! >= 85
                              ? 'bg-emerald-500'
                              : rate! >= 70
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          )}
                          style={{
                            width: `${
                              hasRecords && rate !== null
                                ? Math.min(100, Math.max(8, rate))
                                : 0
                            }%`,
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          {point.present_count} P
                        </span>
                        <span className="text-rose-600 dark:text-rose-400 font-semibold">
                          {point.absent_count} A
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {point.total_records} tot
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 4. Examinations & School Administrators (2-Column Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1: Examinations Overview */}
        <Card className="border-border/60 shadow-sm rounded-2xl flex flex-col h-full">
          <CardHeader className="p-6 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">
                    Examinations Overview
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Academic assessment cycles and moderation status
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="font-mono text-xs font-bold px-2.5 py-0.5">
                {analytics.exams?.total_exams ?? 0} Total
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-6 pt-3 flex-1 flex flex-col justify-between space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl border border-border/60 bg-card text-center space-y-1">
                <span className="text-xs text-muted-foreground font-medium">Approved</span>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {analytics.exams?.approved_exams ?? 0}
                </div>
                <Badge variant="success" className="text-[10px] px-1.5 py-0">
                  Published
                </Badge>
              </div>

              <div className="p-3.5 rounded-xl border border-border/60 bg-card text-center space-y-1">
                <span className="text-xs text-muted-foreground font-medium">Pending</span>
                <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                  {analytics.exams?.pending_exams ?? 0}
                </div>
                <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                  Review
                </Badge>
              </div>

              <div className="p-3.5 rounded-xl border border-border/60 bg-card text-center space-y-1">
                <span className="text-xs text-muted-foreground font-medium">Draft</span>
                <div className="text-2xl font-black text-muted-foreground">
                  {analytics.exams?.draft_exams ?? 0}
                </div>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  Draft
                </Badge>
              </div>
            </div>

            {/* Distribution progress bar */}
            {(analytics.exams?.total_exams ?? 0) > 0 ? (
              <div className="space-y-2 pt-2 border-t border-border/50">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Approval Ratio</span>
                  <span className="font-mono font-semibold text-foreground">
                    {Math.round(
                      ((analytics.exams?.approved_exams ?? 0) /
                        (analytics.exams?.total_exams || 1)) *
                        100
                    )}
                    %
                  </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-full transition-all"
                    style={{
                      width: `${
                        ((analytics.exams?.approved_exams ?? 0) /
                          (analytics.exams?.total_exams || 1)) *
                        100
                      }%`,
                    }}
                    title={`Approved: ${analytics.exams?.approved_exams ?? 0}`}
                  />
                  <div
                    className="bg-amber-500 h-full transition-all"
                    style={{
                      width: `${
                        ((analytics.exams?.pending_exams ?? 0) /
                          (analytics.exams?.total_exams || 1)) *
                        100
                      }%`,
                    }}
                    title={`Pending: ${analytics.exams?.pending_exams ?? 0}`}
                  />
                  <div
                    className="bg-muted-foreground/30 h-full transition-all"
                    style={{
                      width: `${
                        ((analytics.exams?.draft_exams ?? 0) /
                          (analytics.exams?.total_exams || 1)) *
                        100
                      }%`,
                    }}
                    title={`Draft: ${analytics.exams?.draft_exams ?? 0}`}
                  />
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                No examinations registered for this school yet.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Column 2: School Administrators */}
        <Card className="border-border/60 shadow-sm rounded-2xl flex flex-col h-full">
          <CardHeader className="p-6 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">
                    School Administrators
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Authorized administrators managing school governance
                  </CardDescription>
                </div>
              </div>

              <Button
                size="sm"
                onClick={() => setAssignDialogOpen(true)}
                className="gap-1.5 rounded-xl text-xs font-semibold shadow-sm self-start sm:self-auto h-8"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>+ Assign Admin</span>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6 pt-3 flex-1">
            {adminsLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl border border-border/50 bg-card/60 animate-pulse space-y-2"
                  >
                    <div className="h-4 w-32 bg-muted rounded" />
                    <div className="h-3 w-48 bg-muted rounded" />
                  </div>
                ))}
              </div>
            ) : adminsList.length === 0 ? (
              <div className="py-8 px-4 flex flex-col items-center justify-center text-center border border-dashed rounded-xl">
                <div className="h-10 w-10 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground mb-2">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-semibold text-foreground">
                  No Administrators Assigned
                </h4>
                <p className="text-[11px] text-muted-foreground mt-1 max-w-xs">
                  Assign an administrator to grant school governance and management
                  portal access.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAssignDialogOpen(true)}
                  className="mt-3 gap-1.5 rounded-xl text-xs font-semibold"
                >
                  <UserPlus className="h-3 w-3" />
                  <span>Assign First Administrator</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {adminsList.map((admin: TenantAdminResponseDTO) => {
                  const fullName =
                    [admin.first_name, admin.last_name].filter(Boolean).join(' ').trim() ||
                    'Administrator';
                  const initials =
                    [admin.first_name?.[0], admin.last_name?.[0]]
                      .filter(Boolean)
                      .join('')
                      .toUpperCase() || 'SA';

                  return (
                    <div
                      key={admin.user_id}
                      className="p-3 rounded-xl border border-border/60 bg-card/60 hover:bg-card hover:border-primary/30 transition-all space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <h5 className="text-xs font-semibold text-foreground truncate">
                              {fullName}
                            </h5>
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono truncate">
                              <User className="h-2.5 w-2.5 shrink-0" />
                              <span className="truncate">{admin.user_id}</span>
                            </div>
                          </div>
                        </div>
                        <Badge
                          variant={admin.is_active ? 'success' : 'secondary'}
                          className="text-[10px] px-1.5 py-0 font-semibold shrink-0"
                        >
                          {admin.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                          <span className="truncate">{admin.email || 'No email'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <Phone className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                          <span className="truncate">{admin.phone || 'No phone'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 sm:col-span-2 text-[10px] text-muted-foreground/80">
                          <Calendar className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                          <span>Assigned on {formatDate(admin.assigned_at)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 5. Recent Forensic Audit Trail */}
      <Card className="border-border/60 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="p-6 pb-4 border-b bg-muted/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <History className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">
                  Recent Forensic Audit Trail
                </CardTitle>
                <CardDescription className="text-xs">
                  Live mutation stream and security-audited operations within this tenant
                </CardDescription>
              </div>
            </div>

            <Badge
              variant="outline"
              className="font-mono text-xs font-semibold self-start sm:self-auto px-2.5 py-0.5"
            >
              {analytics.recent_activity?.length || 0} Recent Events
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {!analytics.recent_activity || analytics.recent_activity.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="h-10 w-10 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground mx-auto mb-2">
                <History className="h-5 w-5" />
              </div>
              <h4 className="text-xs font-semibold text-foreground">
                No Audit Logs Found
              </h4>
              <p className="text-[11px] text-muted-foreground mt-1 max-w-sm mx-auto">
                No recent security or mutation events recorded for this school tenant
                yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="text-xs font-semibold">Action</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-xs font-semibold">Actor</TableHead>
                    <TableHead className="text-xs font-semibold">Resource</TableHead>
                    <TableHead className="text-xs font-semibold">Details</TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      Timestamp
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.recent_activity.map((item) => {
                    const isSuccess = item.status?.toLowerCase() === 'success';
                    return (
                      <TableRow key={item.id} className="hover:bg-muted/20">
                        <TableCell className="py-3">
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted text-foreground border border-border/50">
                            {item.action}
                          </span>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge
                            variant={isSuccess ? 'success' : 'destructive'}
                            className="text-[10px] font-semibold uppercase tracking-wider"
                          >
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 text-xs">
                          <div className="font-medium text-foreground">
                            {item.actor_email || 'System / Anonymous'}
                          </div>
                          {item.user_id && (
                            <div className="font-mono text-[10px] text-muted-foreground truncate max-w-[140px]">
                              {item.user_id}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-3 text-xs">
                          <span className="px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground font-mono text-[11px]">
                            {item.resource_type || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 text-xs text-muted-foreground max-w-[300px]">
                          <div
                            className="truncate font-mono text-[11px]"
                            title={item.details || ''}
                          >
                            {item.details || '-'}
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-xs text-muted-foreground text-right whitespace-nowrap font-mono">
                          {formatDateTime(item.created_at)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 6. Dialog Integrations */}
      <TenantAdminsDialog
        open={adminsDialogOpen}
        onOpenChange={setAdminsDialogOpen}
        tenantId={tenantId}
        tenantName={analytics.name}
      />

      <TenantAdminAssignDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        tenantId={tenantId}
        tenantName={analytics.name}
        onSuccess={() => {
          refetch();
          refetchAdmins();
        }}
      />

      <TenantLogoDialog
        open={logoDialogOpen}
        onOpenChange={setLogoDialogOpen}
        tenant={{
          id: tenantId,
          name: analytics.name,
          logo_url: analytics.logo_url,
        }}
        onUpload={handleLogoUpload}
        isUploading={uploadLogoMutation.isPending}
      />
    </div>
  );
};
