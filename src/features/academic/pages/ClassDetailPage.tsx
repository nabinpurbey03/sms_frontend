import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/common/EmptyState';
import { cn } from '@/lib/utils';
import {
  Layers,
  Users,
  BookOpen,
  Plus,
  Trash2,
  Lock,
  Sparkles,
  UserPlus,
  AlertTriangle,
  ArrowLeft,
  MoreVertical,
  UserCog,
  UserCheck,
  User,
  Loader2,
  CalendarCheck,
  Edit3,
  CheckCircle2,
  Printer,
  Bell,
  FileSpreadsheet,
  Eye,
  ShieldCheck,
  Award,
  GraduationCap,
  Pencil,
  ArrowRightLeft,
  Search,
  X,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import { useDailyAttendanceStatus } from '@/features/attendance/hooks';
import {
  useCreateSubject,
  useDeleteSubject,
  useDeleteSection,
  useCreateSection,
  useAddStudent,
  useAssignments,
  useClassWithDetails,
  useMyTeacherAssignments,
} from '../hooks';
import { TeacherAssignmentBoard } from '../components/TeacherAssignmentBoard';
import { StudentAddDialog } from '../components/StudentAddDialog';
import { SectionAddDialog } from '../components/SectionAddDialog';
import { StudentDetailDrawer } from '../components/StudentDetailDrawer';
import { EditStudentDialog } from '../components/EditStudentDialog';
import { ChangeStudentSectionDialog } from '../components/ChangeStudentSectionDialog';
import { SectionNoticeboardTab } from '../components/SectionNoticeboardTab';
import { PrintableRosterModal } from '../components/PrintableRosterModal';
import { ParentStudentLinkDialog } from '@/features/members/components/ParentStudentLinkDialog';
import { TenantRequiredState } from '@/components/common/TenantRequiredState';
import { ErrorState } from '@/components/common/ErrorState';
import {
  STUDENT_PARENTS_QUERY_KEY,
  PARENT_MAPPINGS_QUERY_KEY,
  useParentMappings,
} from '@/features/members/hooks';
import type { ParentMappingDTO } from '@/features/members/types';
import type { AcademicStudent, AcademicSubject, AcademicSection } from '../types';

export const ClassDetailPage: React.FC = () => {
  const { classId } = useParams({ from: '/_authenticated/academic/classes/$classId' });
  const navigate = useNavigate();
  const { user, activeTenantId: tenantId, activeRole } = useAuth();
  const { isSuperAdmin, can } = usePermission();
  const { data: cls, isLoading, isError, error, refetch } = useClassWithDetails(tenantId, classId);

  const handleBack = () => {
    navigate({ to: '/academic/classes' });
  };

  const queryClient = useQueryClient();

  const invalidateClassData = () => {
    queryClient.invalidateQueries({ queryKey: ['academic_classes'] });
    queryClient.invalidateQueries({ queryKey: ['academic_class_with_details', tenantId, classId] });
  };

  const canManage =
    isSuperAdmin || can('MANAGE_CLASSES_SUBJECTS') || activeRole === 'ADMIN' || activeRole === 'OFFICE_ADMIN';

  const isTeacherOnly = activeRole === 'TEACHER' && !canManage;
  const { data: myAssignments = [], isLoading: isAssignmentsLoading } = useMyTeacherAssignments(
    tenantId,
    { enabled: isTeacherOnly }
  );

  const [activeTab, setActiveTab] = useState<'roster' | 'subjects' | 'assignments' | 'expansion' | 'notices'>('roster');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [selectedStudentForDrawer, setSelectedStudentForDrawer] = useState<AcademicStudent | null>(null);
  const [isPrintRosterOpen, setIsPrintRosterOpen] = useState(false);
  const [isEnrollStudentOpen, setIsEnrollStudentOpen] = useState(false);
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectCode, setNewSubjectCode] = useState('');
  const [subjectToDelete, setSubjectToDelete] = useState<AcademicSubject | null>(null);
  const [sectionToDelete, setSectionToDelete] = useState<AcademicSection | null>(null);
  const [linkParentStudent, setLinkParentStudent] = useState<AcademicStudent | null>(null);
  const [editingStudent, setEditingStudent] = useState<AcademicStudent | null>(null);
  const [changingSectionStudent, setChangingSectionStudent] = useState<AcademicStudent | null>(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);

  const createSubjectMutation = useCreateSubject();
  const deleteSubjectMutation = useDeleteSubject();
  const deleteSectionMutation = useDeleteSection();
  const createSectionMutation = useCreateSection();
  const addStudentMutation = useAddStudent();

  // Fetch assignments and parent mappings for this class
  const { data: classAssignments = [] } = useAssignments(tenantId, { class_id: classId });
  const { data: classParentMappings = [] } = useParentMappings(tenantId, { class_id: classId });

  // Build a lookup of student_id -> parent mapping
  const parentByStudentId = useMemo(() => {
    const map = new Map<string, ParentMappingDTO>();
    for (const m of classParentMappings) map.set(m.student_id, m);
    return map;
  }, [classParentMappings]);

  const allSections = cls?.sections || [];

  // Filter sections for teachers to sections they teach or are assigned as class teacher
  const visibleSections = useMemo(() => {
    if (!isTeacherOnly) return allSections;
    const teacherAssignments = myAssignments.filter((a) => a.class_id === classId);
    if (teacherAssignments.some((a) => !a.section_id)) {
      return allSections;
    }
    const assignedSectionIds = new Set(
      teacherAssignments.map((a) => a.section_id).filter(Boolean)
    );
    if (assignedSectionIds.size === 0) {
      return allSections;
    }
    return allSections.filter((s) => assignedSectionIds.has(s.id));
  }, [allSections, isTeacherOnly, myAssignments, classId]);

  const currentSection =
    visibleSections.find((s) => s.id === selectedSectionId) || visibleSections[0] || null;

  const hasClassTeacherAccess = useMemo(() => {
    if (!isTeacherOnly) return true;
    return myAssignments.some((a) => a.class_id === classId && a.is_class_teacher);
  }, [isTeacherOnly, myAssignments, classId]);

  const hasSubjectTeacherAccess = useMemo(() => {
    if (!isTeacherOnly) return true;
    return myAssignments.some((a) => a.class_id === classId && !a.is_class_teacher);
  }, [isTeacherOnly, myAssignments, classId]);

  const hasClassAccess = hasClassTeacherAccess || hasSubjectTeacherAccess;

  const myAssignedSubjectIdsInThisClass = useMemo(() => {
    return new Set(
      myAssignments
        .filter((a) => a.class_id === classId && a.subject_id)
        .map((a) => a.subject_id as string)
    );
  }, [myAssignments, classId]);

  const myAssignedSubjectNamesInThisClass = useMemo(() => {
    return Array.from(
      new Set(
        myAssignments
          .filter((a) => a.class_id === classId && a.subject_name)
          .map((a) => a.subject_name as string)
      )
    );
  }, [myAssignments, classId]);

  // If teacher only teaches subjects in this class (not class teacher), default to subjects tab
  React.useEffect(() => {
    if (isTeacherOnly && !hasClassTeacherAccess && hasSubjectTeacherAccess) {
      setActiveTab('subjects');
    }
  }, [isTeacherOnly, hasClassTeacherAccess, hasSubjectTeacherAccess]);

  const isClassTeacherForThisClass = useMemo(() => {
    if (!isTeacherOnly) return false;
    return myAssignments.some(
      (a) => a.class_id === classId && a.is_class_teacher && (!a.section_id || a.section_id === currentSection?.id)
    );
  }, [isTeacherOnly, myAssignments, classId, currentSection]);

  const visibleStudentsCount = useMemo(() => {
    if (!isTeacherOnly) return cls?.students.length ?? 0;
    const visibleSecIds = new Set(visibleSections.map((s) => s.id));
    return cls?.students.filter((s) => s.section_id && visibleSecIds.has(s.section_id)).length ?? 0;
  }, [cls?.students, isTeacherOnly, visibleSections]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const { data: dailyStatus } = useDailyAttendanceStatus(tenantId, todayStr, classId, {
    enabled: !!tenantId && !!classId,
  });
  const isCurrentSectionMarkedToday = useMemo(() => {
    if (!currentSection || !dailyStatus) return false;
    return dailyStatus.marked_section_ids.includes(currentSection.id);
  }, [currentSection, dailyStatus]);

  // 1. Tenant guard
  if (!tenantId) {
    return <TenantRequiredState featureName="class rosters and sections" />;
  }

  // 2. Loading state guard
  if (isLoading || (isTeacherOnly && isAssignmentsLoading)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading class details...</p>
      </div>
    );
  }

  // 3. Error state guard
  if (isError) {
    return (
      <ErrorState
        title="Failed to Load Class Details"
        error={error}
        onRetry={() => refetch()}
      />
    );
  }

  // 4. Null guard (true 404) — must be after all hooks and error check
  if (!cls) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <BookOpen className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="space-y-1 max-w-md">
          <h2 className="text-xl font-bold text-foreground">Class Not Found</h2>
          <p className="text-sm text-muted-foreground">
            The class you're looking for doesn't exist or has been removed.
          </p>
        </div>
        <Button onClick={handleBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Classes
        </Button>
      </div>
    );
  }

  // 5. Unauthorized guard (accessible by Class Teachers or Subject Teachers)
  if (isTeacherOnly && !hasClassAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
          <Lock className="w-7 h-7" />
        </div>
        <div className="space-y-1 max-w-md">
          <h2 className="text-xl font-bold text-foreground">Restricted Class Access</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            You are not assigned as a Class Teacher or Subject Teacher for <strong>{cls?.name || 'this class'}</strong>. Class workspaces and curriculum are reserved for designated teaching faculty.
          </p>
        </div>
        <Button onClick={handleBack} variant="outline" className="gap-2 text-xs">
          <ArrowLeft className="w-4 h-4" />
          Return to My Classes
        </Button>
      </div>
    );
  }

  // Use the class data (cls is guaranteed non-null after the guards above)
  const sectionStudents = currentSection
    ? cls.students.filter((st) => st.section_id === currentSection.id)
    : [];

  const filteredSectionStudents = !studentSearchQuery.trim()
    ? sectionStudents
    : sectionStudents.filter((st) => {
        const fullName = [st.first_name, st.middle_name, st.last_name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return fullName.includes(studentSearchQuery.toLowerCase().trim());
      });

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !newSubjectName.trim()) return;
    await createSubjectMutation.mutateAsync({
      tenantId,
      classId: cls.id,
      data: { name: newSubjectName.trim(), code: newSubjectCode.trim() || undefined },
    });
    setNewSubjectName('');
    setNewSubjectCode('');
    setIsAddSubjectOpen(false);
    invalidateClassData();
  };

  const handleDeleteSubject = async (subjectId: string) => {
    if (!tenantId) return;
    await deleteSubjectMutation.mutateAsync({
      tenantId, classId: cls.id, subjectId,
    });
    invalidateClassData();
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!tenantId) return;
    await deleteSectionMutation.mutateAsync({
      tenantId, classId: cls.id, sectionId,
    });
    if (selectedSectionId === sectionId) {
      setSelectedSectionId('');
    }
    invalidateClassData();
  };

  const handleAddStudent = async (sectionId: string, data: any) => {
    if (!tenantId) return;
    await addStudentMutation.mutateAsync({
      tenantId, classId: cls.id, sectionId, data,
    });
    setIsEnrollStudentOpen(false);
    invalidateClassData();
  };

  const handleAddSection = async (classId: string) => {
    if (!tenantId) return;
    await createSectionMutation.mutateAsync({ tenantId, classId });
    setIsAddSectionOpen(false);
    invalidateClassData();
  };

  const handleDownloadCsv = () => {
    const headers = [
      'Roll No',
      'Student Name',
      'Gender',
      'Class',
      'Section',
      'Status',
      'Parent / Guardian Name',
      'Parent Contact Phone',
    ];

    const rows = sectionStudents.map((st, idx) => {
      const fullName = [st.first_name, st.middle_name, st.last_name].filter(Boolean).join(' ');
      const parent = parentByStudentId.get(st.id);
      return [
        idx + 1,
        `"${fullName.replace(/"/g, '""')}"`,
        st.gender || '',
        `"${cls.name.replace(/"/g, '""')}"`,
        currentSection?.name || '',
        st.status,
        parent?.parent_name ? `"${parent.parent_name.replace(/"/g, '""')}"` : '',
        parent?.parent_phone || '',
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `${cls.name.replace(/\s+/g, '_')}_Section_${currentSection?.name || 'All'}_Roster.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            Back to Classes
          </Button>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1.5 rounded-md bg-primary/10 text-primary">
              <BookOpen className="w-4 h-4" />
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              {cls.name}
            </h1>
            {isTeacherOnly && (
              <div className="flex items-center gap-1.5 flex-wrap ml-1">
                {hasClassTeacherAccess && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Class Teacher
                  </span>
                )}
                {hasSubjectTeacherAccess && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                    <BookOpen className="w-3.5 h-3.5" />
                    Subject Teacher: {myAssignedSubjectNamesInThisClass.join(', ')}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {isClassTeacherForThisClass && (
          <div className="flex items-center gap-2">
            <Button
              onClick={() =>
                navigate({
                  to: '/attendance/mark',
                  search: { classId: cls.id, sectionId: currentSection?.id } as any,
                })
              }
              variant={isCurrentSectionMarkedToday ? "outline" : "default"}
              className={`gap-2 shadow-xs cursor-pointer text-xs ${
                isCurrentSectionMarkedToday
                  ? 'border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10'
                  : ''
              }`}
            >
              {isCurrentSectionMarkedToday ? (
                <>
                  <Edit3 className="w-4 h-4" />
                  <span>Update Today's Attendance {currentSection ? `(Sec ${currentSection.name})` : ''}</span>
                </>
              ) : (
                <>
                  <CalendarCheck className="w-4 h-4" />
                  <span>Mark Today's Attendance {currentSection ? `(Sec ${currentSection.name})` : ''}</span>
                </>
              )}
            </Button>
            {isCurrentSectionMarkedToday && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Marked
              </span>
            )}
          </div>
        )}
      </div>

      {/* Quick Metrics */}
      <div className="flex flex-wrap gap-2.5">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary/10 text-primary border border-primary/20 shadow-2xs">
          <Users className="w-3.5 h-3.5" />
          <span>{visibleStudentsCount} Total Students</span>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 shadow-2xs">
          <Layers className="w-3.5 h-3.5" />
          <span>{visibleSections.length} {visibleSections.length === 1 ? 'Section' : 'Sections'}</span>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 shadow-2xs">
          <BookOpen className="w-3.5 h-3.5" />
          <span>{cls.subjects.length} Subjects</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div
        role="tablist"
        aria-label="Class navigation tabs"
        className="p-1 rounded-xl bg-muted/40 border border-border/60 inline-flex flex-wrap gap-1 max-w-full overflow-x-auto"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'roster'}
          onClick={() => setActiveTab('roster')}
          className={cn(
            'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap',
            activeTab === 'roster'
              ? 'bg-card text-foreground shadow-xs font-bold'
              : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
          )}
        >
          <Users className="w-3.5 h-3.5 text-primary" />
          <span>Section Rosters</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-bold ml-1">
            {cls.students.length}
          </Badge>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'subjects'}
          onClick={() => setActiveTab('subjects')}
          className={cn(
            'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap',
            activeTab === 'subjects'
              ? 'bg-card text-foreground shadow-xs font-bold'
              : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
          )}
        >
          <BookOpen className="w-3.5 h-3.5 text-blue-500" />
          <span>Curriculum Subjects</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-bold ml-1">
            {cls.subjects.length}
          </Badge>
        </button>

        {canManage && (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'assignments'}
            onClick={() => setActiveTab('assignments')}
            className={cn(
              'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap',
              activeTab === 'assignments'
                ? 'bg-card text-foreground shadow-xs font-bold'
                : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
            )}
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Teacher Assignments</span>
            {classAssignments.length > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-bold ml-1">
                {classAssignments.length}
              </Badge>
            )}
          </button>
        )}

        {canManage && (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'expansion'}
            onClick={() => setActiveTab('expansion')}
            className={cn(
              'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap',
              activeTab === 'expansion'
                ? 'bg-card text-foreground shadow-xs font-bold'
                : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
            )}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            <span>20-Student Expansion</span>
          </button>
        )}

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'notices'}
          onClick={() => setActiveTab('notices')}
          className={cn(
            'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap',
            activeTab === 'notices'
              ? 'bg-card text-foreground shadow-xs font-bold'
              : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
          )}
        >
          <Bell className="w-3.5 h-3.5 text-amber-500" />
          <span>Noticeboard & Homework</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-6 space-y-5 bg-card rounded-xl border border-border/60">
        {/* Tab 1: Section Rosters */}
        {activeTab === 'roster' && (
          <div className="space-y-4">
            {/* Section Selector Pills */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground mr-1">Section:</span>
                {visibleSections.map((sec) => {
                  const isSelected = currentSection?.id === sec.id;
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => setSelectedSectionId(sec.id)}
                      className={`px-3 py-1 text-xs rounded-lg font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      Section {sec.name} ({sec.student_count ?? 0})
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs shadow-xs cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-primary" />
                      <span>Export Roster</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 text-xs">
                    <DropdownMenuItem
                      onClick={() => setIsPrintRosterOpen(true)}
                      className="gap-2 cursor-pointer font-medium"
                    >
                      <Printer className="w-3.5 h-3.5 text-purple-600" />
                      Print Register Sheet
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleDownloadCsv}
                      className="gap-2 cursor-pointer font-medium"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      Download CSV Roster
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {canManage && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => setIsEnrollStudentOpen(true)}
                      className="h-8 gap-1.5 text-xs shadow-xs"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Enroll Student
                    </Button>
                    {currentSection && allSections.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSectionToDelete(currentSection)}
                        className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                        title="Delete this section"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Section Capacity Visual Progress Bar */}
            {currentSection && (() => {
              const capacityCount = sectionStudents.length;
              const capacityTarget = 20;
              const capacityPercent = Math.min(100, Math.round((capacityCount / capacityTarget) * 100));
              const isCapacityMet = capacityCount >= capacityTarget;

              return (
                <div className="p-3.5 sm:p-4 rounded-xl bg-card border border-border/70 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                    <div className="flex items-center gap-2 font-semibold text-foreground">
                      <Layers className="w-3.5 h-3.5 text-primary" />
                      <span>Section {currentSection.name} Capacity</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground font-mono text-xs">
                        {capacityCount} / {capacityTarget} Students
                      </span>
                      {isCapacityMet ? (
                        <Badge variant="success" className="text-[10px] px-2 py-0 gap-1 font-bold">
                          <Sparkles className="w-3 h-3" />
                          Capacity Met (≥20)
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                          ({capacityTarget - capacityCount} more needed for next section)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        isCapacityMet ? "bg-emerald-500" : "bg-primary"
                      )}
                      style={{ width: `${capacityPercent}%` }}
                    />
                  </div>
                </div>
              );
            })()}

            {/* Roster Search & Count Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  placeholder="Search students in this section..."
                  className="h-9 pl-9 pr-8 text-xs rounded-xl bg-background/80"
                />
                {studentSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setStudentSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
                    aria-label="Clear student search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2 self-end sm:self-center">
                <span>
                  Showing <strong className="text-foreground">{filteredSectionStudents.length}</strong> of{' '}
                  <strong className="text-foreground">{sectionStudents.length}</strong> students
                </span>
              </div>
            </div>

            {/* Students Table */}
            {sectionStudents.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No Students Enrolled"
                description={`Click Enroll Student to register pupils into Section ${currentSection?.name || 'A'}.`}
                action={
                  canManage ? (
                    <Button
                      size="sm"
                      onClick={() => setIsEnrollStudentOpen(true)}
                      className="gap-1.5 text-xs shadow-xs"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Enroll First Student
                    </Button>
                  ) : undefined
                }
              />
            ) : filteredSectionStudents.length === 0 ? (
              <EmptyState
                icon={Search}
                title="No Matching Students"
                description={`No students found matching "${studentSearchQuery}" in Section ${currentSection?.name || 'A'}.`}
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setStudentSearchQuery('')}
                    className="text-xs"
                  >
                    Clear Search Filter
                  </Button>
                }
              />
            ) : (
              <div className="rounded-xl border border-border/60 overflow-hidden shadow-xs">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[60px]">#</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead className="w-[180px]">Parent</TableHead>
                      <TableHead className="w-[120px]">Status</TableHead>
                      <TableHead className="w-[60px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSectionStudents.map((st: AcademicStudent, index: number) => {
                      const fullName = [st.first_name, st.middle_name, st.last_name]
                        .filter(Boolean)
                        .join(' ');
                      const linkedParent = parentByStudentId.get(st.id);
                      return (
                        <TableRow key={st.id} className="hover:bg-muted/40">
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {index + 1}
                          </TableCell>
                          <TableCell
                            onClick={() => setSelectedStudentForDrawer(st)}
                            className="font-semibold text-xs text-foreground cursor-pointer hover:text-primary hover:underline transition-colors"
                          >
                            {fullName}
                          </TableCell>
                          <TableCell>
                            {linkedParent ? (
                              <div className="flex items-center gap-1.5 min-w-0">
                                <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span className="text-xs text-foreground truncate max-w-[140px]">
                                  {linkedParent.parent_name}
                                </span>
                              </div>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10 gap-1 text-[10px] px-1.5 py-0"
                              >
                                <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                                No parent
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={st.status === 'ACTIVE' ? 'success' : 'outline'}
                              className="text-[10px] font-semibold px-2 py-0.5 capitalize"
                            >
                              {st.status.toLowerCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  title="Student actions"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                  <span className="sr-only">Open actions</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52 text-xs">
                                <DropdownMenuItem
                                  onClick={() => setSelectedStudentForDrawer(st)}
                                  className="gap-2 cursor-pointer font-medium"
                                >
                                  <Eye className="w-3.5 h-3.5 text-primary" />
                                  Profile & Observations
                                </DropdownMenuItem>
                                {canManage && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => setEditingStudent(st)}
                                      className="gap-2 cursor-pointer"
                                    >
                                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                                      Edit Student Name
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => setChangingSectionStudent(st)}
                                      className="gap-2 cursor-pointer"
                                      disabled={(cls.sections || []).length <= 1}
                                      title={
                                        (cls.sections || []).length <= 1
                                          ? 'Only one section available in this class'
                                          : undefined
                                      }
                                    >
                                      <ArrowRightLeft className="w-3.5 h-3.5 text-muted-foreground" />
                                      Change Section
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuItem
                                  onClick={() => setLinkParentStudent(st)}
                                  className="gap-2 cursor-pointer"
                                >
                                  <UserCog className="w-3.5 h-3.5" />
                                  {linkedParent ? 'Manage Parent' : 'Associate Parent'}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        {/* Tab: Teacher Assignments */}
        {activeTab === 'assignments' && canManage && (
          <TeacherAssignmentBoard
            cls={cls}
            tenantId={tenantId}
            canManage={canManage}
            initialSectionId={selectedSectionId || cls.sections[0]?.id}
          />
        )}

        {/* Tab 2: Curriculum Subjects */}
        {activeTab === 'subjects' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-foreground">Curriculum Subjects</h3>
                <p className="text-xs text-muted-foreground">
                  Subjects and assigned teaching faculty configured for {cls.name}.
                </p>
              </div>
              {canManage && (
                <Button
                  size="sm"
                  onClick={() => setIsAddSubjectOpen(true)}
                  className="h-8 text-xs gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Subject
                </Button>
              )}
            </div>

            {cls.subjects.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No Subjects Configured"
                description={`Register curriculum subjects taught in ${cls.name}.`}
                action={
                  canManage ? (
                    <Button
                      size="sm"
                      onClick={() => setIsAddSubjectOpen(true)}
                      className="gap-1.5 text-xs shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add First Subject
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cls.subjects.map((sub) => {
                  const isAssignedToMe = myAssignedSubjectIdsInThisClass.has(sub.id);
                  const subjectTeachers = classAssignments
                    .filter((a) => a.subject_id === sub.id && a.teacher_name)
                    .map((a) => a.teacher_name!);
                  const uniqueTeachers = Array.from(new Set(subjectTeachers));

                  return (
                    <div
                      key={sub.id}
                      className={cn(
                        "p-3.5 rounded-xl border transition-all",
                        isAssignedToMe
                          ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20 shadow-xs"
                          : "border-border/60 bg-card shadow-xs hover:border-border"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-bold text-foreground">{sub.name}</p>
                            {isAssignedToMe && (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-semibold text-primary bg-primary/10 border-primary/25 px-2 py-0 gap-1"
                              >
                                <Award className="w-3 h-3 text-primary" />
                                Assigned to You
                              </Badge>
                            )}
                            {sub.code && (
                              <Badge
                                variant="secondary"
                                className="font-mono text-[10px] text-muted-foreground px-1.5 py-0 uppercase"
                              >
                                {sub.code}
                              </Badge>
                            )}
                          </div>

                          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap pt-0.5">
                            <span className="text-muted-foreground/70">Instructor:</span>
                            {uniqueTeachers.length > 0 ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {uniqueTeachers.map((teacherName) => (
                                  <Badge
                                    key={teacherName}
                                    variant="outline"
                                    className="gap-1 text-[10px] font-medium py-0 px-1.5 bg-muted/40 border-border/70 text-foreground"
                                  >
                                    <User className="w-2.5 h-2.5 text-muted-foreground" />
                                    {teacherName}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="italic text-muted-foreground/60 text-xs">No teacher assigned</span>
                            )}
                          </div>
                        </div>

                        {canManage && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSubjectToDelete(sub)}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
                            title="Delete subject"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>

                      {/* Quick Teaching Activities */}
                      {(isAssignedToMe || !isTeacherOnly) && (
                        <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center gap-2 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setActiveTab('notices')}
                            className="h-7 text-[11px] px-2.5 gap-1.5 bg-background/50 hover:bg-background cursor-pointer"
                          >
                            <Bell className="w-3 h-3 text-primary" />
                            Post Homework
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate({ to: '/examination/scores' })}
                            className="h-7 text-[11px] px-2.5 gap-1.5 bg-background/50 hover:bg-background cursor-pointer"
                          >
                            <GraduationCap className="w-3 h-3 text-indigo-500" />
                            Grade Exams
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: 20-Student Expansion Policy */}
        {activeTab === 'expansion' && canManage && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-border/70 bg-card space-y-2">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-primary" />
                SSUP Academic Section Expansion Architecture
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                To maintain optimal student-teacher ratios and prevent empty section fragmentation,
                sections are provisioned sequentially (<strong>Section A → Section B → Section C</strong>).
                A new section can only be unlocked once the previous section reaches <strong>at least 20 enrolled students</strong>.
              </p>
            </div>

            <div className="space-y-2">
              <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Current Class Status
              </h5>
              <div className="space-y-2">
                {allSections.map((sec, idx) => {
                  const count = sec.student_count ?? 0;
                  const isMet = count >= 20;
                  return (
                    <div
                      key={sec.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/20"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                            isMet
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                              : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          {sec.name}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">Section {sec.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {count} enrolled students {idx === 0 ? '(Default section)' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {isMet ? (
                          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            Threshold Met (≥ 20)
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            {20 - count} more needed
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {canManage && (
              <div className="pt-2 flex justify-end">
                <Button
                  size="sm"
                  onClick={() => setIsAddSectionOpen(true)}
                  className="gap-1.5 text-xs shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Check & Add Next Section
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Tab: Noticeboard & Homework */}
        {activeTab === 'notices' && (
          <SectionNoticeboardTab
            tenantId={tenantId}
            classId={cls.id}
            className={cls.name}
            currentSection={currentSection}
            allSections={visibleSections}
            canPostNotice={isClassTeacherForThisClass || canManage}
            currentUserId={user?.id}
            isAdmin={canManage}
          />
        )}
      </div>

      {/* Enroll Student Dialog */}
      <StudentAddDialog
        isOpen={isEnrollStudentOpen}
        onClose={() => setIsEnrollStudentOpen(false)}
        classNameTitle={cls.name}
        sections={visibleSections}
        defaultSectionId={currentSection?.id}
        onSubmit={async (sectionId, data) => {
          await handleAddStudent(sectionId, data);
        }}
        isLoading={addStudentMutation.isPending}
      />

      {/* Associate Parent Dialog */}
      <ParentStudentLinkDialog
        isOpen={!!linkParentStudent}
        onClose={() => setLinkParentStudent(null)}
        tenantId={tenantId}
        student={
          linkParentStudent
            ? {
                id: linkParentStudent.id,
                name: [linkParentStudent.first_name, linkParentStudent.middle_name, linkParentStudent.last_name]
                  .filter(Boolean)
                  .join(' '),
                className: cls.name,
                sectionName: currentSection?.name,
              }
            : null
        }
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['academic_classes'] });
          queryClient.invalidateQueries({ queryKey: [STUDENT_PARENTS_QUERY_KEY] });
          queryClient.invalidateQueries({ queryKey: [PARENT_MAPPINGS_QUERY_KEY] });
        }}
      />

      {/* Edit Student Name Dialog */}
      <EditStudentDialog
        isOpen={!!editingStudent}
        onClose={() => setEditingStudent(null)}
        student={editingStudent}
        classId={cls.id}
        sectionId={editingStudent?.section_id || currentSection?.id || ''}
        tenantId={tenantId}
      />

      {/* Change Student Section Dialog */}
      <ChangeStudentSectionDialog
        isOpen={!!changingSectionStudent}
        onClose={() => setChangingSectionStudent(null)}
        student={changingSectionStudent}
        cls={cls}
        currentSectionId={changingSectionStudent?.section_id || currentSection?.id || ''}
        tenantId={tenantId}
      />

      {/* Add Section Dialog */}
      <SectionAddDialog
        cls={cls}
        tenantId={tenantId}
        isOpen={isAddSectionOpen}
        onClose={() => setIsAddSectionOpen(false)}
        onConfirm={async (classId) => {
          await handleAddSection(classId);
        }}
        isLoading={createSectionMutation.isPending}
      />

      {/* Subject Delete Confirmation Dialog */}
      <Dialog
        open={!!subjectToDelete}
        onOpenChange={(open) => !open && setSubjectToDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-destructive/15 text-destructive flex items-center justify-center mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-foreground">
              Delete Subject
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to remove{' '}
              <span className="font-semibold text-foreground">{subjectToDelete?.name}</span>{' '}
              {subjectToDelete?.code ? `(${subjectToDelete.code})` : ''} from{' '}
              <span className="font-semibold text-foreground">{cls.name}</span>?
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-destructive">Notice:</p>
            <p className="text-[11px]">
              This will remove this subject from the class curriculum and revoke any associated teacher subject assignments.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSubjectToDelete(null)}
              disabled={deleteSubjectMutation.isPending}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={async () => {
                if (subjectToDelete) {
                  await handleDeleteSubject(subjectToDelete.id);
                  setSubjectToDelete(null);
                }
              }}
              disabled={deleteSubjectMutation.isPending}
              className="text-xs"
            >
              {deleteSubjectMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Section Delete Confirmation Dialog */}
      <Dialog
        open={!!sectionToDelete}
        onOpenChange={(open) => !open && setSectionToDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-destructive/15 text-destructive flex items-center justify-center mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-foreground">
              Delete Section: {sectionToDelete?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to permanently delete Section{' '}
              <span className="font-semibold text-foreground">{sectionToDelete?.name}</span> from{' '}
              <span className="font-semibold text-foreground">{cls.name}</span>?
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-xs text-muted-foreground space-y-2">
            <p className="font-semibold text-destructive">Deletion Notice:</p>
            <ul className="list-disc pl-4 space-y-1 text-[11px]">
              <li>
                This section currently has{' '}
                <span className="font-semibold text-foreground">
                  {sectionToDelete ? cls.students.filter((s) => s.section_id === sectionToDelete.id).length : 0}
                </span>{' '}
                enrolled student(s).
              </li>
              <li>Students enrolled in this section will be unassigned from this section roster.</li>
              <li>This action cannot be undone.</li>
            </ul>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSectionToDelete(null)}
              disabled={deleteSectionMutation.isPending}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={async () => {
                if (sectionToDelete) {
                  await handleDeleteSection(sectionToDelete.id);
                  setSectionToDelete(null);
                }
              }}
              disabled={deleteSectionMutation.isPending}
              className="text-xs"
            >
              {deleteSectionMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Subject Modal Dialog */}
      <Dialog open={isAddSubjectOpen} onOpenChange={setIsAddSubjectOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateSubject}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground">
                Add Curriculum Subject
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Register a new subject taught in {cls.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="modal-subject-name" className="text-xs font-semibold text-foreground">
                  Subject Name *
                </Label>
                <Input
                  id="modal-subject-name"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  placeholder="e.g. Environmental Science"
                  className="h-9 text-xs"
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="modal-subject-code" className="text-xs font-semibold text-foreground">
                  Subject Code (Optional)
                </Label>
                <Input
                  id="modal-subject-code"
                  value={newSubjectCode}
                  onChange={(e) => setNewSubjectCode(e.target.value)}
                  placeholder="e.g. ENV10"
                  className="h-9 text-xs font-mono uppercase"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddSubjectOpen(false)}
                disabled={createSubjectMutation.isPending}
                className="text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createSubjectMutation.isPending || !newSubjectName.trim()}
                className="text-xs gap-1.5 cursor-pointer shadow-xs"
              >
                {createSubjectMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                Create Subject
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Student Profile & Teacher Observations Drawer */}
      <StudentDetailDrawer
        student={selectedStudentForDrawer}
        isOpen={!!selectedStudentForDrawer}
        onClose={() => setSelectedStudentForDrawer(null)}
        tenantId={tenantId}
        className={cls.name}
        sectionName={currentSection?.name}
        parentInfo={selectedStudentForDrawer ? parentByStudentId.get(selectedStudentForDrawer.id) : null}
        canAddRemark={isClassTeacherForThisClass || canManage}
        currentUserId={user?.id}
        isAdmin={canManage}
      />

      {/* Printable Roster Register Modal */}
      <PrintableRosterModal
        isOpen={isPrintRosterOpen}
        onClose={() => setIsPrintRosterOpen(false)}
        className={cls.name}
        section={currentSection}
        students={sectionStudents}
        parentMap={parentByStudentId}
      />

    </div>
  );
};
