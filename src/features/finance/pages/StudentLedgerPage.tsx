import React, { useState } from 'react';
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
  Percent,
} from 'lucide-react';
import type { FeeBill, FeePayment } from '../types';
import { PaymentCollectDialog } from '../components/PaymentCollectDialog';
import { PrintableBillModal } from '../components/PrintableBillModal';
import { PrintableReceiptModal } from '../components/PrintableReceiptModal';
import { useCalendarPreferenceStore } from '@/stores/calendarPreferenceStore';
import { formatDualDate } from '@/features/school-settings/utils/nepaliDate';

export const StudentLedgerPage: React.FC = () => {
  const { studentId } = useParams({ strict: false }) as { studentId: string };
  const { activeTenantId } = useAuth();
  const { calendarSystem } = useCalendarPreferenceStore();
  const { currentYear } = useCurrentAcademicYear(activeTenantId);

  const { data: ledger, isLoading } = useStudentLedger(activeTenantId, studentId);

  const [activeCollectBill, setActiveCollectBill] = useState<FeeBill | null>(null);
  const [activePrintBillId, setActivePrintBillId] = useState<string | null>(null);
  const [activePrintReceiptId, setActivePrintReceiptId] = useState<string | null>(null);

  const recordPaymentMutation = useRecordPayment(activeTenantId);

  const totalBilled = Number(ledger?.total_billed || 0);
  const totalPaid = Number(ledger?.total_paid || 0);
  const totalDue = Number(ledger?.total_due || 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div className="space-y-1">
          <Link
            to="/finance/bills"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Bills
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Coins className="w-6 h-6 text-primary" />
            Student Fee Account Ledger
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Complete financial transaction statement, invoices history, and payment logs.
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
          <Calendar className="w-3.5 h-3.5 text-primary" />
          <span>Session: {currentYear?.name || 'Active Session'}</span>
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
              </CardContent>
            </Card>
          </div>

          {/* Section 1: Invoices Breakdown */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Invoices History ({ledger.bills.length})
            </h3>
            {ledger.bills.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground border rounded-lg bg-card">
                No fee invoices generated yet.
              </div>
            ) : (
              <div className="border border-border/60 rounded-xl overflow-hidden bg-card shadow-2xs">
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
                      {ledger.bills.map((b) => {
                        const due = Number(b.due_amount);
                        return (
                          <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-bold">{b.bill_number}</td>
                            <td className="py-2.5 px-3 font-medium">{b.bill_title}</td>
                            <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                              {formatDualDate(b.issue_date, calendarSystem)}
                            </td>
                            <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                              {formatDualDate(b.due_date, calendarSystem)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono">
                              {Number(b.subtotal_amount).toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold">
                              {Number(b.total_payable).toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-600">
                              {Number(b.paid_amount).toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-destructive">
                              {due.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <Badge variant={b.status === 'PAID' ? 'success' : 'outline'}>
                                {b.status}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {due > 0 && (
                                  <Button
                                    size="sm"
                                    onClick={() => setActiveCollectBill(b)}
                                    className="h-7 text-[11px] gap-1 px-2 cursor-pointer"
                                  >
                                    <CreditCard className="w-3 h-3" />
                                    Pay
                                  </Button>
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
                            {p.receipt_number}
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
                          <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap">
                            {formatDualDate(p.payment_date, calendarSystem)}
                          </td>
                          <td className="py-2.5 px-4 text-muted-foreground">{p.received_by_name || 'Cashier'}</td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-foreground">
                            NPR {Number(p.amount_paid).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setActivePrintReceiptId(p.id)}
                              className="h-7 text-xs gap-1 cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              Receipt
                            </Button>
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

      {/* Collect Payment Dialog */}
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

      {/* Printable Invoice Modal */}
      <PrintableBillModal
        isOpen={!!activePrintBillId}
        onClose={() => setActivePrintBillId(null)}
        tenantId={activeTenantId}
        billId={activePrintBillId}
      />

      {/* Printable Receipt Modal */}
      <PrintableReceiptModal
        isOpen={!!activePrintReceiptId}
        onClose={() => setActivePrintReceiptId(null)}
        tenantId={activeTenantId}
        paymentId={activePrintReceiptId}
      />
    </div>
  );
};
