import React, { useEffect, useMemo } from 'react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Coins,
  Loader2,
  School,
  GraduationCap,
  Building2,
  Info,
  Sparkles,
  Calculator,
  Lock,
  ArrowRight,
  CheckCircle2,
  Repeat,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  feeStructureFormSchema,
  type FeeStructureFormValues,
  type FeeStructureInputValues,
} from '../schema';
import type { FeeStructure } from '../types';
import { useClasses } from '@/features/academic/hooks';

interface FeeStructureDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FeeStructureFormValues) => Promise<any>;
  isLoading: boolean;
  tenantId: string | null;
  initialData?: FeeStructure | null;
  defaultClassId?: string;
  defaultFeeLevel?: 'SCHOOL' | 'CLASS' | 'STUDENT';
}

const CATEGORY_GROUPS = [
  {
    groupLabel: 'Academic & Instruction',
    options: [
      { value: 'TUITION', label: 'Tuition Fee', hint: 'Regular classroom teaching' },
      { value: 'EXAM', label: 'Examination Fee', hint: 'Term exams & assessment materials' },
      { value: 'ADMISSION', label: 'Admission Fee', hint: 'Enrollment & registration' },
      { value: 'COACHING', label: 'Coaching / Tutoring', hint: 'Remedial or board prep coaching' },
    ],
  },
  {
    groupLabel: 'Campus Facilities & Services',
    options: [
      { value: 'TRANSPORT', label: 'Transportation', hint: 'Bus / van transit route' },
      { value: 'HOSTEL', label: 'Hostel / Boarding', hint: 'Dormitory accommodation & care' },
      { value: 'CANTEEN', label: 'Canteen / Meals', hint: 'Nutritious lunch / snack plan' },
      { value: 'LAB', label: 'Laboratory Fee', hint: 'Science, IT, & robotics practicals' },
      { value: 'LIBRARY', label: 'Library Fee', hint: 'Books, journals & reading room' },
    ],
  },
  {
    groupLabel: 'Institutional & Co-Curricular',
    options: [
      { value: 'MANAGEMENT', label: 'School Management Fee', hint: 'Institutional upkeep & services' },
      { value: 'ACTIVITY', label: 'Activity / Sports Fee', hint: 'Sports, clubs, arts & events' },
      { value: 'SCHOLARSHIP', label: 'Scholarship / Concession', hint: 'Institutional concession relief' },
      { value: 'MISC', label: 'Miscellaneous Fee', hint: 'Other ad-hoc or unlisted heads' },
    ],
  },
] as const;

const FREQUENCIES: Array<{
  id: 'MONTHLY' | 'TERMWISE' | 'YEARLY' | 'ONE_TIME';
  label: string;
  badge: string;
  quarterMultiplier: string;
  desc: string;
}> = [
  {
    id: 'MONTHLY',
    label: 'Monthly',
    badge: '12x / Year',
    quarterMultiplier: '× 3 per quarter',
    desc: 'Scales across 3 months in quarterly billing',
  },
  {
    id: 'TERMWISE',
    label: 'Term / Quarter',
    badge: '4x / Year',
    quarterMultiplier: '1x per cycle',
    desc: 'Billed once per quarterly invoice cycle',
  },
  {
    id: 'YEARLY',
    label: 'Annual',
    badge: '1x / Year',
    quarterMultiplier: 'Annual levy',
    desc: 'Billed once per academic session',
  },
  {
    id: 'ONE_TIME',
    label: 'One-Time',
    badge: 'Single',
    quarterMultiplier: 'On admission',
    desc: 'Charged once at enrollment or initiation',
  },
];

const PRESET_SUGGESTIONS: Record<
  'SCHOOL' | 'CLASS' | 'STUDENT',
  Array<{
    name: string;
    category: FeeStructureFormValues['fee_category'];
    frequency: FeeStructureFormValues['frequency'];
    defaultAmount?: number;
  }>
