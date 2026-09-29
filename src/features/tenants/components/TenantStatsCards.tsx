import React from 'react';
import { Building2, CheckCircle2, AlertTriangle, Globe } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import type { Tenant } from '../types';

interface TenantStatsCardsProps {
  tenants: Tenant[];
  globalStats?: { total: number; active: number; inactive: number };
  isLoading?: boolean;
}

export const TenantStatsCards: React.FC<TenantStatsCardsProps> = ({
  tenants,
  globalStats,
  isLoading = false,
}) => {
  const total = globalStats ? globalStats.total : tenants.length;
  const active = globalStats ? globalStats.active : tenants.filter((t) => t.is_active).length;
  const inactive = globalStats ? globalStats.inactive : total - active;
  const activePercentage = total > 0 ? Math.round((active / total) * 100) : 100;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* Total Schools */}
      <StatCard
        title="Total Schools"
        value={total}
        icon={Building2}
        variant="default"
        description="Global multi-tenant platform"
        loading={isLoading}
      />

      {/* Active Portals */}
      <StatCard
        title="Active Portals"
        value={active}
        icon={CheckCircle2}
        variant="emerald"
        description={`${activePercentage}% Operational status`}
        loading={isLoading}
      />

      {/* Suspended / Inactive */}
      <StatCard
        title="Inactive / Pending"
        value={inactive}
        icon={AlertTriangle}
        variant="amber"
        description={inactive > 0 ? 'Requires attention or activation' : 'All portals online'}
        loading={isLoading}
      />

      {/* Domain Scopes */}
      <StatCard
        title="Domain Scopes"
        value={total}
        icon={Globe}
        variant="blue"
        description="Unique slug routing active"
        loading={isLoading}
      />
    </div>
  );
};
