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

export const PLATFORM_TRENDS_QUERY_KEY = 'platform-trends';
export const TENANT_RANKINGS_QUERY_KEY = 'tenant-rankings';

export const usePlatformTrends = (days: number = 7, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: [PLATFORM_TRENDS_QUERY_KEY, days],
    queryFn: () => dashboardApi.getPlatformTrends(days),
    enabled: options?.enabled !== undefined ? options.enabled : true,
    staleTime: 60 * 1000,
  });
};

export const useTenantRankings = (limit: number = 5, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: [TENANT_RANKINGS_QUERY_KEY, limit],
    queryFn: () => dashboardApi.getTenantRankings(limit),
    enabled: options?.enabled !== undefined ? options.enabled : true,
    staleTime: 60 * 1000,
  });
};
