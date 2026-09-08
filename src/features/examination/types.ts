export type ExamStatus = 'DRAFT' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'APPROVED' | 'CANCELLED';

export type ExamSubjectStatus = 'PENDING' | 'SUBMITTED';

export interface ExamResponse {
  id: string;
  tenant_id: string;
  class_id: string;
  name: string;
  academic_term?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status: ExamStatus;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExamSubjectResponse {
  id: string;
  tenant_id: string;
  exam_id: string;
  subject_id: string;
  subject_name?: string | null;
  full_mark: number;
  pass_mark: number;
  assigned_teacher_id?: string | null;
  assigned_teacher_name?: string | null;
  status: ExamSubjectStatus;
  submitted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentScoreResponse {
  id: string;
  student_id: string;
  student_name?: string | null;
  section_id?: string | null;
  section_name?: string | null;
  score?: number | null;
  is_absent: boolean;
  is_pass?: boolean | null;
}

export interface BulkUpsertScoresResponse {
  exam_subject_id: string;
  total_records_processed: number;
  scores: StudentScoreResponse[];
}

export interface ExamSubjectReviewItem {
  id: string;
  subject_id: string;
  subject_name: string;
  full_mark: number;
  pass_mark: number;
  assigned_teacher_id?: string | null;
  assigned_teacher_name?: string | null;
  status: ExamSubjectStatus;
  submitted_at?: string | null;
}

export interface StudentExamReviewRow {
  student_id: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  section_id?: string | null;
  section_name?: string | null;
  subject_scores: Record<string, StudentScoreResponse>;
  total_score: number;
  total_full_mark: number;
  percentage: number;
  passed_all: boolean;
}

export interface ExamFullReviewResponse {
  exam: ExamResponse;
  class_name: string;
  subjects: ExamSubjectReviewItem[];
  students: StudentExamReviewRow[];
  total_students: number;
  all_subjects_submitted: boolean;
}

export interface ExamCreateDTO {
  name: string;
  class_id: string;
  academic_term?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}

export interface ExamSubjectCreateDTO {
  subject_id: string;
  full_mark: number;
  pass_mark: number;
}

export interface StudentScoreItemDTO {
  student_id: string;
  score?: number | null;
  is_absent: boolean;
}

export interface BulkUpsertScoresRequest {
  scores: StudentScoreItemDTO[];
}

export interface TeacherExamSubjectAssignment {
  exam_subject_id: string;
  exam_id: string;
  exam_name: string;
  class_id: string;
  class_name: string;
  subject_id: string;
  subject_name: string;
  full_mark: number;
  pass_mark: number;
  status: ExamSubjectStatus;
  submitted_at?: string | null;
}
