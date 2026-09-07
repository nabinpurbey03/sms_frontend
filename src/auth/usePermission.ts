import { useAuth } from './useAuth';
import { hasPermission, type PermissionKey, type Role } from '@/config/permissions';

export const usePermission = () => {
  const { activeRole, user } = useAuth();

  const can = (permission: PermissionKey): boolean => {
    if (user?.is_super_admin) return true;
    return hasPermission(activeRole, permission);
  };

  const isRole = (role: Role): boolean => {
    if (role === 'SUPER_ADMIN') return !!user?.is_super_admin;
    return activeRole === role;
  };

  const isAnyRole = (...roles: Role[]): boolean => {
    if (user?.is_super_admin && roles.includes('SUPER_ADMIN')) return true;
    return !!activeRole && roles.includes(activeRole);
  };

  return {
    can,
    isRole,
    isAnyRole,
    activeRole,
    isSuperAdmin: !!user?.is_super_admin,
    isAdmin: activeRole === 'ADMIN',
    isOfficeAdmin: activeRole === 'OFFICE_ADMIN',
    isTeacher: activeRole === 'TEACHER',
    isParent: activeRole === 'PARENT',
  };
};
