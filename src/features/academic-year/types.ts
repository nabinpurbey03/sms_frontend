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

export function isAcademicYearClosed(year: AcademicYear): boolean {
  return year.status === 'CLOSED' || year.status === 'COMPLETED' || Boolean(year.is_closed);
}

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
  copy_student_facilities?: boolean;
}

export interface PlatformRolloverSummaryDTO {
  academic_year_name: string;
  total_tenants_affected: number;
  total_students_promoted: number;
  total_students_graduated: number;
  transport_profiles_carried_forward?: number;
  student_facilities_carried_forward?: number;
}

export interface AcademicYearStatusResponse {
  current_year: AcademicYearResponse | null;
  is_expired: boolean;
  days_since_ended: number;
  next_year: AcademicYearResponse | null;
  eligible_students_count: number;
  can_transition: boolean;
}

export interface QuickTransitionPayload {
  target_year_id: string;
  promote_students?: boolean;
}

export interface QuickTransitionResponse {
  previous_year_name: string;
  current_year_name: string;
  students_promoted: number;
  students_graduated: number;
  status: string;
}

export interface PlatformBsProvisionPayload {
  bs_year: number;
}

export interface PlatformBsProvisionResponse {
  bs_year: number;
  academic_year_name: string;
  start_date: string;
  end_date: string;
  tenants_provisioned: number;
  tenants_skipped: number;
}

