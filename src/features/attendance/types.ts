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

export interface AttendanceSummary {
  date: string;
  total_students: number;
  present_count: number;
  absent_count: number;
  classes: {
    class_id: string;
    class_name: string;
    total_students: number;
    present_count: number;
    absent_count: number;
    sections: {
      section_id: string;
      section_name: string;
      total_students: number;
      present_count: number;
      absent_count: number;
    }[];
  }[];
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
