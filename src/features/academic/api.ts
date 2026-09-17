import { apiClient } from '@/api/client';
import type {
  AcademicClass,
  AcademicSection,
  AcademicStudent,
  AcademicSubject,
  SectionAddEligibility,
  ClassCreateDTO,
  ClassUpdateDTO,
  ClassReorderDTO,
  StudentCreateDTO,
  SubjectCreateDTO,
  TeacherAssignment,
  AssignTeacherDTO,
  ClassWithDetails,
  ChildTeachersResponse,
  TeacherStudentsParentsResponse,
  AcademicYearRetentionResponse,
  AttendanceIntelligenceResponse,
  AcademicGrowthResponse,
  CapacityUtilizationResponse,
  PlatformNetworkBenchmarkResponse,
  GraduatedStudentDTO,
  GraduatedStudentListResponse,
} from './types';

export const academicApi = {
  // ==========================================
  // Classes
  // ==========================================
  getClasses: async (tenantId: string, academicYearId?: string | null): Promise<AcademicClass[]> => {
    const res = await apiClient.get(`/academic/tenants/${tenantId}/classes`, { params: { academic_year_id: academicYearId || undefined } }) as any;
    return res.meta ? res.data : res;
  },

  createClass: async (tenantId: string, data: ClassCreateDTO): Promise<AcademicClass> => {
    return apiClient.post(`/academic/tenants/${tenantId}/classes`, data);
  },

  updateClass: async (
    tenantId: string,
    classId: string,
    data: ClassUpdateDTO
  ): Promise<AcademicClass> => {
    return apiClient.patch(`/academic/tenants/${tenantId}/classes/${classId}`, data);
  },

  reorderClasses: async (
    tenantId: string,
    data: ClassReorderDTO
  ): Promise<AcademicClass[]> => {
    const res = await apiClient.put(`/academic/tenants/${tenantId}/classes/reorder`, data) as any;
    return res.data || res;
  },

  deleteClass: async (tenantId: string, classId: string, hard = false): Promise<boolean> => {
    const endpoint = hard
      ? `/academic/tenants/${tenantId}/classes/${classId}/hard`
      : `/academic/tenants/${tenantId}/classes/${classId}/soft`;
    await apiClient.delete(endpoint);
    return true;
  },

  // ==========================================
  // Sections
  // ==========================================
  getSections: async (tenantId: string, classId: string, academicYearId?: string | null): Promise<AcademicSection[]> => {
    const res = await apiClient.get(`/academic/tenants/${tenantId}/classes/${classId}/sections`, { params: { academic_year_id: academicYearId || undefined } }) as any;
    return res.meta ? res.data : res;
  },

  checkSectionEligibility: async (
    tenantId: string,
    classId: string
  ): Promise<SectionAddEligibility> => {
    return apiClient.get(`/academic/tenants/${tenantId}/classes/${classId}/sections/eligibility`);
  },

  createSection: async (tenantId: string, classId: string): Promise<AcademicSection> => {
    return apiClient.post(`/academic/tenants/${tenantId}/classes/${classId}/sections`, {});
  },

  deleteSection: async (
    tenantId: string,
    classId: string,
    sectionId: string,
    hard = false
  ): Promise<boolean> => {
    const endpoint = hard
      ? `/academic/tenants/${tenantId}/classes/${classId}/sections/${sectionId}/hard`
      : `/academic/tenants/${tenantId}/classes/${classId}/sections/${sectionId}/soft`;
    await apiClient.delete(endpoint);
    return true;
  },

  // ==========================================
  // Students
  // ==========================================
  getStudents: async (tenantId: string, classId: string, academicYearId?: string | null): Promise<AcademicStudent[]> => {
    return apiClient.get(`/academic/tenants/${tenantId}/classes/${classId}/students`, { params: { academic_year_id: academicYearId || undefined } });
  },

  addStudent: async (
    tenantId: string,
    classId: string,
    sectionId: string,
    data: StudentCreateDTO,
    academicYearId?: string | null
  ): Promise<AcademicStudent> => {
    return apiClient.post(
      `/academic/tenants/${tenantId}/classes/${classId}/students`,
      data,
      { params: { section_id: sectionId, academic_year_id: academicYearId || undefined } }
    );
  },

  bulkAddStudents: async (
    tenantId: string,
    classId: string,
    sectionId: string,
    students: StudentCreateDTO[],
    academicYearId?: string | null
  ): Promise<{ count: number; students: AcademicStudent[] }> => {
    return apiClient.post(
      `/academic/tenants/${tenantId}/classes/${classId}/students/bulk`,
      { students },
      { params: { section_id: sectionId, academic_year_id: academicYearId || undefined } }
    );
  },

  deleteStudent: async (
    tenantId: string,
    classId: string,
    studentId: string
  ): Promise<boolean> => {
    await apiClient.delete(
      `/academic/tenants/${tenantId}/classes/${classId}/students/${studentId}`
    );
    return true;
  },

  updateStudentStatus: async (
    tenantId: string,
    classId: string,
    studentId: string,
    status: AcademicStudent['status']
  ): Promise<AcademicStudent> => {
    return apiClient.patch(
      `/academic/tenants/${tenantId}/classes/${classId}/students/${studentId}`,
      { status }
    );
  },

  // ==========================================
  // Subjects
  // ==========================================
  getSubjects: async (tenantId: string, classId: string, academicYearId?: string | null): Promise<AcademicSubject[]> => {
    const res = await apiClient.get(`/academic/tenants/${tenantId}/classes/${classId}/subjects`, { params: { academic_year_id: academicYearId || undefined } }) as any;
    return res.meta ? res.data : res;
  },

  createSubject: async (
    tenantId: string,
    classId: string,
    data: SubjectCreateDTO
  ): Promise<AcademicSubject> => {
    return apiClient.post(`/academic/tenants/${tenantId}/classes/${classId}/subjects`, data);
  },

  deleteSubject: async (
    tenantId: string,
    classId: string,
    subjectId: string,
    hard = false
  ): Promise<boolean> => {
    const endpoint = hard
      ? `/academic/tenants/${tenantId}/classes/${classId}/subjects/${subjectId}/hard`
      : `/academic/tenants/${tenantId}/classes/${classId}/subjects/${subjectId}/soft`;
    await apiClient.delete(endpoint);
    return true;
  },

  updateSubject: async (
    tenantId: string,
    classId: string,
    subjectId: string,
    data: { name?: string; code?: string }
  ): Promise<AcademicSubject> => {
    return apiClient.patch(
      `/academic/tenants/${tenantId}/classes/${classId}/subjects/${subjectId}`,
      data
    );
  },

  bulkCreateSubjects: async (
    tenantId: string,
    classId: string,
    subjects: SubjectCreateDTO[]
  ): Promise<{ count: number; subjects: AcademicSubject[] }> => {
    return apiClient.post(
      `/academic/tenants/${tenantId}/classes/${classId}/subjects/bulk`,
      { subjects }
    );
  },

  // ==========================================
  // Class with Details (for dedicated page view)
  // ==========================================
  getClassWithDetails: async (tenantId: string, classId: string, academicYearId?: string | null): Promise<ClassWithDetails | null> => {
    const [classes, sections, students, subjects] = await Promise.all([
      academicApi.getClasses(tenantId, academicYearId),
      academicApi.getSections(tenantId, classId, academicYearId),
      academicApi.getStudents(tenantId, classId, academicYearId),
      academicApi.getSubjects(tenantId, classId, academicYearId),
    ]);

    const cls = classes.find((c) => c.id === classId);
    if (!cls) {
      return null;
    }

    // Compute section student counts
    const sectionsWithCounts = sections.map((sec: AcademicSection) => ({
      ...sec,
      student_count: (students as AcademicStudent[]).filter(
        (s: AcademicStudent) => s.section_id === sec.id && s.status === 'ACTIVE'
      ).length,
    }));

    return {
      ...cls,
      sections: sectionsWithCounts,
      students: students as AcademicStudent[],
      subjects: subjects as AcademicSubject[],
    };
  },

  // ==========================================
  // Assignments (Class Teacher & Subject Teacher)
  // ==========================================
  getMyTeacherAssignments: async (
    tenantId: string
  ): Promise<TeacherAssignment[]> => {
    return apiClient.get(`/academic/tenants/${tenantId}/teachers/my-assignments`);
  },

  getAssignments: async (
    tenantId: string,
    params?: { teacher_id?: string; class_id?: string; academic_year_id?: string | null }
  ): Promise<TeacherAssignment[]> => {
    const res = await apiClient.get(`/academic/tenants/${tenantId}/assignments`, { params }) as any;
    return res.meta ? res.data : res;
  },

  assignClassTeacher: async (
    tenantId: string,
    classId: string,
    data: AssignTeacherDTO
  ): Promise<TeacherAssignment> => {
    return apiClient.post(
      `/academic/tenants/${tenantId}/classes/${classId}/class-teacher`,
      data
    );
  },

  assignSubjectTeacher: async (
    tenantId: string,
    classId: string,
    subjectId: string,
    data: AssignTeacherDTO
  ): Promise<TeacherAssignment> => {
    return apiClient.post(
      `/academic/tenants/${tenantId}/classes/${classId}/subjects/${subjectId}/teachers`,
      data
    );
  },

  deleteAssignment: async (
    tenantId: string,
    assignmentId: string
  ): Promise<boolean> => {
    await apiClient.delete(
      `/academic/tenants/${tenantId}/assignments/${assignmentId}`
    );
    return true;
  },

  // ==========================================
  // Parent-Teacher Link
  // ==========================================
  getMyChildrenTeachers: async (
    tenantId: string
  ): Promise<ChildTeachersResponse[]> => {
    return apiClient.get(`/academic/tenants/${tenantId}/parents/my-teachers`);
  },

  getTeacherStudentsAndParents: async (
    tenantId: string,
    params?: { class_id?: string; section_id?: string; search?: string }
  ): Promise<TeacherStudentsParentsResponse> => {
    return apiClient.get(
      `/academic/tenants/${tenantId}/teachers/my-students-parents`,
      { params }
    );
  },

  // ==========================================
  // Retention & Cohort Analytics
  // ==========================================
  getRetentionAnalytics: async (
    tenantId: string,
    academicYearId: string
  ): Promise<AcademicYearRetentionResponse> => {
    const res = await apiClient.get(
      `/academic/tenants/${tenantId}/analytics/retention`,
      { params: { academic_year_id: academicYearId } }
    ) as any;
    return res.data || res;
  },

  getAttendanceIntelligence: async (
    tenantId: string,
    academicYearId: string
  ): Promise<AttendanceIntelligenceResponse> => {
    const res = await apiClient.get(
      `/academic/tenants/${tenantId}/analytics/attendance`,
      { params: { academic_year_id: academicYearId } }
    ) as any;
    return res.data || res;
  },

  getAcademicGrowth: async (
    tenantId: string,
    academicYearId: string
  ): Promise<AcademicGrowthResponse> => {
    const res = await apiClient.get(
      `/academic/tenants/${tenantId}/analytics/growth`,
      { params: { academic_year_id: academicYearId } }
    ) as any;
    return res.data || res;
  },

  // ==========================================
  // Capacity Utilization & Platform Benchmarking
  // ==========================================
  getCapacityUtilization: async (
    tenantId: string,
    academicYearId: string,
    targetCapacity: number = 40
  ): Promise<CapacityUtilizationResponse> => {
    const res = await apiClient.get(
      `/academic/tenants/${tenantId}/analytics/capacity`,
      { params: { academic_year_id: academicYearId, target_capacity: targetCapacity } }
    ) as any;
    return res.data || res;
  },

  getPlatformBenchmark: async (): Promise<PlatformNetworkBenchmarkResponse> => {
    const res = await apiClient.get('/academic/platform/analytics/benchmark') as any;
    return res.data || res;
  },

  // ==========================================
  // Graduated Students (Alumni)
  // ==========================================
  getGraduatedStudents: async (
    tenantId: string,
    params?: {
      academic_year_id?: string;
      class_id?: string;
      search?: string;
      skip?: number;
      limit?: number;
    }
  ): Promise<GraduatedStudentListResponse> => {
    const res = await apiClient.get(
      `/academic/tenants/${tenantId}/graduated-students`,
      { params }
    ) as any;
    return res.data || res;
  },
};


