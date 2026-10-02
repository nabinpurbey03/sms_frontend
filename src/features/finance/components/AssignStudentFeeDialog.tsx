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
import { UserCheck, Loader2 } from 'lucide-react';
import { studentFeeAssignmentSchema, type StudentFeeAssignmentFormValues } from '../schema';
import type { StudentFeeAssignmentCreateDTO } from '../types';

interface AssignStudentFeeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  onSubmit: (data: StudentFeeAssignmentCreateDTO) => Promise<any>;
  isLoading: boolean;
}

export const AssignStudentFeeDialog: React.FC<AssignStudentFeeDialogProps> = ({
  isOpen,
  onClose,
  studentId,
  studentName,
  onSubmit,
  isLoading,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StudentFeeAssignmentFormValues>({
    resolver: zodResolver(studentFeeAssignmentSchema),
    defaultValues: {
      student_id: studentId,
      fee_name: '',
      fee_category: 'HOSTEL',
      frequency: 'MONTHLY',
      amount: undefined,
      notes: '',
    },
  });

  useEffect(() => {
    reset({
      student_id: studentId,
      fee_name: '',
      fee_category: 'HOSTEL',
      frequency: 'MONTHLY',
      amount: undefined,
      notes: '',
    });
  }, [studentId, reset]);

  const onFormSubmit = async (values: StudentFeeAssignmentFormValues) => {
    try {
      await onSubmit({
        student_id: values.student_id,
        fee_name: values.fee_name.trim(),
        fee_category: values.fee_category,
        frequency: values.frequency,
        amount: values.amount,
        notes: values.notes?.trim() || null,
      });
      onClose();
    } catch {
      // Handled by parent toast
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <DialogHeader>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-1">
              <UserCheck className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold">Assign Student Fee Head</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add an individual service or recurring charge for{' '}
              <strong className="text-foreground">{studentName}</strong> (e.g. Hostel, Canteen, Special Coaching).
            </DialogDescription>
          </DialogHeader>

          <input type="hidden" {...register('student_id')} />

          <div className="space-y-3.5">
            {/* Fee Name */}
            <div className="space-y-1.5">
              <Label htmlFor="fee_name" className="text-xs font-semibold">
                Fee Head Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fee_name"
                placeholder="e.g. Hostel Boarding, Evening Coaching, Special Music"
                className="text-xs h-9"
                {...register('fee_name')}
              />
              {errors.fee_name && (
                <p className="text-destructive text-[11px] font-medium">{errors.fee_name.message}</p>
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
                  <option value="HOSTEL">Hostel / Boarding</option>
                  <option value="TRANSPORT">Transportation</option>
                  <option value="ACTIVITY">Special Activity / Club</option>
                  <option value="TUITION">Remedial / Coaching</option>
                  <option value="LAB">Special Equipment / Lab</option>
                  <option value="MISC">Miscellaneous Add-on</option>
                </select>
                {errors.fee_category && (
                  <p className="text-destructive text-[11px] font-medium">{errors.fee_category.message}</p>
                )}
              </div>

              {/* Frequency */}
              <div className="space-y-1.5">
                <Label htmlFor="frequency" className="text-xs font-semibold">
                  Frequency <span className="text-destructive">*</span>
                </Label>
                <select
                  id="frequency"
                  {...register('frequency')}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="TERMWISE">Term-wise</option>
                  <option value="YEARLY">Yearly</option>
                  <option value="ONE_TIME">One Time</option>
                </select>
                {errors.frequency && (
                  <p className="text-destructive text-[11px] font-medium">{errors.frequency.message}</p>
                )}
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="amount" className="text-xs font-semibold">
                Amount (NPR) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="e.g. 4000"
                className="text-xs h-9 font-mono"
                {...register('amount', { valueAsNumber: true })}
              />
              {errors.amount && (
                <p className="text-destructive text-[11px] font-medium">{errors.amount.message}</p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-semibold">
                Notes / Allocation Details <span className="text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Input
                id="notes"
                placeholder="e.g. Room 204, Bed B, Diet Plan 1"
                className="text-xs h-9"
                {...register('notes')}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isLoading} className="gap-1.5">
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Assign Fee Head
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
