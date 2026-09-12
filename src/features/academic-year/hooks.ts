import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { academicYearApi } from './api';
import { toast } from 'sonner';

export const ACADEMIC_YEARS_QUERY_KEY = 'academic_years';

export const useAcademicYears = (tenantId: string | null) => {
  return useQuery({
    queryKey: [ACADEMIC_YEARS_QUERY_KEY, tenantId],
    queryFn: () => academicYearApi.getAcademicYears(tenantId!),
    enabled: !!tenantId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useCreateAcademicYear = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantId, data }: { tenantId: string; data: any }) => 
      academicYearApi.createAcademicYear(tenantId, data),
    onSuccess: (_, { tenantId }) => {
      queryClient.invalidateQueries({ queryKey: [ACADEMIC_YEARS_QUERY_KEY, tenantId] });
      toast.success('Academic Year created successfully');
    },
    onError: (err: any) => {
      toast.error('Failed to create academic year');
    }
  });
};

export const useSetCurrentAcademicYear = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantId, yearId }: { tenantId: string; yearId: string }) => 
      academicYearApi.setCurrentAcademicYear(tenantId, yearId),
    onSuccess: (_, { tenantId }) => {
      queryClient.invalidateQueries({ queryKey: [ACADEMIC_YEARS_QUERY_KEY, tenantId] });
      toast.success('Current Academic Year updated successfully');
    },
    onError: (err: any) => {
      toast.error('Failed to set current academic year');
    }
  });
};

export const useCloseAcademicYear = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantId, yearId }: { tenantId: string; yearId: string }) => 
      academicYearApi.closeAcademicYear(tenantId, yearId),
    onSuccess: (_, { tenantId }) => {
      queryClient.invalidateQueries({ queryKey: [ACADEMIC_YEARS_QUERY_KEY, tenantId] });
      toast.success('Academic Year closed successfully');
    },
    onError: (err: any) => {
      toast.error('Failed to close academic year');
    }
  });
};
