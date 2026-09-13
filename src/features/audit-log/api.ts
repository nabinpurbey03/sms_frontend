import { apiClient } from '@/api/client';
import type { ApiResponse } from '@/api/types';
import type { AuditLog, PaginatedResponse, AuditLogQueryParams } from './schema';

export const getAuditLogs = async (params?: AuditLogQueryParams): Promise<ApiResponse<PaginatedResponse<AuditLog>>> => {
  return apiClient.get<unknown, ApiResponse<PaginatedResponse<AuditLog>>>('/audit-logs', { params });
};
