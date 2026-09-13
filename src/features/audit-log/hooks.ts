import { useQuery } from '@tanstack/react-query';
import { getAuditLogs } from './api';
import type { AuditLogQueryParams } from './schema';

export const AUDIT_LOGS_QUERY_KEY = 'audit-logs';

export const useAuditLogs = (params?: AuditLogQueryParams) => {
  return useQuery({
    queryKey: [AUDIT_LOGS_QUERY_KEY, params],
    queryFn: () => getAuditLogs(params),
  });
};
