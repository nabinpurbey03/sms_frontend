import React, { useState, useEffect, useMemo } from 'react';
import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { CalendarDays, Sun, Moon } from 'lucide-react';

import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import { useThemeStore } from '@/stores/themeStore';
import { useCalendarPreferenceStore } from '@/stores/calendarPreferenceStore';
import type { BadgeProps } from '@/components/ui/badge';
import type { Role } from '@/config/permissions';

import { getNavItems, getBreadcrumbs } from './navConfig';
import { ViewAsBanner } from './ViewAsBanner';
import { DesktopSidebar } from './DesktopSidebar';
import { MobileNavDrawer } from './MobileNavDrawer';
import { TopHeader } from './TopHeader';
import { CommandPalette, type CommandItem } from './CommandPalette';

export const formatRole = (role: string | null | undefined): string => {
  if (!role) return 'User';
  if (role === 'ADMIN') return 'Principal';
  if (role === 'SUPER_ADMIN') return 'Super Admin';
  if (role === 'OFFICE_ADMIN') return 'Office Admin';
  if (role === 'ACCOUNTANT') return 'Accountant';
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
};

export const getRoleBadgeVariant = (role: string | null): BadgeProps['variant'] => {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'purple';
    case 'ADMIN':
      return 'default';
    case 'OFFICE_ADMIN':
      return 'info';
    case 'ACCOUNTANT':
      return 'role-accountant';
    case 'TEACHER':
      return 'success';
    case 'PARENT':
      return 'warning';
    default:
      return 'secondary';
  }
};

export const AppShell: React.FC = () => {
  const navigate = useNavigate();
  const { location } = useRouterState();

  const {
    user,
    logout,
    activeRole,
    activeTenantId,
    activeTenantName,
    switchTenant,
    switchPersona,
  } = useAuth();

  const { can, isSuperAdmin, isTeacher, isParent } = usePermission();
  const { theme, setTheme } = useThemeStore();
  const { calendarSystem, setCalendarSystem, toggleCalendarSystem } = useCalendarPreferenceStore();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState<boolean>(() => {
    return typeof window !== 'undefined' && localStorage.getItem('sms_sidebar_collapsed') === 'true';
  });
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Synchronize desktop sidebar collapse preference with localStorage
  useEffect(() => {
    try {
      localStorage.setItem('sms_sidebar_collapsed', String(isDesktopSidebarCollapsed));
    } catch {
      // Ignore storage access errors in restricted environments
    }
  }, [isDesktopSidebarCollapsed]);

  // Command palette keyboard shortcut (⌘K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate({ to: '/login' });
  };

  const userInitials = user
    ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'U'
    : 'U';

  const navItems = useMemo(
    () => getNavItems({ isSuperAdmin, isTeacher, isParent, can, activeTenantId, activeRole }),
    [isSuperAdmin, isTeacher, isParent, can, activeTenantId, activeRole]
  );

  const breadcrumbs = useMemo(
    () => getBreadcrumbs(location.pathname, navItems),
    [location.pathname, navItems]
  );

  const commandItems = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [];

    // Add visible navigation items
    navItems
      .filter((n) => n.show)
      .forEach((n) => {
        items.push({
          id: n.href,
          label: n.label,
          category: n.category,
          description: n.description,
          icon: n.icon,
          action: () => navigate({ to: n.href as any }),
          keywords: [n.label, n.category, n.description],
        });
      });

    // Academic Calendar quick action
    if (activeTenantId) {
      items.push({
        id: '/academic-calendar',
        label: 'Academic Calendar',
        category: 'Academics',
        description: 'View school holidays, exams, vacations, and milestones.',
        icon: CalendarDays,
        action: () => navigate({ to: '/academic-calendar' as any }),
        keywords: ['calendar', 'events', 'holidays', 'exams', 'vacation'],
      });
    }

    // Toggle Calendar System action
    items.push({
      id: 'action-toggle-calendar',
      label: `Switch Calendar to ${calendarSystem === 'BS' ? 'Gregorian (AD)' : 'Bikram Sambat (BS)'}`,
      category: 'Preferences',
      description: `Toggle active calendar system (currently ${calendarSystem})`,
      icon: CalendarDays,
      action: toggleCalendarSystem,
      keywords: ['calendar', 'nepali', 'gregorian', 'bs', 'ad', 'bikram sambat'],
    });

    // Toggle Theme action
    items.push({
      id: 'action-toggle-theme',
      label: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
      category: 'Preferences',
      description: `Toggle visual theme (currently ${theme})`,
      icon: theme === 'dark' ? Sun : Moon,
      action: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
      keywords: ['theme', 'dark', 'light', 'mode', 'appearance'],
    });

    return items;
  }, [navItems, activeTenantId, calendarSystem, toggleCalendarSystem, theme, setTheme, navigate]);

  return (
    <div className="flex flex-col h-screen h-dvh overflow-hidden">
      <ViewAsBanner />
      <div className="flex-1 min-h-0 flex bg-background text-foreground antialiased selection:bg-primary/20 overflow-hidden">
        {/* Desktop Sidebar (lg+) */}
        <DesktopSidebar
          navItems={navItems}
          currentPath={location.pathname}
          isCollapsed={isDesktopSidebarCollapsed}
          onToggleCollapse={() => setIsDesktopSidebarCollapsed((prev) => !prev)}
          user={user}
          activeRole={activeRole}
          formatRole={formatRole}
          getRoleBadgeVariant={getRoleBadgeVariant}
          userInitials={userInitials}
        />

        {/* Mobile Slide-Out Drawer (<lg) */}
        <MobileNavDrawer
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          navItems={navItems}
          currentPath={location.pathname}
          user={user}
          activeRole={activeRole}
          formatRole={formatRole}
          getRoleBadgeVariant={getRoleBadgeVariant}
          activeTenantName={activeTenantName}
          theme={theme}
          onSetTheme={setTheme}
          calendarSystem={calendarSystem}
          onSetCalendarSystem={setCalendarSystem}
          onLogout={handleLogout}
        />

        {/* Main Application Area */}
        <div className="flex-1 min-w-0 flex flex-col h-full min-h-0 bg-background overflow-hidden">
          <TopHeader
            breadcrumbs={breadcrumbs}
            onOpenMobileDrawer={() => setSidebarOpen(true)}
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            activeTenantId={activeTenantId}
            activeTenantName={activeTenantName}
            isSuperAdmin={isSuperAdmin}
            memberships={user?.memberships}
            onSwitchTenant={switchTenant}
            calendarSystem={calendarSystem}
            onToggleCalendarSystem={toggleCalendarSystem}
            theme={theme}
            onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            user={user}
            activeRole={activeRole}
            formatRole={formatRole}
            getRoleBadgeVariant={getRoleBadgeVariant}
            userInitials={userInitials}
            onSwitchPersona={(role: Role) => switchPersona(role)}
            onSetTheme={setTheme}
            onSetCalendarSystem={setCalendarSystem}
            onLogout={handleLogout}
          />

          <main className="flex-1 relative overflow-y-auto px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 bg-muted/20 min-h-0 focus:outline-none">
            <div className="w-full max-w-7xl mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      <CommandPalette
        open={isCommandPaletteOpen}
        onOpenChange={setIsCommandPaletteOpen}
        items={commandItems}
      />
    </div>
  );
};
