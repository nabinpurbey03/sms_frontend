import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, X, Loader2, FileText } from 'lucide-react';
import { useBill } from '../hooks';
import { useCalendarPreferenceStore } from '@/stores/calendarPreferenceStore';
import { formatDualDate } from '@/features/school-settings/utils/nepaliDate';

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
  schoolName = 'School Portal',
}) => {
  const { calendarSystem } = useCalendarPreferenceStore();
  const { data: bill, isLoading } = useBill(tenantId, billId);

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
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">Fee Invoice / Bill</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handlePrint} className="gap-1.5 h-8 text-xs cursor-pointer">
                <Printer className="w-3.5 h-3.5" />
                Print Invoice
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-xs">Loading invoice document...</span>
            </div>
          ) : !bill ? (
            <div className="p-12 text-center text-xs text-muted-foreground">Bill not found.</div>
          ) : (
            <div id="printable-bill-doc" className="p-8 space-y-6 text-black bg-white">
              {/* Letterhead */}
              <div className="text-center space-y-1 border-b-2 border-black pb-4">
                <h1 className="text-xl font-bold tracking-tight uppercase">{schoolName}</h1>
                <div className="pt-2">
                  <span className="inline-block px-3 py-0.5 text-xs font-bold uppercase tracking-wider border border-black bg-zinc-100">
                    STUDENT FEE INVOICE
                  </span>
                </div>
              </div>

              {/* Invoice Meta Bar */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <div>
                    <span className="text-zinc-500">Invoice No: </span>
                    <span className="font-mono font-bold">{bill.bill_number}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Title / Purpose: </span>
                    <span className="font-medium">{bill.bill_title}</span>
                  </div>
                  {bill.billing_month && (
                    <div>
                      <span className="text-zinc-500">Billing Cycle: </span>
                      <span className="font-medium">{bill.billing_month}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-1 text-right">
                  <div>
                    <span className="text-zinc-500">Issue Date: </span>
                    <span>{formatDualDate(bill.issue_date, calendarSystem)}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Payment Due Date: </span>
                    <span className="font-bold text-red-600">{formatDualDate(bill.due_date, calendarSystem)}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Status: </span>
                    <span className="font-semibold uppercase">{bill.status}</span>
                  </div>
                </div>
              </div>

              {/* Student Details Card */}
              <div className="p-3 border border-zinc-300 rounded bg-zinc-50 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-zinc-500">Student Name: </span>
                  <span className="font-bold">{bill.student_name}</span>
                </div>
                <div className="text-right">
                  <span className="text-zinc-500">Class: </span>
                  <span className="font-semibold">{bill.class_name}</span>
                </div>
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
                  {bill.items.map((item, idx) => {
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
                        <td className="py-1.5 px-3 text-right font-mono">{Number(item.amount).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Financial Calculation Summary */}
              <div className="flex justify-end text-xs">
                <div className="w-72 space-y-1.5">
                  <div className="flex justify-between py-0.5">
                    <span className="text-zinc-600">Current Month Subtotal:</span>
                    <span className="font-mono">NPR {Number(bill.subtotal_amount).toFixed(2)}</span>
                  </div>
                  {Number(bill.previous_due_amount) > 0 && (
                    <div className="flex justify-between py-0.5 text-zinc-700">
                      <span>Carried Arrears / Prior Dues:</span>
                      <span className="font-mono">+ NPR {Number(bill.previous_due_amount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1 border-t border-zinc-300 font-bold">
                    <span>Total Bill Payable:</span>
                    <span className="font-mono">NPR {Number(bill.total_payable).toFixed(2)}</span>
                  </div>
                  {Number(bill.paid_amount) > 0 && (
                    <div className="flex justify-between py-0.5 text-emerald-600">
                      <span>Paid to Date:</span>
                      <span className="font-mono">NPR {Number(bill.paid_amount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1.5 border-y-2 border-black font-bold text-sm bg-zinc-50 px-1">
                    <span>BALANCE DUE:</span>
                    <span className="font-mono text-red-600">NPR {Number(bill.due_amount).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {bill.notes && (
                <div className="p-2.5 border border-zinc-200 rounded text-xs bg-zinc-50">
                  <span className="font-semibold text-zinc-500 uppercase text-[10px] block">Notice / Terms:</span>
                  <span className="italic">{bill.notes}</span>
                </div>
              )}

              {/* Instructions & Signatures */}
              <div className="pt-10 flex justify-between items-end text-xs">
                <div className="space-y-1">
                  <span className="text-[11px] text-zinc-500 block">
                    Please submit payment to the school finance counter before the due date.
                  </span>
                </div>
                <div className="text-center space-y-1">
                  <div className="w-44 border-b border-black"></div>
                  <span className="font-semibold">Accountant / Finance Officer</span>
                  <p className="text-[10px] text-zinc-500">Authorized Signature</p>
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
