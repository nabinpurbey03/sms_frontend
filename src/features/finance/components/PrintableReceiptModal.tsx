import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, X, Loader2, CheckCircle2 } from 'lucide-react';
import { useReceiptDocument } from '../hooks';
import { useCalendarPreferenceStore } from '@/stores/calendarPreferenceStore';
import { formatDualDate } from '@/features/school-settings/utils/nepaliDate';

import type { FeePayment } from '../types';

interface PrintableReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string | null;
  paymentId: string | null;
  payment?: FeePayment | null;
}

export const PrintableReceiptModal: React.FC<PrintableReceiptModalProps> = ({
  isOpen,
  onClose,
  tenantId,
  paymentId,
  payment,
}) => {
  const { calendarSystem } = useCalendarPreferenceStore();
  const { data: receipt, isLoading } = useReceiptDocument(tenantId, paymentId);
  const lateFeeAmount = Number(receipt?.late_fee_amount ?? payment?.late_fee_amount ?? 0);

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
          #printable-receipt-doc,
          #printable-receipt-doc * {
            visibility: visible !important;
          }
          #printable-receipt-doc {
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
        {/* [&>button:last-child]:hidden hides the default DialogPrimitive.Close button so there is only ONE close button in the header bar */}
        <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto p-0 border border-border/80 bg-background text-foreground [&>button:last-child]:hidden shadow-2xl">
          <DialogTitle className="sr-only">Payment Receipt Preview</DialogTitle>
          <DialogDescription className="sr-only">
            Printable preview of official school fee payment receipt.
          </DialogDescription>
          {/* Header Action Bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/40 no-print sticky top-0 z-20 backdrop-blur-sm">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-foreground">Official Payment Receipt Preview</span>
                {receipt?.receipt_number && (
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-border bg-card font-semibold">
                    #{receipt.receipt_number}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handlePrint}
                className="gap-1.5 h-8 text-xs font-semibold shadow-xs cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
                title="Print Receipt (Ctrl+P)"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Receipt</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                aria-label="Close receipt preview"
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
                <span className="text-xs font-medium">Generating official receipt preview...</span>
              </div>
            ) : !receipt ? (
              <div className="p-16 text-center text-xs text-muted-foreground">Receipt not found.</div>
            ) : (
              <div
                id="printable-receipt-doc"
                className="w-full max-w-[210mm] bg-white text-zinc-900 shadow-md sm:shadow-lg border border-zinc-200/90 rounded-xs p-6 sm:p-8 md:p-10 space-y-6 text-xs font-sans"
              >
                {/* Receipt Letterhead */}
              <div className="text-center space-y-1 border-b-2 border-black pb-4">
                <h1 className="text-xl font-bold tracking-tight uppercase">{receipt.school_name}</h1>
                {receipt.school_address && (
                  <p className="text-xs text-zinc-600">{receipt.school_address}</p>
                )}
                <div className="text-[11px] text-zinc-500 flex justify-center gap-4">
                  {receipt.school_phone && <span>Tel: {receipt.school_phone}</span>}
                  {receipt.school_email && <span>Email: {receipt.school_email}</span>}
                </div>
                <div className="pt-2">
                  <span className="inline-block px-3 py-0.5 text-xs font-bold uppercase tracking-wider border border-black bg-zinc-100">
                    FEE PAYMENT RECEIPT
                  </span>
                </div>
              </div>

              {/* Meta & Identification Bar */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <div>
                    <span className="text-zinc-500">Receipt No: </span>
                    <span className="font-mono font-bold">{receipt.receipt_number}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Bill Ref: </span>
                    <span className="font-mono font-medium">{receipt.bill_number}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Bill Title: </span>
                    <span className="font-medium">{receipt.bill_title}</span>
                  </div>
                  {receipt.billing_month && (
                    <div>
                      <span className="text-zinc-500">Billing Month: </span>
                      <span className="font-medium">{receipt.billing_month}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-1 text-right">
                  <div>
                    <span className="text-zinc-500">Payment Date: </span>
                    <span className="font-medium">{formatDualDate(receipt.payment_date, calendarSystem)}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Payment Mode: </span>
                    <span className="font-semibold uppercase">{receipt.payment_method}</span>
                  </div>
                  {receipt.transaction_reference && (
                    <div>
                      <span className="text-zinc-500">Ref / Txn #: </span>
                      <span className="font-mono">{receipt.transaction_reference}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Student Details Card */}
              <div className="p-3 border border-zinc-300 rounded bg-zinc-50 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-zinc-500">Student Name: </span>
                  <span className="font-bold">{receipt.student_name}</span>
                </div>
                <div className="text-right">
                  <span className="text-zinc-500">Class & Section: </span>
                  <span className="font-semibold">
                    {receipt.class_name} {receipt.section_name ? `- ${receipt.section_name}` : ''}
                  </span>
                </div>
                {receipt.roll_number && (
                  <div>
                    <span className="text-zinc-500">Roll No: </span>
                    <span className="font-mono">{receipt.roll_number}</span>
                  </div>
                )}
                {receipt.parent_name && (
                  <div className="text-right">
                    <span className="text-zinc-500">Parent / Guardian: </span>
                    <span>{receipt.parent_name}</span>
                  </div>
                )}
              </div>

              {/* Items Breakdown Table */}
              <table className="w-full text-xs border border-collapse border-zinc-300">
                <thead>
                  <tr className="bg-zinc-100 border-b border-zinc-300">
                    <th className="py-1.5 px-3 text-left w-12 border-r border-zinc-300">S.N.</th>
                    <th className="py-1.5 px-3 text-left border-r border-zinc-300">Particulars / Fee Head</th>
                    <th className="py-1.5 px-3 text-right w-32">Amount (NPR)</th>
                  </tr>
                </thead>
                <tbody>
                  {receipt.items.map((item, idx) => {
                    const isArrears =
                      item.fee_name.toLowerCase().includes('due amount for') ||
                      item.fee_name.toLowerCase().includes('due amount academic year') ||
                      item.fee_name.toLowerCase().includes('prior dues');
                    return (
                      <tr key={idx} className="border-b border-zinc-200">
                        <td className="py-1.5 px-3 border-r border-zinc-300 font-mono text-zinc-500">{idx + 1}</td>
                        <td className="py-1.5 px-3 border-r border-zinc-300 font-medium">
                          {item.fee_name}
                          {isArrears && (
                            <span className="ml-1.5 text-[9px] px-1 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 font-semibold">
                              Arrears
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono">
                          {Number(item.amount).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Financial Calculation Summary */}
              <div className="flex justify-end text-xs">
                <div className="w-80 space-y-1.5">
                  <div className="flex justify-between py-0.5">
                    <span className="text-zinc-600">Subtotal:</span>
                    <span className="font-mono">NPR {Number(receipt.subtotal_amount).toFixed(2)}</span>
                  </div>
                  {Number(receipt.previous_due_amount) > 0 && (
                    <div className="flex justify-between py-0.5 text-zinc-700">
                      <span>Carried Arrears / Prior Dues:</span>
                      <span className="font-mono">+ NPR {Number(receipt.previous_due_amount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1 border-t border-zinc-300 font-bold">
                    <span>Total Bill Payable:</span>
                    <span className="font-mono">NPR {Number(receipt.total_payable).toFixed(2)}</span>
                  </div>
                  {Number(receipt.discount_amount || 0) > 0 && (
                    <div className="flex justify-between py-0.5 text-emerald-700 font-medium">
                      <span>Discount / Waiver Granted:</span>
                      <span className="font-mono">- NPR {Number(receipt.discount_amount).toFixed(2)}</span>
                    </div>
                  )}
                  {lateFeeAmount > 0 && (
                    <div className="flex justify-between py-0.5 text-zinc-800 font-medium">
                      <span>Late Fee / Penalty:</span>
                      <span className="font-mono">+ NPR {lateFeeAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-0.5 text-zinc-700">
                    <span>Payment Received (Fees):</span>
                    <span className="font-mono">NPR {Number(receipt.amount_paid).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-y-2 border-black font-bold text-sm bg-zinc-50 px-1">
                    <span>NET RECEIVED:</span>
                    <span className="font-mono">
                      NPR {Number(receipt.net_received ?? (Number(receipt.amount_paid) + lateFeeAmount)).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between py-0.5 font-medium">
                    <span className="text-zinc-600">Remaining Balance Due:</span>
                    <span className="font-mono font-bold text-red-600">
                      NPR {Number(receipt.remaining_due).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Amount in words */}
              <div className="p-2.5 border border-zinc-200 rounded text-xs bg-zinc-50">
                <span className="text-zinc-500 font-semibold uppercase text-[10px] block">In Words:</span>
                <span className="font-medium italic">{receipt.amount_in_words}</span>
              </div>

              {receipt.remarks && (
                <div className="text-xs text-zinc-600">
                  <span className="font-semibold">Remarks: </span>
                  <span>{receipt.remarks}</span>
                </div>
              )}

              {/* Signatures */}
              <div className="pt-10 flex justify-between items-end text-xs">
                <div className="text-center space-y-1">
                  <div className="w-36 border-b border-black"></div>
                  <span className="text-zinc-600">Depositor Signature</span>
                </div>
                <div className="text-center space-y-1">
                  <div className="w-44 border-b border-black"></div>
                  <span className="font-semibold">
                    {receipt.received_by_name || 'Cashier / Accountant'}
                  </span>
                  <p className="text-[10px] text-zinc-500">Authorized Signature & Seal</p>
                </div>
              </div>
              </div>
            )}
          </div>

          <DialogFooter className="p-3.5 border-t bg-muted/20 no-print flex flex-row items-center justify-between">
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              Tip: Press <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-muted rounded border">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-muted rounded border">P</kbd> to quick-print this receipt.
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
                Print Receipt
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
