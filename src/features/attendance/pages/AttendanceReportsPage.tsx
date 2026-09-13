import React, { useState, useMemo } from 'react';
import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import {
  useSchoolAttendanceReport,
  useClassAttendanceReport,
} from '../hooks';
import { useAllClassesWithDetails } from '@/features/academic/hooks';
import { exportSchoolAttendanceCsv } from '../utils/exportAttendanceCsv';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/common/EmptyState';
import { TenantRequiredState } from '@/components/common/TenantRequiredState';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  Users,
  Calendar,
  CalendarDays,
  AlertTriangle,
  CheckCircle2,
  Download,
  RotateCw,
  Search,
  Check,
  X,
  Award,
  ShieldAlert,
  Loader2,
  TrendingUp,
  Percent,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';

// Date utility functions
const formatDateStr = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getPresetDates = (preset: 'today' | '7d' | '30d' | 'mtd') => {
  const now = new Date();
  const todayStr = formatDateStr(now);
  switch (preset) {
    case 'today':
      return { from: todayStr, to: todayStr };
    case '7d': {
      const past = new Date(now);
      past.setDate(past.getDate() - 7);
      return { from: formatDateStr(past), to: todayStr };
    }
    case '30d': {
      const past = new Date(now);
      past.setDate(past.getDate() - 30);
      return { from: formatDateStr(past), to: todayStr };
    }
    case 'mtd': {
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: formatDateStr(firstOfMonth), to: todayStr };
    }
  }
};

const WEEKDAYS = [
  { index: 0, name: 'Monday', short: 'Mon' },
  { index: 1, name: 'Tuesday', short: 'Tue' },
  { index: 2, name: 'Wednesday', short: 'Wed' },
  { index: 3, name: 'Thursday', short: 'Thu' },
  { index: 4, name: 'Friday', short: 'Fri' },
];

