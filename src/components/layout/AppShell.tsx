import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useRouterState } from '@tanstack/react-router';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  CalendarCheck,
  Building2,
  UserCheck,
  LogOut,
  ChevronDown,
  Menu,
  X,
  School,
  FileSpreadsheet,
  Layers,
  HeartHandshake,
  Baby,
  Sun,
  Moon,
  Monitor,
  GraduationCap,
  Award,
} from 'lucide-react';

import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import { useThemeStore } from '@/stores/themeStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SchoolHeaderBadge } from './SchoolHeaderBadge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Role } from '@/config/permissions';

const isNavItemActive = (currentPath: string, navHref: string): boolean => {
  return currentPath === navHref || currentPath.startsWith(`${navHref}/`);
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate({ to: '/login' });
  };

  const getRoleBadgeVariant = (role: string | null) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'purple' as const;
      case 'ADMIN':
        return 'default' as const;
      case 'OFFICE_ADMIN':
        return 'info' as const;
      case 'TEACHER':
        return 'success' as const;
      case 'PARENT':
        return 'warning' as const;
      default:
        return 'secondary' as const;
    }
  };

  const navItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      show: true,
    },
    {
      label: 'Tenant Management',
      href: '/tenants',
      icon: Building2,
      show: isSuperAdmin,
    },
    {
      label: 'School Settings',
      href: '/tenant-settings',
      icon: School,
      show: can('MANAGE_TENANT_SETTINGS') && !isSuperAdmin,
    },
    {
      label: 'School Members',
      href: '/members',
      icon: Users,
      show: can('CREATE_TEACHER_PARENT'),
    },
    {
      label: 'Classes & Sections',
      href: '/academic/classes',
      icon: BookOpen,
      show: can('VIEW_CLASSES_SUBJECTS'),
    },
    {
      label: 'Students Roster',
      href: '/academic/students',
      icon: Users,
      show: can('VIEW_SECTIONS_STUDENTS'),
    },
    {
      label: 'Subjects',
      href: '/academic/subjects',
      icon: Layers,
      show: can('VIEW_CLASSES_SUBJECTS'),
    },
    {
      label: 'Teacher Assignments',
      href: '/academic/assignments',
      icon: UserCheck,
      show: can('ASSIGN_TEACHERS'),
    },
    {
      label: 'My Teaching Duties',
      href: '/academic/my-assignments',
      icon: BookOpen,
      show: isTeacher,
    },
    {
      label: 'Parent-Student Links',
      href: '/academic/parent-links',
      icon: HeartHandshake,
      show: can('LINK_PARENTS'),
    },
    {
      label: 'My Children',
      href: '/academic/my-children',
      icon: Baby,
      show: isParent,
    },
    {
      label: 'Report Cards',
      href: '/academic/report-cards',
      icon: Award,
      show: isParent,
    },
    {
      label: 'Mark Attendance',
      href: '/attendance/mark',
      icon: CalendarCheck,
      show: can('MARK_ATTENDANCE') && !isParent,
    },
    {
      label: 'Attendance Reports',
      href: '/attendance/reports',
      icon: FileSpreadsheet,
      show: can('VIEW_ATTENDANCE_REPORTS') && !isParent,
    },
    {
      label: 'Examinations',
      href: '/examination/exams',
      icon: GraduationCap,
      show: can('MANAGE_EXAMS') || can('ENTER_EXAM_SCORES'),
    },
  ];

  const currentMembership = user?.memberships?.find(
    (m) => m.tenant_id === activeTenantId
  );

  const userInitials = user
    ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()
    : 'U';

  const visibleNavItems = navItems.filter((item) => item.show);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background text-foreground antialiased selection:bg-primary/20">
      {/* Mobile-Only Header (< lg screens) */}
      <header className="lg:hidden sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b bg-card/95 px-4 backdrop-blur-md shadow-xs shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-xl text-foreground -ml-1.5"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open Navigation Menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <Link to="/dashboard" className="flex items-center gap-2 focus:outline-none min-w-0">
            <div className="flex h-8 w-8 min-h-[32px] min-w-[32px] items-center justify-center rounded-xl bg-card border border-border/80 shadow-xs overflow-hidden p-0.5 shrink-0">
              <img src="/logo.svg" alt="Schools Up Pro" className="h-full w-full object-contain" />
            </div>
            <span className="font-bold tracking-tight text-foreground text-sm truncate">
              Schools Up Pro
            </span>
          </Link>
        </div>

        {/* Mobile Right: School Badge */}
        <div className="flex items-center gap-2 min-w-0">
          <SchoolHeaderBadge
            tenantId={activeTenantId}
            tenantName={activeTenantName}
            isSuperAdmin={isSuperAdmin}
            memberships={user?.memberships}
            onSwitchTenant={switchTenant}
            className="max-w-[180px] xs:max-w-[220px] py-1 px-2 text-xs"
          />
        </div>
      </header>

      {/* Desktop Fixed Sidebar (lg+) */}
      <aside className="hidden lg:flex shrink-0 flex-col justify-between border-r bg-card h-screen sticky top-0 w-64 xl:w-70 z-30 shadow-xs">
        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <p className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Main Menu
          </p>
          <nav className="space-y-1">
            {visibleNavItems.map((item) => {
              const isActive = isNavItemActive(location.pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150 ${
                    isActive
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs shadow-primary/20'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground font-medium'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Left Corner: Profile & Account Menu */}
        <div className="p-3 border-t bg-card/60 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-accent/80 transition-all text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer border border-border/50 hover:border-border shadow-2xs"
                aria-label="User Account Menu"
              >
                <Avatar className="h-9 w-9 shrink-0 ring-1 ring-border group-hover:ring-primary/50 transition-all">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-bold text-foreground truncate leading-tight">
                      {user?.first_name} {user?.last_name}
                    </p>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <Badge
                      variant={getRoleBadgeVariant(activeRole)}
                      className="text-[9px] px-1.5 py-0 font-semibold leading-tight shrink-0"
                    >
                      {activeRole || 'USER'}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground truncate leading-tight">
                      {user?.email}
                    </span>
                  </div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="right"
              align="end"
              sideOffset={12}
              className="w-72 p-2 shadow-2xl rounded-2xl border bg-card"
            >
              {/* Profile Details Header */}
              <DropdownMenuLabel className="font-normal p-2">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold leading-none text-foreground">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground truncate pt-0.5">
                    {user?.email}
                  </p>
                  <div className="pt-2 flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant={getRoleBadgeVariant(activeRole)}
                      className="text-[10px] px-1.5"
                    >
                      {activeRole || 'USER'}
                    </Badge>
                    {isSuperAdmin && (
                      <Badge variant="purple" className="text-[10px] px-1.5">
                        SUPER ADMIN
                      </Badge>
                    )}
                  </div>
                </div>
              </DropdownMenuLabel>

              {/* Persona Switcher (Multi-role users) */}
              {currentMembership && currentMembership.roles.length > 1 && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5 space-y-1.5">
                    <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                      <span>Active Persona</span>
                      <span className="text-[10px] font-mono text-primary">
                        {activeRole}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 pt-0.5">
                      {currentMembership.roles.map((r) => {
                        const isSelected = activeRole === r;
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => switchPersona(r as Role)}
                            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                              isSelected
                                ? 'border-primary bg-primary/10 font-bold text-primary shadow-2xs'
                                : 'border-border/60 hover:bg-accent text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <Badge variant={getRoleBadgeVariant(r)} className="text-[9px] px-1 py-0">
                              {r[0]}
                            </Badge>
                            <span className="truncate">{r}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Theme Mode Toggle Section */}
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    {theme === 'dark' ? (
                      <Moon className="h-3.5 w-3.5 text-primary" />
                    ) : theme === 'light' ? (
                      <Sun className="h-3.5 w-3.5 text-amber-500" />
                    ) : (
                      <Monitor className="h-3.5 w-3.5 text-primary" />
                    )}
                    <span>Appearance</span>
                  </span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 bg-muted rounded">
                    {theme}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`flex items-center justify-center gap-1 py-1 px-2 rounded-lg text-xs font-medium border transition-colors touch-manipulation min-h-[32px] ${
                      theme === 'light'
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs font-semibold'
                        : 'border-input hover:bg-accent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Sun className="h-3.5 w-3.5" />
                    <span>Light</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`flex items-center justify-center gap-1 py-1 px-2 rounded-lg text-xs font-medium border transition-colors touch-manipulation min-h-[32px] ${
                      theme === 'dark'
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs font-semibold'
                        : 'border-input hover:bg-accent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Moon className="h-3.5 w-3.5" />
                    <span>Dark</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('system')}
                    className={`flex items-center justify-center gap-1 py-1 px-2 rounded-lg text-xs font-medium border transition-colors touch-manipulation min-h-[32px] ${
                      theme === 'system'
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs font-semibold'
                        : 'border-input hover:bg-accent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Monitor className="h-3.5 w-3.5" />
                    <span>Auto</span>
                  </button>
                </div>
              </div>

              {/* Sign Out Section */}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 text-xs font-semibold min-h-[38px] rounded-lg"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile Slide-Out Drawer (< lg screens) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-in Drawer */}
          <div className="fixed inset-y-0 left-0 z-50 w-full max-w-[280px] sm:max-w-xs bg-card p-4 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-200">
            <div className="space-y-4">
              {/* Drawer Header with Close Button */}
              <div className="flex items-center justify-between pb-3 border-b">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-card border border-border/80 shadow-xs overflow-hidden p-0.5">
                    <img src="/logo.svg" alt="Schools Up Pro" className="h-full w-full object-contain" />
                  </div>
                  <div>
                    <span className="font-bold text-foreground text-sm leading-tight block">
                      Schools Up Pro
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono block">
                      SMS MENU
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="min-h-[40px] min-w-[40px] h-10 w-10 rounded-xl text-muted-foreground hover:text-foreground"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Mobile Navigation Items */}
              <nav className="space-y-1">
                {visibleNavItems.map((item) => {
                  const isActive = isNavItemActive(location.pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground active:bg-accent/80'
                      }`}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Drawer Bottom Session & Logout */}
            <div className="pt-4 border-t space-y-3 shrink-0">
              <div className="rounded-xl border bg-muted/40 p-3 space-y-1">
                <p className="text-xs font-bold text-foreground truncate">
                  {user?.first_name} {user?.last_name}
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant={getRoleBadgeVariant(activeRole)} className="text-[9px] px-1 py-0">
                    {activeRole || 'USER'}
                  </Badge>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {activeTenantName || 'Global Platform'}
                  </p>
                </div>
              </div>

              {/* Theme Mode Quick Buttons on Mobile */}
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-medium border ${
                    theme === 'light' ? 'bg-primary text-primary-foreground border-primary' : 'border-input'
                  }`}
                >
                  <Sun className="h-3.5 w-3.5" />
                  <span>Light</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-medium border ${
                    theme === 'dark' ? 'bg-primary text-primary-foreground border-primary' : 'border-input'
                  }`}
                >
                  <Moon className="h-3.5 w-3.5" />
                  <span>Dark</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('system')}
                  className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-medium border ${
                    theme === 'system' ? 'bg-primary text-primary-foreground border-primary' : 'border-input'
                  }`}
                >
                  <Monitor className="h-3.5 w-3.5" />
                  <span>Auto</span>
                </button>
              </div>

              <Button
                variant="outline"
                onClick={handleLogout}
                className="w-full min-h-[44px] h-11 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20 font-semibold rounded-xl"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 min-w-0 h-screen overflow-y-auto bg-[#E9EAEE] dark:bg-background px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <div className="w-full max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
