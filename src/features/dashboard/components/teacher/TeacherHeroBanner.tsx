import React, { useMemo } from 'react';
import type { TeacherAssignmentResponse } from '@/features/academic/types';
import type { AcademicYearResponse } from '@/features/academic-year/types';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserCheck, BookOpen, Calendar } from 'lucide-react';

export interface TeacherHeroBannerProps {
  user: any;
  primaryClassTeacherDuty: TeacherAssignmentResponse | null;
  subjectTeacherAssignments: TeacherAssignmentResponse[];
  academicYears: AcademicYearResponse[];
  selectedAcademicYearId: string;
  onSelectAcademicYearId: (id: string) => void;
  activeAcademicYear: AcademicYearResponse | null;
}

export const TeacherHeroBanner: React.FC<TeacherHeroBannerProps> = ({
  user,
  primaryClassTeacherDuty,
  subjectTeacherAssignments,
  academicYears,
  selectedAcademicYearId,
  onSelectAcademicYearId,
  activeAcademicYear,
}) => {
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  }, []);

  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date());
  }, []);

  const uniqueSubjectNames = useMemo(() => {
    const names = subjectTeacherAssignments
      .map((a) => a.subject_name)
      .filter((name): name is string => Boolean(name && name.trim()));
    return Array.from(new Set(names));
  }, [subjectTeacherAssignments]);

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-2xl border border-border/70 bg-card/80 backdrop-blur-sm shadow-xs">
      <div className="space-y-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formattedDate}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {greeting}, {user?.first_name || 'Teacher'} 👋
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Teacher Mission Control & Daily Duty Hub
          </p>
        </div>

        {/* Teacher Duty Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {primaryClassTeacherDuty && (
            <Badge
              variant="outline"
              className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 text-xs py-1 px-2.5 flex items-center gap-1.5 font-medium"
            >
              <UserCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>
                Class Teacher: {primaryClassTeacherDuty.class_name} - Section{' '}
                {primaryClassTeacherDuty.section_name || 'A'}
              </span>
            </Badge>
          )}

          {uniqueSubjectNames.length > 0 && (
            <Badge
              variant="outline"
              className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 text-xs py-1 px-2.5 flex items-center gap-1.5 font-medium"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Teaching: {uniqueSubjectNames.join(', ')}</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Academic Session Selector & Badge */}
      <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-3 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Academic Session
          </span>
          {activeAcademicYear?.is_current ? (
            <Badge
              variant="outline"
              className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-medium px-1.5 py-0"
            >
              Current Session
            </Badge>
          ) : activeAcademicYear?.is_closed ? (
            <Badge
              variant="outline"
              className="bg-muted text-muted-foreground text-[10px] font-medium px-1.5 py-0"
            >
              Closed / Archived
            </Badge>
          ) : activeAcademicYear?.status ? (
            <Badge
              variant="outline"
              className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[10px] font-medium px-1.5 py-0"
            >
              {activeAcademicYear.status}
            </Badge>
          ) : null}
        </div>

        {academicYears.length > 0 && (
          <div className="w-[180px] sm:w-[220px]">
            <Select
              value={selectedAcademicYearId}
              onValueChange={onSelectAcademicYearId}
              disabled={academicYears.length <= 1}
            >
              <SelectTrigger className="h-9 text-xs bg-background">
                <SelectValue placeholder="Select Session" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((ay) => (
                  <SelectItem key={ay.id} value={ay.id} className="text-xs">
                    <div className="flex items-center justify-between gap-2 w-full">
                      <span>{ay.name}</span>
                      {ay.is_current ? (
                        <span className="text-[10px] text-emerald-600 font-medium">(Current)</span>
                      ) : ay.is_closed ? (
                        <span className="text-[10px] text-muted-foreground font-medium">
                          (Archived)
                        </span>
                      ) : null}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
};
