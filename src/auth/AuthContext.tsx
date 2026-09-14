import React, { useEffect, useState, useCallback } from 'react';
import type { UserProfileDTO } from '@/api/types';
import { authApi } from '@/features/auth/api';
import {
  getStoredRefreshToken,
  setAccessToken,
  setStoredRefreshToken,
  clearTokens,
  refreshTokens,
  getLastRefreshTime,
} from '@/api/client';
import { useTenantStore } from '@/stores/tenantStore';
import type { Role } from '@/config/permissions';
import type { LoginFormData } from '@/features/auth/schema';
import { AuthContext } from './useAuth';

const ROLE_HIERARCHY: Record<string, number> = {
  SUPER_ADMIN: 5,
  ADMIN: 4,
  OFFICE_ADMIN: 3,
  TEACHER: 2,
  PARENT: 1,
};

const pickPrimaryRole = (roles: string[]): Role => {
  if (!roles || roles.length === 0) return 'PARENT';
  const sorted = [...roles].sort(
    (a, b) => (ROLE_HIERARCHY[b] || 0) - (ROLE_HIERARCHY[a] || 0)
  );
  return sorted[0] as Role;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<UserProfileDTO | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activePersona, setActivePersonaState] = useState<Role | null>(() => {
    return (localStorage.getItem('schools_up_persona') as Role) || null;
  });

  const setActivePersona = useCallback((role: Role | null) => {
    setActivePersonaState(role);
    if (role) {
      localStorage.setItem('schools_up_persona', role);
    } else {
      localStorage.removeItem('schools_up_persona');
    }
  }, []);

  const clearPersona = useCallback(() => {
    setActivePersonaState(null);
    localStorage.removeItem('schools_up_persona');
  }, []);

  const {
    activeTenantId,
    activeTenantName,
    setActiveTenant,
    clearTenant,
  } = useTenantStore();

  const handleProfileLoaded = useCallback(
    (profile: UserProfileDTO) => {
      setUser(profile);

      // Handle Tenant Selection
      const tenantStore = useTenantStore.getState();
      let selectedTenantId = tenantStore.activeTenantId;
      let selectedTenantName = tenantStore.activeTenantName;

      if (profile.memberships && profile.memberships.length > 0) {
        const found = profile.memberships.find(
          (m) => m.tenant_id === selectedTenantId
        );
        if (!found) {
          selectedTenantId = profile.memberships[0].tenant_id;
          selectedTenantName = profile.memberships[0].tenant_name;
        } else {
          selectedTenantName = found.tenant_name;
        }
        tenantStore.setActiveTenant(selectedTenantId, selectedTenantName);

        // Handle Active Persona
        const currentMembership = profile.memberships.find(
          (m) => m.tenant_id === selectedTenantId
        );
        if (currentMembership && currentMembership.roles.length > 0) {
          const storedPersona = (localStorage.getItem('schools_up_persona') as Role) || null;
          if (!storedPersona || !currentMembership.roles.includes(storedPersona)) {
            setActivePersona(pickPrimaryRole(currentMembership.roles));
          }
        }
      } else if (profile.is_super_admin) {
        setActivePersona('SUPER_ADMIN');
      }
    },
    [setActivePersona]
  );

  const refreshProfile = useCallback(async (): Promise<UserProfileDTO | null> => {
    try {
      const profile = await authApi.getMe();
      handleProfileLoaded(profile);
      return profile;
    } catch (err: any) {
      const errStatus = err?.response?.status;
      if (errStatus === 401 || errStatus === 403) {
        setUser(null);
      }
      return null;
    }
  }, [handleProfileLoaded]);

  // Restore session on app load - runs strictly once on mount
  useEffect(() => {
    let isMounted = true;

    const initSession = async () => {
      const refreshToken = getStoredRefreshToken();
      if (!refreshToken) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        await refreshTokens();
        if (isMounted) {
          await refreshProfile();
        }
      } catch (err: any) {
        const errStatus = err?.response?.status;
        if (errStatus === 401 || errStatus === 403) {
          clearTokens();
          clearTenant();
          clearPersona();
          if (isMounted) {
            setUser(null);
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initSession();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Proactive background silent refresh to keep session alive while user is active
  useEffect(() => {
    if (!user) return;

    // Refresh every 12 minutes (token expires in 30 minutes)
    const interval = setInterval(async () => {
      try {
        await refreshTokens();
      } catch {
        // If 401/403, refreshTokens handles clearTokens and redirect
        // Ignore transient errors to prevent kicking user out
      }
    }, 12 * 60 * 1000);

    // Also refresh on tab visibility if more than 5 minutes have elapsed since last refresh
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const elapsed = Date.now() - getLastRefreshTime();
        if (elapsed > 5 * 60 * 1000) {
          try {
            await refreshTokens();
          } catch {
            // Ignore transient errors
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  const login = async (data: LoginFormData): Promise<UserProfileDTO> => {
    setIsLoading(true);
    try {
      if (data.rememberMe) {
        localStorage.setItem('schools_up_remembered_email', data.email);
      } else {
        localStorage.removeItem('schools_up_remembered_email');
      }

      const tokenRes = await authApi.login({
        email: data.email,
        password: data.password,
      });

      setAccessToken(tokenRes.access_token);
      setStoredRefreshToken(tokenRes.refresh_token, data.rememberMe);

      const profile = await authApi.getMe();
      handleProfileLoaded(profile);
      return profile;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
    } finally {
      clearTokens();
      clearTenant();
      clearPersona();
      setUser(null);
      setIsLoading(false);
    }
  };

  const switchTenant = (tenantId: string) => {
    if (!user) return;
    const membership = user.memberships.find((m) => m.tenant_id === tenantId);
    if (membership) {
      setActiveTenant(membership.tenant_id, membership.tenant_name);
      setActivePersona(pickPrimaryRole(membership.roles));
    }
  };

  const switchPersona = (role: Role) => {
    setActivePersona(role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        activeRole: activePersona || (user?.is_super_admin ? 'SUPER_ADMIN' : null),
        activeTenantId,
        activeTenantName,
        login,
        logout,
        switchTenant,
        switchPersona,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
