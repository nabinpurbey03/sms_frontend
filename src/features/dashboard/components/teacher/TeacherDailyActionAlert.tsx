import React, { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, CalendarCheck, CheckCircle2, Edit3, Sparkles } from 'lucide-react';
import { useDailyAttendanceStatus } from '@/features/attendance/hooks';
import { useAllClassesWithDetails } from '@/features/academic/hooks';
import {
  getLocalTodayDate,
  isSectionAttendanceMarked,
  resolveDutySectionId,
} from '@/features/attendance/utils/attendanceStatus';
import type { TeacherAssignmentResponse } from '@/features/academic/types';

export interface TeacherDailyActionAlertProps {
  tenantId: string;
  primaryClassTeacherDuty: TeacherAssignmentResponse | null;
  subjectTeacherAssignments: TeacherAssignmentResponse[];
  classTeacherAssignments?: TeacherAssignmentResponse[];
}

export const TeacherDailyActionAlert: React.FC<TeacherDailyActionAlertProps> = ({
  tenantId,
  primaryClassTeacherDuty,
  subjectTeacherAssignments,
  classTeacherAssignments = [],
}) => {
  const todayStr = useMemo(() => getLocalTodayDate(), []);
  const { data: dailyAttendanceStatus } = useDailyAttendanceStatus(
    tenantId || null,
    todayStr
  );
  const { data: classes = [] } = useAllClassesWithDetails(tenantId || null);

  const effectiveClassTeacherDuties = useMemo(() => {
    if (classTeacherAssignments.length > 0) return classTeacherAssignments;
    return primaryClassTeacherDuty ? [primaryClassTeacherDuty] : [];
  }, [classTeacherAssignments, primaryClassTeacherDuty]);

  if (effectiveClassTeacherDuties.length > 0) {
    // Check marked status for each duty
    const dutiesWithStatus = effectiveClassTeacherDuties.map((duty) => {
      const sectionId = resolveDutySectionId(duty, classes);
      const isMarked = isSectionAttendanceMarked(sectionId, dailyAttendanceStatus, null, todayStr);
      const sectionStatus = dailyAttendanceStatus?.sections?.find((s) => s.section_id === sectionId);
      return {
        duty,
        sectionId,
        isMarked,
        sectionStatus,
      };
    });

    const pendingDuties = dutiesWithStatus.filter((d) => !d.isMarked);
    const completedDuties = dutiesWithStatus.filter((d) => d.isMarked);
    const isAllMarked = pendingDuties.length === 0;

    if (!isAllMarked) {
      const firstPending = pendingDuties[0];
      return (
        <div className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/5 p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0 animate-pulse">
                <Clock className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5"
                  >
                    Action Required
                  </Badge>
                  <h3 className="text-sm sm:text-base font-semibold text-foreground">
                    Daily Attendance Pending: {firstPending.duty.class_name} - Section{' '}
                    {firstPending.duty.section_name || 'A'}
                    {pendingDuties.length > 1 && ` (+${pendingDuties.length - 1} more)`}
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Today's presence records have not been marked yet. Take morning attendance for your students.
                </p>
              </div>
            </div>
            <div className="self-end sm:self-center shrink-0">
              <Button
                asChild
                className="font-semibold text-xs shadow-xs"
              >
                <Link
                  to="/attendance/mark"
                  search={
                    {
                      classId: firstPending.duty.class_id,
                      sectionId: firstPending.sectionId || firstPending.duty.section_id,
                    } as any
                  }
                >
                  <CalendarCheck className="w-4 h-4 mr-1.5" /> Mark Today's Attendance
                </Link>
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // All assigned duties marked
    const totalPresent = completedDuties.reduce((acc, d) => acc + (d.sectionStatus?.present_count ?? 0), 0);
    const totalAbsent = completedDuties.reduce((acc, d) => acc + (d.sectionStatus?.absent_count ?? 0), 0);
    const totalStudents = totalPresent + totalAbsent;
    const rate = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 100;
    const primaryDuty = effectiveClassTeacherDuties[0];

    return (
      <div className="relative overflow-hidden rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 sm:mt-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5"
                >
                  Completed
                </Badge>
                <h3 className="text-sm sm:text-base font-semibold text-foreground">
                  Today's Attendance Completed ({totalPresent} Present, {totalAbsent} Absent • {rate}% Presence)
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Attendance for {effectiveClassTeacherDuties.map((d) => `${d.class_name} ${d.section_name || 'A'}`).join(', ')} is recorded and up to date for today.
              </p>
            </div>
          </div>
          <div className="self-end sm:self-center shrink-0">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="text-xs border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
            >
              <Link
                to="/attendance/mark"
                search={
                  {
                    classId: primaryDuty.class_id,
                    sectionId: primaryDuty.section_id,
                  } as any
                }
              >
                <Edit3 className="w-3.5 h-3.5 mr-1" /> Update Records
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Teacher is only a subject teacher (no primary class teacher duty)
  return (
    <div className="relative overflow-hidden rounded-xl border border-sky-500/20 bg-sky-500/10 p-4 sm:p-5 shadow-xs">
      <div className="flex items-start gap-3.5">
        <div className="p-2.5 rounded-lg bg-sky-500/20 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm sm:text-base font-semibold text-foreground">
            Subject Teaching Overview
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            You are assigned to teach {subjectTeacherAssignments.length} subjects across classes. Review your exam score entry and curriculum syllabus below.
          </p>
        </div>
      </div>
    </div>
  );
};
