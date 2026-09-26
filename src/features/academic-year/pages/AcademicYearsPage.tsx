import React, { useState } from 'react';
import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import { useAcademicYears, useSetCurrentAcademicYear, useCloseAcademicYear } from '../hooks';
import { AcademicYearFormDialog } from '../components/AcademicYearFormDialog';
import { PlatformRolloverDialog } from '../components/PlatformRolloverDialog';
import { TenantRequiredState } from '@/components/common/TenantRequiredState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CalendarDays,
  Plus,
  CheckCircle2,
  Lock,
  Loader2,
  RefreshCw,
  School,
} from 'lucide-react';
import { useTenant } from '@/features/tenants/hooks';
import { SchoolSearchSelect } from '../components/SchoolSearchSelect';
import { useAllClassesWithDetails } from '@/features/academic/hooks';
import { ClassProgressionPipeline } from '@/features/academic/components/ClassProgressionPipeline';
import { ClassReorderDialog } from '@/features/academic/components/ClassReorderDialog';
import { formatDualDateRange } from '@/features/school-settings/utils/nepaliDate';
import { useCalendarPreferenceStore } from '@/stores/calendarPreferenceStore';

export interface AcademicYearsPageProps {
  /** When provided, the component acts as an embedded panel — no duplicate header or school selector */
  tenantId?: string;
  canManage?: boolean;
}

