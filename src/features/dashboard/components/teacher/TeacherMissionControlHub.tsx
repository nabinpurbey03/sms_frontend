import React, { useMemo } from 'react';
import { useAuth } from '@/auth/useAuth';
import type { TeacherAssignmentResponse } from '@/features/academic/types';
import type { AcademicYearResponse } from '@/features/academic-year/types';

export interface TeacherMissionControlHubProps {
  tenantId: string;
  teacherAssignments: TeacherAssignmentResponse[];
  academicYears: AcademicYearResponse[];
  selectedAcademicYearId: string;
  onSelectAcademicYearId: (id: string) => void;
  activeAcademicYear: AcademicYearResponse | null;
}

export const TeacherMissionControlHub: React.FC<TeacherMissionControlHubProps> = ({
  tenantId,
  teacherAssignments,
  academicYears,
  selectedAcademicYearId,
  onSelectAcademicYearId,
  activeAcademicYear,
}) => {
  const { user } = useAuth();

  // Identify Class Teacher assignments (is_class_teacher === true)
  const classTeacherAssignments = useMemo(() => {
    return teacherAssignments.filter((a) => a.is_class_teacher);
  }, [teacherAssignments]);

  // Primary class teacher section (if assigned)
  const primaryClassTeacherDuty = classTeacherAssignments[0] || null;

  // Identify Subject Teacher assignments
  const subjectTeacherAssignments = useMemo(() => {
    return teacherAssignments.filter((a) => !a.is_class_teacher && a.subject_id);
  }, [teacherAssignments]);

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Placeholder for Task 2: Hero Banner & Daily Action Alert */}
      <div className="p-6 rounded-2xl bg-card border border-border/70 shadow-xs space-y-2">
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Welcome back, {user?.first_name || 'Teacher'} 👋
        </h2>
        <p className="text-xs text-muted-foreground">
          Teacher Mission Control & Daily Duty Hub
        </p>
      </div>
    </div>
  );
};
