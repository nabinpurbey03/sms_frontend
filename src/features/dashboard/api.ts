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
  recent_tenants: Array<{
    id: string;
    name: string;
    domain: string;
    is_active: boolean;
    created_at: string;
  }>;
}

export interface TenantDashboardMetrics {
  total_students: number;
  total_teachers: number;
  total_classes: number;
  total_sections: number;
}

export const dashboardApi = {
  getSuperAdminMetrics: async (): Promise<SuperAdminDashboardMetrics> => {
    const data = await apiClient.get('/dashboard/super-admin');
    return data as unknown as SuperAdminDashboardMetrics;
  },
  
  getTenantMetrics: async (): Promise<TenantDashboardMetrics> => {
    const data = await apiClient.get('/dashboard/tenant');
    return data as unknown as TenantDashboardMetrics;
  },
};
