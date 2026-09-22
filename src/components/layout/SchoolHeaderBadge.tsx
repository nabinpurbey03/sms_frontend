import React from 'react';
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

  const displayName = tenant?.name || tenantName || 'Select School';
  const formattedAddress = formatAddress(tenant?.address);
  const canSwitch = Boolean(memberships && memberships.length > 1);

  // Global Super Admin with no active school selected
  if (!tenantId && isSuperAdmin) {
    return (
      <div className={cn("flex items-center justify-center gap-1.5 text-xs font-semibold text-primary min-w-0 text-center", className)}>
        <Sparkles className="h-4 w-4 shrink-0" />
        <div className="flex flex-col items-center text-center min-w-0">
          <span className="font-bold leading-tight truncate">Global Platform Scope</span>
          <span className="text-[10px] text-muted-foreground font-normal leading-tight hidden sm:block truncate">
            Super Admin Administration
          </span>
        </div>
      </div>
    );
  }

  const resolvedLogoUrl = getMediaUrl(tenant?.logo_url);

  // School identity text content
  const badgeContent = (
    <div className="min-w-0 flex items-center justify-center gap-2 text-center">
      {resolvedLogoUrl && (
        <div className="h-6 w-6 min-h-[24px] min-w-[24px] rounded-lg bg-card border border-border/80 p-0.5 shrink-0 overflow-hidden hidden xs:flex items-center justify-center shadow-xs">
          <img
            src={resolvedLogoUrl}
            alt=""
            className="h-full w-full object-contain"
          />
        </div>
      )}
      <div className="min-w-0 flex flex-col items-center justify-center text-center">
        <div className="flex items-center justify-center gap-1 min-w-0">
          <span className="font-bold text-xs sm:text-sm text-foreground truncate leading-tight block">
            {displayName}
          </span>
        {canSwitch && (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
        )}
      </div>

      {formattedAddress ? (
        <div className="flex items-center justify-center gap-1 text-[10px] sm:text-[11px] text-muted-foreground truncate leading-tight pt-0.5 font-normal">
          <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground/80 shrink-0" />
          <span className="truncate">{formattedAddress}</span>
        </div>
      ) : (
        tenant?.domain_name && (
          <span className="text-[10px] sm:text-[11px] text-muted-foreground font-mono truncate leading-tight pt-0.5">
            {tenant.domain_name}
          </span>
        )
      )}
      </div>
    </div>
  );

  // If user has multiple school memberships, provide switcher dropdown
  if (canSwitch && memberships) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "group flex items-center justify-center min-w-0 px-2 py-1 rounded-lg hover:bg-accent/40 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary max-w-[200px] xs:max-w-[260px] sm:max-w-[340px] md:max-w-[420px] lg:max-w-[480px]",
              className
            )}
            aria-label="Switch School"
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
                className={`cursor-pointer text-xs rounded-lg p-2 min-h-[38px] flex items-center justify-between ${
                  isCurrent ? 'bg-primary/10 font-bold text-primary' : ''
                }`}
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
        "flex items-center justify-center min-w-0 px-1 py-0.5 max-w-[200px] xs:max-w-[260px] sm:max-w-[340px] md:max-w-[420px] lg:max-w-[480px]",
        className
      )}
    >
      {badgeContent}
    </div>
  );
};
