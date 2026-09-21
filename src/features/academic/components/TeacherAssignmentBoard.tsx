import React, { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  PointerSensor,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  UserCheck,
  BookOpen,
  Search,
  Trash2,
  Plus,
  GripVertical,
  ArrowRightLeft,
  AlertTriangle,
  GraduationCap,
  Layers,
  Sparkles,
  Check,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useMembers } from '@/features/members/hooks';
import type { TenantMember } from '@/features/members/types';
import {
  useAssignments,
  useAssignClassTeacher,
  useAssignSubjectTeacher,
  useDeleteAssignment,
} from '../hooks';
import type { ClassWithDetails, AcademicSubject, TeacherAssignment } from '../types';

export interface TeacherAssignmentBoardProps {
  cls: ClassWithDetails;
  tenantId: string;
  canManage: boolean;
  initialSectionId?: string;
}

interface ReplacementModalState {
  oldTeacherName: string;
  newTeacherName: string;
  targetName: string;
  onConfirm: () => Promise<void>;
}

interface UnassignModalState {
  assignmentId: string;
  teacherName: string;
  targetName: string;
}

interface DirectAssignTarget {
  type: 'class_teacher' | 'subject';
  subject?: AcademicSubject;
}

const getTeacherFullName = (teacher: {
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
}) => {
  return [teacher.first_name, teacher.middle_name, teacher.last_name]
    .filter(Boolean)
    .join(' ');
};

const getInitials = (firstName?: string | null, lastName?: string | null) => {
  const f = firstName?.trim() ? firstName.trim()[0].toUpperCase() : '';
  const l = lastName?.trim() ? lastName.trim()[0].toUpperCase() : '';
  return (f + l) || 'T';
};

// Draggable Teacher Chip Component
interface DraggableTeacherChipProps {
  teacher: TenantMember;
  isOverlay?: boolean;
}

const DraggableTeacherChip: React.FC<DraggableTeacherChipProps> = ({
  teacher,
  isOverlay = false,
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `teacher-${teacher.user_id}`,
    data: { teacher },
  });

  const fullName = getTeacherFullName(teacher);
  const initials = getInitials(teacher.first_name, teacher.last_name);

  if (isOverlay) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary bg-background shadow-xl scale-105 rotate-1 cursor-grabbing ring-2 ring-primary/40 select-none">
        <Avatar className="h-6 w-6 border border-primary/20 bg-primary/10">
          <AvatarFallback className="text-[10px] font-bold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="text-xs font-semibold text-foreground max-w-[140px] truncate">
          {fullName}
        </span>
        <GripVertical className="w-3.5 h-3.5 text-primary" />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      role="button"
      tabIndex={0}
      aria-label={`Drag ${fullName} to assign as teacher`}
      className={`group flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all select-none cursor-grab active:cursor-grabbing ${
        isDragging
          ? 'opacity-30 border-dashed border-primary bg-primary/5 scale-95'
          : 'bg-card border-border/80 hover:border-primary/60 hover:bg-accent/40 shadow-2xs hover:shadow-xs'
      }`}
      title={`${fullName} - Drag to assign`}
    >
      <Avatar className="h-6 w-6 border border-border bg-muted/60">
        <AvatarFallback className="text-[10px] font-bold text-muted-foreground group-hover:text-primary">
          {initials}
        </AvatarFallback>
      </Avatar>
      <span className="text-xs font-medium text-foreground max-w-[130px] truncate">
        {fullName}
      </span>
      <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary/70 transition-colors" />
    </div>
  );
};

// Class Teacher Drop Zone Card Component
interface ClassTeacherDropCardProps {
  cls: ClassWithDetails;
  sectionName?: string;
  assignment?: TeacherAssignment;
  canManage: boolean;
  onAddClick: () => void;
  onUnassignClick: (assignment: TeacherAssignment) => void;
}

