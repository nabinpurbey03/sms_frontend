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
  if (typeof apiClient !== 'undefined' && apiClient?.defaults?.headers?.common) {
    if (token) {
      apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      delete apiClient.defaults.headers.common.Authorization;
    }
  }
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

let lastRefreshTimestamp = Date.now();
export const getLastRefreshTime = () => lastRefreshTimestamp;

let activeRefreshPromise: Promise<TokenResponse> | null = null;

export const refreshTokens = async (): Promise<TokenResponse> => {
  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) {
    clearTokens();
    throw new ApiError('Session expired. Please log in again.', undefined, 401);
  }

  activeRefreshPromise = (async () => {
    try {
      const refreshResponse = await axios.post<ApiResponse<TokenResponse>>(
        `${ENV.API_BASE_URL.replace(/\/$/, '')}${ENV.API_VERSION}/auth/refresh`,
        { refresh_token: refreshToken }
      );

      const tokenData = (refreshResponse.data?.data || refreshResponse.data) as TokenResponse;
      const newAccessToken = tokenData?.access_token;
      const newRefreshToken = tokenData?.refresh_token;

      if (!newAccessToken) {
        throw new Error('No access token returned');
      }

      setAccessToken(newAccessToken);
      if (newRefreshToken) {
        setStoredRefreshToken(newRefreshToken);
      }
      apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
      lastRefreshTimestamp = Date.now();

      return tokenData;
    } catch (refreshErr: any) {
      const errStatus = refreshErr?.response?.status;
      // ONLY clear tokens and redirect if definitive 401 Unauthorized or 403 Forbidden
      if (errStatus === 401 || errStatus === 403) {
        clearTokens();
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
      throw refreshErr;
    } finally {
      activeRefreshPromise = null;
    }
  })();

  return activeRefreshPromise;
};

// Cross-tab token synchronization: when another tab logs out, clear in-memory state
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === 'schools_up_refresh_token' && !event.newValue) {
      setAccessToken(null);
      delete apiClient.defaults.headers.common.Authorization;
    }
  });
}

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

      // Allow logout to proceed even during View As session
      if (config.url?.includes('logout')) {
        return config;
      }
      
      const method = config.method?.toUpperCase();
      if (method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        return Promise.reject(new ApiError('Mutating actions are disabled during a View As session.', undefined, 403));
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor
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
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/logout')
    ) {
      originalRequest._retry = true;

      try {
        const tokenData = await refreshTokens();
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${tokenData.access_token}`;
          if (typeof (originalRequest.headers as any).set === 'function') {
            (originalRequest.headers as any).set('Authorization', `Bearer ${tokenData.access_token}`);
          }
        }
        return apiClient(originalRequest);
      } catch (refreshErr) {
        return Promise.reject(refreshErr);
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
