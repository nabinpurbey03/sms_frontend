import React, { useState, useEffect } from 'react';
import { School, MapPin, ChevronDown, Check, Sparkles } from 'lucide-react';
import { useTenant } from '@/features/tenants/hooks';
import type { TenantAddress } from '@/features/tenants/types';
import type { UserMembershipDTO } from '@/api/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn, getMediaUrl } from '@/lib/utils';

interface SchoolHeaderBadgeProps {
  tenantId: string | null;
  tenantName: string | null;
  isSuperAdmin: boolean;
  memberships?: UserMembershipDTO[];
  onSwitchTenant: (tenantId: string) => void;
  className?: string;
}

const formatAddress = (address?: TenantAddress | null): string => {
  if (!address) return '';
  const parts: string[] = [];
  if (address.tole) parts.push(address.tole);
  if (address.municipality && address.ward) {
    parts.push(`${address.municipality}-${address.ward}`);
  } else if (address.municipality) {
    parts.push(address.municipality);
  }
  if (address.district) parts.push(address.district);
  return parts.join(', ');
};

export const SchoolHeaderBadge: React.FC<SchoolHeaderBadgeProps> = ({
  tenantId,
  tenantName,
  isSuperAdmin,
  memberships,
  onSwitchTenant,
  className,
}) => {
  const { data: tenant } = useTenant(tenantId);
  const [logoError, setLogoError] = useState(false);

  const displayName = tenant?.name || tenantName || 'Select School';
  const formattedAddress = formatAddress(tenant?.address);
  const canSwitch = Boolean(memberships && memberships.length > 1);

  const resolvedLogoUrl = getMediaUrl(tenant?.logo_url);

  useEffect(() => {
    setLogoError(false);
  }, [resolvedLogoUrl]);

  // Global Super Admin with no active school selected
  if (!tenantId && isSuperAdmin) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 sm:gap-2.5 px-2 py-1 max-w-[220px] xs:max-w-[280px] sm:max-w-[360px] md:max-w-[420px]",
          className
        )}
        title="Global Platform Scope — Super Admin Administration"
      >
        <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
          <Sparkles className="h-4 w-4 shrink-0" />
        </div>
        <div className="flex flex-col min-w-0 text-left justify-center">
          <span className="text-xs sm:text-sm font-bold text-foreground truncate tracking-tight leading-tight">
            Global Platform Scope
          </span>
          <span className="text-[10px] sm:text-xs text-muted-foreground truncate leading-tight font-normal pt-0.5">
            Super Admin Administration
          </span>
        </div>
      </div>
    );
  }

  const tooltipTitle = formattedAddress
    ? `${displayName} • ${formattedAddress}`
    : tenant?.domain_name
      ? `${displayName} (${tenant.domain_name})`
      : displayName;

  // School identity horizontal badge content (Left: Logo, Right: Name & Address)
  const badgeContent = (
    <>
      {/* Left element: Logo Container */}
      <div className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 rounded-xl bg-card border border-border/80 p-1 flex items-center justify-center shadow-2xs overflow-hidden ring-1 ring-border/40">
        {resolvedLogoUrl && !logoError ? (
          <img
            src={resolvedLogoUrl}
            alt=""
            className="h-full w-full object-contain"
            onError={() => setLogoError(true)}
          />
        ) : (
          <div className="h-full w-full rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <School className="h-4 w-4 sm:h-4.5 sm:w-4.5 shrink-0" />
          </div>
        )}
      </div>

      {/* Right element: Text Block (School Name & School Address) */}
      <div className="flex flex-col min-w-0 text-left justify-center">
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-xs sm:text-sm font-bold text-foreground truncate tracking-tight leading-tight">
            {displayName}
          </span>
          {canSwitch && (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0 group-hover:text-foreground transition-colors ml-1" />
          )}
        </div>

        <div className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 truncate leading-tight font-normal pt-0.5">
          {formattedAddress ? (
            <>
              <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary/70 shrink-0" />
              <span className="truncate">{formattedAddress}</span>
            </>
          ) : tenant?.domain_name ? (
            <span className="truncate font-mono">{tenant.domain_name}</span>
          ) : (
            <span className="truncate">School Portal</span>
          )}
        </div>
      </div>
    </>
  );

  // If user has multiple school memberships, provide switcher dropdown
  if (canSwitch && memberships) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "group flex items-center gap-2 sm:gap-2.5 px-2 py-1 rounded-xl hover:bg-accent/50 transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary max-w-[220px] xs:max-w-[280px] sm:max-w-[360px] md:max-w-[420px]",
              className
            )}
            aria-label={`Current school: ${displayName}. Switch School`}
            title={tooltipTitle}
          >
            {badgeContent}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-64 sm:w-72 p-1.5 shadow-xl rounded-xl">
          <DropdownMenuLabel className="text-xs font-semibold px-2 py-1.5 text-muted-foreground">
            Switch School Portal
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {memberships.map((m) => {
            const isCurrent = m.tenant_id === tenantId;
            return (
              <DropdownMenuItem
                key={m.tenant_id}
                onClick={() => onSwitchTenant(m.tenant_id)}
                className={cn(
                  "cursor-pointer text-xs rounded-lg p-2 min-h-[38px] flex items-center justify-between",
                  isCurrent && "bg-primary/10 font-bold text-primary"
                )}
              >
                <div className="flex items-center gap-2 truncate">
                  <School className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate">{m.tenant_name}</span>
                </div>
                {isCurrent && <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-1.5" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Single school membership (or Super Admin scoped to a tenant)
  return (
    <div
      className={cn(
        "flex items-center gap-2 sm:gap-2.5 px-2 py-1 max-w-[220px] xs:max-w-[280px] sm:max-w-[360px] md:max-w-[420px]",
        className
      )}
      title={tooltipTitle}
    >
      {badgeContent}
    </div>
  );
};
