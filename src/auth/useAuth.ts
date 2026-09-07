import { createContext, useContext } from 'react';
import type { UserProfileDTO } from '@/api/types';
import type { Role } from '@/config/permissions';
import type { LoginFormData } from '@/features/auth/schema';

export interface AuthContextType {
  user: UserProfileDTO | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeRole: Role | null;
  activeTenantId: string | null;
  activeTenantName: string | null;
  login: (data: LoginFormData) => Promise<UserProfileDTO>;
  logout: () => Promise<void>;
  switchTenant: (tenantId: string) => void;
  switchPersona: (role: Role) => void;
  refreshProfile: () => Promise<UserProfileDTO | null>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

