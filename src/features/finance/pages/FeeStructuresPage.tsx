import React, { useState, useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import { useCurrentAcademicYear } from '@/features/academic-year/hooks/useCurrentAcademicYear';
import {
  useFinanceClassesWithRoster,
  useFeeStructures,
  useStudentDiscounts,
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
import { ClassFeeCard } from '../components/ClassFeeCard';
import { FeeStructureDialog } from '../components/FeeStructureDialog';
import {
  Coins,
  Plus,
  Lock,
  School,
  Bus,
  Percent,
} from 'lucide-react';
import type { FeeStructure, StudentDiscount } from '../types';

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
    data: discounts = [],
    isLoading: isLoadingDiscounts,
  } = useStudentDiscounts(effectiveTenantId);

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

  // Pre-index student discounts by class_id
  const discountsByClassId = useMemo(() => {
    const map = new Map<string, StudentDiscount[]>();
    for (const cls of classesWithDetails) {
      const studentIds = new Set((cls.students || []).map((s) => s.id));
      if (studentIds.size > 0) {
        const classDisc = discounts.filter((d) => studentIds.has(d.student_id));
        map.set(cls.id, classDisc);
      } else {
        map.set(cls.id, []);
      }
    }
    return map;
  }, [classesWithDetails, discounts]);

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

  const studentsWithScholarshipCount = useMemo(() => {
    const activeScholarships = discounts.filter(
      (d) => d.is_active && Number(d.discount_percent || 0) > 0
    );
    const studentIds = new Set(activeScholarships.map((d) => d.student_id));
    return studentIds.size;
  }, [discounts]);

  const transportUsersCount = useMemo(() => {
    const activeTransport = discounts.filter(
      (d) => d.is_active && Boolean(d.is_transport_applicable)
    );
    const studentIds = new Set(activeTransport.map((d) => d.student_id));
    return studentIds.size;
  }, [discounts]);

  const isLoading = isLoadingClasses || isLoadingStructures || isLoadingDiscounts;

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
              title="Students with Scholarship"
              value={studentsWithScholarshipCount}
              icon={Percent}
              description="Active fee concessions"
              variant="amber"
              loading={isLoadingDiscounts}
            />
            <StatCard
              title="Students using Transportation"
              value={transportUsersCount}
              icon={Bus}
              description="Active bus & route users"
              variant="emerald"
              loading={isLoadingDiscounts}
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

          {/* Classes Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-56 rounded-xl border border-border/60 bg-muted/20 animate-pulse p-5 space-y-4"
                >
                  <div className="h-6 w-1/3 bg-muted rounded" />
                  <div className="h-4 w-2/3 bg-muted/60 rounded" />
                  <div className="h-10 bg-muted/40 rounded-lg" />
                </div>
              ))}
            </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClasses.map((cls) => (
                <ClassFeeCard
                  key={cls.id}
                  cls={cls}
                  feeStructures={feeStructuresByClassId.get(cls.id) || []}
                  discounts={discountsByClassId.get(cls.id) || []}
                  onManageFee={(classId) =>
                    navigate({
                      to: '/finance/structures/$classId',
                      params: { classId },
                    })
                  }
                  onAddFeeHead={(classId) => {
                    setSelectedClassIdForAdd(classId);
                    setIsFeeStructureOpen(true);
                  }}
                />
              ))}
            </div>
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
