import { apiClient } from '@/api/client';
import type { AcademicYear, AcademicYearCreateDTO, AcademicYearUpdateDTO } from './types';

export const academicYearApi = {
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
  }
};
