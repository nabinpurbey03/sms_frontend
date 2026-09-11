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
  SchoolResultsAnalyticsResponse,
  ParentChildrenReportCardsResponse,
  OfficialReportCardDTO,
  BatchReportCardsResponse,
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

  getResultsAnalytics: async (
    tenantId: string,
    params?: { class_id?: string }
  ): Promise<SchoolResultsAnalyticsResponse> => {
    return apiClient.get(`/academic/tenants/${tenantId}/exams/analytics`, { params });
  },

  getMyChildrenReportCards: async (
    tenantId: string
  ): Promise<ParentChildrenReportCardsResponse> => {
    return apiClient.get(`/academic/tenants/${tenantId}/parents/my-children/report-cards`);
  },

  getStudentReportCard: async (
    tenantId: string,
    examId: string,
    studentId: string
  ): Promise<OfficialReportCardDTO> => {
    return apiClient.get(
      `/academic/tenants/${tenantId}/exams/${examId}/report-cards/${studentId}`
    );
  },

  downloadStudentReportCardPdf: async (
    tenantId: string,
    examId: string,
    studentId: string
  ): Promise<Blob> => {
    return apiClient.get(
      `/academic/tenants/${tenantId}/exams/${examId}/students/${studentId}/report-card`,
      {
        responseType: 'blob',
        headers: {
          Accept: 'application/pdf',
        },
      }
    );
  },

  batchGenerateReportCards: async (
    tenantId: string,
    examId: string
  ): Promise<BatchReportCardsResponse> => {
    return apiClient.post(
      `/academic/tenants/${tenantId}/exams/${examId}/report-cards/generate`
    );
  },

  downloadAllClassReportCardsPdf: async (
    tenantId: string,
    examId: string
  ): Promise<Blob> => {
    return apiClient.get(
      `/academic/tenants/${tenantId}/exams/${examId}/class-report-cards/download`,
      {
        responseType: 'blob',
        headers: {
          Accept: 'application/pdf',
        },
      }
    );
  },
};
