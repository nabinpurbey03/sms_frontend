import React, { useState, useEffect } from 'react';
import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import { useAcademicYears } from '@/features/academic-year/hooks';
import { useTenant } from '@/features/tenants/hooks';
import { useAcademicRetention, useAttendanceIntelligence, useAcademicGrowth } from '../hooks';
import { SchoolSearchSelect } from '@/features/academic-year/components/SchoolSearchSelect';
import { CohortFlowSummaryCard } from '../components/analytics/CohortFlowSummaryCard';
import { CohortRetentionBarChart } from '../components/analytics/CohortRetentionBarChart';
import { DayOfWeekAttendanceChart } from '../components/analytics/DayOfWeekAttendanceChart';
import { AtRiskStudentTable } from '../components/analytics/AtRiskStudentTable';
import { TermGrowthAreaChart } from '../components/analytics/TermGrowthAreaChart';
import { SubjectMasteryBarChart } from '../components/analytics/SubjectMasteryBarChart';
import { SubjectMasteryTable } from '../components/analytics/SubjectMasteryTable';
import { TenantRequiredState } from '@/components/common/TenantRequiredState';
import { EmptyState } from '@/components/common/EmptyState';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  TrendingUp,
  School,
  CalendarDays,
  RefreshCw,
  Loader2,
  TableProperties,
  ArrowRight,
  AlertCircle,
  ShieldAlert,
  UserCheck,
  Users,
  AlertTriangle,
  GraduationCap,
  Award,
  BookOpen,
} from 'lucide-react';

