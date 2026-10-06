import React, { useState, useMemo } from 'react';
import { useParams, Link } from '@tanstack/react-router';
import { useAuth } from '@/auth/useAuth';
import { useCurrentAcademicYear } from '@/features/academic-year/hooks/useCurrentAcademicYear';
import { useStudentLedger, useRecordPayment } from '../hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  CreditCard,
  Printer,
  Calendar,
  Loader2,
  Receipt,
  ArrowLeft,
  Coins,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowUpDown,
  Layers,
} from 'lucide-react';
import type { FeeBill, FeePayment } from '../types';
import { PaymentCollectDialog } from '../components/PaymentCollectDialog';
import { PrintableBillModal } from '../components/PrintableBillModal';
import { PrintableReceiptModal } from '../components/PrintableReceiptModal';
import { PrintableConsolidatedReceiptModal } from '../components/PrintableConsolidatedReceiptModal';
import { PrintableStatementModal } from '../components/PrintableStatementModal';
import { useCalendarPreferenceStore } from '@/stores/calendarPreferenceStore';
import { formatDate, formatDualDate } from '@/features/school-settings/utils/nepaliDate';
import {
  deriveBillLedgerStatus,
  sortBillsChronologically,
  generateMonthlyLedgerSummary,
  type LedgerBillStatus,
} from '../utils/cashierUtils';

