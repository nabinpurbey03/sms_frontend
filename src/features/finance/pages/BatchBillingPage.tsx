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
  useQuarterWindowStatus,
  useStudentFeeAssignments,
} from '../hooks';
import {
  batchBillGenerateSchema,
  type BatchBillGenerateFormValues,
  type BatchBillGenerateInputValues,
} from '../schema';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sparkles,
  Calendar,
  FileText,
  Loader2,
  CheckSquare,
  Square,
  School,
  GraduationCap,
  Info,
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Users,
  Coins,
  Wallet,
  Receipt,
  CheckCircle2,
  Search,
  ChevronRight,
  TrendingDown,
} from 'lucide-react';
import { toast } from 'sonner';

const formatCurrency = (amount: number | string): string => {
  return `NPR ${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const QUARTERS = [
  { id: 'Q1', name: 'Quarter 1', months: 'Baishakh, Jestha, Ashadh', period: 'Months 1-3' },
  { id: 'Q2', name: 'Quarter 2', months: 'Shrawan, Bhadra, Ashwin', period: 'Months 4-6' },
  { id: 'Q3', name: 'Quarter 3', months: 'Kartik, Mangsir, Poush', period: 'Months 7-9' },
  { id: 'Q4', name: 'Quarter 4', months: 'Magh, Falgun, Chaitra', period: 'Months 10-12' },
] as const;

export const BatchBillingPage: React.FC = () => {
  const { activeTenantId } = useAuth();
  const navigate = useNavigate();
  const { currentYear, isLoading: isLoadingYear } = useCurrentAcademicYear(activeTenantId);

  // Class & Section Selection State
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [generationSummary, setGenerationSummary] = useState<{
    count: number;
    totalPayable: number;
    quarter: string;
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

  // Default Due Date (15 days from today)
  const defaultDueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

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
      billing_month: 'Quarter 1 (Baishakh - Ashadh) Fee Bill',
      fee_structure_ids: [],
      due_date: defaultDueDate,
      notes: '',
      quarter: 'Q1',
      override_30_day_window: false,
      override_reason: '',
      ad_hoc_fee_name: '',
      ad_hoc_fee_amount: undefined,
    },
  });

  const watchedQuarter = watch('quarter') || 'Q1';
  const watchedFeeStructureIds = watch('fee_structure_ids') || [];
  const watchedOverride = watch('override_30_day_window') || false;
  const watchedAdHocName = watch('ad_hoc_fee_name') || '';
  const watchedAdHocAmount = watch('ad_hoc_fee_amount') || 0;

  // Query window status for active quarter
  const { data: windowStatus, isLoading: isLoadingWindow } = useQuarterWindowStatus(
    activeTenantId,
    watchedQuarter
  );

  // Batch Generation Mutation
  const batchBillMutation = useBatchGenerateBills(activeTenantId);

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

  // Sync quarter selection title
  const handleQuarterChange = (quarterId: 'Q1' | 'Q2' | 'Q3' | 'Q4') => {
    setValue('quarter', quarterId);
    const qObj = QUARTERS.find((q) => q.id === quarterId);
    if (qObj) {
      setValue('billing_month', `${qObj.name} (${qObj.months}) Fee Bill`);
    }
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

  // Calculate base per-student fee (excluding student-specific transport/hostel)
  const baseQuarterFeePerStudent = useMemo(() => {
    let total = 0;
    for (const s of selectedStructures) {
      const amount = Number(s.amount) || 0;
      if (s.frequency === 'MONTHLY') {
        total += amount * 3;
      } else {
        total += amount;
      }
    }
    if (watchedAdHocAmount > 0) {
      total += Number(watchedAdHocAmount);
    }
    return total;
  }, [selectedStructures, watchedAdHocAmount]);

  // Estimated Class Total
  const estimatedClassTotal = baseQuarterFeePerStudent * filteredStudents.length;

  const onFormSubmit = async (values: BatchBillGenerateFormValues) => {
    try {
      const formattedData: BatchBillGenerateFormValues = {
        ...values,
        class_id: selectedClassId,
        section_id: selectedSectionId ? selectedSectionId : undefined,
        billing_month: values.billing_month?.trim() || undefined,
        notes: values.notes?.trim() || undefined,
        quarter: values.quarter || 'Q1',
        override_30_day_window: Boolean(values.override_30_day_window),
        override_reason: values.override_reason?.trim() || undefined,
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
        quarter: watchedQuarter,
        className: selectedClass?.name || 'Class',
      });
      setIsSuccessModalOpen(true);
    } catch {
      // Toast handled by mutation hook
    }
  };

  const isWindowBlocked = windowStatus && !windowStatus.is_window_open && !watchedOverride;

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto">
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
            <span className="text-xs font-medium text-foreground">Batch Invoicing</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            Quarterly Batch Invoicing Engine
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Generate official quarterly invoices with 30-day window guard, duplicate lock, and student advance credit deductions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
            <Lock className="w-3.5 h-3.5 text-primary" />
            <span>Session: {isLoadingYear ? 'Loading...' : currentYear?.name || 'Active Session'} (Locked)</span>
          </div>

          <Link to="/finance/bills">
            <Button variant="outline" size="sm" className="text-xs gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              View Invoices
            </Button>
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ======================================================== */}
          {/* LEFT COLUMN: CONFIGURATION CONTROLS (7 COLS)              */}
          {/* ======================================================== */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Quarter Selection & Window Guard */}
            <Card className="border-border/60 shadow-xs">
              <CardHeader className="p-4 sm:p-5 pb-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      1. Select Billing Quarter
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Pick the academic quarter. Monthly fees will be aggregated for 3 months.
                    </CardDescription>
                  </div>
                  {windowStatus && (
                    <Badge
                      variant={windowStatus.is_window_open ? 'success' : 'warning'}
                      className="gap-1 font-mono text-[11px]"
                    >
                      {windowStatus.is_window_open ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Window Open
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Window Locked
                        </>
                      )}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-2 space-y-4">
                {/* 4 Quarter Pill Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {QUARTERS.map((q) => {
                    const isSelected = watchedQuarter === q.id;
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => handleQuarterChange(q.id as any)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-primary bg-primary/10 shadow-2xs ring-2 ring-primary/20'
                            : 'border-border/60 hover:border-border hover:bg-muted/40'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className={`text-xs font-bold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                            {q.id}
                          </span>
                          <span className="text-[10px] uppercase font-mono text-muted-foreground">
                            {q.period}
                          </span>
                        </div>
                        <div className="text-[11px] font-medium text-foreground/90 truncate">
                          {q.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                          {q.months}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Window Guard Status Banner */}
                {windowStatus && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs flex flex-col gap-2 ${
                      windowStatus.is_window_open
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-200'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {windowStatus.is_window_open ? (
                        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                      )}
                      <div className="space-y-1 flex-1">
                        <div className="font-semibold text-xs flex items-center justify-between">
                          <span>
                            {windowStatus.is_window_open
                              ? `Generation Window Active for ${windowStatus.quarter_name}`
                              : `Generation Window Locked for ${windowStatus.quarter_name}`}
                          </span>
                          <span className="font-mono text-[11px]">
                            {windowStatus.days_until_window_open > 0
                              ? `Opens in ${windowStatus.days_until_window_open} days`
                              : 'Ready for Generation'}
                          </span>
                        </div>
                        <p className="text-[11px] opacity-90 leading-relaxed">
                          Quarter cycle spans <span className="font-mono font-bold">{windowStatus.start_date}</span> to{' '}
                          <span className="font-mono font-bold">{windowStatus.end_date}</span>. Generation is permitted
                          within 30 days before quarter end (opened on <span className="font-mono font-bold">{windowStatus.window_open_date}</span>).
                        </p>
                      </div>
                    </div>

                    {/* Admin Override Toggle if Locked */}
                    {!windowStatus.is_window_open && (
                      <div className="pt-2.5 mt-1 border-t border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="override-switch"
                            checked={watchedOverride}
                            onCheckedChange={(checked) => setValue('override_30_day_window', Boolean(checked))}
                          />
                          <Label htmlFor="override-switch" className="text-xs font-semibold cursor-pointer">
                            Enable Admin Early Generation Override
                          </Label>
                        </div>
                        {watchedOverride && (
                          <div className="w-full sm:w-1/2">
                            <Input
                              placeholder="Reason for early generation..."
                              {...register('override_reason')}
                              className="text-xs h-7 bg-background"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 2: Target Class, Section & Dates */}
            <Card className="border-border/60 shadow-xs">
              <CardHeader className="p-4 sm:p-5 pb-3">
                <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
                  <School className="w-4 h-4 text-primary" />
                  2. Target Class & Invoice Parameters
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

                  {/* Billing Title */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold">Invoice Title / Month Description</Label>
                    <Input
                      placeholder="e.g., Quarter 1 (Baishakh - Ashadh) Fee Bill"
                      {...register('billing_month')}
                      className="text-xs h-9"
                    />
                  </div>

                  {/* Due Date */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Payment Due Date <span className="text-destructive">*</span>
                    </Label>
                    <Input type="date" {...register('due_date')} className="text-xs h-9" />
                    {errors.due_date && (
                      <p className="text-[11px] text-destructive">{errors.due_date.message}</p>
                    )}
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
                      School-level and class-level fee heads. Monthly heads will be multiplied by 3.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
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
                      const isMonthly = structure.frequency === 'MONTHLY';
                      const quarterAmount = isMonthly ? Number(structure.amount) * 3 : Number(structure.amount);

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
                                {formatCurrency(quarterAmount)}
                                {isMonthly && (
                                  <span className="text-[10px] text-muted-foreground font-normal ml-1">
                                    (3x {formatCurrency(structure.amount)})
                                  </span>
                                )}
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

            {/* Step 4: Optional Class Ad-Hoc Fee */}
            <Card className="border-border/60 shadow-xs">
              <CardHeader className="p-4 sm:p-5 pb-3">
                <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  4. Optional Class-Level Ad-Hoc Charge
                </CardTitle>
                <CardDescription className="text-xs">
                  Inject an optional one-time class fee into all generated bills (e.g., Term Exam Fee, Field Trip).
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Ad-Hoc Fee Title</Label>
                    <Input
                      placeholder="e.g., Term 1 Exam & Material Fee"
                      {...register('ad_hoc_fee_name')}
                      className="text-xs h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Amount (NPR)</Label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="e.g., 500"
                      {...register('ad_hoc_fee_amount')}
                      className="text-xs h-9"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ======================================================== */}
          {/* RIGHT COLUMN: COHORT PREVIEW & AUDIT SUMMARY (5 COLS)     */}
          {/* ======================================================== */}
          <div className="lg:col-span-5 space-y-6">
            {/* Live Financial Impact Summary */}
            <Card className="border-primary/30 bg-primary/5 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-primary/20 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Billing Cohort Projection
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
                      {formatCurrency(baseQuarterFeePerStudent)}
                    </div>
                    <span className="text-[10px] text-muted-foreground">Includes 3-mo tuition</span>
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
                    Quarterly Invoicing Rules
                  </div>
                  <ul className="list-disc list-inside space-y-1 pl-1">
                    <li>Duplicate generation is strictly locked to prevent double receivables.</li>
                    <li>Individual student facility fees (hostel, bus) are auto-calculated for 3 months.</li>
                    <li>Advance credits in student wallets will automatically reduce net payable.</li>
                  </ul>
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
                              ~{formatCurrency(baseQuarterFeePerStudent)}
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

        {/* ======================================================== */}
        {/* STICKY BOTTOM GENERATION BAR                             */}
        {/* ======================================================== */}
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-md border-t border-border/60 py-3.5 px-4 sm:px-8 shadow-lg">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-foreground block">
                  Batch: {selectedClass?.name || 'Class'} • {watchedQuarter} Cycle
                </span>
                <span className="text-muted-foreground text-[11px]">
                  {filteredStudents.length} students selected • ~{formatCurrency(estimatedClassTotal)} estimated total
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Link to="/finance/bills">
                <Button type="button" variant="outline" size="sm" className="text-xs">
                  Cancel
                </Button>
              </Link>

              <Button
                type="submit"
                disabled={batchBillMutation.isPending || isWindowBlocked || filteredStudents.length === 0}
                className="gap-2 text-xs font-bold px-6 shadow-xs cursor-pointer w-full sm:w-auto"
              >
                {batchBillMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating Invoices...
                  </>
                ) : isWindowBlocked ? (
                  <>
                    <Lock className="w-4 h-4" />
                    Window Locked (Needs Override)
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate {filteredStudents.length} Invoices for {watchedQuarter}
                  </>
                )}
              </Button>
            </div>
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
                Batch quarterly billing was recorded for {generationSummary.className} ({generationSummary.quarter}).
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 text-xs space-y-2 text-left font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground font-sans">Total Invoices:</span>
                <span className="font-bold">{generationSummary.count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-sans">Quarter:</span>
                <span className="font-bold">{generationSummary.quarter}</span>
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