export const AcademicYearsPage: React.FC<AcademicYearsPageProps> = ({
  tenantId: externalTenantId,
  canManage: externalCanManage,
}) => {
  const { activeTenantId } = useAuth();
  const { can, isSuperAdmin } = usePermission();
  const { calendarSystem } = useCalendarPreferenceStore();

  const isEmbedded = externalTenantId !== undefined;
  const internalCanManage = can('MANAGE_TENANT_SETTINGS') || isSuperAdmin;
  const canManage = externalCanManage ?? internalCanManage;

  // For Super Admins when standalone, allow selecting a specific tenant
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const effectiveTenantId = isEmbedded
    ? (externalTenantId || '')
    : (selectedTenantId || activeTenantId || '');
  const { data: effectiveTenant } = useTenant(effectiveTenantId || null);

  const { data: years = [], isLoading } = useAcademicYears(effectiveTenantId || null);
  const { data: tenantClasses = [] } = useAllClassesWithDetails(effectiveTenantId || null);
  const setCurrentMutation = useSetCurrentAcademicYear();
  const closeMutation = useCloseAcademicYear();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isRolloverOpen, setIsRolloverOpen] = useState(false);
  const [isReorderOpen, setIsReorderOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Accessible confirmation dialog state
  const [confirmAction, setConfirmAction] = useState<{
    type: 'set-current' | 'close-year';
    yearId: string;
    yearName: string;
  } | null>(null);

  // Non-superadmins require an active tenant to view or manage local academic years
  if (!isEmbedded && !activeTenantId && !isSuperAdmin) {
    return <TenantRequiredState featureName="academic years management" />;
  }

  const handleSetCurrent = (yearId: string, name: string) => {
    setConfirmAction({ type: 'set-current', yearId, yearName: name });
  };

  const handleCloseYear = (yearId: string, name: string) => {
    setConfirmAction({ type: 'close-year', yearId, yearName: name });
  };

  const executeConfirmAction = async () => {
    if (!confirmAction || !effectiveTenantId) return;
    setProcessingId(confirmAction.yearId);
    try {
      if (confirmAction.type === 'set-current') {
        await setCurrentMutation.mutateAsync({ tenantId: effectiveTenantId, yearId: confirmAction.yearId });
      } else {
        await closeMutation.mutateAsync({ tenantId: effectiveTenantId, yearId: confirmAction.yearId });
      }
    } finally {
      setProcessingId(null);
      setConfirmAction(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Standalone Header */}
      {!isEmbedded && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-primary" />
              Academic Years
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage academic sessions, define start and end dates, and set the current active year.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {isSuperAdmin && (
              <Button
                variant="destructive"
                onClick={() => setIsRolloverOpen(true)}
                className="w-full sm:w-auto shrink-0 bg-amber-600 hover:bg-amber-700 text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Platform Rollover
              </Button>
            )}
            {canManage && (
              <Button
                onClick={() => setIsFormOpen(true)}
                disabled={!effectiveTenantId}
                className="w-full sm:w-auto shrink-0"
                title={!effectiveTenantId ? "Please select a school to create a year" : undefined}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Year
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Standalone Super Admin School Context Selector */}
      {!isEmbedded && isSuperAdmin && (
        <Card className="p-4 bg-muted/40 border-dashed flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <School className="w-4 h-4 text-primary shrink-0" />
            <span className="font-semibold">School Scope:</span>
            <span className="text-muted-foreground text-xs">
              {effectiveTenant ? effectiveTenant.name : 'Select a school to inspect its sessions'}
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

      {/* Embedded Action Bar */}
      {isEmbedded && canManage && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              Academic Sessions & Rollover
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Active sessions define the timeline for class enrollment, attendance marking, and holiday calendars.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isSuperAdmin && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsRolloverOpen(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Platform Rollover
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => setIsFormOpen(true)}
              disabled={!effectiveTenantId}
              title={!effectiveTenantId ? "Please select a school to create a year" : undefined}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Create Year
            </Button>
          </div>
        </div>
      )}

      <Card className="overflow-hidden">
        {!effectiveTenantId ? (
          <div className="p-8 text-center text-muted-foreground">
            <p className="font-medium text-foreground">Global Platform View</p>
            <p className="text-xs mt-1">
              Select a school from the dropdown above to view its academic sessions, or click <strong>Platform Rollover</strong> to advance all schools platform-wide.
            </p>
          </div>
        ) : isLoading ? (
          <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            Loading academic years...
          </div>
        ) : years.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No academic years found for {effectiveTenant?.name || 'this school'}. Click "Create Year" to add one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {years.map((year) => (
                  <TableRow key={year.id}>
                    <TableCell className="font-medium">{year.name}</TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {formatDualDateRange(year.start_date, year.end_date, calendarSystem)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {year.is_current && (
                          <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                            Current
                          </Badge>
                        )}
                        {year.is_closed && (
                          <Badge variant="secondary">
                            Closed
                          </Badge>
                        )}
                        {!year.is_current && !year.is_closed && (
                          <Badge variant="outline">
                            Inactive
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!year.is_current && !year.is_closed && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSetCurrent(year.id, year.name)}
                              disabled={processingId === year.id}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Set Current
                            </Button>
                          )}
                          {!year.is_closed && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCloseYear(year.id, year.name)}
                              disabled={processingId === year.id || year.is_current}
                              title={year.is_current ? "Cannot close the current active year" : "Close this year"}
                            >
                              <Lock className="w-4 h-4 mr-1" />
                              Close
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* School Class Progression Chronology */}
      {effectiveTenantId && tenantClasses.length > 0 && (
        <ClassProgressionPipeline
          classes={tenantClasses}
          defaultExpanded={false}
          onOpenReorder={canManage ? () => setIsReorderOpen(true) : undefined}
        />
      )}

      <AcademicYearFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        targetTenantId={effectiveTenantId}
        targetTenantName={effectiveTenant?.name}
      />
      <PlatformRolloverDialog open={isRolloverOpen} onOpenChange={setIsRolloverOpen} />
      <ClassReorderDialog
        isOpen={isReorderOpen}
        onClose={() => setIsReorderOpen(false)}
        classes={tenantClasses}
        tenantId={effectiveTenantId}
      />

      {/* Accessible Confirmation Dialog */}
      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={confirmAction?.type === 'set-current' ? 'Set Active Academic Year' : 'Close Academic Year'}
        description={
          confirmAction?.type === 'set-current'
            ? `Are you sure you want to set "${confirmAction?.yearName}" as the current academic year for the whole school?`
            : `Are you sure you want to close "${confirmAction?.yearName}"? This action might make data read-only.`
        }
        confirmLabel={confirmAction?.type === 'set-current' ? 'Set as Current' : 'Close Year'}
        variant={confirmAction?.type === 'close-year' ? 'destructive' : 'default'}
        onConfirm={executeConfirmAction}
        isPending={!!processingId}
      />
    </div>
  );
};
