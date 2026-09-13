import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useRouterState } from '@tanstack/react-router';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  UsersRound,
  CalendarCheck,
  Building2,
  UserCheck,
  LogOut,
  Menu,
  X,
  FileSpreadsheet,
  Layers,
  HeartHandshake,
  Baby,
  Sun,
  Moon,
  Monitor,
  GraduationCap,
  Award,
  ChevronLeft,
  ChevronRight,
  Bell,
  Search,
  Shield,
} from 'lucide-react';

import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import { useThemeStore } from '@/stores/themeStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SchoolHeaderBadge } from './SchoolHeaderBadge';
import { AcademicYearSelector } from '@/features/academic-year/components/AcademicYearSelector';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate({ to: '/login' });
  };


  const formatRole = (role: string | null | undefined) => {
    if (!role) return 'User';
    if (role === 'ADMIN') return 'Principal';
    if (role === 'SUPER_ADMIN') return 'Super Admin';
    if (role === 'OFFICE_ADMIN') return 'Office Admin';
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
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

  const navItems = React.useMemo(() => [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      description: 'Overview of your school activities and metrics.',
      show: true,
      category: 'Overview',
    },
    {
      label: 'Tenant Management',
      href: '/tenants',
      icon: Building2,
      description: 'Manage school campuses and platform settings.',
      show: isSuperAdmin,
      category: 'Administration',
    },
    {
      label: 'Platform Users',
      href: '/platform-users',
      icon: UsersRound,
      description: 'Manage all global platform user accounts.',
      show: isSuperAdmin,
      category: 'Administration',
    },
    {
      label: 'Audit Logs',
      href: '/audit-logs',
      icon: Shield,
      description: 'View system audit trails.',
      show: isSuperAdmin,
      category: 'Administration',
    },
    {
      label: 'School Members',
      href: '/members',
      icon: Users,
      description: 'Manage students, teachers, and administrators.',
      show: can('CREATE_TEACHER_PARENT'),
      category: 'Administration',
    },
    {
      label: 'Parent-Student Links',
      href: '/academic/parent-links',
      icon: HeartHandshake,
      description: 'Connect parents to their children.',
      show: can('LINK_PARENTS'),
      category: 'Administration',
    },
    {
      label: 'Classes & Sections',
      href: '/academic/classes',
      icon: BookOpen,
      description: 'Organize grade levels and physical sections.',
      show: can('VIEW_CLASSES_SUBJECTS'),
      category: 'Academics',
    },
    {
      label: 'Subjects',
      href: '/academic/subjects',
      icon: Layers,
      description: 'Manage curriculum subjects and codes.',
      show: can('VIEW_CLASSES_SUBJECTS'),
      category: 'Academics',
    },
    {
      label: 'Students Roster',
      href: '/academic/students',
      icon: Users,
      description: 'Directory of all enrolled students.',
      show: can('VIEW_SECTIONS_STUDENTS'),
      category: 'Academics',
    },
    {
      label: 'Teacher Assignments',
      href: '/academic/assignments',
      icon: UserCheck,
      description: 'Assign teachers to specific classes and subjects.',
      show: can('ASSIGN_TEACHERS'),
      category: 'Academics',
    },
    {
      label: 'Mark Attendance',
      href: '/attendance/mark',
      icon: CalendarCheck,
      description: 'Record daily student attendance.',
      show: can('MARK_ATTENDANCE') && !isParent,
      category: 'Attendance',
    },
    {
      label: 'Attendance Reports',
      href: '/attendance/reports',
      icon: FileSpreadsheet,
      description: 'View and export attendance records.',
      show: can('VIEW_ATTENDANCE_REPORTS') && !isParent,
      category: 'Attendance',
    },
    {
      label: 'Examinations',
      href: '/examination/exams',
      icon: GraduationCap,
      description: 'Create and manage academic assessments.',
      show: can('MANAGE_EXAMS') || can('ENTER_EXAM_SCORES'),
      category: 'Examinations',
    },
    {
      label: 'My Teaching Duties',
      href: '/academic/my-assignments',
      icon: BookOpen,
      description: 'View your assigned classes and subjects.',
      show: isTeacher,
      category: 'Teacher Desk',
    },
    {
      label: 'Student & Parent Directory',
      href: '/academic/parent-directory',
      icon: Users,
      description: 'Contact information for your students.',
      show: isTeacher,
      category: 'Teacher Desk',
    },
    {
      label: 'My Children',
      href: '/academic/my-children',
      icon: Baby,
      description: 'View your linked children profiles.',
      show: isParent,
      category: 'Parent Portal',
    },
    {
      label: "My Children's Teacher",
      href: '/academic/my-teachers',
      icon: GraduationCap,
      description: "Connect with your children's teachers.",
      show: isParent,
      category: 'Parent Portal',
    },
    {
      label: 'Report Cards',
      href: '/academic/report-cards',
      icon: Award,
      description: 'View student academic reports and grades.',
      show: isParent,
      category: 'Parent Portal',
    },
  ], [isSuperAdmin, can, isTeacher, isParent]);

  const currentMembership = user?.memberships?.find(
    (m) => m.tenant_id === activeTenantId
  );

  const userInitials = user
    ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()
    : 'U';

  const visibleNavItems = navItems.filter((item) => item.show);

  const groupedNavItems = visibleNavItems.reduce((acc, item) => {
    const cat = item.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, typeof visibleNavItems>);

  const activeItem = React.useMemo(() => {
    return navItems.find((item) => isNavItemActive(location.pathname, item.href));
  }, [location.pathname, navItems]);

  const searchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      console.log("Searching for:", e.target.value);
      // Future integration: Global search API call
    }, 500);
  };

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
      <TooltipProvider delayDuration={150}>
      <aside
        className={`hidden lg:flex shrink-0 flex-col justify-between bg-card h-screen sticky top-0 z-30 shadow-xs transition-all duration-300 ${
          isDesktopSidebarCollapsed ? 'w-20' : 'w-64 xl:w-70'
        }`}
      >
        {/* Sidebar Header: Logo & Toggle */}
        <div className={`flex items-center h-14 shrink-0 px-3 border-b border-border/40 ${isDesktopSidebarCollapsed ? 'justify-center gap-1.5' : 'justify-between'}`}>
          <Link to="/dashboard" className="flex items-center gap-2 focus:outline-none min-w-0" title="Go to Dashboard">
            <div className="flex h-8 w-8 min-h-[32px] min-w-[32px] items-center justify-center rounded-xl bg-card border border-border/80 shadow-xs overflow-hidden p-0.5 shrink-0">
              <img src="/logo.svg" alt="Schools Up Pro" className="h-full w-full object-contain" />
            </div>
            {!isDesktopSidebarCollapsed && (
              <span className="font-bold tracking-tight text-foreground text-sm truncate">
                Schools Up Pro
              </span>
            )}
          </Link>
          
          <Button
            variant="ghost"
            size="icon"
            className={`h-7 w-7 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer transition-colors ${isDesktopSidebarCollapsed ? 'shrink-0' : ''}`}
            onClick={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
            aria-label="Toggle Sidebar"
          >
            {isDesktopSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-3 py-4 space-y-8">
          {Object.entries(groupedNavItems).map(([category, items]) => (
            <div key={category}>
              {!isDesktopSidebarCollapsed ? (
                <p className="px-3 text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider mb-2">
                  {category}
                </p>
              ) : (
                <div className="w-full flex justify-center mb-2">
                  <div className="w-6 border-t border-border/50"></div>
                </div>
              )}
              <nav className="space-y-0.5">
                {items.map((item) => {
                  const isActive = isNavItemActive(location.pathname, item.href);
                  const Icon = item.icon;
                  const linkContent = (
                    <Link
                      to={item.href}
                      className={`flex items-center rounded-xl py-2 text-sm transition-all duration-150 ${
                        isDesktopSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3'
                      } ${
                        isActive
                          ? 'bg-primary text-primary-foreground font-semibold shadow-xs shadow-primary/20'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground font-medium'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!isDesktopSidebarCollapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );

                  return isDesktopSidebarCollapsed ? (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>
                        {linkContent}
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={14} className="font-semibold text-xs py-1.5 px-3">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <React.Fragment key={item.href}>
                      {linkContent}
                    </React.Fragment>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        
        {/* Sidebar Bottom Profile Card */}
        <div className="p-3 shrink-0 border-t border-border/40 bg-card">
          <div className="w-full flex items-center gap-3 p-2 bg-accent/40 rounded-xl border border-border/50 text-left">
            <Avatar className="h-9 w-9 shrink-0 ring-1 ring-border">
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            {!isDesktopSidebarCollapsed && (
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <p className="text-sm font-semibold text-foreground truncate leading-tight">
                  {user?.first_name} {user?.last_name}
                </p>
                <div className="mt-1">
                  <Badge variant={getRoleBadgeVariant(activeRole)} className="text-[10px] px-1.5 py-0">
                    {formatRole(activeRole)}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
      </TooltipProvider>

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
          <div className="fixed inset-y-0 left-0 z-50 w-full max-w-[280px] sm:max-w-xs bg-card p-4 shadow-2xl flex flex-col justify-between overflow-y-auto scrollbar-hide animate-in slide-in-from-left duration-200">
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
              <div className="space-y-8">
                {Object.entries(groupedNavItems).map(([category, items]) => (
                  <div key={category}>
                    <p className="px-3 text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider mb-2">
                      {category}
                    </p>
                    <nav className="space-y-0.5">
                      {items.map((item) => {
                        const isActive = isNavItemActive(location.pathname, item.href);
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            to={item.href}
                            onClick={() => setSidebarOpen(false)}
                            className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
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
                ))}
              </div>
            </div>

            {/* Drawer Bottom Session & Logout */}
            <div className="pt-4 space-y-3 shrink-0">
              <div className="rounded-xl border bg-muted/40 p-3 space-y-1">
                <p className="text-xs font-bold text-foreground truncate">
                  {user?.first_name} {user?.last_name}
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant={getRoleBadgeVariant(activeRole)} className="text-[9px] px-1 py-0">
                    {formatRole(activeRole)}
                  </Badge>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {activeTenantName || 'Global Platform'}
                  </p>
                </div>
                <div className="pt-2">
                  <AcademicYearSelector />
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

      {/* Dashboard Main Area */}
      <div className="flex-1 min-w-0 flex flex-col h-screen bg-background">
        
        {/* Sticky Top Header */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between px-4 sm:px-6 border-b border-border/40 bg-card/95 backdrop-blur-md shrink-0 gap-4">
          
          {/* Left: Active Tab Info */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {activeItem && (
              <>
                <div className="hidden sm:flex p-1.5 bg-primary/10 text-primary rounded-lg shrink-0">
                  <activeItem.icon className="h-4 w-4" />
                </div>
                <div className="flex items-center min-w-0">
                  <h1 className="text-sm font-bold text-foreground truncate">{activeItem.label}</h1>
                </div>
              </>
            )}
          </div>

          {/* Middle: School Name Badge & Academic Year */}
          <div className="hidden md:flex flex-1 items-center justify-center px-6 gap-3">
            <div className="flex items-center justify-center shrink-0">
              <div className="px-5 py-1.5 rounded-full bg-primary shadow-sm border border-primary/20">
                <span className="font-bold text-sm tracking-wide whitespace-nowrap text-primary-foreground">
                  {activeTenantName || 'Global Platform'}
                </span>
              </div>
            </div>
            <AcademicYearSelector />
          </div>

          {/* Right: Search, Controls & Profile */}
          <div className="flex flex-1 min-w-0 items-center justify-end gap-2 sm:gap-3 shrink-0">
            <div className="relative hidden lg:block w-[300px] xl:w-[400px] mr-2 transition-all duration-300">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search students, classes, and more..."
                className="w-full bg-background border border-input pl-9 h-8 focus-visible:ring-1 focus-visible:ring-primary transition-colors text-xs rounded-full shadow-sm"
                onChange={handleSearch}
              />
            </div>
            {/* Theme Toggle */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
            className="h-9 w-9 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          
          {/* Notifications */}
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive border border-card" />
          </Button>
          
          <div className="w-px h-6 bg-border/50 mx-1" /> {/* Divider */}

          {/* User Profile Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center justify-center rounded-full hover:ring-2 hover:ring-primary/50 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                aria-label="User Account Menu"
              >
                <Avatar className="h-9 w-9 shrink-0 ring-1 ring-border">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={8}
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
                      {formatRole(activeRole)}
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
                        {formatRole(activeRole)}
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
                            <span className="truncate">{formatRole(r)}</span>
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
        </header>

        <main className="flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 bg-muted/20">
          <div className="w-full max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
