import React, { useState, useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import { useCurrentAcademicYear } from '@/features/academic-year/hooks/useCurrentAcademicYear';
import { toast } from 'sonner';
import {
  useFinanceClassOverview,
  useCreateFeeStructure,
  useUpdateFeeStructure,
  useDeleteFeeStructure,
  useFeeStructures,
  useBulkCreateClassFeeStructures,
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
import { SchoolFeeHeadsTable } from '../components/SchoolFeeHeadsTable';
import { StudentLevelFeesTab } from '../components/StudentLevelFeesTab';
import {
  Coins,
  Plus,
  Calendar,
  School,
  Bus,
  ArrowRight,
  Users,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import type { FeeStructure } from '../types';
import type { FeeStructureFormValues } from '../schema';
import { cn } from '@/lib/utils';

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

  // Tab State: 'school' | 'class' | 'student'
  const [activeTab, setActiveTab] = useState<'school' | 'class' | 'student'>('class');

  // Search Filter State for Classes
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog State
  const [isFeeStructureOpen, setIsFeeStructureOpen] = useState(false);
  const [editingFeeStructure, setEditingFeeStructure] = useState<FeeStructure | null>(null);
  const [selectedClassIdForAdd, setSelectedClassIdForAdd] = useState<string>('');

  // Single Aggregated Class Overview Query
  const {
    data: classOverview = [],
    isLoading: isLoadingOverview,
    isError,
    refetch,
  } = useFinanceClassOverview(effectiveTenantId);

  // Query School-Level Fee Structures
  const {
    data: schoolFees = [],
    isLoading: isLoadingSchoolFees,
    refetch: refetchSchoolFees,
  } = useFeeStructures(effectiveTenantId, { fee_level: 'SCHOOL' });

  // Mutations
  const createStructureMutation = useCreateFeeStructure(effectiveTenantId);
  const updateStructureMutation = useUpdateFeeStructure(effectiveTenantId);
  const deleteStructureMutation = useDeleteFeeStructure(effectiveTenantId);
  const bulkCreateMutation = useBulkCreateClassFeeStructures(effectiveTenantId);

  // Filtered Classes based on search query
  const filteredClasses = useMemo(() => {
    if (!searchQuery.trim()) return classOverview;
    const q = searchQuery.toLowerCase();
    return classOverview.filter((c) => {
      return (
        c.class_name.toLowerCase().includes(q) ||
        (c.sections && c.sections.some((s) => s.section_name.toLowerCase().includes(q)))
      );
    });
  }, [classOverview, searchQuery]);

  // KPI Computations
  const totalClasses = classOverview.length;
  const totalClassFeeHeads = useMemo(
    () => classOverview.reduce((sum, c) => sum + (c.fee_heads_count || 0), 0),
    [classOverview]
  );
  const totalStudents = useMemo(
    () => classOverview.reduce((sum, c) => sum + (c.students_count || 0), 0),
    [classOverview]
  );
  const totalTransportUsers = useMemo(
    () => classOverview.reduce((sum, c) => sum + (c.transport_users_count || 0), 0),
    [classOverview]
  );

  const handleSaveFeeStructure = async (values: FeeStructureFormValues) => {
    if (editingFeeStructure) {
      await updateStructureMutation.mutateAsync({
        structureId: editingFeeStructure.id,
        data: {
          fee_level: values.fee_level,
          class_id: values.class_id || null,
          name: values.name,
          fee_category: values.fee_category,
          frequency: values.frequency,
          amount: values.amount,
          description: values.description,
          is_active: values.is_active,
        },
      });
    } else {
      await createStructureMutation.mutateAsync({
        fee_level: values.fee_level,
        class_id: values.class_id || null,
        name: values.name,
        fee_category: values.fee_category,
        frequency: values.frequency,
        amount: values.amount,
        description: values.description,
      });
    }
    refetch();
    refetchSchoolFees();
    setEditingFeeStructure(null);
  };

  const handleReactivateFeeHead = async (fee: FeeStructure) => {
    await updateStructureMutation.mutateAsync({
      structureId: fee.id,
      data: { is_active: true },
    });
    toast.success(`Fee head '${fee.name}' reactivated`);
    refetch();
    refetchSchoolFees();
  };

  const handleDeleteFeeStructure = async (structureId: string) => {
    await deleteStructureMutation.mutateAsync(structureId);
    refetch();
    refetchSchoolFees();
  };

  if (!effectiveTenantId && !isSuperAdmin) {
    return <TenantRequiredState featureName="fee structures" />;
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
                Fee Structures &amp; Schedules
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Configure fee heads at 3 levels: School-Wide, Class-Specific, and Individual Student Facilities.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>Session: {currentYear?.name || 'Active Session'}</span>
              </div>

              <Button
                size="sm"
                onClick={() => {
                  setEditingFeeStructure(null);
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
              title="School-Wide Fee Heads"
              value={schoolFees.length}
              icon={School}
              description="Applies to every student"
              variant="blue"
              loading={isLoadingSchoolFees}
            />
            <StatCard
              title="Class Fee Heads"
              value={totalClassFeeHeads}
              icon={GraduationCap}
              description="Across all class grades"
              variant="default"
              loading={isLoadingOverview}
            />
            <StatCard
              title="Total Enrolled Students"
              value={totalStudents}
              icon={Users}
              description="Across all classes"
              variant="amber"
              loading={isLoadingOverview}
            />
            <StatCard
              title="Transport Facility Users"
              value={totalTransportUsers}
              icon={Bus}
              description="Active route & bus users"
              variant="emerald"
              loading={isLoadingOverview}
            />
          </div>

          {/* 3-Level Tab Switcher */}
          <div
            role="tablist"
            aria-label="Fee level switcher"
            className="flex items-center gap-1.5 p-1.5 bg-muted/60 dark:bg-muted/30 rounded-2xl border border-border/80 max-w-full overflow-x-auto shadow-2xs"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'school'}
              onClick={() => setActiveTab('school')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap select-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                activeTab === 'school'
                  ? 'bg-background text-foreground font-bold shadow-xs border border-border/90 dark:bg-card dark:border-primary/40 dark:shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/60 hover:border-border/40 border border-transparent'
              )}
            >
              <School className={cn('w-3.5 h-3.5 transition-colors', activeTab === 'school' ? 'text-blue-500' : 'text-muted-foreground')} />
              <span>1. School Level Fees</span>
              <Badge
                variant={activeTab === 'school' ? 'default' : 'outline'}
                className={cn(
                  'text-[10px] px-1.5 py-0 font-bold ml-0.5 transition-colors',
                  activeTab === 'school'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/60 text-muted-foreground border-border/60'
                )}
              >
                {schoolFees.length}
              </Badge>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'class'}
              onClick={() => setActiveTab('class')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap select-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                activeTab === 'class'
                  ? 'bg-background text-foreground font-bold shadow-xs border border-border/90 dark:bg-card dark:border-primary/40 dark:shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/60 hover:border-border/40 border border-transparent'
              )}
            >
              <GraduationCap className={cn('w-3.5 h-3.5 transition-colors', activeTab === 'class' ? 'text-primary' : 'text-muted-foreground')} />
              <span>2. Class Level Fees</span>
              <Badge
                variant={activeTab === 'class' ? 'default' : 'outline'}
                className={cn(
                  'text-[10px] px-1.5 py-0 font-bold ml-0.5 transition-colors',
                  activeTab === 'class'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/60 text-muted-foreground border-border/60'
                )}
              >
                {totalClasses} Classes
              </Badge>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'student'}
              onClick={() => setActiveTab('student')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap select-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                activeTab === 'student'
                  ? 'bg-background text-foreground font-bold shadow-xs border border-border/90 dark:bg-card dark:border-primary/40 dark:shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/60 hover:border-border/40 border border-transparent'
              )}
            >
              <Sparkles className={cn('w-3.5 h-3.5 transition-colors', activeTab === 'student' ? 'text-purple-500' : 'text-muted-foreground')} />
              <span>3. Student Level Fees</span>
              <Badge
                variant={activeTab === 'student' ? 'default' : 'outline'}
                className={cn(
                  'text-[10px] px-1.5 py-0 font-bold ml-0.5 transition-colors',
                  activeTab === 'student'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/60 text-muted-foreground border-border/60'
                )}
              >
                {totalStudents} Students
              </Badge>
            </button>
          </div>

          {/* Tab 1 Content: School Level Fees */}
          {activeTab === 'school' && (
            <SchoolFeeHeadsTable
              feeStructures={schoolFees}
              onAddFeeHead={() => {
                setEditingFeeStructure(null);
                setSelectedClassIdForAdd('');
                setIsFeeStructureOpen(true);
              }}
              onEditFeeHead={(fee) => {
                setEditingFeeStructure(fee);
                setIsFeeStructureOpen(true);
              }}
              onDeleteFeeHead={handleDeleteFeeStructure}
              onReactivateFeeHead={handleReactivateFeeHead}
              isDeleting={deleteStructureMutation.isPending}
            />
          )}

          {/* Tab 2 Content: Class Level Fees */}
          {activeTab === 'class' && (
            <div className="space-y-4">
              {/* Search Filter Bar */}
              <FilterToolbar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search classes by name or section..."
                showingCount={filteredClasses.length}
                totalCount={totalClasses}
                unitLabel={totalClasses === 1 ? 'class' : 'classes'}
              />

              {/* Error Alert */}
              {isError && (
                <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center justify-between">
                  <span>Failed to load class fee structures from server.</span>
                  <Button variant="outline" size="sm" onClick={() => refetch()} className="h-7 text-xs">
                    Retry
                  </Button>
                </div>
              )}

              {/* Classes Table */}
              {isLoadingOverview ? (
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
                        Go to Classes &amp; Sections
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
                          const monthlyTuition = Number(cls.monthly_tuition_total) || 0;
                          const sections = cls.sections || [];

                          return (
                            <TableRow
                              key={cls.class_id}
                              onClick={() =>
                                navigate({
                                  to: '/finance/structures/$classId',
                                  params: { classId: cls.class_id },
                                })
                              }
                              className="hover:bg-muted/40 cursor-pointer transition-colors group"
                            >
                              <TableCell className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                                    {cls.class_name}
                                  </span>
                                  {cls.sequence_order !== undefined && (
                                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-normal">
                                      Grade {cls.sequence_order}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>

                              <TableCell className="py-3 px-4 text-muted-foreground">
                                {sections.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {sections.map((sec) => (
                                      <span
                                        key={sec.section_id}
                                        className="inline-block px-1.5 py-0.5 rounded bg-muted text-[11px] font-medium text-foreground"
                                      >
                                        {sec.section_name} ({sec.students_count})
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground/60 italic">—</span>
                                )}
                              </TableCell>

                              <TableCell className="py-3 px-4 text-center font-medium text-foreground">
                                {cls.students_count}
                              </TableCell>

                              <TableCell className="py-3 px-4 text-center">
                                <Badge
                                  variant={cls.fee_heads_count > 0 ? 'outline' : 'secondary'}
                                  className="text-[10px] font-medium"
                                >
                                  {cls.fee_heads_count} {cls.fee_heads_count === 1 ? 'Head' : 'Heads'}
                                </Badge>
                              </TableCell>

                              <TableCell className="py-3 px-4 text-right font-mono font-bold text-foreground">
                                NPR {monthlyTuition.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </TableCell>

                              <TableCell className="py-3 px-4 text-center">
                                {cls.transport_users_count > 0 ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                    <Bus className="w-3 h-3" />
                                    {cls.transport_users_count} {cls.transport_users_count === 1 ? 'user' : 'users'}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/60">—</span>
                                )}
                              </TableCell>

                              <TableCell className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedClassIdForAdd(cls.class_id);
                                      setEditingFeeStructure(null);
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
                                        params: { classId: cls.class_id },
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
            </div>
          )}

          {/* Tab 3 Content: Student Level Fees */}
          {activeTab === 'student' && (
            <StudentLevelFeesTab tenantId={effectiveTenantId} />
          )}

          {/* Fee Structure Dialog */}
          <FeeStructureDialog
            isOpen={isFeeStructureOpen}
            onClose={() => {
              setIsFeeStructureOpen(false);
              setEditingFeeStructure(null);
              setSelectedClassIdForAdd('');
            }}
            defaultFeeLevel={activeTab === 'school' ? 'SCHOOL' : activeTab === 'student' ? 'STUDENT' : 'CLASS'}
            defaultClassId={selectedClassIdForAdd || undefined}
            initialData={editingFeeStructure}
            onSubmit={handleSaveFeeStructure}
            onBulkSubmit={async (bulkData) => {
              await bulkCreateMutation.mutateAsync(bulkData);
            }}
            isLoading={
              createStructureMutation.isPending ||
              updateStructureMutation.isPending ||
              bulkCreateMutation.isPending
            }
            tenantId={effectiveTenantId}
          />
        </>
      )}
    </div>
  );
};
