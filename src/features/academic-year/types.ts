export interface AcademicYear {
  id: string;
  tenant_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  is_closed: boolean;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export type AcademicYearResponse = AcademicYear;

export interface AcademicYearCreateDTO {
  name: string;
  start_date: string;
  end_date: string;
}

export interface AcademicYearUpdateDTO {
  name?: string;
  start_date?: string;
  end_date?: string;
}

export interface PlatformRolloverDTO {
  name: string;
  start_date: string;
  end_date: string;
}

export interface PlatformRolloverSummaryDTO {
  academic_year_name: string;
  total_tenants_affected: number;
  total_students_promoted: number;
  total_students_graduated: number;
}

