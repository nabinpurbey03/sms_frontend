import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Loader2,
  CheckSquare,
  Square,
  School,
  GraduationCap,
  Info,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Calculator,
  PlusCircle,
} from 'lucide-react';
import {
  batchBillGenerateSchema,
  type BatchBillGenerateFormValues,
  type BatchBillGenerateInputValues,
} from '../schema';
import { useClasses, useClassSections } from '@/features/academic/hooks';
import { useFeeStructures, useQuarterWindowStatus } from '../hooks';

interface BatchBillGenerateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: BatchBillGenerateFormValues) => Promise<any>;
  isLoading: boolean;
  tenantId: string | null;
}

const QUARTERS = [
  { id: 'Q1', label: 'Q1', months: 'Baishakh - Ashadh', description: 'First Quarter' },
  { id: 'Q2', label: 'Q2', months: 'Shrawan - Ashwin', description: 'Second Quarter' },
  { id: 'Q3', label: 'Q3', months: 'Kartik - Poush', description: 'Third Quarter' },
  { id: 'Q4', label: 'Q4', months: 'Magh - Chaitra', description: 'Fourth Quarter' },
] as const;

export const BatchBillGenerateDialog: React.FC<BatchBillGenerateDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  tenantId,
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const { data: classesData } = useClasses(tenantId);
  const classes = classesData || [];

  const { data: sectionsData } = useClassSections(tenantId, selectedClassId || null);
  const sections = sectionsData || [];

  // Query School-Level Fee Structures
  const { data: schoolFeesData, isLoading: isLoadingSchoolFees } = useFeeStructures(
    tenantId,
    { fee_level: 'SCHOOL', is_active: true }
  );
  const schoolFees = schoolFeesData || [];

  // Query Class-Level Fee Structures
  const { data: classFeesData, isLoading: isLoadingClassFees } = useFeeStructures(
    tenantId,
    selectedClassId ? { class_id: selectedClassId, fee_level: 'CLASS', is_active: true } : undefined
  );
  const classFees = classFeesData || [];

  const allAvailableStructures = useMemo(() => {
    return [...schoolFees, ...classFees];
  }, [schoolFees, classFees]);

  // Default due date to 15 days from today
  const defaultDueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BatchBillGenerateInputValues, any, BatchBillGenerateFormValues>({
    resolver: zodResolver(batchBillGenerateSchema),
    defaultValues: {
      class_id: '',
      section_id: '',
      billing_month: '',
      quarter: 'Q1',
      fee_structure_ids: [],
      due_date: defaultDueDate,
      notes: '',
      override_30_day_window: false,
      override_reason: '',
      ad_hoc_fee_name: '',
      ad_hoc_fee_amount: undefined,
    },
  });

  const watchedFeeStructureIds = watch('fee_structure_ids') || [];
  const watchedQuarter = (watch('quarter') || 'Q1') as 'Q1' | 'Q2' | 'Q3' | 'Q4';
  const watchOverride = watch('override_30_day_window') || false;
  const watchedAdHocFeeName = watch('ad_hoc_fee_name');
  const watchedAdHocFeeAmount = watch('ad_hoc_fee_amount');

  // Check 30-Day Quarterly Window Status
  const { data: windowStatus, isLoading: isLoadingWindow } = useQuarterWindowStatus(
    tenantId,
    watchedQuarter
  );

  const isWindowLocked = Boolean(windowStatus && !windowStatus.is_window_open);
  const isSubmitBlockedByWindow = isWindowLocked && !watchOverride;

  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
      setValue('class_id', classes[0].id);
    }
  }, [classes, selectedClassId, setValue]);

  // When class or available structures change, auto-select all school fees + class fees
  useEffect(() => {
    if (allAvailableStructures.length > 0) {
      setValue(
        'fee_structure_ids',
        allAvailableStructures.map((f) => f.id)
      );
    } else {
      setValue('fee_structure_ids', []);
    }
  }, [allAvailableStructures, setValue]);

  const toggleStructure = (id: string) => {
    const current = new Set(watchedFeeStructureIds);
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    setValue('fee_structure_ids', Array.from(current), { shouldValidate: true });
  };

  const selectAll = () => {
    setValue(
      'fee_structure_ids',
      allAvailableStructures.map((f) => f.id),
      { shouldValidate: true }
    );
  };

  const deselectAll = () => {
    setValue('fee_structure_ids', [], { shouldValidate: true });
  };

  // Quarterly calculation: monthly fees multiplied by 3, plus ad-hoc fee
  const selectedFeeStructuresTotal = allAvailableStructures
    .filter((f) => watchedFeeStructureIds.includes(f.id))
    .reduce((acc, f) => {
      const multiplier = f.frequency === 'MONTHLY' ? 3 : 1;
      return acc + Number(f.amount) * multiplier;
    }, 0);

  const parsedAdHocAmount =
    watchedAdHocFeeAmount && !Number.isNaN(Number(watchedAdHocFeeAmount)) && Number(watchedAdHocFeeAmount) > 0
      ? Number(watchedAdHocFeeAmount)
      : 0;

  const totalEstimatedSubtotal = selectedFeeStructuresTotal + parsedAdHocAmount;

  const onFormSubmit = async (values: BatchBillGenerateFormValues) => {
    try {
      const formattedData: BatchBillGenerateFormValues = {
        ...values,
        quarter: watchedQuarter,
        ad_hoc_fee_name: values.ad_hoc_fee_name?.trim() || undefined,
        ad_hoc_fee_amount:
          values.ad_hoc_fee_amount && !Number.isNaN(values.ad_hoc_fee_amount) && values.ad_hoc_fee_amount > 0
            ? Number(values.ad_hoc_fee_amount)
            : undefined,
        override_reason: values.override_reason?.trim() || undefined,
      };
      await onSubmit(formattedData);
      onClose();
    } catch {
      // Handled by mutation hook
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <DialogHeader>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-1">
              <Sparkles className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold">1-Click Quarterly Batch Bill Invoicing</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Generate 3-month consolidated bills with automatic monthly fee scaling, 30-day window protection, and optional class ad-hoc surcharges.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5">
            {/* 1. Quarter Selector Tabs */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">
                  Billing Quarter <span className="text-destructive">*</span>
                </Label>
                <span className="text-[11px] text-muted-foreground">Nepali Academic Calendar</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {QUARTERS.map((q) => {
                  const isSelected = watchedQuarter === q.id;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setValue('quarter', q.id, { shouldValidate: true })}
                      className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary'
                          : 'border-border bg-card hover:bg-accent/40 text-muted-foreground'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-xs font-bold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                          {q.id}
                        </span>
                        {isSelected && (
                          <Badge className="text-[9px] px-1 py-0 h-4 bg-primary text-primary-foreground">
                            Active
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-0.5 font-medium leading-tight">
                        {q.months}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Window Status Check & Alert */}
            {isLoadingWindow ? (
              <div className="p-3 rounded-lg border border-dashed text-xs text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                <span>Checking 30-day billing window status...</span>
              </div>
            ) : windowStatus?.is_window_open ? (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-semibold text-emerald-800 dark:text-emerald-300">
                      30-Day Billing Window Active
                    </div>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400/90 mt-0.5">
                      Regular invoicing is open for {windowStatus.quarter_name} (opened {windowStatus.window_open_date}).
                    </p>
                  </div>
                </div>
                <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] px-2 py-0.5 shrink-0">
                  Window Open
                </Badge>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-amber-800 dark:text-amber-300">
                        Window Locked — Opens in {windowStatus?.days_until_window_open ?? 'X'} days (on {windowStatus?.window_open_date})
                      </span>
                      <p className="text-[11px] text-amber-700 dark:text-amber-300/90 mt-0.5">
                        Regular batch invoicing opens 30 days before quarter end on {windowStatus?.end_date}. Early generation requires admin authorization.
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-amber-500/60 text-amber-700 dark:text-amber-300 text-[10px] shrink-0 font-medium">
                    Locked
                  </Badge>
                </div>

                {/* Admin Override Toggle */}
                <div className="pt-2 border-t border-amber-500/20 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      {...register('override_30_day_window')}
                      className="rounded border-amber-400 text-amber-600 focus:ring-amber-500 w-4 h-4"
                    />
                    <span className="text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                      Authorize Early Generation (Admin Override)
                    </span>
                  </label>

                  {watchOverride && (
                    <div className="pl-6 space-y-1">
                      <Input
                        id="override_reason"
                        placeholder="Reason for early billing (e.g. Principal authorized early term dispatch)..."
                        className="text-xs h-8 bg-background border-amber-300 dark:border-amber-600"
                        {...register('override_reason')}
                      />
                      <p className="text-[10px] text-amber-700 dark:text-amber-400">
                        This override action will be tracked and audited.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. Class & Section Target */}
            <div className="grid grid-cols-2 gap-3">
              {/* Class Selection */}
              <div className="space-y-1.5">
                <Label htmlFor="class_id" className="text-xs font-semibold">
                  Target Class <span className="text-destructive">*</span>
                </Label>
                <select
                  id="class_id"
                  value={selectedClassId}
                  onChange={(e) => {
                    setSelectedClassId(e.target.value);
                    setValue('class_id', e.target.value);
                    setValue('section_id', '');
                  }}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Select a class...</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
                {errors.class_id && (
                  <p className="text-destructive text-[11px] font-medium">{errors.class_id.message}</p>
                )}
              </div>

              {/* Optional Section Selection */}
              <div className="space-y-1.5">
                <Label htmlFor="section_id" className="text-xs font-semibold">
                  Section <span className="text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <select
                  id="section_id"
                  {...register('section_id')}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">All Sections</option>
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      Section {sec.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 4. Due Date & Optional Custom Billing Label */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="due_date" className="text-xs font-semibold">
                  Due Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="due_date"
                  type="date"
                  className="text-xs h-9"
                  {...register('due_date')}
                />
                {errors.due_date && (
                  <p className="text-destructive text-[11px] font-medium">{errors.due_date.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="billing_month" className="text-xs font-semibold">
                  Cycle / Title Tag <span className="text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <Input
                  id="billing_month"
                  placeholder={`e.g. ${watchedQuarter} 2083/2084`}
                  className="text-xs h-9"
                  {...register('billing_month')}
                />
              </div>
            </div>

            {/* 5. Informative 3x Quarterly Multiplier Banner */}
            <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/25 flex items-start gap-2 text-xs text-blue-900 dark:text-blue-200">
              <Calculator className="w-4 h-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
              <div className="text-[11px] leading-relaxed">
                <span className="font-semibold block text-xs">Quarterly Multiplier Rule</span>
                Monthly recurring fee heads (tuition, monthly transport, facilities) are automatically multiplied by <strong>3 months (3×)</strong> for this invoice. One-time and annual fees remain at standard 1× rate.
              </div>
            </div>

            {/* 6. Fee Heads Checklist Grouped by School Level & Class Level */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">
                  Fee Heads to Include ({watchedFeeStructureIds.length}/{allAvailableStructures.length})
                </Label>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-primary hover:underline font-medium cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-muted-foreground">•</span>
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="text-muted-foreground hover:underline cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {isLoadingSchoolFees || isLoadingClassFees ? (
                <div className="p-4 text-center text-xs text-muted-foreground">Loading fee structures...</div>
              ) : allAvailableStructures.length === 0 ? (
                <div className="p-4 rounded-lg border border-dashed text-center text-xs text-muted-foreground">
                  No active fee structures configured for this session yet.
                </div>
              ) : (
                <div className="max-h-56 overflow-y-auto space-y-3 border rounded-lg p-2.5 bg-muted/20">
                  {/* Group 1: School Level Fee Heads */}
                  {schoolFees.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary px-1">
                        <School className="w-3.5 h-3.5" />
                        <span>School-Wide Fee Heads (Applicable to All Students)</span>
                      </div>
                      <div className="space-y-1">
                        {schoolFees.map((f) => {
                          const isSelected = watchedFeeStructureIds.includes(f.id);
                          const isMonthly = f.frequency === 'MONTHLY';
                          const displayAmount = isMonthly ? Number(f.amount) * 3 : Number(f.amount);
                          return (
                            <div
                              key={f.id}
                              onClick={() => toggleStructure(f.id)}
                              className={`flex items-center justify-between p-2 rounded-md text-xs border cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-blue-500/5 border-blue-500/40 font-medium'
                                  : 'bg-background hover:bg-accent/40 border-border/60 text-muted-foreground'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                                ) : (
                                  <Square className="w-4 h-4 text-muted-foreground shrink-0" />
                                )}
                                <span className="text-foreground">{f.name}</span>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] px-1 py-0 uppercase ${
                                    isMonthly ? 'border-primary/40 text-primary bg-primary/5 font-semibold' : ''
                                  }`}
                                >
                                  {isMonthly ? '3× MONTHLY' : f.frequency}
                                </Badge>
                              </div>
                              <div className="text-right">
                                <span className="font-mono font-bold text-foreground">
                                  NPR {displayAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                                {isMonthly && (
                                  <span className="block text-[10px] text-muted-foreground">
                                    3 × NPR {Number(f.amount).toLocaleString('en-IN')}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Group 2: Class Level Fee Heads */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground px-1">
                      <GraduationCap className="w-3.5 h-3.5 text-foreground" />
                      <span>Class Fee Heads (Grade Specific)</span>
                    </div>
                    {classFees.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground px-1 italic">
                        No specific fee heads configured for this class.
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {classFees.map((f) => {
                          const isSelected = watchedFeeStructureIds.includes(f.id);
                          const isMonthly = f.frequency === 'MONTHLY';
                          const displayAmount = isMonthly ? Number(f.amount) * 3 : Number(f.amount);
                          return (
                            <div
                              key={f.id}
                              onClick={() => toggleStructure(f.id)}
                              className={`flex items-center justify-between p-2 rounded-md text-xs border cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-primary/5 border-primary/40 font-medium'
                                  : 'bg-background hover:bg-accent/40 border-border/60 text-muted-foreground'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                                ) : (
                                  <Square className="w-4 h-4 text-muted-foreground shrink-0" />
                                )}
                                <span className="text-foreground">{f.name}</span>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] px-1 py-0 uppercase ${
                                    isMonthly ? 'border-primary/40 text-primary bg-primary/5 font-semibold' : ''
                                  }`}
                                >
                                  {isMonthly ? '3× MONTHLY' : f.frequency}
                                </Badge>
                              </div>
                              <div className="text-right">
                                <span className="font-mono font-bold text-foreground">
                                  NPR {displayAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                                {isMonthly && (
                                  <span className="block text-[10px] text-muted-foreground">
                                    3 × NPR {Number(f.amount).toLocaleString('en-IN')}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {errors.fee_structure_ids && (
                <p className="text-destructive text-[11px] font-medium">{errors.fee_structure_ids.message}</p>
              )}
            </div>

            {/* 7. Collapsible Accordion for Optional Class-Level Ad-Hoc Fee */}
            <Accordion type="single" collapsible className="w-full border rounded-lg bg-muted/15">
              <AccordionItem value="ad-hoc-fee" className="border-b-0 px-3">
                <AccordionTrigger className="text-xs font-semibold py-2.5 hover:no-underline text-foreground">
                  <div className="flex items-center gap-2">
                    <PlusCircle className="w-4 h-4 text-primary" />
                    <span>Optional Class-Level Ad-Hoc Fee</span>
                    {Boolean(watchedAdHocFeeName || parsedAdHocAmount > 0) && (
                      <Badge variant="secondary" className="text-[10px] py-0 px-1.5 ml-1">
                        Configured
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-1 pb-3 space-y-3">
                  <p className="text-[11px] text-muted-foreground">
                    Inject a one-time class-wide surcharge (e.g. "Term Exam Fee" or "Picnic Charge") into every student's bill for this quarter.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="ad_hoc_fee_name" className="text-xs font-medium">
                        Fee Title
                      </Label>
                      <Input
                        id="ad_hoc_fee_name"
                        placeholder="e.g. Term Exam Fee, Picnic Charge"
                        className="text-xs h-9"
                        {...register('ad_hoc_fee_name')}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ad_hoc_fee_amount" className="text-xs font-medium">
                        Amount (NPR)
                      </Label>
                      <Input
                        id="ad_hoc_fee_amount"
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0.00"
                        className="text-xs h-9 font-mono"
                        {...register('ad_hoc_fee_amount', {
                          setValueAs: (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
                        })}
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* 8. Student Level Automatic Accrual Notice */}
            <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-start gap-2 text-xs text-purple-700 dark:text-purple-300">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Student-Level Facilities & Advance Wallet (Automatic):</span>
                <p className="text-[11px] opacity-90 mt-0.5">
                  Transportation, hostel boarding, and personal add-ons automatically calculate (3× for monthly). Any prepaid advance balance in student wallets is automatically credited toward this bill.
                </p>
              </div>
            </div>

            {/* 9. Estimated Subtotal Banner */}
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-primary">Standard Base Subtotal per Student:</span>
                <p className="text-[11px] text-muted-foreground">
                  3-Month aggregated standard charges
                  {parsedAdHocAmount > 0 && ` + NPR ${parsedAdHocAmount.toLocaleString('en-IN')} ad-hoc fee`}
                </p>
              </div>
              <span className="text-sm font-mono font-bold text-primary">
                NPR {totalEstimatedSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* 10. Optional Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-semibold">
                Bill Memo / Notes <span className="text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Input
                id="notes"
                placeholder="e.g. Please clear dues on or before due date to avoid late penalty."
                className="text-xs h-9"
                {...register('notes')}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isLoading || watchedFeeStructureIds.length === 0 || isSubmitBlockedByWindow}
              className="gap-1.5"
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Generate {watchedQuarter} Batch Bills
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
