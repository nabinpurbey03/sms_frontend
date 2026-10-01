import React, { useState, useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import { useCurrentAcademicYear } from '@/features/academic-year/hooks/useCurrentAcademicYear';
import {
  useFinanceClassesWithRoster,
  useFeeStructures,
  useStudentTransports,
  useCreateFeeStructure,
} from '../hooks';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FilterToolbar } from '@/components/common/FilterToolbar';
import { EmptyState } from '@/components/common/EmptyState';
import { TenantRequiredState } from '@/components/common/TenantRequiredState';
import { SchoolSearchSelect } from '@/features/academic-year/components/SchoolSearchSelect';
import { useTenant } from '@/features/tenants/hooks';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FeeStructureDialog } from '../components/FeeStructureDialog';
import {
  Coins,
  Plus,
  Lock,
  School,
  Bus,
  Percent,
  ArrowRight,
  Users,
} from 'lucide-react';
import type { FeeStructure, StudentTransportProfile } from '../types';

export const FeeStructuresPage: React.FC = () => {
  const { activeTenantId } = useAuth();
  const { isSuperAdmin } = usePermission();
  const navigate = useNavigate();

  const [pageTenantId, setPageTenantId] = useState<string | null>(activeTenantId);

  React.useEffect(() => {
    setPageTenantId(activeTenantId);
  }, [activeTenantId]);

  const effectiveTenantId = pageTenantId || activeTenantId;
  const { data: effectiveTenant } = useTenant(effectiveTenantId);
  const { currentYear } = useCurrentAcademicYear(effectiveTenantId);

  // Search Filter State
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog State
  const [isFeeStructureOpen, setIsFeeStructureOpen] = useState(false);
  const [selectedClassIdForAdd, setSelectedClassIdForAdd] = useState<string>('');

  // Queries
  const {
    data: classesWithDetails = [],
    isLoading: isLoadingClasses,
    isError: isClassesError,
    refetch: refetchClasses,
  } = useFinanceClassesWithRoster(effectiveTenantId, currentYear?.id);

  const {
    data: feeStructures = [],
    isLoading: isLoadingStructures,
  } = useFeeStructures(effectiveTenantId);

  const {
    data: transports = [],
    isLoading: isLoadingTransports,
  } = useStudentTransports(effectiveTenantId);

  // Mutations
  const createStructureMutation = useCreateFeeStructure(effectiveTenantId);

  // Sort classes by sequence_order ascending
  const sortedClasses = useMemo(() => {
    return [...classesWithDetails].sort((a, b) => {
      const seqA = a.sequence_order ?? 0;
      const seqB = b.sequence_order ?? 0;
      if (seqA !== seqB) return seqA - seqB;
      return a.name.localeCompare(b.name);
    });
  }, [classesWithDetails]);

  // Pre-index fee structures by class_id
  const feeStructuresByClassId = useMemo(() => {
    const map = new Map<string, FeeStructure[]>();
    for (const f of feeStructures) {
      if (f.class_id) {
        const list = map.get(f.class_id) || [];
        list.push(f);
        map.set(f.class_id, list);
      }
    }
    return map;
  }, [feeStructures]);

  // Pre-index student transport profiles by class_id
  const transportsByClassId = useMemo(() => {
    const map = new Map<string, StudentTransportProfile[]>();
    for (const cls of classesWithDetails) {
      const studentIds = new Set((cls.students || []).map((s) => s.id));
      if (studentIds.size > 0) {
        const classTrans = transports.filter((d) => studentIds.has(d.student_id));
        map.set(cls.id, classTrans);
      } else {
        map.set(cls.id, []);
      }
    }
    return map;
  }, [classesWithDetails, transports]);

  // Filtered Classes based on search query
  const filteredClasses = useMemo(() => {
    if (!searchQuery.trim()) return sortedClasses;
    const q = searchQuery.toLowerCase();
    return sortedClasses.filter((c) => {
      return (
        c.name.toLowerCase().includes(q) ||
        (c.sections && c.sections.some((s) => s.name.toLowerCase().includes(q)))
      );
    });
  }, [sortedClasses, searchQuery]);

  // KPI Computations
  const activeFeeStructuresCount = useMemo(() => {
    return feeStructures.filter((f) => f.is_active).length;
  }, [feeStructures]);

  const totalStudentsCount = useMemo(() => {
    return sortedClasses.reduce((sum, cls) => sum + ((cls.students || []).length), 0);
  }, [sortedClasses]);

  const transportUsersCount = useMemo(() => {
    const activeTransport = transports.filter(
      (d) => d.is_active && Boolean(d.is_transport_applicable)
    );
    const studentIds = new Set(activeTransport.map((d) => d.student_id));
    return studentIds.size;
  }, [transports]);

  const isLoading = isLoadingClasses || isLoadingStructures || isLoadingTransports;

  if (!effectiveTenantId && !isSuperAdmin) {
    return <TenantRequiredState featureName="class fee structures" />;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Super Admin Tenant Selector */}
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
                    Select a school to view its fee structures
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <SchoolSearchSelect
              selectedTenantId={effectiveTenantId || ''}
              onSelectTenant={(id) => setPageTenantId(id || null)}
              className="w-full sm:w-80"
            />
          </div>
        </Card>
      )}

      {!effectiveTenantId && isSuperAdmin ? (
        <div className="text-center py-12 text-muted-foreground text-xs">
          Please select a school from the dropdown above to view fee structures.
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Coins className="w-6 h-6 text-primary" />
                Class Fee Structures
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Configure class tuition, transport, fee heads, and student-level concessions.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
                <Lock className="w-3.5 h-3.5 text-primary" />
                <span>Session: {currentYear?.name || 'Active Session'} (Locked)</span>
              </div>

              <Button
                size="sm"
                onClick={() => {
                  setSelectedClassIdForAdd('');
                  setIsFeeStructureOpen(true);
                }}
                className="gap-1.5 text-xs shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Fee Head</span>
              </Button>
            </div>
          </div>

          {/* Top KPI Stats Cards Grid (4 columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Classes"
              value={sortedClasses.length}
              icon={School}
              description="Configured academic levels"
              variant="default"
              loading={isLoadingClasses}
            />
            <StatCard
              title="Total Fee Heads Configured"
              value={activeFeeStructuresCount}
              icon={Coins}
              description="Active billing heads"
              variant="blue"
              loading={isLoadingStructures}
            />
            <StatCard
              title="Total Enrolled Students"
              value={totalStudentsCount}
              icon={Users}
              description="Students across all classes"
              variant="amber"
              loading={isLoadingClasses}
            />
            <StatCard
              title="Students using Transportation"
              value={transportUsersCount}
              icon={Bus}
              description="Active bus & route users"
              variant="emerald"
              loading={isLoadingTransports}
            />
          </div>

          {/* Search Filter Bar */}
          <FilterToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search classes by name or section..."
            showingCount={filteredClasses.length}
            totalCount={sortedClasses.length}
            unitLabel={sortedClasses.length === 1 ? 'class' : 'classes'}
          />

          {/* Error Alert */}
          {isClassesError && (
            <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center justify-between">
              <span>Failed to load class fee structures from server.</span>
              <Button variant="outline" size="sm" onClick={() => refetchClasses()} className="h-7 text-xs">
                Retry
              </Button>
            </div>
          )}

          {/* Classes Table (Minimalist Architecture) */}
          {isLoading ? (
            <Card className="border border-border/60 shadow-xs overflow-hidden rounded-xl bg-card p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 rounded-lg bg-muted/30 animate-pulse" />
              ))}
            </Card>
          ) : filteredClasses.length === 0 ? (
            <EmptyState
              icon={Coins}
              title={searchQuery ? 'No Classes Found' : 'No Classes Configured'}
              description={
                searchQuery
                  ? `No classes match your search "${searchQuery}". Try a different keyword.`
                  : 'No academic classes have been set up yet. Configure your classes in the Academic module first.'
              }
              action={
                searchQuery ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchQuery('')}
                    className="text-xs"
                  >
                    Clear Filter
                  </Button>
                ) : (
                  <Button
                    onClick={() => navigate({ to: '/academic/classes' })}
                    className="text-xs gap-1.5"
                  >
                    Go to Classes & Sections
                  </Button>
                )
              }
            />
          ) : (
            <Card className="border border-border/60 shadow-xs overflow-hidden rounded-xl bg-card">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                    <TableRow>
                      <TableHead className="py-3 px-4">Class / Level</TableHead>
                      <TableHead className="py-3 px-4">Sections</TableHead>
                      <TableHead className="py-3 px-4 text-center">Students</TableHead>
                      <TableHead className="py-3 px-4 text-center">Fee Heads</TableHead>
                      <TableHead className="py-3 px-4 text-right">Monthly Base Tuition</TableHead>
                      <TableHead className="py-3 px-4 text-center">Transportation</TableHead>
                      <TableHead className="py-3 px-4 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border/40 text-xs">
                    {filteredClasses.map((cls) => {
                      const activeStructures = (feeStructuresByClassId.get(cls.id) || []).filter((f) => f.is_active);
                      const monthlyTuition = activeStructures
                        .filter((f) => f.frequency === 'MONTHLY')
                        .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
                      const classTransports = (transportsByClassId.get(cls.id) || []).filter((d) => d.is_active);
                      const transportCount = classTransports.filter((d) => Boolean(d.is_transport_applicable)).length;
                      const studentCount = (cls.students || []).length;
                      const sections = cls.sections || [];

                      return (
                        <TableRow
                          key={cls.id}
                          onClick={() =>
                            navigate({
                              to: '/finance/structures/$classId',
                              params: { classId: cls.id },
                            })
                          }
                          className="hover:bg-muted/40 cursor-pointer transition-colors group"
                        >
                          {/* Class / Level */}
                          <TableCell className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                                {cls.name}
                              </span>
                              {cls.sequence_order !== undefined && (
                                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-normal">
                                  Grade {cls.sequence_order}
                                </Badge>
                              )}
                            </div>
                          </TableCell>

                          {/* Sections */}
                          <TableCell className="py-3 px-4 text-muted-foreground">
                            {sections.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {sections.map((sec) => (
                                  <span
                                    key={sec.id}
                                    className="inline-block px-1.5 py-0.5 rounded bg-muted text-[11px] font-medium text-foreground"
                                  >
                                    {sec.name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground/60 italic">—</span>
                            )}
                          </TableCell>

                          {/* Students Count */}
                          <TableCell className="py-3 px-4 text-center font-medium text-foreground">
                            {studentCount}
                          </TableCell>

                          {/* Fee Heads Count */}
                          <TableCell className="py-3 px-4 text-center">
                            <Badge
                              variant={activeStructures.length > 0 ? 'outline' : 'secondary'}
                              className="text-[10px] font-medium"
                            >
                              {activeStructures.length} {activeStructures.length === 1 ? 'Head' : 'Heads'}
                            </Badge>
                          </TableCell>

                          {/* Monthly Base Tuition */}
                          <TableCell className="py-3 px-4 text-right font-mono font-bold text-foreground">
                            NPR {monthlyTuition.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>

                          {/* Transportation */}
                          <TableCell className="py-3 px-4 text-center">
                            {transportCount > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                <Bus className="w-3 h-3" />
                                {transportCount} {transportCount === 1 ? 'user' : 'users'}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/60">—</span>
                            )}
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedClassIdForAdd(cls.id);
                                  setIsFeeStructureOpen(true);
                                }}
                                className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Fee Head</span>
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate({
                                    to: '/finance/structures/$classId',
                                    params: { classId: cls.id },
                                  });
                                }}
                                className="h-7 text-xs px-2.5 gap-1 group-hover:border-primary/50 cursor-pointer"
                              >
                                <span>Manage</span>
                                <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}

          {/* Fee Structure Dialog */}
          <FeeStructureDialog
            isOpen={isFeeStructureOpen}
            onClose={() => {
              setIsFeeStructureOpen(false);
              setSelectedClassIdForAdd('');
            }}
            defaultClassId={selectedClassIdForAdd || undefined}
            onSubmit={async (data) => {
              await createStructureMutation.mutateAsync(data);
            }}
            isLoading={createStructureMutation.isPending}
            tenantId={effectiveTenantId}
          />
        </>
      )}
    </div>
  );
};
