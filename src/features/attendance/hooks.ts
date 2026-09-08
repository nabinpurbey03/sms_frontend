import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { attendanceApi } from './api';
import type { AttendanceFilterDTO } from './types';

export const ATTENDANCE_QUERY_KEY = 'attendance';
export const DAILY_ATTENDANCE_STATUS_KEY = 'daily_attendance_status';

// Query: Get section attendance report
export const useSectionAttendanceReport = (
  tenantId: string | null,
  classId: string | null,
  sectionId: string | null,
  startDate: string,
  endDate: string
) => {
  return useQuery({
    queryKey: ['attendance', 'section', tenantId, classId, sectionId, startDate, endDate],
    queryFn: () => attendanceApi.getSectionReport(tenantId!, classId!, sectionId!, startDate, endDate),
    enabled: !!tenantId && !!classId && !!sectionId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Query: Get student attendance report
export const useStudentAttendanceReport = (
  tenantId: string | null,
  studentId: string | null,
  filters?: AttendanceFilterDTO
) => {
  return useQuery({
    queryKey: ['attendance', 'student', tenantId, studentId, filters],
    queryFn: () => attendanceApi.getStudentReport(tenantId!, studentId!, filters?.start_date, filters?.end_date),
    enabled: !!tenantId && !!studentId,
    staleTime: 1000 * 60 * 5,
  });
};

// Query: Get attendance summary
export const useAttendanceSummary = (
  tenantId: string | null,
  recordDate: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: ['attendance', 'summary', tenantId, recordDate],
    queryFn: () => attendanceApi.getAttendanceSummary(tenantId!, recordDate),
    enabled: !!tenantId && !!recordDate && (options?.enabled ?? true),
    staleTime: 1000 * 30,
  });
};

// Query: Get school-wide attendance report across date range
export const useSchoolAttendanceReport = (
  tenantId: string | null,
  startDate: string,
  endDate: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: ['attendance', 'school-report', tenantId, startDate, endDate],
    queryFn: () => attendanceApi.getSchoolAttendanceReport(tenantId!, startDate, endDate),
    enabled: !!tenantId && !!startDate && !!endDate && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 2,
  });
};

// Query: Get class attendance report with section breakdown
export const useClassAttendanceReport = (
  tenantId: string | null,
  classId: string | null,
  startDate: string,
  endDate: string,
  sectionId?: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: ['attendance', 'class-report', tenantId, classId, startDate, endDate, sectionId],
    queryFn: () => attendanceApi.getClassAttendanceReport(tenantId!, classId!, startDate, endDate, sectionId),
    enabled: !!tenantId && !!classId && !!startDate && !!endDate && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 2,
  });
};


// Query: Get daily attendance status across sections
export const useDailyAttendanceStatus = (
  tenantId: string | null,
  recordDate: string,
  classId?: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: [DAILY_ATTENDANCE_STATUS_KEY, tenantId, recordDate, classId],
    queryFn: () => attendanceApi.getDailyAttendanceStatus(tenantId!, recordDate, classId),
    enabled: !!tenantId && !!recordDate && (options?.enabled ?? true),
    staleTime: 1000 * 15,
  });
};

// Mutation: Mark attendance
export const useMarkAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tenantId,
      classId,
      sectionId,
      recordDate,
      presentStudentIds,
    }: {
      tenantId: string;
      classId: string;
      sectionId: string;
      recordDate: string;
      presentStudentIds: string[];
    }) => attendanceApi.markSectionAttendance(tenantId, classId, sectionId, recordDate, presentStudentIds),
    onSuccess: (data, { recordDate, presentStudentIds }) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: [DAILY_ATTENDANCE_STATUS_KEY] });
      const count = data?.total_marked_present ?? presentStudentIds.length;
      toast.success('Attendance Recorded', {
        description: `${count} student(s) marked present for ${recordDate}`,
      });
    },
    onError: (error: any) => {
      toast.error('Failed to Mark Attendance', {
        description: error.message || 'Could not mark attendance.',
      });
    },
  });
};