export const StudentLedgerPage: React.FC = () => {
  const { studentId } = useParams({ strict: false }) as { studentId: string };
  const { activeTenantId } = useAuth();
  const { calendarSystem } = useCalendarPreferenceStore();
  const { currentYear } = useCurrentAcademicYear(activeTenantId);

  const { data: ledger, isLoading } = useStudentLedger(activeTenantId, studentId);

  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [activeCollectBill, setActiveCollectBill] = useState<FeeBill | null>(null);
  const [activePrintBillId, setActivePrintBillId] = useState<string | null>(null);
  const [activePrintReceiptId, setActivePrintReceiptId] = useState<string | null>(null);
  const [activeConsolidatedReceiptId, setActiveConsolidatedReceiptId] = useState<string | null>(null);
  const [isPayAllOpen, setIsPayAllOpen] = useState<boolean>(false);
  const [isPrintStatementOpen, setIsPrintStatementOpen] = useState<boolean>(false);

  const recordPaymentMutation = useRecordPayment(activeTenantId);

  const totalBilled = Number(ledger?.total_billed || 0);
  const totalPaid = Number(ledger?.total_paid || 0);
  const totalDue = Number(ledger?.total_due || 0);

  // Chronologically sorted bills (Baishakh -> Chaitra by default)
  const sortedBills = useMemo(() => {
    if (!ledger?.bills) return [];
    return sortBillsChronologically(ledger.bills, sortOrder);
  }, [ledger?.bills, sortOrder]);

  // Unpaid bills eligible for consolidated waterfall payment
  const unpaidBills = useMemo(() => {
    return sortedBills.filter(
      (b) => Number(b.due_amount) > 0 && b.status !== 'CANCELLED'
    );
  }, [sortedBills]);

  // Overview summary pills for each billed month
  const summaryPills = useMemo(() => {
    if (!ledger?.bills) return [];
    return generateMonthlyLedgerSummary(ledger.bills);
  }, [ledger?.bills]);

  // Helper to find receipt for a settled bill
  const getBillReceipt = (bill: FeeBill) => {
    const payment = ledger?.payments?.find(
      (p) => (p.bill_id && p.bill_id === bill.id) || (p.bill_number && p.bill_number === bill.bill_number)
    );
    if (payment) {
      return {
        id: payment.id,
        receipt_number: payment.receipt_number,
        payment_group_id: payment.payment_group_id || null,
      };
    }
    if (bill.payments && bill.payments.length > 0) {
      const latest = bill.payments[bill.payments.length - 1];
      return {
        id: latest.id,
        receipt_number: latest.receipt_number,
        payment_group_id: null,
      };
    }
    return null;
  };

  const renderLedgerStatusBadge = (status: LedgerBillStatus) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 shadow-2xs whitespace-nowrap">
            <CheckCircle2 className="w-3.5 h-3.5" />
            PAID
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 shadow-2xs whitespace-nowrap">
            <Clock className="w-3.5 h-3.5" />
            PARTIAL
          </span>
        );
      case 'UNPAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 shadow-2xs whitespace-nowrap">
            <AlertCircle className="w-3.5 h-3.5" />
            UNPAID
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border whitespace-nowrap">
            CANCELLED
          </span>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Coins className="w-6 h-6 text-primary" />
            Student Fee Account Ledger
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Complete financial transaction statement, itemized monthly invoices, and independent settlements.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {ledger && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPrintStatementOpen(true)}
                className="gap-1.5 h-8 text-xs font-semibold cursor-pointer shadow-2xs"
                title="Print Consolidated Invoice Statement (Ctrl+P)"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Statement</span>
              </Button>

              <Button
                size="sm"
                onClick={() => setIsPayAllOpen(true)}
                disabled={totalDue <= 0 || unpaidBills.length === 0}
                className="gap-1.5 h-8 text-xs font-semibold cursor-pointer shadow-2xs bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
                title="Collect payment to settle all outstanding months"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Pay All (NPR {totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })})</span>
              </Button>
            </>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <span>Session: {currentYear?.name || 'Active Session'}</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="p-16 text-center text-xs text-muted-foreground border rounded-xl bg-card">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
          Loading student financial ledger...
        </div>
      ) : !ledger ? (
        <div className="p-16 text-center text-xs text-muted-foreground border border-dashed rounded-xl bg-card">
          Student ledger account not found.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Student Profile & Overview Card */}
          <div className="p-4 rounded-xl border bg-card shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">{ledger.student_name}</h2>
                {ledger.class_name && <Badge variant="outline">{ledger.class_name}</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                Student ID: <span className="font-mono">{ledger.student_id}</span>
              </p>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-border/60">
              <CardHeader className="p-4 pb-1">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Total Invoiced
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <div className="text-xl font-bold font-mono text-foreground">
                  NPR {totalBilled.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">Sum of all bills issued</p>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="p-4 pb-1">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Total Paid to Date
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <div className="text-xl font-bold font-mono text-emerald-600">
                  NPR {totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">Confirmed receipts cleared</p>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="p-4 pb-1">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Outstanding Balance Due
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <div
                  className={`text-xl font-bold font-mono ${
                    totalDue > 0 ? 'text-destructive' : 'text-foreground'
                  }`}
                >
                  NPR {totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">Payable balance across all bills</p>
                {totalDue > 0 && unpaidBills.length > 0 && (
                  <Button
                    size="sm"
                    onClick={() => setIsPayAllOpen(true)}
                    className="w-full mt-2.5 h-7 text-xs font-semibold gap-1.5 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Pay All Dues
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Section 1: Invoices Breakdown & Monthly Settlement */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Invoices History ({ledger.bills.length})
              </h3>
              {ledger.bills.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                  className="h-7 text-xs gap-1.5 px-2.5 cursor-pointer self-start sm:self-auto"
                >
                  <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                  <span>
                    {sortOrder === 'asc'
                      ? 'Chronological (Baishakh → Chaitra)'
                      : 'Reverse Chronological'}
                  </span>
                </Button>
              )}
            </div>

            {/* Quick Monthly Summary Bar */}
            {summaryPills.length > 0 && (
              <div className="p-3.5 bg-muted/20 border border-border/60 rounded-xl space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    Monthly Billing Status Overview ({summaryPills.filter((p) => p.status === 'PAID').length}/{summaryPills.length} Months Settled)
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Click any pending month to collect payment
                  </span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {summaryPills.map((pill) => {
                    const isPaid = pill.status === 'PAID';
                    const isPartial = pill.status === 'PARTIAL';
                    const matchingBill = sortedBills.find((b) => b.id === pill.billId);

                    return (
                      <button
                        key={pill.monthCode + pill.month}
                        type="button"
                        disabled={isPaid || !matchingBill}
                        onClick={() => {
                          if (matchingBill && pill.dueAmount > 0) {
                            setActiveCollectBill(matchingBill);
                          }
                        }}
                        title={
                          isPaid
                            ? `${pill.month} bill is fully settled`
                            : matchingBill
                            ? `Click to pay ${pill.month} bill (Due: NPR ${pill.dueAmount.toLocaleString('en-IN')})`
                            : undefined
                        }
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                          isPaid
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300'
                            : isPartial
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 hover:border-amber-500 cursor-pointer shadow-2xs hover:scale-[1.02]'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 hover:border-rose-500 cursor-pointer shadow-2xs hover:scale-[1.02]'
                        }`}
                      >
                        {isPaid ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : isPartial ? (
                          <Clock className="w-3.5 h-3.5" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5" />
                        )}
                        <span>{pill.displayText}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {ledger.bills.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground border rounded-lg bg-card">
                No fee invoices generated yet.
              </div>
            ) : (
              <>
                {/* Mobile View: Clean Responsive Cards */}
                <div className="block md:hidden space-y-3">
                  {sortedBills.map((b) => {
                    const due = Number(b.due_amount);
                    const status = deriveBillLedgerStatus(b);
                    const matchingReceipt = getBillReceipt(b);

                    return (
                      <div
                        key={b.id}
                        className="p-4 rounded-xl border border-border/60 bg-card shadow-2xs space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {b.billing_month && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                                  {b.billing_month}
                                </span>
                              )}
                              <h4 className="font-semibold text-sm text-foreground">
                                {b.bill_title}
                              </h4>
                            </div>
                            <p className="text-xs text-muted-foreground font-mono">
                              {b.bill_number}
                            </p>
                          </div>
                          <div>{renderLedgerStatusBadge(status)}</div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-border/40">
                          <div>
                            <span className="text-muted-foreground text-[11px] block">Issue Date</span>
                            <span className="font-medium text-foreground cursor-default" title={formatDualDate(b.issue_date, calendarSystem)}>{formatDate(b.issue_date, calendarSystem)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-[11px] block">Due Date</span>
                            <span className="font-medium text-foreground cursor-default" title={formatDualDate(b.due_date, calendarSystem)}>{formatDate(b.due_date, calendarSystem)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-[11px] block">Payable</span>
                            <span className="font-mono font-semibold text-foreground">
                              NPR {Number(b.total_payable).toFixed(2)}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-[11px] block">Balance Due</span>
                            <span
                              className={`font-mono font-bold ${
                                due > 0 ? 'text-destructive' : 'text-emerald-600'
                              }`}
                            >
                              NPR {due.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <div className="text-[11px] text-muted-foreground">
                            Paid:{' '}
                            <span className="font-mono text-emerald-600 font-medium">
                              NPR {Number(b.paid_amount).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {due > 0 ? (
                              <Button
                                size="sm"
                                onClick={() => setActiveCollectBill(b)}
                                className="h-7 text-xs gap-1.5 px-3 font-medium cursor-pointer shadow-xs"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                Pay Month
                              </Button>
                            ) : matchingReceipt ? (
                              matchingReceipt.payment_group_id ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setActiveConsolidatedReceiptId(matchingReceipt.payment_group_id!)}
                                  className="h-7 text-xs gap-1 px-2 text-emerald-800 dark:text-emerald-300 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 cursor-pointer"
                                  title="View Unified Consolidated Pay All Receipt"
                                >
                                  <Layers className="w-3.5 h-3.5 text-emerald-600" />
                                  Consolidated
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setActivePrintReceiptId(matchingReceipt.id)}
                                  className="h-7 text-xs gap-1 px-2 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 cursor-pointer"
                                  title={`View Receipt ${matchingReceipt.receipt_number}`}
                                >
                                  <Receipt className="w-3.5 h-3.5" />
                                  Receipt
                                </Button>
                              )
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 px-1 py-0.5">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Settled
                              </span>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setActivePrintBillId(b.id)}
                              className="h-7 text-xs gap-1 px-2 cursor-pointer"
                              title="Print Invoice"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop View: Full Responsive Table */}
                <div className="hidden md:block border border-border/60 rounded-xl overflow-hidden bg-card shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">Bill #</th>
                          <th className="py-2.5 px-3">Title / Month</th>
                          <th className="py-2.5 px-3">Issue Date</th>
                          <th className="py-2.5 px-3">Due Date</th>
                          <th className="py-2.5 px-3 text-right">Subtotal</th>
                          <th className="py-2.5 px-3 text-right">Payable</th>
                          <th className="py-2.5 px-3 text-right">Paid</th>
                          <th className="py-2.5 px-3 text-right">Balance Due</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {sortedBills.map((b) => {
                          const due = Number(b.due_amount);
                          const status = deriveBillLedgerStatus(b);
                          const matchingReceipt = getBillReceipt(b);

                          return (
                            <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                              <td className="py-2.5 px-3 font-mono font-bold text-foreground">
                                {b.bill_number}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {b.billing_month && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                                        {b.billing_month}
                                      </span>
                                    )}
                                    <span className="font-semibold text-foreground">
                                      {b.bill_title}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap"><span className="cursor-default" title={formatDualDate(b.issue_date, calendarSystem)}>{formatDate(b.issue_date, calendarSystem)}</span></td>
                              <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap"><span className="cursor-default" title={formatDualDate(b.due_date, calendarSystem)}>{formatDate(b.due_date, calendarSystem)}</span></td>
                              <td className="py-2.5 px-3 text-right font-mono">
                                {Number(b.subtotal_amount).toFixed(2)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-semibold">
                                {Number(b.total_payable).toFixed(2)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-emerald-600 font-medium">
                                {Number(b.paid_amount).toFixed(2)}
                              </td>
                              <td
                                className={`py-2.5 px-3 text-right font-mono font-bold ${
                                  due > 0 ? 'text-destructive' : 'text-foreground'
                                }`}
                              >
                                {due.toFixed(2)}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {renderLedgerStatusBadge(status)}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {due > 0 ? (
                                    <Button
                                      size="sm"
                                      onClick={() => setActiveCollectBill(b)}
                                      className="h-7 text-[11px] gap-1 px-2.5 font-medium cursor-pointer shadow-xs"
                                    >
                                      <CreditCard className="w-3 h-3" />
                                      Pay Month
                                    </Button>
                                  ) : matchingReceipt ? (
                                    matchingReceipt.payment_group_id ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setActiveConsolidatedReceiptId(matchingReceipt.payment_group_id!)}
                                        className="h-7 text-[11px] gap-1 px-2 text-emerald-800 dark:text-emerald-300 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 cursor-pointer"
                                        title="View Unified Consolidated Pay All Receipt"
                                      >
                                        <Layers className="w-3 h-3 text-emerald-600" />
                                        Consolidated
                                      </Button>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setActivePrintReceiptId(matchingReceipt.id)}
                                        className="h-7 text-[11px] gap-1 px-2 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 cursor-pointer"
                                        title={`View Receipt ${matchingReceipt.receipt_number}`}
                                      >
                                        <Receipt className="w-3 h-3" />
                                        Receipt
                                      </Button>
                                    )
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 px-1 py-0.5">
                                      <CheckCircle2 className="w-3 h-3" />
                                      Settled
                                    </span>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setActivePrintBillId(b.id)}
                                    className="h-7 text-[11px] gap-1 px-2 cursor-pointer"
                                    title="Print Invoice"
                                  >
                                    <Printer className="w-3 h-3" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Section 2: Payments Receipts */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" />
              Receipts & Payment History ({ledger.payments.length})
            </h3>
            {ledger.payments.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground border rounded-lg bg-card">
                No payment receipts recorded yet.
              </div>
            ) : (
              <div className="border border-border/60 rounded-xl overflow-hidden bg-card shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground font-semibold">
                      <tr>
                        <th className="py-2.5 px-4">Receipt #</th>
                        <th className="py-2.5 px-4">Bill Ref</th>
                        <th className="py-2.5 px-4">Payment Method</th>
                        <th className="py-2.5 px-4">Txn Ref</th>
                        <th className="py-2.5 px-4">Payment Date</th>
                        <th className="py-2.5 px-4">Cashier</th>
                        <th className="py-2.5 px-4 text-right">Amount Paid</th>
                        <th className="py-2.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {ledger.payments.map((p) => (
                        <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-4 font-mono font-bold text-foreground">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{p.receipt_number}</span>
                              {p.payment_group_id && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] px-1.5 py-0 font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 font-mono"
                                  title={`Pay All Group: ${p.payment_group_id}`}
                                >
                                  Pay All
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-4 font-mono text-muted-foreground">{p.bill_number}</td>
                          <td className="py-2.5 px-4">
                            <Badge variant="outline" className="text-[10px] uppercase font-mono">
                              {p.payment_method}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-4 font-mono text-muted-foreground">
                            {p.transaction_reference || '—'}
                          </td>
                          <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap"><span className="cursor-default" title={formatDualDate(p.payment_date, calendarSystem)}>{formatDate(p.payment_date, calendarSystem)}</span></td>
                          <td className="py-2.5 px-4 text-muted-foreground">{p.received_by_name || 'Cashier'}</td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-foreground">
                            NPR {Number(p.amount_paid).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            {p.payment_group_id ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setActiveConsolidatedReceiptId(p.payment_group_id!)}
                                  className="h-7 text-xs gap-1 cursor-pointer border-emerald-300 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                                  title="View Unified Consolidated Receipt for all bills paid in this transaction"
                                >
                                  <Layers className="w-3.5 h-3.5 text-emerald-600" />
                                  Consolidated
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setActivePrintReceiptId(p.id)}
                                  className="h-7 text-xs gap-1 cursor-pointer text-muted-foreground hover:text-foreground"
                                  title="View Single Bill Receipt"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  Single
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setActivePrintReceiptId(p.id)}
                                className="h-7 text-xs gap-1 cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                Receipt
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Collect Single Month Payment Dialog */}
      <PaymentCollectDialog
        isOpen={!!activeCollectBill}
        onClose={() => setActiveCollectBill(null)}
        bill={activeCollectBill}
        onSubmit={async (data) => recordPaymentMutation.mutateAsync(data)}
        isLoading={recordPaymentMutation.isPending}
        onPaymentSuccess={(payment: FeePayment) => {
          setActivePrintReceiptId(payment.id);
        }}
      />

      {/* Collect Pay All Outstanding Dues Dialog */}
      {ledger && (
        <PaymentCollectDialog
          isOpen={isPayAllOpen}
          onClose={() => setIsPayAllOpen(false)}
          bill={null}
          isPayAllMode={true}
          totalAccountDue={totalDue}
          unpaidBills={unpaidBills}
          studentName={ledger.student_name}
          className={ledger.class_name}
          tenantId={activeTenantId}
          onSubmit={async (data) => recordPaymentMutation.mutateAsync(data)}
          isLoading={recordPaymentMutation.isPending}
          onPaymentSuccess={(payment: FeePayment) => {
            setIsPayAllOpen(false);
            if (payment.payment_group_id || payment.is_consolidated) {
              setActiveConsolidatedReceiptId(payment.payment_group_id || payment.id);
            } else {
              setActivePrintReceiptId(payment.id);
            }
          }}
        />
      )}

      {/* Consolidated Statement & Invoices Modal */}
      {ledger && (
        <PrintableStatementModal
          isOpen={isPrintStatementOpen}
          onClose={() => setIsPrintStatementOpen(false)}
          tenantId={activeTenantId}
          studentId={studentId}
          studentName={ledger.student_name}
          className={ledger.class_name}
          academicYearName={currentYear?.name}
          bills={sortedBills}
          payments={ledger.payments}
          totalBilled={totalBilled}
          totalPaid={totalPaid}
          totalDue={totalDue}
        />
      )}

      {/* Printable Invoice Modal */}
      <PrintableBillModal
        isOpen={!!activePrintBillId}
        onClose={() => setActivePrintBillId(null)}
        tenantId={activeTenantId}
        billId={activePrintBillId}
      />

      {/* Printable Single Receipt Modal */}
      <PrintableReceiptModal
        isOpen={!!activePrintReceiptId}
        onClose={() => setActivePrintReceiptId(null)}
        tenantId={activeTenantId}
        paymentId={activePrintReceiptId}
      />

      {/* Printable Consolidated Receipt Modal */}
      <PrintableConsolidatedReceiptModal
        isOpen={!!activeConsolidatedReceiptId}
        onClose={() => setActiveConsolidatedReceiptId(null)}
        tenantId={activeTenantId}
        identifier={activeConsolidatedReceiptId}
      />
    </div>
  );
};
