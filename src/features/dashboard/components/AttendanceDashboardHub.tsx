import React, { useState, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  Users,
  AlertTriangle,
  BookOpen,
  Baby,
  RefreshCw,
  Edit3,
  Check,
  X,
  Search,
} from 'lucide-react';

import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { StatCard } from '@/components/ui/stat-card';
import { ChartCard } from '@/components/ui/chart-card';
import { DonutChart } from '@/components/ui/charts/donut-chart';
import { TrendAreaChart } from '@/components/ui/charts/trend-area-chart';
import { ComparisonBarChart } from '@/components/ui/charts/comparison-bar-chart';
import { CalendarHeatmap } from '@/components/ui/charts/calendar-heatmap';

import {
  useAttendanceSummary,
  useDailyAttendanceStatus,
  useSchoolAttendanceReport,
  useStudentAttendanceReport,
} from '@/features/attendance/hooks';
import { AbsentStudentsDrawer } from '@/features/attendance/components/AbsentStudentsDrawer';
import { useAllClassesWithDetails, useMyTeacherAssignments } from '@/features/academic/hooks';
import { useAllMyChildren, useParentChildren } from '@/features/members/hooks';
import type { TeacherAssignment } from '@/features/academic/types';
import type { ParentChildDTO } from '@/features/members/types';
import type {
  ClassAttendanceSummaryItem,
  DailySchoolAttendanceItem,
  SectionDailyAttendanceStatus,
} from '@/features/attendance/types';

type TimeframeOption = 'today' | '7d' | '30d';

const getTodayStr = () => new Date().toISOString().split('T')[0];

const getDateDaysAgo = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
};

// ==========================================
// Parent Child Attendance Card Component
// ==========================================
interface ChildCardProps {
  tenantId: string;
  child: ParentChildDTO;
  startDate: string;
  endDate: string;
  isTodayMode: boolean;
  selectedDate: string;
}

