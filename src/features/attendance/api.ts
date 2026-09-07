import { apiClient } from '@/api/client';
import type { AttendanceReport, SectionAttendanceReport, AttendanceSummary } from './types';

export const attendanceApi = {
  // ==========================================
  // Mark Attendance
  // ==========================================
  markSectionAttendance: async (
    tenantId: string,
    classId: string,
    sectionId: string,
    recordDate: string,
    presentStudentIds: string[]
  ): Promise<{ count: number }> => {
    return apiClient.post(
      `/attendance/tenants/${tenantId}/classes/${classId}/sections/${sectionId}`,
      { present_student_ids: presentStudentIds },
      { params: { record_date: recordDate } }
    );
  },

  // ==========================================
  // Attendance Reports
  // ==========================================
  getSectionReport: async (
    tenantId: string,
    classId: string,
    sectionId: string,
    startDate: string,
    endDate: string
  ): Promise<SectionAttendanceReport> => {
    return apiClient.get(
      `/attendance/tenants/${tenantId}/classes/${classId}/sections/${sectionId}/report`,
      {
        params: { start_date: startDate, end_date: endDate },
      }
    );
  },

  getStudentReport: async (
    tenantId: string,
    studentId: string,
    startDate?: string,
    endDate?: string
  ): Promise<AttendanceReport> => {
    return apiClient.get(
      `/attendance/tenants/${tenantId}/students/${studentId}/report`,
      {
        params: { start_date: startDate, end_date: endDate },
      }
    );
  },

  getAttendanceSummary: async (
    tenantId: string,
    recordDate: string
  ): Promise<AttendanceSummary> => {
    return apiClient.get(
      `/attendance/tenants/${tenantId}/summary`,
      { params: { record_date: recordDate } }
    );
  },
};
