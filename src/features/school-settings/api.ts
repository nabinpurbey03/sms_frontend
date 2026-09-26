import { apiClient } from '@/api/client';
import type {
  SchoolSetting,
  SchoolSettingUpdateRequest,
  AcademicCalendarEvent,
  CalendarEventCreateDTO,
  CalendarEventUpdateDTO,
  CalendarEventFilterParams,
} from './types';

export const schoolSettingsApi = {
  getSettings: async (tenantId: string): Promise<SchoolSetting> => {
    return apiClient.get(`/tenants/${tenantId}/settings`);
  },

  updateSettings: async (
    tenantId: string,
    data: SchoolSettingUpdateRequest
  ): Promise<SchoolSetting> => {
    return apiClient.put(`/tenants/${tenantId}/settings`, data);
  },

  getCalendarEvents: async (
    tenantId: string,
    params?: CalendarEventFilterParams
  ): Promise<AcademicCalendarEvent[]> => {
    return apiClient.get(`/academic/tenants/${tenantId}/calendar-events`, { params });
  },

  createCalendarEvent: async (
    tenantId: string,
    data: CalendarEventCreateDTO
  ): Promise<AcademicCalendarEvent> => {
    return apiClient.post(`/academic/tenants/${tenantId}/calendar-events`, data);
  },

  updateCalendarEvent: async (
    tenantId: string,
    eventId: string,
    data: CalendarEventUpdateDTO
  ): Promise<AcademicCalendarEvent> => {
    return apiClient.patch(
      `/academic/tenants/${tenantId}/calendar-events/${eventId}`,
      data
    );
  },

  deleteCalendarEvent: async (
    tenantId: string,
    eventId: string
  ): Promise<{ success: boolean }> => {
    return apiClient.delete(`/academic/tenants/${tenantId}/calendar-events/${eventId}`);
  },
};
