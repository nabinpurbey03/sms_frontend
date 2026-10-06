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
import {
  AlertTriangle,
  CreditCard,
  Loader2,
  Wallet,
  Percent,
  ArrowDownRight,
  Banknote,
  Ban,
} from 'lucide-react';
import { useAuth } from '@/auth/useAuth';
import { useStudentDuesBreakdown, useBillLateFee } from '../hooks';
import {
  formatLateFeeBanner,
  formatCollectLateFeeLabel,
  formatWaiveLateFeeLabel,
} from '../utils/lateFeeUtils';
import { calculateQuickFillAmounts } from '../utils/cashierUtils';
import { useCalendarPreferenceStore } from '@/stores/calendarPreferenceStore';
import { formatDate, formatDualDate } from '@/features/school-settings/utils/nepaliDate';
import { NepaliDatePicker } from '@/components/ui/nepali-date-picker';
import {
  paymentCollectSchema,
  type PaymentCollectFormValues,
  type PaymentCollectInputValues,
} from '../schema';
import type { FeeBill, FeePayment, StudentDuesBreakdown } from '../types';

const formatNpr = (val: number | string | undefined | null): string => {
  const num = Number(val || 0);
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

interface PaymentCollectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PaymentCollectFormValues) => Promise<FeePayment | any>;
  isLoading: boolean;
  bill: FeeBill | null;
  tenantId?: string | null;
  duesBreakdown?: StudentDuesBreakdown | null;
  onPaymentSuccess?: (payment: FeePayment) => void;
  isPayAllMode?: boolean;
  totalAccountDue?: number;
  unpaidBills?: FeeBill[];
  studentName?: string;
  className?: string;
}

