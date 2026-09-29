import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTenantRollover } from '../hooks';
import {
  tenantRolloverSchema,
  type TenantRolloverForm,
  type TenantRolloverSummaryResponse,
} from '../schema';
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
import { Checkbox } from '@/components/ui/checkbox';
import { NepaliDatePicker } from '@/components/ui/nepali-date-picker';
import {
  AlertCircle,
  CheckCircle2,
  GraduationCap,
  Loader2,
  RefreshCw,
  Users,
  BookOpen,
} from 'lucide-react';
import { formatDualDateRange } from '@/features/school-settings/utils/nepaliDate';
import { useCalendarPreferenceStore } from '@/stores/calendarPreferenceStore';

export interface TenantRolloverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  tenantName?: string;
}

export const TenantRolloverDialog: React.FC<TenantRolloverDialogProps> = ({
  open,
  onOpenChange,
  tenantId,
  tenantName,
}) => {
  const { calendarSystem } = useCalendarPreferenceStore();
  const rolloverMutation = useTenantRollover();
  const [summary, setSummary] = useState<TenantRolloverSummaryResponse | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TenantRolloverForm>({
    resolver: zodResolver(tenantRolloverSchema),
    defaultValues: {
      name: '',
      start_date: '',
      end_date: '',
      copy_teacher_assignments: true,
    },
  });

  const startDate = watch('start_date');
  const endDate = watch('end_date');
  const copyAssignments = watch('copy_teacher_assignments');

  const handleClose = () => {
    reset();
    setSummary(null);
    onOpenChange(false);
  };

  const onSubmit = async (data: TenantRolloverForm) => {
    try {
      const res = await rolloverMutation.mutateAsync({
        tenantId,
        data,
      });
      const summaryData = (res as any)?.data?.academic_year_name !== undefined ? (res as any).data : (res as any);
      setSummary(summaryData);
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
            Rollover Academic Session
          </DialogTitle>
          <DialogDescription>
            Roll over {tenantName || 'school'} to a new academic year, advance student cohorts, and optionally copy faculty assignments.
          </DialogDescription>
        </DialogHeader>

        {summary ? (
          <div className="space-y-4 pt-2">
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-green-900 dark:text-green-200 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400 mt-0.5" />
              <div>
                <h4 className="font-semibold text-green-800 dark:text-green-300">Rollover Completed Successfully</h4>
                <p className="text-sm text-green-700 dark:text-green-400 mt-0.5">
                  Academic session <strong>{summary.academic_year_name}</strong> is now the active session for {tenantName || 'your school'}.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border p-3 text-center bg-muted/40">
                <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                  <Users className="w-3.5 h-3.5" />
                  <span>Promoted</span>
                </div>
                <p className="text-xl font-bold text-foreground">{summary.total_students_promoted}</p>
              </div>
              <div className="rounded-lg border p-3 text-center bg-muted/40">
                <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Graduated</span>
                </div>
                <p className="text-xl font-bold text-foreground">{summary.total_students_graduated}</p>
              </div>
              <div className="rounded-lg border p-3 text-center bg-muted/40">
                <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Faculty Copied</span>
                </div>
                <p className="text-xl font-bold text-foreground">{summary.teacher_assignments_copied}</p>
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
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="text-xs leading-relaxed space-y-1">
                <p className="font-semibold text-amber-800 dark:text-amber-300">
                  Important Rollover Rules:
                </p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>Current active session will be marked closed.</li>
                  <li>Active students in each class will advance sequentially to the next class according to the school's progression order.</li>
                  <li>Students in the final grade will graduate into alumni.</li>
                  <li>Teachers will retain their class/subject assignments if the toggle is checked.</li>
                </ul>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenant-rollover-name">
                New Session Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tenant-rollover-name"
                placeholder="e.g. Academic Session 2083/2084"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <NepaliDatePicker
                id="tenant-rollover-start-date"
                label="Start Date *"
                value={startDate}
                onChange={(val) => setValue('start_date', val, { shouldValidate: true })}
                error={errors.start_date?.message}
              />
              <NepaliDatePicker
                id="tenant-rollover-end-date"
                label="End Date *"
                value={endDate}
                onChange={(val) => setValue('end_date', val, { shouldValidate: true })}
                error={errors.end_date?.message}
              />
            </div>

            {startDate && endDate && (
              <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded border">
                <span className="font-medium text-foreground">Duration: </span>
                {formatDualDateRange(startDate, endDate, calendarSystem)}
              </div>
            )}

            <div className="rounded-lg border p-3 bg-muted/20">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="copy_teacher_assignments"
                  checked={copyAssignments}
                  onCheckedChange={(checked) =>
                    setValue('copy_teacher_assignments', !!checked, { shouldValidate: true })
                  }
                  className="mt-0.5"
                />
                <div className="space-y-1 leading-none">
                  <Label
                    htmlFor="copy_teacher_assignments"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Preserve Teacher Class & Subject Assignments
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically replicate class teacher and subject teacher allocations into the new academic year.
                  </p>
                </div>
              </div>
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
