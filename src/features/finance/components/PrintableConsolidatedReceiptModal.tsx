import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, X, Loader2, Layers, CheckCircle2, Clock } from 'lucide-react';
import { useConsolidatedReceiptDocument } from '../hooks';
import { useCalendarPreferenceStore } from '@/stores/calendarPreferenceStore';
import { formatDualDate } from '@/features/school-settings/utils/nepaliDate';

interface PrintableConsolidatedReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string | null;
  identifier: string | null; // payment_group_id or payment_id
}

export const PrintableConsolidatedReceiptModal: React.FC<PrintableConsolidatedReceiptModalProps> = ({
  isOpen,
  onClose,
  tenantId,
  identifier,
}) => {
  const { calendarSystem } = useCalendarPreferenceStore();
  const { data: receipt, isLoading } = useConsolidatedReceiptDocument(tenantId, identifier);

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

  const totalPaid = Number(receipt?.total_amount_paid ?? 0);
  const remainingBalance = Number(receipt?.total_account_balance_remaining ?? 0);

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
          #printable-consolidated-receipt-doc,
          #printable-consolidated-receipt-doc * {
            visibility: visible !important;
          }
          #printable-consolidated-receipt-doc {
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
        <DialogContent className="sm:max-w-3xl lg:max-w-4xl max-h-[92vh] overflow-y-auto p-0 border border-border/80 bg-background text-foreground [&>button:last-child]:hidden shadow-2xl">
          {/* Header Action Bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/40 no-print sticky top-0 z-20 backdrop-blur-sm">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <Layers className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-foreground">
                  Consolidated Payment Receipt Preview (एकमुष्ठ शुल्क भुक्तानी रसिद)
                </span>
                {receipt?.consolidated_receipt_number && (
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-border bg-card font-semibold text-emerald-700 dark:text-emerald-400">
                    #{receipt.consolidated_receipt_number}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handlePrint}
                className="gap-1.5 h-8 text-xs font-semibold shadow-xs cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
                title="Print Consolidated Receipt (Ctrl+P)"
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
                <span className="text-xs font-medium">Generating consolidated receipt preview...</span>
              </div>
            ) : !receipt ? (
              <div className="p-16 text-center text-xs text-muted-foreground">
                Consolidated payment receipt not found.
              </div>
            ) : (
              <div
                id="printable-consolidated-receipt-doc"
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
                      CONSOLIDATED FEE PAYMENT RECEIPT (एकमुष्ठ शुल्क भुक्तानी रसिद)
                    </span>
                  </div>
                </div>

                {/* Meta & Identification Bar */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <div>
                      <span className="text-zinc-500">Group Receipt No: </span>
                      <span className="font-mono font-bold text-zinc-900">
                        {receipt.consolidated_receipt_number}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Settled Invoices: </span>
                      <span className="font-semibold">{receipt.allocations?.length || 0} Monthly Bill(s)</span>
                    </div>
                    {receipt.remarks && (
                      <div>
                        <span className="text-zinc-500">Remarks: </span>
                        <span className="font-medium text-zinc-800">{receipt.remarks}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 text-right">
                    <div>
                      <span className="text-zinc-500">Payment Date: </span>
                      <span className="font-medium">
                        {formatDualDate(receipt.payment_date, calendarSystem)}
                      </span>
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
                      <span>
                        {receipt.parent_name}
                        {receipt.parent_phone ? ` (${receipt.parent_phone})` : ''}
                      </span>
                    </div>
                  )}
                </div>

                {/* Itemized Bill Allocations Breakdown Table */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-700">
                    <span>Payment Allocations Across Multi-Month Invoices:</span>
                    <span className="text-zinc-500 text-[10px]">Currency: NPR (रू)</span>
                  </div>
                  <table className="w-full text-xs border border-collapse border-zinc-300">
                    <thead>
                      <tr className="bg-zinc-100 border-b border-zinc-300">
                        <th className="py-1.5 px-2.5 text-left w-10 border-r border-zinc-300">S.N.</th>
                        <th className="py-1.5 px-2.5 text-left w-28 border-r border-zinc-300">Invoice Ref</th>
                        <th className="py-1.5 px-2.5 text-left w-24 border-r border-zinc-300">Cycle / Month</th>
                        <th className="py-1.5 px-2.5 text-left border-r border-zinc-300">Bill Particulars</th>
                        <th className="py-1.5 px-2.5 text-right w-28 border-r border-zinc-300">Paid Here (NPR)</th>
                        <th className="py-1.5 px-2.5 text-right w-28 border-r border-zinc-300">Remaining Due</th>
                        <th className="py-1.5 px-2.5 text-center w-20">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receipt.allocations?.map((alloc, idx) => {
                        const isFullyPaid = alloc.status === 'PAID' || Number(alloc.remaining_due_after) === 0;
                        return (
                          <tr key={alloc.payment_id || idx} className="border-b border-zinc-200">
                            <td className="py-2 px-2.5 border-r border-zinc-300 font-mono text-zinc-500 text-center">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-2.5 border-r border-zinc-300 font-mono font-medium text-zinc-800">
                              {alloc.bill_number}
                            </td>
                            <td className="py-2 px-2.5 border-r border-zinc-300 font-semibold text-zinc-800">
                              {alloc.billing_month || '—'}
                            </td>
                            <td className="py-2 px-2.5 border-r border-zinc-300 text-zinc-700">
                              {alloc.bill_title}
                            </td>
                            <td className="py-2 px-2.5 border-r border-zinc-300 text-right font-mono font-bold text-zinc-900 tabular-nums">
                              {Number(alloc.amount_allocated).toFixed(2)}
                            </td>
                            <td className="py-2 px-2.5 border-r border-zinc-300 text-right font-mono tabular-nums text-zinc-600">
                              {Number(alloc.remaining_due_after).toFixed(2)}
                            </td>
                            <td className="py-2 px-2.5 text-center">
                              {isFullyPaid ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  PAID
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                  <Clock className="w-2.5 h-2.5" />
                                  PARTIAL
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Financial Calculation Summary */}
                <div className="flex justify-end text-xs">
                  <div className="w-88 space-y-1.5">
                    <div className="flex justify-between py-1 border-y-2 border-black font-bold text-sm bg-zinc-50 px-2">
                      <span>TOTAL AMOUNT PAID (एकमुष्ठ भुक्तानी):</span>
                      <span className="font-mono text-base tabular-nums">
                        NPR {totalPaid.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1 px-2 rounded bg-zinc-50 border border-zinc-200">
                      <span className="text-zinc-600 font-medium">Remaining Student Balance:</span>
                      {remainingBalance === 0 ? (
                        <span className="font-mono font-bold text-emerald-700 text-xs">
                          NPR 0.00 (All Cleared)
                        </span>
                      ) : (
                        <span className="font-mono font-bold text-amber-700 text-xs">
                          NPR {remainingBalance.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Amount in words */}
                <div className="p-2.5 border border-zinc-200 rounded text-xs bg-zinc-50">
                  <span className="text-zinc-500 font-semibold uppercase text-[10px] block">In Words:</span>
                  <span className="font-medium italic text-zinc-800">{receipt.amount_in_words}</span>
                </div>

                {/* Signatures */}
                <div className="pt-10 flex justify-between items-end text-xs">
                  <div className="text-center space-y-1">
                    <div className="w-36 border-b border-black"></div>
                    <span className="text-zinc-600">Depositor Signature</span>
                  </div>
                  <div className="text-center space-y-1">
                    <div className="w-48 border-b border-black"></div>
                    <span className="font-semibold text-zinc-900">
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
