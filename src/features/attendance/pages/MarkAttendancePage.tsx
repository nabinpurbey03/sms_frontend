import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import {
  useAssignments,
  useMyTeacherAssignments,
  useAllClassesWithDetails,
} from '@/features/academic/hooks';
import { useMarkAttendance, useSectionAttendanceReport } from '../hooks';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import {
  CalendarCheck,
  Check,
  X,
  AlertCircle,
  Calendar,
  Search,
  Loader2,
  RotateCcw,
  Edit3,
  CheckCircle2,
} from 'lucide-react';
import type { AcademicClass, AcademicSection } from '@/features/academic/types';

export const MarkAttendancePage: React.FC = () => {
  const { activeTenantId } = useAuth();
  const { can, isSuperAdmin, activeRole } = usePermission();

  const canManage =
    isSuperAdmin || can('MANAGE_CLASSES_SUBJECTS') || activeRole === 'ADMIN' || activeRole === 'OFFICE_ADMIN';
  const isTeacherOnly = activeRole === 'TEACHER' && !canManage;

  // Admin vs Teacher assignment fetching
  const { data: adminAssignments = [], isLoading: adminAssignmentsLoading } = useAssignments(
    canManage ? activeTenantId : null
  );
  const { data: myTeacherAssignments = [], isLoading: teacherAssignmentsLoading } = useMyTeacherAssignments(
    activeTenantId,
    { enabled: isTeacherOnly }
  );
  const _assignments = isTeacherOnly ? myTeacherAssignments : adminAssignments;
  const assignmentsLoading = isTeacherOnly ? teacherAssignmentsLoading : adminAssignmentsLoading;
  const { data: classesWithDetails = [], isLoading: classesLoading } = useAllClassesWithDetails(activeTenantId);

  // URL search parameters for preselection
  const searchParams = new URLSearchParams(window.location.search);
  const queryClassId = searchParams.get('classId') || '';
  const querySectionId = searchParams.get('sectionId') || '';

  // Date state & ABAC rule (disallow future dates)
  const todayStr = new Date().toISOString().split('T')[0];
  const [recordDate, setRecordDate] = useState<string>(todayStr);

  // Search and attendance mark state
  const [presentStudentIds, setPresentStudentIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const markAttendanceMutation = useMarkAttendance();

  // Compute accessible sections: for teachers, ONLY sections where is_class_teacher === true
  const accessibleSections = useMemo(() => {
    const sections: { class: AcademicClass; section: AcademicSection }[] = [];
    for (const cls of classesWithDetails) {
      for (const section of cls.sections) {
        if (isTeacherOnly) {
          const isClassTeacher = myTeacherAssignments.some(
            (a) => a.class_id === cls.id && a.is_class_teacher && (!a.section_id || a.section_id === section.id)
          );
          if (!isClassTeacher) continue;
        }
        sections.push({ class: cls, section });
      }
    }
    return sections;
  }, [classesWithDetails, isTeacherOnly, myTeacherAssignments]);

  // Distinct classes that have at least one accessible section
  const availableClasses = useMemo(() => {
    const map = new Map<string, AcademicClass>();
    for (const item of accessibleSections) {
      if (!map.has(item.class.id)) {
        map.set(item.class.id, item.class);
      }
    }
    return Array.from(map.values());
  }, [accessibleSections]);

  // User-driven selection override
  const [userSelected, setUserSelected] = useState<{ classId: string; sectionId: string } | null>(null);

  // Derived effective selection avoiding setState in useEffect
  const effectiveSelection = useMemo(() => {
    if (accessibleSections.length === 0) {
      return { classId: '', sectionId: '' };
    }

    // 1. User manual selection
    if (userSelected !== null) {
      if (!userSelected.classId) {
        return { classId: '', sectionId: '' };
      }
      const isValid = accessibleSections.some(
        (item) => item.class.id === userSelected.classId && item.section.id === userSelected.sectionId
      );
      if (isValid) {
        return userSelected;
      }
    }

    // 2. Query params match
    if (querySectionId) {
      const match = accessibleSections.find(
        (item) => item.section.id === querySectionId && (!queryClassId || item.class.id === queryClassId)
      );
      if (match) {
        return { classId: match.class.id, sectionId: match.section.id };
      }
    } else if (queryClassId) {
      const match = accessibleSections.find((item) => item.class.id === queryClassId);
      if (match) {
        return { classId: match.class.id, sectionId: match.section.id };
      }
    }

    // 3. Fallback to first accessible section
    return {
      classId: accessibleSections[0].class.id,
      sectionId: accessibleSections[0].section.id,
    };
  }, [accessibleSections, userSelected, queryClassId, querySectionId]);

  const selectedClassId = effectiveSelection.classId;
  const selectedSectionId = effectiveSelection.sectionId;

  // Selected class & students data
  const selectedClass = classesWithDetails.find((c) => c.id === selectedClassId);
  const students = useMemo(() => {
    if (!selectedClass || !selectedSectionId) return [];
    return selectedClass.students.filter(
      (s) => s.section_id === selectedSectionId && s.status === 'ACTIVE'
    );
  }, [selectedClass, selectedSectionId]);

  // Existing section attendance report for selected section and date
  const { data: sectionReport, isLoading: isReportLoading } = useSectionAttendanceReport(
    activeTenantId,
    selectedClassId,
    selectedSectionId,
    recordDate,
    recordDate
  );

  const isAlreadyMarked = useMemo(() => {
    if (!sectionReport) return false;
    return (
      (sectionReport.total_school_days ?? 0) > 0 ||
      sectionReport.students.some((s) => s.records && s.records[recordDate] !== undefined)
    );
  }, [sectionReport, recordDate]);

  // Synchronize local marked student IDs when switching sections/dates or fetching existing records
  useEffect(() => {
    if (!sectionReport || !isAlreadyMarked) {
      // oxlint-disable-next-line react/set-state-in-effect
      setPresentStudentIds(new Set());
      return;
    }
    const presentIds = new Set<string>();
    for (const s of sectionReport.students) {
      if (s.records && s.records[recordDate] === true) {
        presentIds.add(s.student_id);
      }
    }
    // oxlint-disable-next-line react/set-state-in-effect
    setPresentStudentIds(presentIds);
  }, [sectionReport, isAlreadyMarked, recordDate, selectedSectionId]);

  // Filter students by search
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter((s) =>
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  // Defense-in-depth verification for class teacher duty
  const isClassTeacherForSelected = useMemo(() => {
    if (canManage) return true;
    return myTeacherAssignments.some(
      (a) =>
        a.class_id === selectedClassId &&
        a.is_class_teacher &&
        (!a.section_id || a.section_id === selectedSectionId)
    );
  }, [canManage, myTeacherAssignments, selectedClassId, selectedSectionId]);

  // Handle marking attendance
  const handleMarkAllPresent = () => {
    setPresentStudentIds(new Set(students.map((s) => s.id)));
  };

  const handleMarkAllAbsent = () => {
    setPresentStudentIds(new Set());
  };

  const toggleStudent = (studentId: string) => {
    const newSet = new Set(presentStudentIds);
    if (newSet.has(studentId)) {
      newSet.delete(studentId);
    } else {
      newSet.add(studentId);
    }
    setPresentStudentIds(newSet);
  };

  const handleSubmit = async () => {
    if (!activeTenantId || !selectedClassId || !selectedSectionId) return;

    // Reject future dates (ABAC rule)
    if (!recordDate || recordDate > todayStr) {
      return;
    }

    await markAttendanceMutation.mutateAsync({
      tenantId: activeTenantId,
      classId: selectedClassId,
      sectionId: selectedSectionId,
      recordDate,
      presentStudentIds: Array.from(presentStudentIds),
    });
  };

  const isLoading = assignmentsLoading || classesLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 pb-12">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Mark Daily Attendance</h1>
            <p className="text-sm text-muted-foreground">Loading attendance details...</p>
          </div>
        </div>
        <div className="h-40 rounded-xl border bg-muted/20 animate-pulse" />
      </div>
    );
  }

  // Teacher has no Class Teacher assignments
  if (isTeacherOnly && accessibleSections.length === 0) {
    return (
      <div className="space-y-6 pb-12">
        <div className="flex items-center gap-2.5 border-b pb-5">
          <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Mark Daily Attendance
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Record daily student attendance for your assigned class section.
            </p>
          </div>
        </div>

        <Card className="border-dashed p-12 text-center space-y-3 bg-card/60">
          <AlertCircle className="w-10 h-10 mx-auto text-amber-500/80" />
          <div>
            <p className="text-base font-bold text-foreground">No Class Teacher Assignments</p>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-md mx-auto leading-relaxed">
              Only designated Class Teachers can record daily student attendance. If you are a Subject Teacher, you can view class rosters under Classes &amp; Sections. Please contact your school administrator if you need attendance marking rights.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // User without attendance permissions
  if (!canManage && !isTeacherOnly && !can('MARK_ATTENDANCE')) {
    return (
      <div className="space-y-6 pb-12">
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-8 text-center space-y-3">
          <AlertCircle className="w-10 h-10 mx-auto text-destructive/60" />
          <h2 className="text-lg font-bold text-foreground">No Attendance Access</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            You don't have permission to mark attendance.
          </p>
        </div>
      </div>
    );
  }

  // No accessible classes or sections found for admin/school
  if (accessibleSections.length === 0) {
    return (
      <div className="space-y-6 pb-12">
        <div className="flex items-center gap-2.5 border-b pb-5">
          <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Mark Daily Attendance
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Mark student attendance for your school sections.
            </p>
          </div>
        </div>

        <Card className="border-dashed p-12 text-center space-y-3 bg-card/60">
          <CalendarCheck className="w-10 h-10 mx-auto text-muted-foreground/60" />
          <div>
            <p className="text-base font-bold text-foreground">No Classes or Sections Available</p>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-md mx-auto leading-relaxed">
              There are no classes or sections set up yet. Create classes and sections first under Academics.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              {isAlreadyMarked ? <Edit3 className="w-6 h-6" /> : <CalendarCheck className="w-6 h-6" />}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {isAlreadyMarked ? 'Update Daily Attendance' : 'Mark Daily Attendance'}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {isAlreadyMarked
                  ? 'Attendance has already been recorded for this section on this date. Modify student attendance below.'
                  : isTeacherOnly
                  ? 'You can only mark attendance for sections where you are the Class Teacher.'
                  : 'Mark student attendance for your school sections.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Selection Controls */}
      <Card className="p-4 bg-card shadow-xs border-border/70">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Date Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Attendance Date
            </label>
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <Input
                type="date"
                value={recordDate}
                onChange={(e) => setRecordDate(e.target.value)}
                max={todayStr}
                className="h-10"
              />
              {recordDate === todayStr ? (
                <Badge
                  variant="secondary"
                  className="text-xs h-10 px-3 bg-primary/10 text-primary border-primary/20 shrink-0 font-medium flex items-center"
                >
                  Today
                </Badge>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRecordDate(todayStr)}
                  className="h-10 px-3 text-xs gap-1.5 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Today</span>
                </Button>
              )}
              {isAlreadyMarked && (
                <Badge
                  variant="outline"
                  className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1 h-10 px-2.5 shrink-0 flex items-center"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Recorded for this date
                </Badge>
              )}
            </div>
          </div>

          {/* Class Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Class</label>
            <select
              value={selectedClassId}
              onChange={(e) => {
                const newClassId = e.target.value;
                if (!newClassId) {
                  setUserSelected({ classId: '', sectionId: '' });
                } else {
                  const firstSec = accessibleSections.find((item) => item.class.id === newClassId);
                  setUserSelected({
                    classId: newClassId,
                    sectionId: firstSec ? firstSec.section.id : '',
                  });
                }
                setPresentStudentIds(new Set());
              }}
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isLoading}
            >
              <option value="">Select a class...</option>
              {availableClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Section</label>
            <select
              value={selectedSectionId}
              onChange={(e) => {
                setUserSelected({
                  classId: selectedClassId,
                  sectionId: e.target.value,
                });
                setPresentStudentIds(new Set());
              }}
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={!selectedClassId || isLoading}
            >
              <option value="">Select a section...</option>
              {accessibleSections
                .filter(({ class: cls }) => cls.id === selectedClassId)
                .map(({ section }) => (
                  <option key={section.id} value={section.id}>
                    Section {section.name} ({section.student_count ?? 0} students)
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Access Notice for Teachers */}
        {isTeacherOnly && selectedClassId && !isClassTeacherForSelected && (
          <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>You are not the Class Teacher for this section. Only the assigned Class Teacher can mark attendance.</span>
          </div>
        )}
      </Card>

      {/* Attendance Table */}
      {selectedSectionId && (
        <Card className="overflow-hidden bg-card shadow-xs border-border/70">
          {/* Table Header Actions */}
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-foreground">
                {students.length} Active Students
              </span>
              <Badge variant={presentStudentIds.size === students.length ? 'success' : 'secondary'} className="text-xs">
                {presentStudentIds.size} Present
              </Badge>
              <Badge variant={presentStudentIds.size === 0 ? 'destructive' : 'secondary'} className="text-xs">
                {students.length - presentStudentIds.size} Absent
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 w-48 text-xs"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllPresent}
                className="h-9 gap-1.5 text-xs"
              >
                <Check className="w-3.5 h-3.5" />
                All Present
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAbsent}
                className="h-9 gap-1.5 text-xs"
              >
                <X className="w-3.5 h-3.5" />
                All Absent
              </Button>
            </div>
          </div>

          {/* Students Table */}
          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              {searchQuery ? 'No students match your search.' : 'No active students in this section.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead className="w-32 text-center">Status</TableHead>
                    <TableHead className="w-24 text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student, index) => {
                    const fullName = [student.first_name, student.middle_name, student.last_name]
                      .filter(Boolean)
                      .join(' ');
                    const isPresent = presentStudentIds.has(student.id);

                    return (
                      <TableRow key={student.id} className="hover:bg-muted/30">
                        <TableCell className="text-muted-foreground text-xs font-mono">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                              {student.first_name[0].toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-foreground">
                              {fullName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={isPresent ? 'success' : 'destructive'}
                            className="text-xs gap-1"
                          >
                            {isPresent ? (
                              <>
                                <Check className="w-3 h-3" />
                                Present
                              </>
                            ) : (
                              <>
                                <X className="w-3 h-3" />
                                Absent
                              </>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant={isPresent ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => toggleStudent(student.id)}
                            className="h-8 w-20 gap-1 text-xs"
                          >
                            {isPresent ? (
                              <>
                                <Check className="w-3 h-3" />
                                Marked
                              </>
                            ) : (
                              <>
                                <X className="w-3 h-3" />
                                Absent
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Submit Footer */}
          <div className="p-4 border-t bg-muted/30 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {recordDate && (
                <span>
                  {isAlreadyMarked ? 'Updating attendance for ' : 'Marking attendance for '}
                  <span className="font-semibold text-foreground">
                    {new Date(recordDate + 'T00:00:00').toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </span>
              )}
            </div>
            <Button
              onClick={handleSubmit}
              disabled={
                markAttendanceMutation.isPending ||
                isReportLoading ||
                !selectedSectionId ||
                students.length === 0 ||
                (isTeacherOnly && !isClassTeacherForSelected) ||
                recordDate > todayStr
              }
              className={`gap-2 ${
                isAlreadyMarked
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : ''
              }`}
            >
              {markAttendanceMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isAlreadyMarked ? (
                <Edit3 className="w-4 h-4" />
              ) : (
                <CalendarCheck className="w-4 h-4" />
              )}
              {isAlreadyMarked ? 'Update Attendance' : 'Submit Attendance'}
            </Button>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!selectedSectionId && !isLoading && (
        <Card className="border-dashed p-12 text-center space-y-3 bg-card/60">
          <CalendarCheck className="w-10 h-10 mx-auto text-muted-foreground/60" />
          <div>
            <p className="text-sm font-bold text-foreground">Select a Section</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choose a class and section from the dropdowns above to start marking attendance.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};
