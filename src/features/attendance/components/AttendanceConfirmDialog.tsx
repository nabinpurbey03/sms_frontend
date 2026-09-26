import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CalendarCheck, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export interface AttendanceConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  isPending: boolean;
  isAlreadyMarked: boolean;
  isEditing: boolean;
  recordDate: string;
  classTitle: string;
  sectionTitle: string;
  presentCount: number;
  absentCount: number;
  attendancePercentage: number;
}

export const AttendanceConfirmDialog: React.FC<AttendanceConfirmDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  isPending,
  isAlreadyMarked,
  isEditing,
  recordDate,
  classTitle,
  sectionTitle,
  presentCount,
  absentCount,
  attendancePercentage,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-primary" />
            {isAlreadyMarked && isEditing ? 'Update Attendance?' : 'Submit Attendance?'}
          </DialogTitle>
          <DialogDescription>
            Please review the attendance summary before confirming.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Date */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Date</span>
            <span className="font-medium">
              {recordDate &&
                new Date(recordDate + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
            </span>
          </div>

          {/* Section */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Section</span>
            <span className="font-medium">
              {classTitle} — {sectionTitle}
            </span>
          </div>

          {/* Divider */}
          <div className="border-t" />

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-emerald-500/10 p-2.5">
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                {presentCount}
              </p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Present</p>
            </div>
            <div className="rounded-lg bg-rose-500/10 p-2.5">
              <p className="text-lg font-bold text-rose-700 dark:text-rose-300">
                {absentCount}
              </p>
              <p className="text-[11px] text-rose-600 dark:text-rose-400">Absent</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-2.5">
              <p className="text-lg font-bold text-primary">{attendancePercentage}%</p>
              <p className="text-[11px] text-muted-foreground">Rate</p>
            </div>
          </div>

          {/* Warning for 0% or 100% */}
          {(attendancePercentage === 0 || attendancePercentage === 100) && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {attendancePercentage === 0
                ? 'All students are marked absent. Please confirm this is correct.'
                : 'All students are marked present. Please confirm this is correct.'}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer"
          >
            Go Back
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isPending}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {isAlreadyMarked && isEditing ? 'Confirm Update' : 'Confirm Submit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
