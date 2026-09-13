import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { toast } from 'sonner';

export interface PlatformUser {
  id: string;
  email: string;
  phone: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  is_active: boolean;
  is_super_admin: boolean;
  created_at?: string;
  deleted_at?: string | null;
}

interface FetchPlatformUsersParams {
  search?: string;
  is_active?: boolean;
  role?: 'super_admin' | 'user';
  page: number;
  page_size: number;
}

export const usePlatformUsers = (params: FetchPlatformUsersParams) => {
  return useQuery({
    queryKey: ['platform_users', params],
    queryFn: async () => {
      const { search, is_active, role, page, page_size } = params;
      const searchParams = new URLSearchParams({
        page: page.toString(),
        page_size: page_size.toString(),
      });
      if (search) searchParams.append('search', search);
      if (is_active !== undefined) searchParams.append('is_active', is_active.toString());
      if (role) searchParams.append('role', role);

      const res = await apiClient.get(`/users?${searchParams.toString()}`) as any;
      return res as unknown as {
        data: PlatformUser[];
        meta: {
          current_page: number;
          page_size: number;
          total_records: number;
          total_pages: number;
          has_next: boolean;
          has_previous: boolean;
        };
      };
    },
  });
};

export const useSoftDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      await apiClient.delete(`/users/${userId}/soft`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform_users'] });
      toast.success('User has been soft deleted successfully.');
    },
    onError: () => {
      toast.error('Failed to soft delete user.');
    },
  });
};

export const useHardDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      await apiClient.delete(`/users/${userId}/hard`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform_users'] });
      toast.success('User has been permanently deleted.');
    },
    onError: () => {
      toast.error('Failed to hard delete user.');
    },
  });
};

export interface UserMembershipDetail {
  id: string;
  tenant_id: string;
  tenant_name: string;
  roles: string[];
}

export const useUserMemberships = (userId: string | null) => {
  return useQuery({
    queryKey: ['user_memberships', userId],
    queryFn: async (): Promise<UserMembershipDetail[]> => {
      if (!userId) return [];
      return apiClient.get(`/users/${userId}/memberships`) as Promise<UserMembershipDetail[]>;
    },
    enabled: !!userId,
  });
};
