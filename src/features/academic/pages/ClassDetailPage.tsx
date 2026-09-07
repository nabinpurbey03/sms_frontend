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
import { Card } from '@/components/ui/card';
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
  CalendarCheck,
  X,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import {
  useCreateSubject,
  useDeleteSubject,
  useDeleteSection,
  useCreateSection,
  useAddStudent,
  useAssignments,
  useDeleteAssignment,
} from '../hooks';
import { AssignTeacherDialog } from '../components/AssignTeacherDialog';
import { StudentAddDialog } from '../components/StudentAddDialog';
import { SectionAddDialog } from '../components/SectionAddDialog';
import { ParentStudentLinkDialog } from '@/features/members/components/ParentStudentLinkDialog';
import {
  STUDENT_PARENTS_QUERY_KEY,
  PARENT_MAPPINGS_QUERY_KEY,
  useParentMappings,
} from '@/features/members/hooks';
import type { ParentMappingDTO } from '@/features/members/types';
import type { ClassWithDetails, AcademicStudent, AcademicSubject, AcademicSection } from '../types';

interface ClassDetailPageProps {
  cls: ClassWithDetails;
  tenantId: string | null;
  onBack: () => void;
}

export const ClassDetailPage: React.FC<ClassDetailPageProps> = ({
  cls,
  tenantId,
  onBack,
}) => {
  const { activeRole } = useAuth();
  const { isSuperAdmin, can } = usePermission();
  const queryClient = useQueryClient();

  const canManage =
    isSuperAdmin || can('MANAGE_CLASSES_SUBJECTS') || activeRole === 'ADMIN' || activeRole === 'OFFICE_ADMIN';

  const [activeTab, setActiveTab] = useState<'roster' | 'subjects' | 'assignments' | 'expansion'>('roster');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [isEnrollStudentOpen, setIsEnrollStudentOpen] = useState(false);
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectCode, setNewSubjectCode] = useState('');
  const [subjectToDelete, setSubjectToDelete] = useState<AcademicSubject | null>(null);
  const [sectionToDelete, setSectionToDelete] = useState<AcademicSection | null>(null);
  const [linkParentStudent, setLinkParentStudent] = useState<AcademicStudent | null>(null);
  const [isAssignTeacherOpen, setIsAssignTeacherOpen] = useState(false);
  const [assignmentMode, setAssignmentMode] = useState<'subject' | 'class_teacher'>('class_teacher');
  const [selectedSubjectForAssignment, setSelectedSubjectForAssignment] = useState<string | null>(null);
  const [_selectedSectionForAssignment, setSelectedSectionForAssignment] = useState<string | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<any>(null);

  const createSubjectMutation = useCreateSubject();
  const deleteSubjectMutation = useDeleteSubject();
  const deleteSectionMutation = useDeleteSection();
  const createSectionMutation = useCreateSection();
  const addStudentMutation = useAddStudent();
  const deleteAssignmentMutation = useDeleteAssignment();

  // Fetch assignments for this class
  const { data: classAssignments = [] } = useAssignments(tenantId, { class_id: cls.id });

  // Fetch parent mappings for this class to show linked/unlinked status per student
  const { data: classParentMappings = [] } = useParentMappings(tenantId, { class_id: cls.id });

  // Build a lookup of student_id -> parent mapping
  const parentByStudentId = useMemo(() => {
    const map = new Map<string, ParentMappingDTO>();
    for (const m of classParentMappings) map.set(m.student_id, m);
    return map;
  }, [classParentMappings]);

  // Use the passed-in class data; mutations will trigger refetch via the parent's query
  const sections = cls.sections || [];
  const currentSection =
    sections.find((s) => s.id === selectedSectionId) || sections[0] || null;
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
    // Invalidate parent query so ClassesPage sees the update
    queryClient.invalidateQueries({ queryKey: ['academic_classes'] });
  };

  const handleDeleteSubject = async (subjectId: string) => {
    if (!tenantId) return;
    await deleteSubjectMutation.mutateAsync({
      tenantId, classId: cls.id, subjectId,
    });
    queryClient.invalidateQueries({ queryKey: ['academic_classes'] });
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!tenantId) return;
    await deleteSectionMutation.mutateAsync({
      tenantId, classId: cls.id, sectionId,
    });
    if (selectedSectionId === sectionId) {
      setSelectedSectionId('');
    }
    queryClient.invalidateQueries({ queryKey: ['academic_classes'] });
  };

  const handleAddStudent = async (sectionId: string, data: any) => {
    if (!tenantId) return;
    await addStudentMutation.mutateAsync({
      tenantId, classId: cls.id, sectionId, data,
    });
    setIsEnrollStudentOpen(false);
    queryClient.invalidateQueries({ queryKey: ['academic_classes'] });
  };

  const handleAddSection = async (classId: string) => {
    if (!tenantId) return;
    await createSectionMutation.mutateAsync({ tenantId, classId });
    setIsAddSectionOpen(false);
    queryClient.invalidateQueries({ queryKey: ['academic_classes'] });
  };

  if (!cls) return null;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
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
      </div>

      {/* Quick Metrics */}
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
          <Users className="w-3.5 h-3.5" />
          {cls.students.length} Total Students
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20">
          <Layers className="w-3.5 h-3.5" />
          {sections.length} {sections.length === 1 ? 'Section' : 'Sections'}
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
                {sections.map((sec) => {
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

              {canManage && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => setIsEnrollStudentOpen(true)}
                    className="h-8 gap-1.5 text-xs shadow-xs"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Enroll Student
                  </Button>
                  {currentSection && sections.length > 1 && (
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
                </div>
              )}
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
                          <TableCell className="font-semibold text-xs text-foreground">
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
                              <DropdownMenuContent align="end" className="w-44 text-xs">
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

        {/* Tab 3: Teacher Assignments */}
        {activeTab === 'assignments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Faculty Teaching Assignments</h3>
              </div>
              {canManage && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setAssignmentMode('class_teacher');
                      setSelectedSectionForAssignment(null);
                      setIsAssignTeacherOpen(true);
                    }}
                    className="gap-1.5 text-xs"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Appoint Class Teacher
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setAssignmentMode('subject');
                      setSelectedSubjectForAssignment(null);
                      setIsAssignTeacherOpen(true);
                    }}
                    className="gap-1.5 text-xs"
                    disabled={cls.subjects.length === 0}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Assign Subject Teacher
                  </Button>
                </div>
              )}
            </div>

            {/* Class Teacher Assignments */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Class Teachers
              </h4>
              {classAssignments.filter(a => a.is_class_teacher).length === 0 ? (
                <div className="p-6 rounded-xl border border-dashed border-border/80 text-center">
                  <UserCheck className="w-8 h-8 mx-auto text-muted-foreground/60 mb-2" />
                  <p className="text-xs font-semibold text-foreground">No Class Teachers Assigned</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Appoint a class teacher to grant attendance marking privileges for this class.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {classAssignments.filter(a => a.is_class_teacher).map(assignment => (
                    <Card key={assignment.id} className="p-4 bg-purple-500/5 border-purple-500/20">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-purple-500/10">
                            <UserCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground">
                              {assignment.teacher_name || 'Assigned Teacher'}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {assignment.section_name
                                ? `Section ${assignment.section_name}`
                                : 'All Sections'}
                            </p>
                          </div>
                        </div>
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setAssignmentToDelete(assignment)}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                      <div className="mt-2 pt-2 border-t border-purple-500/10">
                        <span className="text-[10px] font-medium text-purple-600 dark:text-purple-400 flex items-center gap-1">
                          <CalendarCheck className="w-3 h-3" />
                          Can Mark Attendance
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Subject Teacher Assignments */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Subject Teachers
              </h4>
              {classAssignments.filter(a => !a.is_class_teacher).length === 0 ? (
                <div className="p-6 rounded-xl border border-dashed border-border/80 text-center">
                  <BookOpen className="w-8 h-8 mx-auto text-muted-foreground/60 mb-2" />
                  <p className="text-xs font-semibold text-foreground">No Subject Teachers Assigned</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Assign teachers to teach subjects in this class.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cls.subjects.map(subject => {
                    const subjectAssignments = classAssignments.filter(
                      a => !a.is_class_teacher && a.subject_id === subject.id
                    );
                    return (
                      <Card key={subject.id} className="p-4 bg-card border-border/60">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <BookOpen className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-foreground">{subject.name}</p>
                              {subject.code && (
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {subject.code}
                                </span>
                              )}
                            </div>
                          </div>
                          {canManage && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setAssignmentMode('subject');
                                setSelectedSubjectForAssignment(subject.id);
                                setIsAssignTeacherOpen(true);
                              }}
                              className="h-7 text-xs gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              Assign
                            </Button>
                          )}
                        </div>
                        {subjectAssignments.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic pl-9">
                            No teacher assigned yet
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2 pl-9">
                            {subjectAssignments.map(assignment => (
                              <div
                                key={assignment.id}
                                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-primary/5 border border-primary/10"
                              >
                                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                                  {(assignment.teacher_name || 'T')[0].toUpperCase()}
                                </div>
                                <span className="text-xs font-medium text-foreground">
                                  {assignment.teacher_name || 'Teacher'}
                                </span>
                                {assignment.section_name && (
                                  <span className="text-[10px] text-muted-foreground">
                                    • {assignment.section_name}
                                  </span>
                                )}
                                {canManage && (
                                  <button
                                    type="button"
                                    onClick={() => setAssignmentToDelete(assignment)}
                                    className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
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
        {activeTab === 'expansion' && (
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
                {sections.map((sec, idx) => {
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
        sections={sections}
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

      {/* Assignment Delete Confirmation Dialog */}
      <Dialog
        open={!!assignmentToDelete}
        onOpenChange={(open) => !open && setAssignmentToDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-destructive/15 text-destructive flex items-center justify-center mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-foreground">
              Remove Teacher Assignment
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to remove{' '}
              <span className="font-semibold text-foreground">{assignmentToDelete?.teacher_name}</span>{' '}
              from{' '}
              <span className="font-semibold text-foreground">
                {assignmentToDelete?.is_class_teacher
                  ? `Class Teacher for ${cls.name}`
                  : `${assignmentToDelete?.subject_name || 'Subject'} in ${cls.name}`}
              </span>?
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 space-y-1">
            <p className="font-semibold">Note:</p>
            <p className="text-[11px]">
              {assignmentToDelete?.is_class_teacher
                ? 'This teacher will no longer be able to mark attendance for this class/section.'
                : 'This teacher will no longer be assigned to teach this subject.'}
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAssignmentToDelete(null)}
              disabled={deleteAssignmentMutation.isPending}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={async () => {
                if (assignmentToDelete && tenantId) {
                  await deleteAssignmentMutation.mutateAsync({
                    tenantId,
                    assignmentId: assignmentToDelete.id,
                  });
                  setAssignmentToDelete(null);
                }
              }}
              disabled={deleteAssignmentMutation.isPending}
              className="text-xs"
            >
              {deleteAssignmentMutation.isPending ? 'Removing...' : 'Remove Assignment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Teacher Dialog */}
      <AssignTeacherDialog
        isOpen={isAssignTeacherOpen}
        onClose={() => {
          setIsAssignTeacherOpen(false);
          setSelectedSubjectForAssignment(null);
          setSelectedSectionForAssignment(null);
        }}
        classes={[cls]}
        tenantId={tenantId}
        initialMode={assignmentMode}
        defaultClassId={cls.id}
        defaultSubjectId={selectedSubjectForAssignment || undefined}
      />
    </div>
  );
};
