import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  AlertTriangle,
  ArrowRight,
  Archive,
  Calendar,
  CalendarCheck2,
  GraduationCap,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useQuickTransitionAcademicYear } from '../hooks';
import type { AcademicYearStatusResponse } from '../types';
import { formatDualDateRange } from '@/features/school-settings/utils/nepaliDate';
import { useCalendarPreferenceStore } from '@/stores/calendarPreferenceStore';

export interface QuickAcademicYearTransitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId?: string | null;
  statusData?: AcademicYearStatusResponse | null;
}

export const QuickAcademicYearTransitionDialog: React.FC<
  QuickAcademicYearTransitionDialogProps
> = ({ open, onOpenChange, tenantId, statusData }) => {
  const [promoteStudents, setPromoteStudents] = useState<boolean>(true);
  const transitionMutation = useQuickTransitionAcademicYear();
  const { calendarSystem } = useCalendarPreferenceStore();

  if (!statusData?.next_year) {
    return null;
  }

  const { current_year, next_year, days_since_ended, eligible_students_count } =
    statusData;

  const handleConfirm = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!tenantId || !next_year.id) return;

    try {
      await transitionMutation.mutateAsync({
        tenantId,
        payload: {
          target_year_id: next_year.id,
          promote_students: promoteStudents,
        },
      });
      onOpenChange(false);
    } catch {
      // Error notification handled by mutation onError callback
    }
  };

  const isPending = transitionMutation.isPending;

  const dualDateText =
    next_year.start_date && next_year.end_date
      ? formatDualDateRange(next_year.start_date, next_year.end_date, calendarSystem)
      : null;

  return (
    <Dialog open={open} onOpenChange={(val) => !isPending && onOpenChange(val)}>
      <DialogContent className="max-w-lg p-6 sm:p-7">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <DialogTitle className="text-xl font-bold tracking-tight">
              Quick Academic Year Transition
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            Transition your school to the next scheduled academic session with automated
            session activation and student cohort rollover.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleConfirm} className="space-y-4 pt-2">
          {/* Current Year Archive Notice */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-amber-950 dark:text-amber-100 flex items-start gap-3">
            <Archive className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="text-xs sm:text-sm space-y-1">
              <div className="font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <span>Archiving Current Session</span>
                {days_since_ended > 0 && (
                  <Badge
                    variant="outline"
                    className="border-amber-500/40 bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[10px] px-1.5 py-0"
                  >
                    Ended {days_since_ended} day{days_since_ended === 1 ? '' : 's'} ago
                  </Badge>
                )}
              </div>
              <p className="text-amber-800/90 dark:text-amber-200/90 text-xs leading-relaxed">
                Academic session{' '}
                <strong className="font-semibold text-foreground">
                  {current_year?.name || 'Current Session'}
                </strong>{' '}
                will be marked as closed and archived into historical records.
              </p>
            </div>
          </div>

          {/* Target Year Card */}
          <div className="rounded-xl border border-border/80 bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <CalendarCheck2 className="w-3.5 h-3.5 text-primary" />
                Target Academic Session
              </span>
              <Badge
                variant="outline"
                className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-semibold px-2 py-0.5"
              >
                Next Active Session
              </Badge>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
              <div className="text-lg font-bold text-foreground">
                {next_year.name}
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                {next_year.start_date} <span className="text-muted-foreground/50">to</span> {next_year.end_date}
              </div>
            </div>

            {dualDateText && (
              <div className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1 border-t border-border/40">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span>Schedule: {dualDateText}</span>
              </div>
            )}
          </div>

          {/* Promotion / Enrollment Stat Pill */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground">
                  Eligible Students for Rollover
                </div>
                <div className="text-base font-bold text-foreground">
                  {eligible_students_count.toLocaleString()}{' '}
                  <span className="text-xs font-normal text-muted-foreground">
                    students enrolled in active classes
                  </span>
                </div>
              </div>
            </div>
            <Badge variant="secondary" className="font-semibold text-xs shrink-0">
              {eligible_students_count} Students
            </Badge>
          </div>

          {/* Promotion Toggle / Checkbox */}
          <div className="rounded-xl border border-border p-3.5 bg-card hover:bg-muted/10 transition-colors">
            <div className="flex items-start gap-3">
              <Checkbox
                id="promote-students-toggle"
                checked={promoteStudents}
                onCheckedChange={(checked) => setPromoteStudents(Boolean(checked))}
                disabled={isPending}
                className="mt-0.5"
              />
              <div className="space-y-1 leading-none select-none cursor-pointer" onClick={() => !isPending && setPromoteStudents(!promoteStudents)}>
                <Label
                  htmlFor="promote-students-toggle"
                  className="text-sm font-semibold text-foreground cursor-pointer flex items-center gap-1.5"
                >
                  Promote enrolled students to next class
                </Label>
                <p className="text-xs text-muted-foreground leading-relaxed pt-0.5">
                  When enabled, students progress to their next class based on the school's progression
                  pipeline (e.g. Grade 1 &rarr; Grade 2), and terminal classes graduate. Uncheck if you prefer
                  to keep current enrollments for manual configuration.
                </p>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <DialogFooter className="pt-3 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-600 dark:hover:bg-amber-700 font-semibold"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Transitioning Session...
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Transition to {next_year.name}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