export const AcademicAnalyticsPage: React.FC = () => {
  const { activeTenantId } = useAuth();
  const { isSuperAdmin } = usePermission();

  // Tenant scope management
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const effectiveTenantId = selectedTenantId || activeTenantId || '';
  const { data: effectiveTenant } = useTenant(effectiveTenantId || null);

  // Academic years for selected tenant
  const {
    data: years = [],
    isLoading: isYearsLoading,
    refetch: refetchYears,
  } = useAcademicYears(effectiveTenantId || null);

  const [selectedYearId, setSelectedYearId] = useState<string>('');

  // Default to current academic year or first year when years load
  useEffect(() => {
    if (years.length > 0) {
      const exists = years.find((y) => y.id === selectedYearId);
      if (!exists) {
        const currentYear = years.find((y) => y.is_current);
        setSelectedYearId(currentYear ? currentYear.id : years[0].id);
      }
    } else {
      setSelectedYearId('');
    }
  }, [years, selectedYearId]);

  // Retention analytics query
  const {
    data: retentionData,
    isLoading: isRetentionLoading,
    isRefetching: isRetentionRefetching,
    error: retentionError,
    refetch: refetchRetention,
  } = useAcademicRetention(effectiveTenantId || null, selectedYearId || null);

  // Attendance intelligence query
  const {
    data: attendanceData,
    isLoading: isAttendanceLoading,
    isRefetching: isAttendanceRefetching,
    error: attendanceError,
    refetch: refetchAttendance,
  } = useAttendanceIntelligence(effectiveTenantId || null, selectedYearId || null);

  // Academic Growth & Mastery query
  const {
    data: growthData,
    isLoading: isGrowthLoading,
    isRefetching: isGrowthRefetching,
    error: growthError,
    refetch: refetchGrowth,
  } = useAcademicGrowth(effectiveTenantId || null, selectedYearId || null);

  // Require tenant for non-superadmins
  if (!activeTenantId && !isSuperAdmin) {
    return <TenantRequiredState featureName="academic analytics & intelligence" />;
  }

  const isRefetching = isRetentionRefetching || isAttendanceRefetching || isGrowthRefetching;
  const isLoading =
    isYearsLoading ||
    (!!selectedYearId && (isRetentionLoading || isAttendanceLoading || isGrowthLoading));

  const handleRefresh = async () => {
    await Promise.all([
      refetchYears(),
      refetchRetention(),
      refetchAttendance(),
      refetchGrowth(),
    ]);
  };

  // Helper for progress bar color
  const getRateColor = (rate: number) => {
    if (rate >= 80) return 'bg-emerald-500';
    if (rate >= 60) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const getRateBadge = (rate: number) => {
    if (rate >= 80) {
      return (
        <Badge variant="outline" className="text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40 border-emerald-300">
          {rate.toFixed(1)}%
        </Badge>
      );
    }
    if (rate >= 60) {
      return (
        <Badge variant="outline" className="text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/40 border-amber-300">
          {rate.toFixed(1)}%
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/40 border-rose-300">
        {rate.toFixed(1)}%
      </Badge>
    );
  };

  const getAttendanceHealthBadge = (rate: number) => {
    if (rate >= 90) {
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300">
          Excellent
        </Badge>
      );
    }
    if (rate >= 80) {
      return (
        <Badge variant="outline" className="bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border-sky-300">
          Satisfactory
        </Badge>
      );
    }
    if (rate >= 70) {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-300">
          Needs Attention
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-300">
        Critical Alert
      </Badge>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            Academic Analytics & Intelligence
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Data-driven insights on student retention, cohort progression, attendance health, and early warning indicators.
          </p>
        </div>

        {/* Global Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Academic Year Dropdown */}
          {effectiveTenantId && years.length > 0 && (
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0 hidden sm:inline-block" />
              <Select value={selectedYearId} onValueChange={setSelectedYearId}>
                <SelectTrigger className="w-[180px] sm:w-[210px] h-9 text-xs">
                  <SelectValue placeholder="Select Academic Year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y.id} value={y.id} className="text-xs">
                      {y.name} {y.is_current ? '(Current)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading || isRefetching || !effectiveTenantId}
            className="h-9 gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Super Admin School Scope Selector */}
      {isSuperAdmin && (
        <Card className="p-4 bg-muted/40 border-dashed flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <School className="w-4 h-4 text-primary shrink-0" />
            <span className="font-semibold">School Scope:</span>
            <span className="text-muted-foreground text-xs">
              {effectiveTenant ? effectiveTenant.name : 'Select a school to inspect its metrics'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <SchoolSearchSelect
              selectedTenantId={selectedTenantId}
              onSelectTenant={(id) => {
                setSelectedTenantId(id);
                setSelectedYearId('');
              }}
            />
          </div>
        </Card>
      )}

      {/* Main Content Area */}
      {!effectiveTenantId ? (
        <Card className="p-12 text-center">
          <School className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <h3 className="font-semibold text-lg text-foreground">Select a School</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
            Please choose a school from the selector above to analyze cohort retention, graduation rates, and attendance intelligence.
          </p>
        </Card>
      ) : isYearsLoading ? (
        <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
          <p className="text-sm">Loading academic sessions...</p>
        </div>
      ) : years.length === 0 ? (
        <EmptyState
          title="No Academic Years Found"
          description={`No academic sessions have been configured for ${effectiveTenant?.name || 'this school'}. Add an academic session to unlock academic intelligence.`}
        />
      ) : !selectedYearId ? (
        <EmptyState
          title="Select an Academic Year"
          description="Please choose an academic year from the dropdown above to view cohort flow, retention, and attendance metrics."
        />
      ) : (
        /* Tabbed Intelligence Interface */
        <Tabs defaultValue="retention" className="space-y-6">
          <TabsList className="grid w-full sm:w-auto sm:inline-grid grid-cols-1 sm:grid-cols-3 h-auto sm:h-10 p-1 bg-muted/80">
            <TabsTrigger value="retention" className="flex items-center gap-2 text-xs sm:text-sm font-medium">
              <TrendingUp className="w-4 h-4" />
              <span>Cohort Retention &amp; Progression</span>
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex items-center gap-2 text-xs sm:text-sm font-medium">
              <ShieldAlert className="w-4 h-4" />
              <span>Attendance &amp; Early Warning</span>
            </TabsTrigger>
            <TabsTrigger value="growth" className="flex items-center gap-2 text-xs sm:text-sm font-medium">
              <GraduationCap className="w-4 h-4" />
              <span>Academic Growth &amp; Mastery</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Retention & Progression */}
          <TabsContent value="retention" className="space-y-6 mt-4">
            {isRetentionLoading ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Card key={i} className="p-5 animate-pulse">
                      <div className="h-4 bg-muted rounded w-1/2 mb-3" />
                      <div className="h-8 bg-muted rounded w-3/4" />
                    </Card>
                  ))}
                </div>
                <Card className="p-6 animate-pulse">
                  <div className="h-5 bg-muted rounded w-1/4 mb-4" />
                  <div className="h-[280px] bg-muted/60 rounded" />
                </Card>
                <Card className="p-6 animate-pulse">
                  <div className="h-5 bg-muted rounded w-1/4 mb-4" />
                  <div className="h-40 bg-muted/60 rounded" />
                </Card>
              </div>
            ) : retentionError ? (
              <Card className="p-8 border-destructive/30 bg-destructive/5 text-center">
                <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-2" />
                <h3 className="font-semibold text-foreground">Failed to Load Retention Analytics</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  {(retentionError as any)?.message || 'An error occurred while computing cohort metrics. Please try again.'}
                </p>
                <Button variant="outline" size="sm" onClick={() => refetchRetention()} className="mt-4">
                  Retry
                </Button>
              </Card>
            ) : !retentionData ? (
              <EmptyState
                title="No Analytics Data"
                description="Retention metrics are not yet available for this academic year."
              />
            ) : (
              <div className="space-y-6">
                {/* Cohort Flow Summary Cards */}
                <CohortFlowSummaryCard data={retentionData} />

                {/* Retention Bar Chart */}
                <CohortRetentionBarChart metrics={retentionData.grade_breakdown} />

                {/* Detailed Grade Breakdown Table */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <TableProperties className="w-4 h-4 text-primary" />
                          Grade-by-Grade Progression Breakdown
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          Detailed breakdown of enrolled, retained, graduated, and transferred students per class cohort.
                        </CardDescription>
                      </div>
                      {retentionData.next_academic_year_name && (
                        <Badge variant="secondary" className="text-xs font-normal hidden sm:inline-flex items-center gap-1">
                          <span>{retentionData.academic_year_name}</span>
                          <ArrowRight className="w-3 h-3" />
                          <span>{retentionData.next_academic_year_name}</span>
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {retentionData.grade_breakdown.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        No cohort breakdown data found for this year.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[180px]">Grade / Class</TableHead>
                              <TableHead className="text-center">Enrolled</TableHead>
                              <TableHead className="text-center">Retained</TableHead>
                              <TableHead className="text-center">Graduated</TableHead>
                              <TableHead className="text-center">Transferred / Left</TableHead>
                              <TableHead className="w-[200px] text-right">Retention Rate</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {retentionData.grade_breakdown
                              .sort((a, b) => a.sequence_order - b.sequence_order)
                              .map((metric) => (
                                <TableRow key={metric.class_id}>
                                  <TableCell className="font-semibold text-foreground">
                                    {metric.class_name}
                                  </TableCell>
                                  <TableCell className="text-center font-medium">
                                    {metric.starting_enrolled}
                                  </TableCell>
                                  <TableCell className="text-center text-emerald-600 dark:text-emerald-400 font-medium">
                                    {metric.retained_next_year}
                                  </TableCell>
                                  <TableCell className="text-center text-sky-600 dark:text-sky-400 font-medium">
                                    {metric.graduated}
                                  </TableCell>
                                  <TableCell className="text-center text-rose-600 dark:text-rose-400 font-medium">
                                    {metric.transferred_out}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-3">
                                      <div className="w-24 bg-muted rounded-full h-2 overflow-hidden hidden sm:block">
                                        <div
                                          className={`h-full rounded-full ${getRateColor(metric.retention_rate)}`}
                                          style={{
                                            width: `${Math.min(Math.max(metric.retention_rate, 0), 100)}%`,
                                          }}
                                        />
                                      </div>
                                      {getRateBadge(metric.retention_rate)}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: Attendance & Early Warning */}
          <TabsContent value="attendance" className="space-y-6 mt-4">
            {isAttendanceLoading ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="p-5 animate-pulse">
                      <div className="h-4 bg-muted rounded w-1/2 mb-3" />
                      <div className="h-8 bg-muted rounded w-3/4" />
                    </Card>
                  ))}
                </div>
                <Card className="p-6 animate-pulse">
                  <div className="h-5 bg-muted rounded w-1/4 mb-4" />
                  <div className="h-[280px] bg-muted/60 rounded" />
                </Card>
                <Card className="p-6 animate-pulse">
                  <div className="h-5 bg-muted rounded w-1/4 mb-4" />
                  <div className="h-48 bg-muted/60 rounded" />
                </Card>
              </div>
            ) : attendanceError ? (
              <Card className="p-8 border-destructive/30 bg-destructive/5 text-center">
                <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-2" />
                <h3 className="font-semibold text-foreground">Failed to Load Attendance Intelligence</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  {(attendanceError as any)?.message || 'An error occurred while analyzing attendance records. Please try again.'}
                </p>
                <Button variant="outline" size="sm" onClick={() => refetchAttendance()} className="mt-4">
                  Retry
                </Button>
              </Card>
            ) : !attendanceData ? (
              <EmptyState
                title="No Attendance Data"
                description="Attendance intelligence metrics are not available for this academic year."
              />
            ) : (
              <div className="space-y-6">
                {/* Top KPI Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Overall Attendance Rate */}
                  <Card className="p-5 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Overall Attendance</span>
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <UserCheck className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                      <div className="text-2xl font-bold tracking-tight text-foreground">
                        {attendanceData.overall_attendance_rate.toFixed(1)}%
                      </div>
                      {getAttendanceHealthBadge(attendanceData.overall_attendance_rate)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Across {attendanceData.total_attendance_records.toLocaleString()} session records
                    </p>
                  </Card>

                  {/* Total Evaluated Students */}
                  <Card className="p-5 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Evaluated Students</span>
                      <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400">
                        <Users className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                      <div className="text-2xl font-bold tracking-tight text-foreground">
                        {attendanceData.total_evaluated_students.toLocaleString()}
                      </div>
                      <Badge variant="outline" className="text-muted-foreground text-[11px]">Active Roster</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Students tracked in active academic classes
                    </p>
                  </Card>

                  {/* Chronic Absenteeism Count (<75%) */}
                  <Card className={`p-5 relative overflow-hidden ${
                    attendanceData.chronic_absenteeism_count > 0 ? 'border-rose-300/70 dark:border-rose-900/60 bg-rose-500/[0.02]' : ''
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Chronic Absenteeism</span>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        attendanceData.chronic_absenteeism_count > 0
                          ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                      <div className={`text-2xl font-bold tracking-tight ${
                        attendanceData.chronic_absenteeism_count > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'
                      }`}>
                        {attendanceData.chronic_absenteeism_count.toLocaleString()}
                      </div>
                      {attendanceData.chronic_absenteeism_count > 0 ? (
                        <Badge variant="outline" className="bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-300 text-[11px] font-semibold">
                          &lt;75% Attendance
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/40 border-emerald-300 text-[11px]">
                          Zero Chronic
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {((attendanceData.chronic_absenteeism_count / Math.max(attendanceData.total_evaluated_students, 1)) * 100).toFixed(1)}% of student body in severe deficit
                    </p>
                  </Card>

                  {/* Total Flagged At-Risk */}
                  <Card className="p-5 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Flagged At-Risk</span>
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                      <div className="text-2xl font-bold tracking-tight text-foreground">
                        {attendanceData.at_risk_students.length.toLocaleString()}
                      </div>
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-300 text-[11px]">
                        Watchlist / Risk
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Students below 85% attendance threshold
                    </p>
                  </Card>
                </div>

                {/* Day-of-Week Trends Chart */}
                <DayOfWeekAttendanceChart trends={attendanceData.day_of_week_trends} />

                {/* At-Risk Students Detailed Table */}
                <AtRiskStudentTable students={attendanceData.at_risk_students} />
              </div>
            )}
          </TabsContent>

          {/* TAB 3: Academic Growth & Mastery */}
          <TabsContent value="growth" className="space-y-6 mt-4">
            {isGrowthLoading ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="p-5 animate-pulse">
                      <div className="h-4 bg-muted rounded w-1/2 mb-3" />
                      <div className="h-8 bg-muted rounded w-3/4" />
                    </Card>
                  ))}
                </div>
                <Card className="p-6 animate-pulse">
                  <div className="h-5 bg-muted rounded w-1/4 mb-4" />
                  <div className="h-[280px] bg-muted/60 rounded" />
                </Card>
                <Card className="p-6 animate-pulse">
                  <div className="h-5 bg-muted rounded w-1/4 mb-4" />
                  <div className="h-[280px] bg-muted/60 rounded" />
                </Card>
                <Card className="p-6 animate-pulse">
                  <div className="h-5 bg-muted rounded w-1/4 mb-4" />
                  <div className="h-48 bg-muted/60 rounded" />
                </Card>
              </div>
            ) : growthError ? (
              <Card className="p-8 border-destructive/30 bg-destructive/5 text-center">
                <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-2" />
                <h3 className="font-semibold text-foreground">Failed to Load Academic Growth &amp; Mastery</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  {(growthError as any)?.message || 'An error occurred while analyzing academic growth. Please try again.'}
                </p>
                <Button variant="outline" size="sm" onClick={() => refetchGrowth()} className="mt-4">
                  Retry
                </Button>
              </Card>
            ) : !growthData ? (
              <EmptyState
                title="No Growth &amp; Mastery Data"
                description="Academic growth and subject mastery metrics are not available for this academic year."
              />
            ) : (
              <div className="space-y-6">
                {/* Top 4 KPI Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Overall School Average Score */}
                  <Card className="p-5 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Overall Average Score</span>
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <Award className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                      <div className="text-2xl font-bold tracking-tight text-foreground">
                        {growthData.overall_school_average_pct.toFixed(1)}%
                      </div>
                      {getRateBadge(growthData.overall_school_average_pct)}
                    </div>
                    <div className="mt-2 w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${getRateColor(growthData.overall_school_average_pct)}`}
                        style={{
                          width: `${Math.min(Math.max(growthData.overall_school_average_pct, 0), 100)}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Across all evaluated subject tests
                    </p>
                  </Card>

                  {/* Session School GPA */}
                  <Card className="p-5 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Session School GPA</span>
                      <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                      <div className="text-2xl font-bold tracking-tight text-foreground">
                        {growthData.overall_school_gpa.toFixed(2)}
                        <span className="text-sm font-normal text-muted-foreground ml-1">/ 4.00</span>
                      </div>
                      <Badge variant="outline" className="bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border-sky-300 text-[11px]">
                        4.00 Scale
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Weighted institutional GPA benchmark
                    </p>
                  </Card>

                  {/* Total Assessed Exams */}
                  <Card className="p-5 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Assessed Exams</span>
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <BookOpen className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                      <div className="text-2xl font-bold tracking-tight text-foreground">
                        {growthData.total_exams_evaluated.toLocaleString()}
                      </div>
                      <Badge variant="outline" className="text-muted-foreground text-[11px]">
                        Terms Evaluated
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Evaluated examination milestone periods
                    </p>
                  </Card>

                  {/* Total Scores Analyzed */}
                  <Card className="p-5 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Total Scores Analyzed</span>
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                        <TableProperties className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                      <div className="text-2xl font-bold tracking-tight text-foreground">
                        {growthData.total_scores_analyzed.toLocaleString()}
                      </div>
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-300 text-[11px]">
                        Grades Processed
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Individual student subject grade records
                    </p>
                  </Card>
                </div>

                {/* Term Growth Area Chart */}
                <TermGrowthAreaChart trajectory={growthData.term_growth_trajectory} />

                {/* Subject Mastery Bar Chart */}
                <SubjectMasteryBarChart mastery={growthData.subject_mastery} />

                {/* Subject Mastery Registry Table */}
                <SubjectMasteryTable mastery={growthData.subject_mastery} />
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
export default AcademicAnalyticsPage;
