import React from 'react';
import { Link } from '@tanstack/react-router';
import {
  Menu,
  ChevronRight,
  Search,
  CalendarDays,
  Sun,
  Moon,
  Monitor,
  School,
  Check,
  LogOut,
} from 'lucide-react';
import type { BreadcrumbItem } from './navConfig';
import { SchoolHeaderBadge } from './SchoolHeaderBadge';
import { NotificationPopover } from './NotificationPopover';
import { Button } from '@/components/ui/button';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
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

export interface TopHeaderProps {
  breadcrumbs: BreadcrumbItem[];
  onOpenMobileDrawer: () => void;
  onOpenCommandPalette: () => void;
  activeTenantId: string | null;
  activeTenantName?: string | null;
  isSuperAdmin: boolean;
  memberships?: {
    tenant_id: string;
    tenant_name: string;
    roles: string[];
  }[];
  onSwitchTenant: (tenantId: string) => void;
  calendarSystem: 'AD' | 'BS';
  onToggleCalendarSystem: () => void;
  theme: string;
  onToggleTheme: () => void;
  user: {
    first_name?: string;
    last_name?: string;
    email?: string;
    memberships?: {
      tenant_id: string;
      tenant_name: string;
      roles: string[];
    }[];
  } | null;
  activeRole: string | null;
  formatRole: (role: string | null | undefined) => string;
  getRoleBadgeVariant: (role: string | null) => BadgeProps['variant'];
  userInitials: string;
  onSwitchPersona: (role: Role) => void;
  onSetTheme: (theme: 'light' | 'dark' | 'system') => void;
  onSetCalendarSystem: (system: 'BS' | 'AD') => void;
  onLogout: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  breadcrumbs,
  onOpenMobileDrawer,
  onOpenCommandPalette,
  activeTenantId,
  activeTenantName,
  isSuperAdmin,
  memberships,
  onSwitchTenant,
  calendarSystem,
  onToggleCalendarSystem,
  theme,
  onToggleTheme,
  user,
  activeRole,
  formatRole,
  getRoleBadgeVariant,
  userInitials,
  onSwitchPersona,
  onSetTheme,
  onSetCalendarSystem,
  onLogout,
}) => {
  const effectiveMemberships = memberships ?? user?.memberships;
  const currentMembership = effectiveMemberships?.find(
    (m) => m.tenant_id === activeTenantId
  );
  const fullName =
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'User';

  return (
    <header className="sticky top-0 z-20 flex h-14 md:h-15 items-center justify-between px-3 sm:px-4 md:px-6 border-b border-border/40 bg-card/90 backdrop-blur-md shrink-0 gap-2">
      {/* Column 1 (Left): Mobile Trigger & Route Breadcrumbs */}
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1 justify-start">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-9 w-9 rounded-xl text-foreground -ml-1 shrink-0 cursor-pointer"
          onClick={onOpenMobileDrawer}
          aria-label="Open Navigation Menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <nav
          aria-label="Breadcrumb"
          className="hidden sm:flex items-center gap-1 min-w-0 overflow-hidden"
        >
          <ol className="flex items-center min-w-0 flex-nowrap list-none m-0 p-0">
            {breadcrumbs.map((crumb, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === breadcrumbs.length - 1;
              const Icon = crumb.icon;

              if (isLast) {
                return (
                  <li
                    key={idx}
                    className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5 truncate min-w-0"
                    aria-current="page"
                  >
                    {Icon && (
                      <div className="p-1 bg-primary/10 text-primary rounded-md shrink-0">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                    )}
                    <span className="truncate max-w-[100px] sm:max-w-[140px] md:max-w-[180px]">
                      {crumb.label}
                    </span>
                  </li>
                );
              }

              return (
                <li
                  key={idx}
                  className={`items-center min-w-0 shrink-0 ${
                    isFirst ? 'hidden sm:inline-flex' : 'hidden md:inline-flex'
                  }`}
                >
                  {crumb.href ? (
                    <Link
                      to={crumb.href}
                      className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors truncate max-w-[100px] sm:max-w-[140px] md:max-w-[180px]"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground px-1.5 py-0.5 rounded bg-muted/60 truncate max-w-[100px] sm:max-w-[140px] md:max-w-[180px]">
                      {crumb.label}
                    </span>
                  )}
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 mx-1 shrink-0" />
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      {/* Column 2 (Center): School Identity */}
      <div className="flex items-center justify-center shrink-0 px-1 sm:px-2 max-w-[55%] xs:max-w-[50%] sm:max-w-[45%] md:max-w-[40%]">
        <SchoolHeaderBadge
          tenantId={activeTenantId}
          tenantName={activeTenantName ?? null}
          isSuperAdmin={isSuperAdmin}
          memberships={effectiveMemberships}
          onSwitchTenant={onSwitchTenant}
        />
      </div>

      {/* Column 3 (Right): Controls & Account Dropdown */}
      <div className="flex items-center justify-end gap-1.5 sm:gap-2 flex-1 min-w-0 shrink-0">
        {/* Desktop Search Button / Command Palette Trigger */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="relative hidden lg:flex items-center justify-between w-[180px] xl:w-[240px] h-8 px-3 rounded-full border border-input bg-background/80 hover:bg-accent/50 text-muted-foreground text-xs shadow-2xs cursor-pointer transition-colors"
          aria-label="Open command palette"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Search pages...</span>
          </div>
          <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-border/80 bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground shrink-0">
            <span>⌘</span>K
          </kbd>
        </button>

        {/* Mobile / Tablet Command Palette Trigger Icon */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenCommandPalette}
          className="lg:hidden h-8 w-8 sm:h-9 sm:w-9 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer shrink-0"
          aria-label="Open command palette"
        >
          <Search className="h-4 w-4" />
        </Button>

        {/* Calendar System Switcher Segmented Pill (BS / AD) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              role="group"
              aria-label="Calendar System Preference"
              className="hidden sm:inline-flex items-center rounded-full border border-input bg-muted/50 p-0.5 shadow-2xs shrink-0"
            >
              <button
                type="button"
                onClick={() => onSetCalendarSystem('BS')}
                className={`h-7 px-2.5 rounded-full text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  calendarSystem === 'BS'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-label="Switch to Bikram Sambat (BS) Calendar"
              >
                <span>BS</span>
              </button>
              <button
                type="button"
                onClick={() => onSetCalendarSystem('AD')}
                className={`h-7 px-2.5 rounded-full text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  calendarSystem === 'AD'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-label="Switch to Gregorian (AD) Calendar"
              >
                <span>AD</span>
              </button>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Calendar System: {calendarSystem === 'BS' ? 'Bikram Sambat (BS)' : 'Gregorian (AD)'}
          </TooltipContent>
        </Tooltip>

        {/* Theme Toggle Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleTheme}
              className="hidden sm:inline-flex h-8 w-8 sm:h-9 sm:w-9 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer shrink-0"
              aria-label="Toggle appearance"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Toggle appearance
          </TooltipContent>
        </Tooltip>

        {/* Notifications Popover */}
        <NotificationPopover />

        {/* Subtle Divider */}
        <div className="hidden sm:block w-px h-6 bg-border/50 mx-0.5 shrink-0" />

        {/* User Account Profile Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center justify-center rounded-full ring-1 ring-border hover:ring-2 hover:ring-primary/50 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer shrink-0"
              aria-label="User Account Menu"
            >
              <Avatar className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 ring-1 ring-border">
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
            {/* User Details Header */}
            <DropdownMenuLabel className="font-normal p-2">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold leading-none text-foreground truncate">
                  {fullName}
                </p>
                {user?.email && (
                  <p className="text-xs leading-none text-muted-foreground truncate pt-0.5">
                    {user.email}
                  </p>
                )}
                <div className="pt-2 flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant={getRoleBadgeVariant(activeRole)}
                    className="text-[10px] px-1.5 py-0"
                  >
                    {formatRole(activeRole)}
                  </Badge>
                  {isSuperAdmin && (
                    <Badge variant="purple" className="text-[10px] px-1.5 py-0">
                      SUPER ADMIN
                    </Badge>
                  )}
                </div>
              </div>
            </DropdownMenuLabel>

            {/* School Switcher (Multi-school users: Parents, Teachers, Admins) */}
            {effectiveMemberships && effectiveMemberships.length > 1 && (
              <>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 space-y-1.5">
                  <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <School className="h-3.5 w-3.5 text-primary" />
                      <span>Switch School Portal</span>
                    </span>
                    <span className="text-[10px] text-primary font-bold">
                      {effectiveMemberships.length} Schools
                    </span>
                  </div>
                  <div className="space-y-1 pt-0.5">
                    {effectiveMemberships.map((m) => {
                      const isCurrent = m.tenant_id === activeTenantId;
                      return (
                        <button
                          key={m.tenant_id}
                          type="button"
                          onClick={() => onSwitchTenant(m.tenant_id)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                            isCurrent
                              ? 'border-primary bg-primary/10 font-bold text-primary shadow-2xs'
                              : 'border-border/60 hover:bg-accent text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <span className="truncate text-left">
                            {m.tenant_name}
                          </span>
                          {isCurrent && (
                            <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-1.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Persona Switcher (Multi-role users) */}
            {currentMembership && currentMembership.roles.length > 1 && (
              <>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 space-y-1.5">
                  <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                    <span>Active Persona</span>
                    <span className="text-[10px] font-mono text-primary font-bold">
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
                          onClick={() => onSwitchPersona(r as Role)}
                          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                            isSelected
                              ? 'border-primary bg-primary/10 font-bold text-primary shadow-2xs'
                              : 'border-border/60 hover:bg-accent text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <Badge
                            variant={getRoleBadgeVariant(r)}
                            className="text-[9px] px-1 py-0"
                          >
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

            {/* Appearance Switcher (Light, Dark, Auto) */}
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
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-muted rounded">
                  {theme}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1 pt-0.5">
                <button
                  type="button"
                  onClick={() => onSetTheme('light')}
                  className={`flex items-center justify-center gap-1 py-1 px-2 rounded-lg text-xs font-medium border transition-colors touch-manipulation min-h-[32px] cursor-pointer ${
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
                  onClick={() => onSetTheme('dark')}
                  className={`flex items-center justify-center gap-1 py-1 px-2 rounded-lg text-xs font-medium border transition-colors touch-manipulation min-h-[32px] cursor-pointer ${
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
                  onClick={() => onSetTheme('system')}
                  className={`flex items-center justify-center gap-1 py-1 px-2 rounded-lg text-xs font-medium border transition-colors touch-manipulation min-h-[32px] cursor-pointer ${
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

            {/* Calendar System Switcher (BS, AD) */}
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 space-y-1.5">
              <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-primary" />
                  <span>Calendar System</span>
                </span>
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono font-bold px-1.5 py-0"
                >
                  {calendarSystem}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-1 pt-0.5">
                <button
                  type="button"
                  onClick={() => onSetCalendarSystem('BS')}
                  className={`flex items-center justify-center py-1 px-2 rounded-lg text-xs font-medium border transition-colors touch-manipulation min-h-[32px] cursor-pointer ${
                    calendarSystem === 'BS'
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs font-semibold'
                      : 'border-input hover:bg-accent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span>Nepali (BS)</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSetCalendarSystem('AD')}
                  className={`flex items-center justify-center py-1 px-2 rounded-lg text-xs font-medium border transition-colors touch-manipulation min-h-[32px] cursor-pointer ${
                    calendarSystem === 'AD'
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs font-semibold'
                      : 'border-input hover:bg-accent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span>Gregorian (AD)</span>
                </button>
              </div>
            </div>

            {/* Sign Out Item */}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onLogout}
              className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 text-xs font-semibold min-h-[38px] rounded-lg"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
