import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import {
  useAssignments,
  useMyTeacherAssignments,
  useAllClassesWithDetails,
} from '@/features/academic/hooks';
import { useMarkAttendance, useSectionAttendanceReport } from '../hooks';
import { getLocalTodayDate } from '../utils/attendanceStatus';
import { useSchoolSettings, useCalendarEvents } from '@/features/school-settings/hooks';
import { AttendanceConfirmDialog } from '../components/AttendanceConfirmDialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { NepaliDatePicker } from '@/components/ui/nepali-date-picker';
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
  Users,
  Loader2,
  RotateCcw,
  Edit3,
  CheckCircle2,
  Lock,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import type { AcademicClass, AcademicSection } from '@/features/academic/types';
import { toast } from 'sonner';
import { useCalendarPreferenceStore } from '@/stores/calendarPreferenceStore';
import { formatDualDate } from '@/features/school-settings/utils/nepaliDate';

export const MarkAttendancePage: React.FC = () => {
  const { calendarSystem } = useCalendarPreferenceStore();
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
  const todayStr = useMemo(() => getLocalTodayDate(), []);
  const minDateStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return getLocalTodayDate(d);
  }, []);
  const [recordDate, setRecordDate] = useState<string>(todayStr);
  const isDateOutOfRange = recordDate < minDateStr || recordDate > todayStr;

  // Fetch tenant school settings (academic days) & calendar events
  const { data: schoolSettings } = useSchoolSettings(activeTenantId);
  const { data: calendarEvents = [] } = useCalendarEvents(activeTenantId);

  // Weekday name and holiday detection for recordDate
  const selectedDayInfo = useMemo(() => {
    if (!recordDate) return { dayName: '', isAcademicDay: true, holidayEvent: null, isBlocked: false };
    const [y, m, d] = recordDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayKey = dayNames[dateObj.getDay()];

    const isAcademicDay = schoolSettings?.academic_days
      ? schoolSettings.academic_days.includes(dayKey as any)
      : dayKey !== 'saturday'; // default Saturday off

    const holidayEvent = calendarEvents.find(
      (ev) => ev.is_holiday && recordDate >= ev.start_date && recordDate <= ev.end_date
    );

    return {
      dayName: dayKey.charAt(0).toUpperCase() + dayKey.slice(1),
      isAcademicDay,
      holidayEvent,
      isBlocked: !isAcademicDay || !!holidayEvent,
    };
  }, [recordDate, schoolSettings, calendarEvents]);

  // Search, status filter, and attendance mark state
  const [presentStudentIds, setPresentStudentIds] = useState<Set<string>>(new Set());
  const [savedPresentStudentIds, setSavedPresentStudentIds] = useState<Set<string>>(new Set());
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PRESENT' | 'ABSENT'>('ALL');
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
  const canEdit = !isDateOutOfRange && !selectedDayInfo.isBlocked && (!isAlreadyMarked || isEditing);

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

  // Filter students by search and status tab
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const isPresent = presentStudentIds.has(s.id);
      if (statusFilter === 'PRESENT' && !isPresent) return false;
      if (statusFilter === 'ABSENT' && isPresent) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const fullName = [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(' ').toLowerCase();
        if (!fullName.includes(q)) return false;
      }
      return true;
    });
  }, [students, searchQuery, statusFilter, presentStudentIds]);

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

  const markStudentStatus = (studentId: string, status: 'PRESENT' | 'ABSENT') => {
    if (!canEdit) return;
    const newSet = new Set(presentStudentIds);
    if (status === 'PRESENT') {
      newSet.add(studentId);
    } else {
      newSet.delete(studentId);
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

    if (selectedDayInfo.isBlocked) {
      toast.error('Attendance Disabled for this Date', {
        description: !selectedDayInfo.isAcademicDay
          ? `${selectedDayInfo.dayName} is configured as a non-academic day for this school.`
          : `"${selectedDayInfo.holidayEvent?.title}" is scheduled as an official school holiday.`,
      });
      return;
    }

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
        <EmptyState
          icon={AlertCircle}
          title="No Class Teacher Assignments"
          description="Only designated Class Teachers can record daily student attendance. If you are a Subject Teacher, you can view class rosters under Classes & Sections. Please contact your school administrator if you need attendance marking rights."
        />
      </div>
    );
  }

  // User without attendance permissions
  if (!canManage && !isTeacherOnly && !can('MARK_ATTENDANCE')) {
    return (
      <div className="space-y-6 pb-12">
        <ErrorState
          title="No Attendance Access"
          message="You don't have permission to mark attendance."
        />
      </div>
    );
  }

  // No accessible classes or sections found for admin/school
  if (accessibleSections.length === 0) {
    return (
      <div className="space-y-6 pb-12">
        <EmptyState
          icon={CalendarCheck}
          title="No Classes or Sections Available"
          description="There are no classes or sections set up yet. Create classes and sections first under Academics."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Selection Controls */}
      <Card className="p-4 bg-card shadow-xs border-border/70">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Date Picker */}
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1 truncate">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                Attendance Date
              </label>

              {/* Status Tag in Label Row */}
              {!selectedDayInfo.isAcademicDay ? (
                <Badge
                  variant="destructive"
                  className="text-[11px] gap-1 h-5 px-1.5 shrink-0 flex items-center font-medium"
                  title={`${selectedDayInfo.dayName} Off (Non-Academic Day)`}
                >
                  <AlertCircle className="w-3 h-3" />
                  <span>Closed</span>
                </Badge>
              ) : selectedDayInfo.holidayEvent ? (
                <Badge
                  variant="destructive"
                  className="text-[11px] gap-1 h-5 px-1.5 shrink-0 flex items-center font-medium max-w-[130px] truncate"
                  title={`Holiday: ${selectedDayInfo.holidayEvent.title}`}
                >
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span className="truncate">{selectedDayInfo.holidayEvent.title}</span>
                </Badge>
              ) : recordDate < minDateStr ? (
                <Badge
                  variant="warning"
                  className="text-[11px] gap-1 h-5 px-1.5 shrink-0 flex items-center font-medium"
                  title="Locked (>7 days old)"
                >
                  <Lock className="w-3 h-3" />
                  <span>Locked</span>
                </Badge>
              ) : isAlreadyMarked ? (
                <Badge
                  variant="success"
                  className="text-[11px] gap-1 h-5 px-2 shrink-0 flex items-center font-medium"
                  title="Attendance recorded for this date"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Recorded</span>
                </Badge>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <NepaliDatePicker
                  value={recordDate}
                  onChange={(val) => setRecordDate(val)}
                  minDate={minDateStr}
                  maxDate={todayStr}
                  size="sm"
                  className={`h-9 ${isDateOutOfRange ? 'border-amber-500/50 dark:border-amber-500/50' : ''}`}
                />
              </div>
              {recordDate === todayStr ? (
                <Badge
                  variant="info"
                  className="text-xs h-9 px-2.5 shrink-0 font-medium flex items-center"
                >
                  Today
                </Badge>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRecordDate(todayStr)}
                  className="h-9 px-2.5 text-xs gap-1.5 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
                  title="Reset to today"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Today</span>
                </Button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
              <Clock className="w-3 h-3 shrink-0" />
              Editable window: last 7 days only ({minDateStr} to {todayStr})
            </p>
          </div>

          {/* Class Selector */}
          <div className="space-y-1.5 min-w-0">
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
                setStatusFilter('ALL');
                setSearchQuery('');
              }}
              disabled={isLoading}
            >
              <SelectTrigger className="w-full h-9 text-xs">
                <SelectValue placeholder="Select a class..." />
              </SelectTrigger>
              <SelectContent>
                {availableClasses.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id} className="text-xs">
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Section Selector */}
          <div className="space-y-1.5 min-w-0">
            <label className="text-xs font-semibold text-muted-foreground">Section</label>
            <Select
              value={selectedSectionId}
              onValueChange={(newSectionId) => {
                setUserSelected({
                  classId: selectedClassId,
                  sectionId: newSectionId,
                });
                setPresentStudentIds(new Set());
                setStatusFilter('ALL');
                setSearchQuery('');
              }}
              disabled={!selectedClassId || isLoading}
            >
              <SelectTrigger className="w-full h-9 text-xs">
                <SelectValue placeholder="Select a section..." />
              </SelectTrigger>
              <SelectContent>
                {accessibleSections
                  .filter(({ class: cls }) => cls.id === selectedClassId)
                  .map(({ section }) => (
                    <SelectItem key={section.id} value={section.id} className="text-xs">
                      Section {section.name} ({section.student_count ?? 0} students)
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Non-Academic Day / Holiday Warning Banner */}
        {selectedDayInfo.isBlocked && (
          <div className="mt-4 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm text-foreground">
                Attendance Marking Disabled for this Date
              </h4>
              <p className="mt-0.5 text-muted-foreground">
                {!selectedDayInfo.isAcademicDay
                  ? `${selectedDayInfo.dayName} is configured as a non-academic day (school closed) in School Settings. Attendance cannot be recorded.`
                  : `"${selectedDayInfo.holidayEvent?.title}" is scheduled as an official school holiday in the Academic Calendar. Attendance cannot be recorded.`}
              </p>
            </div>
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
                  variant="warning"
                  className="gap-1.5 py-1 px-3 text-xs font-medium"
                >
                  <Lock className="w-3.5 h-3.5" />
                  {recordDate < minDateStr ? 'Locked (>7 days)' : 'Future Date Locked'}
                </Badge>
              ) : isAlreadyMarked ? (
                isEditing ? (
                  <Badge
                    variant="warning"
                    className="gap-1.5 py-1 px-3 text-xs font-semibold animate-pulse"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Editing Recorded Attendance
                  </Badge>
                ) : (
                  <Badge
                    variant="success"
                    className="gap-1.5 py-1 px-3 text-xs font-semibold"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Attendance Recorded
                  </Badge>
                )
              ) : (
                <Badge
                  variant="secondary"
                  className="gap-1.5 py-1 px-3 text-xs font-medium"
                >
                  <Clock className="w-3.5 h-3.5" />
                  Not Yet Recorded
                </Badge>
              )}

              {/* Mode Indicator */}
              {isAlreadyMarked && !isEditing && !isDateOutOfRange && (
                <Badge
                  variant="outline"
                  className="text-[11px] gap-1 font-medium"
                >
                  <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  Protected View
                </Badge>
              )}

              {/* Unsaved Changes Indicator */}
              {canEdit && hasUnsavedChanges && (
                <Badge
                  variant="warning"
                  className="text-[11px] gap-1 font-semibold animate-pulse"
                >
                  <Edit3 className="w-3 h-3" />
                  Unsaved Changes
                </Badge>
              )}

              <span className="text-xs text-muted-foreground">
                {selectedClass?.name} • Section {selectedClass?.sections.find((s) => s.id === selectedSectionId)?.name}
              </span>
            </div>

            {/* Interactive Metrics / Filter Tabs */}
            <div role="tablist" aria-label="Attendance status filter" className="flex items-center gap-1.5 p-1 bg-muted/60 dark:bg-muted/30 rounded-xl border border-border/80 shadow-2xs">
              <button
                type="button"
                role="tab"
                aria-selected={statusFilter === 'ALL'}
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all duration-150 cursor-pointer select-none flex items-center gap-1.5 border ${
                  statusFilter === 'ALL'
                    ? 'bg-background text-foreground shadow-xs font-bold border-border/90 dark:bg-card dark:border-primary/40'
                    : 'border-transparent text-muted-foreground hover:bg-background/60 hover:text-foreground hover:border-border/40'
                }`}
              >
                <span>All</span>
                <span className="font-bold tabular-nums">{totalCount}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={statusFilter === 'PRESENT'}
                onClick={() => setStatusFilter('PRESENT')}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all duration-150 cursor-pointer select-none flex items-center gap-1.5 border ${
                  statusFilter === 'PRESENT'
                    ? 'bg-emerald-600 text-white shadow-xs font-bold border-emerald-500'
                    : 'border-transparent text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 hover:bg-emerald-500/10 hover:border-emerald-500/30'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>Present</span>
                <span className="font-bold tabular-nums">{presentCount}</span>
                <span className="text-[10px] opacity-80 tabular-nums">({attendancePercentage}%)</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={statusFilter === 'ABSENT'}
                onClick={() => setStatusFilter('ABSENT')}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all duration-150 cursor-pointer select-none flex items-center gap-1.5 border ${
                  statusFilter === 'ABSENT'
                    ? 'bg-rose-600 text-white shadow-xs font-bold border-rose-500'
                    : 'border-transparent text-destructive hover:text-rose-700 dark:hover:text-rose-300 hover:bg-destructive/10 hover:border-destructive/30'
                }`}
              >
                <X className="w-3.5 h-3.5" />
                <span>Absent</span>
                <span className="font-bold tabular-nums">{absentCount}</span>
              </button>
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
            <div className="flex flex-wrap items-center gap-2">
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
              {statusFilter !== 'ALL' && (
                <Badge
                  variant="secondary"
                  className="h-8 gap-1.5 px-2.5 text-xs font-medium cursor-pointer hover:bg-muted"
                  onClick={() => setStatusFilter('ALL')}
                  title="Click to reset filter"
                >
                  <span>Filtered: {statusFilter === 'PRESENT' ? 'Present' : 'Absent'}</span>
                  <X className="w-3 h-3 text-muted-foreground" />
                </Badge>
              )}
              {(searchQuery || statusFilter !== 'ALL') && (
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
            <div className="p-8">
              <EmptyState
                icon={searchQuery ? Search : statusFilter === 'ABSENT' ? CheckCircle2 : Users}
                title={
                  searchQuery
                    ? 'No matching students'
                    : statusFilter === 'ABSENT'
                      ? 'No Absent Students'
                      : statusFilter === 'PRESENT'
                        ? 'No Present Students'
                        : 'No students found'
                }
                description={
                  searchQuery
                    ? `No students match "${searchQuery}". Try a different search term.`
                    : statusFilter === 'ABSENT'
                      ? `All ${students.length} students in this section are currently marked present.`
                      : statusFilter === 'PRESENT'
                        ? 'No students are marked present yet.'
                        : 'No active students enrolled in this section.'
                }
                action={
                  statusFilter !== 'ALL' || searchQuery ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setStatusFilter('ALL');
                        setSearchQuery('');
                      }}
                      className="mt-2 text-xs cursor-pointer"
                    >
                      Show All Students
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto relative [&>div]:overflow-visible">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card border-b">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead className="w-60 text-center">
                      {canEdit ? 'Attendance Status' : 'Recorded Status'}
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
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="text-muted-foreground text-xs font-mono text-center">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-primary/20">
                              {student.first_name[0]?.toUpperCase() ?? '?'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {fullName}
                              </p>
                              {student.gender && (
                                <p className="text-[11px] text-muted-foreground capitalize">
                                  {student.gender.toLowerCase()}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          {canEdit ? (
                            <div
                              role="group"
                              aria-label={`Attendance for ${fullName}`}
                              className="inline-flex items-center rounded-lg border border-border/80 bg-muted/40 p-0.5 shadow-2xs"
                            >
                              <button
                                type="button"
                                onClick={() => markStudentStatus(student.id, 'PRESENT')}
                                aria-pressed={isPresent}
                                aria-label={`Mark ${fullName} Present`}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer ${
                                  isPresent
                                    ? 'bg-emerald-600 text-white font-semibold shadow-xs hover:bg-emerald-700'
                                    : 'text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-background/80'
                                }`}
                              >
                                <Check className={`w-3.5 h-3.5 ${isPresent ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
                                <span>Present</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => markStudentStatus(student.id, 'ABSENT')}
                                aria-pressed={!isPresent}
                                aria-label={`Mark ${fullName} Absent`}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer ${
                                  !isPresent
                                    ? 'bg-rose-600 text-white font-semibold shadow-xs hover:bg-rose-700'
                                    : 'text-muted-foreground hover:text-rose-700 dark:hover:text-rose-400 hover:bg-background/80'
                                }`}
                              >
                                <X className={`w-3.5 h-3.5 ${!isPresent ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
                                <span>Absent</span>
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center justify-center">
                              <Badge
                                variant={isPresent ? 'success' : 'destructive'}
                                className={`text-xs gap-1.5 py-1 px-3 ${
                                  isPresent
                                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                    : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                                }`}
                              >
                                {isPresent ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    Present
                                  </>
                                ) : (
                                  <>
                                    <X className="w-3.5 h-3.5" />
                                    Absent
                                  </>
                                )}
                                <span className="text-[10px] opacity-75 font-normal ml-0.5">• Saved</span>
                              </Badge>
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

          {/* Submit / Action Footer - Sticky */}
          <div className="p-4 border-t bg-card/95 backdrop-blur-sm sticky bottom-0 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
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
                        {formatDualDate(recordDate, calendarSystem)}
                        {hasUnsavedChanges ? ' (unsaved changes)' : ' (no changes yet)'}
                      </span>
                    ) : (
                      <span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Attendance recorded for{' '}
                        {formatDualDate(recordDate, calendarSystem)}
                        . Protected view.
                      </span>
                    )
                  ) : (
                    <span>
                      Marking attendance for{' '}
                      <span className="font-semibold text-foreground">
                        {formatDualDate(recordDate, calendarSystem)}
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
                      className="gap-2 font-medium cursor-pointer"
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
