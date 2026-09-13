import { apiClient } from '@/api/client';
import type {
  Tenant,
  TenantListResponse,
  TenantFilterParams,
  TenantFormData,
} from './types';

export const tenantsApi = {
  getTenants: async (params?: TenantFilterParams): Promise<TenantListResponse> => {
    const res = await apiClient.get('/tenants/', { params }) as any;
    // Map backend PaginatedResponse (data, meta) to TenantListResponse (items, total)
    if (res && res.meta) {
      return {
        items: res.data || [],
        total: res.meta.total_records || 0,
        page: res.meta.page || 1,
        page_size: res.meta.page_size || 20,
        total_pages: res.meta.total_pages || 1,
      };
    }
    // Fallback if interceptor strips it
    return {
      items: res || [],
      total: Array.isArray(res) ? res.length : 0,
      page: 1,
      page_size: 20,
      total_pages: 1,
    };
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

