import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schoolSettingsApi } from './api';
import { toast } from 'sonner';
import type {
  SchoolSettingUpdateRequest,
  CalendarEventCreateDTO,
  CalendarEventUpdateDTO,
  CalendarEventFilterParams,
} from './types';

export const SCHOOL_SETTINGS_QUERY_KEY = 'school_settings';
export const CALENDAR_EVENTS_QUERY_KEY = 'calendar_events';

export const useSchoolSettings = (tenantId: string | null) => {
  return useQuery({
    queryKey: [SCHOOL_SETTINGS_QUERY_KEY, tenantId],
    queryFn: () => schoolSettingsApi.getSettings(tenantId!),
    enabled: !!tenantId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useUpdateSchoolSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      tenantId,
      data,
    }: {
      tenantId: string;
      data: SchoolSettingUpdateRequest;
    }) => schoolSettingsApi.updateSettings(tenantId, data),
    onSuccess: (_, { tenantId }) => {
      queryClient.invalidateQueries({ queryKey: [SCHOOL_SETTINGS_QUERY_KEY, tenantId] });
      toast.success('School settings updated successfully');
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to update school settings'
      );
    },
  });
};

export const useCalendarEvents = (
  tenantId: string | null,
  params?: CalendarEventFilterParams
) => {
  return useQuery({
    queryKey: [CALENDAR_EVENTS_QUERY_KEY, tenantId, params],
    queryFn: () => schoolSettingsApi.getCalendarEvents(tenantId!, params),
    enabled: !!tenantId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

export const useCreateCalendarEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      tenantId,
      data,
    }: {
      tenantId: string;
      data: CalendarEventCreateDTO;
    }) => schoolSettingsApi.createCalendarEvent(tenantId, data),
    onSuccess: (_, { tenantId }) => {
      queryClient.invalidateQueries({ queryKey: [CALENDAR_EVENTS_QUERY_KEY, tenantId] });
      toast.success('Calendar event created successfully');
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to create calendar event'
      );
    },
  });
};

export const useUpdateCalendarEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      tenantId,
      eventId,
      data,
    }: {
      tenantId: string;
      eventId: string;
      data: CalendarEventUpdateDTO;
    }) => schoolSettingsApi.updateCalendarEvent(tenantId, eventId, data),
    onSuccess: (_, { tenantId }) => {
      queryClient.invalidateQueries({ queryKey: [CALENDAR_EVENTS_QUERY_KEY, tenantId] });
      toast.success('Calendar event updated successfully');
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to update calendar event'
      );
    },
  });
};

export const useDeleteCalendarEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      tenantId,
      eventId,
    }: {
      tenantId: string;
      eventId: string;
    }) => schoolSettingsApi.deleteCalendarEvent(tenantId, eventId),
    onSuccess: (_, { tenantId }) => {
      queryClient.invalidateQueries({ queryKey: [CALENDAR_EVENTS_QUERY_KEY, tenantId] });
      toast.success('Calendar event deleted successfully');
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to delete calendar event'
      );
    },
  });
};
