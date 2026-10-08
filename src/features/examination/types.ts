export type ExamStatus = 'DRAFT' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'APPROVED' | 'CANCELLED';

export type ExamSubjectStatus = 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'DRAFT';

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
  has_practical: boolean;
  theory_full_mark: number;
  theory_pass_mark: number;
  practical_full_mark: number;
  practical_pass_mark: number;
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
  theory_score?: number | null;
  is_theory_absent?: boolean;
  practical_score?: number | null;
  is_practical_absent?: boolean;
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
  has_practical: boolean;
  theory_full_mark: number;
  theory_pass_mark: number;
  practical_full_mark: number;
  practical_pass_mark: number;
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
  has_practical?: boolean;
  theory_full_mark?: number;
  theory_pass_mark?: number;
  practical_full_mark?: number;
  practical_pass_mark?: number;
  full_mark: number;
  pass_mark: number;
  teacher_id?: string | null;
}

export interface StudentScoreItemDTO {
  student_id: string;
  score?: number | null;
  is_absent: boolean;
  theory_score?: number | null;
  is_theory_absent?: boolean;
  practical_score?: number | null;
  is_practical_absent?: boolean;
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
  section_id?: string | null;
  section_name?: string | null;
  has_practical?: boolean;
  theory_full_mark?: number;
  theory_pass_mark?: number;
  practical_full_mark?: number;
  practical_pass_mark?: number;
  full_mark: number;
  pass_mark: number;
  status: ExamSubjectStatus;
  submitted_at?: string | null;
}

// ==========================================
// Exam Mark Preset & Calculation Helpers
// ==========================================

export type ExamMarkPresetKey = '75_25' | '80_20' | '50_50' | '100_TH';

export interface ExamMarkPreset {
  id: ExamMarkPresetKey;
  label: string;
  hasPractical: boolean;
  theoryFullMark: number;
  theoryPassMark: number;
  practicalFullMark: number;
  practicalPassMark: number;
}

export const EXAM_MARK_PRESETS: Record<ExamMarkPresetKey, ExamMarkPreset> = {
  '75_25': {
    id: '75_25',
    label: '75/25',
    hasPractical: true,
    theoryFullMark: 75,
    theoryPassMark: 27,
    practicalFullMark: 25,
    practicalPassMark: 10,
  },
  '80_20': {
    id: '80_20',
    label: '80/20',
    hasPractical: true,
    theoryFullMark: 80,
    theoryPassMark: 32,
    practicalFullMark: 20,
    practicalPassMark: 8,
  },
  '50_50': {
    id: '50_50',
    label: '50/50',
    hasPractical: true,
    theoryFullMark: 50,
    theoryPassMark: 20,
    practicalFullMark: 50,
    practicalPassMark: 20,
  },
  '100_TH': {
    id: '100_TH',
    label: '100 TH',
    hasPractical: false,
    theoryFullMark: 100,
    theoryPassMark: 40,
    practicalFullMark: 0,
    practicalPassMark: 0,
  },
};

export function deriveTotalMarks(item: {
  hasPractical: boolean;
  theoryFullMark: number;
  theoryPassMark: number;
  practicalFullMark: number;
  practicalPassMark: number;
}): { fullMark: number; passMark: number } {
  const fullMark = item.hasPractical
    ? item.theoryFullMark + item.practicalFullMark
    : item.theoryFullMark;
  const passMark = item.hasPractical
    ? item.theoryPassMark + item.practicalPassMark
    : item.theoryPassMark;
  return { fullMark, passMark };
}

export function validateSubjectMarks(item: {
  included: boolean;
  hasPractical: boolean;
  theoryFullMark: number;
  theoryPassMark: number;
  practicalFullMark: number;
  practicalPassMark: number;
}): string | undefined {
  if (!item.included) return undefined;
  if (item.theoryPassMark > item.theoryFullMark) {
    return 'Theory pass mark cannot exceed full mark';
  }
  if (item.hasPractical && item.practicalPassMark > item.practicalFullMark) {
    return 'Practical pass mark cannot exceed full mark';
  }
  if (item.theoryFullMark < 1) {
    return 'Theory full mark must be at least 1';
  }
  if (item.hasPractical && item.practicalFullMark < 1) {
    return 'Practical full mark must be at least 1';
  }
  return undefined;
}

export function applyPresetToSubject<T extends {
  hasPractical: boolean;
  theoryFullMark: number;
  theoryPassMark: number;
  practicalFullMark: number;
  practicalPassMark: number;
  fullMark: number;
  passMark: number;
  error?: string;
  included?: boolean;
}>(
  subject: T,
  presetKey: ExamMarkPresetKey
): T {
  const preset = EXAM_MARK_PRESETS[presetKey];
  const { fullMark, passMark } = deriveTotalMarks(preset);
  const updated: T = {
    ...subject,
    hasPractical: preset.hasPractical,
    theoryFullMark: preset.theoryFullMark,
    theoryPassMark: preset.theoryPassMark,
    practicalFullMark: preset.practicalFullMark,
    practicalPassMark: preset.practicalPassMark,
    fullMark,
    passMark,
    error: undefined,
  };
  if (updated.included !== undefined) {
    updated.error = validateSubjectMarks({
      included: updated.included,
      hasPractical: updated.hasPractical,
      theoryFullMark: updated.theoryFullMark,
      theoryPassMark: updated.theoryPassMark,
      practicalFullMark: updated.practicalFullMark,
      practicalPassMark: updated.practicalPassMark,
    });
  }
  return updated;
}

