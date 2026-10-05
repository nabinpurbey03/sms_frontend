import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/auth/useAuth';
import { useCurrentAcademicYear } from '@/features/academic-year/hooks/useCurrentAcademicYear';
import { useClasses, useClassSections, useClassStudents } from '@/features/academic/hooks';
import {
  useFeeStructures,
  useBatchGenerateBills,
  useStudentFeeAssignments,
  useGeneratedMonths,
} from '../hooks';
import {
  batchBillGenerateSchema,
  type BatchBillGenerateFormValues,
  type BatchBillGenerateInputValues,
} from '../schema';
import {
  BS_MONTHS,
  type BsMonth,
  getDefaultBillTitle,
  calculateBaseMonthlyFee,
  getCurrentBsMonthIndex,
  getNextSequentialMonth,
  computeMonthStatus,
  type MonthStatusInfo,
} from '../utils/cashierUtils';
import { useTimeTravel } from '@/features/time-travel/TimeTravelContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sparkles,
  Calendar,
  Loader2,
  School,
  Info,
  Lock,
  Users,
  Coins,
  CheckCircle2,
  Search,
  TrendingDown,
  CalendarDays,
  Plus,
  X,
  RotateCcw,
  Check,
  ShieldAlert,
  AlertCircle,
  Clock,
  FilePlus,
  FileText,
  ArrowUpRight,
} from 'lucide-react';
import { NepaliDatePicker } from '@/components/ui/nepali-date-picker';

