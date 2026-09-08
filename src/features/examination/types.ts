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
  teacher_id?: string | null;
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

// ==========================================
// School Results & Examination Analytics Types
// ==========================================

export interface ExamPipelineStats {
  total_exams: number;
  draft_count: number;
  in_progress_count: number;
  pending_approval_count: number;
  approved_count: number;
}

export interface AcademicKPIs {
  total_students_evaluated: number;
  total_passed: number;
  total_failed: number;
  school_pass_rate: number;
  school_average_percentage: number;
}

export interface PendingApprovalAlertItem {
  exam_id: string;
  exam_name: string;
  class_id: string;
  class_name: string;
  academic_term?: string | null;
  subject_count: number;
  student_count: number;
  submitted_at?: string | null;
}

export interface ClassResultSummary {
  exam_id: string;
  exam_name: string;
  class_id: string;
  class_name: string;
  academic_term?: string | null;
  status: ExamStatus;
  total_students: number;
  passed_students: number;
  failed_students: number;
  pass_rate: number;
  average_percentage: number;
}

export interface SubjectResultSummary {
  subject_id: string;
  subject_name: string;
  class_name: string;
  exam_name: string;
  students_evaluated: number;
  passed_count: number;
  pass_rate: number;
  average_score: number;
  full_mark: number;
  attendance_rate?: number;
  absent_count?: number;
  attended_average_score?: number;
}

export interface AtRiskStudentItem {
  student_id: string;
  student_name: string;
  class_name: string;
  section_name?: string | null;
  exam_name: string;
  failed_subjects_count: number;
  failed_subject_names: string[];
  overall_percentage: number;
}

export interface TopAchieverItem {
  student_id: string;
  student_name: string;
  class_name: string;
  section_name?: string | null;
  exam_name: string;
  overall_percentage: number;
  rank: number;
}

export interface SchoolResultsAnalyticsResponse {
  pipeline: ExamPipelineStats;
  kpis: AcademicKPIs;
  pending_approvals: PendingApprovalAlertItem[];
  class_summaries: ClassResultSummary[];
  subject_summaries: SubjectResultSummary[];
  at_risk_students: AtRiskStudentItem[];
  top_achievers: TopAchieverItem[];
}

// ==========================================
// Parent Published Report Cards & Official Transcripts
// ==========================================

export interface OfficialSchoolHeader {
  name: string;
  domain_name?: string | null;
  email?: string | null;
  phone?: string | null;
  logo_url?: string | null;
  address?: string | null;
}

export interface StudentProfileInfo {
  id: string;
  name: string;
  roll_number?: string | null;
  class_name: string;
  section_name?: string | null;
  status: string;
}

export interface ExamDetailsInfo {
  id: string;
  name: string;
  academic_term?: string | null;
  published_at?: string | null;
  issue_date: string;
}

export interface StudentReportCardSubjectItem {
  subject_id: string;
  subject_name: string;
  full_mark: number;
  pass_mark: number;
  score: number | null;
  is_absent: boolean;
  is_pass: boolean;
  grade: string;
  grade_point: number;
  remarks: string;
  highest_class_score?: number | null;
}

export interface ReportCardSummary {
  total_obtained: number;
  total_full_mark: number;
  percentage: number;
  overall_grade: string;
  gpa: number;
  is_passed: boolean;
  rank_in_class?: string | null;
  rank_in_section?: string | null;
  exam_attendance_rate: number;
  absent_subject_count: number;
  final_result_text: string;
}

export interface OfficialSignatories {
  class_teacher_title: string;
  principal_title: string;
  controller_title: string;
  verification_code: string;
  disclaimer: string;
}

export interface OfficialReportCardDTO {
  school: OfficialSchoolHeader;
  student: StudentProfileInfo;
  exam: ExamDetailsInfo;
  subjects: StudentReportCardSubjectItem[];
  summary: ReportCardSummary;
  signatories: OfficialSignatories;
}

export interface ChildPublishedExamItem {
  exam_id: string;
  exam_name: string;
  academic_term?: string | null;
  class_name: string;
  section_name?: string | null;
  total_obtained: number;
  total_full_mark: number;
  percentage: number;
  grade: string;
  gpa: number;
  is_passed: boolean;
  exam_attendance_rate: number;
  rank_in_class?: string | null;
  published_at?: string | null;
}

export interface ChildWithReportCardsDTO {
  student_id: string;
  student_name: string;
  class_id: string;
  class_name: string;
  section_id?: string | null;
  section_name?: string | null;
  status: string;
  relationship_type: string;
  exams: ChildPublishedExamItem[];
}

export interface ParentChildrenReportCardsResponse {
  children: ChildWithReportCardsDTO[];
  total_published_exams: number;
}

