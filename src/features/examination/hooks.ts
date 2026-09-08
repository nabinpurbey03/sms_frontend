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
  params?: { class_id?: string; academic_term?: string },
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: [EXAM_ANALYTICS_QUERY_KEY, tenantId, params?.class_id, params?.academic_term],
    queryFn: () => examinationApi.getResultsAnalytics(tenantId!, params),
    enabled: !!tenantId && (options?.enabled ?? true),
    staleTime: 1000 * 30,
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
