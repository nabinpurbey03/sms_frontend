import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import {
  useAssignments,
  useMyTeacherAssignments,
  useAllClassesWithDetails,
} from '@/features/academic/hooks';
import { useMarkAttendance, useSectionAttendanceReport } from '../hooks';
import { AttendanceConfirmDialog } from '../components/AttendanceConfirmDialog';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Lock,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import type { AcademicClass, AcademicSection } from '@/features/academic/types';
import { toast } from 'sonner';

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

  // Date state: allow recording and updating for the last 7 days only
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const minDateStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  }, []);
  const [recordDate, setRecordDate] = useState<string>(todayStr);
  const isDateOutOfRange = recordDate < minDateStr || recordDate > todayStr;

  // Search and attendance mark state
  const [presentStudentIds, setPresentStudentIds] = useState<Set<string>>(new Set());
  const [savedPresentStudentIds, setSavedPresentStudentIds] = useState<Set<string>>(new Set());
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

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
      // oxlint-disable-next-line react/set-state-in-effect
      setSavedPresentStudentIds(new Set());
      // oxlint-disable-next-line react/set-state-in-effect
      setIsEditing(false);
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
    // oxlint-disable-next-line react/set-state-in-effect
    setSavedPresentStudentIds(new Set(presentIds));
    // oxlint-disable-next-line react/set-state-in-effect
    setIsEditing(false);
  }, [sectionReport, isAlreadyMarked, recordDate, selectedSectionId]);

  // Whether user can interactively change attendance in the roster
  const canEdit = !isDateOutOfRange && (!isAlreadyMarked || isEditing);

  // Check if current edits differ from saved state
  const hasUnsavedChanges = useMemo(() => {
    if (!isAlreadyMarked) {
      return presentStudentIds.size > 0;
    }
    if (presentStudentIds.size !== savedPresentStudentIds.size) return true;
    for (const id of presentStudentIds) {
      if (!savedPresentStudentIds.has(id)) return true;
    }
    return false;
  }, [isAlreadyMarked, presentStudentIds, savedPresentStudentIds]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

  // Quick stats
  const totalCount = students.length;
  const presentCount = presentStudentIds.size;
  const absentCount = Math.max(0, totalCount - presentCount);
  const attendancePercentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

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
    if (!canEdit) return;
    const newSet = new Set(presentStudentIds);
    if (newSet.has(studentId)) {
      newSet.delete(studentId);
    } else {
      newSet.add(studentId);
    }
    setPresentStudentIds(newSet);
  };

  const handleStartEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setPresentStudentIds(new Set(savedPresentStudentIds));
    setIsEditing(false);
  };

  const handleSubmit = async () => {
    if (!activeTenantId || !selectedClassId || !selectedSectionId) return;

    // Reject dates out of allowed 7-day range
    if (!recordDate || isDateOutOfRange) {
      toast.error('Date outside editable window', {
        description: 'Attendance can only be recorded or updated for the last 7 days.',
      });
      return;
    }

    await markAttendanceMutation.mutateAsync({
      tenantId: activeTenantId,
      classId: selectedClassId,
      sectionId: selectedSectionId,
      recordDate,
      presentStudentIds: Array.from(presentStudentIds),
    });

    setSavedPresentStudentIds(new Set(presentStudentIds));
    setIsEditing(false);
  };

  const handleConfirmAndSubmit = async () => {
    setConfirmDialogOpen(false);
    await handleSubmit();
  };

  const isLoading = assignmentsLoading || classesLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 pb-12">
        <div className="h-40 rounded-xl border bg-muted/20 animate-pulse" />
      </div>
    );
  }

  // Teacher has no Class Teacher assignments
  if (isTeacherOnly && accessibleSections.length === 0) {
    return (
      <div className="space-y-6 pb-12">
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
                min={minDateStr}
                max={todayStr}
                className={`h-10 ${isDateOutOfRange ? 'border-amber-500/50 dark:border-amber-500/50' : ''}`}
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
              {recordDate < minDateStr ? (
                <Badge
                  variant="outline"
                  className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1 h-10 px-2.5 shrink-0 flex items-center"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  Locked (&gt;7 days)
                </Badge>
              ) : isAlreadyMarked ? (
                <Badge
                  variant="outline"
                  className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1 h-10 px-2.5 shrink-0 flex items-center"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Recorded for this date
                </Badge>
              ) : null}
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Editable window: last 7 days only ({minDateStr} to {todayStr})
            </p>
          </div>

          {/* Class Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Class</label>
            <Select
              value={selectedClassId}
              onValueChange={(newClassId) => {
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
              disabled={isLoading}
            >
              <SelectTrigger className="w-full h-10">
                <SelectValue placeholder="Select a class..." />
              </SelectTrigger>
              <SelectContent>
                {availableClasses.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Section Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Section</label>
            <Select
              value={selectedSectionId}
              onValueChange={(newSectionId) => {
                setUserSelected({
                  classId: selectedClassId,
                  sectionId: newSectionId,
                });
                setPresentStudentIds(new Set());
              }}
              disabled={!selectedClassId || isLoading}
            >
              <SelectTrigger className="w-full h-10">
                <SelectValue placeholder="Select a section..." />
              </SelectTrigger>
              <SelectContent>
                {accessibleSections
                  .filter(({ class: cls }) => cls.id === selectedClassId)
                  .map(({ section }) => (
                    <SelectItem key={section.id} value={section.id}>
                      Section {section.name} ({section.student_count ?? 0} students)
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
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
          {isReportLoading ? (
            <div className="p-6 space-y-4 animate-pulse">
              {/* Status banner skeleton */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-36 rounded-full bg-muted" />
                  <div className="h-4 w-40 rounded bg-muted" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-4 w-16 rounded bg-muted" />
                  <div className="h-4 w-20 rounded bg-muted" />
                  <div className="h-4 w-16 rounded bg-muted" />
                </div>
              </div>
              {/* Search bar skeleton */}
              <div className="flex items-center justify-between border-y py-3">
                <div className="h-8 w-56 rounded-md bg-muted" />
                <div className="flex gap-2">
                  <div className="h-8 w-24 rounded-md bg-muted" />
                  <div className="h-8 w-24 rounded-md bg-muted" />
                </div>
              </div>
              {/* Table rows skeleton */}
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-2">
                  <div className="h-4 w-6 rounded bg-muted" />
                  <div className="h-8 w-8 rounded-full bg-muted" />
                  <div className="h-4 w-40 rounded bg-muted" />
                  <div className="ml-auto h-6 w-20 rounded-full bg-muted" />
                  <div className="h-8 w-22 rounded-md bg-muted" />
                </div>
              ))}
              {/* Footer skeleton */}
              <div className="flex items-center justify-between border-t pt-4">
                <div className="h-4 w-64 rounded bg-muted" />
                <div className="h-10 w-40 rounded-md bg-muted" />
              </div>
            </div>
          ) : (
            <>
              {/* Status & Overview Banner */}
          <div className="p-4 border-b bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-4 flex-wrap">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Main Status Badge */}
              {isDateOutOfRange ? (
                <Badge
                  variant="outline"
                  className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1.5 py-1 px-3 text-xs font-medium"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  {recordDate < minDateStr ? 'Locked (>7 days)' : 'Future Date Locked'}
                </Badge>
              ) : isAlreadyMarked ? (
                isEditing ? (
                  <Badge
                    variant="outline"
                    className="bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/40 gap-1.5 py-1 px-3 text-xs font-semibold animate-pulse"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Editing Recorded Attendance
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/40 gap-1.5 py-1 px-3 text-xs font-semibold"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Attendance Recorded
                  </Badge>
                )
              ) : (
                <Badge
                  variant="secondary"
                  className="bg-muted text-muted-foreground border-border gap-1.5 py-1 px-3 text-xs font-medium"
                >
                  <Clock className="w-3.5 h-3.5" />
                  Not Yet Recorded
                </Badge>
              )}

              {/* Mode Indicator */}
              {isAlreadyMarked && !isEditing && !isDateOutOfRange && (
                <Badge
                  variant="secondary"
                  className="text-[11px] gap-1 text-muted-foreground bg-background/80 border"
                >
                  <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  Protected View
                </Badge>
              )}

              {/* Unsaved Changes Indicator */}
              {canEdit && hasUnsavedChanges && (
                <Badge
                  variant="outline"
                  className="text-[11px] gap-1 text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/30 animate-pulse"
                >
                  <Edit3 className="w-3 h-3" />
                  Unsaved Changes
                </Badge>
              )}

              <span className="text-xs text-muted-foreground">
                {selectedClass?.name} • Section {selectedClass?.sections.find((s) => s.id === selectedSectionId)?.name}
              </span>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Total:</span>
                <span className="text-xs font-bold text-foreground">{totalCount}</span>
              </div>
              <div className="h-3 w-px bg-border" />
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Present:</span>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  {presentCount} ({attendancePercentage}%)
                </span>
              </div>
              <div className="h-3 w-px bg-border" />
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-destructive font-medium">Absent:</span>
                <span className="text-xs font-bold text-destructive">{absentCount}</span>
              </div>
            </div>

            {/* Attendance Progress Bar */}
            {totalCount > 0 && (
              <div
                role="progressbar"
                aria-valuenow={attendancePercentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Attendance rate"
                className="w-full mt-1 basis-full"
              >
                <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                      attendancePercentage >= 90
                        ? 'bg-emerald-500'
                        : attendancePercentage >= 75
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                    }`}
                    style={{ width: `${attendancePercentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Table Header Controls */}
          <div className="p-3.5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b bg-card">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 w-48 sm:w-56 text-xs"
                />
              </div>
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="h-8 px-2 text-xs text-muted-foreground"
                >
                  Clear
                </Button>
              )}
              {searchQuery && (
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {filteredStudents.length} of {students.length} students
                </span>
              )}
            </div>

            {/* Batch Controls or Quick Edit */}
            <div className="flex items-center gap-2">
              {canEdit ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleMarkAllPresent}
                    className="h-8 gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/30"
                  >
                    <Check className="w-3.5 h-3.5" />
                    All Present
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleMarkAllAbsent}
                    className="h-8 gap-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 border-destructive/30"
                  >
                    <X className="w-3.5 h-3.5" />
                    All Absent
                  </Button>
                </>
              ) : isAlreadyMarked && !isDateOutOfRange ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleStartEdit}
                  disabled={isTeacherOnly && !isClassTeacherForSelected}
                  className="h-8 gap-1.5 text-xs cursor-pointer hover:bg-accent border-primary/30 text-primary font-medium"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Attendance
                </Button>
              ) : null}
            </div>
          </div>

          {/* Students Table */}
          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              {searchQuery ? 'No students match your search.' : 'No active students in this section.'}
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto relative [&>div]:overflow-visible">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead className="w-32 text-center">Status</TableHead>
                    <TableHead className="w-28 text-center">
                      {canEdit ? 'Toggle' : 'Protection'}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student, index) => {
                    const fullName = [student.first_name, student.middle_name, student.last_name]
                      .filter(Boolean)
                      .join(' ');
                    const isPresent = presentStudentIds.has(student.id);

                    return (
                      <TableRow
                        key={student.id}
                        className={`transition-colors ${
                          canEdit
                            ? 'hover:bg-muted/40 cursor-pointer'
                            : 'hover:bg-muted/20'
                        }`}
                        onClick={canEdit ? () => toggleStudent(student.id) : undefined}
                      >
                        <TableCell className="text-muted-foreground text-xs font-mono">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
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
                            className={`text-xs gap-1 py-0.5 px-2.5 ${
                              isPresent
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                            }`}
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
                          {canEdit ? (
                            <Button
                              type="button"
                              variant={isPresent ? 'default' : 'outline'}
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleStudent(student.id);
                              }}
                              className={`h-8 w-22 gap-1 text-xs cursor-pointer ${
                                isPresent
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : 'hover:bg-destructive/10 text-muted-foreground hover:text-destructive'
                              }`}
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
                            </Button>
                          ) : (
                            <div className="flex items-center justify-center text-xs text-muted-foreground gap-1 select-none">
                              <Lock className="w-3 h-3 text-muted-foreground/40" />
                              <span className="text-[11px]">Saved</span>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Submit / Action Footer */}
          <div className="p-4 border-t bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              {recordDate && (
                <span>
                  {recordDate < minDateStr ? (
                    <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      Attendance locked: records older than 7 days cannot be modified.
                    </span>
                  ) : recordDate > todayStr ? (
                    <span className="text-destructive font-medium flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Cannot record attendance for a future date.
                    </span>
                  ) : isAlreadyMarked ? (
                    isEditing ? (
                      <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5">
                        <Edit3 className="w-3.5 h-3.5" />
                        Editing attendance for{' '}
                        {new Date(recordDate + 'T00:00:00').toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                        {hasUnsavedChanges ? ' (unsaved changes)' : ' (no changes yet)'}
                      </span>
                    ) : (
                      <span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Attendance recorded for{' '}
                        {new Date(recordDate + 'T00:00:00').toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                        . Protected view.
                      </span>
                    )
                  ) : (
                    <span>
                      Marking attendance for{' '}
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
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 self-end sm:self-auto">
              {isDateOutOfRange ? (
                <Button disabled className="gap-2 opacity-60 cursor-not-allowed">
                  <Lock className="w-4 h-4" />
                  {recordDate < minDateStr ? 'Attendance Locked' : 'Future Date Locked'}
                </Button>
              ) : isAlreadyMarked ? (
                isEditing ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancelEdit}
                      disabled={markAttendanceMutation.isPending}
                      className="gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setConfirmDialogOpen(true)}
                      disabled={
                        markAttendanceMutation.isPending ||
                        !hasUnsavedChanges ||
                        (isTeacherOnly && !isClassTeacherForSelected)
                      }
                      className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium cursor-pointer"
                    >
                      {markAttendanceMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      Update Attendance
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleStartEdit}
                    disabled={
                      isReportLoading ||
                      students.length === 0 ||
                      (isTeacherOnly && !isClassTeacherForSelected)
                    }
                    className="gap-2 font-medium cursor-pointer hover:bg-accent border-primary/30 text-primary"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit Attendance
                  </Button>
                )
              ) : (
                <Button
                  type="button"
                  onClick={() => setConfirmDialogOpen(true)}
                  disabled={
                    markAttendanceMutation.isPending ||
                    isReportLoading ||
                    !selectedSectionId ||
                    students.length === 0 ||
                    (isTeacherOnly && !isClassTeacherForSelected)
                  }
                  className="gap-2 font-medium cursor-pointer"
                >
                  {markAttendanceMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CalendarCheck className="w-4 h-4" />
                  )}
                  Submit Attendance
                </Button>
              )}
            </div>
          </div>
            </>
          )}
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

      <AttendanceConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        onConfirm={handleConfirmAndSubmit}
        isPending={markAttendanceMutation.isPending}
        isAlreadyMarked={isAlreadyMarked}
        isEditing={isEditing}
        recordDate={recordDate}
        classTitle={selectedClass?.name || ''}
        sectionTitle={`Section ${selectedClass?.sections.find((s) => s.id === selectedSectionId)?.name || ''}`}
        presentCount={presentCount}
        absentCount={absentCount}
        attendancePercentage={attendancePercentage}
      />
    </div>
  );
};
