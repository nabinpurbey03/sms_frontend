import { apiClient } from '@/api/client';
import type {
  Tenant,
  TenantListResponse,
  TenantFilterParams,
  TenantFormData,
} from './types';

export const tenantsApi = {
  getTenants: async (params?: TenantFilterParams): Promise<TenantListResponse> => {
    return apiClient.get('/tenants/', { params });
  },

  getTenant: async (tenantId: string): Promise<Tenant> => {
    return apiClient.get(`/tenants/${tenantId}`);
  },

  createTenant: async (data: TenantFormData): Promise<Tenant> => {
    return apiClient.post('/tenants/', data);
  },

  updateTenant: async (
    tenantId: string,
    data: Partial<TenantFormData>
  ): Promise<Tenant> => {
    return apiClient.put(`/tenants/${tenantId}`, data);
  },

  uploadLogo: async (tenantId: string, file: File): Promise<Tenant> => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post(`/tenants/${tenantId}/logo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  deleteTenant: async (tenantId: string): Promise<{ success: boolean }> => {
    await apiClient.delete(`/tenants/${tenantId}`);
    return { success: true };
  },
};

