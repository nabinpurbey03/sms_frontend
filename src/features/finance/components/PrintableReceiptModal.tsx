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

interface PrintableReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string | null;
  paymentId: string | null;
}

export const PrintableReceiptModal: React.FC<PrintableReceiptModalProps> = ({
  isOpen,
  onClose,
  tenantId,
  paymentId,
}) => {
  const { data: receipt, isLoading } = useReceiptDocument(tenantId, paymentId);

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: portrait;
            margin: 12mm;
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
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto p-0 border bg-card text-foreground">
          {/* Header Action Bar */}
          <div className="flex items-center justify-between px-6 py-3 border-b bg-muted/30 no-print">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-semibold text-foreground">Official Payment Receipt</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handlePrint} className="gap-1.5 h-8 text-xs cursor-pointer">
                <Printer className="w-3.5 h-3.5" />
                Print Receipt
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-xs">Loading receipt document...</span>
            </div>
          ) : !receipt ? (
            <div className="p-12 text-center text-xs text-muted-foreground">Receipt not found.</div>
          ) : (
            <div id="printable-receipt-doc" className="p-8 space-y-6 text-black bg-white">
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
                </div>
                <div className="space-y-1 text-right">
                  <div>
                    <span className="text-zinc-500">Payment Date: </span>
                    <span className="font-medium">{receipt.payment_date}</span>
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
                  {receipt.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-zinc-200">
                      <td className="py-1.5 px-3 border-r border-zinc-300 font-mono text-zinc-500">{idx + 1}</td>
                      <td className="py-1.5 px-3 border-r border-zinc-300 font-medium">{item.fee_name}</td>
                      <td className="py-1.5 px-3 text-right font-mono">
                        {Number(item.amount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Financial Calculation Summary */}
              <div className="flex justify-end text-xs">
                <div className="w-72 space-y-1.5">
                  <div className="flex justify-between py-0.5">
                    <span className="text-zinc-600">Subtotal:</span>
                    <span className="font-mono">NPR {Number(receipt.subtotal_amount).toFixed(2)}</span>
                  </div>
                  {Number(receipt.previous_due_amount) > 0 && (
                    <div className="flex justify-between py-0.5 text-zinc-700">
                      <span>Previous Session Dues:</span>
                      <span className="font-mono">+ NPR {Number(receipt.previous_due_amount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1 border-t border-zinc-300 font-bold">
                    <span>Total Bill Payable:</span>
                    <span className="font-mono">NPR {Number(receipt.total_payable).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-y-2 border-black font-bold text-sm bg-zinc-50 px-1">
                    <span>AMOUNT RECEIVED:</span>
                    <span className="font-mono">NPR {Number(receipt.amount_paid).toFixed(2)}</span>
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

          <DialogFooter className="p-3 border-t bg-muted/20 no-print">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
