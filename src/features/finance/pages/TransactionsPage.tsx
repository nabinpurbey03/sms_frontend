import React, { useState } from 'react';
import { useAuth } from '@/auth/useAuth';
import { useCurrentAcademicYear } from '@/features/academic-year/hooks/useCurrentAcademicYear';
import { usePayments } from '../hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Receipt,
  Search,
  Printer,
  Lock,
  Loader2,
  Calendar,
  CreditCard,
} from 'lucide-react';
import { PrintableReceiptModal } from '../components/PrintableReceiptModal';

export const TransactionsPage: React.FC = () => {
  const { activeTenantId } = useAuth();
  const { currentYear } = useCurrentAcademicYear(activeTenantId);

  // Filter States
  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [page, setPage] = useState(1);

  // Queries
  const { data: paymentsData, isLoading } = usePayments(activeTenantId, {
    search: search.trim() || undefined,
    payment_method: paymentMethod || undefined,
    page,
    page_size: 25,
  });

  const payments = paymentsData?.items || [];
  const meta = paymentsData?.meta;

  // Receipt Modal State
  const [selectedReceiptPaymentId, setSelectedReceiptPaymentId] = useState<string | null>(null);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Receipt className="w-6 h-6 text-primary" />
            Payment History & Receipts
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Audit trail of all fee collections, cash transactions, and printable receipt records.
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
          <Lock className="w-3.5 h-3.5 text-primary" />
          <span>Session: {currentYear?.name || 'Active Session'} (Locked)</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 rounded-xl border bg-card flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search student or receipt number..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 text-xs h-9"
          />
        </div>

        <select
          value={paymentMethod}
          onChange={(e) => {
            setPaymentMethod(e.target.value);
            setPage(1);
          }}
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-full sm:w-44"
        >
          <option value="">All Payment Modes</option>
          <option value="CASH">Cash</option>
          <option value="ESEWA">eSewa</option>
          <option value="KHALTI">Khalti</option>
          <option value="BANK_TRANSFER">Bank Transfer</option>
          <option value="POS_CARD">Card / POS</option>
          <option value="CHEQUE">Cheque</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      {/* Transactions Table */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-muted-foreground border rounded-xl bg-card">
          <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary mb-2" />
          Loading transactions...
        </div>
      ) : payments.length === 0 ? (
        <div className="p-12 text-center text-xs text-muted-foreground border border-dashed rounded-xl bg-card space-y-2">
          <Receipt className="w-8 h-8 mx-auto text-muted-foreground/50" />
          <p className="font-semibold text-foreground">No payments found</p>
          <p className="text-[11px] text-muted-foreground">
            {search || paymentMethod
              ? 'Try clearing filters or search terms.'
              : 'Payments recorded in the system will appear here.'}
          </p>
        </div>
      ) : (
        <div className="border border-border/60 rounded-xl overflow-hidden bg-card shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Receipt #</th>
                  <th className="py-2.5 px-4">Student</th>
                  <th className="py-2.5 px-4">Bill Ref</th>
                  <th className="py-2.5 px-4">Payment Method</th>
                  <th className="py-2.5 px-4">Reference / Txn</th>
                  <th className="py-2.5 px-4">Payment Date</th>
                  <th className="py-2.5 px-4">Cashier</th>
                  <th className="py-2.5 px-4 text-right">Amount Paid</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-bold text-foreground">
                      {p.receipt_number}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-foreground">
                      {p.student_name || 'Student'}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-muted-foreground">
                      {p.bill_number || '—'}
                    </td>
                    <td className="py-2.5 px-4">
                      <Badge variant="outline" className="text-[10px] uppercase font-mono">
                        {p.payment_method}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-muted-foreground">
                      {p.transaction_reference || '—'}
                    </td>
                    <td className="py-2.5 px-4 text-muted-foreground">{p.payment_date}</td>
                    <td className="py-2.5 px-4 text-muted-foreground">{p.received_by_name || 'Cashier'}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-foreground">
                      NPR {Number(p.amount_paid).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedReceiptPaymentId(p.id)}
                        className="h-7 text-xs gap-1 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Print
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {meta && meta.total_pages > 1 && (
            <div className="p-3 border-t bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Showing page {meta.page} of {meta.total_pages} ({meta.total_records} payments total)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="h-7 text-xs"
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= meta.total_pages}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-7 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Printable Receipt Modal */}
      <PrintableReceiptModal
        isOpen={!!selectedReceiptPaymentId}
        onClose={() => setSelectedReceiptPaymentId(null)}
        tenantId={activeTenantId}
        paymentId={selectedReceiptPaymentId}
      />
    </div>
  );
};