export const PaymentCollectDialog: React.FC<PaymentCollectDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  bill,
  tenantId,
  duesBreakdown,
  onPaymentSuccess,
  isPayAllMode = false,
  totalAccountDue,
  unpaidBills,
  studentName,
  className,
}) => {
  const { activeTenantId } = useAuth();
  const { calendarSystem } = useCalendarPreferenceStore();
  const effectiveTenantId =
    tenantId ||
    bill?.tenant_id ||
    (unpaidBills && unpaidBills[0]?.tenant_id) ||
    activeTenantId ||
    null;
  const targetBill = bill || (unpaidBills && unpaidBills.length > 0 ? unpaidBills[0] : null);
  const studentId = bill?.student_id || targetBill?.student_id || null;

  const [collectLateFee, setCollectLateFee] = React.useState<boolean>(true);

  const { data: fetchedBreakdown, isLoading: isBreakdownLoading } = useStudentDuesBreakdown(
    effectiveTenantId,
    studentId
  );
  const breakdown = duesBreakdown ?? fetchedBreakdown;

  const { data: lateFeeData } = useBillLateFee(
    effectiveTenantId,
    targetBill?.id || null
  );

  const isOverduePastGrace = !!lateFeeData?.is_overdue && Number(lateFeeData?.late_fee || 0) > 0;
  const lateFeeAmount = Number(lateFeeData?.late_fee || 0);
  const overdueDays = lateFeeData?.overdue_days || 0;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PaymentCollectInputValues, any, PaymentCollectFormValues>({
    resolver: zodResolver(paymentCollectSchema),
    defaultValues: {
      bill_id: '',
      amount_paid: undefined,
      payment_date: new Date().toISOString().slice(0, 10),
      payment_method: 'CASH',
      transaction_reference: '',
      remarks: '',
      discount_type: 'NONE',
      discount_rate: undefined,
      discount_amount: undefined,
      allow_excess_to_wallet: true,
      apply_waterfall: isPayAllMode,
    },
  });

  const dueAmount = isPayAllMode && totalAccountDue !== undefined
    ? totalAccountDue
    : (targetBill ? Number(targetBill.due_amount) : 0);
  const subtotalAmount = isPayAllMode && totalAccountDue !== undefined
    ? totalAccountDue
    : (targetBill ? Number(targetBill.subtotal_amount) : 0);
  const previousDueAmount = isPayAllMode ? 0 : (targetBill ? Number(targetBill.previous_due_amount) : 0);
  const totalPayableAmount = isPayAllMode && totalAccountDue !== undefined
    ? totalAccountDue
    : (targetBill ? Number(targetBill.total_payable) : 0);
  const advanceWalletBalance = Number(breakdown?.advance_wallet_balance || 0);

  const discountType = watch('discount_type') || 'NONE';
  const discountRate = watch('discount_rate');
  const discountAmount = watch('discount_amount');
  const watchedAmount = watch('amount_paid') || 0;

  // Dynamic Discount Calculation
  let liveDiscountAmt = 0;
  if (discountType === 'PERCENT') {
    const rate = Number(discountRate) || 0;
    liveDiscountAmt = Math.min(
      dueAmount,
      Math.round(dueAmount * (rate / 100) * 100) / 100
    );
  } else if (discountType === 'FIXED') {
    const fixed = Number(discountAmount) || 0;
    liveDiscountAmt = Math.min(dueAmount, Math.max(0, fixed));
  }

  // Quick Amount Presets
  const { netPayable, currentMonthDue } = calculateQuickFillAmounts({
    dueAmount,
    subtotalAmount,
    liveDiscountAmt,
  });
  const remainingAfterPayment = Math.max(0, netPayable - watchedAmount);

  useEffect(() => {
    if (isOpen) {
      const activeBill = bill || (unpaidBills && unpaidBills.length > 0 ? unpaidBills[0] : null);
      if (activeBill) {
        setCollectLateFee(true);
        const initialDue = isPayAllMode && totalAccountDue !== undefined
          ? totalAccountDue
          : Number(activeBill.due_amount);
        reset({
          bill_id: activeBill.id,
          amount_paid: initialDue,
          payment_date: new Date().toISOString().slice(0, 10),
          payment_method: 'CASH',
          transaction_reference: '',
          remarks: isPayAllMode ? 'Consolidated payment for all outstanding dues' : '',
          discount_type: 'NONE',
          discount_rate: undefined,
          discount_amount: undefined,
          allow_excess_to_wallet: true,
          apply_waterfall: isPayAllMode,
        });
      }
    }
  }, [isOpen, bill, isPayAllMode, totalAccountDue, unpaidBills, reset]);

  const handleDiscountModeChange = (mode: 'NONE' | 'PERCENT' | 'FIXED') => {
    setValue('discount_type', mode);
    if (mode === 'NONE') {
      setValue('discount_rate', undefined);
      setValue('discount_amount', undefined);
      setValue('amount_paid', dueAmount, { shouldValidate: true });
    } else if (mode === 'PERCENT') {
      setValue('discount_amount', undefined);
      const rate = Number(watch('discount_rate')) || 0;
      const dAmt = Math.min(dueAmount, Math.round(dueAmount * (rate / 100) * 100) / 100);
      setValue('amount_paid', Math.max(0, dueAmount - dAmt), { shouldValidate: true });
    } else if (mode === 'FIXED') {
      setValue('discount_rate', undefined);
      const fixed = Number(watch('discount_amount')) || 0;
      const dAmt = Math.min(dueAmount, Math.max(0, fixed));
      setValue('amount_paid', Math.max(0, dueAmount - dAmt), { shouldValidate: true });
    }
  };

  const onFormSubmit = async (values: PaymentCollectFormValues) => {
    try {
      const activeBill = bill || (unpaidBills && unpaidBills.length > 0 ? unpaidBills[0] : null);
      if (!activeBill) return;

      const payload: PaymentCollectFormValues = {
        bill_id: activeBill.id,
        amount_paid: Number(values.amount_paid),
        payment_method: values.payment_method,
        transaction_reference: values.transaction_reference?.trim() || '',
        payment_date: values.payment_date || undefined,
        remarks: values.remarks?.trim() || '',
        discount_type: discountType,
        discount_rate: discountType === 'PERCENT' ? Number(values.discount_rate || 0) : undefined,
        discount_amount:
          discountType === 'FIXED'
            ? Number(values.discount_amount || 0)
            : discountType === 'PERCENT'
            ? liveDiscountAmt
            : undefined,
        allow_excess_to_wallet: true,
        late_fee_paid: isOverduePastGrace && collectLateFee ? lateFeeAmount : 0,
        late_fee_waived: isOverduePastGrace && !collectLateFee,
        apply_waterfall: isPayAllMode ? true : false,
      };

      const payment = await onSubmit(payload);
      onClose();
      if (payment && onPaymentSuccess) {
        onPaymentSuccess(payment);
      }
    } catch {
      // Handled by hook toast
    }
  };

  if (!targetBill) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto">
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <DialogHeader>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-1">
              <CreditCard className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold">
              {isPayAllMode ? 'Collect All Outstanding Dues' : 'Collect Fee Payment'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {isPayAllMode
                ? `Record consolidated payment across ${unpaidBills?.length || 0} unpaid/partial billing months.`
                : `Record payment against Bill #${targetBill.bill_number}. An official receipt will be generated.`}
            </DialogDescription>
          </DialogHeader>

          {/* Student & Bill Header Card */}
          <div className="p-3 rounded-lg border bg-muted/30 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-foreground text-sm">
                {studentName || targetBill.student_name}
              </span>
              <Badge variant="outline" className="text-[10px] font-medium">
                {className || targetBill.class_name}
              </Badge>
            </div>
            {isPayAllMode ? (
              <div className="space-y-1.5 pt-1.5 border-t border-border/40">
                <div className="text-[11px] text-muted-foreground flex justify-between">
                  <span className="font-semibold text-foreground">Consolidated Settlement</span>
                  <span className="font-mono font-medium">{unpaidBills?.length || 0} Invoices</span>
                </div>
                {unpaidBills && unpaidBills.length > 0 && (
                  <div className="max-h-24 overflow-y-auto space-y-1 pr-1 border rounded-md p-1.5 bg-background/50">
                    {unpaidBills.map((ub) => (
                      <div key={ub.id} className="flex justify-between items-center text-[10px]">
                        <span className="text-muted-foreground">
                          {ub.billing_month || ub.bill_title} (#{ub.bill_number}):
                        </span>
                        <span className="font-mono font-bold tabular-nums text-foreground">
                          NPR {formatNpr(ub.due_amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1.5 pt-1 border-t border-border/40">
                <div className="text-[11px] text-muted-foreground flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-foreground">{targetBill.bill_title}</span>
                    {targetBill.billing_month && (
                      <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-semibold">
                        {targetBill.billing_month}
                      </Badge>
                    )}
                  </div>
                  <span className="font-mono font-medium text-muted-foreground">#{targetBill.bill_number}</span>
                </div>
                {targetBill.due_date && (
                  <div className="text-[11px] text-muted-foreground flex justify-between items-center">
                    <span>Due Date:</span>
                    <span
                      className="font-medium text-foreground cursor-help"
                      title={formatDualDate(targetBill.due_date, calendarSystem)}
                    >
                      {formatDate(targetBill.due_date, calendarSystem)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Financial Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {isPayAllMode ? (
              <>
                <div className="p-2.5 rounded-lg border bg-card flex flex-col justify-between">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                    Invoices Count
                  </span>
                  <span className="text-sm font-bold font-mono tabular-nums text-foreground mt-1">
                    {unpaidBills?.length || 0} Unpaid
                  </span>
                </div>

                <div className="p-2.5 rounded-lg border bg-card flex flex-col justify-between">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                    Total Account Due
                  </span>
                  <span className="text-sm font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400 mt-1">
                    NPR {formatNpr(dueAmount)}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg border border-primary/40 bg-primary/10 dark:bg-primary/20 flex flex-col justify-between shadow-2xs">
                  <span className="text-[10px] text-primary uppercase font-bold">
                    Net Total to Clear
                  </span>
                  <span className="text-sm font-extrabold font-mono tabular-nums text-primary mt-1">
                    NPR {formatNpr(netPayable)}
                  </span>
                </div>
              </>
            ) : (
              <>
                {/* 1. Current Month Bill Due */}
                <div className="p-2.5 rounded-lg border bg-card flex flex-col justify-between">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                    Current Month Due
                  </span>
                  <span className="text-sm font-bold font-mono tabular-nums text-foreground mt-1">
                    NPR {formatNpr(subtotalAmount)}
                  </span>
                </div>

                {/* 2. Carried Arrears / Prior Dues */}
                <div className="p-2.5 rounded-lg border bg-card flex flex-col justify-between">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                    Carried Arrears
                  </span>
                  <span
                    className={`text-sm font-bold font-mono tabular-nums mt-1 ${
                      previousDueAmount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground font-medium'
                    }`}
                  >
                    NPR {formatNpr(previousDueAmount)}
                  </span>
                </div>

                {/* 3. Late Fee */}
                <div className="p-2.5 rounded-lg border bg-card flex flex-col justify-between">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                    Late Fee Penalty
                  </span>
                  <span
                    className={`text-sm font-bold font-mono tabular-nums mt-1 ${
                      isOverduePastGrace && collectLateFee ? 'text-destructive' : 'text-muted-foreground font-medium'
                    }`}
                  >
                    NPR {formatNpr(isOverduePastGrace && collectLateFee ? lateFeeAmount : 0)}
                  </span>
                </div>

                {/* 4. Net Total to Clear */}
                <div className="p-2.5 rounded-lg border border-primary/40 bg-primary/10 dark:bg-primary/20 flex flex-col justify-between shadow-2xs">
                  <span className="text-[10px] text-primary uppercase font-bold">
                    Net Total to Clear
                  </span>
                  <span className="text-sm font-extrabold font-mono tabular-nums text-primary mt-1">
                    NPR {formatNpr(netPayable)}
                  </span>
                </div>
              </>
            )}

            {/* Advance Wallet Balance */}
            {advanceWalletBalance > 0 ? (
              <div className="p-2.5 rounded-lg border border-emerald-300/80 bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-between col-span-2 sm:col-span-3">
                <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Available Advance Wallet Credit
                </span>
                <span className="text-sm font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-300">
                  NPR {formatNpr(advanceWalletBalance)}
                </span>
              </div>
            ) : (
              <div className="p-2 rounded-lg border border-border/50 bg-muted/20 flex items-center justify-between col-span-2 sm:col-span-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
                  Advance Wallet Credit
                </span>
                <span className="font-mono tabular-nums font-medium">
                  NPR 0.00
                </span>
              </div>
            )}
          </div>

          {/* Overdue Late Fee Notice & Waiver Toggle */}
          {isOverduePastGrace && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 dark:bg-destructive/20 p-3.5 space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-destructive">
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                  <span>Late Fee Notice</span>
                </div>
                <Badge variant="destructive" className="text-[10px] uppercase font-bold">
                  {overdueDays} Days Past Grace
                </Badge>
              </div>

              <div className="p-2.5 rounded-lg bg-background/95 border border-destructive/30 text-xs font-semibold text-foreground">
                <span>{formatLateFeeBanner(lateFeeAmount, overdueDays)}</span>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block">
                  Penalty Action
                </Label>
                <div
                  role="group"
                  aria-label="Late fee collection action"
                  className="grid grid-cols-2 gap-1.5 p-1 bg-muted/60 rounded-lg border border-border/60"
                >
                  <button
                    type="button"
                    onClick={() => setCollectLateFee(true)}
                    className={`text-xs py-1.5 px-2.5 rounded-md font-medium transition-all text-center cursor-pointer ${
                      collectLateFee
                        ? 'bg-destructive text-destructive-foreground shadow-xs font-bold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {formatCollectLateFeeLabel(lateFeeAmount)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCollectLateFee(false)}
                    className={`text-xs py-1.5 px-2.5 rounded-md font-medium transition-all text-center cursor-pointer ${
                      !collectLateFee
                        ? 'bg-foreground text-background shadow-xs font-bold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {formatWaiveLateFeeLabel()}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Dynamic Discount Controls */}
          <div className="p-3 rounded-lg border border-border/70 bg-card space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Counter Discount / Waiver</Label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted/60 rounded-lg border border-border/60">
                <button
                  type="button"
                  onClick={() => handleDiscountModeChange('NONE')}
                  className={`text-xs py-1.5 px-3 rounded-md font-medium transition-all text-center cursor-pointer ${
                    discountType === 'NONE'
                      ? 'bg-background text-foreground shadow-xs border border-border/40 font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  No Discount
                </button>
                <button
                  type="button"
                  onClick={() => handleDiscountModeChange('PERCENT')}
                  className={`text-xs py-1.5 px-3 rounded-md font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    discountType === 'PERCENT'
                      ? 'bg-background text-foreground shadow-xs border border-border/40 font-bold text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Percent className="w-3.5 h-3.5" />
                  <span>Percentage</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDiscountModeChange('FIXED')}
                  className={`text-xs py-1.5 px-3 rounded-md font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    discountType === 'FIXED'
                      ? 'bg-background text-foreground shadow-xs border border-border/40 font-bold text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Banknote className="w-3.5 h-3.5" />
                  <span>Fixed Amount</span>
                </button>
              </div>
            </div>

            {/* Percent Input */}
            {discountType === 'PERCENT' && (
              <div className="space-y-1.5 animate-in fade-in duration-150">
                <Label htmlFor="discount_rate" className="text-xs font-semibold flex items-center justify-between">
                  <span>Discount Percentage</span>
                  <span className="text-[10px] text-muted-foreground font-normal">0% - 100%</span>
                </Label>
                <div className="relative">
                  <Input
                    id="discount_rate"
                    type="number"
                    step="any"
                    min="0"
                    max="100"
                    placeholder="e.g. 10"
                    className="text-xs h-9 pr-8 font-mono font-medium"
                    {...register('discount_rate', {
                      valueAsNumber: true,
                      onChange: (e) => {
                        const val = Number(e.target.value) || 0;
                        const dAmt = Math.min(
                          dueAmount,
                          Math.round(dueAmount * (val / 100) * 100) / 100
                        );
                        setValue('amount_paid', Math.max(0, dueAmount - dAmt), {
                          shouldValidate: true,
                        });
                      },
                    })}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground pointer-events-none">
                    %
                  </span>
                </div>
                {errors.discount_rate && (
                  <p className="text-destructive text-[11px] font-medium">{errors.discount_rate.message}</p>
                )}
              </div>
            )}

            {/* Fixed NPR Input */}
            {discountType === 'FIXED' && (
              <div className="space-y-1.5 animate-in fade-in duration-150">
                <Label htmlFor="discount_amount" className="text-xs font-semibold flex items-center justify-between">
                  <span>Fixed Discount Amount (NPR)</span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    Max NPR {formatNpr(dueAmount)}
                  </span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold font-mono text-muted-foreground pointer-events-none">
                    NPR
                  </span>
                  <Input
                    id="discount_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    max={dueAmount}
                    placeholder="0.00"
                    className="text-xs h-9 pl-12 font-mono font-medium"
                    {...register('discount_amount', {
                      valueAsNumber: true,
                      onChange: (e) => {
                        const val = Number(e.target.value) || 0;
                        const dAmt = Math.min(dueAmount, Math.max(0, val));
                        setValue('amount_paid', Math.max(0, dueAmount - dAmt), {
                          shouldValidate: true,
                        });
                      },
                    })}
                  />
                </div>
                {errors.discount_amount && (
                  <p className="text-destructive text-[11px] font-medium">
                    {errors.discount_amount.message}
                  </p>
                )}
              </div>
            )}

            {/* Live Net Payable Bar (when discount active) */}
            {discountType !== 'NONE' && (
              <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20 text-xs space-y-1.5 animate-in fade-in duration-150">
                <div className="flex justify-between text-muted-foreground text-[11px]">
                  <span>Bill Balance Due:</span>
                  <span className="font-mono tabular-nums">NPR {formatNpr(dueAmount)}</span>
                </div>
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
                  <span>
                    Discount ({discountType === 'PERCENT' ? `${discountRate || 0}%` : 'Fixed Amount'}):
                  </span>
                  <span className="font-mono tabular-nums font-bold">-NPR {formatNpr(liveDiscountAmt)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-border/50 font-bold text-foreground">
                  <span className="flex items-center gap-1">
                    <ArrowDownRight className="w-3.5 h-3.5 text-primary" />
                    <span>Net Payable:</span>
                  </span>
                  <span className="font-mono tabular-nums text-primary text-sm font-bold">
                    NPR {formatNpr(netPayable)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3.5">
            {/* Quick Amount Fill Buttons */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase block">
                Quick Fill Amount
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                {isPayAllMode ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setValue('amount_paid', netPayable, { shouldValidate: true })}
                      className={`text-xs py-2 px-2.5 rounded-lg border text-center transition-all cursor-pointer font-medium sm:col-span-2 ${
                        watchedAmount === netPayable
                          ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                          : 'border-border/70 hover:bg-muted/50 text-foreground'
                      }`}
                    >
                      Pay Full Account Balance (NPR {formatNpr(netPayable)})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById('amount_paid');
                        if (el) el.focus();
                      }}
                      className={`text-xs py-2 px-2.5 rounded-lg border text-center transition-all cursor-pointer font-medium ${
                        watchedAmount !== netPayable
                          ? 'bg-muted text-foreground border-border font-bold'
                          : 'border-border/70 hover:bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      Custom Amount
                    </button>
                  </>
                ) : currentMonthDue < netPayable ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setValue('amount_paid', netPayable, { shouldValidate: true })}
                      className={`text-xs py-2 px-2.5 rounded-lg border text-center transition-all cursor-pointer font-medium ${
                        watchedAmount === netPayable
                          ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                          : 'border-border/70 hover:bg-muted/50 text-foreground'
                      }`}
                    >
                      Pay Full Balance (NPR {formatNpr(netPayable)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setValue('amount_paid', currentMonthDue, { shouldValidate: true })}
                      className={`text-xs py-2 px-2.5 rounded-lg border text-center transition-all cursor-pointer font-medium ${
                        watchedAmount === currentMonthDue && currentMonthDue !== netPayable
                          ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                          : 'border-border/70 hover:bg-muted/50 text-foreground'
                      }`}
                    >
                      Current Month Only (NPR {formatNpr(currentMonthDue)})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById('amount_paid');
                        if (el) el.focus();
                      }}
                      className={`text-xs py-2 px-2.5 rounded-lg border text-center transition-all cursor-pointer font-medium ${
                        watchedAmount !== netPayable && watchedAmount !== currentMonthDue
                          ? 'bg-muted text-foreground border-border font-bold'
                          : 'border-border/70 hover:bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      Custom Amount
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setValue('amount_paid', netPayable, { shouldValidate: true })}
                      className={`text-xs py-2 px-2.5 rounded-lg border text-center transition-all cursor-pointer font-medium sm:col-span-2 ${
                        watchedAmount === netPayable
                          ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                          : 'border-border/70 hover:bg-muted/50 text-foreground'
                      }`}
                    >
                      Pay Full Due (NPR {formatNpr(netPayable)})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById('amount_paid');
                        if (el) el.focus();
                      }}
                      className={`text-xs py-2 px-2.5 rounded-lg border text-center transition-all cursor-pointer font-medium ${
                        watchedAmount !== netPayable
                          ? 'bg-muted text-foreground border-border font-bold'
                          : 'border-border/70 hover:bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      Custom Amount
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Amount to Pay Input */}
            <div className="space-y-1.5">
              <Label htmlFor="amount_paid" className="text-xs font-semibold">
                Amount Received (NPR) <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold font-mono text-muted-foreground pointer-events-none">
                  NPR
                </span>
                <Input
                  id="amount_paid"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  className="pl-13 text-sm font-mono font-bold h-10 tracking-tight"
                  {...register('amount_paid', { valueAsNumber: true })}
                />
              </div>
              {errors.amount_paid && (
                <p className="text-destructive text-[11px] font-medium">{errors.amount_paid.message}</p>
              )}

              {/* Partial Payment Notice */}
              {watchedAmount > 0 && watchedAmount < netPayable && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                  Partial payment: NPR {formatNpr(remainingAfterPayment)} will remain due.
                </p>
              )}

              {/* Overpayment / Advance Wallet Alert */}
              {watchedAmount > netPayable && (
                <div className="p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/90 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 flex items-start gap-2.5 text-xs animate-in fade-in duration-150 shadow-2xs">
                  <Wallet className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-semibold text-blue-950 dark:text-blue-50">Advance Wallet Deposit</span>
                    <p className="text-[11px] text-blue-800 dark:text-blue-200 leading-relaxed">
                      Excess of{' '}
                      <span className="font-mono font-bold text-blue-950 dark:text-blue-100">
                        NPR {formatNpr(watchedAmount - netPayable)}
                      </span>{' '}
                      will be deposited into student's advance wallet and deducted automatically from the next monthly invoice.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Date & Payment Method */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <NepaliDatePicker
                  id="payment_date"
                  label="Payment Date *"
                  value={watch('payment_date') || new Date().toISOString().slice(0, 10)}
                  onChange={(val) => setValue('payment_date', val, { shouldValidate: true })}
                  size="sm"
                  error={errors.payment_date?.message}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="payment_method" className="text-xs font-semibold">
                  Payment Method <span className="text-destructive">*</span>
                </Label>
                <select
                  id="payment_method"
                  {...register('payment_method')}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-medium shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer / ConnectIPS</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="OTHER">Other / Digital Wallet</option>
                </select>
                {errors.payment_method && (
                  <p className="text-destructive text-[11px] font-medium">{errors.payment_method.message}</p>
                )}
              </div>
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