> = {
  SCHOOL: [
    {
      name: 'School Management & Maintenance Fee',
      category: 'MANAGEMENT',
      frequency: 'MONTHLY',
      defaultAmount: 500,
    },
    {
      name: 'Annual IT & Smart Class Infrastructure',
      category: 'MANAGEMENT',
      frequency: 'YEARLY',
      defaultAmount: 2500,
    },
    {
      name: 'Campus Safety & Health Development',
      category: 'MANAGEMENT',
      frequency: 'YEARLY',
      defaultAmount: 1200,
    },
  ],
  CLASS: [
    {
      name: 'Monthly Tuition Fee',
      category: 'TUITION',
      frequency: 'MONTHLY',
      defaultAmount: 2500,
    },
    {
      name: 'Terminal Examination Fee',
      category: 'EXAM',
      frequency: 'TERMWISE',
      defaultAmount: 800,
    },
    {
      name: 'Computer & Science Practical Lab',
      category: 'LAB',
      frequency: 'MONTHLY',
      defaultAmount: 400,
    },
    {
      name: 'Annual Sports & Activity Charge',
      category: 'ACTIVITY',
      frequency: 'YEARLY',
      defaultAmount: 1500,
    },
  ],
  STUDENT: [
    {
      name: 'AC Bus Transportation (Route 1)',
      category: 'TRANSPORT',
      frequency: 'MONTHLY',
      defaultAmount: 1800,
    },
    {
      name: 'Boys Hostel Deluxe (Full Boarding)',
      category: 'HOSTEL',
      frequency: 'MONTHLY',
      defaultAmount: 8500,
    },
    {
      name: 'Nutritious Cafeteria Lunch Plan',
      category: 'CANTEEN',
      frequency: 'MONTHLY',
      defaultAmount: 2200,
    },
    {
      name: 'Evening Board Prep Tutoring',
      category: 'COACHING',
      frequency: 'MONTHLY',
      defaultAmount: 1500,
    },
  ],
};

