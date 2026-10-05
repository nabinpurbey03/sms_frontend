import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, X, Loader2, FileText, AlertCircle } from 'lucide-react';
import { useBill } from '../hooks';
import { useAuth } from '@/auth/useAuth';
import { useCalendarPreferenceStore } from '@/stores/calendarPreferenceStore';
import { formatDualDate } from '@/features/school-settings/utils/nepaliDate';
import { numberToWords, isArrearsFeeHead, formatCurrency } from '../utils/cashierUtils';

interface PrintableBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string | null;
  billId: string | null;
  schoolName?: string;
}

export const PrintableBillModal: React.FC<PrintableBillModalProps> = ({
  isOpen,
  onClose,
  tenantId,
  billId,
  schoolName,
}) => {
  const { activeTenantName } = useAuth();
  const { calendarSystem } = useCalendarPreferenceStore();
  const { data: bill, isLoading } = useBill(tenantId, billId);

  const effectiveSchoolName = schoolName || activeTenantName || 'School Portal';

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

  const getStatusBadge = (status?: string) => {
    switch (status?.toUpperCase()) {
      case 'PAID':
        return {
          label: 'PAID',
          className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
          printColor: 'text-emerald-800 border-emerald-600 bg-emerald-50',
        };
      case 'PARTIAL':
        return {
          label: 'PARTIALLY PAID',
          className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
          printColor: 'text-amber-800 border-amber-600 bg-amber-50',
        };
      case 'CANCELLED':
        return {
          label: 'CANCELLED',
          className: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30',
          printColor: 'text-zinc-700 border-zinc-500 bg-zinc-50',
        };
      case 'UNPAID':
      default:
        return {
          label: 'UNPAID',
          className: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30',
          printColor: 'text-rose-800 border-rose-600 bg-rose-50',
        };
    }
  };

  const statusMeta = getStatusBadge(bill?.status);
  const isOverdue =
    bill?.due_date &&
    new Date(bill.due_date) < new Date() &&
    Number(bill.due_amount || 0) > 0;

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
          #printable-bill-doc,
          #printable-bill-doc * {
            visibility: visible !important;
          }
          #printable-bill-doc {
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
        {/* [&>button:last-child]:hidden hides the default DialogPrimitive.Close button from DialogContent so there is exactly ONE close button in the header bar */}
        <DialogContent className="sm:max-w-3xl lg:max-w-4xl max-h-[92vh] overflow-y-auto p-0 border border-border/80 bg-background text-foreground [&>button:last-child]:hidden shadow-2xl">
          {/* Header Action Bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/40 no-print sticky top-0 z-20 backdrop-blur-sm">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-foreground">Fee Invoice Preview</span>
                {bill?.bill_number && (
                  <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 border-border bg-card">
                    #{bill.bill_number}
                  </Badge>
                )}
                {bill?.status && (
                  <Badge variant="outline" className={`text-[10px] font-semibold px-2 py-0 ${statusMeta.className}`}>
                    {statusMeta.label}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handlePrint}
                className="gap-1.5 h-8 text-xs font-semibold shadow-xs cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
                title="Print Invoice (Ctrl+P)"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Invoice</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                aria-label="Close invoice preview"
                title="Close preview (Esc)"
              >
                <X className="w-4 h-4" />
                <span className="sr-only">Close preview</span>
              </Button>
            </div>
          </div>

          {/* Modal Body / Document Preview Canvas */}
          <div className="p-4 sm:p-6 md:p-8 bg-muted/30 dark:bg-zinc-950/60 flex justify-center min-h-[500px]">
            {isLoading ? (
              <div className="p-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="w-7 h-7 animate-spin text-primary" />
                <span className="text-xs font-medium">Generating official invoice preview...</span>
              </div>
            ) : !bill ? (
              <div className="p-16 text-center text-xs text-muted-foreground space-y-2">
                <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto" />
                <p className="font-medium text-foreground">Fee invoice record not found.</p>
                <p className="text-[11px]">The requested bill ID may have been removed or cancelled.</p>
              </div>
            ) : (
              /* A4 Formatted Document Sheet */
              <div
                id="printable-bill-doc"
                className="w-full max-w-[210mm] bg-white text-zinc-900 shadow-md sm:shadow-lg border border-zinc-200/90 rounded-xs p-6 sm:p-8 md:p-10 space-y-6 text-xs font-sans"
              >
                {/* 1. School Letterhead */}
                <div className="text-center space-y-1.5 border-b-2 border-zinc-900 pb-4">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 uppercase">
                    {effectiveSchoolName}
                  </h1>
                  <p className="text-[11px] text-zinc-600 font-medium tracking-wide">
                    FEE BILLING & FINANCIAL RECORD DIVISION
                  </p>
                  <div className="pt-1 flex justify-center items-center">
                    <span className="inline-block px-3.5 py-0.5 text-xs font-bold uppercase tracking-wider border-2 border-zinc-900 bg-zinc-100 text-zinc-900">
                      STUDENT FEE INVOICE
                    </span>
                  </div>
                </div>

                {/* 2. Invoice Metadata */}
                <div className="grid grid-cols-2 gap-4 text-xs pt-1">
                  <div className="space-y-1">
                    <div>
                      <span className="text-zinc-500 font-medium">Invoice No: </span>
                      <span className="font-mono font-bold text-zinc-900">{bill.bill_number}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 font-medium">Billing Title: </span>
                      <span className="font-semibold text-zinc-900">{bill.bill_title}</span>
                    </div>
                    {bill.billing_month && (
                      <div>
                        <span className="text-zinc-500 font-medium">Billing Cycle: </span>
                        <span className="font-semibold text-zinc-900">{bill.billing_month}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 text-right">
                    <div>
                      <span className="text-zinc-500 font-medium">Issue Date: </span>
                      <span className="text-zinc-900 font-medium">
                        {formatDualDate(bill.issue_date, calendarSystem)}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 font-medium">Payment Due Date: </span>
                      <span className={`font-bold ${isOverdue ? 'text-red-600' : 'text-zinc-900'}`}>
                        {formatDualDate(bill.due_date, calendarSystem)}
                      </span>
                      {isOverdue && (
                        <span className="ml-1 text-[10px] text-red-600 font-bold uppercase">(Overdue)</span>
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-1.5 pt-0.5">
                      <span className="text-zinc-500 font-medium">Status: </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${statusMeta.printColor}`}>
                        {statusMeta.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Student Identification Card */}
                <div className="p-3 border border-zinc-300 rounded-sm bg-zinc-50/80 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Student Name</span>
                    <span className="font-bold text-zinc-900 text-sm">{bill.student_name || 'Student'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Class / Grade</span>
                    <span className="font-semibold text-zinc-900">{bill.class_name || '—'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Student Reference</span>
                    <span className="font-mono text-zinc-800">{bill.student_id ? bill.student_id.slice(0, 13) : '—'}</span>
                  </div>
                </div>

                {/* 4. Fee Head Line Items Table */}
                <div className="overflow-hidden border border-zinc-300 rounded-xs print-avoid-break">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-zinc-100 text-zinc-800 font-bold border-b border-zinc-300">
                        <th className="py-2 px-3 text-center w-12 border-r border-zinc-300">S.N.</th>
                        <th className="py-2 px-3 text-left border-r border-zinc-300">Particulars / Fee Head</th>
                        <th className="py-2 px-4 text-right w-36">Amount (NPR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {bill.items.map((item, idx) => {
                        const isArrears = isArrearsFeeHead(item.fee_name);
                        return (
                          <tr key={item.id || idx} className={idx % 2 === 1 ? 'bg-zinc-50/40' : 'bg-white'}>
                            <td className="py-2 px-3 text-center border-r border-zinc-300 font-mono text-zinc-500">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-3 border-r border-zinc-300 text-zinc-900 font-medium">
                              {item.fee_name}
                              {isArrears && (
                                <span className="ml-2 inline-flex items-center text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 font-semibold uppercase">
                                  Arrears
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-4 text-right font-mono font-medium text-zinc-900">
                              {Number(item.amount).toLocaleString('en-IN', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 5. Financial Calculation & Balance Due Summary */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-1 print-avoid-break text-xs">
                  {/* Left side: Amount in Words & Notes */}
                  <div className="w-full sm:flex-1 space-y-2.5">
                    <div className="p-3 border border-zinc-200 rounded-xs bg-zinc-50">
                      <span className="text-zinc-500 font-bold uppercase text-[10px] block tracking-wide">
                        Amount in Words (Balance Due):
                      </span>
                      <span className="font-semibold text-zinc-900 italic text-xs mt-0.5 block">
                        {numberToWords(bill.due_amount)}
                      </span>
                    </div>

                    {bill.notes && (
                      <div className="p-2.5 border border-zinc-200 rounded-xs bg-zinc-50 text-[11px]">
                        <span className="font-bold text-zinc-500 uppercase text-[9px] block">Notice / Terms:</span>
                        <span className="italic text-zinc-700">{bill.notes}</span>
                      </div>
                    )}
                  </div>

                  {/* Right side: Calculation Ledger */}
                  <div className="w-full sm:w-80 space-y-1.5 border border-zinc-200 bg-zinc-50/50 p-3 rounded-xs">
                    <div className="flex justify-between py-0.5 text-zinc-600">
                      <span>Current Cycle Subtotal:</span>
                      <span className="font-mono text-zinc-900 font-medium">
                        NPR {Number(bill.subtotal_amount).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    {Number(bill.previous_due_amount) > 0 && (
                      <div className="flex justify-between py-0.5 text-amber-900 font-medium">
                        <span>Carried Arrears / Prior Dues:</span>
                        <span className="font-mono">
                          + NPR {Number(bill.previous_due_amount).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between py-1 border-t border-zinc-300 font-bold text-zinc-900">
                      <span>Total Billed Payable:</span>
                      <span className="font-mono">
                        NPR {Number(bill.total_payable).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    {Number(bill.paid_amount) > 0 && (
                      <div className="flex justify-between py-0.5 text-emerald-700 font-medium">
                        <span>Paid to Date:</span>
                        <span className="font-mono">
                          - NPR {Number(bill.paid_amount).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between py-1.5 border-y-2 border-zinc-900 font-bold text-sm bg-zinc-100 px-2 mt-1">
                      <span className="text-zinc-900">BALANCE DUE:</span>
                      <span
                        className={`font-mono ${
                          Number(bill.due_amount) > 0 ? 'text-rose-700' : 'text-emerald-700'
                        }`}
                      >
                        NPR {Number(bill.due_amount).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 6. Payment Guidelines */}
                <div className="pt-2 text-[10px] text-zinc-500 space-y-0.5 print-avoid-break border-t border-zinc-200">
                  <p>• Please present this invoice at the cashier counter or quote Invoice No. for digital banking / wallet payment.</p>
                  <p>• Fee payments received after the specified due date may incur late fee adjustments per school finance policy.</p>
                </div>

                {/* 7. Dual Authorization Signatures */}
                <div className="pt-10 flex justify-between items-end text-xs print-avoid-break">
                  <div className="text-center space-y-1">
                    <div className="w-44 border-b border-zinc-800 mx-auto"></div>
                    <span className="font-medium text-zinc-800 text-[11px] block">Student / Guardian Signature</span>
                    <span className="text-[10px] text-zinc-500">Acknowledged By</span>
                  </div>

                  <div className="text-center space-y-1">
                    <div className="w-48 border-b border-zinc-800 mx-auto"></div>
                    <span className="font-bold text-zinc-900 text-[11px] block">Cashier / Finance Officer</span>
                    <span className="text-[10px] text-zinc-500">Authorized Signature & Stamp</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer (No Print) */}
          <DialogFooter className="p-3.5 border-t bg-muted/20 no-print flex flex-row items-center justify-between">
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              Tip: Press <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-muted rounded border">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-muted rounded border">P</kbd> to quick-print this invoice.
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={onClose} className="text-xs cursor-pointer">
                Close
              </Button>
              <Button
                size="sm"
                onClick={handlePrint}
                className="gap-1.5 text-xs font-semibold cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Invoice
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
