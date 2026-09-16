import React, { useState } from 'react';
import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import { useAcademicYears, useSetCurrentAcademicYear, useCloseAcademicYear } from '../hooks';
import { AcademicYearFormDialog } from '../components/AcademicYearFormDialog';
import { PlatformRolloverDialog } from '../components/PlatformRolloverDialog';
import { TenantRequiredState } from '@/components/common/TenantRequiredState';
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
import { CalendarDays, Plus, CheckCircle2, Lock, Loader2, RefreshCw } from 'lucide-react';

export const AcademicYearsPage: React.FC = () => {
  const { activeTenantId } = useAuth();
  const { can, isSuperAdmin } = usePermission();
  const canManage = can('MANAGE_TENANT_SETTINGS') || isSuperAdmin;

  const { data: years = [], isLoading } = useAcademicYears(activeTenantId);
  const setCurrentMutation = useSetCurrentAcademicYear();
  const closeMutation = useCloseAcademicYear();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isRolloverOpen, setIsRolloverOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  if (!activeTenantId) {
    return <TenantRequiredState featureName="academic years management" />;
  }

  const handleSetCurrent = async (yearId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to set ${name} as the current academic year for the whole school?`)) {
      return;
    }
    setProcessingId(yearId);
    try {
      await setCurrentMutation.mutateAsync({ tenantId: activeTenantId, yearId });
    } finally {
      setProcessingId(null);
    }
  };

  const handleCloseYear = async (yearId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to close ${name}? This action might make data read-only.`)) {
      return;
    }
    setProcessingId(yearId);
    try {
      await closeMutation.mutateAsync({ tenantId: activeTenantId, yearId });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
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
            <Button onClick={() => setIsFormOpen(true)} className="w-full sm:w-auto shrink-0">
              <Plus className="w-4 h-4 mr-2" />
              Create Year
            </Button>
          )}
        </div>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            Loading academic years...
          </div>
        ) : years.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No academic years found. Create one to get started.
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
                      {new Date(year.start_date).toLocaleDateString()} - {new Date(year.end_date).toLocaleDateString()}
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

      <AcademicYearFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} />
      <PlatformRolloverDialog open={isRolloverOpen} onOpenChange={setIsRolloverOpen} />
    </div>
  );
};
