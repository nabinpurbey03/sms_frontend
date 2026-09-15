import { z } from 'zod';

export interface TenantAddress {
  id?: string;
  province: string;
  district: string;
  municipality: string;
  ward: number;
  tole?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Tenant {
  id: string;
  name: string;
  domain_name: string;
  email?: string | null;
  phone?: string | null;
  logo_url?: string | null;
  is_active: boolean;
  address?: TenantAddress | null;
  created_at: string;
  updated_at: string;
}

export interface TenantListResponse {
  items: Tenant[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface TenantFilterParams {
  page?: number;
  page_size?: number;
  is_active?: boolean;
  search?: string;
}

// Zod Validation Schemas
export const addressSchema = z.object({
  province: z.string().min(1, 'Province is required'),
  district: z.string().min(1, 'District is required'),
  municipality: z.string().min(1, 'Municipality is required'),
  ward: z.number().int().min(1, 'Ward must be a positive integer'),
  tole: z.string().optional().nullable(),
});

export const tenantFormSchema = z.object({
  name: z.string().min(2, 'School name must be at least 2 characters'),
  domain_name: z
    .string()
    .min(2, 'Domain slug must be at least 2 characters')
    .max(50, 'Domain slug must be at most 50 characters')
    .regex(
      /^[a-z0-9-]+$/,
      'Domain slug must contain only lowercase letters, numbers, and hyphens (e.g., springfield-high)'
    ),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().min(7, 'Invalid phone number format').optional().or(z.literal('')),
  is_active: z.boolean(),
  address: addressSchema.optional().nullable(),
});

export type TenantFormData = z.infer<typeof tenantFormSchema>;
export type AddressFormData = z.infer<typeof addressSchema>;

export type TenantOnboardPayload =
  | {
      name: string;
      domain_name: string;
      email?: string | null;
      phone?: string | null;
      is_active?: boolean;
      address?: AddressFormData | null;
      admin_phone?: string | null;
    }
  | {
      tenant: TenantFormData;
      admin_phone?: string;
    };

export interface TenantOnboardResponse {
  tenant: Tenant;
  admin_assignment_status?: 'assigned' | 'pending_registration' | 'not_requested' | string;
  status?: string;
  invite_link?: string;
  admin_phone?: string;
}

export interface TenantAdminSummaryDTO {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

export interface TenantLiveStatsDTO {
  total_students: number;
  total_teachers: number;
  total_classes: number;
  total_sections: number;
  today_attendance_percentage: number | null;
  student_teacher_ratio: number | null;
}

export interface TenantDirectoryItemDTO {
  id: string;
  name: string;
  domain_name: string;
  email?: string | null;
  phone?: string | null;
  logo_url?: string | null;
  is_active: boolean;
  created_at: string;
  admin: TenantAdminSummaryDTO | null;
  metrics: TenantLiveStatsDTO;
}

export interface TenantDirectoryResponse {
  items: TenantDirectoryItemDTO[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface TenantDailyAttendancePointDTO {
  date: string;
  total_records: number;
  present_count: number;
  absent_count: number;
  attendance_percentage: number | null;
}

export interface TenantEnrollmentBreakdownDTO {
  total_students: number;
  active_students: number;
  transferred_students: number;
  graduated_students: number;
  suspended_students: number;
}

export interface TenantStaffCommunityBreakdownDTO {
  total_teachers: number;
  total_office_admins: number;
  total_parents: number;
}

export interface TenantAcademicStructureDTO {
  total_classes: number;
  total_sections: number;
  total_subjects: number;
  student_teacher_ratio: number | null;
}

export interface TenantAttendanceOverviewDTO {
  today_records: number;
  today_present: number;
  today_absent: number;
  today_attendance_percentage: number | null;
  seven_days_trend: TenantDailyAttendancePointDTO[];
  thirty_days_average_percentage: number | null;
}

export interface TenantAcademicYearBriefDTO {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
}

export interface TenantExamsOverviewDTO {
  total_exams: number;
  approved_exams: number;
  pending_exams: number;
  draft_exams: number;
}

export interface TenantRecentAuditActivityDTO {
  id: string;
  action: string;
  status: string;
  user_id?: string | null;
  actor_email?: string | null;
  resource_id?: string | null;
  resource_type?: string | null;
  created_at: string;
  details?: string | null;
}

export interface TenantDeepDiveAnalyticsDTO {
  tenant_id: string;
  name: string;
  domain_name: string;
  is_active: boolean;
  created_at: string;
  enrollment: TenantEnrollmentBreakdownDTO;
  staff: TenantStaffCommunityBreakdownDTO;
  academic: TenantAcademicStructureDTO;
  attendance: TenantAttendanceOverviewDTO;
  academic_year: TenantAcademicYearBriefDTO | null;
  exams: TenantExamsOverviewDTO;
  recent_activity: TenantRecentAuditActivityDTO[];
}

export interface TenantAdminResponseDTO {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  is_active: boolean;
  assigned_at: string;
}

export interface TenantAdminAssignRequest {
  phone?: string;
  email?: string;
  user_id?: string;
}
