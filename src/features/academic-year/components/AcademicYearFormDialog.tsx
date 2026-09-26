import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/auth/useAuth';
import { useCreateAcademicYear } from '../hooks';
import { academicYearSchema, type AcademicYearForm } from '../schema';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NepaliDatePicker } from '@/components/ui/nepali-date-picker';
import { Loader2 } from 'lucide-react';

interface AcademicYearFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetTenantId?: string | null;
  targetTenantName?: string | null;
}

export const AcademicYearFormDialog: React.FC<AcademicYearFormDialogProps> = ({
  open,
  onOpenChange,
  targetTenantId,
  targetTenantName,
}) => {
  const { activeTenantId } = useAuth();
  const tenantIdToUse = targetTenantId || activeTenantId;
  const createMutation = useCreateAcademicYear();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AcademicYearForm>({
    resolver: zodResolver(academicYearSchema),
    defaultValues: {
      name: '',
      start_date: '',
      end_date: '',
    },
  });

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const onSubmit = async (data: AcademicYearForm) => {
    if (!tenantIdToUse) return;
    try {
      await createMutation.mutateAsync({
        tenantId: tenantIdToUse,
        data,
      });
      handleClose();
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) handleClose();
      else onOpenChange(val);
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Academic Year</DialogTitle>
          <DialogDescription>
            {targetTenantName
              ? `Define a new academic year for ${targetTenantName}. Start and end dates are required.`
              : 'Define a new academic year for the school. Start and end dates are required.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
            <Input id="name" placeholder="e.g. 2024-2025" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <NepaliDatePicker
              id="start_date"
              label="Start Date *"
              value={watch('start_date')}
              onChange={(val) => setValue('start_date', val, { shouldValidate: true })}
              error={errors.start_date?.message}
            />
            <NepaliDatePicker
              id="end_date"
              label="End Date *"
              value={watch('end_date')}
              onChange={(val) => setValue('end_date', val, { shouldValidate: true })}
              error={errors.end_date?.message}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Year
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
