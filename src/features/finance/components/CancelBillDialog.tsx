import React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Ban,
  AlertTriangle,
  Wallet,
  RotateCcw,
  Loader2,
  Calendar,
  User,
  GraduationCap,
} from 'lucide-react';
import type { FeeBill } from '../types';
import { useCalendarPreferenceStore } from '@/stores/calendarPreferenceStore';
import { formatDate } from '@/features/school-settings/utils/nepaliDate';

interface CancelBillDialogProps {
  bill: FeeBill | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  isPending: boolean;
}

export const CancelBillDialog: React.FC<CancelBillDialogProps> = ({
  bill,
  isOpen,
  onClose,
  onConfirm,
  isPending,
}) => {
  const { calendarSystem } = useCalendarPreferenceStore();

  if (!bill) return null;

  const totalPayable = Number(bill.total_payable || 0);
  const dueAmount = Number(bill.due_amount || 0);
  const advanceApplied = Number(bill.advance_applied_amount || 0);
  const previousDue = Number(bill.previous_due_amount || 0);

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && !isPending && onClose()}>
      <AlertDialogContent className="max-w-md p-6 gap-5">
        <AlertDialogHeader className="space-y-2 text-left">
          <div className="w-11 h-11 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive mb-1 shadow-2xs">
            <Ban className="w-5 h-5 text-destructive" />
          </div>
          <AlertDialogTitle className="text-lg font-bold tracking-tight text-foreground flex items-center justify-between">
            <span>Void & Cancel Fee Bill</span>
            <Badge variant="outline" className="font-mono text-xs font-semibold">
              #{bill.bill_number}
            </Badge>
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-muted-foreground">
            Are you sure you want to cancel this bill? This will void the invoice and remove its outstanding charges from the student ledger.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Bill Context Card */}
        <div className="bg-muted/40 rounded-xl p-3.5 border border-border/60 text-xs space-y-2">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{bill.student_name || 'Student'}</span>
            </div>
            {bill.class_name && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-background px-2 py-0.5 rounded-md border border-border/40">
                <GraduationCap className="w-3 h-3" />
                {bill.class_name}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] pt-0.5">
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Bill Title</span>
              <span className="font-medium text-foreground">{bill.bill_title}</span>
              {bill.billing_month && (
                <span className="text-muted-foreground text-[10px] block">Month: {bill.billing_month}</span>
              )}
            </div>

            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Due Date</span>
              <span className="font-medium text-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3 text-muted-foreground" />
                {formatDate(bill.due_date, calendarSystem)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/40 font-mono">
            <span className="text-muted-foreground text-xs font-sans">Total Billed Payable:</span>
            <span className="text-xs font-bold text-foreground">
              NPR {totalPayable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Informational Callouts for Domain Side-Effects */}
        <div className="space-y-2">
          {advanceApplied > 0 && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs">
              <Wallet className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div>
                <span className="font-semibold block">Advance Credit Refund</span>
                <span>
                  NPR {advanceApplied.toFixed(2)} previously deducted from advance balance will automatically be restored to the student's wallet.
                </span>
              </div>
            </div>
          )}

          {previousDue > 0 && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-200 text-xs">
              <RotateCcw className="w-4 h-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
              <div>
                <span className="font-semibold block">Prior Arrears Restored</span>
                <span>
                  Carried prior balance of NPR {previousDue.toFixed(2)} will be unrolled and restored as active balance on originating bills.
                </span>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/60 border border-border/60 text-muted-foreground text-[11px] leading-relaxed">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground" />
            <span>
              Bill number <strong className="font-mono text-foreground">#{bill.bill_number}</strong> will be preserved in audit records as <strong className="text-foreground">CANCELLED</strong> to maintain fiscal invoice sequence integrity.
            </span>
          </div>
        </div>

        {/* Dialog Actions */}
        <AlertDialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <AlertDialogCancel
            disabled={isPending}
            onClick={onClose}
            className="mt-0 h-9 text-xs font-medium cursor-pointer"
          >
            Keep Bill
          </AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={() => onConfirm()}
            className="h-9 text-xs font-semibold gap-1.5 shadow-2xs cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Cancelling Bill...</span>
              </>
            ) : (
              <>
                <Ban className="w-3.5 h-3.5" />
                <span>Void & Cancel Bill</span>
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