export const AttendanceReportsPage: React.FC = () => {
  const { activeTenantId, activeTenantName, activeRole } = useAuth();
  const { isSuperAdmin } = usePermission();

  // 1. Access guard
  const hasAccess =
    isSuperAdmin || activeRole === 'ADMIN' || activeRole === 'OFFICE_ADMIN';

  // Date range presets state
  const todayStr = useMemo(() => formatDateStr(new Date()), []);
  const initialRange = useMemo(() => getPresetDates('30d'), []);

  const [activePreset, setActivePreset] = useState<'today' | '7d' | '30d' | 'mtd' | 'custom'>('30d');
  const [fromDate, setFromDate] = useState<string>(initialRange.from);
  const [toDate, setToDate] = useState<string>(initialRange.to);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'overview' | 'at-risk' | 'roster'>('overview');

  // Search filters
  const [atRiskSearch, setAtRiskSearch] = useState('');
  const [rosterSearch, setRosterSearch] = useState('');

  // Class & Section filters for Tab 3 (Student Roster Matrix)
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');

  // Academic classes query for filter dropdowns
  const { data: classesWithDetails = [] } = useAllClassesWithDetails(
    hasAccess ? activeTenantId : null
  );

  // Derive effective class ID for Tab 3
  const effectiveClassId = useMemo(() => {
    if (selectedClassId && classesWithDetails.some((c) => c.id === selectedClassId)) {
      return selectedClassId;
    }
    return classesWithDetails.length > 0 ? classesWithDetails[0].id : '';
  }, [selectedClassId, classesWithDetails]);

  // Available sections for effective class
  const selectedClass = useMemo(() => {
    return classesWithDetails.find((c) => c.id === effectiveClassId);
  }, [classesWithDetails, effectiveClassId]);

  // Main School Attendance Report Query
  const {
    data: schoolReport,
    isLoading: isSchoolLoading,
    isRefetching: isSchoolRefetching,
    refetch: refetchSchoolReport,
  } = useSchoolAttendanceReport(activeTenantId, fromDate, toDate, {
    enabled: !!activeTenantId && hasAccess && !!fromDate && !!toDate,
  });

  // Class Roster Matrix Query (Tab 3)
  const {
    data: classReport,
    isLoading: isClassReportLoading,
    isRefetching: isClassRefetching,
    refetch: refetchClassReport,
  } = useClassAttendanceReport(
    activeTenantId,
    effectiveClassId || null,
    fromDate,
    toDate,
    selectedSectionId || undefined,
    {
      enabled: !!activeTenantId && hasAccess && !!effectiveClassId && activeTab === 'roster',
    }
  );

  // Handlers for timeframe presets
  const handleSelectPreset = (preset: 'today' | '7d' | '30d' | 'mtd') => {
    setActivePreset(preset);
    const { from, to } = getPresetDates(preset);
    setFromDate(from);
    setToDate(to);
  };

  const handleFromDateChange = (val: string) => {
    setActivePreset('custom');
    setFromDate(val);
    if (val > toDate) {
      setToDate(val);
    }
  };

  const handleToDateChange = (val: string) => {
    setActivePreset('custom');
    setToDate(val);
    if (val < fromDate) {
      setFromDate(val);
    }
  };

  const handleRefresh = async () => {
    await refetchSchoolReport();
    if (activeTab === 'roster' && effectiveClassId) {
      await refetchClassReport();
    }
  };

  const handleExportCsv = () => {
    if (!schoolReport) return;
    exportSchoolAttendanceCsv(schoolReport, activeTenantName || 'School');
  };

  // Filtered at-risk students for Tab 2
  const filteredAtRiskStudents = useMemo(() => {
    if (!schoolReport?.at_risk_students) return [];
    if (!atRiskSearch.trim()) return schoolReport.at_risk_students;
    const q = atRiskSearch.toLowerCase();
    return schoolReport.at_risk_students.filter((s) => {
      const fullName = `${s.first_name} ${s.middle_name || ''} ${s.last_name}`.toLowerCase();
      const className = (s.class_name || '').toLowerCase();
      const secName = (s.section_name || '').toLowerCase();
      return fullName.includes(q) || className.includes(q) || secName.includes(q);
    });
  }, [schoolReport, atRiskSearch]);

  // Distinct dates for Tab 3 Matrix
  const matrixDates = useMemo(() => {
    if (!classReport?.students) return [];
    const dateSet = new Set<string>();
    classReport.students.forEach((s) => {
      if (s.records) {
        Object.keys(s.records).forEach((d) => dateSet.add(d));
      }
    });
    return Array.from(dateSet).sort();
  }, [classReport]);

  // Filtered roster students for Tab 3
  const filteredRosterStudents = useMemo(() => {
    if (!classReport?.students) return [];
    if (!rosterSearch.trim()) return classReport.students;
    const q = rosterSearch.toLowerCase();
    return classReport.students.filter((s) => {
      const fullName = `${s.first_name} ${s.middle_name || ''} ${s.last_name}`.toLowerCase();
      return fullName.includes(q);
    });
  }, [classReport, rosterSearch]);

  // Permission Guard Check
  if (!hasAccess) {
    return (
      <div className="space-y-6 pb-12">
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-10 text-center space-y-4 max-w-lg mx-auto mt-12">
          <ShieldAlert className="w-12 h-12 mx-auto text-destructive" />
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-foreground">Access Restricted</h2>
            <p className="text-sm text-muted-foreground">
              Attendance reports and school-wide analytics are restricted to School Administrators and Office Admins.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/dashboard">Return to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Tenant Guard Check
  if (!activeTenantId) {
    return <TenantRequiredState featureName="attendance reports" />;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Timeframe Controls Bar */}
      <Card className="p-4 bg-card shadow-xs border-border/70">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Timeframe:
            </span>
            <Button
              type="button"
              variant={activePreset === 'today' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSelectPreset('today')}
              className="h-8 px-3 text-xs"
            >
              Today
            </Button>
            <Button
              type="button"
              variant={activePreset === '7d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSelectPreset('7d')}
              className="h-8 px-3 text-xs"
            >
              Last 7 Days
            </Button>
            <Button
              type="button"
              variant={activePreset === '30d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSelectPreset('30d')}
              className="h-8 px-3 text-xs"
            >
              Last 30 Days
            </Button>
            <Button
              type="button"
              variant={activePreset === 'mtd' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSelectPreset('mtd')}
              className="h-8 px-3 text-xs"
            >
              Month to Date
            </Button>
          </div>

          {/* Date Range Inputs & Actions */}
          <div className="flex items-center gap-3 flex-wrap justify-between xl:justify-end">
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-1.5">
                <label htmlFor="fromDate" className="text-xs text-muted-foreground font-medium">
                  From:
                </label>
                <Input
                  id="fromDate"
                  type="date"
                  value={fromDate}
                  max={todayStr}
                  onChange={(e) => handleFromDateChange(e.target.value)}
                  className="h-8 text-xs w-36"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <label htmlFor="toDate" className="text-xs text-muted-foreground font-medium">
                  To:
                </label>
                <Input
                  id="toDate"
                  type="date"
                  value={toDate}
                  min={fromDate}
                  max={todayStr}
                  onChange={(e) => handleToDateChange(e.target.value)}
                  className="h-8 text-xs w-36"
                />
              </div>
              {activePreset === 'custom' && (
                <Badge variant="secondary" className="text-[10px] h-6 font-normal">
                  Custom Range
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isSchoolLoading || isSchoolRefetching}
                className="h-8 gap-1.5 text-xs cursor-pointer shadow-2xs"
              >
                <RotateCw
                  className={cn('w-3.5 h-3.5', (isSchoolRefetching || isClassRefetching) && 'animate-spin')}
                />
                <span>Refresh</span>
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleExportCsv}
                disabled={!schoolReport || isSchoolLoading}
                className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Executive KPI Cards */}
      {isSchoolLoading && !schoolReport ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-5 border-border/60 animate-pulse space-y-3">
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-8 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </Card>
          ))}
        </div>
      ) : schoolReport ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Average Daily Attendance (ADA) */}
          <Card className="border-border/60 hover:shadow-sm transition-shadow rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-5 space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Average Daily Attendance (ADA)
              </CardTitle>
              <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <Percent className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold text-foreground">
                  {schoolReport.overall_attendance_percentage}%
                </div>
                <Badge
                  variant={
                    schoolReport.overall_attendance_percentage >= 90
                      ? 'success'
                      : schoolReport.overall_attendance_percentage >= 75
                      ? 'warning'
                      : 'destructive'
                  }
                  className="text-[10px] h-5"
                >
                  {schoolReport.overall_attendance_percentage >= 90
                    ? 'Optimal'
                    : schoolReport.overall_attendance_percentage >= 75
                    ? 'Attention'
                    : 'Critical'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {schoolReport.total_present} present / {schoolReport.total_absent} absent student-days
              </p>
            </CardContent>
          </Card>

          {/* KPI 2: Active Student Headcount */}
          <Card className="border-border/60 hover:shadow-sm transition-shadow rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-5 space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Active Student Headcount
              </CardTitle>
              <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                <Users className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-2xl font-bold text-foreground">
                {schoolReport.total_students}
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                Across {schoolReport.classes.length} active classes
              </p>
            </CardContent>
          </Card>

          {/* KPI 3: School Days Logged */}
          <Card className="border-border/60 hover:shadow-sm transition-shadow rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-5 space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                School Days Logged
              </CardTitle>
              <div className="p-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl">
                <CalendarDays className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-2xl font-bold text-foreground">
                {schoolReport.total_school_days}
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                Distinct recorded days in range
              </p>
            </CardContent>
          </Card>

          {/* KPI 4: Chronic Absenteeism Rate */}
          <Card className="border-border/60 hover:shadow-sm transition-shadow rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-5 space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Chronic Absenteeism Rate
              </CardTitle>
              <div
                className={cn(
                  'p-2 rounded-xl',
                  schoolReport.chronic_absentee_count > 0
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                )}
              >
                <AlertTriangle className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold text-foreground">
                  {schoolReport.chronic_absentee_rate}%
                </div>
                {schoolReport.chronic_absentee_count > 0 && (
                  <Badge variant="destructive" className="text-[10px] h-5 gap-1">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    {schoolReport.chronic_absentee_count} Flagged
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {schoolReport.chronic_absentee_count === 0
                  ? 'No students below 85% attendance'
                  : `${schoolReport.chronic_absentee_count} student(s) below 85% attendance`}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Tabs Navigation */}
      <div className="flex gap-1 border-b border-border/60 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={cn(
            'px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap',
            activeTab === 'overview'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Overview &amp; Class Rankings</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('at-risk')}
          className={cn(
            'px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap',
            activeTab === 'at-risk'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          <span>At-Risk &amp; Chronic Absenteeism</span>
          {schoolReport && schoolReport.chronic_absentee_count > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[10px] font-bold">
              {schoolReport.chronic_absentee_count}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('roster')}
          className={cn(
            'px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap',
            activeTab === 'roster'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <CalendarDays className="w-3.5 h-3.5" />
          <span>Student Roster Matrix</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: Overview & Class Rankings                                          */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {schoolReport && (
            <>
              {/* Highlights: Best vs Needs Attention */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4 bg-emerald-500/5 border-emerald-500/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        Best Performing Class
                      </span>
                      <h3 className="text-lg font-bold text-foreground">
                        {schoolReport.best_class_name || 'No attendance records yet'}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Highest cumulative attendance rate during this period.
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 bg-amber-500/5 border-amber-500/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                        Needs Attention
                      </span>
                      <h3 className="text-lg font-bold text-foreground">
                        {schoolReport.lowest_class_name || 'No attendance records yet'}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Lowest cumulative attendance rate requiring intervention.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Day-of-Week Pattern */}
              <Card className="p-5 bg-card border-border/70 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Day-of-Week Attendance Distribution
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Analyze weekday variations to pinpoint recurring absence trends.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {WEEKDAYS.map((w) => {
                    const stat = schoolReport.day_of_week_stats?.find(
                      (d) => d.day_index === w.index || d.day_name.toLowerCase() === w.name.toLowerCase()
                    );
                    const pct = stat ? stat.attendance_percentage : 0;
                    const hasData = stat && stat.total_records > 0;

                    return (
                      <div
                        key={w.index}
                        className="rounded-lg border border-border/60 p-3 bg-muted/20 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">{w.name}</span>
                          <span className="text-xs font-mono font-semibold text-muted-foreground">
                            {hasData ? `${pct}%` : 'N/A'}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              !hasData
                                ? 'bg-muted-foreground/30'
                                : pct >= 90
                                ? 'bg-emerald-500'
                                : pct >= 75
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            )}
                            style={{ width: `${hasData ? Math.min(100, Math.max(0, pct)) : 0}%` }}
                          />
                        </div>

                        <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-0.5">
                          <span>{hasData ? `${stat.present_count} present` : '0 records'}</span>
                          <span>{hasData ? `${stat.absent_count} absent` : '-'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Class Comparison Table */}
              <Card className="overflow-hidden bg-card border-border/70 space-y-0">
                <div className="p-4 border-b">
                  <h3 className="text-sm font-bold text-foreground">
                    Class Performance Rankings ({schoolReport.classes.length} Classes)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Ranked by Average Daily Attendance (ADA) percentage.
                  </p>
                </div>

                {schoolReport.classes.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    No classes found or no attendance recorded for this timeframe.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-16">Rank</TableHead>
                          <TableHead>Class Name</TableHead>
                          <TableHead className="text-right">Enrolled</TableHead>
                          <TableHead className="text-right">Present Days</TableHead>
                          <TableHead className="text-right">Absent Days</TableHead>
                          <TableHead className="text-right w-28">ADA Rate</TableHead>
                          <TableHead className="w-40">Performance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {schoolReport.classes.map((cls, idx) => (
                          <TableRow key={cls.class_id} className="hover:bg-muted/30">
                            <TableCell className="font-mono text-xs font-semibold text-muted-foreground">
                              #{idx + 1}
                            </TableCell>
                            <TableCell className="font-medium text-sm text-foreground">
                              {cls.class_name}
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">
                              {cls.total_students}
                            </TableCell>
                            <TableCell className="text-right text-xs font-medium text-emerald-600 dark:text-emerald-400">
                              {cls.total_present}
                            </TableCell>
                            <TableCell className="text-right text-xs font-medium text-rose-600 dark:text-rose-400">
                              {cls.total_absent}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge
                                variant={
                                  cls.attendance_percentage >= 90
                                    ? 'success'
                                    : cls.attendance_percentage >= 75
                                    ? 'warning'
                                    : 'destructive'
                                }
                                className="font-mono text-xs"
                              >
                                {cls.attendance_percentage}%
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                <div
                                  className={cn(
                                    'h-full rounded-full transition-all',
                                    cls.attendance_percentage >= 90
                                      ? 'bg-emerald-500'
                                      : cls.attendance_percentage >= 75
                                      ? 'bg-amber-500'
                                      : 'bg-rose-500'
                                  )}
                                  style={{
                                    width: `${Math.min(100, Math.max(0, cls.attendance_percentage))}%`,
                                  }}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Card>

              {/* Daily Attendance Trend Table */}
              <Card className="overflow-hidden bg-card border-border/70 space-y-0">
                <div className="p-4 border-b">
                  <h3 className="text-sm font-bold text-foreground">
                    Daily School Attendance Log ({schoolReport.daily_stats.length} Days)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Chronological aggregate attendance figures per recorded school day.
                  </p>
                </div>

                {schoolReport.daily_stats.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    No daily attendance records found for this period.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Enrolled Students</TableHead>
                          <TableHead className="text-right">Present Count</TableHead>
                          <TableHead className="text-right">Absent Count</TableHead>
                          <TableHead className="text-right">Daily Attendance Rate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {schoolReport.daily_stats.map((d) => (
                          <TableRow key={d.date} className="hover:bg-muted/30">
                            <TableCell className="font-medium text-xs text-foreground">
                              {d.date}
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">
                              {d.total_students}
                            </TableCell>
                            <TableCell className="text-right text-xs font-medium text-emerald-600 dark:text-emerald-400">
                              {d.present_count}
                            </TableCell>
                            <TableCell className="text-right text-xs font-medium text-rose-600 dark:text-rose-400">
                              {d.absent_count}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge
                                variant={
                                  d.attendance_percentage >= 90
                                    ? 'success'
                                    : d.attendance_percentage >= 75
                                    ? 'warning'
                                    : 'destructive'
                                }
                                className="font-mono text-xs"
                              >
                                {d.attendance_percentage}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Card>
            </>
          )}

          {!schoolReport && !isSchoolLoading && (
            <EmptyState
              icon={Calendar}
              title="No Attendance Data Found"
              description="No attendance records have been marked for the chosen timeframe. Select another range or record attendance."
            />
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: At-Risk & Chronic Absenteeism Monitor                               */}
      {/* ========================================================================= */}
      {activeTab === 'at-risk' && (
        <div className="space-y-6">
          {/* Guidance Banner */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground">
                Early Intervention Guidance (&lt; 85% Attendance Threshold)
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Students below 85% attendance within this timeframe are categorized as chronically absent or at-risk.
                Proactive outreach to parents, designated counseling, and individualized attendance plans are strongly recommended.
              </p>
            </div>
          </div>

          {/* Table or Empty State */}
          {!schoolReport?.at_risk_students || schoolReport.at_risk_students.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="All students currently have >= 85% attendance"
              description="No students currently meet the chronic absenteeism threshold in this date range. School attendance is in healthy standing."
            />
          ) : (
            <Card className="overflow-hidden bg-card border-border/70 space-y-0">
              {/* Filter and Count Bar */}
              <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <span>At-Risk Students</span>
                    <Badge variant="destructive" className="text-xs">
                      {schoolReport.at_risk_students.length} Flagged
                    </Badge>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Prioritized by lowest attendance percentage.
                  </p>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by student or class..."
                    value={atRiskSearch}
                    onChange={(e) => setAtRiskSearch(e.target.value)}
                    className="pl-9 h-9 w-60 text-xs"
                  />
                </div>
              </div>

              {filteredAtRiskStudents.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No students match your search filter.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Section</TableHead>
                        <TableHead className="text-right">Days Enrolled</TableHead>
                        <TableHead className="text-right">Days Missed</TableHead>
                        <TableHead className="text-right">Attendance %</TableHead>
                        <TableHead className="text-center w-36">Severity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAtRiskStudents.map((s, idx) => {
                        const fullName = [s.first_name, s.middle_name, s.last_name]
                          .filter(Boolean)
                          .join(' ');
                        const isCritical = s.attendance_percentage < 75;

                        return (
                          <TableRow key={s.student_id} className="hover:bg-muted/30">
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {idx + 1}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={cn(
                                    'w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs',
                                    isCritical
                                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                  )}
                                >
                                  {s.first_name[0]?.toUpperCase() || 'S'}
                                </div>
                                <span className="font-medium text-sm text-foreground">
                                  {fullName}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {s.class_name}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {s.section_name || 'N/A'}
                            </TableCell>
                            <TableCell className="text-right text-xs font-mono">
                              {s.total_days}
                            </TableCell>
                            <TableCell className="text-right text-xs font-mono font-medium text-rose-600 dark:text-rose-400">
                              {s.total_absent}
                            </TableCell>
                            <TableCell className="text-right text-xs font-mono font-bold">
                              {s.attendance_percentage}%
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant={isCritical ? 'destructive' : 'warning'}
                                className="text-[11px] gap-1 px-2 py-0.5"
                              >
                                <AlertTriangle className="w-3 h-3" />
                                {isCritical ? 'Critical (< 75%)' : 'Warning (75-85%)'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: Student Roster Matrix Drill-Down                                   */}
      {/* ========================================================================= */}
      {activeTab === 'roster' && (
        <div className="space-y-6">
          {/* Class & Section Selection Bar */}
          <Card className="p-4 bg-card border-border/70">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Class Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Select Class</label>
                <select
                  value={effectiveClassId}
                  onChange={(e) => {
                    setSelectedClassId(e.target.value);
                    setSelectedSectionId('');
                  }}
                  className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {classesWithDetails.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                  {classesWithDetails.length === 0 && (
                    <option value="">No classes configured</option>
                  )}
                </select>
              </div>

              {/* Section Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Section Filter</label>
                <select
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  disabled={!selectedClass}
                  className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                >
                  <option value="">All Sections</option>
                  {selectedClass?.sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      Section {sec.name} ({sec.student_count ?? 0} students)
                    </option>
                  ))}
                </select>
              </div>

              {/* Student Search */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Search Student</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search roster..."
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                    className="pl-8 h-9 text-xs"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Matrix Content */}
          {isClassReportLoading && !classReport ? (
            <div className="p-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="text-xs text-muted-foreground">Loading student roster matrix...</p>
            </div>
          ) : !selectedClass ? (
            <EmptyState
              icon={CalendarDays}
              title="No Classes Configured"
              description="Create classes and enroll students to view attendance matrix rosters."
            />
          ) : !classReport || classReport.students.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No Students or Attendance Logged"
              description={`No student attendance records were found for ${selectedClass.name} in the selected period.`}
            />
          ) : (
            <Card className="overflow-hidden bg-card border-border/70 space-y-0">
              {/* Matrix Table Header Info */}
              <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-foreground">
                    {classReport.class_name} Attendance Matrix
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {classReport.total_students} Students &bull; {classReport.total_school_days} School Days Logged &bull; Overall ADA: {classReport.overall_attendance_percentage}%
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <Check className="w-3.5 h-3.5" /> Present
                  </span>
                  <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium ml-2">
                    <X className="w-3.5 h-3.5" /> Absent
                  </span>
                </div>
              </div>

              {filteredRosterStudents.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No students match your search filter.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-12 sticky left-0 bg-card z-10">#</TableHead>
                        <TableHead className="min-w-[180px] sticky left-12 bg-card z-10">Student Name</TableHead>
                        <TableHead className="w-24">Section</TableHead>
                        <TableHead className="text-right w-20">Present</TableHead>
                        <TableHead className="text-right w-20">Absent</TableHead>
                        <TableHead className="text-right w-24">Rate %</TableHead>
                        {/* Dynamic Date Columns */}
                        {matrixDates.map((d) => (
                          <TableHead
                            key={d}
                            className="text-center min-w-[52px] px-1 text-[11px] font-mono whitespace-nowrap"
                          >
                            {d.slice(5)}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRosterStudents.map((s, idx) => {
                        const fullName = [s.first_name, s.middle_name, s.last_name]
                          .filter(Boolean)
                          .join(' ');

                        return (
                          <TableRow key={s.student_id} className="hover:bg-muted/30">
                            <TableCell className="font-mono text-xs text-muted-foreground sticky left-0 bg-card z-10">
                              {idx + 1}
                            </TableCell>
                            <TableCell className="sticky left-12 bg-card z-10">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                                  {s.first_name[0]?.toUpperCase() || 'S'}
                                </div>
                                <span className="text-xs font-medium text-foreground whitespace-nowrap">
                                  {fullName}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {s.section_name || 'N/A'}
                            </TableCell>
                            <TableCell className="text-right text-xs font-mono text-emerald-600 dark:text-emerald-400">
                              {s.total_present}
                            </TableCell>
                            <TableCell className="text-right text-xs font-mono text-rose-600 dark:text-rose-400">
                              {s.total_absent}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge
                                variant={
                                  s.attendance_percentage >= 90
                                    ? 'success'
                                    : s.attendance_percentage >= 75
                                    ? 'warning'
                                    : 'destructive'
                                }
                                className="text-[10px] font-mono"
                              >
                                {s.attendance_percentage}%
                              </Badge>
                            </TableCell>

                            {/* Date Attendance Status Cells */}
                            {matrixDates.map((dateStr) => {
                              const isPresent = s.records ? s.records[dateStr] : undefined;
                              return (
                                <TableCell
                                  key={dateStr}
                                  className="text-center p-1 border-l border-border/40"
                                >
                                  {isPresent === true ? (
                                    <div
                                      className="flex justify-center"
                                      title={`${dateStr}: Present`}
                                    >
                                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                  ) : isPresent === false ? (
                                    <div
                                      className="flex justify-center"
                                      title={`${dateStr}: Absent`}
                                    >
                                      <X className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground/30 text-xs">-</span>
                                  )}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
