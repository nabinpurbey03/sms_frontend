import { apiClient } from '@/api/client';

export interface SuperAdminDashboardMetrics {
  total_platform_users: number;
  active_users: number;
  inactive_users: number;
  total_super_admins: number;
  total_regular_users: number;
  total_admins: number;
  total_office_admins: number;
  total_teachers: number;
  total_parents: number;
  total_tenants: number;
  active_tenants: number;
  inactive_tenants: number;
  total_students_across_platform?: number;
  today_attendance_records_count?: number;
  today_platform_attendance_rate?: number | null;
  recent_tenants: Array<{
    id: string;
    name: string;
    domain: string;
    is_active: boolean;
    created_at: string;
  }>;
}

export interface PlatformTrendPointDTO {
  date: string;
  new_tenants: number;
  new_users: number;
  total_attendance_records: number;
  platform_attendance_rate: number | null;
}

export interface PlatformTrendsSummaryDTO {
  period_days: number;
  total_new_tenants: number;
  total_new_users: number;
  period_average_attendance_rate: number | null;
}

export interface PlatformTrendsResponseDTO {
  daily_metrics: PlatformTrendPointDTO[];
  summary: PlatformTrendsSummaryDTO;
}

export interface TenantEnrollmentRankDTO {
  tenant_id: string;
  name: string;
  domain_name: string;
  student_count: number;
  teacher_count: number;
  student_teacher_ratio: number | null;
}

export interface TenantAttendanceRankDTO {
  tenant_id: string;
  name: string;
  domain_name: string;
  attendance_percentage: number;
  total_marked: number;
}

export interface TenantActivityRankDTO {
  tenant_id: string;
  name: string;
  domain_name: string;
  mutation_count_24h: number;
  last_activity_at: string | null;
}

export interface TenantRankingsResponseDTO {
  top_by_enrollment: TenantEnrollmentRankDTO[];
  top_by_attendance_today: TenantAttendanceRankDTO[];
  most_active_24h: TenantActivityRankDTO[];
}

export interface TenantDashboardMetrics {
  total_students: number;
  total_teachers: number;
  total_classes: number;
  total_sections: number;
  academic_year_id?: string | null;
  academic_year_name?: string | null;
  academic_year_status?: string | null;
  is_current_year?: boolean | null;
  academic_year_start_date?: string | null;
  academic_year_end_date?: string | null;
}

export const dashboardApi = {
  getSuperAdminMetrics: async (): Promise<SuperAdminDashboardMetrics> => {
    const data = await apiClient.get('/dashboard/super-admin');
    return data as unknown as SuperAdminDashboardMetrics;
  },

  getPlatformTrends: async (days: number = 7): Promise<PlatformTrendsResponseDTO> => {
    const data = await apiClient.get('/dashboard/super-admin/trends', { params: { days } });
    return data as unknown as PlatformTrendsResponseDTO;
  },

  getTenantRankings: async (limit: number = 5): Promise<TenantRankingsResponseDTO> => {
    const data = await apiClient.get('/dashboard/super-admin/rankings', { params: { limit } });
    return data as unknown as TenantRankingsResponseDTO;
  },
  
  getTenantMetrics: async (academicYearId?: string): Promise<TenantDashboardMetrics> => {
    const data = await apiClient.get('/dashboard/tenant', {
      params: academicYearId ? { academic_year_id: academicYearId } : undefined,
    });
    return data as unknown as TenantDashboardMetrics;
  },
};
