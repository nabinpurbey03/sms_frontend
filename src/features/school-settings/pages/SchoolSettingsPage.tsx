import React, { useState } from 'react';
import { useSearch, useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import { useTenant } from '@/features/tenants/hooks';
import { TenantRequiredState } from '@/components/common/TenantRequiredState';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Settings,
  Calendar,
  Clock,
  CalendarDays,
  Building,
  School,
} from 'lucide-react';
import { AcademicYearsPage } from '@/features/academic-year/pages/AcademicYearsPage';
import { AcademicDaysConfig } from '../components/AcademicDaysConfig';
import { AcademicCalendarView } from '../components/AcademicCalendarView';
import { SchoolGeneralSettings } from '../components/SchoolGeneralSettings';
import { SchoolSearchSelect } from '@/features/academic-year/components/SchoolSearchSelect';

export type SchoolSettingsTab = 'sessions' | 'days' | 'calendar' | 'profile';

export const SchoolSettingsPage: React.FC = () => {
  const { activeTenantId } = useAuth();
  const { can, isSuperAdmin } = usePermission();
  const canManage = can('MANAGE_TENANT_SETTINGS') || isSuperAdmin;

  const searchParams = useSearch({ strict: false }) as any;
  const navigate = useNavigate();
  const currentTab = (searchParams?.tab as SchoolSettingsTab) || 'sessions';

  // Super Admin tenant selection
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const effectiveTenantId = selectedTenantId || activeTenantId || '';
  const { data: effectiveTenant } = useTenant(effectiveTenantId || null);

  // Require tenant if non-superadmin
  if (!activeTenantId && !isSuperAdmin) {
    return <TenantRequiredState featureName="school settings" />;
  }

  const handleTabChange = (tab: SchoolSettingsTab) => {
    navigate({
      to: '/school-settings',
      search: { tab },
    });
  };

  const tabs: {
    id: SchoolSettingsTab;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: 'sessions',
      label: 'Academic Sessions',
      description: 'Manage sessions, start & end dates, and rollover',
      icon: Calendar,
    },
    {
      id: 'days',
      label: 'Weekly Academic Days',
      description: 'Configure operational school days & weekends',
      icon: Clock,
    },
    {
      id: 'calendar',
      label: 'Academic Calendar',
      description: 'Holidays, exam schedules & vacation planner',
      icon: CalendarDays,
    },
    {
      id: 'profile',
      label: 'School Profile',
      description: 'Institution identity, address & official branding',
      icon: Building,
    },
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Settings className="w-7 h-7 text-primary" />
            School Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Centralized hub to manage academic sessions, weekly operational days, holiday calendar, and school profile.
          </p>
        </div>
      </div>

      {/* Super Admin School Scope Selector */}
      {isSuperAdmin && (
        <Card className="p-4 bg-muted/30 border-dashed flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <School className="w-4 h-4 text-primary shrink-0" />
            <span className="font-semibold">Target School Scope:</span>
            <span className="text-muted-foreground text-xs">
              {effectiveTenant ? effectiveTenant.name : 'Select a school to manage its configuration'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <SchoolSearchSelect
              selectedTenantId={selectedTenantId}
              onSelectTenant={setSelectedTenantId}
            />
          </div>
        </Card>
      )}

      {/* Primary Tab Bar */}
      <div className="border-b border-border">
        <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto pb-px" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors min-h-[44px] cursor-pointer ${
                  isActive
                    ? 'border-primary text-primary font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Panels */}
      <div className="pt-2">
        {currentTab === 'sessions' && (
          <div>
            <AcademicYearsPage />
          </div>
        )}

        {currentTab === 'days' && (
          <div>
            {effectiveTenantId ? (
              <AcademicDaysConfig tenantId={effectiveTenantId} canManage={canManage} />
            ) : (
              <Card className="p-8 text-center text-muted-foreground">
                Please select a school to configure weekly academic days.
              </Card>
            )}
          </div>
        )}

        {currentTab === 'calendar' && (
          <div>
            {effectiveTenantId ? (
              <AcademicCalendarView tenantId={effectiveTenantId} canManage={canManage} />
            ) : (
              <Card className="p-8 text-center text-muted-foreground">
                Please select a school to view or configure its academic calendar.
              </Card>
            )}
          </div>
        )}

        {currentTab === 'profile' && (
          <div>
            {effectiveTenantId ? (
              <SchoolGeneralSettings tenantId={effectiveTenantId} canManage={canManage} />
            ) : (
              <Card className="p-8 text-center text-muted-foreground">
                Please select a school to view or edit institutional profile details.
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
