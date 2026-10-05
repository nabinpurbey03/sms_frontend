import React from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, X, FileText, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { useAuth } from '@/auth/useAuth';
import { useCalendarPreferenceStore } from '@/stores/calendarPreferenceStore';
import { formatDualDate } from '@/features/school-settings/utils/nepaliDate';
import {
  numberToWords,
  formatCurrency,
  sortBillsChronologically,
  extractSeparateMonthsDue,
  deriveBillLedgerStatus,
} from '../utils/cashierUtils';
import type { FeeBill, FeePayment } from '../types';

export interface PrintableStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string | null;
  studentId: string;
  studentName: string;
  className?: string;
  academicYearName?: string;
  bills: FeeBill[];
  payments?: FeePayment[];
  totalBilled: number;
  totalPaid: number;
  totalDue: number;
  schoolName?: string;
}

export const PrintableStatementModal: React.FC<PrintableStatementModalProps> = ({
  isOpen,
  onClose,
  tenantId,
  studentId,
  studentName,
  className,
  academicYearName,
  bills,
  payments = [],
  totalBilled,
  totalPaid,
  totalDue,
  schoolName,
}) => {
  const { activeTenantName } = useAuth();
  const { calendarSystem } = useCalendarPreferenceStore();

  const effectiveSchoolName = schoolName || activeTenantName || 'School Fee Portal';

  const handlePrint = () => {
    window.print();
  };

  // Keyboard shortcut: Ctrl+P or Cmd+P to trigger print while preview modal is open
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const sortedBills = React.useMemo(() => {
    return sortBillsChronologically(bills || [], 'asc');
  }, [bills]);

  const separateMonthsDue = React.useMemo(() => {
    return extractSeparateMonthsDue(sortedBills);
  }, [sortedBills]);

  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: portrait;
            margin: 10mm 12mm;
          }
          html, body {
            background: #fff !important;
            height: auto !important;
            overflow: visible !important;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-statement-doc,
          #printable-statement-doc * {
            visibility: visible !important;
          }
          #printable-statement-doc {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #fff !important;
            color: #000 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
          .print-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-4xl lg:max-w-5xl max-h-[92vh] overflow-y-auto p-0 border border-border/80 bg-background text-foreground [&>button:last-child]:hidden shadow-2xl">
          {/* Header Action Bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/40 no-print sticky top-0 z-20 backdrop-blur-sm">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-foreground">Consolidated Invoice Statement</span>
                <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 border-border bg-card">
                  {sortedBills.length} Invoices Till Now
                </Badge>
                {totalDue > 0 ? (
                  <Badge variant="outline" className="text-[10px] font-semibold px-2 py-0 bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30">
                    Outstanding: NPR {totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] font-semibold px-2 py-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                    All Settled (No Dues)
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handlePrint}
                className="gap-1.5 h-8 text-xs font-semibold shadow-xs cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
                title="Print Consolidated Invoice (Ctrl+P)"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Statement</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                aria-label="Close statement preview"
                title="Close preview (Esc)"
              >
                <X className="w-4 h-4" />
                <span className="sr-only">Close preview</span>
              </Button>
            </div>
          </div>

          {/* Document Preview Canvas */}
          <div className="p-4 sm:p-6 md:p-8 bg-muted/30 dark:bg-zinc-950/60 flex justify-center min-h-[500px]">
            {/* A4 Formatted Document Sheet */}
            <div
              id="printable-statement-doc"
              className="w-full max-w-[210mm] bg-white text-zinc-900 shadow-md sm:shadow-lg border border-zinc-200/90 rounded-xs p-6 sm:p-8 md:p-10 space-y-6 text-xs font-sans"
            >
              {/* 1. Institution Header */}
              <div className="text-center space-y-1.5 border-b-2 border-zinc-900 pb-4">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 uppercase">
                  {effectiveSchoolName}
                </h1>
                <p className="text-[11px] text-zinc-600 font-medium tracking-wide">
                  FEE BILLING & FINANCIAL RECORD DIVISION
                </p>
                <div className="pt-1 flex justify-center items-center">
                  <span className="inline-block px-3.5 py-0.5 text-xs font-bold uppercase tracking-wider border-2 border-zinc-900 bg-zinc-100 text-zinc-900">
                    CONSOLIDATED FEE INVOICE & STUDENT STATEMENT
                  </span>
                </div>
              </div>

              {/* 2. Student & Statement Metadata Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs pt-1 border border-zinc-300 rounded-sm p-3.5 bg-zinc-50/70 print:bg-transparent">
                <div className="space-y-1">
                  <div>
                    <span className="text-zinc-500 font-medium">Student Name: </span>
                    <span className="font-bold text-zinc-900 uppercase">{studentName}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 font-medium">Student ID: </span>
                    <span className="font-mono font-bold text-zinc-900">{studentId}</span>
                  </div>
                  {className && (
                    <div>
                      <span className="text-zinc-500 font-medium">Grade / Class: </span>
                      <span className="font-semibold text-zinc-900">{className}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1 text-right">
                  <div>
                    <span className="text-zinc-500 font-medium">Academic Session: </span>
                    <span className="font-semibold text-zinc-900">{academicYearName || 'Current Session'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 font-medium">Statement Date: </span>
                    <span className="font-medium text-zinc-900">{formatDualDate(todayIso, calendarSystem)}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 font-medium">Account Status: </span>
                    <span
                      className={`font-bold ${
                        totalDue > 0 ? 'text-rose-700 print:text-black' : 'text-emerald-700 print:text-black'
                      }`}
                    >
                      {totalDue > 0 ? 'OUTSTANDING BALANCE' : 'FULLY SETTLED'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Itemized Invoices Table */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                    Itemized Invoices Issued Till Date ({sortedBills.length})
                  </h3>
                  <span className="text-[10px] text-zinc-500">
                    Chronological billing records (Baishakh → Chaitra)
                  </span>
                </div>

                <div className="border border-zinc-300 rounded-xs overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-zinc-100 border-b border-zinc-300 text-[11px] font-bold text-zinc-900">
                        <th className="py-2 px-2.5 w-8 text-center">#</th>
                        <th className="py-2 px-3">Billing Month</th>
                        <th className="py-2 px-3">Invoice No</th>
                        <th className="py-2 px-3">Issue Date</th>
                        <th className="py-2 px-3 text-right">Invoiced (NPR)</th>
                        <th className="py-2 px-3 text-right">Paid (NPR)</th>
                        <th className="py-2 px-3 text-right">Due for Month (NPR)</th>
                        <th className="py-2 px-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {sortedBills.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-6 text-center text-zinc-500 italic">
                            No invoices generated for this student in the current session.
                          </td>
                        </tr>
                      ) : (
                        sortedBills.map((b, idx) => {
                          const status = deriveBillLedgerStatus(b);
                          const monthDue = Number(b.due_amount);
                          return (
                            <tr key={b.id} className="hover:bg-zinc-50/50 print:hover:bg-transparent">
                              <td className="py-2 px-2.5 text-center text-zinc-500 font-mono text-[11px]">
                                {idx + 1}
                              </td>
                              <td className="py-2 px-3 font-semibold text-zinc-900">
                                {b.billing_month || b.bill_title || 'Fee Invoice'}
                              </td>
                              <td className="py-2 px-3 font-mono text-zinc-600 text-[11px]">
                                {b.bill_number}
                              </td>
                              <td className="py-2 px-3 text-zinc-600 whitespace-nowrap text-[11px]">
                                {formatDualDate(b.issue_date, calendarSystem)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-medium text-zinc-900">
                                {Number(b.total_payable || b.subtotal_amount).toLocaleString('en-IN', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-medium text-emerald-700 print:text-black">
                                {Number(b.paid_amount || 0).toLocaleString('en-IN', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-zinc-900">
                                <span className={monthDue > 0 ? 'text-rose-700 print:text-black' : 'text-zinc-500'}>
                                  {monthDue.toLocaleString('en-IN', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                              </td>
                              <td className="py-2 px-2.5 text-center">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    status === 'PAID'
                                      ? 'bg-emerald-100 text-emerald-800 print:border print:border-emerald-600'
                                      : status === 'PARTIAL'
                                      ? 'bg-amber-100 text-amber-800 print:border print:border-amber-600'
                                      : 'bg-rose-100 text-rose-800 print:border print:border-rose-600'
                                  }`}
                                >
                                  {status}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4. Financial Calculation Ledger & Separate Months Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 print-avoid-break">
                {/* Left Column: Itemized Unpaid Months Due Breakdown */}
                <div className="border border-zinc-300 rounded-xs p-3.5 bg-zinc-50/50 print:bg-transparent space-y-2">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-900 border-b border-zinc-200 pb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-zinc-700" />
                    Unpaid Invoices Breakdown (Separate Months Due)
                  </h4>
                  {separateMonthsDue.length === 0 ? (
                    <div className="py-3 text-center text-xs text-emerald-700 font-semibold flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      All issued monthly invoices have been settled in full.
                    </div>
                  ) : (
                    <div className="space-y-1.5 pt-1">
                      {separateMonthsDue.map((item) => (
                        <div
                          key={item.billId}
                          className="flex justify-between items-center text-xs py-1 border-b border-dashed border-zinc-200 last:border-none"
                        >
                          <span className="font-medium text-zinc-800">
                            Due amount for <span className="font-bold">{item.month}</span> ({item.billNumber}):
                          </span>
                          <span className="font-mono font-bold text-rose-700 print:text-black">
                            NPR {item.dueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Column: Statement Totals */}
                <div className="border border-zinc-300 rounded-xs p-3.5 bg-zinc-50/50 print:bg-transparent space-y-2">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-900 border-b border-zinc-200 pb-1.5">
                    Account Settlement Summary
                  </h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between py-0.5">
                      <span className="text-zinc-600">Total Invoiced Amount:</span>
                      <span className="font-mono font-medium text-zinc-900">
                        NPR {totalBilled.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between py-0.5 text-emerald-700 font-medium">
                      <span>Total Paid to Date:</span>
                      <span className="font-mono">
                        - NPR {totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-y-2 border-zinc-900 font-bold text-sm bg-zinc-100 px-2 mt-2">
                      <span className="text-zinc-900 uppercase">Net Outstanding Balance Due:</span>
                      <span
                        className={`font-mono ${
                          totalDue > 0 ? 'text-rose-700 print:text-black' : 'text-emerald-700 print:text-black'
                        }`}
                      >
                        NPR {totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="pt-1.5 text-[11px] text-zinc-600 italic">
                      <span className="font-semibold text-zinc-800 not-italic">In Words: </span>
                      {numberToWords(totalDue)}
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Recent Payment Receipts Summary (if available) */}
              {payments.length > 0 && (
                <div className="space-y-2 pt-1 print-avoid-break">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-900">
                    Payment Receipts Cleared ({payments.length})
                  </h4>
                  <div className="border border-zinc-300 rounded-xs overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-zinc-100 border-b border-zinc-300 text-[10px] font-bold text-zinc-700">
                          <th className="py-1.5 px-3">Receipt #</th>
                          <th className="py-1.5 px-3">Bill Ref</th>
                          <th className="py-1.5 px-3">Payment Method</th>
                          <th className="py-1.5 px-3">Payment Date</th>
                          <th className="py-1.5 px-3 text-right">Amount Paid</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        {payments.slice(0, 8).map((p) => (
                          <tr key={p.id}>
                            <td className="py-1.5 px-3 font-mono font-bold text-zinc-900">{p.receipt_number}</td>
                            <td className="py-1.5 px-3 font-mono text-zinc-600">{p.bill_number}</td>
                            <td className="py-1.5 px-3 uppercase text-[10px] font-mono text-zinc-700">{p.payment_method}</td>
                            <td className="py-1.5 px-3 text-zinc-600 whitespace-nowrap">
                              {formatDualDate(p.payment_date, calendarSystem)}
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono font-bold text-zinc-900">
                              NPR {Number(p.amount_paid).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 6. Signatures and Official Stamp */}
              <div className="pt-8 border-t border-zinc-300 grid grid-cols-3 gap-6 text-center text-xs print-avoid-break">
                <div className="space-y-10">
                  <div className="h-8 border-b border-dashed border-zinc-400"></div>
                  <p className="font-semibold text-zinc-800">Cashier / Billing In-Charge</p>
                </div>
                <div className="space-y-10">
                  <div className="h-8 border-b border-dashed border-zinc-400"></div>
                  <p className="font-semibold text-zinc-800">School Administration / Seal</p>
                </div>
                <div className="space-y-10">
                  <div className="h-8 border-b border-dashed border-zinc-400"></div>
                  <p className="font-semibold text-zinc-800">Parent / Guardian Signature</p>
                </div>
              </div>

              {/* Footer Note */}
              <div className="text-center text-[10px] text-zinc-500 pt-2 border-t border-zinc-200">
                This is a computer-generated student financial statement and consolidated invoice. Please retain for your official records.
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
