import { apiClient } from '@/api/client';
import type {
  Tenant,
  TenantListResponse,
  TenantFilterParams,
  TenantFormData,
  TenantOnboardPayload,
  TenantOnboardResponse,
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

  updateTenantStatus: async (
    tenantId: string,
    isActive: boolean
  ): Promise<Tenant> => {
    return apiClient.patch(`/tenants/${tenantId}/status`, { is_active: isActive });
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

  onboardTenant: async (payload: TenantOnboardPayload): Promise<TenantOnboardResponse> => {
    const data: any = 'tenant' in payload ? { ...payload.tenant, admin_phone: payload.admin_phone } : payload;

    const cleanPhone = (val?: string | null) => {
      if (!val) return null;
      const stripped = String(val).trim().replace(/[\s-]/g, '');
      if (!stripped) return null;
      if (stripped.startsWith('+977')) return stripped.slice(4);
      if (stripped.startsWith('977') && stripped.length === 13) return stripped.slice(3);
      return stripped;
    };

    const cleanPayload: Record<string, any> = {
      name: data.name?.trim(),
      domain_name: data.domain_name?.trim()?.toLowerCase(),
      email: data.email?.trim() || null,
      phone: cleanPhone(data.phone),
      is_active: data.is_active ?? true,
      admin_phone: cleanPhone(data.admin_phone),
    };

    if (
      data.address &&
      (data.address.province?.trim() ||
        data.address.district?.trim() ||
        data.address.municipality?.trim())
    ) {
      cleanPayload.address = {
        province: data.address.province?.trim() || '',
        district: data.address.district?.trim() || '',
        municipality: data.address.municipality?.trim() || '',
        ward: Number(data.address.ward) || 1,
        tole: data.address.tole?.trim() || null,
      };
    } else {
      cleanPayload.address = null;
    }

    return apiClient.post('/tenants/onboard', cleanPayload);
  },
};

