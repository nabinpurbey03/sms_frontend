import React, { useState, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  Users,
  AlertTriangle,
  TrendingUp,
  BookOpen,
  Baby,
  RefreshCw,
  Edit3,
  Check,
  X,
} from 'lucide-react';

import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ResponsiveDataTable, type Column } from '@/components/common/ResponsiveDataTable';

import {
  useAttendanceSummary,
  useDailyAttendanceStatus,
  useSchoolAttendanceReport,
  useStudentAttendanceReport,
} from '@/features/attendance/hooks';
import { useAllClassesWithDetails, useMyTeacherAssignments } from '@/features/academic/hooks';
import { useParentChildren } from '@/features/members/hooks';
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
    activeTenantId,
    selectedDate,
    undefined,
    { enabled: !!activeTenantId && timeframe === 'today' }
  );

  const {
    data: attendanceSummary,
    refetch: refetchSummary,
  } = useAttendanceSummary(
    activeTenantId,
    selectedDate
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

  const { data: schoolClasses = [] } = useAllClassesWithDetails(activeTenantId);

  // Queries for Teacher
  const {
    data: teacherAssignments = [],
    isLoading: isAssignmentsLoading,
  } = useMyTeacherAssignments(activeTenantId, { enabled: !!activeTenantId && isTeacherOnly });

  // Queries for Parent
  const {
    data: parentChildren = [],
    isLoading: isChildrenLoading,
  } = useParentChildren(activeTenantId, isParent ? (user?.id ?? null) : null);

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
      const absentCount = Math.max(0, totalStudents - presentCount);
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

  // Columns for multi-day daily stats table (Admin range mode)
  const dailyColumns: Column<DailySchoolAttendanceItem>[] = [
    {
      header: 'Date',
      accessorKey: 'date',
      cell: (item) => <span className="font-mono text-xs font-semibold text-foreground">{item.date}</span>,
    },
    {
      header: 'Enrolled',
      accessorKey: 'total_students',
      cell: (item) => <span className="text-xs">{item.total_students}</span>,
    },
    {
      header: 'Present',
      cell: (item) => (
        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
          {item.present_count}
        </span>
      ),
    },
    {
      header: 'Absent',
      cell: (item) => (
        <span className="text-xs font-medium text-rose-600 dark:text-rose-400">
          {item.absent_count}
        </span>
      ),
    },
    {
      header: 'Rate',
      cell: (item) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs">{item.attendance_percentage}%</span>
          <div className="w-16 bg-secondary rounded-full h-1.5 overflow-hidden hidden sm:block">
            <div
              className="bg-primary h-1.5 rounded-full"
              style={{ width: `${Math.min(100, Math.max(0, item.attendance_percentage))}%` }}
            />
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Attendance Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border/60 shadow-2xs">
        <div>
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-primary shrink-0" />
            <span>Attendance Reporting Hub</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            {timeframe === 'today'
              ? `Daily presence status for ${selectedDate === todayStr ? "Today (" + todayStr + ")" : selectedDate}`
              : `Aggregated attendance analysis from ${startDate} to ${endDate}`}
          </p>
        </div>

        {/* Timeframe selector pills and Date Picker */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-muted p-1 text-xs">
            <button
              type="button"
              onClick={() => setTimeframe('today')}
              className={`px-3 py-1 font-medium rounded-md transition-all ${
                timeframe === 'today'
                  ? 'bg-background text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('7d')}
              className={`px-3 py-1 font-medium rounded-md transition-all ${
                timeframe === '7d'
                  ? 'bg-background text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('30d')}
              className={`px-3 py-1 font-medium rounded-md transition-all ${
                timeframe === '30d'
                  ? 'bg-background text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Last 30 Days
            </button>
          </div>

          {/* Date Picker (enabled for single-date inspection) */}
          {timeframe === 'today' && (
            <div className="flex items-center gap-1.5">
              <Input
                type="date"
                max={todayStr}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-8 text-xs w-[140px]"
              />
              {selectedDate !== todayStr && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDate(todayStr)}
                  className="h-8 text-[11px] px-2 text-primary"
                >
                  Reset
                </Button>
              )}
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title="Refresh Attendance Data"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* ==================================================== */}
      {/* 1. ADMIN & OFFICE ADMIN VIEW                         */}
      {/* ==================================================== */}
      {isAdminOrOfficeAdmin && (
        <div className="space-y-4">
          {/* Key Metric Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Overall Rate */}
            <Card className="border-border/60 rounded-xl">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Presence Rate
                  </span>
                  <div className="p-1.5 bg-purple-500/10 text-purple-600 rounded-lg">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {metrics.percentage}%
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {metrics.totalStudents > 0
                    ? `${metrics.presentCount} of ${metrics.totalStudents} students`
                    : 'No attendance records yet'}
                </p>
              </CardContent>
            </Card>

            {/* Total Students Enrolled */}
            <Card className="border-border/60 rounded-xl">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Total Students
                  </span>
                  <div className="p-1.5 bg-blue-500/10 text-blue-600 rounded-lg">
                    <Users className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {metrics.totalStudents}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Across active classes
                </p>
              </CardContent>
            </Card>

            {/* Present Count */}
            <Card className="border-border/60 rounded-xl">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    Present
                  </span>
                  <div className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded-lg">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {metrics.presentCount}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Confirmed attendees
                </p>
              </CardContent>
            </Card>

            {/* Absent Count */}
            <Card className="border-border/60 rounded-xl">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                    Absent
                  </span>
                  <div className="p-1.5 bg-rose-500/10 text-rose-600 rounded-lg">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                  {metrics.absentCount}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Marked absent
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Section Submission Progress & Checklist (In Today Mode) */}
          {timeframe === 'today' && (
            <Card className="border-border/60 rounded-xl overflow-hidden">
              <CardHeader className="p-4 sm:p-5 pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span>Daily Section Submission Status</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Submission progress for {selectedDate === todayStr ? "Today" : selectedDate}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Progress:</span>
                    <Badge variant="outline" className="font-semibold text-xs">
                      {metrics.markedSectionsCount} / {metrics.totalSectionsCount} Sections Marked
                    </Badge>
                  </div>
                </div>

                {/* Overall Submission Progress Bar */}
                <div className="w-full bg-secondary rounded-full h-2 mt-2 overflow-hidden">
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
              </CardHeader>

              <CardContent className="p-4 sm:p-5 pt-0">
                {isDailyStatusLoading ? (
                  <div className="py-6 text-center text-xs text-muted-foreground animate-pulse">
                    Loading section attendance status...
                  </div>
                ) : sectionsStatusList.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    No classes or sections configured yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2">
                    {sectionsStatusList.map((sec) => (
                      <div
                        key={sec.sectionId}
                        className={`p-3 rounded-lg border flex items-center justify-between transition-colors ${
                          sec.isMarked
                            ? 'bg-emerald-500/5 border-emerald-500/20'
                            : 'bg-amber-500/5 border-amber-500/20'
                        }`}
                      >
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {sec.className} - {sec.sectionName}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {sec.isMarked
                              ? `${sec.presentCount} present / ${sec.totalStudents} enrolled`
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
                              className="h-7 text-[10px] px-2 text-primary border-primary/30 hover:bg-primary/10"
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
          )}

          {/* Range Mode: Daily History Trend Table */}
          {timeframe !== 'today' && (
            <Card className="border-border/60 rounded-xl">
              <CardHeader className="p-4 sm:p-5 pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span>Daily School Attendance Trend</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Daily presence numbers from {startDate} to {endDate}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0">
                {isSchoolReportLoading ? (
                  <div className="py-6 text-center text-xs text-muted-foreground animate-pulse">
                    Loading trend records...
                  </div>
                ) : schoolReport?.daily_stats && schoolReport.daily_stats.length > 0 ? (
                  <ResponsiveDataTable
                    data={schoolReport.daily_stats}
                    columns={dailyColumns}
                    keyExtractor={(item) => String(item.date)}
                    renderCard={(item) => (
                      <Card className="p-3 border-border/60 space-y-1 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-mono font-bold text-foreground">{item.date}</span>
                          <Badge variant="outline" className="font-semibold text-[10px]">
                            {item.attendance_percentage}%
                          </Badge>
                        </div>
                        <div className="flex justify-between text-muted-foreground text-[11px]">
                          <span>Present: <b className="text-emerald-600">{item.present_count}</b></span>
                          <span>Absent: <b className="text-rose-600">{item.absent_count}</b></span>
                          <span>Total: {item.total_students}</span>
                        </div>
                      </Card>
                    )}
                  />
                ) : (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    No attendance records found for this timeframe.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Range Mode: Class-by-Class Attendance Summary */}
          {timeframe !== 'today' && schoolReport?.classes && schoolReport.classes.length > 0 && (
            <Card className="border-border/60 rounded-xl">
              <CardHeader className="p-4 sm:p-5 pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span>Class-by-Class Performance</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {schoolReport.classes.map((cls: ClassAttendanceSummaryItem) => (
                    <div
                      key={cls.class_id}
                      className="p-3.5 rounded-xl border border-border/60 bg-secondary/20 space-y-2"
                    >
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-bold text-foreground">{cls.class_name}</h4>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-semibold bg-primary/10 text-primary border-primary/20"
                        >
                          {cls.attendance_percentage}%
                        </Badge>
                      </div>

                      <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-primary h-1.5 rounded-full"
                          style={{ width: `${Math.min(100, Math.max(0, cls.attendance_percentage))}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>Students: {cls.total_students}</span>
                        <span>
                          <span className="text-emerald-600 font-medium">{cls.total_present} P</span> /{' '}
                          <span className="text-rose-600 font-medium">{cls.total_absent} A</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
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
                  tenantId={activeTenantId!}
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
    </div>
  );
};
