import React, { useState, useEffect } from 'react';
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
import { Percent, Loader2 } from 'lucide-react';
import {
  studentDiscountSchema,
  type StudentDiscountFormValues,
  type StudentDiscountInputValues,
} from '../schema';
import type { StudentDiscount } from '../types';
import { useClasses, useClassStudents } from '@/features/academic/hooks';

interface StudentDiscountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: StudentDiscountFormValues) => Promise<any>;
  isLoading: boolean;
  tenantId: string | null;
  initialData?: StudentDiscount | null;
}

export const StudentDiscountDialog: React.FC<StudentDiscountDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  tenantId,
  initialData,
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const { data: classesData } = useClasses(tenantId);
  const classes = classesData || [];

  const { data: studentsData, isLoading: isLoadingStudents } = useClassStudents(
    tenantId,
    selectedClassId || null
  );
  const students = studentsData || [];

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<StudentDiscountInputValues, any, StudentDiscountFormValues>({
    resolver: zodResolver(studentDiscountSchema),
    defaultValues: {
      student_id: '',
      discount_percent: 0,
      is_transport_applicable: false,
      reason: '',
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        student_id: initialData.student_id,
        discount_percent: Number(initialData.discount_percent),
        is_transport_applicable: Boolean(initialData.is_transport_applicable),
        reason: initialData.reason || '',
      });
    } else {
      reset({
        student_id: '',
        discount_percent: 0,
        is_transport_applicable: false,
        reason: '',
      });
    }
  }, [initialData, reset]);

  const onFormSubmit = async (values: StudentDiscountFormValues) => {
    try {
      await onSubmit(values);
      onClose();
    } catch {
      // Handled by hook toast
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <DialogHeader>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-1">
              <Percent className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold">
              {initialData ? 'Update Student Concession' : 'Assign Student Concession'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define a percentage discount automatically deducted from student monthly/recurring bills during batch billing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5">
            {!initialData && (
              <>
                {/* Class Filter */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Filter by Class</Label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => {
                      setSelectedClassId(e.target.value);
                      setValue('student_id', '');
                    }}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Select a class to find student...</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Student Selection */}
                <div className="space-y-1.5">
                  <Label htmlFor="student_id" className="text-xs font-semibold">
                    Student <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="student_id"
                    {...register('student_id')}
                    disabled={!selectedClassId || isLoadingStudents}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                  >
                    <option value="">
                      {!selectedClassId
                        ? 'Select class first'
                        : isLoadingStudents
                        ? 'Loading students...'
                        : students.length === 0
                        ? 'No active students found'
                        : 'Select a student...'}
                    </option>
                    {students.map((st) => {
                      const name = [st.first_name, st.middle_name, st.last_name].filter(Boolean).join(' ');
                      return (
                        <option key={st.id} value={st.id}>
                          {name}
                        </option>
                      );
                    })}
                  </select>
                  {errors.student_id && (
                    <p className="text-destructive text-[11px] font-medium">{errors.student_id.message}</p>
                  )}
                </div>
              </>
            )}

            {initialData && (
              <div className="p-2.5 rounded-lg bg-muted/60 border text-xs">
                <span className="text-muted-foreground">Student: </span>
                <span className="font-semibold text-foreground">{initialData.student_name || 'Selected Student'}</span>
              </div>
            )}

            {/* Discount Percentage */}
            <div className="space-y-1.5">
              <Label htmlFor="discount_percent" className="text-xs font-semibold">
                Discount Percentage (%) <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="discount_percent"
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  placeholder="e.g. 20"
                  className="text-xs h-9 pr-8 font-mono"
                  {...register('discount_percent', { valueAsNumber: true })}
                />
                <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-bold">%</span>
              </div>
              {errors.discount_percent && (
                <p className="text-destructive text-[11px] font-medium">{errors.discount_percent.message}</p>
              )}
            </div>

            {/* Concession Reason */}
            <div className="space-y-1.5">
              <Label htmlFor="reason" className="text-xs font-semibold">
                Reason / Category <span className="text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Input
                id="reason"
                placeholder="e.g. Merit Scholarship, Sibling Concession, Staff Ward"
                className="text-xs h-9"
                {...register('reason')}
              />
              {errors.reason && (
                <p className="text-destructive text-[11px] font-medium">{errors.reason.message}</p>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isLoading} className="gap-1.5">
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save Concession
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
