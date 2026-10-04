import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import { useClasses } from '@/features/academic/hooks';
import { useCurrentAcademicYear } from '@/features/academic-year/hooks/useCurrentAcademicYear';
import { toast } from 'sonner';
import {
  useFinanceClassRoster,
  useFeeStructures,
  useStudentTransports,
  useCreateFeeStructure,
  useUpdateFeeStructure,
  useDeleteFeeStructure,
  useSetStudentTransport,
  useBulkCreateClassFeeStructures,
} from '../hooks';
import { ClassProgressionNavigator } from '@/features/academic/components/ClassProgressionNavigator';
import { StudentFeeProfileRow } from '../components/StudentFeeProfileRow';
import { ClassFeeHeadsTable } from '../components/ClassFeeHeadsTable';
import { FeeStructureDialog } from '../components/FeeStructureDialog';
import { TenantRequiredState } from '@/components/common/TenantRequiredState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  Coins,
  Users,
  Bus,
  Percent,
  Plus,
  Lock,
  ArrowLeft,
  Search,
  X,
  Loader2,
  Sparkles,
  Receipt,
  Layers,
  GraduationCap,
} from 'lucide-react';
import type { FeeStructure, StudentTransportProfile } from '../types';
import type { FeeStructureFormValues } from '../schema';

