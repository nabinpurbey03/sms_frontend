import { apiClient } from '@/api/client';
import type {
  ExamResponse,
  ExamSubjectResponse,
  BulkUpsertScoresResponse,
  ExamFullReviewResponse,
  ExamCreateDTO,
  ExamSubjectCreateDTO,
  StudentScoreItemDTO,
  TeacherExamSubjectAssignment,
} from './types';

export const examinationApi = {
  getExams: async (
    tenantId: string,
    params?: { class_id?: string; status?: string }
  ): Promise<ExamResponse[]> => {
    return apiClient.get(`/academic/tenants/${tenantId}/exams`, { params });
  },

  createExam: async (tenantId: string, data: ExamCreateDTO): Promise<ExamResponse> => {
    return apiClient.post(`/academic/tenants/${tenantId}/exams`, data);
  },

  addExamSubject: async (
    tenantId: string,
    examId: string,
    data: ExamSubjectCreateDTO
  ): Promise<ExamSubjectResponse> => {
    return apiClient.post(`/academic/tenants/${tenantId}/exams/${examId}/subjects`, data);
  },

  assignExamTeacher: async (
    tenantId: string,
    examId: string,
    subjectId: string,
    teacherId: string
  ): Promise<ExamSubjectResponse> => {
    return apiClient.post(
      `/academic/tenants/${tenantId}/exams/${examId}/subjects/${subjectId}/assign-teacher`,
      { teacher_id: teacherId }
    );
  },

  saveExamScores: async (
    tenantId: string,
    examSubjectId: string,
    scores: StudentScoreItemDTO[]
  ): Promise<BulkUpsertScoresResponse> => {
    return apiClient.put(`/academic/tenants/${tenantId}/exam-subjects/${examSubjectId}/scores`, {
      scores,
    });
  },

  submitExamSubject: async (
    tenantId: string,
    examSubjectId: string
  ): Promise<ExamSubjectResponse> => {
    return apiClient.post(`/academic/tenants/${tenantId}/exam-subjects/${examSubjectId}/submit`);
  },

  getExamReview: async (tenantId: string, examId: string): Promise<ExamFullReviewResponse> => {
    return apiClient.get(`/academic/tenants/${tenantId}/exams/${examId}`);
  },

  approveExam: async (tenantId: string, examId: string): Promise<ExamResponse> => {
    return apiClient.post(`/academic/tenants/${tenantId}/exams/${examId}/approve`);
  },

  getTeacherExamAssignments: async (
    tenantId: string
  ): Promise<TeacherExamSubjectAssignment[]> => {
    return apiClient.get(`/academic/tenants/${tenantId}/teacher/my-exam-assignments`);
  },
};