/**
 * Ergonomic Tailwind classes for compact mark input fields:
 * - Suppresses browser spin-buttons (steppers) that steal 15-20px of inner width
 * - Centers monospace typography for instant numerical readability
 * - Ensures fixed comfortable width (w-14 sm:w-16 = 56-64px) fitting 1-3 digits easily (e.g. "100", "75", "0")
 */
export const MARK_INPUT_CLASS =
  'w-14 sm:w-16 h-8 text-xs sm:text-sm font-semibold font-mono text-center px-1.5 ' +
  '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

// ==========================================
// Dual-Component Grading & Student Row Types
// ==========================================

export interface StudentGradingRow {
  studentId: string;
  studentName: string;
  sectionId?: string | null;
  sectionName?: string | null;
  theoryScore: number | null;
  isTheoryAbsent: boolean;
  practicalScore: number | null;
  isPracticalAbsent: boolean;
  score: number | null; // Total derived obtained
  isAbsent: boolean; // True if both absent (or theory absent if no practical)
}

export interface EvaluateStudentResultParams {
  hasPractical: boolean;
  theoryScore: number | null;
  isTheoryAbsent: boolean;
  theoryPassMark: number;
  practicalScore: number | null;
  isPracticalAbsent: boolean;
  practicalPassMark: number;
  passMark?: number;
}

export interface StudentResultEvaluation {
  status:
    | 'Pass'
    | 'Fail'
    | 'Fail (TH)'
    | 'Fail (PR)'
    | 'TH Absent'
    | 'PR Absent'
    | 'Absent (0)'
    | 'Absent'
    | 'Pending';
  variant: 'success' | 'destructive' | 'secondary';
  tooltip?: string;
  isPass: boolean;
}

export function evaluateStudentResult(
  params: EvaluateStudentResultParams
): StudentResultEvaluation {
  const {
    hasPractical,
    theoryScore,
    isTheoryAbsent,
    theoryPassMark,
    practicalScore,
    isPracticalAbsent,
    practicalPassMark,
    passMark,
  } = params;

  if (hasPractical) {
    // Both absent
    if (isTheoryAbsent && isPracticalAbsent) {
      return {
        status: 'Absent (0)',
        variant: 'destructive',
        tooltip: 'Student absent for both theory and practical exams',
        isPass: false,
      };
    }
    // Theory absent only
    if (isTheoryAbsent) {
      return {
        status: 'TH Absent',
        variant: 'destructive',
        tooltip: 'Theory absent',
        isPass: false,
      };
    }
    // Practical absent only
    if (isPracticalAbsent) {
      return {
        status: 'PR Absent',
        variant: 'destructive',
        tooltip: 'Practical absent',
        isPass: false,
      };
    }
    // Missing / pending scores
    const isTheoryMissing =
      theoryScore === null ||
      theoryScore === undefined ||
      isNaN(Number(theoryScore));
    const isPracticalMissing =
      practicalScore === null ||
      practicalScore === undefined ||
      isNaN(Number(practicalScore));

    if (isTheoryMissing || isPracticalMissing) {
      return {
        status: 'Pending',
        variant: 'secondary',
        tooltip: 'Scores not yet entered',
        isPass: false,
      };
    }

    const thNum = Number(theoryScore);
    const prNum = Number(practicalScore);
    const thPass = thNum >= Number(theoryPassMark);
    const prPass = prNum >= Number(practicalPassMark);

    if (thPass && prPass) {
      return {
        status: 'Pass',
        variant: 'success',
        isPass: true,
      };
    }
    if (!thPass && !prPass) {
      return {
        status: 'Fail',
        variant: 'destructive',
        tooltip: 'Both theory and practical scores below pass mark',
        isPass: false,
      };
    }
    if (!thPass) {
      return {
        status: 'Fail (TH)',
        variant: 'destructive',
        tooltip: 'Theory score below pass mark',
        isPass: false,
      };
    }
    return {
      status: 'Fail (PR)',
      variant: 'destructive',
      tooltip: 'Practical score below pass mark',
      isPass: false,
    };
  }

  // Without practical
  if (isTheoryAbsent) {
    return {
      status: 'Absent',
      variant: 'destructive',
      tooltip: 'Student absent',
      isPass: false,
    };
  }

  const isMissing =
    theoryScore === null ||
    theoryScore === undefined ||
    isNaN(Number(theoryScore));

  if (isMissing) {
    return {
      status: 'Pending',
      variant: 'secondary',
      tooltip: 'Score not yet entered',
      isPass: false,
    };
  }

  const scoreNum = Number(theoryScore);
  const threshold = Number(passMark ?? theoryPassMark);
  if (scoreNum >= threshold) {
    return {
      status: 'Pass',
      variant: 'success',
      isPass: true,
    };
  }
  return {
    status: 'Fail',
    variant: 'destructive',
    tooltip: 'Score below pass mark',
    isPass: false,
  };
}

