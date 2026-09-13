import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { ENV } from '@/config/env';
import { ApiError } from './errors';
import type { ApiResponse, TokenResponse } from './types';
import { useTenantStore } from '@/stores/tenantStore';
import { useViewAsStore } from '@/stores/viewAsStore';

let inMemoryAccessToken: string | null = null;

export const getAccessToken = () => inMemoryAccessToken;
export const setAccessToken = (token: string | null) => {
  inMemoryAccessToken = token;
};

export const getStoredRefreshToken = () => {
  return localStorage.getItem('schools_up_refresh_token') || sessionStorage.getItem('schools_up_refresh_token');
};

export const setStoredRefreshToken = (token: string | null, remember?: boolean) => {
  if (!token) {
    localStorage.removeItem('schools_up_refresh_token');
    sessionStorage.removeItem('schools_up_refresh_token');
    return;
  }
  
  let shouldRemember = remember;
  if (shouldRemember === undefined) {
    // If not specified, infer from where the token currently lives
    if (sessionStorage.getItem('schools_up_refresh_token')) {
      shouldRemember = false;
    } else {
      shouldRemember = true;
    }
  }

  if (shouldRemember) {
    localStorage.setItem('schools_up_refresh_token', token);
    sessionStorage.removeItem('schools_up_refresh_token');
  } else {
    sessionStorage.setItem('schools_up_refresh_token', token);
    localStorage.removeItem('schools_up_refresh_token');
  }
};

export const clearTokens = () => {
  setAccessToken(null);
  setStoredRefreshToken(null);
  delete apiClient.defaults.headers.common.Authorization;
};

export const apiClient = axios.create({
  baseURL: `${ENV.API_BASE_URL.replace(/\/$/, '')}${ENV.API_VERSION}`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Attach JWT Bearer Token if present
    if (inMemoryAccessToken) {
      config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
    }

    // Attach X-Tenant-ID if active tenant is selected
    const activeTenantId = useTenantStore.getState().activeTenantId;
    if (activeTenantId) {
      config.headers[ENV.TENANT_HEADER_NAME] = activeTenantId;
    }

    // View As session logic
    const viewAsState = useViewAsStore.getState();
    if (viewAsState.activeToken) {
      config.headers['X-View-As'] = viewAsState.activeToken;
      
      const method = config.method?.toUpperCase();
      if (method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        return Promise.reject(new Error('Mutating actions are disabled during a View As session.'));
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor & Token Refresh Queue
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => {
    const data = response.data as any;
    // Check universal API envelope
    if (data && typeof data === 'object' && 'status' in data) {
      if (data.status === true) {
        if ('meta' in data) {
          return data;
        }
        return data.data;
      }
      throw new ApiError(
        data.message || 'Request failed',
        data.error,
        response.status
      );
    }
    return response.data;
  },
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const status = error.response?.status;
    const responseData = error.response?.data;

    // Handle 401 & Token Refresh
    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (token && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getStoredRefreshToken();

      if (!refreshToken) {
        clearTokens();
        isRefreshing = false;
        return Promise.reject(
          new ApiError('Session expired. Please log in again.', undefined, 401)
        );
      }

      try {
        const refreshResponse = await axios.post<ApiResponse<TokenResponse>>(
          `${ENV.API_BASE_URL.replace(/\/$/, '')}${ENV.API_VERSION}/auth/refresh`,
          { refresh_token: refreshToken }
        );

        const tokenData = refreshResponse.data?.data || refreshResponse.data;
        const newAccessToken = (tokenData as TokenResponse)?.access_token;
        const newRefreshToken = (tokenData as TokenResponse)?.refresh_token;

        if (newAccessToken) {
          setAccessToken(newAccessToken);
          if (newRefreshToken) {
            setStoredRefreshToken(newRefreshToken);
          }
          apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
          processQueue(null, newAccessToken);
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }
          return apiClient(originalRequest);
        } else {
          throw new Error('No access token returned');
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        clearTokens();
        // Redirect to login to clear React state
        window.location.href = '/login';
        return Promise.reject(
          new ApiError('Session expired. Please log in again.', undefined, 401)
        );
      } finally {
        isRefreshing = false;
      }
    }

    // Parse structured ApiError from response envelope
    if (responseData && typeof responseData === 'object' && 'error' in responseData) {
      const envelope = responseData as ApiResponse<unknown>;
      return Promise.reject(
        new ApiError(
          envelope.message || error.message,
          envelope.error || undefined,
          status
        )
      );
    }

    return Promise.reject(
      new ApiError(
        error.message || 'An unexpected error occurred',
        undefined,
        status
      )
    );
  }
);
