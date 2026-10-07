import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { EmptyState } from '@/components/common/EmptyState';
import {
  Bus,
  Building2,
  Utensils,
  Trophy,
  Plus,
  Users,
  Search,
  X,
  Loader2,
  Coins,
  Sparkles,
  SlidersHorizontal,
  CheckSquare,
  Square,
  ChevronRight,
} from 'lucide-react';
import {
  useStudentTransports,
  useSetStudentTransport,
  useStudentFeeAssignments,
  useFeeStructures,
} from '../hooks';
import { useClasses, useClassStudents } from '@/features/academic/hooks';
import { StudentFacilityBadge } from './StudentFacilityBadge';
import { StudentFacilityDrawer } from './StudentFacilityDrawer';
import { ManageStudentFacilitiesDialog } from './ManageStudentFacilitiesDialog';
import { BulkAssignFacilityDialog } from './BulkAssignFacilityDialog';
import type { AcademicStudent } from '@/features/academic/types';
import type { StudentTransportProfile, StudentFeeAssignment } from '../types';

interface StudentLevelFeesTabProps {
  tenantId: string | null;
}

export const StudentLevelFeesTab: React.FC<StudentLevelFeesTabProps> = ({ tenantId }) => {
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFacility, setFilterFacility] = useState<
    'ALL' | 'TRANSPORT' | 'HOSTEL' | 'CANTEEN' | 'COACHING' | 'CUSTOM'
  >('ALL');

  // Multi-selection state for bulk assignment
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);

  // Student Facility Drawer state
  const [drawerStudent, setDrawerStudent] = useState<AcademicStudent | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Queries
  const { data: classes = [], isLoading: isLoadingClasses } = useClasses(tenantId);

  // Set default class if not set
  React.useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  const { data: students = [], isLoading: isLoadingStudents } = useClassStudents(tenantId, selectedClassId || null);
  const { data: transportProfiles = [], isLoading: isLoadingTransports } = useStudentTransports(tenantId);
  const { data: studentFeeAssignments = [], isLoading: isLoadingAssignments } = useStudentFeeAssignments(tenantId, {
    class_id: selectedClassId || undefined,
  });

  // Fetch school-level and class-level fee structures to compute estimated total monthly fee
  const { data: schoolFees = [] } = useFeeStructures(tenantId, { fee_level: 'SCHOOL', is_active: true });
  const { data: classFees = [] } = useFeeStructures(
    tenantId,
    selectedClassId ? { class_id: selectedClassId, is_active: true } : undefined
  );

  // Mutations
  const setTransportMutation = useSetStudentTransport(tenantId);

  // Pre-index transport profiles by student_id
  const transportMap = useMemo(() => {
    const map = new Map<string, StudentTransportProfile>();
    for (const t of transportProfiles) {
      if (t.student_id && t.is_active) {
        map.set(t.student_id, t);
      }
    }
    return map;
  }, [transportProfiles]);

  // Pre-index student fee assignments by student_id
  const assignmentsMap = useMemo(() => {
    const map = new Map<string, StudentFeeAssignment[]>();
    for (const a of studentFeeAssignments) {
      if (a.student_id && a.is_active) {
        const arr = map.get(a.student_id) || [];
        arr.push(a);
        map.set(a.student_id, arr);
      }
    }
    return map;
  }, [studentFeeAssignments]);

  // Standard monthly amounts from school & class levels
  const schoolMonthlyTotal = useMemo(() => {
    return schoolFees
      .filter((f) => f.frequency === 'MONTHLY')
      .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  }, [schoolFees]);

  const classMonthlyTuition = useMemo(() => {
    return classFees
      .filter((f) => f.frequency === 'MONTHLY' && f.fee_category !== 'TRANSPORT')
      .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  }, [classFees]);

  const classDefaultTransportRate = useMemo(() => {
    const tHead = classFees.find((f) => f.fee_category === 'TRANSPORT');
    return tHead ? Number(tHead.amount) || 0 : 0;
  }, [classFees]);

  // Real-time facility counts across the selected class
  const facilityCounts = useMemo(() => {
    let transport = 0;
    let hostel = 0;
    let canteen = 0;
    let coaching = 0;
    let custom = 0;

    for (const st of students) {
      const trans = transportMap.get(st.id);
      const isTrans = Boolean(trans?.is_transport_applicable);
      const customFees = assignmentsMap.get(st.id) || [];

      if (isTrans) transport++;
      if (customFees.some((c) => c.fee_category === 'HOSTEL')) hostel++;
      if (customFees.some((c) => c.fee_category === 'CANTEEN')) canteen++;
      if (customFees.some((c) => c.fee_category === 'COACHING' || c.fee_category === 'ACTIVITY')) coaching++;
      if (isTrans || customFees.length > 0) custom++;
    }

    return { transport, hostel, canteen, coaching, custom };
  }, [students, transportMap, assignmentsMap]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter((st) => {
      const trans = transportMap.get(st.id);
      const isTrans = Boolean(trans?.is_transport_applicable);
      const customFees = assignmentsMap.get(st.id) || [];

      if (filterFacility === 'TRANSPORT' && !isTrans) return false;
      if (filterFacility === 'HOSTEL' && !customFees.some((c) => c.fee_category === 'HOSTEL')) return false;
      if (filterFacility === 'CANTEEN' && !customFees.some((c) => c.fee_category === 'CANTEEN')) return false;
      if (
        filterFacility === 'COACHING' &&
        !customFees.some((c) => c.fee_category === 'COACHING' || c.fee_category === 'ACTIVITY')
      )
        return false;
      if (filterFacility === 'CUSTOM' && customFees.length === 0 && !isTrans) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const fullName = [st.first_name, st.middle_name, st.last_name].filter(Boolean).join(' ').toLowerCase();
        if (!fullName.includes(q)) return false;
      }

      return true;
    });
  }, [students, transportMap, assignmentsMap, filterFacility, searchQuery]);

  // Bulk Selection Handlers
  const isAllSelected = filteredStudents.length > 0 && selectedStudentIds.length === filteredStudents.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map((s) => s.id));
    }
  };

  const handleToggleSelectStudent = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const handleOpenDrawer = (student: AcademicStudent) => {
    setDrawerStudent(student);
    setIsDrawerOpen(true);
  };

  const handleSaveTransport = async (
    studentId: string,
    isTransport: boolean,
    transportFee?: number | null,
    reason?: string
  ) => {
    await setTransportMutation.mutateAsync({
      student_id: studentId,
      is_transport_applicable: isTransport,
      transport_fee: transportFee,
      reason,
    });
  };

  const isLoading = isLoadingClasses || isLoadingStudents || isLoadingTransports || isLoadingAssignments;

  return (
    <div className="space-y-5">
      {/* Top Banner / Explanation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-card via-card to-primary/5 border border-border/70 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Building2 className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-foreground">
              Student Facilities & Add-ons (Level 3)
            </h3>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium bg-muted/60">
              Opt-ins & Add-ons
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl">
            Manage individual student facility opt-ins such as <strong>Transportation</strong>, <strong>Hostel & Boarding</strong>, <strong>Canteen/Meals</strong>, <strong>Special Coaching</strong>, and custom scholarships. Batch bills will automatically itemize these subscriptions per student.
          </p>
        </div>

        {/* Bulk Action Trigger */}
        {selectedStudentIds.length > 0 && (
          <div className="flex items-center gap-2 shrink-0 animate-in fade-in slide-in-from-right-3 duration-200">
            <Button
              size="sm"
              onClick={() => setIsBulkDialogOpen(true)}
              className="gap-1.5 shadow-xs font-semibold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Bulk Assign Facility ({selectedStudentIds.length})</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedStudentIds([])}
              className="text-xs text-muted-foreground cursor-pointer"
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Class Selector Pills & Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Class Selection Pills */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            Class:
          </span>
          {classes.map((c) => {
            const isSelected = selectedClassId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setSelectedClassId(c.id);
                  setSelectedStudentIds([]);
                }}
                className={`px-3 py-1 text-xs rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {c.name}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full lg:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-8"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Facility Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/60">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filter:
          </span>

          <div role="tablist" aria-label="Facility filter" className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-muted/60 dark:bg-muted/30 border border-border/80 shadow-2xs">
            <button
              type="button"
              role="tab"
              aria-selected={filterFacility === 'ALL'}
              onClick={() => setFilterFacility('ALL')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all duration-150 cursor-pointer select-none border ${
                filterFacility === 'ALL'
                  ? 'bg-primary/10 text-primary font-bold shadow-xs border-primary/30 dark:bg-primary/15 dark:text-primary dark:border-primary/50'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40 hover:border-border/40'
              }`}
            >
              All Students ({students.length})
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={filterFacility === 'TRANSPORT'}
              onClick={() => setFilterFacility('TRANSPORT')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all duration-150 cursor-pointer select-none border ${
                filterFacility === 'TRANSPORT'
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold shadow-xs border-emerald-500/40'
                  : 'border-transparent text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/30'
              }`}
            >
              <Bus className="w-3 h-3" />
              <span>Transport Users ({facilityCounts.transport})</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={filterFacility === 'HOSTEL'}
              onClick={() => setFilterFacility('HOSTEL')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all duration-150 cursor-pointer select-none border ${
                filterFacility === 'HOSTEL'
                  ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-bold shadow-xs border-indigo-500/40'
                  : 'border-transparent text-muted-foreground hover:text-indigo-700 dark:hover:text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-500/30'
              }`}
            >
              <Building2 className="w-3 h-3" />
              <span>Hostel Residents ({facilityCounts.hostel})</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={filterFacility === 'CANTEEN'}
              onClick={() => setFilterFacility('CANTEEN')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all duration-150 cursor-pointer select-none border ${
                filterFacility === 'CANTEEN'
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold shadow-xs border-amber-500/40'
                  : 'border-transparent text-muted-foreground hover:text-amber-700 dark:hover:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/30'
              }`}
            >
              <Utensils className="w-3 h-3" />
              <span>Canteen / Meals ({facilityCounts.canteen})</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={filterFacility === 'COACHING'}
              onClick={() => setFilterFacility('COACHING')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all duration-150 cursor-pointer select-none border ${
                filterFacility === 'COACHING'
                  ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 font-bold shadow-xs border-purple-500/40'
                  : 'border-transparent text-muted-foreground hover:text-purple-700 dark:hover:text-purple-400 hover:bg-purple-500/10 hover:border-purple-500/30'
              }`}
            >
              <Trophy className="w-3 h-3" />
              <span>Activities & Coaching ({facilityCounts.coaching})</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={filterFacility === 'CUSTOM'}
              onClick={() => setFilterFacility('CUSTOM')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all duration-150 cursor-pointer select-none border ${
                filterFacility === 'CUSTOM'
                  ? 'bg-primary/10 text-primary font-bold shadow-xs border-primary/30 dark:bg-primary/15 dark:text-primary dark:border-primary/50'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40 hover:border-border/40'
              }`}
            >
              Any Subscribed Facility ({facilityCounts.custom})
            </button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{filteredStudents.length}</span> students
        </div>
      </div>

      {/* Students Table */}
      {isLoading ? (
        <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span>Loading student fee profiles...</span>
        </div>
      ) : filteredStudents.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Students Found"
          description={
            searchQuery
              ? `No students matching "${searchQuery}" in this class.`
              : 'No students found matching the selected filter.'
          }
        />
      ) : (
        <div className="rounded-xl border border-border/70 overflow-hidden bg-card shadow-2xs">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleToggleSelectAll}
                    aria-label="Select all students"
                  />
                </TableHead>
                <TableHead className="font-semibold text-xs min-w-[180px]">Student</TableHead>
                <TableHead className="font-semibold text-xs min-w-[280px]">Subscribed Facilities & Add-ons</TableHead>
                <TableHead className="font-semibold text-xs text-right min-w-[140px]">Est. Net Monthly</TableHead>
                <TableHead className="font-semibold text-xs text-right min-w-[130px]">Manage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((st, idx) => {
                const fullName = [st.first_name, st.middle_name, st.last_name].filter(Boolean).join(' ');
                const trans = transportMap.get(st.id);
                const isTrans = Boolean(trans?.is_transport_applicable);
                const effectiveTransFee = isTrans
                  ? trans?.transport_fee !== undefined && trans?.transport_fee !== null
                    ? Number(trans.transport_fee)
                    : classDefaultTransportRate
                  : 0;

                const customFees = assignmentsMap.get(st.id) || [];
                const customFeesMonthlyTotal = customFees
                  .filter((c) => c.frequency === 'MONTHLY' && c.fee_category !== 'SCHOLARSHIP')
                  .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

                const concessionsMonthlyTotal = customFees
                  .filter((c) => c.frequency === 'MONTHLY' && c.fee_category === 'SCHOLARSHIP')
                  .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

                const totalEstimatedMonthly = Math.max(
                  0,
                  schoolMonthlyTotal + classMonthlyTuition + effectiveTransFee + customFeesMonthlyTotal - concessionsMonthlyTotal
                );

                const isSelected = selectedStudentIds.includes(st.id);

                return (
                  <TableRow
                    key={st.id}
                    className={`hover:bg-muted/40 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
                  >
                    {/* Checkbox */}
                    <TableCell className="py-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleSelectStudent(st.id)}
                        aria-label={`Select ${fullName}`}
                      />
                    </TableCell>

                    {/* Student Identity */}
                    <TableCell className="py-3">
                      <div>
                        <span className="font-bold text-sm text-foreground">{fullName}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="outline" className="text-[10px] px-1 py-0 font-mono">
                            #{idx + 1}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">ID: {st.id.slice(0, 8)}</span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Subscribed Facilities Badges */}
                    <TableCell className="py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Transport Badge */}
                        {isTrans && (
                          <StudentFacilityBadge
                            category="TRANSPORT"
                            name="Transport"
                            amount={effectiveTransFee}
                            frequency="MONTHLY"
                            onClick={() => handleOpenDrawer(st)}
                          />
                        )}

                        {/* Custom Facility Badges */}
                        {customFees.map((cf) => (
                          <StudentFacilityBadge
                            key={cf.id}
                            category={cf.fee_category}
                            name={cf.fee_name}
                            amount={Number(cf.amount)}
                            frequency={cf.frequency}
                            onClick={() => handleOpenDrawer(st)}
                          />
                        ))}

                        {/* If none active */}
                        {!isTrans && customFees.length === 0 && (
                          <span className="text-xs text-muted-foreground italic">No opted facilities</span>
                        )}

                        {/* Quick Add Button */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenDrawer(st)}
                          className="h-6 px-1.5 text-[11px] gap-1 text-primary hover:bg-primary/10 cursor-pointer ml-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add</span>
                        </Button>
                      </div>
                    </TableCell>

                    {/* Estimated Net Monthly Total */}
                    <TableCell className="py-3 text-right">
                      <div className="font-mono font-bold text-sm text-foreground">
                        NPR {totalEstimatedMonthly.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Baseline NPR {(schoolMonthlyTotal + classMonthlyTuition).toLocaleString()}
                        {effectiveTransFee + customFeesMonthlyTotal > 0 && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold ml-1">
                            (+NPR {(effectiveTransFee + customFeesMonthlyTotal).toLocaleString()})
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Manage Button */}
                    <TableCell className="py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDrawer(st)}
                        className="h-7 px-2.5 text-xs gap-1 cursor-pointer font-medium"
                      >
                        <span>Facilities</span>
                        <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Student Facility Dialog */}
      <ManageStudentFacilitiesDialog
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setDrawerStudent(null);
        }}
        student={drawerStudent}
        tenantId={tenantId || ''}
        schoolMonthlyTotal={schoolMonthlyTotal}
        baseTuition={classMonthlyTuition}
        classMonthlyTuition={classMonthlyTuition}
        transportProfile={drawerStudent ? transportMap.get(drawerStudent.id) : null}
        classDefaultTransportRate={classDefaultTransportRate}
        onSaveTransport={handleSaveTransport}
      />

      {/* Bulk Assign Facility Dialog */}
      <BulkAssignFacilityDialog
        isOpen={isBulkDialogOpen}
        onClose={() => setIsBulkDialogOpen(false)}
        selectedStudentIds={selectedStudentIds}
        tenantId={tenantId || ''}
        onSuccess={() => setSelectedStudentIds([])}
      />
    </div>
  );
};