const formatCurrency = (amount: number | string): string => {
  return `NPR ${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const BatchBillingPage: React.FC = () => {
  const { activeTenantId } = useAuth();
  const navigate = useNavigate();
  const { currentYear, isLoading: isLoadingYear } = useCurrentAcademicYear(activeTenantId);

  const { effectiveDate } = useTimeTravel();
  const runningMonthIndex = useMemo(() => getCurrentBsMonthIndex(effectiveDate), [effectiveDate]);

  // Month Selection State (12 Bikram Sambat Months)
  const [selectedMonth, setSelectedMonth] = useState<BsMonth>(() => BS_MONTHS[getCurrentBsMonthIndex(effectiveDate)]);

  // Inline Ad-Hoc Fee State
  const [showAdHoc, setShowAdHoc] = useState<boolean>(false);

  // Fee Filter State (All, School, Class)
  const [feeFilter, setFeeFilter] = useState<'ALL' | 'SCHOOL' | 'CLASS'>('ALL');

  // Class & Section Selection State
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [generationSummary, setGenerationSummary] = useState<{
    count: number;
    totalPayable: number;
    month: string;
    className: string;
  } | null>(null);

  // Queries
  const { data: classesData, isLoading: isLoadingClasses } = useClasses(activeTenantId);
  const classes = classesData || [];

  const { data: sectionsData } = useClassSections(activeTenantId, selectedClassId || null);
  const sections = sectionsData || [];

  const { data: studentsData, isLoading: isLoadingStudents } = useClassStudents(
    activeTenantId,
    selectedClassId || null
  );
  const allStudents = studentsData || [];

  // Filter students if section is selected
  const filteredStudents = useMemo(() => {
    let list = allStudents;
    if (selectedSectionId) {
      list = list.filter((s: any) => s.section_id === selectedSectionId);
    }
    if (studentSearch.trim()) {
      const q = studentSearch.toLowerCase().trim();
      list = list.filter(
        (s: any) =>
          `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
          s.admission_number?.toLowerCase().includes(q) ||
          s.roll_number?.toString().includes(q)
      );
    }
    return list;
  }, [allStudents, selectedSectionId, studentSearch]);

  // Query Fee Structures (School-level and Class-level)
  const { data: schoolFeesData, isLoading: isLoadingSchoolFees } = useFeeStructures(
    activeTenantId,
    { fee_level: 'SCHOOL', is_active: true }
  );
  const schoolFees = schoolFeesData || [];

  const { data: classFeesData, isLoading: isLoadingClassFees } = useFeeStructures(
    activeTenantId,
    selectedClassId ? { class_id: selectedClassId, fee_level: 'CLASS', is_active: true } : undefined
  );
  const classFees = classFeesData || [];

  const allAvailableStructures = useMemo(() => {
    return [...schoolFees, ...classFees];
  }, [schoolFees, classFees]);

  const displayedStructures = useMemo(() => {
    if (feeFilter === 'SCHOOL') return schoolFees;
    if (feeFilter === 'CLASS') return classFees;
    return allAvailableStructures;
  }, [feeFilter, schoolFees, classFees, allAvailableStructures]);

  // Query student-level assigned fees (hostel, custom tutoring, etc.)
  const { data: studentAssignedFeesData } = useStudentFeeAssignments(
    activeTenantId,
    selectedClassId ? { class_id: selectedClassId } : undefined
  );
  const studentAssignedFees = studentAssignedFeesData || [];

  // Query generated months for this class in current session
  const { data: generatedMonthsList = [] } = useGeneratedMonths(activeTenantId, selectedClassId || null);
  const generatedMonthsSet = useMemo(() => new Set(generatedMonthsList), [generatedMonthsList]);

  // Memoize statuses for all 12 BS months
  const monthStatuses = useMemo(() => {
    return BS_MONTHS.map((m) => computeMonthStatus(m, runningMonthIndex, generatedMonthsSet));
  }, [runningMonthIndex, generatedMonthsSet]);

  // Auto-select next sequential month when class or generated months change
  const nextEligibleMonth = useMemo(() => {
    return getNextSequentialMonth(runningMonthIndex, generatedMonthsSet);
  }, [runningMonthIndex, generatedMonthsSet]);

  const selectedMonthStatus = useMemo(() => {
    return monthStatuses.find((s) => s.month === selectedMonth);
  }, [monthStatuses, selectedMonth]);

  const isSelectedMonthSelectable = selectedMonthStatus?.isSelectable ?? false;

  // Default Due Date (15 days from effective date)
  const defaultDueDate = useMemo(() => {
    const d = new Date(effectiveDate.getTime() + 15 * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  }, [effectiveDate]);

  // Dynamic bill title based on selected month and current academic session
  const defaultBillTitle = useMemo(() => {
    return getDefaultBillTitle(selectedMonth, currentYear?.name);
  }, [selectedMonth, currentYear?.name]);

  // Form Setup
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<BatchBillGenerateInputValues, any, BatchBillGenerateFormValues>({
    resolver: zodResolver(batchBillGenerateSchema),
    defaultValues: {
      class_id: '',
      section_id: '',
      billing_month: BS_MONTHS[runningMonthIndex],
      fee_structure_ids: [],
      due_date: defaultDueDate,
      notes: '',
      ad_hoc_fee_name: '',
      ad_hoc_fee_amount: undefined,
    },
  });

  const watchedFeeStructureIds = watch('fee_structure_ids') || [];
  const watchedAdHocName = watch('ad_hoc_fee_name') || '';
  const watchedAdHocAmount = Number(watch('ad_hoc_fee_amount')) || 0;

  // Batch Generation Mutation
  const batchBillMutation = useBatchGenerateBills(activeTenantId);

  // Auto-select next sequential month when class or generated months change
  useEffect(() => {
    if (nextEligibleMonth) {
      setSelectedMonth(nextEligibleMonth);
      setValue('billing_month', nextEligibleMonth);
    }
  }, [nextEligibleMonth, setValue]);

  // Auto-sync default due date when time travel shifts effective date
  useEffect(() => {
    setValue('due_date', defaultDueDate);
  }, [defaultDueDate, setValue]);

  // Sync initial class
  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
      setValue('class_id', classes[0].id);
    }
  }, [classes, selectedClassId, setValue]);

  // Auto-select all available fee structures when class or fee structures load
  useEffect(() => {
    if (allAvailableStructures.length > 0) {
      setValue(
        'fee_structure_ids',
        allAvailableStructures.map((f) => f.id)
      );
    }
  }, [allAvailableStructures, setValue]);

  // Handle month selection
  const handleMonthChange = (month: BsMonth) => {
    setSelectedMonth(month);
    setValue('billing_month', month);
  };

  const handleSelectAll = () => {
    setValue(
      'fee_structure_ids',
      allAvailableStructures.map((f) => f.id)
    );
  };

  const handleDeselectAll = () => {
    setValue('fee_structure_ids', []);
  };

  const handleToggleStructure = (id: string) => {
    if (watchedFeeStructureIds.includes(id)) {
      setValue(
        'fee_structure_ids',
        watchedFeeStructureIds.filter((item) => item !== id)
      );
    } else {
      setValue('fee_structure_ids', [...watchedFeeStructureIds, id]);
    }
  };

  const handleResetForm = () => {
    if (classes.length > 0) {
      setSelectedClassId(classes[0].id);
      setValue('class_id', classes[0].id);
    }
    setSelectedSectionId('');
    setValue('section_id', '');
    setValue('due_date', defaultDueDate);
    setValue('notes', '');
    setValue('ad_hoc_fee_name', '');
    setValue('ad_hoc_fee_amount', undefined);
    setShowAdHoc(false);
    setValue('fee_structure_ids', allAvailableStructures.map((f) => f.id));
    if (nextEligibleMonth) {
      setSelectedMonth(nextEligibleMonth);
      setValue('billing_month', nextEligibleMonth);
    }
  };

  // Calculations for Estimation & Live Preview
  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const selectedStructures = allAvailableStructures.filter((s) =>
    watchedFeeStructureIds.includes(s.id)
  );

  // Calculate base per-student monthly fee
  const baseMonthlyFeePerStudent = useMemo(() => {
    return calculateBaseMonthlyFee(selectedStructures, watchedAdHocAmount);
  }, [selectedStructures, watchedAdHocAmount]);

  // Estimated Class Total
  const estimatedClassTotal = baseMonthlyFeePerStudent * filteredStudents.length;

  const onFormSubmit = async (values: BatchBillGenerateFormValues) => {
    if (!nextEligibleMonth || !isSelectedMonthSelectable) {
      return;
    }
    try {
      const formattedData: BatchBillGenerateFormValues = {
        ...values,
        class_id: selectedClassId,
        section_id: selectedSectionId ? selectedSectionId : undefined,
        billing_month: selectedMonth,
        notes: values.notes?.trim() || undefined,
        ad_hoc_fee_name: values.ad_hoc_fee_name?.trim() || undefined,
        ad_hoc_fee_amount:
          values.ad_hoc_fee_amount && Number(values.ad_hoc_fee_amount) > 0
            ? Number(values.ad_hoc_fee_amount)
            : undefined,
      };

      const result = await batchBillMutation.mutateAsync(formattedData);
      setGenerationSummary({
        count: result?.generated_count || filteredStudents.length,
        totalPayable: Number(result?.total_amount || estimatedClassTotal),
        month: selectedMonth,
        className: selectedClass?.name || 'Class',
      });
      setIsSuccessModalOpen(true);
    } catch {
      // Toast handled by mutation hook
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* 1. Dedicated Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <FilePlus className="w-4 h-4" />
            </div>
            Invoice Generation
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-3xl">
            Configure and batch generate monthly fee invoices across Bikram Sambat billing cycles. Prior unpaid dues are itemized automatically, and advance credit balances are applied at invoice creation.
          </p>
        </div>

        {/* Top Header Utilities: Session Badge, View Bills shortcut & Reset Action */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <span>Session: {isLoadingYear ? 'Loading...' : currentYear?.name || 'Active Session'}</span>
          </div>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="text-xs h-8 px-3 gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <Link to="/finance/bills">
              <FileText className="w-3.5 h-3.5 text-primary" />
              <span>Bills & Invoices</span>
            </Link>
          </Button>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetForm}
                className="text-xs h-8 px-2.5 gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset Form</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset form selections to defaults</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <form id="batch-billing-form" onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ======================================================== */}
          {/* LEFT COLUMN: WORKBENCH CONTROLS (7 COLS)                 */}
          {/* ======================================================== */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: 12 BS Months Selector */}
            <Card className="border-border/70 shadow-xs rounded-2xl overflow-hidden bg-card">
              <CardHeader className="p-4 sm:p-5 pb-3 bg-muted/20 border-b border-border/40">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[11px] font-bold flex items-center justify-center">
                        1
                      </span>
                      <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                        Select Billing Month (Bikram Sambat)
                      </CardTitle>
                    </div>
                    <CardDescription className="text-xs text-muted-foreground ml-7">
                      Standard monthly fees and automatic facility charges will apply to this cycle.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="self-start sm:self-auto gap-1 font-mono text-[11px] bg-primary/5 text-primary border-primary/30 px-2.5 py-0.5 font-semibold">
                    <Calendar className="w-3 h-3" />
                    Target: {selectedMonth}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 pt-3 space-y-4">
                {/* Visual Status Legend */}
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] pb-1">
                  <span className="text-muted-foreground font-semibold text-[10px] uppercase tracking-wider mr-0.5">Legend:</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/30 font-medium text-[10px]">
                    <Sparkles className="w-2.5 h-2.5" />
                    Next to Bill / Current
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100/90 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300/80 dark:border-emerald-700/80 font-semibold text-[10px]">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                    Generated
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100/80 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-dashed border-amber-300/80 dark:border-amber-800/80 font-medium text-[10px]">
                    <Lock className="w-2.5 h-2.5 text-amber-700 dark:text-amber-400" />
                    Sequence Locked
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground border border-border/70 font-medium text-[10px]">
                    <Clock className="w-2.5 h-2.5 text-muted-foreground" />
                    Upcoming
                  </span>
                </div>

                {/* Status Alert / Context Banner */}
                {!nextEligibleMonth ? (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>
                      All class billing is completely up to date through <strong>{BS_MONTHS[runningMonthIndex]}</strong>! No invoices pending generation.
                    </span>
                  </div>
                ) : !isSelectedMonthSelectable ? (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>
                        {selectedMonthStatus?.tooltipText || `${selectedMonth} cannot be billed out of sequence.`}
                        {nextEligibleMonth && (
                          <> Please proceed with <strong>{nextEligibleMonth}</strong>.</>
                        )}
                      </span>
                    </div>
                    {nextEligibleMonth && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleMonthChange(nextEligibleMonth)}
                        className="text-xs h-7 px-2 shrink-0 border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
                      >
                        Select {nextEligibleMonth}
                      </Button>
                    )}
                  </div>
                ) : null}

                {/* 12 BS Month Buttons Grid: 4 columns x 3 rows for clean calendar quarters */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {monthStatuses.map((info) => {
                    const monthNumber = String(info.index + 1).padStart(2, '0');
                    const isSelected = selectedMonth === info.month;

                    let cardClass = '';
                    let badgeComponent: React.ReactNode = null;
                    let subtitleText = '';
                    let subtitleClass = '';
                    let monthNameClass = '';
                    let monthCodeClass = '';
                    let ringClass = '';

                    if (isSelected) {
                      if (info.isSelectable) {
                        ringClass = 'ring-2 ring-primary ring-offset-2 ring-offset-background';
                      } else if (info.status === 'GENERATED') {
                        ringClass = 'ring-2 ring-emerald-500/80 ring-offset-2 ring-offset-background';
                      } else {
                        ringClass = 'ring-2 ring-amber-500/80 ring-offset-2 ring-offset-background';
                      }
                    }

                    switch (info.status) {
                      case 'AVAILABLE_NEXT':
                        cardClass =
                          'border-primary bg-primary/10 text-primary shadow-xs hover:bg-primary/15 cursor-pointer';
                        monthNameClass = 'text-primary font-bold text-sm';
                        monthCodeClass = 'text-primary font-bold';
                        subtitleText = 'Next to bill';
                        subtitleClass = 'text-primary/90 font-medium';
                        badgeComponent = (
                          <Badge className="text-[9px] px-1.5 py-0 font-semibold gap-0.5 bg-primary text-primary-foreground shadow-xs">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>Next to Bill</span>
                          </Badge>
                        );
                        break;

                      case 'AVAILABLE_RUNNING':
                        cardClass =
                          'border-primary bg-primary/15 text-primary font-bold shadow-xs hover:bg-primary/20 cursor-pointer';
                        monthNameClass = 'text-primary font-bold text-sm';
                        monthCodeClass = 'text-primary font-bold';
                        subtitleText = 'Current month';
                        subtitleClass = 'text-primary/90 font-semibold';
                        badgeComponent = (
                          <Badge className="text-[9px] px-1.5 py-0 font-semibold gap-0.5 bg-primary text-primary-foreground shadow-xs">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>Current Month</span>
                          </Badge>
                        );
                        break;

                      case 'LOCKED_SEQUENCE':
                        cardClass =
                          'bg-amber-50/50 dark:bg-amber-950/20 border-dashed border-amber-300/80 dark:border-amber-800/60 hover:bg-amber-50/80 dark:hover:bg-amber-950/40 hover:border-amber-400 cursor-pointer text-foreground';
                        monthNameClass = 'text-foreground font-semibold text-sm';
                        monthCodeClass = 'text-amber-800/80 dark:text-amber-400 font-mono font-semibold';
                        subtitleText = 'Needs earlier month';
                        subtitleClass = 'text-amber-700 dark:text-amber-400 font-medium';
                        badgeComponent = (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 font-medium text-amber-800 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-950/60 border-amber-300/80 dark:border-amber-800/80 flex items-center gap-0.5"
                          >
                            <Lock className="w-2.5 h-2.5 text-amber-700 dark:text-amber-400" />
                            <span>Sequence Locked</span>
                          </Badge>
                        );
                        break;

                      case 'LOCKED_PAST':
                        cardClass =
                          'bg-rose-50/50 dark:bg-rose-950/20 border-dashed border-rose-300/80 dark:border-rose-800/60 hover:bg-rose-50/80 dark:hover:bg-rose-950/40 hover:border-rose-400 cursor-pointer text-foreground';
                        monthNameClass = 'text-foreground font-semibold text-sm';
                        monthCodeClass = 'text-rose-800/80 dark:text-rose-400 font-mono font-semibold';
                        subtitleText = 'Later bill exists';
                        subtitleClass = 'text-rose-700 dark:text-rose-400 font-medium';
                        badgeComponent = (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 font-medium text-rose-800 dark:text-rose-300 bg-rose-100/90 dark:bg-rose-950/60 border-rose-300/80 dark:border-rose-800/80 flex items-center gap-0.5"
                          >
                            <AlertCircle className="w-2.5 h-2.5 text-rose-700 dark:text-rose-400" />
                            <span>Locked (Past)</span>
                          </Badge>
                        );
                        break;

                      case 'GENERATED':
                        cardClass =
                          'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/70 hover:bg-emerald-50/90 dark:hover:bg-emerald-950/50 hover:border-emerald-400 cursor-pointer text-foreground';
                        monthNameClass = 'text-emerald-950 dark:text-emerald-100 font-bold text-sm';
                        monthCodeClass = 'text-emerald-700 dark:text-emerald-400 font-mono font-semibold';
                        subtitleText = 'Invoices issued';
                        subtitleClass = 'text-emerald-700 dark:text-emerald-400 font-medium';
                        badgeComponent = (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 font-semibold bg-emerald-100/90 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border-emerald-300/80 dark:border-emerald-700/80 flex items-center gap-0.5"
                          >
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Generated</span>
                          </Badge>
                        );
                        break;

                      case 'FUTURE_LOCKED':
                      default:
                        cardClass =
                          'bg-muted/40 dark:bg-muted/20 border-border/80 hover:bg-muted/60 hover:border-border cursor-pointer text-foreground';
                        monthNameClass = 'text-foreground/90 font-semibold text-sm';
                        monthCodeClass = 'text-muted-foreground font-mono font-medium';
                        subtitleText = 'Upcoming cycle';
                        subtitleClass = 'text-muted-foreground font-medium';
                        badgeComponent = (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 font-medium text-muted-foreground bg-background border-border flex items-center gap-0.5"
                          >
                            <Clock className="w-2.5 h-2.5 text-muted-foreground" />
                            <span>Upcoming</span>
                          </Badge>
                        );
                        break;
                    }

                    return (
                      <button
                        key={info.month}
                        type="button"
                        onClick={() => handleMonthChange(info.month)}
                        title={info.tooltipText}
                        className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between min-h-[82px] ${cardClass} ${ringClass}`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className={`text-[10px] font-mono uppercase ${monthCodeClass}`}>
                            M{monthNumber}
                          </span>
                          {badgeComponent}
                        </div>
                        <div className="space-y-0.5">
                          <div className={`text-xs ${monthNameClass}`}>{info.month}</div>
                          <div className={`text-[10px] leading-tight ${subtitleClass}`}>
                            {subtitleText}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded-xl border border-border/50 flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 shrink-0 text-primary" />
                  <span>
                    Current active school month: <strong className="text-foreground">{BS_MONTHS[runningMonthIndex]}</strong>. Strict sequential billing requires generating invoices month-by-month in order.
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Step 2: Target Cohort & Terms (Radix Accessible Selects) */}
            <Card className="border-border/70 shadow-xs rounded-2xl overflow-hidden bg-card">
              <CardHeader className="p-4 sm:p-5 pb-3 bg-muted/20 border-b border-border/40">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[11px] font-bold flex items-center justify-center">
                      2
                    </span>
                    <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                      Target Cohort & Payment Terms
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs text-muted-foreground ml-7">
                    Choose the target class and configure due date and statement memo.
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 pt-3 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Class Level Radix Select */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">
                      Target Class <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={selectedClassId}
                      onValueChange={(val) => {
                        setSelectedClassId(val);
                        setValue('class_id', val, { shouldValidate: true });
                        setSelectedSectionId('');
                        setValue('section_id', '');
                      }}
                    >
                      <SelectTrigger className="w-full h-9 text-xs bg-background">
                        <SelectValue placeholder="Select class..." />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id} className="text-xs">
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.class_id && (
                      <p className="text-[11px] text-destructive">{errors.class_id.message}</p>
                    )}
                  </div>

                  {/* Section Radix Select */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">Section Filter</Label>
                    <Select
                      value={selectedSectionId || 'ALL'}
                      onValueChange={(val) => {
                        const secId = val === 'ALL' ? '' : val;
                        setSelectedSectionId(secId);
                        setValue('section_id', secId);
                      }}
                    >
                      <SelectTrigger className="w-full h-9 text-xs bg-background">
                        <SelectValue placeholder="All Sections" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL" className="text-xs">
                          All Sections ({allStudents.length} Students)
                        </SelectItem>
                        {sections.map((sec) => (
                          <SelectItem key={sec.id} value={sec.id} className="text-xs">
                            Section {sec.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Payment Due Date */}
                  <div>
                    <NepaliDatePicker
                      id="due_date"
                      label="Payment Due Date *"
                      value={watch('due_date')}
                      onChange={(val) => setValue('due_date', val, { shouldValidate: true })}
                      size="sm"
                      error={errors.due_date?.message}
                    />
                  </div>

                  {/* Invoice Memo / Notes */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">Statement Memo / Notes</Label>
                    <Input
                      placeholder="e.g., Pay on or before 15th to avoid late penalty"
                      {...register('notes')}
                      className="text-xs h-9 bg-background"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 3: Fee Structures to Include & Ad-hoc */}
            <Card className="border-border/70 shadow-xs rounded-2xl overflow-hidden bg-card">
              <CardHeader className="p-4 sm:p-5 pb-3 bg-muted/20 border-b border-border/40">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[11px] font-bold flex items-center justify-center">
                        3
                      </span>
                      <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                        Fee Structures to Charge ({selectedStructures.length}/{allAvailableStructures.length})
                      </CardTitle>
                    </div>
                    <CardDescription className="text-xs text-muted-foreground ml-7">
                      Active fee heads included in {selectedMonth}&apos;s billing statement.
                    </CardDescription>
                  </div>

                  {/* Quick Controls */}
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <Button
                      type="button"
                      variant={showAdHoc ? 'secondary' : 'outline'}
                      size="sm"
                      onClick={() => setShowAdHoc(!showAdHoc)}
                      className="text-[11px] h-7 px-2.5 gap-1 font-medium cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-primary" />
                      <span>{showAdHoc ? 'Hide Ad-Hoc' : '+ Ad-Hoc Fee'}</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAll}
                      className="text-[11px] h-7 px-2 text-muted-foreground hover:text-foreground"
                    >
                      Select All
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleDeselectAll}
                      className="text-[11px] h-7 px-2 text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 pt-3 space-y-4">
                {/* Optional Ad-hoc Fee Drawer */}
                {(showAdHoc || watchedAdHocAmount > 0 || Boolean(watchedAdHocName)) && (
                  <div className="p-3.5 rounded-xl border border-dashed border-primary/50 bg-primary/5 space-y-2.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Optional Class-Level Ad-Hoc Addition</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="w-5 h-5 text-muted-foreground hover:text-destructive cursor-pointer"
                        onClick={() => {
                          setValue('ad_hoc_fee_name', '');
                          setValue('ad_hoc_fee_amount', undefined);
                          setShowAdHoc(false);
                        }}
                        title="Remove ad-hoc charge"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-foreground">Charge Title</Label>
                        <Input
                          placeholder="e.g., Annual Sports Day Fee"
                          {...register('ad_hoc_fee_name')}
                          className="text-xs h-8 bg-card"
                        />
                        {errors.ad_hoc_fee_name && (
                          <p className="text-[11px] text-destructive">{errors.ad_hoc_fee_name.message}</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-foreground">Amount (NPR)</Label>
                        <Input
                          type="number"
                          step="any"
                          placeholder="e.g., 500"
                          {...register('ad_hoc_fee_amount', { valueAsNumber: true })}
                          className="text-xs h-8 bg-card font-mono"
                        />
                        {errors.ad_hoc_fee_amount && (
                          <p className="text-[11px] text-destructive">{errors.ad_hoc_fee_amount.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Filter Chips: All, School, Class */}
                <div className="flex items-center gap-1.5 border-b border-border/40 pb-2">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground mr-1">Filter:</span>
                  <button
                    type="button"
                    onClick={() => setFeeFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      feeFilter === 'ALL'
                        ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                        : 'text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    All ({allAvailableStructures.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeeFilter('SCHOOL')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      feeFilter === 'SCHOOL'
                        ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                        : 'text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    School-Wide ({schoolFees.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeeFilter('CLASS')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      feeFilter === 'CLASS'
                        ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                        : 'text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    Class-Specific ({classFees.length})
                  </button>
                </div>

                {isLoadingSchoolFees || isLoadingClassFees ? (
                  <div className="flex items-center justify-center p-6 text-muted-foreground text-xs gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading fee structures...
                  </div>
                ) : displayedStructures.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-xs border border-dashed rounded-xl bg-muted/10">
                    No active fee structures found for this category.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                    {displayedStructures.map((structure) => {
                      const isSelected = watchedFeeStructureIds.includes(structure.id);
                      const isSchoolLevel = structure.fee_level === 'SCHOOL';

                      return (
                        <div
                          key={structure.id}
                          onClick={() => handleToggleStructure(structure.id)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                            isSelected
                              ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                              : 'border-border/60 hover:bg-muted/30 opacity-70'
                          }`}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleStructure(structure.id)}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="text-xs font-semibold text-foreground truncate">
                                {structure.name}
                              </span>
                              <Badge
                                variant={isSchoolLevel ? 'default' : 'secondary'}
                                className="text-[9px] px-1 py-0 uppercase shrink-0 font-medium"
                              >
                                {isSchoolLevel ? 'School' : 'Class'}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                              <span className="capitalize">{structure.frequency.toLowerCase()}</span>
                              <span className="font-mono font-bold text-foreground">
                                {formatCurrency(structure.amount)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Subtotal Pill */}
                <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Base Fee Total (Per Student):</span>
                  <span className="font-mono font-bold text-foreground">
                    {formatCurrency(baseMonthlyFeePerStudent)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ======================================================== */}
          {/* RIGHT COLUMN: COHORT PREVIEW & LAUNCHPAD (5 COLS)         */}
          {/* ======================================================== */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-6 self-start">
            {/* Live Financial Impact Summary - The Sole Primary Action Center */}
            <Card className="border-primary/40 bg-card shadow-sm rounded-2xl overflow-hidden">
              {/* Header with Title and Month Pill */}
              <div className="p-4 sm:p-5 border-b border-border/40 bg-primary/5 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
                    Financial Projection
                  </span>
                  <h3 className="text-base font-bold text-foreground mt-0.5">
                    {selectedClass?.name || 'Selected Class'} • {selectedMonth}
                  </h3>
                </div>
                <Badge variant="outline" className="font-mono text-xs px-2.5 py-1 bg-background text-primary border-primary/30">
                  {filteredStudents.length} Students
                </Badge>
              </div>

              <div className="p-4 sm:p-5 space-y-4">
                {/* 2 Top KPI Tiles */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-muted/20 border border-border/60">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                      Fee / Student
                    </span>
                    <div className="text-base font-bold font-mono text-foreground mt-0.5">
                      {formatCurrency(baseMonthlyFeePerStudent)}
                    </div>
                    <span className="text-[10px] text-muted-foreground">Standard base</span>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/20 border border-border/60">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                      Cohort Size
                    </span>
                    <div className="text-base font-bold font-mono text-foreground mt-0.5">
                      {filteredStudents.length}
                    </div>
                    <span className="text-[10px] text-muted-foreground">Active enrolled</span>
                  </div>
                </div>

                {/* Financial Ledger Breakdown */}
                <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Gross Invoicing Projection:</span>
                    <span className="font-mono font-bold text-foreground">{formatCurrency(estimatedClassTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400">
                    <span className="flex items-center gap-1">
                      <TrendingDown className="w-3.5 h-3.5" />
                      Advance Wallet Credits:
                    </span>
                    <span className="font-mono font-semibold">Auto-applied at issue</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-amber-600 dark:text-amber-400">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5" />
                      Rolling Unpaid Arrears:
                    </span>
                    <span className="font-mono font-semibold">Auto-itemized</span>
                  </div>
                  <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs font-bold text-foreground">
                    <span>Estimated Net Billing:</span>
                    <span className="font-mono text-primary text-base">
                      ~{formatCurrency(estimatedClassTotal)}
                    </span>
                  </div>
                </div>

                {/* Important Audit Rules Callout */}
                <div className="p-3 rounded-xl bg-muted/40 border border-border/50 space-y-1.5 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    <Info className="w-3.5 h-3.5 text-primary" />
                    System Billing Rules
                  </div>
                  <ul className="list-disc list-inside space-y-1 pl-1">
                    <li>Strict chronological month billing is enforced (no skipping months).</li>
                    <li>Duplicate bills are strictly blocked to prevent double charging for {selectedMonth}.</li>
                    <li>Individual student facility fees (hostel, bus) are auto-calculated.</li>
                    <li>Student advance credit balances reduce final payable dues.</li>
                  </ul>
                </div>

                {/* The Single, Definitive Primary Action Button */}
                <div className="pt-2 space-y-2">
                  {!nextEligibleMonth && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span>All class billing is completely up to date through {BS_MONTHS[runningMonthIndex]}!</span>
                    </div>
                  )}

                  {!isSelectedMonthSelectable && nextEligibleMonth && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>{selectedMonth} is locked. Next eligible month is {nextEligibleMonth}.</span>
                    </div>
                  )}

                  {filteredStudents.length === 0 && !isLoadingStudents && (
                    <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 shrink-0 text-destructive" />
                      <span>Select a class with active enrolled students to generate invoices.</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    form="batch-billing-form"
                    disabled={
                      batchBillMutation.isPending ||
                      filteredStudents.length === 0 ||
                      !nextEligibleMonth ||
                      !isSelectedMonthSelectable
                    }
                    className="w-full gap-2 h-11 text-xs sm:text-sm font-bold shadow-md cursor-pointer rounded-xl"
                  >
                    {batchBillMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating Invoices...
                      </>
                    ) : !nextEligibleMonth ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Invoices Up To Date
                      </>
                    ) : !isSelectedMonthSelectable ? (
                      <>
                        <Lock className="w-4 h-4" />
                        Month Locked ({selectedMonth})
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate {filteredStudents.length} Invoices for {selectedMonth}
                      </>
                    )}
                  </Button>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1 pt-1">
                    <span className="truncate">
                      Target: <strong className="text-foreground">{selectedClass?.name || 'Selected Class'}</strong>
                      {selectedSectionId && (
                        <span className="ml-1 text-muted-foreground font-normal">
                          (Sec {sections.find((s) => s.id === selectedSectionId)?.name || 'Filtered'})
                        </span>
                      )}
                    </span>
                    <Link
                      to="/finance/bills"
                      className="text-primary hover:text-primary/80 font-medium inline-flex items-center gap-1 transition-colors"
                    >
                      <span>Review Invoices</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </Card>

            {/* Student Pre-Billing Roster Table Preview */}
            <Card className="border-border/70 shadow-xs rounded-2xl overflow-hidden bg-card">
              <CardHeader className="p-4 sm:p-5 pb-3 bg-muted/20 border-b border-border/40">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                      <Users className="w-4 h-4 text-primary" />
                      Student Roster Preview ({filteredStudents.length})
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Students enrolled in this cohort receiving an invoice.
                    </CardDescription>
                  </div>
                </div>
                <div className="relative mt-2">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder="Search by student name or roll #..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="text-xs h-8 pl-8 bg-background"
                  />
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 pt-2">
                {isLoadingStudents ? (
                  <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading cohort roster...
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-xl bg-muted/10">
                    No active students found in this class/section filter.
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto pr-1 space-y-1.5 divide-y divide-border/30">
                    {filteredStudents.map((st: any, index: number) => {
                      const studentSpecificFees = studentAssignedFees.filter(
                        (a: any) => a.student_id === st.id
                      );
                      const hasCustomFees = studentSpecificFees.length > 0;

                      return (
                        <div
                          key={st.id}
                          className="pt-2 first:pt-0 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                              <span className="text-[10px] font-mono text-muted-foreground">
                                #{st.roll_number || index + 1}
                              </span>
                              <span className="truncate">
                                {st.first_name} {st.last_name}
                              </span>
                            </div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                              <span>Sec {st.section_name || 'N/A'}</span>
                              {hasCustomFees && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 text-primary border-primary/30 font-medium">
                                  +{studentSpecificFees.length} Facilities
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-mono font-bold text-foreground text-xs block">
                              ~{formatCurrency(baseMonthlyFeePerStudent)}
                            </span>
                            <span className="text-[10px] text-emerald-600 font-medium">Ready</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </form>

      {/* Accessible Success Dialog (Replaces custom fixed div) */}
      <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
        <DialogContent className="sm:max-w-md text-center p-6 space-y-4">
          <DialogHeader className="space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-center text-foreground">
              Invoices Generated Successfully!
            </DialogTitle>
            <DialogDescription className="text-xs text-center text-muted-foreground">
              Monthly billing statements for {generationSummary?.month} were successfully generated for {generationSummary?.className}.
            </DialogDescription>
          </DialogHeader>

          {generationSummary && (
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 text-xs space-y-2 text-left font-mono my-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground font-sans">Total Invoices Created:</span>
                <span className="font-bold text-foreground">{generationSummary.count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-sans">Billing Month:</span>
                <span className="font-bold text-primary font-sans">{generationSummary.month}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-sans">Total Billed:</span>
                <span className="font-bold text-primary">{formatCurrency(generationSummary.totalPayable)}</span>
              </div>
            </div>
          )}

          <DialogFooter className="flex sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => {
                setIsSuccessModalOpen(false);
              }}
            >
              Generate Another Class
            </Button>
            <Button
              type="button"
              size="sm"
              className="flex-1 text-xs font-semibold"
              onClick={() => {
                setIsSuccessModalOpen(false);
                navigate({ to: '/finance/bills' });
              }}
            >
              View Bills Table
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
