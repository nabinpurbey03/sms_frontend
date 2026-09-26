import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { usePlatformRollover } from '../hooks';
import { academicYearSchema, type AcademicYearForm } from '../schema';
import type { PlatformRolloverSummaryDTO } from '../types';
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
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';

interface PlatformRolloverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PlatformRolloverDialog: React.FC<PlatformRolloverDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const rolloverMutation = usePlatformRollover();
  const [summary, setSummary] = useState<PlatformRolloverSummaryDTO | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
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
    setSummary(null);
    onOpenChange(false);
  };

  const onSubmit = async (data: AcademicYearForm) => {
    try {
      const res = await rolloverMutation.mutateAsync(data);
      setSummary(res);
    } catch {
      // Error handled by mutation onError toast
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) handleClose();
        else onOpenChange(val);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-amber-600" />
            Platform Academic Rollover
          </DialogTitle>
          <DialogDescription>
            Initiate a platform-wide academic year rollover across all active tenant schools.
          </DialogDescription>
        </DialogHeader>

        {summary ? (
          <div className="space-y-4 pt-2">
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-green-900 dark:text-green-200 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400 mt-0.5" />
              <div>
                <h4 className="font-semibold text-green-800 dark:text-green-300">Rollover Completed Successfully</h4>
                <p className="text-sm text-green-700 dark:text-green-400 mt-0.5">
                  Academic year <strong>{summary.academic_year_name}</strong> is now active across the platform.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border p-3 text-center bg-muted/40">
                <p className="text-xs text-muted-foreground">Schools Affected</p>
                <p className="text-xl font-bold mt-1 text-foreground">{summary.total_tenants_affected}</p>
              </div>
              <div className="rounded-lg border p-3 text-center bg-muted/40">
                <p className="text-xs text-muted-foreground">Students Promoted</p>
                <p className="text-xl font-bold mt-1 text-foreground">{summary.total_students_promoted}</p>
              </div>
              <div className="rounded-lg border p-3 text-center bg-muted/40">
                <p className="text-xs text-muted-foreground">Students Graduated</p>
                <p className="text-xl font-bold mt-1 text-foreground">{summary.total_students_graduated}</p>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" onClick={handleClose}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 text-amber-900 dark:text-amber-200 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <p className="text-sm leading-relaxed">
                Caution: Platform Rollover will close the current academic year and automatically promote students to their next sequential class across all active schools on the platform. Final-year students will be marked as Graduated.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rollover-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="rollover-name"
                placeholder="e.g. 2081/2082"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <NepaliDatePicker
                id="rollover-start-date"
                label="Start Date *"
                value={watch('start_date')}
                onChange={(val) => setValue('start_date', val, { shouldValidate: true })}
                error={errors.start_date?.message}
              />
              <NepaliDatePicker
                id="rollover-end-date"
                label="End Date *"
                value={watch('end_date')}
                onChange={(val) => setValue('end_date', val, { shouldValidate: true })}
                error={errors.end_date?.message}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={rolloverMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                disabled={rolloverMutation.isPending}
              >
                {rolloverMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {rolloverMutation.isPending ? 'Executing Rollover...' : 'Execute Rollover'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
