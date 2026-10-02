import React, { useEffect } from 'react';
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
import { Coins, Loader2, School, GraduationCap, Building2, Info } from 'lucide-react';
import { feeStructureFormSchema, type FeeStructureFormValues } from '../schema';
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
  } = useForm<FeeStructureFormValues>({
    resolver: zodResolver(feeStructureFormSchema),
    defaultValues: {
      fee_level: defaultFeeLevel,
      class_id: defaultClassId || '',
      name: '',
      fee_category: 'TUITION',
      frequency: 'MONTHLY',
      amount: undefined,
      description: '',
    },
  });

  const selectedFeeLevel = watch('fee_level') || 'CLASS';

  useEffect(() => {
    if (initialData) {
      reset({
        fee_level: (initialData.fee_level as 'SCHOOL' | 'CLASS') || 'CLASS',
        class_id: initialData.class_id || '',
        name: initialData.name,
        fee_category: initialData.fee_category,
        frequency: initialData.frequency,
        amount: Number(initialData.amount),
        description: initialData.description || '',
      });
    } else {
      reset({
        fee_level: defaultFeeLevel,
        class_id: defaultFeeLevel === 'SCHOOL' ? '' : (defaultClassId || (classes.length > 0 ? classes[0].id : '')),
        name: '',
        fee_category: defaultFeeLevel === 'SCHOOL' ? 'MANAGEMENT' : 'TUITION',
        frequency: 'MONTHLY',
        amount: undefined,
        description: '',
      });
    }
  }, [initialData, defaultClassId, defaultFeeLevel, reset, classes]);

  const onFormSubmit = async (values: FeeStructureFormValues) => {
    try {
      const payload: FeeStructureFormValues = {
        ...values,
        class_id: values.fee_level === 'SCHOOL' ? '' : values.class_id,
      };
      await onSubmit(payload);
      onClose();
    } catch {
      // Handled by hook toast
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <DialogHeader>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-1">
              <Coins className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold">
              {initialData ? 'Edit Fee Head' : 'Add Fee Structure'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure fee rates at School Level (all students) or Class Level (specific grade).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5">
            {/* Level Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Fee Structure Level</Label>
              <div className="grid grid-cols-3 gap-2">
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
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all text-left cursor-pointer ${
                    selectedFeeLevel === 'SCHOOL'
                      ? 'border-primary bg-primary/10 text-primary shadow-2xs font-bold'
                      : 'border-border/70 hover:bg-muted/60 text-muted-foreground'
                  }`}
                >
                  <School className="w-4 h-4 shrink-0 text-primary" />
                  <div>
                    <span className="block font-semibold text-foreground">School Level</span>
                    <span className="text-[10px] text-muted-foreground">Every student in school</span>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={!!initialData}
                  onClick={() => {
                    setValue('fee_level', 'CLASS', { shouldValidate: true });
                    if (classes.length > 0 && !watch('class_id')) {
                      setValue('class_id', classes[0].id, { shouldValidate: true });
                    }
                  }}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all text-left cursor-pointer ${
                    selectedFeeLevel === 'CLASS'
                      ? 'border-primary bg-primary/10 text-primary shadow-2xs font-bold'
                      : 'border-border/70 hover:bg-muted/60 text-muted-foreground'
                  }`}
                >
                  <GraduationCap className="w-4 h-4 shrink-0 text-primary" />
                  <div>
                    <span className="block font-semibold text-foreground">Class Level</span>
                    <span className="text-[10px] text-muted-foreground">Specific class / grade</span>
                  </div>
                </button>

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
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all text-left cursor-pointer ${
                    selectedFeeLevel === 'STUDENT'
                      ? 'border-primary bg-primary/10 text-primary shadow-2xs font-bold'
                      : 'border-border/70 hover:bg-muted/60 text-muted-foreground'
                  }`}
                >
                  <Building2 className="w-4 h-4 shrink-0 text-indigo-500" />
                  <div>
                    <span className="block font-semibold text-foreground">Facility Preset</span>
                    <span className="text-[10px] text-muted-foreground">Hostel, Meals, Bus</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Level-Specific Explanatory Banners or Class Selector */}
            {selectedFeeLevel === 'SCHOOL' ? (
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-start gap-2.5 text-xs text-blue-700 dark:text-blue-300">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">School-Wide Scope</span>
                  <p className="text-[11px] opacity-90 mt-0.5">
                    This fee applies to all students across all grades (e.g. School Management Fee, Annual IT Infrastructure Fee, Campus Development).
                  </p>
                </div>
              </div>
            ) : selectedFeeLevel === 'STUDENT' ? (
              <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-start gap-2.5 text-xs text-indigo-700 dark:text-indigo-300">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Student Facility Preset</span>
                  <p className="text-[11px] opacity-90 mt-0.5">
                    This preset acts as a school-wide catalog template (e.g. Boys Hostel Deluxe, AC Bus Route, Canteen Plan) for assigning to individual students.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="class_id" className="text-xs font-semibold">
                  Target Class / Grade Level <span className="text-destructive">*</span>
                </Label>
                <select
                  id="class_id"
                  {...register('class_id')}
                  disabled={isLoadingClasses || !!initialData}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
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
            )}

            {/* Fee Head Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-semibold">
                Fee Head Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder={
                  selectedFeeLevel === 'SCHOOL'
                    ? 'e.g. School Management Fee, Annual Campus Fee'
                    : selectedFeeLevel === 'STUDENT'
                    ? 'e.g. Boys Hostel Deluxe, Full-Board Canteen, Route 3 Bus'
                    : 'e.g. Monthly Tuition Fee, Science Lab Fee'
                }
                className="text-xs h-9"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-destructive text-[11px] font-medium">{errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Category */}
              <div className="space-y-1.5">
                <Label htmlFor="fee_category" className="text-xs font-semibold">
                  Category <span className="text-destructive">*</span>
                </Label>
                <select
                  id="fee_category"
                  {...register('fee_category')}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="MANAGEMENT">School Management Fee</option>
                  <option value="TUITION">Tuition Fee</option>
                  <option value="ADMISSION">Admission Fee</option>
                  <option value="EXAM">Examination Fee</option>
                  <option value="TRANSPORT">Transportation</option>
                  <option value="HOSTEL">Hostel / Boarding</option>
                  <option value="CANTEEN">Canteen / Meals</option>
                  <option value="COACHING">Coaching / Tutoring</option>
                  <option value="LAB">Laboratory Fee</option>
                  <option value="LIBRARY">Library Fee</option>
                  <option value="ACTIVITY">Activity / Sports</option>
                  <option value="SCHOLARSHIP">Scholarship / Concession</option>
                  <option value="MISC">Miscellaneous</option>
                </select>
                {errors.fee_category && (
                  <p className="text-destructive text-[11px] font-medium">{errors.fee_category.message}</p>
                )}
              </div>

              {/* Frequency */}
              <div className="space-y-1.5">
                <Label htmlFor="frequency" className="text-xs font-semibold">
                  Billing Frequency <span className="text-destructive">*</span>
                </Label>
                <select
                  id="frequency"
                  {...register('frequency')}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="YEARLY">Yearly (Annual)</option>
                  <option value="TERMWISE">Term-wise / Trimester</option>
                  <option value="ONE_TIME">One Time</option>
                </select>
                {errors.frequency && (
                  <p className="text-destructive text-[11px] font-medium">{errors.frequency.message}</p>
                )}
              </div>
            </div>

            {/* Standard Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="amount" className="text-xs font-semibold">
                Amount (NPR / Currency) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="e.g. 500"
                className="text-xs h-9 font-mono"
                {...register('amount', { valueAsNumber: true })}
              />
              {errors.amount && (
                <p className="text-destructive text-[11px] font-medium">{errors.amount.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-semibold">
                Description / Memo <span className="text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Input
                id="description"
                placeholder="Optional notes or eligibility terms"
                className="text-xs h-9"
                {...register('description')}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isLoading} className="gap-1.5">
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {initialData ? 'Update Fee Head' : 'Save Fee Head'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