export const ClassFeeStructurePage: React.FC = () => {
  const { classId } = useParams({ strict: false }) as { classId: string };
  const navigate = useNavigate();
  const { activeTenantId: tenantId } = useAuth();
  const { isSuperAdmin, can } = usePermission();

  // Dialog State
  const [isFeeDialogOpen, setIsFeeDialogOpen] = useState(false);
  const [editingFeeHead, setEditingFeeHead] = useState<FeeStructure | null>(null);

  // UI Tabs & Filters
  const [activeTab, setActiveTab] = useState<'students' | 'structures'>('students');
  const [selectedSectionId, setSelectedSectionId] = useState<string>(''); // '' = All Sections
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [rosterFilter, setRosterFilter] = useState<'ALL' | 'TRANSPORT' | 'STANDARD'>('ALL');
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null);

  // Queries
  const { currentYear } = useCurrentAcademicYear(tenantId);

  const {
    data: cls,
    isLoading: isClassLoading,
    isError: isClassError,
    error: classError,
    refetch: refetchClass,
  } = useFinanceClassRoster(tenantId, classId, currentYear?.id);

  const { data: allClasses = [] } = useClasses(tenantId);

  const {
    data: feeStructures = [],
    isLoading: isFeesLoading,
  } = useFeeStructures(tenantId, { class_id: classId });

  const {
    data: schoolFeeStructures = [],
  } = useFeeStructures(tenantId, { fee_level: 'SCHOOL' });

  const {
    data: studentTransports = [],
    isLoading: isTransportsLoading,
  } = useStudentTransports(tenantId);

  // Mutations
  const createFeeMutation = useCreateFeeStructure(tenantId);
  const updateFeeMutation = useUpdateFeeStructure(tenantId);
  const deleteFeeMutation = useDeleteFeeStructure(tenantId);
  const setTransportMutation = useSetStudentTransport(tenantId);
  const bulkCreateFeeMutation = useBulkCreateClassFeeStructures(tenantId);

  const handleBack = () => {
    navigate({ to: '/finance/structures' });
  };

  const handleNavigateToClass = (targetClassId: string) => {
    if (targetClassId === classId) return;
    navigate({
      to: '/finance/structures/$classId',
      params: { classId: targetClassId },
    });
  };

  // Pre-index student transport profiles by student_id
  const transportsByStudentId = useMemo(() => {
    const map = new Map<string, StudentTransportProfile>();
    for (const d of studentTransports) {
      if (d.student_id && d.is_active) {
        map.set(d.student_id, d);
      }
    }
    return map;
  }, [studentTransports]);

  // Filter fee structures active for this class
  const classFees = useMemo(() => {
    return feeStructures.filter((f) => f.class_id === classId || !f.class_id);
  }, [feeStructures, classId]);

  const activeClassFees = useMemo(() => {
    return classFees.filter((f) => f.is_active);
  }, [classFees]);

  // Compute School-level monthly total applicable to all students
  const schoolMonthlyTotal = useMemo(() => {
    return schoolFeeStructures
      .filter((f) => f.is_active && f.frequency === 'MONTHLY')
      .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  }, [schoolFeeStructures]);

  // Compute Base Monthly Tuition for this class
  const baseTuition = useMemo(() => {
    const tuitionOnly = activeClassFees
      .filter((f) => f.fee_category === 'TUITION' && f.frequency === 'MONTHLY')
      .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
    if (tuitionOnly > 0) return tuitionOnly;

    // Fallback: sum of all monthly non-transport fees
    return activeClassFees
      .filter((f) => f.frequency === 'MONTHLY' && f.fee_category !== 'TRANSPORT')
      .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  }, [activeClassFees]);

  // Compute Transport Monthly Rate for this class
  const transportFee = useMemo(() => {
    const monthlyTrans = activeClassFees
      .filter((f) => f.fee_category === 'TRANSPORT' && f.frequency === 'MONTHLY')
      .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
    if (monthlyTrans > 0) return monthlyTrans;

    // Fallback: any transport fee head
    return activeClassFees
      .filter((f) => f.fee_category === 'TRANSPORT')
      .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  }, [activeClassFees]);

  // Sections & Student Counts
  const sections = cls?.sections || [];
  const allStudents = cls?.students || [];

  // Filter students by selected section
  const sectionStudents = useMemo(() => {
    if (!selectedSectionId) return allStudents;
    return allStudents.filter((s) => s.section_id === selectedSectionId);
  }, [allStudents, selectedSectionId]);

  // Apply search and quick filters to students
  const filteredStudents = useMemo(() => {
    return sectionStudents.filter((student) => {
      // 1. Search Query
      if (studentSearchQuery.trim()) {
        const query = studentSearchQuery.toLowerCase().trim();
        const fullName = [student.first_name, student.middle_name, student.last_name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!fullName.includes(query)) return false;
      }

      // 2. Roster Filter
      const transportProfile = transportsByStudentId.get(student.id);
      const isTransport = Boolean(transportProfile?.is_transport_applicable);

      if (rosterFilter === 'TRANSPORT') return isTransport;
      if (rosterFilter === 'STANDARD') return !isTransport;
      return true; // 'ALL'
    });
  }, [sectionStudents, studentSearchQuery, rosterFilter, transportsByStudentId]);

  // Quick Metrics for this class
  const classTransports = useMemo(() => {
    const studentIds = new Set(allStudents.map((s) => s.id));
    return studentTransports.filter((d) => d.is_active && studentIds.has(d.student_id));
  }, [allStudents, studentTransports]);

  const transportUsersCount = useMemo(() => {
    return classTransports.filter((d) => Boolean(d.is_transport_applicable)).length;
  }, [classTransports]);

  // Save student transport status
  const handleSaveStudentFeeProfile = async (
    studentId: string,
    isTransport: boolean,
    transportFee?: number | null,
    reason?: string
  ) => {
    setSavingStudentId(studentId);
    try {
      await setTransportMutation.mutateAsync({
        student_id: studentId,
        is_transport_applicable: isTransport,
        transport_fee: transportFee,
        reason,
      });
    } finally {
      setSavingStudentId(null);
    }
  };

  // Fee Head Dialog Save Handler
  const handleSaveFeeHead = async (values: FeeStructureFormValues) => {
    if (editingFeeHead) {
      await updateFeeMutation.mutateAsync({
        structureId: editingFeeHead.id,
        data: {
          name: values.name,
          fee_category: values.fee_category,
          frequency: values.frequency,
          amount: values.amount,
          description: values.description,
          fee_level: values.fee_level,
          class_id: values.fee_level === 'SCHOOL' ? null : (values.class_id || classId),
          is_active: values.is_active,
        },
      });
    } else {
      await createFeeMutation.mutateAsync({
        class_id: values.fee_level === 'SCHOOL' ? null : (values.class_id || classId),
        fee_level: values.fee_level,
        name: values.name,
        fee_category: values.fee_category,
        frequency: values.frequency,
        amount: values.amount,
        description: values.description,
      });
    }
    setIsFeeDialogOpen(false);
    setEditingFeeHead(null);
  };

  const handleReactivateFeeHead = async (fee: FeeStructure) => {
    await updateFeeMutation.mutateAsync({
      structureId: fee.id,
      data: { is_active: true },
    });
    toast.success(`Fee head '${fee.name}' reactivated`);
  };

  const handleDeleteFeeHead = async (feeId: string) => {
    await deleteFeeMutation.mutateAsync(feeId);
  };

  // 1. Tenant guard
  if (!tenantId) {
    return <TenantRequiredState featureName="class fee structures and profiles" />;
  }

  // 2. Loading state guard
  if (isClassLoading || isFeesLoading || isTransportsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading class fee details...</p>
      </div>
    );
  }

  // 3. Error state guard
  if (isClassError) {
    return (
      <ErrorState
        title="Failed to Load Class Details"
        error={classError}
        onRetry={() => refetchClass()}
      />
    );
  }

  // 4. Null guard (404)
  if (!cls) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <Coins className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="space-y-1 max-w-md">
          <h2 className="text-xl font-bold text-foreground">Class Not Found</h2>
          <p className="text-sm text-muted-foreground">
            The class you're looking for doesn't exist or has been removed.
          </p>
        </div>
        <Button onClick={handleBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Fee Structures
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1.5 cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
            Back to Fee Structures
          </Button>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1.5 rounded-md bg-primary/10 text-primary">
              <Coins className="w-4 h-4" />
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              {cls.name} Fee Management
            </h1>
            <Badge
              variant="outline"
              className="gap-1.5 text-xs font-semibold bg-muted/60 text-muted-foreground border-border/80"
            >
              <Lock className="w-3 h-3 text-muted-foreground" />
              <span>Session: {currentYear?.name || 'Active Session'} (Locked)</span>
            </Badge>
          </div>

          {/* 1-click hop to next/prev class */}
          <ClassProgressionNavigator
            classes={allClasses}
            currentClassId={classId}
            onSelectClass={handleNavigateToClass}
          />
        </div>

        {/* Quick Action Button */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              setEditingFeeHead(null);
              setIsFeeDialogOpen(true);
            }}
            className="gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Fee Head</span>
          </Button>
        </div>
      </div>

      {/* Quick Metrics Bar */}
      <div className="flex flex-wrap gap-2.5">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary/10 text-primary border border-primary/20 shadow-2xs">
          <Users className="w-3.5 h-3.5" />
          <span>{allStudents.length} Total Students</span>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 shadow-2xs">
          <Layers className="w-3.5 h-3.5" />
          <span>{sections.length} {sections.length === 1 ? 'Section' : 'Sections'}</span>
        </div>
        {schoolMonthlyTotal > 0 && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 shadow-2xs">
            <Receipt className="w-3.5 h-3.5" />
            <span>School-wide Base: NPR {schoolMonthlyTotal.toLocaleString()}</span>
          </div>
        )}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 shadow-2xs">
          <Coins className="w-3.5 h-3.5" />
          <span>Class Tuition: NPR {baseTuition.toLocaleString()}</span>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 shadow-2xs">
          <Bus className="w-3.5 h-3.5" />
          <span>{transportUsersCount} Transport Users</span>
        </div>
      </div>

      {/* Main Tabs Switcher */}
      <div
        role="tablist"
        aria-label="Class fee tabs"
        className="p-1 rounded-xl bg-muted/40 border border-border/60 inline-flex flex-wrap gap-1 max-w-full overflow-x-auto"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'students'}
          onClick={() => setActiveTab('students')}
          className={cn(
            'px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
            activeTab === 'students'
              ? 'bg-card text-foreground shadow-xs font-bold'
              : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
          )}
        >
          <Users className="w-3.5 h-3.5 text-primary" />
          <span>Student Fee Profiles & Transport</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-bold ml-1">
            {allStudents.length}
          </Badge>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'structures'}
          onClick={() => setActiveTab('structures')}
          className={cn(
            'px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
            activeTab === 'structures'
              ? 'bg-card text-foreground shadow-xs font-bold'
              : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
          )}
        >
          <Coins className="w-3.5 h-3.5 text-amber-500" />
          <span>Fee Structure & Rates</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-bold ml-1">
            {classFees.length}
          </Badge>
        </button>
      </div>

      {/* Tab 1 Content: Student Fee Profiles & Concessions */}
      {activeTab === 'students' && (
        <div className="p-6 space-y-5 bg-card rounded-xl border border-border/60 shadow-2xs">
          {/* Section Selector Pills (matching ClassDetailPage) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground mr-1">Section:</span>
              <button
                type="button"
                onClick={() => setSelectedSectionId('')}
                className={`px-3 py-1 text-xs rounded-lg font-semibold transition-all cursor-pointer ${
                  selectedSectionId === ''
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                All Sections ({allStudents.length})
              </button>

              {sections.map((sec) => {
                const isSelected = selectedSectionId === sec.id;
                const count = allStudents.filter((st) => st.section_id === sec.id).length;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setSelectedSectionId(sec.id)}
                    className={`px-3 py-1 text-xs rounded-lg font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    Section {sec.name} ({count})
                  </button>
                );
              })}
            </div>

            {/* Quick Status Filters */}
            <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg border border-border/50 text-xs">
              <button
                type="button"
                onClick={() => setRosterFilter('ALL')}
                className={`px-2.5 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                  rosterFilter === 'ALL'
                    ? 'bg-card text-foreground shadow-2xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setRosterFilter('TRANSPORT')}
                className={`px-2.5 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                  rosterFilter === 'TRANSPORT'
                    ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Transport Users ({transportUsersCount})
              </button>
              <button
                type="button"
                onClick={() => setRosterFilter('STANDARD')}
                className={`px-2.5 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                  rosterFilter === 'STANDARD'
                    ? 'bg-card text-foreground shadow-2xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Standard
              </button>
            </div>
          </div>

          {/* Student Search & Roster Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search students in this class..."
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
                className="pl-8 text-xs h-9"
              />
              {studentSearchQuery && (
                <button
                  type="button"
                  onClick={() => setStudentSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="text-xs text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filteredStudents.length}</span> of {sectionStudents.length} students
            </div>
          </div>

          {/* Student Roster Table */}
          {filteredStudents.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No Students Found"
              description={
                studentSearchQuery
                  ? `No students matching "${studentSearchQuery}". Try clearing your search.`
                  : 'No students found matching the selected section and filter criteria.'
              }
            />
          ) : (
            <div className="rounded-xl border border-border/70 overflow-hidden bg-card shadow-2xs">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-semibold text-xs min-w-[200px]">Student Details</TableHead>
                    <TableHead className="font-semibold text-xs min-w-[180px]">Transportation</TableHead>
                    <TableHead className="font-semibold text-xs min-w-[160px]">Est. Net Monthly Fee</TableHead>
                    <TableHead className="font-semibold text-xs text-right min-w-[100px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student, idx) => {
                    const transportProfile = transportsByStudentId.get(student.id);
                    const sec = sections.find((s) => s.id === student.section_id);

                    return (
                      <StudentFeeProfileRow
                        key={student.id}
                        student={student}
                        transportProfile={transportProfile}
                        baseTuition={baseTuition}
                        transportFee={transportFee}
                        onSave={handleSaveStudentFeeProfile}
                        isSaving={savingStudentId === student.id}
                        sectionName={sec?.name}
                        rollNumber={idx + 1}
                      />
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2 Content: Fee Structure & Rates */}
      {activeTab === 'structures' && (
        <div className="p-6 space-y-6 bg-card rounded-xl border border-border/60 shadow-2xs">
          <ClassFeeHeadsTable
            feeStructures={classFees}
            onAddFeeHead={() => {
              setEditingFeeHead(null);
              setIsFeeDialogOpen(true);
            }}
            onEditFeeHead={(fee) => {
              setEditingFeeHead(fee);
              setIsFeeDialogOpen(true);
            }}
            onDeleteFeeHead={handleDeleteFeeHead}
            onReactivateFeeHead={handleReactivateFeeHead}
            isDeleting={deleteFeeMutation.isPending}
          />
        </div>
      )}

      {/* Add / Edit Fee Head Dialog */}
      <FeeStructureDialog
        isOpen={isFeeDialogOpen}
        onClose={() => {
          setIsFeeDialogOpen(false);
          setEditingFeeHead(null);
        }}
        onSubmit={handleSaveFeeHead}
        onBulkSubmit={async (bulkData) => {
          await bulkCreateFeeMutation.mutateAsync(bulkData);
        }}
        isLoading={
          createFeeMutation.isPending ||
          updateFeeMutation.isPending ||
          bulkCreateFeeMutation.isPending
        }
        tenantId={tenantId}
        initialData={editingFeeHead}
        defaultClassId={classId}
      />
    </div>
  );
};
