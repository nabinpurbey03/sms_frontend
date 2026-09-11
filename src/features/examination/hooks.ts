import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { examinationApi } from './api';
import type {
  ExamCreateDTO,
  ExamSubjectCreateDTO,
  StudentScoreItemDTO,
} from './types';

export const EXAMS_QUERY_KEY = 'examination_exams';
export const EXAM_REVIEW_QUERY_KEY = 'examination_exam_review';
export const TEACHER_EXAM_ASSIGNMENTS_QUERY_KEY = 'teacher_exam_assignments';
export const EXAM_ANALYTICS_QUERY_KEY = 'exam_results_analytics';
export const PARENT_REPORT_CARDS_QUERY_KEY = 'parent_children_report_cards';
export const OFFICIAL_REPORT_CARD_QUERY_KEY = 'official_report_card';

export const useExams = (
  tenantId: string | null,
  params?: { class_id?: string; status?: string }
) => {
  return useQuery({
    queryKey: [EXAMS_QUERY_KEY, tenantId, params?.class_id, params?.status],
    queryFn: () => examinationApi.getExams(tenantId!, params),
    enabled: !!tenantId,
  });
};

export const useExamReview = (
  tenantId: string | null,
  examId: string | null
) => {
  return useQuery({
    queryKey: [EXAM_REVIEW_QUERY_KEY, tenantId, examId],
    queryFn: () => examinationApi.getExamReview(tenantId!, examId!),
    enabled: !!tenantId && !!examId,
  });
};

export const useTeacherExamAssignments = (
  tenantId: string | null,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: [TEACHER_EXAM_ASSIGNMENTS_QUERY_KEY, tenantId],
    queryFn: () => examinationApi.getTeacherExamAssignments(tenantId!),
    enabled: !!tenantId && (options?.enabled ?? true),
  });
};

export const useExamResultsAnalytics = (
  tenantId: string | null,
  params?: { class_id?: string },
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: [EXAM_ANALYTICS_QUERY_KEY, tenantId, params?.class_id],
    queryFn: () => examinationApi.getResultsAnalytics(tenantId!, params),
    enabled: !!tenantId && (options?.enabled ?? true),
    staleTime: 1000 * 30,
  });
};

export const useMyChildrenReportCards = (
  tenantId: string | null,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: [PARENT_REPORT_CARDS_QUERY_KEY, tenantId],
    queryFn: () => examinationApi.getMyChildrenReportCards(tenantId!),
    enabled: !!tenantId && (options?.enabled ?? true),
    staleTime: 1000 * 30,
  });
};

export const useStudentReportCard = (
  tenantId: string | null,
  examId: string | null,
  studentId: string | null,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: [OFFICIAL_REPORT_CARD_QUERY_KEY, tenantId, examId, studentId],
    queryFn: () =>
      examinationApi.getStudentReportCard(tenantId!, examId!, studentId!),
    enabled: !!tenantId && !!examId && !!studentId && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 5,
  });
};

export const useCreateExam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tenantId, data }: { tenantId: string; data: ExamCreateDTO }) =>
      examinationApi.createExam(tenantId, data),
    onSuccess: (_data, { tenantId }) => {
      queryClient.invalidateQueries({ queryKey: [EXAMS_QUERY_KEY, tenantId] });
      queryClient.invalidateQueries({ queryKey: [EXAM_ANALYTICS_QUERY_KEY, tenantId] });
      toast.success('Exam created successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to create exam', {
        description: error.message || 'Could not create exam.',
      });
    },
  });
};

export const useAddExamSubject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tenantId,
      examId,
      data,
    }: {
      tenantId: string;
      examId: string;
      data: ExamSubjectCreateDTO;
    }) => examinationApi.addExamSubject(tenantId, examId, data),
    onSuccess: (_data, { tenantId, examId }) => {
      queryClient.invalidateQueries({ queryKey: [EXAM_REVIEW_QUERY_KEY, tenantId, examId] });
      queryClient.invalidateQueries({ queryKey: [EXAMS_QUERY_KEY, tenantId] });
      queryClient.invalidateQueries({ queryKey: [EXAM_ANALYTICS_QUERY_KEY, tenantId] });
      toast.success('Exam subject added successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to add exam subject', {
        description: error.message || 'Could not add exam subject.',
      });
    },
  });
};

export const useAssignExamTeacher = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tenantId,
      examId,
      subjectId,
      teacherId,
    }: {
      tenantId: string;
      examId: string;
      subjectId: string;
      teacherId: string;
    }) => examinationApi.assignExamTeacher(tenantId, examId, subjectId, teacherId),
    onSuccess: (_data, { tenantId, examId }) => {
      queryClient.invalidateQueries({ queryKey: [EXAM_REVIEW_QUERY_KEY, tenantId, examId] });
      queryClient.invalidateQueries({ queryKey: [EXAM_ANALYTICS_QUERY_KEY, tenantId] });
      toast.success('Teacher assigned successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to assign teacher', {
        description: error.message || 'Could not assign teacher.',
      });
    },
  });
};