export function deriveStudentScore(
  row: {
    theoryScore?: number | null;
    isTheoryAbsent?: boolean;
    practicalScore?: number | null;
    isPracticalAbsent?: boolean;
  },
  hasPractical: boolean
): number | null {
  if (!hasPractical) {
    if (row.isTheoryAbsent) return 0;
    return row.theoryScore !== null &&
      row.theoryScore !== undefined &&
      !isNaN(Number(row.theoryScore))
      ? Number(row.theoryScore)
      : null;
  }

  if (row.isTheoryAbsent && row.isPracticalAbsent) return 0;

  const th = row.isTheoryAbsent
    ? 0
    : row.theoryScore !== null &&
      row.theoryScore !== undefined &&
      !isNaN(Number(row.theoryScore))
    ? Number(row.theoryScore)
    : null;

  const pr = row.isPracticalAbsent
    ? 0
    : row.practicalScore !== null &&
      row.practicalScore !== undefined &&
      !isNaN(Number(row.practicalScore))
    ? Number(row.practicalScore)
    : null;

  if (th === null && pr === null) return null;
  return (th ?? 0) + (pr ?? 0);
}

export function buildStudentScorePayload(
  row: StudentGradingRow,
  hasPractical: boolean
): StudentScoreItemDTO {
  const isTheoryAbsent = Boolean(row.isTheoryAbsent);
  const isPracticalAbsent = hasPractical ? Boolean(row.isPracticalAbsent) : false;

  const theoryScore = isTheoryAbsent ? 0 : row.theoryScore;
  const practicalScore = hasPractical
    ? (isPracticalAbsent ? 0 : row.practicalScore)
    : 0;

  const totalScore =
    (isTheoryAbsent ? 0 : (row.theoryScore ?? 0)) +
    (hasPractical ? (isPracticalAbsent ? 0 : (row.practicalScore ?? 0)) : 0);

  const isAbsent = isTheoryAbsent && (hasPractical ? isPracticalAbsent : true);

  return {
    student_id: row.studentId,
    theory_score: theoryScore,
    is_theory_absent: isTheoryAbsent,
    practical_score: practicalScore,
    is_practical_absent: isPracticalAbsent,
    score: totalScore,
    is_absent: isAbsent,
  };
}

export function validateStudentScoreBounds(
  row: {
    studentName?: string;
    theoryScore: number | null;
    isTheoryAbsent?: boolean;
    practicalScore: number | null;
    isPracticalAbsent?: boolean;
    score?: number | null;
    isAbsent?: boolean;
  },
  options: {
    hasPractical: boolean;
    theoryFullMark: number;
    practicalFullMark: number;
    fullMark: number;
  }
): string | undefined {
  const name = row.studentName || 'Student';

  if (options.hasPractical) {
    if (!row.isTheoryAbsent && row.theoryScore !== null && row.theoryScore !== undefined) {
      const th = Number(row.theoryScore);
      if (isNaN(th) || th < 0 || th > options.theoryFullMark) {
        return `${name} has an invalid Theory score (${row.theoryScore}). Must be between 0 and ${options.theoryFullMark}.`;
      }
    }
    if (!row.isPracticalAbsent && row.practicalScore !== null && row.practicalScore !== undefined) {
      const pr = Number(row.practicalScore);
      if (isNaN(pr) || pr < 0 || pr > options.practicalFullMark) {
        return `${name} has an invalid Practical score (${row.practicalScore}). Must be between 0 and ${options.practicalFullMark}.`;
      }
    }
  } else {
    const raw =
      row.theoryScore !== null && row.theoryScore !== undefined
        ? row.theoryScore
        : row.score;
    if (!row.isTheoryAbsent && !row.isAbsent && raw !== null && raw !== undefined) {
      const s = Number(raw);
      const limit = options.theoryFullMark || options.fullMark;
      if (isNaN(s) || s < 0 || s > limit) {
        return `${name} has an invalid score (${raw}). Must be between 0 and ${limit}.`;
      }
    }
  }

  return undefined;
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
  has_practical: boolean;
  theory_full_mark: number;
  theory_pass_mark: number;
  theory_score?: number | null;
  is_theory_absent?: boolean;
  practical_full_mark: number;
  practical_pass_mark: number;
  practical_score?: number | null;
  is_practical_absent?: boolean;
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

export interface BatchReportCardItem {
  student_id: string;
  student_name: string;
  file_url: string;
  file_name: string;
  generated_at: string;
}

export interface BatchReportCardsResponse {
  exam_id: string;
  exam_name: string;
  class_id: string;
  class_name: string;
  total_students: number;
  report_cards: BatchReportCardItem[];
}

