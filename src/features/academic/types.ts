export interface AcademicClass {
  id: string;
  tenant_id: string;
  name: string;
  sequence_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface AcademicSection {
  id: string;
  tenant_id: string;
  class_id: string;
  name: string; // 'A', 'B', 'C'...
  created_at?: string;
  updated_at?: string;
  student_count?: number;
}

export interface AcademicStudent {
  id: string;
  tenant_id: string;
  class_id: string;
  section_id?: string | null;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  status: 'ACTIVE' | 'TRANSFERRED' | 'GRADUATED' | 'SUSPENDED';
  created_at?: string;
  updated_at?: string;
}

export interface AcademicSubject {
  id: string;
  tenant_id: string;
  class_id: string;
  name: string;
  code?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SectionAddEligibility {
  can_add: boolean;
  next_section_name?: string | null;
  reason: string;
  current_students?: number;
  required_students?: number;
}

export interface ClassCreateDTO {
  name: string;
}

export interface ClassUpdateDTO {
  name: string;
}

export interface ClassReorderDTO {
  class_ids: string[];
}

export interface StudentCreateDTO {
  first_name: string;
  middle_name?: string;
  last_name: string;
}

export interface SubjectCreateDTO {
  name: string;
  code?: string;
}

export interface ClassWithDetails extends AcademicClass {
  sections: AcademicSection[];
  students: AcademicStudent[];
  subjects: AcademicSubject[];
}

export interface AcademicStats {
  totalClasses: number;
  totalSections: number;
  totalStudents: number;
  avgStudentsPerSection: number;
}

export interface TeacherAssignment {
  id: string;
  tenant_id: string;
  teacher_id: string;
  class_id: string;
  section_id?: string | null;
  subject_id?: string | null;
  is_class_teacher: boolean;
  teacher_name?: string | null;
  class_name?: string | null;
  section_name?: string | null;
  subject_name?: string | null;
  created_at?: string;
}

export interface AssignTeacherDTO {
  teacher_id?: string;
  teacher_phone?: string;
  section_id?: string;
}


// ==========================================
// Parent-Teacher Link Interfaces
// ==========================================
export interface TeacherContactInfo {
  teacher_id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
}

export interface SubjectTeacherContactInfo {
  subject_id: string;
  subject_name: string;
  subject_code?: string | null;
  teacher_id?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface ChildTeachersResponse {
  student_id: string;
  student_name: string;
  class_id: string;
  class_name: string;
  section_id?: string | null;
  section_name?: string | null;
  relationship_type: string;
  class_teacher?: TeacherContactInfo | null;
  subject_teachers: SubjectTeacherContactInfo[];
}

export interface StudentParentContactInfo {
  parent_id: string;
  name: string;
  relationship_type: string;
  phone?: string | null;
  email?: string | null;
  is_primary_contact: boolean;
}

export interface TeacherStudentParentItem {
  student_id: string;
  student_name: string;
  class_id: string;
  class_name: string;
  section_id?: string | null;
  section_name?: string | null;
  status: string;
  is_class_teacher_for_student: boolean;
  subjects_taught: string[];
  parent?: StudentParentContactInfo | null;
}

export interface TeacherAssignedClassOption {
  class_id: string;
  class_name: string;
  section_id?: string | null;
  section_name?: string | null;
  is_class_teacher: boolean;
  subjects: string[];
}

export interface TeacherStudentsParentsResponse {
  assigned_classes: TeacherAssignedClassOption[];
  students: TeacherStudentParentItem[];
  total_students: number;
  total_linked_parents: number;
}

// ==========================================
// Cohort Retention & Analytics Interfaces
// ==========================================
export interface CohortRetentionMetric {
  class_id: string;
  class_name: string;
  sequence_order: number;
  starting_enrolled: number;
  retained_next_year: number;
  graduated: number;
  transferred_out: number;
  retention_rate: number;
}

export interface AcademicYearRetentionResponse {
  academic_year_id: string;
  academic_year_name: string;
  next_academic_year_id?: string | null;
  next_academic_year_name?: string | null;
  overall_retention_rate: number;
  total_starting_enrolled: number;
  total_retained: number;
  total_graduated: number;
  total_transferred_out: number;
  grade_breakdown: CohortRetentionMetric[];
}

// ==========================================
// Attendance & Early Warning Intelligence Interfaces
// ==========================================
export interface AtRiskStudentDTO {
  student_id: string;
  student_name: string;
  class_id: string;
  class_name: string;
  section_name?: string | null;
  total_sessions: number;
  present_days: number;
  absent_days: number;
  attendance_rate: number;
  risk_level: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'WATCHLIST';
}

export interface DayOfWeekAttendancePoint {
  day_name: string;
  day_index: number;
  present_count: number;
  total_count: number;
  attendance_rate: number;
}

export interface AttendanceIntelligenceResponse {
  academic_year_id: string;
  academic_year_name: string;
  overall_attendance_rate: number;
  total_attendance_records: number;
  chronic_absenteeism_count: number;
  total_evaluated_students: number;
  at_risk_students: AtRiskStudentDTO[];
  day_of_week_trends: DayOfWeekAttendancePoint[];
}

// ==========================================
// Academic Growth & Curriculum Mastery Interfaces
// ==========================================
export interface SubjectMasteryMetric {
  subject_id: string;
  subject_name: string;
  class_name?: string | null;
  total_scores_evaluated: number;
  average_score_pct: number;
  pass_rate_pct: number;
  highest_score: number;
  lowest_score: number;
  difficulty_classification: 'Rigorous' | 'Balanced' | 'High Mastery';
}

export interface TermGrowthPoint {
  exam_id: string;
  term_name: string;
  exam_date?: string | null;
  average_percentage: number;
  average_gpa: number;
  total_students_assessed: number;
}

export interface AcademicGrowthResponse {
  academic_year_id: string;
  academic_year_name: string;
  overall_school_average_pct: number;
  overall_school_gpa: number;
  total_exams_evaluated: number;
  total_scores_analyzed: number;
  term_growth_trajectory: TermGrowthPoint[];
  subject_mastery: SubjectMasteryMetric[];
}

// ==========================================
// Capacity Utilization & Network Benchmark Interfaces
// ==========================================
export interface SectionCapacityMetric {
  section_id: string;
  section_name: string;
  class_id: string;
  class_name: string;
  enrolled_count: number;
  target_capacity: number;
  utilization_rate_pct: number;
  status: 'OVERCROWDED' | 'OPTIMAL' | 'BALANCED' | 'UNDERUTILIZED';
}

export interface CapacityUtilizationResponse {
  academic_year_id: string;
  academic_year_name: string;
  total_sections: number;
  total_enrolled_students: number;
  average_section_size: number;
  optimal_sections_count: number;
  overcrowded_sections_count: number;
  underutilized_sections_count: number;
  sections_breakdown: SectionCapacityMetric[];
}

export interface SchoolBenchmarkCardDTO {
  tenant_id: string;
  school_name: string;
  domain_name?: string | null;
  active_students_count: number;
  total_classes_count: number;
  total_sections_count: number;
  attendance_rate_pct?: number | null;
  retention_rate_pct?: number | null;
  average_gpa?: number | null;
  performance_tier: 'Top Tier' | 'Strong' | 'Average' | 'Requires Support';
}

export interface PlatformNetworkBenchmarkResponse {
  total_schools_evaluated: number;
  platform_average_attendance: number;
  platform_average_retention: number;
  platform_total_students: number;
  schools_ranked: SchoolBenchmarkCardDTO[];
}

export interface GraduatedStudentDTO {
  student_id: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  final_class_id: string;
  final_class_name: string;
  final_section_id?: string | null;
  final_section_name?: string | null;
  graduation_academic_year_id?: string | null;
  graduation_academic_year_name?: string | null;
  exit_date?: string | null;
  status: string;
  parent_name?: string | null;
  parent_phone?: string | null;
}

export interface GraduatedStudentListResponse {
  total_graduates: number;
  items: GraduatedStudentDTO[];
}
