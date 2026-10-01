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
import { Coins, Loader2 } from 'lucide-react';
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
}

export const FeeStructureDialog: React.FC<FeeStructureDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  tenantId,
  initialData,
  defaultClassId,
}) => {
  const { data: classesData, isLoading: isLoadingClasses } = useClasses(tenantId);
  const classes = classesData || [];

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FeeStructureFormValues>({
    resolver: zodResolver(feeStructureFormSchema),
    defaultValues: {
      class_id: defaultClassId || '',
      name: '',
      fee_category: 'TUITION',
      frequency: 'MONTHLY',
      amount: undefined,
      description: '',
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        class_id: initialData.class_id,
        name: initialData.name,
        fee_category: initialData.fee_category,
        frequency: initialData.frequency,
        amount: Number(initialData.amount),
        description: initialData.description || '',
      });
    } else {
      reset({
        class_id: defaultClassId || (classes.length > 0 ? classes[0].id : ''),
        name: '',
        fee_category: 'TUITION',
        frequency: 'MONTHLY',
        amount: undefined,
        description: '',
      });
    }
  }, [initialData, defaultClassId, reset, classes]);

  const onFormSubmit = async (values: FeeStructureFormValues) => {
    try {
      await onSubmit(values);
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
              {initialData ? 'Edit Fee Head' : 'Add Class Fee Structure'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define fee categories, recurring frequencies, and standard amounts applied to students in this class.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5">
            {/* Class Selection */}
            <div className="space-y-1.5">
              <Label htmlFor="class_id" className="text-xs font-semibold">
                Class / Grade Level <span className="text-destructive">*</span>
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

            {/* Fee Head Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-semibold">
                Fee Head Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g. Monthly Tuition Fee, Management Fee, Science Lab Fee"
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
                  <option value="TUITION">Tuition Fee</option>
                  <option value="ADMISSION">Admission Fee</option>
                  <option value="EXAM">Examination Fee</option>
                  <option value="TRANSPORT">Transportation</option>
                  <option value="HOSTEL">Hostel / Boarding</option>
                  <option value="LAB">Laboratory Fee</option>
                  <option value="LIBRARY">Library Fee</option>
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
                placeholder="e.g. 2500"
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
