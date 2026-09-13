import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from './api';

export const useSuperAdminDashboard = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['dashboard', 'super-admin'],
    queryFn: dashboardApi.getSuperAdminMetrics,
    enabled,
    staleTime: 60 * 1000,
  });
};

export const useTenantDashboard = (tenantId: string | null) => {
  return useQuery({
    queryKey: ['dashboard', 'tenant', tenantId],
    queryFn: dashboardApi.getTenantMetrics,
    enabled: !!tenantId,
    staleTime: 60 * 1000,
  });
};
