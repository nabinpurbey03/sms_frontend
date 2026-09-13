import { apiClient } from '@/api/client';
import type { AuditLog, PaginatedResponse, AuditLogQueryParams } from './schema';

export const getAuditLogs = async (params?: AuditLogQueryParams): Promise<PaginatedResponse<AuditLog>> => {
  return apiClient.get('/audit-logs', { params }) as Promise<PaginatedResponse<AuditLog>>;
};
