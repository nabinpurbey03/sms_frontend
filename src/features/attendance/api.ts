import { apiClient } from '@/api/client';
import type {
  AttendanceReport,
  SectionAttendanceReport,
  AttendanceSummary,
  DailyAttendanceStatus,
  SchoolAttendanceReportResponse,
  ClassAttendanceReportResponse,
  IndividualStudentAttendanceReport,
  AbsentStudentsResponse,
  AbsentStudentsFilterParams,
} from './types';

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
  ): Promise<{ total_marked_present: number; total_marked_absent: number; date: string }> => {
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
        params: { from_date: startDate, to_date: endDate },
      }
    );
  },

  getClassAttendanceReport: async (
    tenantId: string,
    classId: string,
    startDate: string,
    endDate: string,
    sectionId?: string
  ): Promise<ClassAttendanceReportResponse> => {
    return apiClient.get(
      `/attendance/tenants/${tenantId}/classes/${classId}/report`,
      {
        params: { from_date: startDate, to_date: endDate, section_id: sectionId },
      }
    );
  },

  getSchoolAttendanceReport: async (
    tenantId: string,
    startDate: string,
    endDate: string
  ): Promise<SchoolAttendanceReportResponse> => {
    return apiClient.get(
      `/attendance/tenants/${tenantId}/school/report`,
      {
        params: { from_date: startDate, to_date: endDate },
      }
    );
  },

  getStudentReport: async (
    tenantId: string,
    studentId: string,
    startDate?: string,
    endDate?: string
  ): Promise<IndividualStudentAttendanceReport & AttendanceReport> => {
    return apiClient.get(
      `/attendance/tenants/${tenantId}/students/${studentId}/report`,
      {
        params: { from_date: startDate, to_date: endDate },
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

  getDailyAttendanceStatus: async (
    tenantId: string,
    recordDate: string,
    classId?: string
  ): Promise<DailyAttendanceStatus> => {
    return apiClient.get(
      `/attendance/tenants/${tenantId}/daily-status`,
      { params: { record_date: recordDate, class_id: classId } }
    );
  },

  getAbsentStudents: async (
    tenantId: string,
    params?: AbsentStudentsFilterParams
  ): Promise<AbsentStudentsResponse> => {
    return apiClient.get(`/attendance/tenants/${tenantId}/absent-students`, {
      params: {
        record_date: params?.record_date,
        class_id: params?.class_id,
        section_id: params?.section_id,
        search: params?.search,
      },
    });
  },
};

