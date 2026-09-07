import { apiClient } from '@/api/client';
import type {
  AcademicClass,
  AcademicSection,
  AcademicStudent,
  AcademicSubject,
  SectionAddEligibility,
  ClassCreateDTO,
  ClassUpdateDTO,
  StudentCreateDTO,
  SubjectCreateDTO,
  TeacherAssignment,
  AssignTeacherDTO,
  ClassWithDetails,
} from './types';

export const academicApi = {
  // ==========================================
  // Classes
  // ==========================================
  getClasses: async (tenantId: string): Promise<AcademicClass[]> => {
    return apiClient.get(`/academic/tenants/${tenantId}/classes`);
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
  getSections: async (tenantId: string, classId: string): Promise<AcademicSection[]> => {
    return apiClient.get(`/academic/tenants/${tenantId}/classes/${classId}/sections`);
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
  getStudents: async (tenantId: string, classId: string): Promise<AcademicStudent[]> => {
    return apiClient.get(`/academic/tenants/${tenantId}/classes/${classId}/students`);
  },

  addStudent: async (
    tenantId: string,
    classId: string,
    sectionId: string,
    data: StudentCreateDTO
  ): Promise<AcademicStudent> => {
    return apiClient.post(
      `/academic/tenants/${tenantId}/classes/${classId}/students`,
      data,
      { params: { section_id: sectionId } }
    );
  },

  bulkAddStudents: async (
    tenantId: string,
    classId: string,
    sectionId: string,
    students: StudentCreateDTO[]
  ): Promise<{ count: number; students: AcademicStudent[] }> => {
    return apiClient.post(
      `/academic/tenants/${tenantId}/classes/${classId}/students/bulk`,
      { students },
      { params: { section_id: sectionId } }
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
  getSubjects: async (tenantId: string, classId: string): Promise<AcademicSubject[]> => {
    return apiClient.get(`/academic/tenants/${tenantId}/classes/${classId}/subjects`);
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
  getClassWithDetails: async (tenantId: string, classId: string): Promise<ClassWithDetails> => {
    const [cls, sections, students, subjects] = await Promise.all([
      apiClient.get<any, AcademicClass>(`/academic/tenants/${tenantId}/classes/${classId}`),
      apiClient.get<any, AcademicSection[]>(`/academic/tenants/${tenantId}/classes/${classId}/sections`),
      apiClient.get<any, AcademicStudent[]>(`/academic/tenants/${tenantId}/classes/${classId}/students`),
      apiClient.get<any, AcademicSubject[]>(`/academic/tenants/${tenantId}/classes/${classId}/subjects`),
    ]);

    // Compute section student counts
    const sectionsWithCounts = sections.map((sec: AcademicSection) => ({
      ...sec,
      student_count: (students as AcademicStudent[]).filter((s: AcademicStudent) => s.section_id === sec.id && s.status === 'ACTIVE').length,
    }));

    return {
      ...(cls as AcademicClass),
      sections: sectionsWithCounts,
      students: students as AcademicStudent[],
      subjects: subjects as AcademicSubject[],
    };
  },

  // ==========================================
  // Assignments (Class Teacher & Subject Teacher)
  // ==========================================
  getAssignments: async (
    tenantId: string,
    params?: { teacher_id?: string; class_id?: string }
  ): Promise<TeacherAssignment[]> => {
    return apiClient.get(`/academic/tenants/${tenantId}/assignments`, { params });
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
};


