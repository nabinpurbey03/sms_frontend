export interface AttendanceRecord {
  id: string;
  tenant_id: string;
  class_id: string;
  section_id: string;
  student_id: string;
  date: string;
  is_present: boolean;
  is_locked: boolean;
  remarks?: string | null;
}

export interface StudentAttendanceRecord {
  student_id: string;
  student_name?: string;
  first_name?: string;
  middle_name?: string | null;
  last_name?: string;
  records: Record<string, boolean>;
  present_count?: number;
  absent_count?: number;
  total_days?: number;
  total_present?: number;
  total_absent?: number;
  attendance_percentage?: number;
}

export interface SectionAttendanceReport {
  class_id?: string;
  class_name?: string;
  section_id?: string;
  section_name?: string;
  start_date?: string;
  end_date?: string;
  from_date?: string;
  to_date?: string;
  total_school_days?: number;
  students: StudentAttendanceRecord[];
}

export interface AttendanceReport {
  student_id: string;
  student_name: string;
  class_name: string;
  section_name: string;
  start_date: string;
  end_date: string;
  present_count: number;
  absent_count: number;
  total_days: number;
  attendance_percentage: number;
  records: {
    date: string;
    is_present: boolean;
    remarks?: string | null;
  }[];
}

export interface AttendanceLevelStats {
  total_students: number;
  total_present: number;
}

export interface AttendanceSummary {
  date: string;
  school: AttendanceLevelStats;
  class_stats?: AttendanceLevelStats | null;
  section_stats?: AttendanceLevelStats | null;
}

export interface MarkAttendanceDTO {
  present_student_ids: string[];
}

export interface AttendanceFilterDTO {
  start_date?: string;
  end_date?: string;
  class_id?: string;
  section_id?: string;
}

export interface SectionDailyAttendanceStatus {
  section_id: string;
  class_id: string;
  is_marked: boolean;
  total_students: number;
  present_count: number;
  absent_count: number;
  is_locked: boolean;
}

export interface DailyAttendanceStatus {
  date: string;
  marked_section_ids: string[];
  sections: SectionDailyAttendanceStatus[];
}

export interface ClassAttendanceSummaryItem {
  class_id: string;
  class_name: string;
  total_students: number;
  total_present: number;
  total_absent: number;
  attendance_percentage: number;
}

export interface DailySchoolAttendanceItem {
  date: string;
  total_students: number;
  present_count: number;
  absent_count: number;
  attendance_percentage: number;
}

export interface AtRiskStudentSummary {
  student_id: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  class_id: string;
  class_name: string;
  section_id?: string | null;
  section_name?: string | null;
  total_days: number;
  total_present: number;
  total_absent: number;
  attendance_percentage: number;
}

export interface DayOfWeekAttendanceSummary {
  day_name: string;
  day_index: number;
  total_records: number;
  present_count: number;
  absent_count: number;
  attendance_percentage: number;
}

export interface SchoolAttendanceReportResponse {
  from_date: string;
  to_date: string;
  total_school_days: number;
  total_students: number;
  total_present: number;
  total_absent: number;
  overall_attendance_percentage: number;
  best_class_name?: string | null;
  lowest_class_name?: string | null;
  chronic_absentee_count: number;
  chronic_absentee_rate: number;
  at_risk_students: AtRiskStudentSummary[];
  day_of_week_stats: DayOfWeekAttendanceSummary[];
  classes: ClassAttendanceSummaryItem[];
  daily_stats: DailySchoolAttendanceItem[];
}

export interface SectionAttendanceSummaryItem {
  section_id: string;
  section_name: string;
  total_students: number;
  total_present: number;
  total_absent: number;
  attendance_percentage: number;
}

export interface ClassStudentAttendanceSummary {
  student_id: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  section_id?: string | null;
  section_name?: string | null;
  total_present: number;
  total_absent: number;
  attendance_percentage: number;
  records: Record<string, boolean>;
}

export interface ClassAttendanceReportResponse {
  class_id: string;
  class_name: string;
  from_date: string;
  to_date: string;
  total_school_days: number;
  total_students: number;
  total_present: number;
  total_absent: number;
  overall_attendance_percentage: number;
  sections: SectionAttendanceSummaryItem[];
  students: ClassStudentAttendanceSummary[];
}

export interface IndividualStudentAttendanceReport {
  student_id: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  class_id: string;
  section_id?: string | null;
  from_date: string;
  to_date: string;
  total_days: number;
  total_present: number;
  total_absent: number;
  attendance_percentage: number;
  records: Record<string, boolean>;
}

