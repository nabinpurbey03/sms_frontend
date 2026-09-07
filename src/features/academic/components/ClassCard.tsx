import React from 'react';
import {
  BookOpen,
  Layers,
  Users,
  Plus,
  Lock,
  Sparkles,
  MoreVertical,
  Edit2,
  Trash2,
  ArrowRight,
  UserCheck,
  CalendarCheck,
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
}

interface ClassCardProps {
  cls: ClassWithDetails;
  canManage: boolean;
  teacherScope?: TeacherClassScope;
  onOpenDetails: (cls: ClassWithDetails) => void;
  onOpenDetailsPage: (clsId: string) => void; // New prop for page navigation
  onAddSection: (cls: ClassWithDetails) => void;
  onEditClass: (cls: ClassWithDetails) => void;
  onDeleteClass: (cls: ClassWithDetails) => void;
  onMarkAttendance?: (clsId: string, sectionId?: string) => void;
}

export const ClassCard: React.FC<ClassCardProps> = ({
  cls,
  canManage,
  teacherScope,
  onOpenDetails,
  onOpenDetailsPage,
  onAddSection,
  onEditClass,
  onDeleteClass,
  onMarkAttendance,
}) => {
  const sections = cls.sections || [];
  const lastSection = sections.length > 0 ? sections[sections.length - 1] : null;
  const lastSectionStudentCount = lastSection?.student_count ?? 0;
  const isEligibleForNext = lastSectionStudentCount >= 20;
  const nextSectionLetter = String.fromCharCode(65 + sections.length);

  return (
    <div className="flex flex-col justify-between rounded-xl border border-border/70 bg-card p-5 shadow-xs hover:shadow-md transition-all duration-200">
      <div className="space-y-4">
        {/* Card Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <BookOpen className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-base text-foreground tracking-tight">{cls.name}</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                  <MoreVertical className="w-4 h-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 text-xs">
                <DropdownMenuItem onClick={() => onOpenDetails(cls)} className="gap-2 cursor-pointer">
                  <BookOpen className="w-3.5 h-3.5" />
                  Open Class Roster
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onOpenDetailsPage(cls.id)} className="gap-2 cursor-pointer">
                  <BookOpen className="w-3.5 h-3.5" />
                  View Roster (Page)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEditClass(cls)} className="gap-2 cursor-pointer">
                  <Edit2 className="w-3.5 h-3.5" />
                  Rename Class
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDeleteClass(cls)}
                  className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Class
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
            {sections.map((sec) => (
              <div
                key={sec.id}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/60 bg-muted/30 text-xs font-medium"
              >
                <span className="font-bold text-foreground">Sec {sec.name}</span>
                <span className="text-[11px] text-muted-foreground">
                  ({sec.student_count ?? 0} students)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 20-Student Rule Eligibility Monitor */}
        {lastSection && (
          <div className="pt-2 border-t border-border/40">
            {isEligibleForNext ? (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-medium">
                    Section {lastSection.name} has {lastSectionStudentCount} students. Eligible for Section {nextSectionLetter}!
                  </span>
                </div>
                {canManage && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAddSection(cls)}
                    className="h-7 text-xs border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Sec {nextSectionLetter}
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-1.5 p-2.5 rounded-lg bg-muted/40 border border-border/50 text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                    <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    Section {nextSectionLetter} Expansion Lock
                  </span>
                  <span className="font-semibold text-xs">
                    {lastSectionStudentCount} / 20 Students
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (lastSectionStudentCount / 20) * 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Section {lastSection.name} requires {20 - lastSectionStudentCount} more students to open Section {nextSectionLetter}.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card Footer */}
      <div
        className={`pt-4 mt-4 border-t border-border/50 flex items-center ${
          teacherScope?.isClassTeacher ? 'justify-between' : 'justify-end'
        }`}
      >
        {teacherScope?.isClassTeacher && (
          <Button
            size="sm"
            onClick={() => {
              const targetSecId = teacherScope.classTeacherSections[0]?.id;
              onMarkAttendance?.(cls.id, targetSecId);
            }}
            className="text-xs gap-1.5 bg-purple-600 hover:bg-purple-700 text-white shadow-xs cursor-pointer h-8"
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Mark Today's Attendance</span>
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onOpenDetailsPage(cls.id)}
          className="text-xs gap-1.5 text-primary hover:text-primary"
        >
          <span>{teacherScope?.isClassTeacher ? 'View Roster' : 'View Sections & Roster'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};
