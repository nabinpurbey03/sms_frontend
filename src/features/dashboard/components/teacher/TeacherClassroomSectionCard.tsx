import React, { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Users,
  ArrowRight,
  Phone,
  UserPlus,
  CheckCircle2,
  Sparkles,
  CalendarCheck,
  Clock,
  UserX,
  AlertCircle,
  Copy,
  Check,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

import type { TeacherAssignmentResponse, AcademicStudent } from '@/features/academic/types';
import type { ParentMappingDTO } from '@/features/members/types';
import { useClassWithDetails } from '@/features/academic/hooks';
import { useParentMappings } from '@/features/members/hooks';
import { useSectionAttendanceReport, useDailyAttendanceStatus } from '@/features/attendance/hooks';

export interface TeacherClassroomSectionCardProps {
  tenantId: string;
  duty: TeacherAssignmentResponse;
  onLinkParentClick: (student: AcademicStudent) => void;
}

export const TeacherClassroomSectionCard: React.FC<TeacherClassroomSectionCardProps> = ({
  tenantId,
  duty,
  onLinkParentClick,
}) => {
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // 1. Queries
  const { data: cls } = useClassWithDetails(tenantId || null, duty.class_id);
  const { data: classParentMappings = [] } = useParentMappings(tenantId || null, {
    class_id: duty.class_id,
  });
  const { data: sectionReport } = useSectionAttendanceReport(
    tenantId || null,
    duty.class_id,
    duty.section_id || '',
    todayStr,
    todayStr
  );
  const { data: dailyAttendanceStatus } = useDailyAttendanceStatus(
    tenantId || null,
    todayStr
  );

  // 2. Computations
  // Filter class students for this specific section
  const sectionStudents = useMemo(() => {
    if (!cls?.students) return [];
    return cls.students.filter(
      (s) => s.section_id === duty.section_id || !duty.section_id
    );
  }, [cls?.students, duty.section_id]);

  // Build parent lookup by student ID
  const parentByStudentId = useMemo(() => {
    const map = new Map<string, ParentMappingDTO>();
    for (const m of classParentMappings) {
      if (!map.has(m.student_id) || m.is_primary_contact) {
        map.set(m.student_id, m);
      }
    }
    return map;
  }, [classParentMappings]);

  // Check if attendance is marked for this section today
  const isMarked = useMemo(() => {
    if (!duty.section_id) return false;
    const inMarkedIds = dailyAttendanceStatus?.marked_section_ids?.includes(duty.section_id);
    const secStatus = dailyAttendanceStatus?.sections?.find(
      (s) => s.section_id === duty.section_id
    );
    return Boolean(inMarkedIds || secStatus?.is_marked);
  }, [dailyAttendanceStatus, duty.section_id]);

  // Identify absent students
  const absentStudents = useMemo(() => {
    if (!isMarked || !sectionReport?.students) return [];

    const sectionStudentsMap = new Map(sectionStudents.map((s) => [s.id, s]));
    const absents: AcademicStudent[] = [];

    for (const record of sectionReport.students) {
      const isAbsent =
        record.records?.[todayStr] === false ||
        record.present_count === 0 ||
        (record.absent_count !== undefined && record.absent_count > 0);

      if (isAbsent) {
        const student = sectionStudentsMap.get(record.student_id);
        if (student) {
          absents.push(student);
        }
      }
    }
    return absents;
  }, [isMarked, sectionReport?.students, sectionStudents, todayStr]);

  // Identify unlinked students
  const unlinkedStudents = useMemo(() => {
    return sectionStudents.filter((s) => !parentByStudentId.has(s.id));
  }, [sectionStudents, parentByStudentId]);

  const connectedCount = sectionStudents.length - unlinkedStudents.length;
  const connectionPercentage =
    sectionStudents.length > 0
      ? Math.round((connectedCount / sectionStudents.length) * 100)
      : 100;

  const handleCopyPhone = (phone: string, studentId: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhoneId(studentId);
    toast.success('Phone Number Copied', {
      description: `Copied "${phone}" to clipboard.`,
    });
    setTimeout(() => setCopiedPhoneId(null), 2000);
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = (firstName || '').trim()[0] || '';
    const last = (lastName || '').trim()[0] || '';
    return (first + last).toUpperCase() || 'ST';
  };

  const getFullName = (s: AcademicStudent) => {
    return [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(' ');
  };

  const sectionLabel = duty.section_name || 'A';

  return (
    <Card className="border border-border/70 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 border-b border-border/60 bg-muted/20">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              {duty.class_name} — Section {sectionLabel}
            </h2>
            <Badge
              variant="secondary"
              className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 text-xs font-semibold px-2.5 py-0.5"
            >
              Class Teacher
            </Badge>
            <Badge
              variant="outline"
              className="bg-background/80 text-muted-foreground border-border text-xs font-medium px-2.5 py-0.5"
            >
              <Users className="w-3 h-3 mr-1 text-muted-foreground" />
              {sectionStudents.length} / 20 Pupils
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Dedicated section hub: track morning roll call, monitor absentee alerts, and manage family links.
          </p>
        </div>

        <div className="shrink-0">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="text-xs font-medium gap-1.5 hover:bg-muted cursor-pointer"
          >
            <Link to="/academic/classes/$classId" params={{ classId: duty.class_id }}>
              View Full Roster
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      <CardContent className="p-5 sm:p-6">
        {/* Sub-grid: 2 columns on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Column 1: Today's Classroom Attendance & Absentee List */}
          <div className="space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 pb-1 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-sm sm:text-base text-foreground">
                    Today's Classroom Attendance
                  </h3>
                </div>
                {isMarked ? (
                  <Badge
                    variant="outline"
                    className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[11px] font-medium"
                  >
                    Marked
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[11px] font-medium"
                  >
                    Pending
                  </Badge>
                )}
              </div>

              {isMarked ? (
                absentStudents.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400">
                      <div className="flex items-center gap-2">
                        <UserX className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                        <span className="text-xs sm:text-sm font-semibold">
                          Absent Today ({absentStudents.length}{' '}
                          {absentStudents.length === 1 ? 'Student' : 'Students'})
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground font-medium">
                        Follow-up suggested
                      </span>
                    </div>

                    <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                      {absentStudents.map((student) => {
                        const studentName = getFullName(student);
                        const parent = parentByStudentId.get(student.id);
                        const initials = getInitials(student.first_name, student.last_name);

                        return (
                          <div
                            key={student.id}
                            className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-card hover:bg-muted/30 transition-colors gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar className="h-9 w-9 border border-border/80 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold text-xs">
                                <AvatarFallback>{initials}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground truncate">
                                  {studentName}
                                </p>
                                {parent ? (
                                  <p className="text-xs text-muted-foreground truncate">
                                    Parent:{' '}
                                    <span className="text-foreground font-medium">
                                      {parent.parent_name}
                                    </span>
                                    {parent.parent_phone && ` • ${parent.parent_phone}`}
                                  </p>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                      No Parent Linked
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center gap-1.5">
                              {parent?.parent_phone ? (
                                <div className="flex items-center gap-1">
                                  <Button
                                    asChild
                                    size="sm"
                                    variant="outline"
                                    className="h-8 px-2.5 text-xs font-medium gap-1.5 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/30 cursor-pointer"
                                  >
                                    <a href={`tel:${parent.parent_phone}`}>
                                      <Phone className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">Call Parent</span>
                                    </a>
                                  </Button>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                                    title="Copy phone number"
                                    onClick={() => handleCopyPhone(parent.parent_phone!, student.id)}
                                  >
                                    {copiedPhoneId === student.id ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  className="h-8 px-3 text-xs font-semibold gap-1.5 shadow-2xs bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer transition-all active:scale-[0.98]"
                                  onClick={() => onLinkParentClick(student)}
                                >
                                  <UserPlus className="w-3.5 h-3.5" />
                                  <span>Link Parent</span>
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 sm:p-8 rounded-xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                      <Sparkles className="w-6 h-6 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-foreground">
                        100% Attendance Today!
                      </h4>
                      <p className="text-xs sm:text-sm text-muted-foreground max-w-sm">
                        All {sectionStudents.length} pupils are present 🎉
                      </p>
                    </div>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center p-6 sm:p-8 rounded-xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-foreground">
                      Attendance Pending for Today
                    </h4>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-sm">
                      Morning presence has not been recorded yet for Section {sectionLabel}.
                    </p>
                  </div>
                  <Button
                    asChild
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-xs cursor-pointer"
                  >
                    <Link
                      to="/attendance/mark"
                      search={
                        {
                          classId: duty.class_id,
                          sectionId: duty.section_id,
                        } as any
                      }
                    >
                      <CalendarCheck className="w-3.5 h-3.5 mr-1.5" />
                      Mark Attendance
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Parent Connectivity & Communication */}
          <div className="space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 pb-1 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-sm sm:text-base text-foreground">
                    Parent Connectivity & Communication
                  </h3>
                </div>
                <Badge variant="outline" className="text-[11px] font-medium">
                  {connectedCount}/{sectionStudents.length} Connected
                </Badge>
              </div>

              {/* Progress bar */}
              <div className="space-y-2 p-3.5 rounded-lg border border-border/60 bg-muted/20">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">
                    {connectedCount} of {sectionStudents.length} Parents Connected
                  </span>
                  <span className="font-bold text-foreground">
                    ({connectionPercentage}%)
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      connectionPercentage === 100
                        ? 'bg-emerald-500'
                        : connectionPercentage >= 70
                          ? 'bg-indigo-500'
                          : 'bg-amber-500'
                    }`}
                    style={{ width: `${connectionPercentage}%` }}
                  />
                </div>
              </div>

              {unlinkedStudents.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-300">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs sm:text-sm font-medium">
                      {unlinkedStudents.length}{' '}
                      {unlinkedStudents.length === 1 ? 'pupil has' : 'pupils have'} no linked
                      parent account yet.
                    </span>
                  </div>

                  <div className="space-y-2">
                    {unlinkedStudents.slice(0, 3).map((student) => {
                      const studentName = getFullName(student);
                      const initials = getInitials(student.first_name, student.last_name);

                      return (
                        <div
                          key={student.id}
                          className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg border border-border/60 bg-card hover:bg-muted/30 transition-colors gap-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar className="h-8 w-8 border border-border/80 text-xs font-semibold">
                              <AvatarFallback>{initials}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-semibold text-foreground truncate">
                                {studentName}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                Unlinked student
                              </p>
                            </div>
                          </div>

                          <Button
                            size="sm"
                            className="h-7 px-2.5 text-xs font-semibold gap-1.5 shadow-2xs bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shrink-0 transition-all active:scale-[0.98]"
                            onClick={() => onLinkParentClick(student)}
                          >
                            <UserPlus className="w-3 h-3" />
                            <span>Link Parent</span>
                          </Button>
                        </div>
                      );
                    })}

                    {unlinkedStudents.length > 3 && (
                      <div className="pt-1 text-center">
                        <Link
                          to="/academic/classes/$classId"
                          params={{ classId: duty.class_id }}
                          className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1"
                        >
                          +{unlinkedStudents.length - 3} more unlinked pupils in roster
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 sm:p-8 rounded-xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-foreground">
                      All Students Connected
                    </h4>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-sm">
                      All students in Section {sectionLabel} are linked to their parents! ✨
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
