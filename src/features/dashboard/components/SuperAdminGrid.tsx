import React from 'react';
import { Link } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  Building2,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  CalendarCheck,
} from 'lucide-react';
import { SuperAdminDashboardMetrics } from '../api';

interface SuperAdminGridProps {
  metrics?: SuperAdminDashboardMetrics;
}

export const SuperAdminGrid: React.FC<SuperAdminGridProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {/* Card 1: Total Schools / Tenants */}
      <Link
        to="/tenants"
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl group"
      >
        <Card className="border-border/60 hover:border-purple-500/40 hover:shadow-md transition-all rounded-xl h-full cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between p-5 pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
              Total Schools / Tenants
            </CardTitle>
            <div className="p-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg group-hover:scale-105 transition-transform">
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
      </Link>

      {/* Card 2: Platform Students */}
      <Card className="border-border/60 hover:shadow-md transition-shadow rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between p-5 pb-2 space-y-0">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Platform Students
          </CardTitle>
          <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
            <GraduationCap className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <div className="text-2xl font-bold text-foreground">
            {(metrics?.total_students_across_platform ?? 0).toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            <span>Total enrolled students across all schools</span>
          </p>
        </CardContent>
      </Card>

      {/* Card 3: Platform Attendance Today */}
      <Card className="border-border/60 hover:shadow-md transition-shadow rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between p-5 pb-2 space-y-0">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Platform Attendance Today
          </CardTitle>
          <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <CalendarCheck className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <div className="text-2xl font-bold text-foreground">
            {metrics?.today_platform_attendance_rate !== null &&
            metrics?.today_platform_attendance_rate !== undefined
              ? `${metrics.today_platform_attendance_rate}%`
              : 'Pending'}
          </div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span>{(metrics?.today_attendance_records_count ?? 0).toLocaleString()} records marked today</span>
          </p>
        </CardContent>
      </Card>

      {/* Card 4: Platform Users */}
      <Card className="border-border/60 hover:shadow-md transition-shadow rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between p-5 pb-2 space-y-0">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Platform Users
          </CardTitle>
          <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
            <Users className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <div className="text-2xl font-bold text-foreground">
            {(metrics?.total_platform_users ?? 0).toLocaleString()}
          </div>
          <p
            className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 truncate"
            title={`${metrics?.active_users ?? 0} Active • ${metrics?.total_teachers ?? 0} Teachers • ${metrics?.total_parents ?? 0} Parents`}
          >
            <span>
              {metrics?.active_users ?? 0} Active • {metrics?.total_teachers ?? 0} Teachers • {metrics?.total_parents ?? 0} Parents
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