const ClassTeacherDropCard: React.FC<ClassTeacherDropCardProps> = ({
  cls,
  sectionName,
  assignment,
  canManage,
  onAddClick,
  onUnassignClick,
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: 'droppable-class-teacher',
  });

  const teacherName = assignment?.teacher_name || 'Class Teacher';
  const nameParts = teacherName.split(' ');
  const initials = getInitials(nameParts[0], nameParts[nameParts.length - 1]);

  return (
    <Card className="overflow-hidden border-border/80 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              Class Teacher
              <span className="text-xs font-normal text-muted-foreground">
                • {cls.name} {sectionName ? `(Section ${sectionName})` : ''}
              </span>
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Manages daily attendance and general administrative records for this class & section
            </p>
          </div>
        </div>
        {canManage && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onAddClick}
            className="h-8 gap-1.5 text-xs hover:border-primary/60 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-primary" />
            Add Teacher
          </Button>
        )}
      </div>

      {/* Droppable Slot */}
      <div className="p-4">
        <div
          ref={setNodeRef}
          className={`relative rounded-xl transition-all duration-200 min-h-[96px] flex items-center justify-center p-4 ${
            isOver
              ? 'border-2 border-primary bg-primary/10 ring-4 ring-primary/20 shadow-md'
              : assignment
              ? 'border border-purple-500/20 bg-purple-500/5'
              : 'border-2 border-dashed border-border/90 bg-muted/15 hover:border-border'
          }`}
        >
          {assignment ? (
            <div className="flex items-center justify-between w-full gap-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11 border-2 border-purple-500/30 bg-purple-500/10">
                  <AvatarFallback className="text-sm font-bold text-purple-700 dark:text-purple-300">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">
                      {teacherName}
                    </span>
                    <Badge variant="purple" className="text-[9px] px-2 py-0.5 font-semibold">
                      Class Teacher
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Authorized to record attendance & oversee class operations
                  </p>
                </div>
              </div>

              {canManage && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onUnassignClick(assignment)}
                    aria-label={`Unassign ${teacherName} from Class Teacher`}
                    className="h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer gap-1.5"
                    title={`Unassign ${teacherName} from Class Teacher`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Unassign
                    <span className="sr-only">Unassign {teacherName} from Class Teacher</span>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-2">
              <div className="p-2 rounded-full bg-muted/60 mb-1.5">
                <GraduationCap className="w-4 h-4 text-muted-foreground/70" />
              </div>
              <p className="text-xs font-semibold text-foreground">
                No class teacher assigned {sectionName ? `to Section ${sectionName}` : ''}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Drag a teacher here or click Add Teacher to assign.
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

// Subject Card Droppable Slot Component
interface SubjectCardProps {
  subject: AcademicSubject;
  assignment?: TeacherAssignment;
  canManage: boolean;
  onAddClick: () => void;
  onUnassignClick: (assignment: TeacherAssignment) => void;
}

const SubjectCard: React.FC<SubjectCardProps> = ({
  subject,
  assignment,
  canManage,
  onAddClick,
  onUnassignClick,
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `droppable-subject-${subject.id}`,
    data: { subject },
  });

  const teacherName = assignment?.teacher_name;
  const initials = teacherName
    ? getInitials(teacherName.split(' ')[0], teacherName.split(' ').slice(-1)[0])
    : 'T';

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border transition-all duration-200 flex flex-col justify-between p-3.5 ${
        isOver
          ? 'border-primary ring-2 ring-primary/30 bg-primary/5 shadow-md scale-[1.01]'
          : assignment
          ? 'border-border/80 bg-card hover:border-border shadow-2xs'
          : 'border-border/60 bg-muted/10 border-dashed hover:border-border/90'
      }`}
    >
      {/* Subject Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-md bg-primary/10 text-primary shrink-0">
            <BookOpen className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-foreground truncate" title={subject.name}>
              {subject.name}
            </h4>
            {subject.code && (
              <span className="text-[10px] text-muted-foreground font-mono block">
                {subject.code}
              </span>
            )}
          </div>
        </div>
        <Badge
          variant="outline"
          className="text-[9px] px-1.5 py-0 text-muted-foreground font-normal shrink-0 border-dashed"
          title="Applies to all sections of this class"
        >
          All Sections
        </Badge>
      </div>

      {/* Assignment Content */}
      {assignment ? (
        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/50 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-7 w-7 shrink-0 border border-border bg-background">
              <AvatarFallback className="text-[10px] font-bold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate" title={teacherName || ''}>
                {teacherName}
              </p>
              <Badge
                variant="outline"
                className="text-[9px] px-2 py-0.5 font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
              >
                Subject Teacher
              </Badge>
            </div>
          </div>

          {canManage && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onUnassignClick(assignment)}
              aria-label={`Unassign ${teacherName || 'teacher'} from ${subject.name}`}
              className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 cursor-pointer"
              title={`Unassign ${teacherName || 'teacher'} from ${subject.name}`}
            >
              <Trash2 className="w-3 h-3" />
              <span className="sr-only">Unassign {teacherName || 'teacher'} from {subject.name}</span>
            </Button>
          )}
        </div>
      ) : (
        <div
          role={canManage ? 'button' : undefined}
          tabIndex={canManage ? 0 : undefined}
          aria-label={canManage ? `Assign teacher to ${subject.name}` : undefined}
          onKeyDown={
            canManage
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onAddClick();
                  }
                }
              : undefined
          }
          onClick={canManage ? onAddClick : undefined}
          className={`flex flex-col items-center justify-center p-3 rounded-lg border border-dashed border-border/70 text-center transition-colors ${
            canManage
              ? 'cursor-pointer hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
              : ''
          }`}
        >
          <span className="text-[11px] font-medium text-muted-foreground">
            Drop a teacher here
          </span>
          {canManage && (
            <span className="text-[10px] text-primary mt-0.5 hover:underline font-medium">
              or click to pick
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export const TeacherAssignmentBoard: React.FC<TeacherAssignmentBoardProps> = ({
  cls,
  tenantId,
  canManage,
  initialSectionId,
}) => {
  // 1. Sections management
  const sections = useMemo(() => cls.sections || [], [cls.sections]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>(() => {
    if (initialSectionId && (cls.sections || []).some((s) => s.id === initialSectionId)) {
      return initialSectionId;
    }
    return cls.sections?.[0]?.id || '';
  });

  const currentSection = useMemo(() => {
    return sections.find((s) => s.id === selectedSectionId) || sections[0] || null;
  }, [sections, selectedSectionId]);

  const activeSectionId = currentSection?.id;

  // 2. Teacher roster & assignments data
  const { data: members = [] } = useMembers(tenantId, 'TEACHER');
  const teachers = useMemo(() => {
    return members.filter((m) => m.roles.includes('TEACHER') && m.is_active);
  }, [members]);

  const { data: assignments = [] } = useAssignments(tenantId, { class_id: cls.id });

  // 3. Mutations
  const assignClassTeacherMutation = useAssignClassTeacher();
  const assignSubjectTeacherMutation = useAssignSubjectTeacher();
  const deleteAssignmentMutation = useDeleteAssignment();

  // 4. Local state for drag, search, modals
  const [teacherSearch, setTeacherSearch] = useState('');
  const [activeTeacher, setActiveTeacher] = useState<TenantMember | null>(null);

  // Replacement confirmation state
  const [replacementModal, setReplacementModal] = useState<ReplacementModalState | null>(null);
  const [isReplacing, setIsReplacing] = useState(false);

  // Unassign confirmation state
  const [unassignModal, setUnassignModal] = useState<UnassignModalState | null>(null);
  const [isUnassigning, setIsUnassigning] = useState(false);

  // Direct manual assign picker state
  const [directAssignTarget, setDirectAssignTarget] = useState<DirectAssignTarget | null>(null);
  const [directAssignSearch, setDirectAssignSearch] = useState('');

  // Tip banner dismiss state (persisted in localStorage)
  const [isTipDismissed, setIsTipDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('schools_up_teacher_assignment_tip_dismissed') === 'true';
    } catch {
      return false;
    }
  });

  const dismissTip = useCallback(() => {
    setIsTipDismissed(true);
    try {
      localStorage.setItem('schools_up_teacher_assignment_tip_dismissed', 'true');
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Sensors for dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Filtered teachers for pool
  const filteredTeachers = useMemo(() => {
    const q = teacherSearch.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter((t) => {
      const name = getTeacherFullName(t).toLowerCase();
      const email = (t.email || '').toLowerCase();
      const phone = (t.phone || '').toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [teachers, teacherSearch]);

  // Active Class Teacher Assignment for active section (section-specific or class-wide)
  const currentClassTeacherAssignment = useMemo(() => {
    const sectionSpecific = assignments.find(
      (a) => a.is_class_teacher && activeSectionId && a.section_id === activeSectionId
    );
    if (sectionSpecific) return sectionSpecific;
    return assignments.find((a) => a.is_class_teacher && !a.section_id);
  }, [assignments, activeSectionId]);

  // Subject Assignment lookup for active class (class-wide across all sections)
  const getSubjectAssignment = useCallback(
    (subjectId: string) => {
      // Find any assignment for this subject in this class
      return assignments.find(
        (a) => !a.is_class_teacher && a.subject_id === subjectId
      );
    },
    [assignments]
  );

  // 5. Assignment execution handlers
  const assignClassTeacherDirect = async (teacher: TenantMember) => {
    await assignClassTeacherMutation.mutateAsync({
      tenantId,
      classId: cls.id,
      data: {
        teacher_id: teacher.user_id,
        section_id: activeSectionId || undefined,
      },
    });
    dismissTip();
  };

  const assignSubjectTeacherDirect = async (teacher: TenantMember, subjectId: string) => {
    await assignSubjectTeacherMutation.mutateAsync({
      tenantId,
      classId: cls.id,
      subjectId,
      data: {
        teacher_id: teacher.user_id,
        section_id: undefined, // Class-wide: applies to all sections
      },
    });
    dismissTip();
  };

  // Replacement executor: Deletes old assignment first, then appoints new teacher
  const handleExecuteReplacement = async (
    oldAssignmentId: string,
    assignFn: () => Promise<unknown>
  ) => {
    try {
      setIsReplacing(true);
      await deleteAssignmentMutation.mutateAsync({
        tenantId,
        assignmentId: oldAssignmentId,
      });
      await assignFn();
      setReplacementModal(null);
    } catch {
      // Handled in mutation onError
    } finally {
      setIsReplacing(false);
    }
  };

  // Drag event handlers
  const handleDragStart = (event: DragStartEvent) => {
    const teacher = event.active.data.current?.teacher as TenantMember | undefined;
    if (teacher) {
      setActiveTeacher(teacher);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTeacher(null);
    const { active, over } = event;
    if (!over || !canManage) return;

    const droppedTeacher = active.data.current?.teacher as TenantMember | undefined;
    if (!droppedTeacher) return;

    const droppedTeacherName = getTeacherFullName(droppedTeacher);
    const overId = String(over.id);

    // Dropped on Class Teacher slot
    if (overId === 'droppable-class-teacher') {
      const existing = currentClassTeacherAssignment;
      const targetName = `${cls.name}${currentSection ? ` (Section ${currentSection.name})` : ''} Class Teacher`;

      if (!existing) {
        // Immediately assign if slot is empty
        assignClassTeacherDirect(droppedTeacher);
      } else if (existing.teacher_id === droppedTeacher.user_id) {
        toast.info(`${droppedTeacherName} is already appointed as Class Teacher.`);
      } else {
        // Show replacement confirmation dialog
        const oldTeacherName = existing.teacher_name || 'Current Class Teacher';
        setReplacementModal({
          oldTeacherName,
          newTeacherName: droppedTeacherName,
          targetName,
          onConfirm: async () => {
            await handleExecuteReplacement(existing.id, () =>
              assignClassTeacherDirect(droppedTeacher)
            );
          },
        });
      }
      return;
    }

    // Dropped on a Subject card
    if (overId.startsWith('droppable-subject-')) {
      const subjectId = overId.replace('droppable-subject-', '');
      const subject =
        cls.subjects?.find((s) => s.id === subjectId) ||
        (over.data.current?.subject as AcademicSubject | undefined);

      if (!subject) return;

      const existing = getSubjectAssignment(subject.id);
      const targetName = `${subject.name} (All Sections)`;

      if (!existing) {
        // Immediately assign if slot is empty
        assignSubjectTeacherDirect(droppedTeacher, subject.id);
      } else if (existing.teacher_id === droppedTeacher.user_id) {
        toast.info(`${droppedTeacherName} is already assigned to teach ${subject.name}.`);
      } else {
        // Show replacement confirmation dialog
        const oldTeacherName = existing.teacher_name || 'Current Subject Teacher';
        setReplacementModal({
          oldTeacherName,
          newTeacherName: droppedTeacherName,
          targetName,
          onConfirm: async () => {
            await handleExecuteReplacement(existing.id, () =>
              assignSubjectTeacherDirect(droppedTeacher, subject.id)
            );
          },
        });
      }
    }
  };

  // Direct Teacher Selection via Modal / Point-and-Click
  const handleSelectTeacherDirect = (teacher: TenantMember) => {
    if (!directAssignTarget || !canManage) return;

    const teacherName = getTeacherFullName(teacher);

    if (directAssignTarget.type === 'class_teacher') {
      const existing = currentClassTeacherAssignment;
      const targetName = `${cls.name}${currentSection ? ` (Section ${currentSection.name})` : ''} Class Teacher`;

      if (!existing) {
        assignClassTeacherDirect(teacher);
        setDirectAssignTarget(null);
      } else if (existing.teacher_id === teacher.user_id) {
        toast.info(`${teacherName} is already the Class Teacher.`);
        setDirectAssignTarget(null);
      } else {
        // Replace confirmation
        const oldTeacherName = existing.teacher_name || 'Current Class Teacher';
        setDirectAssignTarget(null);
        setReplacementModal({
          oldTeacherName,
          newTeacherName: teacherName,
          targetName,
          onConfirm: async () => {
            await handleExecuteReplacement(existing.id, () =>
              assignClassTeacherDirect(teacher)
            );
          },
        });
      }
    } else if (directAssignTarget.type === 'subject' && directAssignTarget.subject) {
      const subject = directAssignTarget.subject;
      const existing = getSubjectAssignment(subject.id);
      const targetName = `${subject.name} (All Sections)`;

      if (!existing) {
        assignSubjectTeacherDirect(teacher, subject.id);
        setDirectAssignTarget(null);
      } else if (existing.teacher_id === teacher.user_id) {
        toast.info(`${teacherName} is already assigned to teach ${subject.name}.`);
        setDirectAssignTarget(null);
      } else {
        // Replace confirmation
        const oldTeacherName = existing.teacher_name || 'Current Subject Teacher';
        setDirectAssignTarget(null);
        setReplacementModal({
          oldTeacherName,
          newTeacherName: teacherName,
          targetName,
          onConfirm: async () => {
            await handleExecuteReplacement(existing.id, () =>
              assignSubjectTeacherDirect(teacher, subject.id)
            );
          },
        });
      }
    }
  };

  // Unassign execution
  const handleConfirmUnassign = async () => {
    if (!unassignModal) return;
    try {
      setIsUnassigning(true);
      await deleteAssignmentMutation.mutateAsync({
        tenantId,
        assignmentId: unassignModal.assignmentId,
      });
      setUnassignModal(null);
    } catch {
      // Handled in mutation onError
    } finally {
      setIsUnassigning(false);
    }
  };

  // Direct assign filtered teachers
  const directFilteredTeachers = useMemo(() => {
    const q = directAssignSearch.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter((t) => {
      const name = getTeacherFullName(t).toLowerCase();
      const email = (t.email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [teachers, directAssignSearch]);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        {/* 1. Class Teacher Card */}
        <ClassTeacherDropCard
          cls={cls}
          sectionName={currentSection?.name}
          assignment={currentClassTeacherAssignment}
          canManage={canManage}
          onAddClick={() => {
            setDirectAssignSearch('');
            setDirectAssignTarget({ type: 'class_teacher' });
          }}
          onUnassignClick={(assignment) => {
            setUnassignModal({
              assignmentId: assignment.id,
              teacherName: assignment.teacher_name || 'Class Teacher',
              targetName: `${cls.name} Class Teacher`,
            });
          }}
        />

        {/* 2. Section Switcher */}
        {sections.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Class Sections ({sections.length})
                </h3>
              </div>
              <span className="text-[11px] text-muted-foreground">
                Select a section to manage section-specific teacher assignments
              </span>
            </div>

            {/* Wraps up to 3 rows, scrollable after max-h-[136px] */}
            <div className="flex flex-wrap gap-2 max-h-[136px] overflow-y-auto p-1 rounded-xl bg-muted/20 border border-border/50">
              {sections.map((sec) => {
                const isSelected = activeSectionId === sec.id;
                const studentCount = sec.student_count ?? 0;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setSelectedSectionId(sec.id)}
                    title={`${studentCount} enrolled students in Section ${sec.name}`}
                    className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'bg-card text-muted-foreground border border-border/70 hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <span>Section {sec.name}</span>
                    {sec.student_count !== undefined && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          isSelected
                            ? 'bg-primary-foreground/20 text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {sec.student_count} {sec.student_count === 1 ? 'student' : 'students'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Teacher Pool */}
        <div className="space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Faculty Teachers Pool ({teachers.length})
              </h3>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                type="text"
                value={teacherSearch}
                onChange={(e) => setTeacherSearch(e.target.value)}
                placeholder="Search teachers by name..."
                className="h-8 pl-8 pr-8 text-xs bg-card"
              />
              {teacherSearch && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setTeacherSearch('')}
                  aria-label="Clear teacher search"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span className="sr-only">Clear teacher search</span>
                </Button>
              )}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-border/60 bg-muted/15 min-h-[76px] flex flex-wrap gap-2 items-center">
            {filteredTeachers.length === 0 ? (
              <p className="text-xs text-muted-foreground italic px-1">
                {teachers.length === 0
                  ? 'No active teachers found in faculty roster. Add members with the TEACHER role first.'
                  : 'No teachers match your search filter.'}
              </p>
            ) : (
              filteredTeachers.map((teacher) => (
                <DraggableTeacherChip key={teacher.user_id} teacher={teacher} />
              ))
            )}
          </div>

          {!isTipDismissed && (
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-primary/20 bg-primary/5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate sm:overflow-visible sm:whitespace-normal">
                  Tip: Drag any teacher chip onto the Class Teacher card or any Subject card below, or click an empty card to assign.
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={dismissTip}
                className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                aria-label="Dismiss teacher assignment tip"
              >
                <X className="w-3.5 h-3.5" />
                <span className="sr-only">Dismiss teacher assignment tip</span>
              </Button>
            </div>
          )}
        </div>

        {/* 4. Subjects Grid */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Curriculum Subjects ({cls.subjects?.length || 0})
              </h3>
            </div>
            <span className="text-[11px] text-muted-foreground font-medium">
              Shared across all sections
            </span>
          </div>

          {(!cls.subjects || cls.subjects.length === 0) ? (
            <div className="p-8 rounded-xl border border-dashed border-border text-center">
              <BookOpen className="w-8 h-8 mx-auto text-muted-foreground/60 mb-2" />
              <p className="text-xs font-semibold text-foreground">
                No subjects configured for this class
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Add subjects to this class first to assign subject teachers.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5">
              {cls.subjects.map((subject) => {
                const subjectAssignment = getSubjectAssignment(subject.id);
                return (
                  <SubjectCard
                    key={subject.id}
                    subject={subject}
                    assignment={subjectAssignment}
                    canManage={canManage}
                    onAddClick={() => {
                      setDirectAssignSearch('');
                      setDirectAssignTarget({ type: 'subject', subject });
                    }}
                    onUnassignClick={(assignment) => {
                      setUnassignModal({
                        assignmentId: assignment.id,
                        teacherName: assignment.teacher_name || 'Subject Teacher',
                        targetName: `${subject.name} (All Sections)`,
                      });
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Drag Overlay for smooth floating chip */}
      <DragOverlay dropAnimation={null}>
        {activeTeacher ? (
          <DraggableTeacherChip teacher={activeTeacher} isOverlay />
        ) : null}
      </DragOverlay>

      {/* 5. Replacement Confirmation Dialog */}
      <Dialog
        open={!!replacementModal}
        onOpenChange={(open) => {
          if (!open && !isReplacing) {
            setReplacementModal(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Replace Teacher Assignment?
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  An existing teacher is currently assigned to this slot.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {replacementModal && (
            <div className="space-y-3 py-2">
              <p className="text-sm text-foreground">
                Replace <span className="font-bold text-destructive">{replacementModal.oldTeacherName}</span> with{' '}
                <span className="font-bold text-primary">{replacementModal.newTeacherName}</span> for{' '}
                <span className="font-semibold">{replacementModal.targetName}</span>?
              </p>
              <p className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg border border-border/60">
                Confirming will remove the current assignment and appoint the new teacher immediately.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setReplacementModal(null)}
              disabled={isReplacing}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => replacementModal?.onConfirm()}
              disabled={isReplacing}
              className="gap-1.5"
            >
              {isReplacing ? 'Replacing...' : 'Confirm Replacement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unassign Confirmation Dialog */}
      <Dialog
        open={!!unassignModal}
        onOpenChange={(open) => {
          if (!open && !isUnassigning) {
            setUnassignModal(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-destructive/10 text-destructive border border-destructive/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Remove Teacher Assignment
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Are you sure you want to remove this assignment?
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {unassignModal && (
            <div className="py-2">
              <p className="text-sm text-foreground">
                Are you sure you want to unassign{' '}
                <span className="font-bold">{unassignModal.teacherName}</span> from{' '}
                <span className="font-semibold">{unassignModal.targetName}</span>?
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setUnassignModal(null)}
              disabled={isUnassigning}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmUnassign}
              disabled={isUnassigning}
            >
              {isUnassigning ? 'Removing...' : 'Remove Assignment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. Direct / Manual "Add Teacher" Picker Dialog */}
      <Dialog
        open={!!directAssignTarget}
        onOpenChange={(open) => {
          if (!open) setDirectAssignTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                {directAssignTarget?.type === 'class_teacher' ? (
                  <UserCheck className="w-5 h-5" />
                ) : (
                  <BookOpen className="w-5 h-5" />
                )}
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  {directAssignTarget?.type === 'class_teacher'
                    ? 'Appoint Class Teacher'
                    : `Assign Teacher: ${directAssignTarget?.subject?.name || 'Subject'}`}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {currentSection
                    ? `For Section ${currentSection.name}`
                    : 'Select a teacher from the faculty roster'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search teacher by name or email..."
                value={directAssignSearch}
                onChange={(e) => setDirectAssignSearch(e.target.value)}
                className="pl-8 pr-8 text-xs h-9"
                autoFocus
              />
              {directAssignSearch && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setDirectAssignSearch('')}
                  aria-label="Clear teacher search"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span className="sr-only">Clear teacher search</span>
                </Button>
              )}
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 divide-y divide-border/40">
              {directFilteredTeachers.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No matching teachers found.
                </div>
              ) : (
                directFilteredTeachers.map((teacher) => {
                  const fullName = getTeacherFullName(teacher);
                  const initials = getInitials(teacher.first_name, teacher.last_name);

                  const isCurrent =
                    directAssignTarget?.type === 'class_teacher'
                      ? currentClassTeacherAssignment?.teacher_id === teacher.user_id
                      : directAssignTarget?.subject
                      ? getSubjectAssignment(directAssignTarget.subject.id)?.teacher_id ===
                        teacher.user_id
                      : false;

                  return (
                    <div
                      key={teacher.user_id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors pt-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar className="h-8 w-8 border border-border">
                          <AvatarFallback className="text-xs font-bold text-muted-foreground">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {fullName}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {teacher.email}
                          </p>
                        </div>
                      </div>

                      {isCurrent ? (
                        <Badge variant="outline" className="text-[10px] gap-1 text-primary border-primary/40">
                          <Check className="w-3 h-3" /> Current
                        </Badge>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleSelectTeacherDirect(teacher)}
                          className="h-7 text-xs hover:border-primary/60 hover:text-primary cursor-pointer"
                        >
                          Select
                        </Button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDirectAssignTarget(null)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DndContext>
  );
};
