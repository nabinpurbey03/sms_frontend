import React, { useState } from 'react';
import { useSearch, useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import { useTenant } from '@/features/tenants/hooks';
import { TenantRequiredState } from '@/components/common/TenantRequiredState';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Calendar,
  Clock,
  CalendarDays,
  Building,
  School,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AcademicYearsPage } from '@/features/academic-year/pages/AcademicYearsPage';
import { AcademicDaysConfig } from '../components/AcademicDaysConfig';
import { AcademicCalendarView } from '../components/AcademicCalendarView';
import { SchoolGeneralSettings } from '../components/SchoolGeneralSettings';
import { SchoolSearchSelect } from '@/features/academic-year/components/SchoolSearchSelect';

export type SchoolSettingsTab = 'calendar' | 'days' | 'sessions' | 'profile';

interface TabConfig {
  id: SchoolSettingsTab;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TABS: TabConfig[] = [
  {
    id: 'calendar',
    label: 'Academic Calendar',
    description: 'Holidays, exam schedules & vacation planner',
    icon: CalendarDays,
  },
  {
    id: 'days',
    label: 'Weekly Academic Days',
    description: 'Configure operational school days & weekends',
    icon: Clock,
  },
  {
    id: 'sessions',
    label: 'Academic Sessions',
    description: 'Manage sessions, start & end dates, and rollover',
    icon: Calendar,
  },
  {
    id: 'profile',
    label: 'School Profile',
    description: 'Institution identity, address & official branding',
    icon: Building,
  },
];

interface EmptyScopeStateProps {
  tabLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

const EmptyScopeState: React.FC<EmptyScopeStateProps> = ({ tabLabel, icon: Icon }) => (
  <Card className="border-dashed border-2 p-12 text-center bg-muted/15 rounded-2xl flex flex-col items-center justify-center animate-in fade-in-50 duration-200">
    <div className="w-14 h-14 rounded-2xl bg-muted/80 border border-border/60 flex items-center justify-center text-primary mb-4 shadow-xs">
      <Icon className="w-7 h-7 text-primary/80" />
    </div>
    <h3 className="text-base font-semibold text-foreground mb-1.5">
      No School Selected for {tabLabel}
    </h3>
    <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed mb-4">
      Please select a school from the scope selector above to view and configure its {tabLabel.toLowerCase()}.
    </p>
    <Badge variant="secondary" className="gap-1.5 text-xs font-normal py-1 px-3">
      <School className="w-3.5 h-3.5 text-muted-foreground" />
      Super Admin Multi-School Scope
    </Badge>
  </Card>
);

export const SchoolSettingsPage: React.FC = () => {
  const { activeTenantId } = useAuth();
  const { can, isSuperAdmin } = usePermission();
  const canManage = can('MANAGE_TENANT_SETTINGS') || isSuperAdmin;

  const searchParams = useSearch({ strict: false }) as any;
  const navigate = useNavigate();
  const currentTab = (searchParams?.tab as SchoolSettingsTab) || 'calendar';

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

  return (
    <div className="space-y-5 pb-16">
      {/* Super Admin School Scope Selector */}
      {isSuperAdmin && (
        <Card className="p-3.5 sm:p-4 rounded-2xl border border-primary/20 bg-primary/[0.03] dark:bg-primary/[0.06] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 transition-all">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <School className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  School Scope
                </span>
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-primary/30 text-primary font-medium">
                  Super Admin
                </Badge>
              </div>
              <p className="text-sm font-medium text-foreground truncate mt-0.5">
                {effectiveTenant ? (
                  <span className="flex items-center gap-1.5">
                    <span className="font-semibold text-foreground">{effectiveTenant.name}</span>
                    {effectiveTenant.domain_name && (
                      <span className="text-xs text-muted-foreground font-normal">
                        ({effectiveTenant.domain_name})
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs">
                    Select a school to manage institutional settings
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <SchoolSearchSelect
              selectedTenantId={selectedTenantId}
              onSelectTenant={setSelectedTenantId}
              className="w-full sm:w-80"
            />
          </div>
        </Card>
      )}

      {/* Accessible Segmented Tab Container */}
      <Tabs
        value={currentTab}
        onValueChange={(val) => handleTabChange(val as SchoolSettingsTab)}
        className="space-y-4"
      >
        <div className="overflow-x-auto no-scrollbar -mx-1 px-1 py-0.5">
          <TabsList className="h-auto p-1.5 bg-muted/60 dark:bg-muted/30 border border-border/60 rounded-2xl inline-flex w-full sm:w-auto max-w-full gap-1 shadow-2xs">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;

              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className={cn(
                    'group relative flex items-center gap-2.5 px-4 py-2 text-sm rounded-xl transition-all duration-200 shrink-0 cursor-pointer select-none',
                    'text-muted-foreground hover:text-foreground',
                    'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs data-[state=active]:border-border/60 data-[state=active]:font-semibold',
                    'focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none'
                  )}
                >
                  <div
                    className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 shrink-0',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'bg-muted text-muted-foreground group-hover:bg-muted/80 group-hover:text-foreground'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" />
                  </div>
                  <span className="whitespace-nowrap font-medium tracking-tight">
                    {tab.label}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <TabsContent value="calendar" className="pt-1 animate-in fade-in-50 duration-200 focus-visible:outline-none">
          {effectiveTenantId ? (
            <AcademicCalendarView tenantId={effectiveTenantId} canManage={canManage} />
          ) : (
            <EmptyScopeState tabLabel="Academic Calendar" icon={CalendarDays} />
          )}
        </TabsContent>

        <TabsContent value="days" className="pt-1 animate-in fade-in-50 duration-200 focus-visible:outline-none">
          {effectiveTenantId ? (
            <AcademicDaysConfig tenantId={effectiveTenantId} canManage={canManage} />
          ) : (
            <EmptyScopeState tabLabel="Weekly Academic Days" icon={Clock} />
          )}
        </TabsContent>

        <TabsContent value="sessions" className="pt-1 animate-in fade-in-50 duration-200 focus-visible:outline-none">
          {effectiveTenantId ? (
            <AcademicYearsPage tenantId={effectiveTenantId} canManage={canManage} />
          ) : (
            <EmptyScopeState tabLabel="Academic Sessions" icon={Calendar} />
          )}
        </TabsContent>

        <TabsContent value="profile" className="pt-1 animate-in fade-in-50 duration-200 focus-visible:outline-none">
          {effectiveTenantId ? (
            <SchoolGeneralSettings tenantId={effectiveTenantId} canManage={canManage} />
          ) : (
            <EmptyScopeState tabLabel="School Profile" icon={Building} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
