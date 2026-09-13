import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building2, CheckCircle2, ShieldCheck, Activity, AlertCircle } from 'lucide-react';
import { SuperAdminDashboardMetrics } from '../api';

interface SuperAdminGridProps {
  metrics?: SuperAdminDashboardMetrics;
}

export const SuperAdminGrid: React.FC<SuperAdminGridProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      <Card className="border-border/60 hover:shadow-md transition-shadow rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between p-5 pb-2 space-y-0">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Total Tenants
          </CardTitle>
          <div className="p-2 bg-purple-500/10 text-purple-600 rounded-lg">
            <Building2 className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <div className="text-2xl font-bold text-foreground">
            {metrics?.total_tenants ?? 0}
          </div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span>{metrics?.active_tenants ?? 0} Active Schools</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span>{metrics?.inactive_tenants ?? 0} Inactive Schools</span>
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/60 hover:shadow-md transition-shadow rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between p-5 pb-2 space-y-0">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Platform Users
          </CardTitle>
          <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
            <Users className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <div className="text-2xl font-bold text-foreground">
            {metrics?.total_platform_users ?? 0}
          </div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span>{metrics?.active_users ?? 0} Active Users</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span>{metrics?.inactive_users ?? 0} Inactive Users</span>
          </p>
        </CardContent>
      </Card>
      
      {/* Empty spacers or other metrics */}
      <Card className="border-border/60 hover:shadow-md transition-shadow rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between p-5 pb-2 space-y-0">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            System Status
          </CardTitle>
          <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
            <Activity className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <div className="text-2xl font-bold text-emerald-600">
            Healthy
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            All services operational
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/60 hover:shadow-md transition-shadow rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between p-5 pb-2 space-y-0">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Security Scope
          </CardTitle>
          <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg">
            <ShieldCheck className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <div className="text-2xl font-bold text-foreground">
            Global
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Super Admin Access Enabled
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
