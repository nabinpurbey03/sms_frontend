import React from 'react';
import {
  BookOpen,
  Layers,
  Users,
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  ArrowRight,
  UserCheck,
  CalendarCheck,
  Edit3,
  CheckCircle2,
  GitCommit,
  GraduationCap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ClassWithDetails } from '../types';

export interface TeacherClassScope {
  isClassTeacher: boolean;
  classTeacherSections: { id: string; name: string }[];
  isSubjectTeacher: boolean;
  subjectNames: string[];
  isTodayAttendanceMarked?: boolean;
}

interface ClassCardProps {
  cls: ClassWithDetails;
  canManage: boolean;
  teacherScope?: TeacherClassScope;
  sequenceIndex?: number;
  totalClasses?: number;
  nextClassName?: string | null;
  isHighestGrade?: boolean;
  onOpenDetails?: (cls: ClassWithDetails) => void;
  onOpenDetailsPage: (clsId: string) => void;
  onAddSection?: (cls: ClassWithDetails) => void;
  onEditClass: (cls: ClassWithDetails) => void;
  onDeleteClass: (cls: ClassWithDetails) => void;
  onMarkAttendance?: (clsId: string, sectionId?: string) => void;
}

export const ClassCard: React.FC<ClassCardProps> = ({
  cls,
  canManage,
  teacherScope,
  sequenceIndex,
  totalClasses,
  nextClassName,
  isHighestGrade,
  onOpenDetailsPage,
  onAddSection,
  onEditClass,
  onDeleteClass,
  onMarkAttendance,
}) => {
  const sections = cls.sections || [];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenDetailsPage(cls.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenDetailsPage(cls.id);
        }
      }}
      className="group flex flex-col justify-between rounded-xl border border-border/70 bg-card p-5 shadow-xs hover:shadow-md hover:border-primary/50 transition-all duration-200 cursor-pointer text-left"
    >
      <div className="space-y-4">
        {/* Card Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <BookOpen className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-base text-foreground tracking-tight group-hover:text-primary transition-colors flex items-center gap-1.5">
                <span>{cls.name}</span>
                <ArrowRight className="w-4 h-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary shrink-0" />
              </h3>
              {(cls.sequence_order !== undefined || sequenceIndex !== undefined) && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-muted border border-border/70 text-muted-foreground">
                  Step #{cls.sequence_order ?? sequenceIndex}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {cls.students.length} students
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                {sections.length} {sections.length === 1 ? 'section' : 'sections'}
              </span>
              <span>·</span>
              <span>{cls.subjects.length} subjects</span>
            </p>
          </div>

          {canManage && (
            <div onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <MoreVertical className="w-4 h-4" />
                    <span className="sr-only">Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 text-xs">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDetailsPage(cls.id);
                    }}
                    className="gap-2 cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    View Details
                  </DropdownMenuItem>
                  {onAddSection && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddSection(cls);
                      }}
                      className="gap-2 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Section
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditClass(cls);
                    }}
                    className="gap-2 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Rename Class
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteClass(cls);
                    }}
                    className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Class
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Teacher Role Badges */}
        {teacherScope && (teacherScope.isClassTeacher || (teacherScope.isSubjectTeacher && teacherScope.subjectNames.length > 0)) && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {teacherScope.isClassTeacher && (
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-medium">
                <UserCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>
                  Class Teacher
                  {teacherScope.classTeacherSections.length > 0
                    ? ` (Sec ${teacherScope.classTeacherSections.map((s) => s.name).join(', ')})`
                    : ' (Class-wide)'}
                </span>
              </div>
            )}
            {teacherScope.isSubjectTeacher && teacherScope.subjectNames.length > 0 && (
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-medium">
                <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>
                  Subject: {teacherScope.subjectNames.slice(0, 2).join(', ')}
                  {teacherScope.subjectNames.length > 2 ? ` +${teacherScope.subjectNames.length - 2}` : ''}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Sections Pills */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Sections Roster
          </p>
          <div className="flex flex-wrap gap-2">
            {sections.length === 0 ? (
              <span className="text-xs text-muted-foreground italic">No sections created</span>
            ) : (
              sections.map((sec) => (
                <div
                  key={sec.id}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/60 bg-muted/30 text-xs font-medium"
                >
                  <span className="font-bold text-foreground">Sec {sec.name}</span>
                  <span className="text-[11px] text-muted-foreground">
                    ({sec.student_count ?? 0} students)
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Progression & Promotion Pathway */}
        <div className="pt-2.5 border-t border-border/50 flex items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
            <GitCommit className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-[11px] font-medium text-foreground shrink-0">Progression:</span>
            <span className="text-[11px] truncate">
              Step #{cls.sequence_order ?? sequenceIndex ?? '—'}
              {totalClasses ? ` of ${totalClasses}` : ''}
            </span>
          </div>
          {isHighestGrade ? (
            <div className="flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/25 shrink-0">
              <GraduationCap className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span>Graduating Cohort</span>
            </div>
          ) : nextClassName ? (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/60 shrink-0">
              <span>Promotes to</span>
              <span className="font-semibold text-foreground">{nextClassName}</span>
              <ArrowRight className="w-2.5 h-2.5 text-primary" />
            </div>
          ) : null}
        </div>
      </div>

      {/* Card Footer (only shown if class teacher attendance action is present) */}
      {teacherScope?.isClassTeacher && (
        <div
          className="pt-3 mt-4 border-t border-border/50 flex items-center justify-between"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2">
            {teacherScope.isTodayAttendanceMarked ? (
              <>
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    const targetSecId = teacherScope.classTeacherSections[0]?.id;
                    onMarkAttendance?.(cls.id, targetSecId);
                  }}
                  className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer h-8"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Update Today's Attendance</span>
                </Button>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Marked
                </span>
              </>
            ) : (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  const targetSecId = teacherScope.classTeacherSections[0]?.id;
                  onMarkAttendance?.(cls.id, targetSecId);
                }}
                className="text-xs gap-1.5 bg-purple-600 hover:bg-purple-700 text-white shadow-xs cursor-pointer h-8"
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>Mark Today's Attendance</span>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
