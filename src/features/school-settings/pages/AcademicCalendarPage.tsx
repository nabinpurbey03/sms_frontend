import React from 'react';
import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import { TenantRequiredState } from '@/components/common/TenantRequiredState';
import { AcademicCalendarView } from '../components/AcademicCalendarView';
import { CalendarDays } from 'lucide-react';

export const AcademicCalendarPage: React.FC = () => {
  const { activeTenantId } = useAuth();
  const { can, isSuperAdmin } = usePermission();

  // Only Super Admin + Admin can manage (edit/delete) events
  const canManage = can('MANAGE_TENANT_SETTINGS') || isSuperAdmin;

  if (!activeTenantId) {
    return <TenantRequiredState featureName="academic calendar" />;
  }

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <CalendarDays className="w-7 h-7 text-primary" />
          Academic Calendar
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          View holidays, exam schedules, vacation periods, and important events for the academic session.
        </p>
      </div>

      <AcademicCalendarView tenantId={activeTenantId} canManage={canManage} />
    </div>
  );
};
