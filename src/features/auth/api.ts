import { apiClient, refreshTokens } from '@/api/client';
import type { RegisterPayload, TokenResponse, UserProfileDTO } from '@/api/types';

export interface LoginPayload {
  email: string;
  password: string;
}

export const authApi = {
  register: async (
    payload: RegisterPayload
  ): Promise<TokenResponse | { message: string }> => {
    const data = await apiClient.post<any, TokenResponse | { message: string }>(
      '/auth/register',
      payload
    );
    return data;
  },

  login: async (payload: LoginPayload): Promise<TokenResponse> => {
    const data = await apiClient.post<any, TokenResponse>('/auth/login', payload);
    return data;
  },

  getMe: async (): Promise<UserProfileDTO> => {
    const data = await apiClient.get<any, UserProfileDTO>('/auth/me');
    return data;
  },

  refreshToken: async (_refreshToken?: string): Promise<TokenResponse> => {
    return refreshTokens();
  },

  logout: async (): Promise<{ logged_out: boolean }> => {
    try {
      const data = await apiClient.post<any, { logged_out: boolean }>('/auth/logout');
      return data;
    } catch {
      return { logged_out: true };
    }
  },
};