export const useSaveExamScores = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tenantId,
      examSubjectId,
      scores,
    }: {
      tenantId: string;
      examSubjectId: string;
      scores: StudentScoreItemDTO[];
    }) => examinationApi.saveExamScores(tenantId, examSubjectId, scores),
    onSuccess: (_data, { tenantId }) => {
      queryClient.invalidateQueries({ queryKey: [EXAM_REVIEW_QUERY_KEY, tenantId] });
      queryClient.invalidateQueries({ queryKey: [EXAMS_QUERY_KEY, tenantId] });
      queryClient.invalidateQueries({ queryKey: [EXAM_ANALYTICS_QUERY_KEY, tenantId] });
      toast.success('Scores saved successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to save scores', {
        description: error.message || 'Could not save scores.',
      });
    },
  });
};

export const useSubmitExamSubject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tenantId,
      examSubjectId,
    }: {
      tenantId: string;
      examSubjectId: string;
    }) => examinationApi.submitExamSubject(tenantId, examSubjectId),
    onSuccess: (_data, { tenantId }) => {
      queryClient.invalidateQueries({ queryKey: [EXAM_REVIEW_QUERY_KEY, tenantId] });
      queryClient.invalidateQueries({ queryKey: [EXAMS_QUERY_KEY, tenantId] });
      queryClient.invalidateQueries({ queryKey: [TEACHER_EXAM_ASSIGNMENTS_QUERY_KEY, tenantId] });
      queryClient.invalidateQueries({ queryKey: [EXAM_ANALYTICS_QUERY_KEY, tenantId] });
      toast.success('Exam subject submitted successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to submit exam subject', {
        description: error.message || 'Could not submit exam subject.',
      });
    },
  });
};

export const useApproveExam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tenantId,
      examId,
    }: {
      tenantId: string;
      examId: string;
    }) => examinationApi.approveExam(tenantId, examId),
    onSuccess: (_data, { tenantId, examId }) => {
      queryClient.invalidateQueries({ queryKey: [EXAM_REVIEW_QUERY_KEY, tenantId, examId] });
      queryClient.invalidateQueries({ queryKey: [EXAMS_QUERY_KEY, tenantId] });
      queryClient.invalidateQueries({ queryKey: [EXAM_ANALYTICS_QUERY_KEY, tenantId] });
      toast.success('Exam approved successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to approve exam', {
        description: error.message || 'Could not approve exam.',
      });
    },
  });
};

export const useDownloadReportCard = () => {
  return useMutation({
    mutationFn: async ({
      tenantId,
      examId,
      studentId,
      studentName,
      examName,
    }: {
      tenantId: string;
      examId: string;
      studentId: string;
      studentName?: string;
      examName?: string;
    }) => {
      const blob = await examinationApi.downloadStudentReportCardPdf(
        tenantId,
        examId,
        studentId
      );

      const sName = (studentName || 'Student').trim().replace(/\s+/g, '_');
      const eName = (examName || 'Exam').trim().replace(/\s+/g, '_');
      const filename = `${sName}_${eName}_Report_Card.pdf`;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { filename };
    },
    onSuccess: ({ filename }) => {
      toast.success('Report Card Downloaded', {
        description: `Successfully downloaded ${filename}`,
      });
    },
    onError: async (error: any) => {
      let description = error.message || 'Could not download report card.';
      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const json = JSON.parse(text);
          if (json.message) {
            description = json.message;
          }
        } catch {}
      }
      toast.error('Failed to download report card', {
        description,
      });
    },
  });
};

export const useBatchGenerateReportCards = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tenantId,
      examId,
    }: {
      tenantId: string;
      examId: string;
    }) => examinationApi.batchGenerateReportCards(tenantId, examId),
    onSuccess: (data, { tenantId, examId }) => {
      queryClient.invalidateQueries({ queryKey: [EXAM_REVIEW_QUERY_KEY, tenantId, examId] });
      queryClient.invalidateQueries({ queryKey: [EXAMS_QUERY_KEY, tenantId] });
      toast.success('Report Cards Generated', {
        description: `Successfully generated ${data.total_students} report cards for ${data.class_name}.`,
      });
    },
    onError: (error: any) => {
      toast.error('Failed to generate report cards', {
        description: error.message || 'Could not batch generate report cards.',
      });
    },
  });
};

export const useDownloadAllClassReportCardsPdf = () => {
  return useMutation({
    mutationFn: async ({
      tenantId,
      examId,
      examName,
    }: {
      tenantId: string;
      examId: string;
      examName?: string;
    }) => {
      const blob = await examinationApi.downloadAllClassReportCardsPdf(tenantId, examId);
      
      const eName = (examName || 'Exam').trim().replace(/\s+/g, '_');
      const filename = `${eName}_All_Report_Cards.pdf`;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { filename };
    },
    onSuccess: ({ filename }) => {
      toast.success('Class Report Cards Downloaded', {
        description: `Successfully downloaded ${filename}`,
      });
    },
    onError: async (error: any) => {
      let description = error.message || 'Could not download class report cards.';
      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const json = JSON.parse(text);
          if (json.message) {
            description = json.message;
          }
        } catch {}
      }
      toast.error('Failed to download report cards', {
        description,
      });
    },
  });
};
