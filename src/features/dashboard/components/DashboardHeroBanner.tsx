import React, { useState } from 'react';
import { Clock } from 'lucide-react';
import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import { useTenant } from '@/features/tenants/hooks';
import { Badge } from '@/components/ui/badge';

export const DashboardHeroBanner: React.FC = () => {
  const { user, activeRole, activeTenantName, activeTenantId } = useAuth();
  const { isSuperAdmin } = usePermission();
  const { data: tenant } = useTenant(activeTenantId);
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);
  const hasValidLogo = !!tenant?.logo_url && failedLogoUrl !== tenant.logo_url;

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-800 dark:from-[#052414] dark:via-[#03140c] dark:to-slate-950 p-4 sm:p-6 lg:p-8 text-white shadow-lg shadow-primary/20 dark:shadow-black/50 border border-emerald-500/30 transition-all duration-500 ease-in-out"
    >
      <div className="relative z-10 space-y-2 max-w-3xl">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="secondary"
            className="bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm border-white/20 text-[11px] sm:text-xs font-semibold px-2 py-0.5"
          >
            {activeRole || 'USER'}
          </Badge>
          <span className="text-xs text-white/90 flex items-center gap-1 font-medium">
            <Clock className="h-3.5 w-3.5" />
            {formattedDate}
          </span>
        </div>

        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white leading-tight">
          Welcome back, {user?.first_name} {user?.last_name}!
        </h1>

        <p className="text-xs sm:text-sm md:text-base text-white/90 leading-relaxed">
          {activeTenantName ? (
            <>
              Active Portal: <span className="font-semibold underline decoration-white/40">{activeTenantName}</span>
            </>
          ) : isSuperAdmin ? (
            'Global Multi-Tenant Administration Platform'
          ) : (
            'Manage your school academics, attendance, and student records seamlessly.'
          )}
        </p>
      </div>

      {/* Decorative Ambient Themed Glows */}
      <div
        className="absolute -right-8 -bottom-8 w-48 sm:w-64 h-48 sm:h-64 bg-emerald-400/20 dark:bg-emerald-500/25 rounded-full blur-3xl pointer-events-none transition-colors duration-500"
      />
      <div
        className="absolute -left-10 -top-10 w-36 sm:w-48 h-36 sm:h-48 bg-emerald-400/20 dark:bg-emerald-500/25 rounded-full blur-3xl pointer-events-none transition-colors duration-500"
      />

      {/* Right Side: Tenant Logo or Fallback Brand Logo */}
      <div className="absolute right-6 sm:right-8 lg:right-10 top-1/2 -translate-y-1/2 hidden sm:flex items-center justify-center pointer-events-none z-10">
        {hasValidLogo && tenant?.logo_url ? (
          <div className="h-20 w-20 sm:h-24 sm:w-24 lg:h-28 lg:w-28 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 p-2.5 shadow-2xl flex items-center justify-center overflow-hidden">
            <img
              src={tenant.logo_url}
              alt={activeTenantName || 'School Logo'}
              className="h-full w-full object-contain filter drop-shadow-md"
              onError={() => setFailedLogoUrl(tenant.logo_url || null)}
            />
          </div>
        ) : (
          <img
            src="/logo.svg"
            alt="Schools Up Pro"
            className="h-24 w-24 sm:h-32 sm:w-32 opacity-20 drop-shadow-lg object-contain select-none"
          />
        )}
      </div>
    </div>
  );
};
