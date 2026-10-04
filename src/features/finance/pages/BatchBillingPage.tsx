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
  Sparkles,
  Calendar,
  Loader2,
  School,
  Info,
  ArrowLeft,
  Lock,
  Users,
  Coins,
  CheckCircle2,
  Search,
  TrendingDown,
  CalendarDays,
  Plus,
  X,
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

  // Sync selected month when time travel shifts running month or month status updates
  useEffect(() => {
    const runningMonth = BS_MONTHS[runningMonthIndex];
    const status = computeMonthStatus(runningMonth, runningMonthIndex, generatedMonthsSet);
    if (status.isSelectable) {
      setSelectedMonth(runningMonth);
      setValue('billing_month', runningMonth);
    } else {
      const preferred =
        monthStatuses.find((s) => s.status === 'AVAILABLE_RUNNING') ||
        monthStatuses.find((s) => s.status === 'AVAILABLE_BACKLOG');
      if (preferred) {
        setSelectedMonth(preferred.month);
        setValue('billing_month', preferred.month);
      }
    }
  }, [runningMonthIndex, generatedMonthsSet, monthStatuses, setValue]);

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
    <div className="space-y-6 pb-8 max-w-7xl mx-auto">
      {/* 1. Header & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link
              to="/finance/bills"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Bills & Invoices
            </Link>
            <span className="text-muted-foreground/40 text-xs">/</span>
            <span className="text-xs font-medium text-foreground">Monthly Batch Invoicing</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            Monthly Batch Invoicing Engine
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Generate monthly fee bills for any of the 12 Bikram Sambat months with automatic rolling arrears integration and student advance wallet credit deductions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
            <Lock className="w-3.5 h-3.5 text-primary" />
            <span>Session: {isLoadingYear ? 'Loading...' : currentYear?.name || 'Active Session'}</span>
          </div>

          <Link to="/finance/bills">
            <Button type="button" variant="outline" size="sm" className="text-xs">
              Cancel
            </Button>
          </Link>

          <Button
            type="submit"
            form="batch-billing-form"
            size="sm"
            disabled={batchBillMutation.isPending || filteredStudents.length === 0}
            className="text-xs font-bold gap-1.5 shadow-xs cursor-pointer"
          >
            {batchBillMutation.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Generate {selectedMonth} Invoices
              </>
            )}
          </Button>
        </div>
      </div>

      <form id="batch-billing-form" onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ======================================================== */}
          {/* LEFT COLUMN: CONFIGURATION CONTROLS (7 COLS)              */}
          {/* ======================================================== */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: 12 BS Months Selector */}
            <Card className="border-border/60 shadow-xs">
              <CardHeader className="p-4 sm:p-5 pb-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-primary" />
                      1. Select Billing Month (Bikram Sambat)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Pick the Nepali calendar month to invoice. Standard monthly fees will be charged for this cycle.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="gap-1 font-mono text-[11px] bg-primary/5 text-primary border-primary/20">
                    <Calendar className="w-3 h-3" />
                    {selectedMonth}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-2 space-y-4">
                {/* 12 BS Month Buttons Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {monthStatuses.map((info) => {
                    const isSelected = selectedMonth === info.month;
                    const monthNumber = String(info.index + 1).padStart(2, '0');

                    // Styles based on status
                    let cardClass = '';
                    if (info.status === 'GENERATED') {
                      cardClass = 'opacity-45 bg-muted/20 border-border/40 cursor-not-allowed select-none';
                    } else if (info.status === 'FUTURE_LOCKED') {
                      cardClass = 'opacity-35 bg-muted/10 border-border/30 cursor-not-allowed select-none';
                    } else if (isSelected) {
                      cardClass = 'border-primary bg-primary/10 shadow-xs ring-2 ring-primary/25 font-bold cursor-pointer';
                    } else {
                      cardClass = 'border-border/60 hover:border-border hover:bg-muted/40 text-muted-foreground cursor-pointer';
                    }

                    return (
                      <button
                        key={info.month}
                        type="button"
                        disabled={!info.isSelectable}
                        onClick={() => {
                          if (info.isSelectable) {
                            handleMonthChange(info.month);
                          }
                        }}
                        title={info.tooltipText}
                        className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${cardClass}`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className={`text-[10px] font-mono uppercase font-semibold ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                            M{monthNumber}
                          </span>
                          {info.status === 'GENERATED' && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 flex items-center gap-0.5">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                              <span>Generated</span>
                            </Badge>
                          )}
                          {info.status === 'FUTURE_LOCKED' && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 font-medium text-muted-foreground bg-muted/40 flex items-center gap-0.5">
                              <Lock className="w-2.5 h-2.5" />
                              <span>Upcoming</span>
                            </Badge>
                          )}
                          {info.status === 'AVAILABLE_RUNNING' && !isSelected && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                              Current
                            </Badge>
                          )}
                          {info.status === 'AVAILABLE_BACKLOG' && !isSelected && (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 font-medium">
                              Unbilled
                            </Badge>
                          )}
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />}
                        </div>
                        <div className={`text-xs ${isSelected ? 'text-primary font-bold' : info.isSelectable ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                          {info.month}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/50 flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 shrink-0 text-primary" />
                  <span>
                    Running month: <strong className="text-foreground">{BS_MONTHS[runningMonthIndex]}</strong>. You can generate invoices for the running month and any past unbilled months.
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Step 2: Target Class, Section & Dates */}
            <Card className="border-border/60 shadow-xs">
              <CardHeader className="p-4 sm:p-5 pb-3">
                <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
                  <School className="w-4 h-4 text-primary" />
                  2. Target Class & Terms
                </CardTitle>
                <CardDescription className="text-xs">
                  Choose the target student cohort and set payment due terms.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-2 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Class Selector */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Class Level <span className="text-destructive">*</span>
                    </Label>
                    <select
                      value={selectedClassId}
                      onChange={(e) => {
                        setSelectedClassId(e.target.value);
                        setValue('class_id', e.target.value);
                        setSelectedSectionId('');
                        setValue('section_id', '');
                      }}
                      className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 py-1 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
                    >
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Section Selector */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Section (Optional)</Label>
                    <select
                      value={selectedSectionId}
                      onChange={(e) => {
                        setSelectedSectionId(e.target.value);
                        setValue('section_id', e.target.value);
                      }}
                      className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 py-1 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
                    >
                      <option value="">All Sections ({filteredStudents.length} students)</option>
                      {sections.map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          Section {sec.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Due Date */}
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
                    <Label className="text-xs font-semibold">Invoice Notes / Memo</Label>
                    <Input
                      placeholder="Optional remarks printed on invoice..."
                      {...register('notes')}
                      className="text-xs h-9"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 3: Fee Structures to Apply */}
            <Card className="border-border/60 shadow-xs">
              <CardHeader className="p-4 sm:p-5 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
                      <Coins className="w-4 h-4 text-primary" />
                      3. Fee Structures to Include ({selectedStructures.length}/{allAvailableStructures.length})
                    </CardTitle>
                    <CardDescription className="text-xs">
                      School-level and class-level fee heads to be charged for {selectedMonth}.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant={showAdHoc ? 'secondary' : 'outline'}
                          size="sm"
                          onClick={() => {
                            if (showAdHoc && !watchedAdHocAmount && !watchedAdHocName) {
                              setShowAdHoc(false);
                            } else {
                              setShowAdHoc(!showAdHoc);
                            }
                          }}
                          className="text-[11px] h-7 px-2 gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 text-primary" />
                          <span>Ad-Hoc Fee</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Optional Class-Level Ad-Hoc Charge</TooltipContent>
                    </Tooltip>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAll}
                      className="text-[11px] h-7 px-2"
                    >
                      Select All
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleDeselectAll}
                      className="text-[11px] h-7 px-2"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-2 space-y-3">
                {(showAdHoc || watchedAdHocAmount > 0 || Boolean(watchedAdHocName)) && (
                  <div className="p-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 space-y-2.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Optional Class-Level Ad-Hoc Charge</span>
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
                        <Label className="text-xs font-semibold">Fee Title</Label>
                        <Input
                          placeholder="e.g., Monthly Assessment Fee"
                          {...register('ad_hoc_fee_name')}
                          className="text-xs h-8 bg-card"
                        />
                        {errors.ad_hoc_fee_name && (
                          <p className="text-[11px] text-destructive">{errors.ad_hoc_fee_name.message}</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Amount (NPR)</Label>
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

                {isLoadingSchoolFees || isLoadingClassFees ? (
                  <div className="flex items-center justify-center p-6 text-muted-foreground text-xs gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading fee structures...
                  </div>
                ) : allAvailableStructures.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-xs border border-dashed rounded-lg">
                    No active fee structures found for this class or school.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                    {allAvailableStructures.map((structure) => {
                      const isSelected = watchedFeeStructureIds.includes(structure.id);
                      const isSchoolLevel = structure.fee_level === 'SCHOOL';

                      return (
                        <div
                          key={structure.id}
                          onClick={() => handleToggleStructure(structure.id)}
                          className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                            isSelected
                              ? 'border-primary/50 bg-primary/5'
                              : 'border-border/60 hover:bg-muted/30 opacity-75'
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
                                className="text-[9px] px-1 py-0 uppercase shrink-0"
                              >
                                {isSchoolLevel ? 'School-Wide' : 'Class-Level'}
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
              </CardContent>
            </Card>
          </div>

          {/* ======================================================== */}
          {/* RIGHT COLUMN: COHORT PREVIEW & AUDIT SUMMARY (5 COLS)     */}
          {/* ======================================================== */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-6 self-start">
            {/* Live Financial Impact Summary */}
            <Card className="border-primary/30 bg-primary/5 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-primary/20 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Billing Cohort Projection • {selectedMonth}
                </span>
                <h3 className="text-base font-bold text-foreground">
                  {selectedClass?.name || 'Selected Class'} ({filteredStudents.length} Students)
                </h3>
              </div>

              <div className="p-4 sm:p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-background border border-border/60">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">
                      Base Fee Per Student
                    </span>
                    <div className="text-base font-bold font-mono text-foreground mt-0.5">
                      {formatCurrency(baseMonthlyFeePerStudent)}
                    </div>
                    <span className="text-[10px] text-muted-foreground">For {selectedMonth}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-background border border-border/60">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">
                      Target Students
                    </span>
                    <div className="text-base font-bold font-mono text-foreground mt-0.5">
                      {filteredStudents.length}
                    </div>
                    <span className="text-[10px] text-muted-foreground">Enrolled active</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-background border border-border/60 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Gross Base Generation:</span>
                    <span className="font-mono font-bold">{formatCurrency(estimatedClassTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400">
                    <span className="flex items-center gap-1">
                      <TrendingDown className="w-3.5 h-3.5" />
                      Advance Wallet Deductions:
                    </span>
                    <span className="font-mono font-bold">Auto-applied per student</span>
                  </div>
                  <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs font-bold text-foreground">
                    <span>Estimated Net Billing:</span>
                    <span className="font-mono text-primary text-sm">
                      ~{formatCurrency(estimatedClassTotal)}
                    </span>
                  </div>
                </div>

                {/* Important Audit Rules Callout */}
                <div className="p-3 rounded-lg bg-muted/40 border border-border/50 space-y-1.5 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    <Info className="w-3.5 h-3.5 text-primary" />
                    Monthly Invoicing Rules
                  </div>
                  <ul className="list-disc list-inside space-y-1 pl-1">
                    <li>Duplicate generation is strictly locked to prevent double receivables for {selectedMonth}.</li>
                    <li>Individual student facility fees (hostel, bus) are auto-calculated for the month.</li>
                    <li>Advance credits in student wallets will automatically reduce net payable.</li>
                    <li>Rolling arrears from previous months will be automatically itemized.</li>
                  </ul>
                </div>

                {/* Primary Batch Generation Action */}
                <div className="pt-3 border-t border-primary/20 space-y-3">
                  {filteredStudents.length === 0 && !isLoadingStudents && (
                    <div className="p-3 rounded-lg bg-muted text-muted-foreground text-xs flex items-center gap-2">
                      <Info className="w-4 h-4 shrink-0 text-amber-500" />
                      <span>Please select a class with enrolled students to generate invoices.</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    form="batch-billing-form"
                    disabled={batchBillMutation.isPending || filteredStudents.length === 0}
                    className="w-full gap-2 h-11 text-xs sm:text-sm font-bold shadow-md cursor-pointer"
                  >
                    {batchBillMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating Invoices...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate {filteredStudents.length} Invoices for {selectedMonth}
                      </>
                    )}
                  </Button>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                    <span>Target: {selectedClass?.name || 'Class'}</span>
                    <Link
                      to="/finance/bills"
                      className="hover:text-foreground underline underline-offset-2 transition-colors"
                    >
                      Cancel & Return
                    </Link>
                  </div>
                </div>
              </div>
            </Card>

            {/* Student Pre-Billing Roster Table */}
            <Card className="border-border/60 shadow-xs">
              <CardHeader className="p-4 sm:p-5 pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-primary" />
                      Student Roster Preview ({filteredStudents.length})
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Students who will receive an invoice in this batch.
                    </CardDescription>
                  </div>
                </div>
                <div className="relative mt-2">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder="Filter student by name or roll #..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="text-xs h-8 pl-8"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0">
                {isLoadingStudents ? (
                  <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading cohort roster...
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                    No active students found in this class/section.
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto pr-1 space-y-1.5 divide-y divide-border/30">
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
                                <Badge variant="outline" className="text-[9px] px-1 py-0 text-primary border-primary/30">
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

      {/* Success Modal */}
      {isSuccessModalOpen && generationSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="max-w-md w-full border-border shadow-xl p-6 text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-foreground">Invoices Generated Successfully!</h3>
              <p className="text-xs text-muted-foreground">
                Monthly billing for {generationSummary.month} was created for {generationSummary.className}.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 text-xs space-y-2 text-left font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground font-sans">Total Invoices:</span>
                <span className="font-bold">{generationSummary.count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-sans">Billing Month:</span>
                <span className="font-bold text-primary">{generationSummary.month}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-sans">Total Billed:</span>
                <span className="font-bold text-primary">{formatCurrency(generationSummary.totalPayable)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
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
                size="sm"
                className="flex-1 text-xs font-semibold"
                onClick={() => {
                  setIsSuccessModalOpen(false);
                  navigate({ to: '/finance/bills' });
                }}
              >
                View Bills Table
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
