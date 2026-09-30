import React, { useEffect, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { BRAND_LOGO_URL } from '@/config/env';
import { type NavItem, isNavItemActive } from './navConfig';

export interface DesktopSidebarProps {
  navItems: NavItem[];
  currentPath: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  user: {
    first_name?: string;
    last_name?: string;
    email?: string;
  } | null;
  activeRole: string | null;
  formatRole: (role: string | null | undefined) => string;
  getRoleBadgeVariant: (role: string | null) => BadgeProps['variant'];
  userInitials: string;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  navItems,
  currentPath,
  isCollapsed,
  onToggleCollapse,
  user,
  activeRole,
  formatRole,
  getRoleBadgeVariant,
  userInitials,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'b' || e.key === 'B')) {
        const target = e.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable)
        ) {
          return;
        }
        e.preventDefault();
        onToggleCollapse();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleCollapse]);

  const groupedNavItems = useMemo(() => {
    const visible = navItems.filter((item) => item.show);
    return visible.reduce<Record<string, NavItem[]>>((acc, item) => {
      const cat = item.category || 'General';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {});
  }, [navItems]);

  const userName = user
    ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User'
    : 'Guest';

  const homeHref = activeRole === 'ACCOUNTANT' ? '/finance' : '/dashboard';

  return (
    <aside
      className={`hidden lg:flex shrink-0 flex-col justify-between bg-card h-screen sticky top-0 z-30 shadow-xs transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64 xl:w-70'
      }`}
      aria-label="Desktop Navigation Sidebar"
    >
      {/* Header & Branding Section */}
      <div
        className={`flex items-center h-14 shrink-0 border-b border-border/40 ${
          isCollapsed ? 'justify-center gap-1.5 px-2' : 'justify-between px-3'
        }`}
      >
        <Link
          to={homeHref}
          className={`flex items-center focus:outline-none min-w-0 ${isCollapsed ? 'shrink-0' : 'gap-2'}`}
          title="Go to Dashboard"
        >
          <div className="flex h-8 w-8 min-h-[32px] min-w-[32px] items-center justify-center rounded-xl bg-card border border-border/80 shadow-xs overflow-hidden p-0.5 shrink-0">
            <img src={BRAND_LOGO_URL} alt="Schools Up Pro" className="h-full w-full object-contain" />
          </div>
          {!isCollapsed && (
            <span className="font-bold tracking-tight text-foreground text-sm truncate">
              Schools Up Pro
            </span>
          )}
        </Link>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer transition-colors ${
                isCollapsed ? 'shrink-0' : ''
              }`}
              onClick={onToggleCollapse}
              aria-label={isCollapsed ? 'Expand Sidebar (⌘B)' : 'Collapse Sidebar (⌘B)'}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={14} className="font-semibold text-xs py-1.5 px-3">
            {isCollapsed ? 'Expand Sidebar (⌘B)' : 'Collapse Sidebar (⌘B)'}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Navigation List & Category Hierarchy */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-3 py-3">
        {Object.entries(groupedNavItems).map(([category, items], catIndex) => (
          <div key={category}>
            {!isCollapsed ? (
              <p className="px-3 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-1.5 mt-5 first:mt-1">
                {category}
              </p>
            ) : catIndex > 0 ? (
              <div className="w-6 border-t border-border/50 mx-auto my-3" />
            ) : null}

            <nav className="space-y-0.5" aria-label={category}>
              {items.map((item) => {
                const isActive = isNavItemActive(currentPath, item.href);
                const Icon = item.icon;

                if (isCollapsed) {
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>
                        <Link
                          to={item.href}
                          aria-current={isActive ? 'page' : undefined}
                          aria-label={item.label}
                          className={`relative flex items-center rounded-xl text-sm transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none justify-center px-0 h-9 w-full ${
                            isActive
                              ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-cyan-300 font-semibold shadow-2xs before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-1 before:rounded-r-full before:bg-primary'
                              : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground font-medium'
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={14} className="font-semibold text-xs py-1.5 px-3">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={`relative flex items-center rounded-xl text-sm transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none gap-3 px-3 h-9 ${
                      isActive
                        ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-cyan-300 font-semibold shadow-2xs before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-1 before:rounded-r-full before:bg-primary'
                        : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground font-medium'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Bottom User Profile Card */}
      <div className="p-3 shrink-0 border-t border-border/40 bg-card/60 backdrop-blur-xs">
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center p-1.5 rounded-xl hover:bg-accent/40 transition-colors cursor-default">
                <Avatar className="h-9 w-9 shrink-0 ring-1 ring-border/80">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={14} className="py-1.5 px-3">
              <p className="font-semibold text-xs text-foreground">{userName}</p>
              <p className="text-[10px] text-muted-foreground">{formatRole(activeRole)}</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <div className="w-full flex items-center gap-3 p-2 bg-accent/40 rounded-xl border border-border/50 text-left">
            <Avatar className="h-9 w-9 shrink-0 ring-1 ring-border/80">
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <p className="text-sm font-semibold text-foreground truncate leading-tight">
                {userName}
              </p>
              <div className="mt-1">
                <Badge variant={getRoleBadgeVariant(activeRole)} className="text-[10px] px-1.5 py-0">
                  {formatRole(activeRole)}
                </Badge>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
