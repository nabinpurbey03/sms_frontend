import React, { useState } from 'react';
import { Clock } from 'lucide-react';
import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import { useTenant } from '@/features/tenants/hooks';
import { Badge } from '@/components/ui/badge';
import { getMediaUrl } from '@/lib/utils';
import { useCalendarPreferenceStore } from '@/stores/calendarPreferenceStore';
import { formatDualDate } from '@/features/school-settings/utils/nepaliDate';

export const DashboardHeroBanner: React.FC = () => {
  const { user, activeRole, activeTenantName, activeTenantId } = useAuth();
  const { isSuperAdmin } = usePermission();
  const { calendarSystem } = useCalendarPreferenceStore();
  const { data: tenant } = useTenant(activeTenantId);
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);
  const resolvedLogoUrl = getMediaUrl(tenant?.logo_url);
  const hasValidLogo = !!resolvedLogoUrl && failedLogoUrl !== resolvedLogoUrl;

  const todayStr = new Date().toISOString().slice(0, 10);
  const formattedDate = formatDualDate(todayStr, calendarSystem);

  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-primary/5 dark:bg-primary/10 p-5 sm:p-8 border border-primary/20"
    >
      <div className="relative z-10 space-y-3 max-w-3xl">
        <div className="flex flex-wrap items-center gap-3">
          <Badge
            variant="secondary"
            className="bg-primary/20 text-primary hover:bg-primary/30 border-none font-semibold px-2.5 py-0.5"
          >
            {activeRole || 'USER'}
          </Badge>
          <span className="text-sm text-muted-foreground flex items-center gap-1.5 font-medium">
            <Clock className="h-4 w-4" />
            {formattedDate}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight">
          Welcome back, {user?.first_name} {user?.last_name}!
        </h1>

        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          {activeTenantName ? (
            <>
              Active Portal: <span className="font-semibold text-foreground">{activeTenantName}</span>
            </>
          ) : isSuperAdmin ? (
            'Global Multi-Tenant Administration Platform'
          ) : (
            'Manage your school academics, attendance, and student records seamlessly.'
          )}
        </p>
      </div>

      {/* Right Side: Tenant Logo or Fallback Brand Logo */}
      <div className="absolute right-6 sm:right-10 top-1/2 -translate-y-1/2 hidden md:flex items-center justify-center pointer-events-none z-10">
        {hasValidLogo && resolvedLogoUrl ? (
          <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-card border border-border/50 p-2 shadow-sm flex items-center justify-center overflow-hidden">
            <img
              src={resolvedLogoUrl}
              alt={activeTenantName || 'School Logo'}
              className="h-full w-full object-contain filter drop-shadow-sm"
              onError={() => setFailedLogoUrl(resolvedLogoUrl)}
            />
          </div>
        ) : (
          <img
            src="/logo.svg"
            alt="School Logo"
            className="h-24 w-24 sm:h-32 sm:w-32 opacity-10 drop-shadow-sm object-contain select-none grayscale"
          />
        )}
      </div>
    </div>
  );
};

