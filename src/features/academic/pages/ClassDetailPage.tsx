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
  Loader2,
  CalendarCheck,
  Edit3,
  CheckCircle2,
  Printer,
  Download,
  Bell,
  FileSpreadsheet,
  Eye,
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

  const [activeTab, setActiveTab] = useState<'roster' | 'notices' | 'subjects' | 'assignments' | 'expansion'>('roster');
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

  const createSubjectMutation = useCreateSubject();
  const deleteSubjectMutation = useDeleteSubject();
  const deleteSectionMutation = useDeleteSection();
  const createSectionMutation = useCreateSection();
  const addStudentMutation = useAddStudent();

  // Fetch assignments and parent mappings for this class
  const { data: classAssignments = [] } = useAssignments(canManage ? tenantId : null, { class_id: classId });
  const { data: classParentMappings = [] } = useParentMappings(tenantId, { class_id: classId });

  // Build a lookup of student_id -> parent mapping
  const parentByStudentId = useMemo(() => {
    const map = new Map<string, ParentMappingDTO>();
    for (const m of classParentMappings) map.set(m.student_id, m);
    return map;
  }, [classParentMappings]);

  const allSections = cls?.sections || [];

  // Filter sections for teachers to only those where they are designated Class Teacher
  const visibleSections = useMemo(() => {
    if (!isTeacherOnly) return allSections;
    const teacherAssignments = myAssignments.filter(
      (a) => a.class_id === classId && a.is_class_teacher
    );
    if (teacherAssignments.some((a) => !a.section_id)) {
      return allSections;
    }
    const assignedSectionIds = new Set(
      teacherAssignments.map((a) => a.section_id).filter(Boolean)
    );
    return allSections.filter((s) => assignedSectionIds.has(s.id));
  }, [allSections, isTeacherOnly, myAssignments, classId]);

  const currentSection =
    visibleSections.find((s) => s.id === selectedSectionId) || visibleSections[0] || null;

  const hasClassTeacherAccess = useMemo(() => {
    if (!isTeacherOnly) return true;
    return myAssignments.some((a) => a.class_id === classId && a.is_class_teacher);
  }, [isTeacherOnly, myAssignments, classId]);

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

  // 5. Unauthorized guard (only Class Teachers have roster access)
  if (isTeacherOnly && !hasClassTeacherAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
          <Lock className="w-7 h-7" />
        </div>
        <div className="space-y-1 max-w-md">
          <h2 className="text-xl font-bold text-foreground">Restricted Class Access</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            You are not assigned as a Class Teacher for <strong>{cls?.name || 'this class'}</strong>. Class details and student rosters are reserved for designated Class Teachers.
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
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-primary/10 text-primary">
              <BookOpen className="w-4 h-4" />
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              {cls.name}
            </h1>
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
              className={`gap-2 text-white shadow-xs cursor-pointer text-xs ${
                isCurrentSectionMarkedToday
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-purple-600 hover:bg-purple-700'
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
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
          <Users className="w-3.5 h-3.5" />
          {visibleStudentsCount} Total Students
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20">
          <Layers className="w-3.5 h-3.5" />
          {visibleSections.length} {visibleSections.length === 1 ? 'Section' : 'Sections'}
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
          {cls.subjects.length} Subjects
        </span>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-1 border-b border-border/60 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('roster')}
          className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'roster'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Section Rosters
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('notices')}
          className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'notices'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          Noticeboard & Homework
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('subjects')}
          className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'subjects'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Curriculum Subjects ({cls.subjects.length})
        </button>
        {canManage && (
          <button
            type="button"
            onClick={() => setActiveTab('assignments')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'assignments'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Teacher Assignments
            {classAssignments.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                {classAssignments.length}
              </span>
            )}
          </button>
        )}
        {canManage && (
          <button
            type="button"
            onClick={() => setActiveTab('expansion')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'expansion'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            20-Student Expansion
          </button>
        )}
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

            {/* Section Capacity Pill */}
            {currentSection && (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/50 text-xs">
                <span className="text-muted-foreground font-medium">
                  Section {currentSection.name} Capacity:
                </span>
                <span className="font-semibold text-foreground">
                  {sectionStudents.length} / 20 Students{' '}
                  {sectionStudents.length >= 20 ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold ml-1">
                      (Capacity met for next expansion)
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 font-normal ml-1">
                      ({20 - sectionStudents.length} more needed for next section)
                    </span>
                  )}
                </span>
              </div>
            )}

            {/* Students Table */}
            {sectionStudents.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-border/80 text-center space-y-2">
                <Users className="w-8 h-8 text-muted-foreground mx-auto" />
                <p className="text-xs font-semibold text-foreground">No Students Enrolled</p>
                <p className="text-[11px] text-muted-foreground">
                  Click Enroll Student to register pupils into Section {currentSection?.name || 'A'}.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-border/60 overflow-hidden shadow-xs">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[60px]">#</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead className="w-[160px]">Parent</TableHead>
                      <TableHead className="w-[120px]">Status</TableHead>
                      <TableHead className="w-[60px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sectionStudents.map((st: AcademicStudent, index: number) => {
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
                                <span className="text-xs text-foreground truncate max-w-[120px]">
                                  {linkedParent.parent_name}
                                </span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border/60">
                                <AlertTriangle className="w-3 h-3" />
                                No parent
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                              ● {st.status}
                            </span>
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
                              <DropdownMenuContent align="end" className="w-48 text-xs">
                                <DropdownMenuItem
                                  onClick={() => setSelectedStudentForDrawer(st)}
                                  className="gap-2 cursor-pointer font-medium"
                                >
                                  <Eye className="w-3.5 h-3.5 text-primary" />
                                  Profile & Observations
                                </DropdownMenuItem>
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
            {canManage && (
              <form
                onSubmit={handleCreateSubject}
                className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5 p-3.5 rounded-xl border border-border/70 bg-card"
              >
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-semibold text-foreground">Subject Name *</label>
                  <Input
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    placeholder="e.g. Environmental Science"
                    className="h-8 text-xs"
                    required
                  />
                </div>
                <div className="w-full sm:w-36 space-y-1">
                  <label className="text-xs font-semibold text-foreground">Code (Optional)</label>
                  <Input
                    value={newSubjectCode}
                    onChange={(e) => setNewSubjectCode(e.target.value)}
                    placeholder="e.g. ENV10"
                    className="h-8 text-xs font-mono uppercase"
                  />
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={createSubjectMutation.isPending || !newSubjectName.trim()}
                  className="h-8 text-xs gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Subject
                </Button>
              </form>
            )}

            {cls.subjects.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-border/80 text-center space-y-2">
                <BookOpen className="w-8 h-8 text-muted-foreground mx-auto" />
                <p className="text-xs font-semibold text-foreground">No Subjects Configured</p>
                <p className="text-[11px] text-muted-foreground">
                  Register curriculum subjects taught in {cls.name}.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {cls.subjects.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-card shadow-xs"
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-foreground">{sub.name}</p>
                      {sub.code && (
                        <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {sub.code}
                        </span>
                      )}
                    </div>
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSubjectToDelete(sub)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive cursor-pointer"
                        title="Delete subject"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
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
                PBAC Academic Section Expansion Architecture
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