const formatNpr = (val: number): string => {
  return `NPR ${val.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const FeeStructureDialog: React.FC<FeeStructureDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  tenantId,
  initialData,
  defaultClassId,
  defaultFeeLevel = 'CLASS',
}) => {
  const { data: classesData, isLoading: isLoadingClasses } = useClasses(tenantId);
  const classes = classesData || [];

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FeeStructureInputValues, any, FeeStructureFormValues>({
    resolver: zodResolver(feeStructureFormSchema),
    defaultValues: {
      fee_level: defaultFeeLevel,
      class_id: defaultClassId || '',
      name: '',
      fee_category: 'TUITION',
      frequency: 'MONTHLY',
      amount: undefined,
      description: '',
      is_active: true,
    },
  });

  const watchedFeeLevel = watch('fee_level') || 'CLASS';
  const watchedFrequency = watch('frequency') || 'MONTHLY';
  const watchedAmount = watch('amount');
  const watchedClassId = watch('class_id');
  const watchedCategory = watch('fee_category');

  // Pre-fill or reset form on open / change
  useEffect(() => {
    if (initialData) {
      reset({
        fee_level: (initialData.fee_level as 'SCHOOL' | 'CLASS' | 'STUDENT') || 'CLASS',
        class_id: initialData.class_id || '',
        name: initialData.name,
        fee_category: initialData.fee_category,
        frequency: initialData.frequency,
        amount: Number(initialData.amount),
        description: initialData.description || '',
        is_active: initialData.is_active ?? true,
      });
    } else {
      reset({
        fee_level: defaultFeeLevel,
        class_id:
          defaultFeeLevel === 'SCHOOL'
            ? ''
            : defaultClassId || (classes.length > 0 ? classes[0].id : ''),
        name: '',
        fee_category: defaultFeeLevel === 'SCHOOL' ? 'MANAGEMENT' : 'TUITION',
        frequency: 'MONTHLY',
        amount: undefined,
        description: '',
        is_active: true,
      });
    }
  }, [initialData, defaultClassId, defaultFeeLevel, reset, classes]);

  const onFormSubmit = async (values: FeeStructureFormValues) => {
    try {
      const payload: FeeStructureFormValues = {
        ...values,
        class_id: values.fee_level === 'SCHOOL' ? '' : values.class_id,
        is_active: values.is_active ?? true,
      };
      await onSubmit(payload);
      onClose();
    } catch {
      // Toast notification handled by mutation hook
    }
  };

  const handleApplyPreset = (preset: (typeof PRESET_SUGGESTIONS)['CLASS'][0]) => {
    setValue('name', preset.name, { shouldValidate: true });
    setValue('fee_category', preset.category, { shouldValidate: true });
    setValue('frequency', preset.frequency, { shouldValidate: true });
    if (preset.defaultAmount && (!watchedAmount || watchedAmount <= 0)) {
      setValue('amount', preset.defaultAmount, { shouldValidate: true });
    }
  };

  const currentClassObj = useMemo(() => {
    return classes.find((c) => c.id === watchedClassId);
  }, [classes, watchedClassId]);

  // Live financial billing calculation
  const numericAmount = Number(watchedAmount) || 0;
  const financialProjections = useMemo(() => {
    if (numericAmount <= 0) return null;

    if (watchedFrequency === 'MONTHLY') {
      return {
        unit: 'per month',
        quarterly: numericAmount * 3,
        annual: numericAmount * 12,
        quarterLabel: 'Per Quarter (3 Months):',
        annualLabel: 'Full Academic Year (12 Mo):',
        summaryText: `Each quarterly bill includes 3x this rate (${formatNpr(numericAmount * 3)}).`,
      };
    }
    if (watchedFrequency === 'TERMWISE') {
      return {
        unit: 'per term/quarter',
        quarterly: numericAmount,
        annual: numericAmount * 4,
        quarterLabel: 'Per Quarter Bill:',
        annualLabel: 'Estimated Year (4 Terms):',
        summaryText: `Applied once in each quarterly invoice cycle (${formatNpr(numericAmount)}).`,
      };
    }
    if (watchedFrequency === 'YEARLY') {
      return {
        unit: 'per academic year',
        quarterly: numericAmount,
        annual: numericAmount,
        quarterLabel: 'Annual Billing Session:',
        annualLabel: 'Total Year Charge:',
        summaryText: `Levied once per academic year for qualifying students (${formatNpr(numericAmount)}).`,
      };
    }
    return {
      unit: 'one-time charge',
      quarterly: numericAmount,
      annual: numericAmount,
      quarterLabel: 'One-Time Initiation:',
      annualLabel: 'Total Charge:',
      summaryText: `Charged once upon enrollment or ad-hoc registration (${formatNpr(numericAmount)}).`,
    };
  }, [numericAmount, watchedFrequency]);

  const activePresets = PRESET_SUGGESTIONS[watchedFeeLevel] || [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] flex flex-col p-0 overflow-hidden border-border/80 shadow-2xl">
        <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-col flex-1 overflow-hidden">
          {/* 1. Header */}
          <DialogHeader className="p-5 sm:p-6 pb-4 border-b border-border/60 bg-muted/20 shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-2xs">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                    {initialData ? 'Edit Fee Head' : 'Add Fee Structure'}
                    <Badge variant="outline" className="text-[10px] font-mono font-medium">
                      {initialData ? 'Modification' : 'New Setup'}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Define standardized fee heads, collection frequencies, and automatic billing scaling rules.
                  </DialogDescription>
                </div>
              </div>

              {currentClassObj && watchedFeeLevel === 'CLASS' && (
                <Badge
                  variant="secondary"
                  className="hidden sm:inline-flex text-[11px] gap-1 px-2.5 py-1 bg-primary/10 text-primary border-primary/20"
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  {currentClassObj.name}
                </Badge>
              )}
            </div>
          </DialogHeader>

          {/* 2. Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            {/* Scope / Level Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-primary" />
                  1. Fee Scope & Level <span className="text-destructive">*</span>
                </Label>
                {initialData && (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Lock className="w-3 h-3 text-muted-foreground" />
                    Scope locked in edit mode
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* School Level */}
                <button
                  type="button"
                  disabled={!!initialData}
                  onClick={() => {
                    setValue('fee_level', 'SCHOOL', { shouldValidate: true });
                    setValue('class_id', '', { shouldValidate: true });
                    if (!watch('name')) {
                      setValue('fee_category', 'MANAGEMENT');
                    }
                  }}
                  className={`relative p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    watchedFeeLevel === 'SCHOOL'
                      ? 'border-primary bg-primary/5 shadow-xs ring-2 ring-primary/20'
                      : 'border-border/70 hover:border-border hover:bg-muted/40 text-muted-foreground'
                  } ${initialData ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        watchedFeeLevel === 'SCHOOL'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <School className="w-4 h-4" />
                    </div>
                    {watchedFeeLevel === 'SCHOOL' && (
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground block">School Level</span>
                    <span className="text-[11px] text-muted-foreground leading-tight mt-0.5 block">
                      Universal for all students across every grade
                    </span>
                  </div>
                </button>

                {/* Class Level */}
                <button
                  type="button"
                  disabled={!!initialData}
                  onClick={() => {
                    setValue('fee_level', 'CLASS', { shouldValidate: true });
                    if (classes.length > 0 && !watch('class_id')) {
                      setValue('class_id', classes[0].id, { shouldValidate: true });
                    }
                  }}
                  className={`relative p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    watchedFeeLevel === 'CLASS'
                      ? 'border-primary bg-primary/5 shadow-xs ring-2 ring-primary/20'
                      : 'border-border/70 hover:border-border hover:bg-muted/40 text-muted-foreground'
                  } ${initialData ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        watchedFeeLevel === 'CLASS'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    {watchedFeeLevel === 'CLASS' && (
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground block">Class Level</span>
                    <span className="text-[11px] text-muted-foreground leading-tight mt-0.5 block">
                      Grade specific (e.g. Tuition, Lab, Term Exam)
                    </span>
                  </div>
                </button>

                {/* Student Facility Preset */}
                <button
                  type="button"
                  disabled={!!initialData}
                  onClick={() => {
                    setValue('fee_level', 'STUDENT', { shouldValidate: true });
                    setValue('class_id', '', { shouldValidate: true });
                    if (!watch('name')) {
                      setValue('fee_category', 'HOSTEL');
                    }
                  }}
                  className={`relative p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    watchedFeeLevel === 'STUDENT'
                      ? 'border-primary bg-primary/5 shadow-xs ring-2 ring-primary/20'
                      : 'border-border/70 hover:border-border hover:bg-muted/40 text-muted-foreground'
                  } ${initialData ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        watchedFeeLevel === 'STUDENT'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                    </div>
                    {watchedFeeLevel === 'STUDENT' && (
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground block">Facility Preset</span>
                    <span className="text-[11px] text-muted-foreground leading-tight mt-0.5 block">
                      Individual add-ons (Hostel, Route Bus, Canteen)
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Target Class Selection (Only when Class Level is active) */}
            {watchedFeeLevel === 'CLASS' && (
              <div className="p-3.5 rounded-xl bg-muted/30 border border-border/70 space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="class_id" className="text-xs font-semibold text-foreground">
                    Target Class / Grade Cohort <span className="text-destructive">*</span>
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    Fee head will apply to all students in this class
                  </span>
                </div>
                <select
                  id="class_id"
                  {...register('class_id')}
                  disabled={isLoadingClasses || !!initialData}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 font-medium"
                >
                  <option value="">Select a class cohort...</option>
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
            )}

            {/* Scope Explanatory Callout */}
            {watchedFeeLevel === 'SCHOOL' && (
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-start gap-2.5 text-xs text-blue-800 dark:text-blue-300">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                <div className="space-y-0.5">
                  <span className="font-semibold block">Campus-Wide Inclusion</span>
                  <p className="text-[11px] leading-relaxed opacity-90">
                    This fee head is automatically injected into all batch invoice runs across every class and student cohort in the school.
                  </p>
                </div>
              </div>
            )}

            {watchedFeeLevel === 'STUDENT' && (
              <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-start gap-2.5 text-xs text-indigo-800 dark:text-indigo-300">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400" />
                <div className="space-y-0.5">
                  <span className="font-semibold block">Catalog Facility Template</span>
                  <p className="text-[11px] leading-relaxed opacity-90">
                    Creates an opt-in service profile template in the school catalog. Assign it to individual students via the Student Facility Drawer or Bulk Assign dialog.
                  </p>
                </div>
              </div>
            )}

            {/* Quick Suggestions / Presets */}
            {activePresets.length > 0 && !initialData && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span>Quick Standard Presets:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activePresets.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-border/80 bg-background hover:bg-primary/5 hover:border-primary/50 text-foreground transition-all cursor-pointer shadow-2xs"
                    >
                      <span className="text-primary font-bold">+</span>
                      <span>{preset.name}</span>
                      {preset.defaultAmount && (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          ({formatNpr(preset.defaultAmount)})
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Fee Head Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-semibold text-foreground">
                Fee Head Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder={
                  watchedFeeLevel === 'SCHOOL'
                    ? 'e.g. School Management Fee, Annual IT Infrastructure'
                    : watchedFeeLevel === 'STUDENT'
                    ? 'e.g. AC Bus Route 1, Boys Hostel Deluxe, Cafeteria Meal Plan'
                    : 'e.g. Monthly Tuition Fee, Computer Practical Lab'
                }
                className="text-xs h-9"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-destructive text-[11px] font-medium">{errors.name.message}</p>
              )}
            </div>

            {/* Category & Frequency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Category */}
              <div className="space-y-1.5">
                <Label htmlFor="fee_category" className="text-xs font-semibold text-foreground">
                  Fee Category <span className="text-destructive">*</span>
                </Label>
                <select
                  id="fee_category"
                  {...register('fee_category')}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {CATEGORY_GROUPS.map((group) => (
                    <optgroup key={group.groupLabel} label={group.groupLabel}>
                      {group.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label} — {opt.hint}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {errors.fee_category && (
                  <p className="text-destructive text-[11px] font-medium">{errors.fee_category.message}</p>
                )}
              </div>

              {/* Amount Input */}
              <div className="space-y-1.5">
                <Label htmlFor="amount" className="text-xs font-semibold text-foreground">
                  Base Amount (NPR) <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-mono font-bold text-muted-foreground select-none">
                    NPR
                  </span>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 2500"
                    className="text-xs h-9 pl-12 font-mono font-semibold"
                    {...register('amount', { valueAsNumber: true })}
                  />
                </div>
                {errors.amount && (
                  <p className="text-destructive text-[11px] font-medium">{errors.amount.message}</p>
                )}
              </div>
            </div>

            {/* Billing Frequency Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Repeat className="w-3.5 h-3.5 text-primary" />
                Billing Frequency & Quarterly Multiplier <span className="text-destructive">*</span>
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {FREQUENCIES.map((freq) => {
                  const isSelected = watchedFrequency === freq.id;
                  return (
                    <button
                      key={freq.id}
                      type="button"
                      onClick={() => setValue('frequency', freq.id, { shouldValidate: true })}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-2xs ring-1 ring-primary'
                          : 'border-border/70 hover:border-border hover:bg-muted/40 text-muted-foreground'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-bold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                          {freq.label}
                        </span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0 font-mono">
                          {freq.badge}
                        </Badge>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium leading-tight">
                        {freq.quarterMultiplier}
                      </span>
                    </button>
                  );
                })}
              </div>
              {errors.frequency && (
                <p className="text-destructive text-[11px] font-medium">{errors.frequency.message}</p>
              )}
            </div>

            {/* Live Financial Projection Card */}
            {financialProjections && (
              <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs font-bold text-foreground">
                  <div className="flex items-center gap-1.5 text-primary">
                    <Calculator className="w-4 h-4" />
                    <span>Live Billing Projection</span>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">
                    Rate: {formatNpr(numericAmount)} {financialProjections.unit}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-2.5 rounded-lg bg-background border border-border/60">
                    <span className="text-[10px] font-semibold text-muted-foreground block">
                      {financialProjections.quarterLabel}
                    </span>
                    <span className="text-sm font-bold font-mono text-foreground mt-0.5 block">
                      {formatNpr(financialProjections.quarterly)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-background border border-border/60">
                    <span className="text-[10px] font-semibold text-muted-foreground block">
                      {financialProjections.annualLabel}
                    </span>
                    <span className="text-sm font-bold font-mono text-foreground mt-0.5 block">
                      {formatNpr(financialProjections.annual)}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed pt-0.5">
                  <span className="font-semibold text-foreground">Notice: </span>
                  {financialProjections.summaryText}
                </p>
              </div>
            )}

            {/* Description / Memo */}
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-semibold text-foreground">
                Description / Ledger Remarks <span className="text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Add contextual remarks, eligibility criteria, or notes printed on fee invoices..."
                rows={2}
                className="text-xs resize-none"
                {...register('description')}
              />
              {errors.description && (
                <p className="text-destructive text-[11px] font-medium">{errors.description.message}</p>
              )}
            </div>

            {/* Status Toggle (Only when editing an existing fee head) */}
            {Boolean(initialData) && (
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-muted/20">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="is_active" className="text-xs font-bold text-foreground cursor-pointer">
                      Status: Active in Billing
                    </Label>
                    {watch('is_active') ? (
                      <Badge className="text-[10px] py-0 px-1.5 font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-medium text-muted-foreground border-border/70">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {watch('is_active')
                      ? 'Active fee heads are included when generating batch and individual invoices.'
                      : 'Inactive fee heads are paused and will not be included in new invoices.'}
                  </p>
                </div>
                <Checkbox
                  id="is_active"
                  checked={watch('is_active') ?? true}
                  onCheckedChange={(checked) => {
                    setValue('is_active', Boolean(checked), { shouldValidate: true });
                  }}
                  className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                />
              </div>
            )}
          </div>

          {/* 3. Footer */}
          <DialogFooter className="p-4 sm:p-5 border-t border-border/60 bg-muted/20 shrink-0 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isLoading}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isLoading}
              className="gap-1.5 text-xs font-bold shadow-xs cursor-pointer px-5"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving Fee Head...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  {initialData ? 'Update Fee Structure' : 'Create Fee Structure'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
