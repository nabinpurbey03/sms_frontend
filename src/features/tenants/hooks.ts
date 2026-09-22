import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { tenantsApi } from './api';
import type {
  TenantFilterParams,
  TenantFormData,
  TenantOnboardPayload,
  TenantAdminAssignRequest,
} from './types';

export const TENANTS_QUERY_KEY = 'tenants';

export const useTenants = (params?: TenantFilterParams) => {
  return useQuery({
    queryKey: [TENANTS_QUERY_KEY, params],
    queryFn: () => tenantsApi.getTenants(params),
    staleTime: 1000 * 30, // 30 seconds
  });
};

export const useTenant = (tenantId: string | null) => {
  return useQuery({
    queryKey: [TENANTS_QUERY_KEY, tenantId],
    queryFn: () => tenantsApi.getTenant(tenantId!),
    enabled: !!tenantId,
  });
};

export const useCreateTenant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TenantFormData) => tenantsApi.createTenant(data),
    onSuccess: (newTenant) => {
      queryClient.invalidateQueries({ queryKey: [TENANTS_QUERY_KEY] });
      toast.success('School Provisioned Successfully', {
        description: `${newTenant.name} has been created and domain '${newTenant.domain_name}' is ready.`,
      });
    },
    onError: (error: any) => {
      toast.error('Failed to Create School', {
        description: error.message || 'An unexpected error occurred while creating the tenant.',
      });
    },
  });
};

export const useUpdateTenant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tenantId,
      data,
    }: {
      tenantId: string;
      data: Partial<TenantFormData>;
    }) => tenantsApi.updateTenant(tenantId, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: [TENANTS_QUERY_KEY] });
      toast.success('School Profile Updated', {
        description: `Changes to ${updated.name} have been saved successfully.`,
      });
    },
    onError: (error: any) => {
      toast.error('Update Failed', {
        description: error.message || 'Could not update school profile.',
      });
    },
  });
};

export const useUpdateTenantStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tenantId, isActive }: { tenantId: string; isActive: boolean }) =>
      tenantsApi.updateTenantStatus(tenantId, isActive),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: [TENANTS_QUERY_KEY] });
      toast.success('School Status Updated', {
        description: `${updated.name} has been ${updated.is_active ? 'activated' : 'suspended'}.`,
      });
    },
    onError: (error: any) => {
      toast.error('Status Update Failed', {
        description: error.message || 'Could not update school status.',
      });
    },
  });
};

export const useUploadTenantLogo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tenantId, file }: { tenantId: string; file: File }) =>
      tenantsApi.uploadLogo(tenantId, file),
    onSuccess: (updated, variables) => {
      queryClient.invalidateQueries({ queryKey: [TENANTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [TENANT_DIRECTORY_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [TENANT_ANALYTICS_QUERY_KEY, variables.tenantId] });
      queryClient.invalidateQueries({ queryKey: [TENANTS_QUERY_KEY, variables.tenantId] });
      toast.success('Logo Uploaded', {
        description: `Brand logo for ${updated.name} updated successfully.`,
      });
    },
    onError: (error: any) => {
      toast.error('Logo Upload Failed', {
        description: error.message || 'Could not upload school logo.',
      });
    },
  });
};

export const useDeleteTenant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tenantId: string) => tenantsApi.deleteTenant(tenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TENANTS_QUERY_KEY] });
      toast.success('School Tenant Deleted', {
        description: 'The school and all its records have been permanently removed.',
      });
    },
    onError: (error: any) => {
      toast.error('Deletion Failed', {
        description: error.message || 'Could not delete school tenant.',
      });
    },
  });
};

export const useOnboardTenant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TenantOnboardPayload) => tenantsApi.onboardTenant(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [TENANTS_QUERY_KEY] });
      toast.success('School Onboarded Successfully', {
        description: `${response.tenant.name} has been created and domain '${response.tenant.domain_name}' is ready.`,
      });
    },
    onError: (error: any) => {
      toast.error('Failed to Onboard School', {
        description: error.message || 'An unexpected error occurred while onboarding the tenant.',
      });
    },
  });
};

export const TENANT_DIRECTORY_QUERY_KEY = 'tenants-directory';
export const TENANT_ANALYTICS_QUERY_KEY = 'tenant-analytics';
export const TENANT_ADMINS_QUERY_KEY = 'tenant-admins';

export const useTenantDirectory = (
  params?: TenantFilterParams,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: [TENANT_DIRECTORY_QUERY_KEY, params],
    queryFn: () => tenantsApi.getTenantDirectory(params),
    enabled: options?.enabled !== undefined ? options.enabled : true,
    placeholderData: (prev) => prev,
  });
};

export const useTenantAnalytics = (
  tenantId: string | null | undefined,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: [TENANT_ANALYTICS_QUERY_KEY, tenantId],
    queryFn: () => tenantsApi.getTenantAnalytics(tenantId!),
    enabled: Boolean(tenantId) && (options?.enabled !== undefined ? options.enabled : true),
  });
};

export const useTenantAdmins = (
  tenantId: string | null | undefined,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: [TENANT_ADMINS_QUERY_KEY, tenantId],
    queryFn: () => tenantsApi.getTenantAdmins(tenantId!),
    enabled: Boolean(tenantId) && (options?.enabled !== undefined ? options.enabled : true),
  });
};

export const useAssignTenantAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      tenantId,
      payload,
    }: {
      tenantId: string;
      payload: TenantAdminAssignRequest;
    }) => tenantsApi.assignTenantAdmin(tenantId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [TENANT_ADMINS_QUERY_KEY, variables.tenantId] });
      queryClient.invalidateQueries({ queryKey: [TENANT_DIRECTORY_QUERY_KEY] });
      toast.success('School Administrator assigned successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to assign school administrator');
    },
  });
};

