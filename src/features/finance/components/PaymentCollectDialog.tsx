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
import { CreditCard, Loader2 } from 'lucide-react';
import { paymentCollectSchema, type PaymentCollectFormValues } from '../schema';
import type { FeeBill, FeePayment } from '../types';

interface PaymentCollectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PaymentCollectFormValues) => Promise<FeePayment | any>;
  isLoading: boolean;
  bill: FeeBill | null;
  onPaymentSuccess?: (payment: FeePayment) => void;
}

export const PaymentCollectDialog: React.FC<PaymentCollectDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  bill,
  onPaymentSuccess,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PaymentCollectFormValues>({
    resolver: zodResolver(paymentCollectSchema),
    defaultValues: {
      bill_id: '',
      amount_paid: undefined,
      payment_method: 'CASH',
      transaction_reference: '',
      remarks: '',
    },
  });

  const dueAmount = bill ? Number(bill.due_amount) : 0;
  const watchedAmount = watch('amount_paid') || 0;
  const remainingAfterPayment = Math.max(0, dueAmount - watchedAmount);

  useEffect(() => {
    if (bill) {
      reset({
        bill_id: bill.id,
        amount_paid: dueAmount,
        payment_method: 'CASH',
        transaction_reference: '',
        remarks: '',
      });
    }
  }, [bill, dueAmount, reset]);

  const onFormSubmit = async (values: PaymentCollectFormValues) => {
    try {
      const payment = await onSubmit(values);
      onClose();
      if (payment && onPaymentSuccess) {
        onPaymentSuccess(payment);
      }
    } catch {
      // Handled by hook toast
    }
  };

  if (!bill) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <DialogHeader>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-1">
              <CreditCard className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold">Collect Fee Payment</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Record full or partial payment against Bill #{bill.bill_number}. An official receipt will be generated.
            </DialogDescription>
          </DialogHeader>

          {/* Student & Bill Summary Card */}
          <div className="p-3 rounded-lg border bg-muted/30 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-foreground">{bill.student_name}</span>
              <Badge variant="outline" className="text-[10px]">
                {bill.class_name}
              </Badge>
            </div>
            <div className="text-[11px] text-muted-foreground flex justify-between">
              <span>{bill.bill_title}</span>
              <span className="font-mono">{bill.bill_number}</span>
            </div>
            <div className="pt-2 border-t flex justify-between items-center text-xs">
              <div>
                <span className="text-muted-foreground">Total Payable: </span>
                <span className="font-mono font-medium">NPR {Number(bill.total_payable).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Current Due: </span>
                <span className="font-mono font-bold text-destructive">NPR {dueAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3.5">
            {/* Amount to Pay */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="amount_paid" className="text-xs font-semibold">
                  Payment Amount (NPR) <span className="text-destructive">*</span>
                </Label>
                <button
                  type="button"
                  onClick={() => setValue('amount_paid', dueAmount, { shouldValidate: true })}
                  className="text-[11px] text-primary hover:underline font-medium cursor-pointer"
                >
                  Pay Full Balance
                </button>
              </div>
              <Input
                id="amount_paid"
                type="number"
                step="0.01"
                min="0.01"
                max={dueAmount}
                placeholder="0.00"
                className="text-sm font-mono font-bold h-10"
                {...register('amount_paid', { valueAsNumber: true })}
              />
              {errors.amount_paid && (
                <p className="text-destructive text-[11px] font-medium">{errors.amount_paid.message}</p>
              )}
              {watchedAmount > 0 && watchedAmount < dueAmount && (
                <p className="text-[11px] text-amber-600 font-medium">
                  Partial payment: NPR {remainingAfterPayment.toFixed(2)} will remain due.
                </p>
              )}
            </div>

            {/* Payment Method */}
            <div className="space-y-1.5">
              <Label htmlFor="payment_method" className="text-xs font-semibold">
                Payment Method <span className="text-destructive">*</span>
              </Label>
              <select
                id="payment_method"
                {...register('payment_method')}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer / ConnectIPS</option>
                <option value="CHEQUE">Cheque</option>
                <option value="OTHER">Other</option>
              </select>
              {errors.payment_method && (
                <p className="text-destructive text-[11px] font-medium">{errors.payment_method.message}</p>
              )}
            </div>

            {/* Reference Number */}
            <div className="space-y-1.5">
              <Label htmlFor="transaction_reference" className="text-xs font-semibold">
                Reference / Txn / Cheque # <span className="text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Input
                id="transaction_reference"
                placeholder="e.g. TXN-94829 or Cheque #01928"
                className="text-xs h-9 font-mono"
                {...register('transaction_reference')}
              />
            </div>

            {/* Remarks */}
            <div className="space-y-1.5">
              <Label htmlFor="remarks" className="text-xs font-semibold">
                Remarks <span className="text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Input
                id="remarks"
                placeholder="e.g. Deposited by father"
                className="text-xs h-9"
                {...register('remarks')}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isLoading} className="gap-1.5">
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Confirm Payment & Print
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