const ParentChildAttendanceCard: React.FC<ChildCardProps> = ({
  tenantId,
  child,
  startDate,
  endDate,
  isTodayMode,
  selectedDate,
}) => {
  const { data: report, isLoading } = useStudentAttendanceReport(
    tenantId,
    child.student_id,
    { start_date: startDate, end_date: endDate }
  );

  const isPresentToday = useMemo(() => {
    if (!report?.records) return null;
    const rec = (report.records as any)[selectedDate];
    if (rec === undefined) return null;
    return Boolean(rec);
  }, [report, selectedDate]);

  return (
    <Card className="border-border/60 hover:shadow-sm transition-all rounded-xl overflow-hidden">
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Baby className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold text-foreground">
              {child.first_name} {child.middle_name ? `${child.middle_name} ` : ''}{child.last_name}
            </CardTitle>
            <CardDescription className="text-xs">
              {child.class_name ? `${child.class_name}` : 'Enrolled'}
              {child.section_name ? ` • Section ${child.section_name}` : ''}
              {child.tenant_name ? ` • ${child.tenant_name}` : ''}
              {child.relationship_type ? ` • ${child.relationship_type}` : ''}
            </CardDescription>
          </div>
        </div>

        {isTodayMode && isPresentToday !== null && (
          <Badge
            variant="outline"
            className={
              isPresentToday
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1 text-xs'
                : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 gap-1 text-xs'
            }
          >
            {isPresentToday ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            {isPresentToday ? 'Present Today' : 'Absent Today'}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="p-4 pt-2">
        {isLoading ? (
          <div className="py-4 text-xs text-muted-foreground animate-pulse">Loading child attendance...</div>
        ) : report ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center pt-2">
              <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground">Rate</p>
                <p className="text-base font-bold text-foreground">
                  {report.attendance_percentage ? `${report.attendance_percentage}%` : '0%'}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                <p className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400">Present</p>
                <p className="text-base font-bold text-emerald-700 dark:text-emerald-300">
                  {report.total_present ?? report.present_count ?? 0}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-rose-500/5 border border-rose-500/20">
                <p className="text-[10px] uppercase font-semibold text-rose-600 dark:text-rose-400">Absent</p>
                <p className="text-base font-bold text-rose-700 dark:text-rose-300">
                  {report.total_absent ?? report.absent_count ?? 0}
                </p>
              </div>
            </div>

            {/* Attendance Progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Attendance Progress</span>
                <span className="font-semibold text-foreground">{report.attendance_percentage ?? 0}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, report.attendance_percentage ?? 0))}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground py-2">No attendance records logged for this period.</p>
        )}
      </CardContent>
    </Card>
  );
};

// ==========================================
// Main Attendance Dashboard Hub Component
// ==========================================
export const AttendanceDashboardHub: React.FC = () => {
  const { user, activeRole, activeTenantId } = useAuth();
  const { isSuperAdmin, isTeacher, isParent } = usePermission();

  const isAdminOrOfficeAdmin = isSuperAdmin || activeRole === 'ADMIN' || activeRole === 'OFFICE_ADMIN';
  const isTeacherOnly = isTeacher && !isAdminOrOfficeAdmin;

  const todayStr = useMemo(() => getTodayStr(), []);
  const [timeframe, setTimeframe] = useState<TimeframeOption>('today');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [sectionStatusFilter, setSectionStatusFilter] = useState<'all' | 'pending' | 'recorded'>('all');
  const [sectionSearchQuery, setSectionSearchQuery] = useState('');
  const [absentDrawerOpen, setAbsentDrawerOpen] = useState(false);

  const { startDate, endDate, isTodayMode } = useMemo(() => {
    if (timeframe === '7d') {
      return { startDate: getDateDaysAgo(7), endDate: todayStr, isTodayMode: false };
    }
    if (timeframe === '30d') {
      return { startDate: getDateDaysAgo(30), endDate: todayStr, isTodayMode: false };
    }
    return { startDate: selectedDate, endDate: selectedDate, isTodayMode: selectedDate === todayStr };
  }, [timeframe, selectedDate, todayStr]);

  // Queries for Admin / Staff
  const {
    data: dailyStatus,
    isLoading: isDailyStatusLoading,
    refetch: refetchDailyStatus,
  } = useDailyAttendanceStatus(
    !isParent ? activeTenantId : null,
    selectedDate,
    undefined,
    { enabled: !!activeTenantId && timeframe === 'today' && !isParent }
  );

  const {
    data: attendanceSummary,
    refetch: refetchSummary,
  } = useAttendanceSummary(
    !isParent ? activeTenantId : null,
    selectedDate,
    { enabled: !!activeTenantId && !isParent }
  );

  const {
    data: schoolReport,
    isLoading: isSchoolReportLoading,
    refetch: refetchSchoolReport,
  } = useSchoolAttendanceReport(
    activeTenantId,
    startDate,
    endDate,
    { enabled: !!activeTenantId && isAdminOrOfficeAdmin && timeframe !== 'today' }
  );

  const { data: schoolClasses = [] } = useAllClassesWithDetails(!isParent ? activeTenantId : null);

  // Queries for Teacher
  const {
    data: teacherAssignments = [],
    isLoading: isAssignmentsLoading,
  } = useMyTeacherAssignments(activeTenantId, { enabled: !!activeTenantId && isTeacherOnly });

  // Queries for Parent: fetch all children across schools if parent, fallback to tenant
  const { data: allParentChildren = [], isLoading: isAllChildrenLoading } = useAllMyChildren(isParent);
  const {
    data: tenantParentChildren = [],
    isLoading: isTenantChildrenLoading,
  } = useParentChildren(activeTenantId, isParent ? (user?.id ?? null) : null);

  const parentChildren: ParentChildDTO[] = useMemo(() => {
    if (allParentChildren && allParentChildren.length > 0) return allParentChildren;
    return tenantParentChildren;
  }, [allParentChildren, tenantParentChildren]);

  const isChildrenLoading = isAllChildrenLoading && isTenantChildrenLoading;

  // Map section details for Admin checklist
  const sectionsStatusList = useMemo(() => {
    if (!schoolClasses.length) return [];
    const markedIds = new Set(dailyStatus?.marked_section_ids || []);
    const statusMap = new Map<string, SectionDailyAttendanceStatus>();
    (dailyStatus?.sections || []).forEach((sec) => statusMap.set(sec.section_id, sec));

    const result: Array<{
      classId: string;
      className: string;
      sectionId: string;
      sectionName: string;
      isMarked: boolean;
      totalStudents: number;
      presentCount: number;
      absentCount: number;
      isLocked: boolean;
    }> = [];

    schoolClasses.forEach((cls) => {
      (cls.sections || []).forEach((sec) => {
        const status = statusMap.get(sec.id);
        const isMarked = markedIds.has(sec.id);
        result.push({
          classId: cls.id,
          className: cls.name,
          sectionId: sec.id,
          sectionName: sec.name,
          isMarked,
          totalStudents: status ? status.total_students : (sec.student_count || 0),
          presentCount: status ? status.present_count : 0,
          absentCount: status ? status.absent_count : 0,
          isLocked: status ? status.is_locked : false,
        });
      });
    });

    return result;
  }, [schoolClasses, dailyStatus]);

  const pendingSectionsCount = useMemo(() => {
    return sectionsStatusList.filter((s) => !s.isMarked).length;
  }, [sectionsStatusList]);

  const recordedSectionsCount = useMemo(() => {
    return sectionsStatusList.filter((s) => s.isMarked).length;
  }, [sectionsStatusList]);

  const filteredSectionsList = useMemo(() => {
    return sectionsStatusList.filter((sec) => {
      const matchesFilter =
        sectionStatusFilter === 'all'
          ? true
          : sectionStatusFilter === 'pending'
          ? !sec.isMarked
          : sec.isMarked;
      const q = sectionSearchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        sec.className.toLowerCase().includes(q) ||
        sec.sectionName.toLowerCase().includes(q) ||
        `${sec.className} ${sec.sectionName}`.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [sectionsStatusList, sectionStatusFilter, sectionSearchQuery]);

  // Handle manual refresh
  const handleRefresh = () => {
    if (timeframe === 'today') {
      refetchDailyStatus();
      refetchSummary();
    } else {
      refetchSchoolReport();
    }
  };

  // Compute school-wide KPI metrics for Today or Range
  const metrics = useMemo(() => {
    if (timeframe === 'today') {
      const totalStudents = attendanceSummary?.school?.total_students || 0;
      const presentCount = attendanceSummary?.school?.total_present || 0;
      const markedAbsentCount = sectionsStatusList
        .filter((s) => s.isMarked)
        .reduce((sum, s) => sum + s.absentCount, 0);
      const absentCount =
        dailyStatus?.marked_section_ids && dailyStatus.marked_section_ids.length > 0
          ? markedAbsentCount
          : Math.max(0, totalStudents - presentCount);
      const percentage = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 1000) / 10 : 0;
      const markedSectionsCount = dailyStatus?.marked_section_ids?.length || 0;
      const totalSectionsCount = sectionsStatusList.length;

      return {
        totalStudents,
        presentCount,
        absentCount,
        percentage,
        markedSectionsCount,
        totalSectionsCount,
      };
    } else {
      const totalStudents = schoolReport?.total_students || 0;
      const presentCount = schoolReport?.total_present || 0;
      const absentCount = schoolReport?.total_absent || 0;
      const percentage = schoolReport?.overall_attendance_percentage || 0;

      return {
        totalStudents,
        presentCount,
        absentCount,
        percentage,
        markedSectionsCount: 0,
        totalSectionsCount: 0,
      };
    }
  }, [timeframe, attendanceSummary, dailyStatus, schoolReport, sectionsStatusList]);

  const isRange = timeframe !== 'today';
  const selectedPeriod = timeframe;
  const presenceRate = metrics.percentage;
  const totalEnrolled = metrics.totalStudents;
  const totalPresent = metrics.presentCount;
  const totalAbsent = metrics.absentCount;
  const dailyRecords = schoolReport?.daily_stats || [];
  const classBreakdown = schoolReport?.classes || [];

  return (
    <div className="space-y-4">
      {/* Attendance Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-5 rounded-xl border border-border/60 shadow-sm">
        <div>
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-primary shrink-0" />
            <span>Attendance Reporting Hub</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {timeframe === 'today'
              ? `Daily presence status for ${selectedDate === todayStr ? "Today (" + todayStr + ")" : selectedDate}`
              : `Aggregated attendance analysis from ${startDate} to ${endDate}`}
          </p>
        </div>

        {/* Timeframe selector pills and Date Picker */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg bg-muted p-1 text-xs">
            <button
              type="button"
              onClick={() => setTimeframe('today')}
              className={`px-3 py-1.5 font-medium rounded-md transition-all ${
                timeframe === 'today'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('7d')}
              className={`px-3 py-1.5 font-medium rounded-md transition-all ${
                timeframe === '7d'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('30d')}
              className={`px-3 py-1.5 font-medium rounded-md transition-all ${
                timeframe === '30d'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Last 30 Days
            </button>
          </div>

          {/* Date Picker (enabled for single-date inspection) */}
          {timeframe === 'today' && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                max={todayStr}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-9 text-xs w-[140px]"
              />
              {selectedDate !== todayStr && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDate(todayStr)}
                  className="h-9 text-xs px-3 text-primary"
                >
                  Reset
                </Button>
              )}
            </div>
          )}

          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            title="Refresh Attendance Data"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ==================================================== */}
      {/* 1. ADMIN & OFFICE ADMIN VIEW                         */}
      {/* ==================================================== */}
      {isAdminOrOfficeAdmin && (
        <div className="space-y-4 sm:space-y-6">
          {/* In Range mode: Key Metric Stats Cards across 4 columns */}
          {isRange && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <StatCard
                title="Presence Rate"
                value={`${presenceRate != null ? presenceRate.toFixed(1) : '—'}%`}
                icon={CalendarCheck}
                description={`${selectedPeriod} average`}
                trend={
                  presenceRate != null
                    ? {
                        value: presenceRate >= 80 ? 2.3 : -1.8,
                        label: 'vs previous period',
                      }
                    : undefined
                }
              />
              <StatCard
                title="Total Students"
                value={totalEnrolled}
                icon={Users}
                description="Enrolled students"
              />
              <StatCard
                title="Present"
                value={totalPresent}
                icon={CheckCircle2}
                description={`${presenceRate != null ? presenceRate.toFixed(1) : '—'}% of enrolled`}
              />
              <StatCard
                title="Absent"
                value={totalAbsent}
                icon={AlertTriangle}
                description={`${totalAbsent > 0 ? ((totalAbsent / Math.max(totalEnrolled, 1)) * 100).toFixed(1) : '0'}% of enrolled • Click to inspect →`}
                className="cursor-pointer hover:border-rose-500/50 hover:shadow-sm transition-all"
                onClick={() => setAbsentDrawerOpen(true)}
              />
            </div>
          )}

          {/* Today mode: 50% Donut on left, 50% (2x2 StatCards) on right, followed by 100% Section Status */}
          {!isRange && (
            <div className="space-y-4 sm:space-y-6">
              {/* Top Row: 50% Left (Attendance Breakdown) + 50% Right (2 Horizontal Divisions) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-stretch">
                {/* Left 50%: Attendance Breakdown Donut Chart */}
                <Card className="border-border/60 rounded-xl overflow-hidden shadow-2xs flex flex-col justify-between">
                  <CardHeader className="p-5 pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold">Attendance Breakdown</CardTitle>
                      <Badge variant="outline" className="font-mono text-[10px] px-2 py-0.5">
                        {selectedDate === todayStr ? 'Today' : selectedDate}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      Student distribution across present, absent, and unmarked
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-5 pt-0 flex-1 flex flex-col justify-between space-y-4">
                    <div className="flex-1 min-h-[210px] flex items-center justify-center py-1">
                      <DonutChart
                        data={[
                          { name: 'Present', value: totalPresent, color: '#10b981' },
                          { name: 'Absent', value: totalAbsent, color: '#f43f5e' },
                          {
                            name: 'Unmarked',
                            value: Math.max(0, totalEnrolled - totalPresent - totalAbsent),
                            color: '#94a3b8',
                          },
                        ]}
                        centerValue={`${presenceRate != null ? presenceRate.toFixed(0) : '—'}%`}
                        centerLabel="Attendance"
                      />
                    </div>

                    {/* Compact Legend & Totals Footer */}
                    <div className="flex items-center justify-around border-t border-border/60 pt-3 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="text-muted-foreground">Present:</span>
                        <span className="font-bold text-foreground font-mono">{totalPresent}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAbsentDrawerOpen(true)}
                        className="flex items-center gap-1.5 px-2 py-1 -my-1 rounded-md hover:bg-rose-500/10 transition-colors cursor-pointer group"
                        title="Click to view absent students roster"
                      >
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shrink-0 group-hover:scale-110 transition-transform" />
                        <span className="text-muted-foreground group-hover:text-foreground">Absent:</span>
                        <span className="font-bold text-foreground font-mono">{totalAbsent}</span>
                      </button>
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-slate-400 shrink-0" />
                        <span className="text-muted-foreground">Unmarked:</span>
                        <span className="font-bold text-foreground font-mono">
                          {Math.max(0, totalEnrolled - totalPresent - totalAbsent)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Right 50%: Two Horizontal Divisions of Stat Cards */}
                <div className="flex flex-col gap-4 sm:gap-6 justify-between">
                  {/* Upper Division: Presence Rate & Total Students */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                    <StatCard
                      title="Presence Rate"
                      value={`${presenceRate != null ? presenceRate.toFixed(1) : '—'}%`}
                      icon={CalendarCheck}
                      description="Today's attendance rate"
                      trend={
                        presenceRate != null
                          ? {
                              value: presenceRate >= 80 ? 2.3 : -1.8,
                              label: 'vs yesterday',
                            }
                          : undefined
                      }
                    />
                    <StatCard
                      title="Total Students"
                      value={totalEnrolled}
                      icon={Users}
                      description="Enrolled in school"
                    />
                  </div>

                  {/* Lower Division: Present & Absent */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                    <StatCard
                      title="Present"
                      value={totalPresent}
                      icon={CheckCircle2}
                      description={`${presenceRate != null ? presenceRate.toFixed(1) : '—'}% of enrolled`}
                    />
                    <StatCard
                      title="Absent"
                      value={totalAbsent}
                      icon={AlertTriangle}
                      description={`${totalAbsent > 0 ? ((totalAbsent / Math.max(totalEnrolled, 1)) * 100).toFixed(1) : '0'}% of enrolled • Click to view roster →`}
                      className="cursor-pointer hover:border-rose-500/50 hover:shadow-sm transition-all"
                      onClick={() => setAbsentDrawerOpen(true)}
                    />
                  </div>
                </div>
              </div>

              {/* Bottom (100% Full Width): Daily Section Submission Status */}
              <Card className="border-border/60 rounded-xl overflow-hidden shadow-2xs">
                <CardHeader className="p-5 pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <span>Daily Section Submission Status</span>
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        Submission progress and roll call status for {selectedDate === todayStr ? 'Today' : selectedDate}
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground font-medium">Progress:</span>
                      <Badge
                        variant="outline"
                        className={`font-semibold text-xs px-2.5 py-0.5 ${
                          pendingSectionsCount === 0 && metrics.totalSectionsCount > 0
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                            : 'bg-primary/10 text-primary border-primary/20'
                        }`}
                      >
                        {metrics.markedSectionsCount} / {metrics.totalSectionsCount} Sections Recorded
                      </Badge>
                    </div>
                  </div>

                  {/* Overall Submission Progress Bar */}
                  <div className="w-full bg-secondary rounded-full h-2 mt-3 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${
                          metrics.totalSectionsCount > 0
                            ? Math.min(100, Math.round((metrics.markedSectionsCount / metrics.totalSectionsCount) * 100))
                            : 0
                        }%`,
                      }}
                    />
                  </div>

                  {/* Filter Tabs and Search Toolbar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-border/50 mt-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setSectionStatusFilter('all')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                          sectionStatusFilter === 'all'
                            ? 'bg-primary text-primary-foreground shadow-2xs'
                            : 'bg-muted/70 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        All ({sectionsStatusList.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSectionStatusFilter('pending')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                          sectionStatusFilter === 'pending'
                            ? 'bg-amber-500 text-white shadow-2xs'
                            : 'bg-muted/70 text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400'
                        }`}
                      >
                        <span>Pending</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                            sectionStatusFilter === 'pending'
                              ? 'bg-amber-600 text-white'
                              : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {pendingSectionsCount}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSectionStatusFilter('recorded')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                          sectionStatusFilter === 'recorded'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-muted/70 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400'
                        }`}
                      >
                        <span>Recorded</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                            sectionStatusFilter === 'recorded'
                              ? 'bg-emerald-700 text-white'
                              : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          {recordedSectionsCount}
                        </span>
                      </button>
                    </div>

                    <div className="relative w-full sm:w-60">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        value={sectionSearchQuery}
                        onChange={(e) => setSectionSearchQuery(e.target.value)}
                        placeholder="Search class or section..."
                        className="h-8 pl-8 pr-7 text-xs bg-background"
                      />
                      {sectionSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setSectionSearchQuery('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-5 pt-1">
                  {isDailyStatusLoading ? (
                    <div className="py-12 text-center text-xs text-muted-foreground animate-pulse">
                      Loading section attendance status...
                    </div>
                  ) : sectionsStatusList.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-8 text-center">
                      No classes or sections configured yet.
                    </p>
                  ) : filteredSectionsList.length === 0 ? (
                    <div className="py-10 text-center space-y-2">
                      <p className="text-xs text-muted-foreground">
                        No sections match the current filter criteria.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSectionStatusFilter('all');
                          setSectionSearchQuery('');
                        }}
                        className="text-xs h-7"
                      >
                        Reset Filters
                      </Button>
                    </div>
                  ) : (
                    /* Responsive 100% full-width grid: 1 col on mobile, 2 on sm, 3 on md, 4 on lg/xl */
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-1">
                      {filteredSectionsList.map((sec) => (
                        <div
                          key={sec.sectionId}
                          className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
                            sec.isMarked
                              ? 'bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10'
                              : 'bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10'
                          }`}
                        >
                          <div className="space-y-1 min-w-0 pr-2">
                            <p className="text-xs font-bold text-foreground truncate">
                              {sec.className} - {sec.sectionName}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {sec.isMarked
                                ? `${sec.presentCount} present • ${sec.absentCount} absent`
                                : `${sec.totalStudents} enrolled • Pending`}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {sec.isMarked ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-2 py-0.5 font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1"
                              >
                                <Check className="h-3 w-3" />
                                Recorded
                              </Badge>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-[11px] px-2.5 font-semibold text-primary border-primary/30 hover:bg-primary/10"
                                asChild
                              >
                                <Link
                                  to="/attendance/mark"
                                  search={{ classId: sec.classId, sectionId: sec.sectionId }}
                                >
                                  Mark
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Range mode: Trend chart + class comparison + heatmap */}
          {isRange && (
            <div className="space-y-4 sm:space-y-6 mt-4">
              <ChartCard
                title="Daily Attendance Trend"
                description={`Attendance rate over the ${selectedPeriod}`}
                isLoading={isSchoolReportLoading}
                isEmpty={!dailyRecords || dailyRecords.length === 0}
              >
                <TrendAreaChart
                  data={dailyRecords.map((record: DailySchoolAttendanceItem) => ({
                    date: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(record.date)),
                    rate:
                      record.total_students > 0
                        ? Number(((record.present_count / record.total_students) * 100).toFixed(1))
                        : (record.attendance_percentage ?? 0),
                  }))}
                  dataKey="rate"
                  xAxisKey="date"
                  color="#10b981"
                  valueFormatter={(v: number) => `${v.toFixed(1)}%`}
                  height={250}
                />
              </ChartCard>

              {/* Two-column: Class comparison + Calendar heatmap */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Class comparison bar chart — replaces the class-by-class cards */}
                <ChartCard
                  title="Class Attendance Comparison"
                  description="Attendance rate by class"
                  isLoading={isSchoolReportLoading}
                  isEmpty={!classBreakdown || classBreakdown.length === 0}
                  className={selectedPeriod !== '30d' ? 'lg:col-span-2' : undefined}
                >
                  <ComparisonBarChart
                    data={classBreakdown.map((cls: ClassAttendanceSummaryItem) => ({
                      name: cls.class_name,
                      rate:
                        cls.total_students > 0
                          ? Number(((cls.total_present / cls.total_students) * 100).toFixed(1))
                          : (cls.attendance_percentage ?? 0),
                    }))}
                    bars={[{ dataKey: 'rate', color: '#10b981', label: 'Attendance %' }]}
                    categoryKey="name"
                    layout="vertical"
                    valueFormatter={(v: number) => `${v}%`}
                    barColorFn={(entry) => {
                      const rate = entry.rate as number;
                      if (rate >= 80) return '#10b981';
                      if (rate >= 60) return '#3b82f6';
                      return '#f59e0b';
                    }}
                    height={Math.max(200, classBreakdown.length * 40)}
                  />
                </ChartCard>

                {/* Calendar heatmap — only in 30-day mode */}
                {selectedPeriod === '30d' && (
                  <ChartCard
                    title="Attendance Pattern"
                    description="Daily attendance intensity (last 30 days)"
                    isLoading={isSchoolReportLoading}
                    isEmpty={!dailyRecords || dailyRecords.length === 0}
                  >
                    <CalendarHeatmap
                      data={dailyRecords.map((record: DailySchoolAttendanceItem) => ({
                        date: record.date,
                        value:
                          record.total_students > 0
                            ? (record.present_count / record.total_students) * 100
                            : (record.attendance_percentage ?? 0),
                      }))}
                      maxValue={100}
                    />
                  </ChartCard>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* 2. TEACHER-SPECIFIC VIEW                             */}
      {/* ==================================================== */}
      {isTeacherOnly && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <span>My Assigned Classes & Duty Sections</span>
            </h3>
            <span className="text-xs text-muted-foreground">
              {teacherAssignments.length} Assignment(s)
            </span>
          </div>

          {isAssignmentsLoading ? (
            <div className="py-6 text-center text-xs text-muted-foreground animate-pulse">
              Loading your assigned classes...
            </div>
          ) : teacherAssignments.length === 0 ? (
            <Card className="border-dashed p-6 text-center bg-card/60">
              <p className="text-xs text-muted-foreground">
                You are not currently assigned to any classes or sections. Contact your school administrator to configure duties.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {teacherAssignments.map((assignment: TeacherAssignment) => {
                const isMarked = Boolean(
                  assignment.section_id && dailyStatus?.marked_section_ids?.includes(assignment.section_id)
                );
                const sectionStatus = assignment.section_id
                  ? dailyStatus?.sections?.find((s) => s.section_id === assignment.section_id)
                  : undefined;

                return (
                  <Card
                    key={assignment.id}
                    className="border-border/60 hover:shadow-xs transition-all rounded-xl p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-foreground">
                          {assignment.class_name || 'Class'}
                          {assignment.section_name ? ` - Section ${assignment.section_name}` : ''}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-1">
                          {assignment.is_class_teacher ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-2 py-0.2 bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30 font-semibold"
                            >
                              Class Teacher
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-2 py-0.2 bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 font-medium"
                            >
                              Subject: {assignment.subject_name || 'Subject Teacher'}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {assignment.section_id && (
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-2 py-0.5 font-semibold ${
                            isMarked
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {isMarked ? 'Marked' : 'Pending'}
                        </Badge>
                      )}
                    </div>

                    {/* Section Stats if marked */}
                    {sectionStatus && (
                      <div className="p-2 rounded-lg bg-secondary/30 text-xs flex justify-between items-center text-muted-foreground">
                        <span>Enrolled: <b className="text-foreground">{sectionStatus.total_students}</b></span>
                        <span>Present: <b className="text-emerald-600">{sectionStatus.present_count}</b></span>
                        <span>Absent: <b className="text-rose-600">{sectionStatus.absent_count}</b></span>
                      </div>
                    )}

                    {/* Action Button: Only Class Teachers can mark attendance */}
                    {assignment.is_class_teacher && assignment.section_id && (
                      <div className="pt-1 border-t border-border/40">
                        {isMarked ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs font-semibold h-8 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 gap-1.5"
                            asChild
                          >
                            <Link
                              to="/attendance/mark"
                              search={{ classId: assignment.class_id, sectionId: assignment.section_id }}
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              Update Today's Attendance
                            </Link>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="w-full text-xs font-semibold h-8 bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
                            asChild
                          >
                            <Link
                              to="/attendance/mark"
                              search={{ classId: assignment.class_id, sectionId: assignment.section_id }}
                            >
                              <CalendarCheck className="h-3.5 w-3.5" />
                              Mark Today's Attendance
                            </Link>
                          </Button>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* 3. PARENT-SPECIFIC VIEW                              */}
      {/* ==================================================== */}
      {isParent && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Baby className="h-4 w-4 text-purple-600" />
              <span>Children Attendance Record</span>
            </h3>
            <span className="text-xs text-muted-foreground">
              {parentChildren.length} Linked Child(ren)
            </span>
          </div>

          {isChildrenLoading ? (
            <div className="py-6 text-center text-xs text-muted-foreground animate-pulse">
              Loading children profile details...
            </div>
          ) : parentChildren.length === 0 ? (
            <Card className="border-dashed p-6 text-center bg-card/60">
              <p className="text-xs text-muted-foreground">
                No children linked to your parent account yet. Contact school administration to link your student.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {parentChildren.map((child: ParentChildDTO) => (
                <ParentChildAttendanceCard
                  key={child.student_id}
                  tenantId={child.tenant_id || activeTenantId!}
                  child={child}
                  startDate={startDate}
                  endDate={endDate}
                  isTodayMode={isTodayMode}
                  selectedDate={selectedDate}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Absent Students Roster Drawer */}
      <AbsentStudentsDrawer
        open={absentDrawerOpen}
        onOpenChange={setAbsentDrawerOpen}
        tenantId={activeTenantId}
        initialDate={selectedDate}
      />
    </div>
  );
};
