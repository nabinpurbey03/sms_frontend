import { apiClient } from '@/api/client';
import type {
  AcademicYear,
  AcademicYearCreateDTO,
  AcademicYearUpdateDTO,
  PlatformRolloverDTO,
  PlatformRolloverSummaryDTO,
  AcademicYearStatusResponse,
  QuickTransitionPayload,
  QuickTransitionResponse,
  PlatformBsProvisionPayload,
  PlatformBsProvisionResponse,
} from './types';
import type {
  TenantAcademicYearRolloverRequest,
  TenantRolloverSummaryResponse,
  RolloverPreviewResponse,
} from './schema';
import type { ApiResponse } from '@/api/types';

export const academicYearApi = {
  getAcademicYearStatus: async (tenantId: string): Promise<AcademicYearStatusResponse> => {
    return apiClient.get(`/tenants/${tenantId}/academic-years/status`);
  },

  quickTransition: async (
    tenantId: string,
    data: QuickTransitionPayload
  ): Promise<QuickTransitionResponse> => {
    return apiClient.post(`/tenants/${tenantId}/academic-years/quick-transition`, data);
  },

  provisionBsYear: async (
    data: PlatformBsProvisionPayload
  ): Promise<PlatformBsProvisionResponse> => {
    return apiClient.post('/platform/academic-years/provision-bs', data);
  },

  previewRollover: async (tenantId: string): Promise<RolloverPreviewResponse> => {
    return apiClient.post(`/academic/tenants/${tenantId}/academic-years/rollover/preview`);
  },
  getAcademicYears: async (tenantId: string): Promise<AcademicYear[]> => {
    return apiClient.get(`/academic/tenants/${tenantId}/academic-years`);
  },

  createAcademicYear: async (tenantId: string, data: AcademicYearCreateDTO): Promise<AcademicYear> => {
    return apiClient.post(`/academic/tenants/${tenantId}/academic-years`, data);
  },

  updateAcademicYear: async (tenantId: string, yearId: string, data: AcademicYearUpdateDTO): Promise<AcademicYear> => {
    return apiClient.patch(`/academic/tenants/${tenantId}/academic-years/${yearId}`, data);
  },

  setCurrentAcademicYear: async (tenantId: string, yearId: string): Promise<AcademicYear> => {
    return apiClient.post(`/academic/tenants/${tenantId}/academic-years/${yearId}/set-current`, {});
  },

  closeAcademicYear: async (tenantId: string, yearId: string): Promise<AcademicYear> => {
    return apiClient.post(`/academic/tenants/${tenantId}/academic-years/${yearId}/close`, {});
  },

  platformRollover: async (data: PlatformRolloverDTO): Promise<PlatformRolloverSummaryDTO> => {
    return apiClient.post('/academic/platform/academic-years/rollover', data);
  },

  tenantRollover: async (
    tenantId: string,
    data: TenantAcademicYearRolloverRequest
  ): Promise<TenantRolloverSummaryResponse> => {
    return apiClient.post(`/academic/tenants/${tenantId}/academic-years/rollover`, data);
  },
};
