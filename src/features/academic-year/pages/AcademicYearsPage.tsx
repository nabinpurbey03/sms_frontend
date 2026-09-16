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
import {
  CalendarDays,
  Plus,
  CheckCircle2,
  Lock,
  Loader2,
  RefreshCw,
  School,
  Search,
  ChevronDown,
  Check,
  Building2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTenants } from '@/features/tenants/hooks';

export const AcademicYearsPage: React.FC = () => {
  const { activeTenantId, activeTenantName } = useAuth();
  const { can, isSuperAdmin } = usePermission();
  const canManage = can('MANAGE_TENANT_SETTINGS') || isSuperAdmin;

  // For Super Admins, allow selecting a specific tenant with search capability
  const [tenantSearch, setTenantSearch] = useState('');
  const { data: tenantsResponse } = useTenants({ page_size: 500 });
  const tenants = tenantsResponse?.items || [];
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

  const filteredTenants = React.useMemo(() => {
    if (!tenantSearch.trim()) return tenants;
    const query = tenantSearch.toLowerCase();
    return tenants.filter(
      (t: import('@/features/tenants/types').Tenant) =>
        t.name.toLowerCase().includes(query) ||
        t.domain_name.toLowerCase().includes(query)
    );
  }, [tenants, tenantSearch]);

  const effectiveTenantId = selectedTenantId || activeTenantId || '';
  const effectiveTenant = tenants.find((t: import('@/features/tenants/types').Tenant) => t.id === effectiveTenantId);

  const { data: years = [], isLoading } = useAcademicYears(effectiveTenantId || null);
  const setCurrentMutation = useSetCurrentAcademicYear();
  const closeMutation = useCloseAcademicYear();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isRolloverOpen, setIsRolloverOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Non-superadmins require an active tenant to view or manage local academic years
  if (!activeTenantId && !isSuperAdmin) {
    return <TenantRequiredState featureName="academic years management" />;
  }

  const handleSetCurrent = async (yearId: string, name: string) => {
    if (!effectiveTenantId) return;
    if (!window.confirm(`Are you sure you want to set ${name} as the current academic year for the whole school?`)) {
      return;
    }
    setProcessingId(yearId);
    try {
      await setCurrentMutation.mutateAsync({ tenantId: effectiveTenantId, yearId });
    } finally {
      setProcessingId(null);
    }
  };

  const handleCloseYear = async (yearId: string, name: string) => {
    if (!effectiveTenantId) return;
    if (!window.confirm(`Are you sure you want to close ${name}? This action might make data read-only.`)) {
      return;
    }
    setProcessingId(yearId);
    try {
      await closeMutation.mutateAsync({ tenantId: effectiveTenantId, yearId });
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

      {/* Super Admin School Context Selector */}
      {isSuperAdmin && (
        <Card className="p-4 bg-muted/40 border-dashed flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <School className="w-4 h-4 text-primary shrink-0" />
            <span className="font-semibold">School Scope:</span>
            <span className="text-muted-foreground text-xs">
              {effectiveTenant ? effectiveTenant.name : 'Select a school to inspect its sessions'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 text-xs justify-between gap-2 min-w-[220px] max-w-[320px] bg-background font-medium"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="truncate">
                      {effectiveTenant ? effectiveTenant.name : 'Choose School to View'}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 opacity-50 shrink-0 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 sm:w-80 p-2 shadow-xl rounded-xl max-h-[380px] flex flex-col">
                <div className="px-1 pb-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search school by name or domain..."
                      value={tenantSearch}
                      onChange={(e) => setTenantSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted/50 rounded-lg border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary focus:bg-background"
                      autoFocus
                    />
                  </div>
                </div>
                <DropdownMenuSeparator />
                <div className="overflow-y-auto max-h-[260px] space-y-0.5 py-1">
                  {filteredTenants.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      No schools match "{tenantSearch}"
                    </div>
                  ) : (
                    filteredTenants.map((t: import('@/features/tenants/types').Tenant) => {
                      const isSelected = t.id === effectiveTenantId;
                      return (
                        <DropdownMenuItem
                          key={t.id}
                          onClick={() => {
                            setSelectedTenantId(t.id);
                            setTenantSearch('');
                          }}
                          className={`cursor-pointer text-xs rounded-lg px-2.5 py-2 flex items-center justify-between ${
                            isSelected ? 'bg-primary/10 font-bold text-primary' : ''
                          }`}
                        >
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className="truncate">{t.name}</span>
                            <span className="text-[10px] text-muted-foreground font-mono opacity-80 truncate">
                              {t.domain_name}
                            </span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                        </DropdownMenuItem>
                      );
                    })
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Card>
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

      <AcademicYearFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        targetTenantId={effectiveTenantId}
        targetTenantName={effectiveTenant?.name}
      />
      <PlatformRolloverDialog open={isRolloverOpen} onOpenChange={setIsRolloverOpen} />
    </div>
  );
};
