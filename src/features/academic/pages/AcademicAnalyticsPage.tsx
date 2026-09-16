import React, { useState, useEffect } from 'react';
import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import { useAcademicYears } from '@/features/academic-year/hooks';
import { useTenant } from '@/features/tenants/hooks';
import { useAcademicRetention } from '../hooks';
import { SchoolSearchSelect } from '@/features/academic-year/components/SchoolSearchSelect';
import { CohortFlowSummaryCard } from '../components/analytics/CohortFlowSummaryCard';
import { CohortRetentionBarChart } from '../components/analytics/CohortRetentionBarChart';
import { TenantRequiredState } from '@/components/common/TenantRequiredState';
import { EmptyState } from '@/components/common/EmptyState';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  TrendingUp,
  School,
  CalendarDays,
  RefreshCw,
  Loader2,
  TableProperties,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

export const AcademicAnalyticsPage: React.FC = () => {
  const { activeTenantId } = useAuth();
  const { isSuperAdmin } = usePermission();

  // Tenant scope management
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const effectiveTenantId = selectedTenantId || activeTenantId || '';
  const { data: effectiveTenant } = useTenant(effectiveTenantId || null);

  // Academic years for selected tenant
  const {
    data: years = [],
    isLoading: isYearsLoading,
    refetch: refetchYears,
  } = useAcademicYears(effectiveTenantId || null);

  const [selectedYearId, setSelectedYearId] = useState<string>('');

  // Default to current academic year or first year when years load
  useEffect(() => {
    if (years.length > 0) {
      const exists = years.find((y) => y.id === selectedYearId);
      if (!exists) {
        const currentYear = years.find((y) => y.is_current);
        setSelectedYearId(currentYear ? currentYear.id : years[0].id);
      }
    } else {
      setSelectedYearId('');
    }
  }, [years, selectedYearId]);

  // Retention analytics query
  const {
    data: retentionData,
    isLoading: isRetentionLoading,
    isRefetching,
    error: retentionError,
    refetch: refetchRetention,
  } = useAcademicRetention(effectiveTenantId || null, selectedYearId || null);

  // Require tenant for non-superadmins
  if (!activeTenantId && !isSuperAdmin) {
    return <TenantRequiredState featureName="academic retention analytics" />;
  }

  const handleRefresh = async () => {
    await Promise.all([refetchYears(), refetchRetention()]);
  };

  const selectedYear = years.find((y) => y.id === selectedYearId);
  const isLoading = isYearsLoading || (!!selectedYearId && isRetentionLoading);

  // Helper for progress bar color
  const getRateColor = (rate: number) => {
    if (rate >= 80) return 'bg-emerald-500';
    if (rate >= 60) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const getRateBadge = (rate: number) => {
    if (rate >= 80) {
      return (
        <Badge variant="outline" className="text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40 border-emerald-300">
          {rate.toFixed(1)}%
        </Badge>
      );
    }
    if (rate >= 60) {
      return (
        <Badge variant="outline" className="text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/40 border-amber-300">
          {rate.toFixed(1)}%
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/40 border-rose-300">
        {rate.toFixed(1)}%
      </Badge>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            Academic Analytics & Intelligence
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Data-driven insights on student retention, cohort progression, and academic session health.
          </p>
        </div>

        {/* Global Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Academic Year Dropdown */}
          {effectiveTenantId && years.length > 0 && (
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0 hidden sm:inline-block" />
              <Select value={selectedYearId} onValueChange={setSelectedYearId}>
                <SelectTrigger className="w-[180px] sm:w-[210px] h-9 text-xs">
                  <SelectValue placeholder="Select Academic Year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y.id} value={y.id} className="text-xs">
                      {y.name} {y.is_current ? '(Current)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading || isRefetching || !effectiveTenantId}
            className="h-9 gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Super Admin School Scope Selector */}
      {isSuperAdmin && (
        <Card className="p-4 bg-muted/40 border-dashed flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <School className="w-4 h-4 text-primary shrink-0" />
            <span className="font-semibold">School Scope:</span>
            <span className="text-muted-foreground text-xs">
              {effectiveTenant ? effectiveTenant.name : 'Select a school to inspect its cohort metrics'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <SchoolSearchSelect
              selectedTenantId={selectedTenantId}
              onSelectTenant={(id) => {
                setSelectedTenantId(id);
                setSelectedYearId('');
              }}
            />
          </div>
        </Card>
      )}

      {/* Main Content Area */}
      {!effectiveTenantId ? (
        <Card className="p-12 text-center">
          <School className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <h3 className="font-semibold text-lg text-foreground">Select a School</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
            Please choose a school from the selector above to analyze cohort retention, graduation rates, and progression metrics.
          </p>
        </Card>
      ) : isYearsLoading ? (
        <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
          <p className="text-sm">Loading academic sessions...</p>
        </div>
      ) : years.length === 0 ? (
        <EmptyState
          title="No Academic Years Found"
          description={`No academic sessions have been configured for ${effectiveTenant?.name || 'this school'}. Add an academic session to unlock retention analytics.`}
        />
      ) : !selectedYearId ? (
        <EmptyState
          title="Select an Academic Year"
          description="Please choose an academic year from the dropdown above to view cohort flow and progression metrics."
        />
      ) : isRetentionLoading ? (
        /* Skeleton / Loading State */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="p-5 animate-pulse">
                <div className="h-4 bg-muted rounded w-1/2 mb-3" />
                <div className="h-8 bg-muted rounded w-3/4" />
              </Card>
            ))}
          </div>
          <Card className="p-6 animate-pulse">
            <div className="h-5 bg-muted rounded w-1/4 mb-4" />
            <div className="h-[280px] bg-muted/60 rounded" />
          </Card>
          <Card className="p-6 animate-pulse">
            <div className="h-5 bg-muted rounded w-1/4 mb-4" />
            <div className="h-40 bg-muted/60 rounded" />
          </Card>
        </div>
      ) : retentionError ? (
        <Card className="p-8 border-destructive/30 bg-destructive/5 text-center">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-2" />
          <h3 className="font-semibold text-foreground">Failed to Load Retention Analytics</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            {(retentionError as any)?.message || 'An error occurred while computing cohort metrics. Please try again.'}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetchRetention()} className="mt-4">
            Retry
          </Button>
        </Card>
      ) : !retentionData ? (
        <EmptyState
          title="No Analytics Data"
          description="Retention metrics are not yet available for this academic year."
        />
      ) : (
        /* Render Data */
        <div className="space-y-6">
          {/* Cohort Flow Summary Cards */}
          <CohortFlowSummaryCard data={retentionData} />

          {/* Retention Bar Chart */}
          <CohortRetentionBarChart metrics={retentionData.grade_breakdown} />

          {/* Detailed Grade Breakdown Table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <TableProperties className="w-4 h-4 text-primary" />
                    Grade-by-Grade Progression Breakdown
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Detailed breakdown of enrolled, retained, graduated, and transferred students per class cohort.
                  </CardDescription>
                </div>
                {retentionData.next_academic_year_name && (
                  <Badge variant="secondary" className="text-xs font-normal hidden sm:inline-flex items-center gap-1">
                    <span>{retentionData.academic_year_name}</span>
                    <ArrowRight className="w-3 h-3" />
                    <span>{retentionData.next_academic_year_name}</span>
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {retentionData.grade_breakdown.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No cohort breakdown data found for this year.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Grade / Class</TableHead>
                        <TableHead className="text-center">Enrolled</TableHead>
                        <TableHead className="text-center">Retained</TableHead>
                        <TableHead className="text-center">Graduated</TableHead>
                        <TableHead className="text-center">Transferred / Left</TableHead>
                        <TableHead className="w-[200px] text-right">Retention Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {retentionData.grade_breakdown
                        .sort((a, b) => a.sequence_order - b.sequence_order)
                        .map((metric) => (
                          <TableRow key={metric.class_id}>
                            <TableCell className="font-semibold text-foreground">
                              {metric.class_name}
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {metric.starting_enrolled}
                            </TableCell>
                            <TableCell className="text-center text-emerald-600 dark:text-emerald-400 font-medium">
                              {metric.retained_next_year}
                            </TableCell>
                            <TableCell className="text-center text-sky-600 dark:text-sky-400 font-medium">
                              {metric.graduated}
                            </TableCell>
                            <TableCell className="text-center text-rose-600 dark:text-rose-400 font-medium">
                              {metric.transferred_out}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-3">
                                <div className="w-24 bg-muted rounded-full h-2 overflow-hidden hidden sm:block">
                                  <div
                                    className={`h-full rounded-full ${getRateColor(metric.retention_rate)}`}
                                    style={{
                                      width: `${Math.min(Math.max(metric.retention_rate, 0), 100)}%`,
                                    }}
                                  />
                                </div>
                                {getRateBadge(metric.retention_rate)}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
