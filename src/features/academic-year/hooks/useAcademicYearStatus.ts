import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { academicYearApi } from '../api';
import type {
  AcademicYearStatusResponse,
  QuickTransitionPayload,
  QuickTransitionResponse,
  PlatformBsProvisionPayload,
  PlatformBsProvisionResponse,
} from '../types';

export const ACADEMIC_YEAR_STATUS_QUERY_KEY = 'academic-year-status';

export const useAcademicYearStatus = (tenantId: string | null) => {
  return useQuery<AcademicYearStatusResponse>({
    queryKey: [ACADEMIC_YEAR_STATUS_QUERY_KEY, tenantId],
    queryFn: () => academicYearApi.getAcademicYearStatus(tenantId!),
    enabled: Boolean(tenantId),
    staleTime: 1000 * 60, // 1 minute
  });
};

export interface QuickTransitionVariables {
  tenantId: string;
  payload?: QuickTransitionPayload;
  data?: QuickTransitionPayload;
  target_year_id?: string;
  promote_students?: boolean;
}

export const useQuickTransitionAcademicYear = () => {
  const queryClient = useQueryClient();

  return useMutation<
    QuickTransitionResponse,
    any,
    QuickTransitionVariables
  >({
    mutationFn: (variables: QuickTransitionVariables) => {
      const payload: QuickTransitionPayload =
        variables.payload ||
        variables.data || {
          target_year_id: variables.target_year_id!,
          promote_students: variables.promote_students,
        };
      return academicYearApi.quickTransition(variables.tenantId, payload);
    },
    onSuccess: (res) => {
      toast.success(
        `Academic year transitioned to '${res.current_year_name}' successfully! Promoted: ${res.students_promoted}, Graduated: ${res.students_graduated}`
      );
      queryClient.invalidateQueries({ queryKey: ['academic-year-status'] });
      queryClient.invalidateQueries({ queryKey: ['academic-years'] });
      queryClient.invalidateQueries({ queryKey: ['academic_years'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to transition academic year';
      toast.error('Transition Failed', { description: msg });
    },
  });
};

export interface PlatformProvisionBsVariables {
  bs_year?: number;
  payload?: PlatformBsProvisionPayload;
  data?: PlatformBsProvisionPayload;
}

export const usePlatformProvisionBsYear = () => {
  const queryClient = useQueryClient();

  return useMutation<
    PlatformBsProvisionResponse,
    any,
    PlatformBsProvisionPayload | PlatformProvisionBsVariables
  >({
    mutationFn: (variables) => {
      let payload: PlatformBsProvisionPayload;
      if ('bs_year' in variables && typeof variables.bs_year === 'number') {
        payload = { bs_year: variables.bs_year };
      } else if ('payload' in variables && variables.payload) {
        payload = variables.payload;
      } else if ('data' in variables && variables.data) {
        payload = variables.data;
      } else {
        payload = variables as PlatformBsProvisionPayload;
      }
      return academicYearApi.provisionBsYear(payload);
    },
    onSuccess: (res) => {
      toast.success(
        `Academic year '${res.academic_year_name}' provisioned across ${res.tenants_provisioned} schools (${res.tenants_skipped} skipped)`
      );
      queryClient.invalidateQueries({ queryKey: ['academic-year-status'] });
      queryClient.invalidateQueries({ queryKey: ['academic-years'] });
      queryClient.invalidateQueries({ queryKey: ['academic_years'] });
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to provision BS academic year';
      toast.error('Provisioning Failed', { description: msg });
    },
  });
};
