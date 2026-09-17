import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/useAuth';
import type { TeacherAssignmentResponse, AcademicStudent } from '@/features/academic/types';
import type { AcademicYearResponse } from '@/features/academic-year/types';
import { TeacherHeroBanner } from './TeacherHeroBanner';
import { TeacherDailyActionAlert } from './TeacherDailyActionAlert';
import { TeacherClassroomSectionCard } from './TeacherClassroomSectionCard';
import { TeacherExamGradingQueue } from './TeacherExamGradingQueue';
import { ParentStudentLinkDialog } from '@/features/members/components/ParentStudentLinkDialog';
import { PARENT_MAPPINGS_QUERY_KEY, STUDENT_PARENTS_QUERY_KEY } from '@/features/members/hooks';
import { StatCard } from '@/components/ui/stat-card';
import { GraduationCap, CalendarCheck, BookOpen, Award } from 'lucide-react';
import { useTeacherExamAssignments } from '@/features/examination/hooks';
import { useDailyAttendanceStatus } from '@/features/attendance/hooks';
import { useAllClassesWithDetails } from '@/features/academic/hooks';

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
  const queryClient = useQueryClient();
  const [linkParentStudent, setLinkParentStudent] = useState<AcademicStudent | null>(null);
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

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

  // Hooks for scoped teacher KPIs
  const { data: teacherExamAssignments = [] } = useTeacherExamAssignments(tenantId || null);
  const { data: dailyAttendanceStatus } = useDailyAttendanceStatus(tenantId || null, todayStr);
  const { data: classes = [] } = useAllClassesWithDetails(
    tenantId || null,
    selectedAcademicYearId || null
  );

  // Card 1: My Students
  const myStudentsCount = useMemo(() => {
    if (primaryClassTeacherDuty) {
      const targetClass = classes.find((c) => c.id === primaryClassTeacherDuty.class_id);
      if (!targetClass) {
        const secStatus = dailyAttendanceStatus?.sections?.find(
          (s) => s.section_id === primaryClassTeacherDuty.section_id
        );
        return secStatus?.total_students ?? 0;
      }
      const sec = targetClass.sections?.find((s) => s.id === primaryClassTeacherDuty.section_id);
      if (sec && typeof (sec as any).student_count === 'number') {
        return (sec as any).student_count;
      }
      return (
        targetClass.students?.filter(
          (s) =>
            s.section_id === primaryClassTeacherDuty.section_id &&
            (s.status === 'ACTIVE' || !s.status)
        ).length ?? 0
      );
    }
    // Subject only: Total students across their assigned classes
    const assignedClassIds = Array.from(
      new Set(teacherAssignments.map((a) => a.class_id).filter(Boolean))
    );
    const relevantClasses = classes.filter((c) => assignedClassIds.includes(c.id));
    return relevantClasses.reduce((acc, c) => acc + (c.students?.length ?? 0), 0);
  }, [classes, primaryClassTeacherDuty, dailyAttendanceStatus, teacherAssignments]);

  // Card 2: Today's Attendance
  const primarySectionStatus = useMemo(() => {
    if (!primaryClassTeacherDuty) return null;
    return (
      dailyAttendanceStatus?.sections?.find(
        (s) => s.section_id === primaryClassTeacherDuty.section_id
      ) || null
    );
  }, [dailyAttendanceStatus, primaryClassTeacherDuty]);

  const isAttendanceMarked = useMemo(() => {
    if (!primaryClassTeacherDuty) return false;
    return Boolean(
      dailyAttendanceStatus?.marked_section_ids?.includes(primaryClassTeacherDuty.section_id!) ||
      primarySectionStatus?.is_marked
    );
  }, [dailyAttendanceStatus, primaryClassTeacherDuty, primarySectionStatus]);

  const attendanceRate = useMemo(() => {
    if (!primarySectionStatus) return null;
    const present = primarySectionStatus.present_count ?? 0;
    const absent = primarySectionStatus.absent_count ?? 0;
    const total = present + absent || primarySectionStatus.total_students || 0;
    return total > 0 ? Math.round((present / total) * 100) : 100;
  }, [primarySectionStatus]);

  const attendanceValue = primaryClassTeacherDuty
    ? isAttendanceMarked
      ? `${attendanceRate ?? 0}%`
      : 'Pending'
    : 'Active';

  const attendanceDescription = primaryClassTeacherDuty
    ? isAttendanceMarked
      ? `${primarySectionStatus?.present_count ?? 0} present, ${primarySectionStatus?.absent_count ?? 0} absent`
      : 'Attendance not yet marked'
    : 'School tracking active';

  // Card 3: Teaching Subjects
  const uniqueSubjectsCount = useMemo(() => {
    const subjects = new Set(
      teacherAssignments
        .filter((a) => a.subject_id)
        .map((a) => a.subject_id)
    );
    return subjects.size;
  }, [teacherAssignments]);

  const uniqueClassesCount = useMemo(() => {
    const classIds = new Set(teacherAssignments.map((a) => a.class_id).filter(Boolean));
    return classIds.size;
  }, [teacherAssignments]);

  const subjectsDescription = `Across ${uniqueClassesCount} ${uniqueClassesCount === 1 ? 'class' : 'classes'}`;

  // Card 4: Pending Exam Marks
  const pendingExamMarksCount = useMemo(() => {
    return teacherExamAssignments.filter(
      (a) => (a.status as string) === 'DRAFT' || a.status === 'PENDING' || !a.submitted_at
    ).length;
  }, [teacherExamAssignments]);

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* 1. Hero Banner */}
      <TeacherHeroBanner
        user={user}
        primaryClassTeacherDuty={primaryClassTeacherDuty}
        subjectTeacherAssignments={subjectTeacherAssignments}
        academicYears={academicYears}
        selectedAcademicYearId={selectedAcademicYearId}
        onSelectAcademicYearId={onSelectAcademicYearId}
        activeAcademicYear={activeAcademicYear}
      />

      {/* 2. Daily Action Alert */}
      <TeacherDailyActionAlert
        tenantId={tenantId}
        primaryClassTeacherDuty={primaryClassTeacherDuty}
        subjectTeacherAssignments={subjectTeacherAssignments}
      />

      {/* 3. 4 Scoped Teacher KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="My Students"
          value={myStudentsCount}
          icon={GraduationCap}
          description={
            primaryClassTeacherDuty
              ? `Enrolled in Section ${primaryClassTeacherDuty.section_name || 'A'}`
              : 'Across your teaching classes'
          }
        />

        <StatCard
          title="Today's Attendance"
          value={attendanceValue}
          icon={CalendarCheck}
          description={attendanceDescription}
        />

        <StatCard
          title="Teaching Subjects"
          value={uniqueSubjectsCount}
          icon={BookOpen}
          description={subjectsDescription}
        />

        <StatCard
          title="Pending Exam Marks"
          value={pendingExamMarksCount}
          icon={Award}
          description="Exam subjects awaiting scores"
        />
      </div>

      {/* 4. Classroom Section Hub (Class Teacher Duty) */}
      {primaryClassTeacherDuty && (
        <TeacherClassroomSectionCard
          tenantId={tenantId}
          duty={primaryClassTeacherDuty}
          onLinkParentClick={(student) => setLinkParentStudent(student)}
        />
      )}

      {/* 5. Examinations & Grading Queue */}
      <TeacherExamGradingQueue tenantId={tenantId} />

      {/* Associate Parent Dialog */}
      <ParentStudentLinkDialog
        isOpen={!!linkParentStudent}
        onClose={() => setLinkParentStudent(null)}
        tenantId={tenantId}
        student={
          linkParentStudent
            ? {
                id: linkParentStudent.id,
                name: [
                  linkParentStudent.first_name,
                  linkParentStudent.middle_name,
                  linkParentStudent.last_name,
                ]
                  .filter(Boolean)
                  .join(' '),
                className: primaryClassTeacherDuty?.class_name ?? undefined,
                sectionName: primaryClassTeacherDuty?.section_name ?? undefined,
              }
            : null
        }
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['academic_classes'] });
          queryClient.invalidateQueries({ queryKey: [PARENT_MAPPINGS_QUERY_KEY] });
          queryClient.invalidateQueries({ queryKey: [STUDENT_PARENTS_QUERY_KEY] });
          queryClient.invalidateQueries({ queryKey: ['attendance'] });
        }}
      />
    </div>
  );
};
