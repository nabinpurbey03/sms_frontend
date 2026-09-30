import React, { useState } from 'react';
import { useAuth } from '@/auth/useAuth';
import { useCurrentAcademicYear } from '@/features/academic-year/hooks/useCurrentAcademicYear';
import { useClasses } from '@/features/academic/hooks';
import { useBills, useRecordPayment, usePayments } from '../hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  CreditCard,
  Search,
  Lock,
  Printer,
  Loader2,
  CheckCircle2,
  Receipt,
  AlertCircle,
} from 'lucide-react';
import type { FeeBill, FeePayment, PaymentMethod } from '../types';
import { PrintableReceiptModal } from '../components/PrintableReceiptModal';

export const CollectPaymentPage: React.FC = () => {
  const { activeTenantId } = useAuth();
  const { currentYear } = useCurrentAcademicYear(activeTenantId);
  const { data: classesData } = useClasses(activeTenantId);
  const classes = classesData || [];

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedBill, setSelectedBill] = useState<FeeBill | null>(null);

  // Payment Form State
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [transactionRef, setTransactionRef] = useState('');
  const [remarks, setRemarks] = useState('');

  // Receipt Modal State
  const [activeReceiptPaymentId, setActiveReceiptPaymentId] = useState<string | null>(null);

  // Queries
  const { data: unpaidBillsData, isLoading: isLoadingBills } = useBills(activeTenantId, {
    search: searchTerm.trim() || undefined,
    class_id: selectedClassId || undefined,
    status: 'ISSUED', // Will match ISSUED and we can filter partials or query both
    page: 1,
    page_size: 50,
  });

  const { data: recentPaymentsData } = usePayments(activeTenantId, {
    page: 1,
    page_size: 8,
  });

  const unpaidBills = unpaidBillsData?.items.filter((b) => Number(b.due_amount) > 0) || [];
  const recentPayments = recentPaymentsData?.items || [];

  // Mutations
  const recordPaymentMutation = useRecordPayment(activeTenantId);

  const handleSelectBill = (bill: FeeBill) => {
    setSelectedBill(bill);
    setPaymentAmount(Number(bill.due_amount));
    setTransactionRef('');
    setRemarks('');
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBill || !paymentAmount || paymentAmount <= 0) return;

    try {
      const payment = await recordPaymentMutation.mutateAsync({
        bill_id: selectedBill.id,
        amount_paid: Number(paymentAmount),
        payment_method: paymentMethod,
        transaction_reference: transactionRef.trim() || undefined,
        remarks: remarks.trim() || undefined,
      });

      setSelectedBill(null);
      setPaymentAmount('');
      setTransactionRef('');
      setRemarks('');
      if (payment) {
        setActiveReceiptPaymentId(payment.id);
      }
    } catch {
      // Handled by hook toast
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary" />
            Fee Collection Desk
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Search student invoices, record cash or digital receipts, and print official slips.
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
          <Lock className="w-3.5 h-3.5 text-primary" />
          <span>Session: {currentYear?.name || 'Active Session'} (Locked)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Student / Bill Finder & Selection (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border-border/60 shadow-2xs">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Find Outstanding Invoices
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search student or bill #..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 text-xs h-9"
                  />
                </div>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">All Classes</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Invoices List */}
              <div className="max-h-96 overflow-y-auto space-y-2 pt-1">
                {isLoadingBills ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary mb-2" />
                    Searching bills...
                  </div>
                ) : unpaidBills.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                    No outstanding unpaid bills matching your search.
                  </div>
                ) : (
                  unpaidBills.map((bill) => {
                    const isSelected = selectedBill?.id === bill.id;
                    const due = Number(bill.due_amount);
                    return (
                      <div
                        key={bill.id}
                        onClick={() => handleSelectBill(bill)}
                        className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-primary/10 border-primary shadow-xs'
                            : 'bg-card hover:bg-muted/40 border-border/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground text-sm">
                            {bill.student_name}
                          </span>
                          <span className="font-mono font-bold text-destructive text-sm">
                            NPR {due.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1 text-[11px] text-muted-foreground">
                          <span>
                            {bill.class_name} • {bill.bill_title}
                          </span>
                          <span className="font-mono">#{bill.bill_number}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground border-t pt-1">
                          <span>Due Date: {bill.due_date}</span>
                          {Number(bill.paid_amount) > 0 && (
                            <span className="text-amber-600 font-medium">
                              Partial: NPR {Number(bill.paid_amount).toFixed(2)} already paid
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Payment Collection Form & Recent Slips (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-border/60 shadow-2xs">
            <CardHeader className="p-4 pb-2 border-b">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Receipt className="w-4 h-4 text-primary" />
                Payment Entry
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {!selectedBill ? (
                <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg space-y-2">
                  <CreditCard className="w-8 h-8 mx-auto text-muted-foreground/50" />
                  <p className="font-medium text-foreground">Select an invoice on the left</p>
                  <p className="text-[11px] text-muted-foreground">
                    Click any student bill from the list to populate payment details.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleConfirmPayment} className="space-y-4 text-xs">
                  {/* Selected Bill Overview */}
                  <div className="p-3 rounded-lg bg-muted/40 border space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-foreground text-sm">
                        {selectedBill.student_name}
                      </span>
                      <Badge variant="outline">{selectedBill.class_name}</Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground flex justify-between">
                      <span>{selectedBill.bill_title}</span>
                      <span className="font-mono">#{selectedBill.bill_number}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t font-semibold">
                      <span className="text-muted-foreground">Outstanding Balance:</span>
                      <span className="text-destructive font-mono text-sm">
                        NPR {Number(selectedBill.due_amount).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Payment Amount */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="pay_amount" className="text-xs font-semibold">
                        Amount to Collect (NPR) <span className="text-destructive">*</span>
                      </Label>
                      <button
                        type="button"
                        onClick={() => setPaymentAmount(Number(selectedBill.due_amount))}
                        className="text-[11px] text-primary hover:underline font-medium cursor-pointer"
                      >
                        Full Balance
                      </button>
                    </div>
                    <Input
                      id="pay_amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={Number(selectedBill.due_amount)}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="text-base font-mono font-bold h-11"
                      required
                    />
                    {typeof paymentAmount === 'number' &&
                      paymentAmount > 0 &&
                      paymentAmount < Number(selectedBill.due_amount) && (
                        <p className="text-[11px] text-amber-600 font-medium">
                          Remaining due after this payment: NPR{' '}
                          {(Number(selectedBill.due_amount) - paymentAmount).toFixed(2)}
                        </p>
                      )}
                  </div>

                  {/* Payment Mode */}
                  <div className="space-y-1.5">
                    <Label htmlFor="pay_method" className="text-xs font-semibold">
                      Payment Mode <span className="text-destructive">*</span>
                    </Label>
                    <select
                      id="pay_method"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="CASH">Cash</option>
                      <option value="ESEWA">eSewa</option>
                      <option value="KHALTI">Khalti</option>
                      <option value="BANK_TRANSFER">Bank Transfer / ConnectIPS</option>
                      <option value="POS_CARD">POS / Card</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  {/* Reference Number */}
                  <div className="space-y-1.5">
                    <Label htmlFor="pay_ref" className="text-xs font-semibold">
                      Transaction Ref / Cheque # <span className="text-muted-foreground font-normal">(Optional)</span>
                    </Label>
                    <Input
                      id="pay_ref"
                      placeholder="e.g. TXN-12345 or Cheque #09182"
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                      className="text-xs h-9 font-mono"
                    />
                  </div>

                  {/* Remarks */}
                  <div className="space-y-1.5">
                    <Label htmlFor="pay_remarks" className="text-xs font-semibold">
                      Remarks <span className="text-muted-foreground font-normal">(Optional)</span>
                    </Label>
                    <Input
                      id="pay_remarks"
                      placeholder="e.g. Paid by father"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={recordPaymentMutation.isPending || !paymentAmount || paymentAmount <= 0}
                      className="w-full gap-2 text-xs h-10 shadow-xs cursor-pointer"
                    >
                      {recordPaymentMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      Record Payment & Generate Official Receipt
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Quick Recent Receipts Widget */}
          <Card className="border-border/60 shadow-2xs">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Recent Issued Receipts
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-2">
              {recentPayments.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-4">No recent receipts.</div>
              ) : (
                recentPayments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2 rounded-lg border text-xs bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div>
                      <span className="font-semibold text-foreground block">{p.student_name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {p.receipt_number} • {p.payment_method}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-foreground">
                        NPR {Number(p.amount_paid).toFixed(2)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setActiveReceiptPaymentId(p.id)}
                        className="h-7 w-7 text-primary cursor-pointer"
                        title="Print Receipt"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Printable Receipt Modal */}
      <PrintableReceiptModal
        isOpen={!!activeReceiptPaymentId}
        onClose={() => setActiveReceiptPaymentId(null)}
        tenantId={activeTenantId}
        paymentId={activeReceiptPaymentId}
      />
    </div>
  );
};
