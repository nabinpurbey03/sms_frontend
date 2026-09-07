import React from 'react';
import { Building2, CheckCircle2, AlertTriangle, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Tenant } from '../types';

interface TenantStatsCardsProps {
  tenants: Tenant[];
  isLoading?: boolean;
}

export const TenantStatsCards: React.FC<TenantStatsCardsProps> = ({
  tenants,
  isLoading = false,
}) => {
  const total = tenants.length;
  const active = tenants.filter((t) => t.is_active).length;
  const inactive = total - active;
  const activePercentage = total > 0 ? Math.round((active / total) * 100) : 100;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* Total Schools */}
      <Card className="border-border/60 hover:shadow-md transition-shadow rounded-2xl bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 sm:p-5 space-y-0">
          <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-mono">
            Total Schools
          </CardTitle>
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
            <Building2 className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0">
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
            {isLoading ? '...' : total}
          </div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 font-medium">
            <span>Global multi-tenant platform</span>
          </p>
        </CardContent>
      </Card>

      {/* Active Portals */}
      <Card className="border-border/60 hover:shadow-md transition-shadow rounded-2xl bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 sm:p-5 space-y-0">
          <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-mono">
            Active Portals
          </CardTitle>
          <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0">
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
            {isLoading ? '...' : active}
          </div>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
            {activePercentage}% Operational status
          </p>
        </CardContent>
      </Card>

      {/* Suspended / Inactive */}
      <Card className="border-border/60 hover:shadow-md transition-shadow rounded-2xl bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 sm:p-5 space-y-0">
          <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-mono">
            Inactive / Pending
          </CardTitle>
          <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0">
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
            {isLoading ? '...' : inactive}
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            {inactive > 0 ? 'Requires attention or activation' : 'All portals online'}
          </p>
        </CardContent>
      </Card>

      {/* Domain Resolution */}
      <Card className="border-border/60 hover:shadow-md transition-shadow rounded-2xl bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 sm:p-5 space-y-0">
          <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-mono">
            Domain Scopes
          </CardTitle>
          <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
            <Globe className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0">
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
            {isLoading ? '...' : total}
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            Unique slug routing active
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
