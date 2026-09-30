import React from 'react';
import { Link } from '@tanstack/react-router';
import {
  X,
  Sun,
  Moon,
  Monitor,
  CalendarDays,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { BRAND_LOGO_URL } from '@/config/env';
import { type NavItem, isNavItemActive, groupNavItemsByCategory } from './navConfig';

export interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
  navItems: NavItem[];
  currentPath: string;
  user: {
    first_name?: string;
    last_name?: string;
    email?: string;
  } | null;
  activeRole: string | null;
  formatRole: (role: string | null | undefined) => string;
  getRoleBadgeVariant: (role: string | null) => BadgeProps['variant'];
  activeTenantName?: string | null;
  theme: string;
  onSetTheme: (theme: 'light' | 'dark' | 'system') => void;
  calendarSystem: 'AD' | 'BS';
  onSetCalendarSystem: (system: 'BS' | 'AD') => void;
  onLogout: () => void;
}

export const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({
  open,
  onClose,
  navItems,
  currentPath,
  user,
  activeRole,
  formatRole,
  getRoleBadgeVariant,
  activeTenantName,
  theme,
  onSetTheme,
  calendarSystem,
  onSetCalendarSystem,
  onLogout,
}) => {
  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  const groupedNavItems = React.useMemo(() => {
    return groupNavItemsByCategory(navItems);
  }, [navItems]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity z-50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Navigation"
        className="fixed inset-y-0 left-0 z-50 w-full max-w-[290px] sm:max-w-xs bg-card p-4 shadow-2xl flex flex-col justify-between overflow-y-auto scrollbar-hide animate-in slide-in-from-left duration-200"
      >
        <div className="space-y-4">
          {/* Header Section */}
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-card border border-border/80 shadow-xs p-0.5 overflow-hidden">
                <img
                  src={BRAND_LOGO_URL}
                  alt="Schools Up Pro"
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <span className="font-bold text-foreground text-sm leading-tight block">
                  Schools Up Pro
                </span>
                <span className="text-[10px] text-muted-foreground font-mono block">
                  SMS Navigation
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="min-h-[44px] min-w-[44px] h-11 w-11 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent"
              onClick={onClose}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation Links (Touch-First) */}
          <div>
            {Object.entries(groupedNavItems).map(([category, items]) => (
              <div key={category}>
                <p className="px-3 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-2 mt-4 first:mt-1">
                  {category}
                </p>
                <nav className="space-y-0.5">
                  {items.map((item) => {
                    const isActive = isNavItemActive(currentPath, item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        to={item.href as any}
                        onClick={onClose}
                        aria-current={isActive ? 'page' : undefined}
                        className={`min-h-[44px] px-3.5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 transition-colors ${
                          isActive
                            ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
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

        {/* Drawer Footer & Preferences */}
        <div className="sticky bottom-0 bg-card pt-4 space-y-3 shrink-0 pb-safe">
          {user && (
            <div className="rounded-xl border bg-muted/40 p-3 space-y-1">
              <p className="text-xs font-bold text-foreground truncate">
                {[user.first_name, user.last_name].filter(Boolean).join(' ') || 'User'}
              </p>
              <div className="flex items-center gap-2">
                <Badge
                  variant={getRoleBadgeVariant(activeRole)}
                  className="text-[9px] px-1 py-0"
                >
                  {formatRole(activeRole)}
                </Badge>
                <p className="text-[11px] text-muted-foreground truncate">
                  {activeTenantName || 'Global Platform'}
                </p>
              </div>
            </div>
          )}

          {/* Theme Mode Quick Buttons on Mobile */}
          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => onSetTheme('light')}
              className={`min-h-[44px] flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors ${
                theme === 'light'
                  ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                  : 'border-input text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <Sun className="h-3.5 w-3.5 shrink-0" />
              <span>Light</span>
            </button>
            <button
              type="button"
              onClick={() => onSetTheme('dark')}
              className={`min-h-[44px] flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors ${
                theme === 'dark'
                  ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                  : 'border-input text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <Moon className="h-3.5 w-3.5 shrink-0" />
              <span>Dark</span>
            </button>
            <button
              type="button"
              onClick={() => onSetTheme('system')}
              className={`min-h-[44px] flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors ${
                theme === 'system'
                  ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                  : 'border-input text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <Monitor className="h-3.5 w-3.5 shrink-0" />
              <span>Auto</span>
            </button>
          </div>

          {/* Calendar Mode Quick Buttons on Mobile */}
          <div className="grid grid-cols-2 gap-1 pt-1">
            <button
              type="button"
              onClick={() => onSetCalendarSystem('BS')}
              className={`min-h-[44px] flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors ${
                calendarSystem === 'BS'
                  ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                  : 'border-input text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              <span>Nepali (BS)</span>
            </button>
            <button
              type="button"
              onClick={() => onSetCalendarSystem('AD')}
              className={`min-h-[44px] flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors ${
                calendarSystem === 'AD'
                  ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                  : 'border-input text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              <span>Gregorian (AD)</span>
            </button>
          </div>

          <Button
            variant="outline"
            onClick={onLogout}
            className="w-full min-h-[44px] h-11 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20 font-semibold rounded-xl flex items-center justify-center gap-2"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
