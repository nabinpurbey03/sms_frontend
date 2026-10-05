import React, { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useAuth } from '@/auth/useAuth';
import { useCurrentAcademicYear } from '@/features/academic-year/hooks/useCurrentAcademicYear';
import { useClasses } from '@/features/academic/hooks';
import {
  useBills,
  useCancelBill,
  useRecordPayment,
  useBatchGenerateBills,
} from '../hooks';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Search,
  Plus,
  Sparkles,
  CreditCard,
  Printer,
  Trash2,
  ExternalLink,
  Loader2,
  Calendar,
  Filter,
} from 'lucide-react';
import type { FeeBill, BillStatus, FeePayment } from '../types';
import { PaymentCollectDialog } from '../components/PaymentCollectDialog';
import { PrintableBillModal } from '../components/PrintableBillModal';
import { PrintableReceiptModal } from '../components/PrintableReceiptModal';
import { useCalendarPreferenceStore } from '@/stores/calendarPreferenceStore';
import { formatDate } from '@/features/school-settings/utils/nepaliDate';

export const BillsPage: React.FC = () => {
  const { activeTenantId } = useAuth();
  const { calendarSystem } = useCalendarPreferenceStore();
  const { currentYear } = useCurrentAcademicYear(activeTenantId);
  const { data: classesData } = useClasses(activeTenantId);
  const classes = classesData || [];

  // Filters State
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Queries
  const { data: billsData, isLoading } = useBills(activeTenantId, {
    search: search.trim() || undefined,
    class_id: classFilter || undefined,
    status: statusFilter || undefined,
    page,
    page_size: 25,
  });

  const bills = billsData?.items || [];
  const meta = billsData?.meta;

  // Dialog States
  const [activeCollectBill, setActiveCollectBill] = useState<FeeBill | null>(null);
  const [activePrintBillId, setActivePrintBillId] = useState<string | null>(null);
  const [generatedReceiptPaymentId, setGeneratedReceiptPaymentId] = useState<string | null>(null);

  // Mutations
  const cancelBillMutation = useCancelBill(activeTenantId);
  const recordPaymentMutation = useRecordPayment(activeTenantId);
  const batchBillMutation = useBatchGenerateBills(activeTenantId);

  const getStatusBadge = (status: BillStatus) => {
    switch (status) {
      case 'PAID':
        return <Badge variant="success">PAID</Badge>;
      case 'PARTIAL':
        return <Badge variant="warning">PARTIAL</Badge>;
      case 'CANCELLED':
        return <Badge variant="secondary">CANCELLED</Badge>;
      case 'UNPAID':
      default:
        return <Badge variant="outline">UNPAID</Badge>;
    }
  };

  const handleCancelBill = async (bill: FeeBill) => {
    if (confirm(`Are you sure you want to cancel bill ${bill.bill_number}?`)) {
      await cancelBillMutation.mutateAsync(bill.id);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Bills & Invoices
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage student fee bills, track overdue balances, and record payments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <span>Session: {currentYear?.name || 'Active Session'}</span>
          </div>

          <Button
            asChild
            size="sm"
            className="gap-1.5 text-xs shadow-xs cursor-pointer"
          >
            <Link to="/finance/batch-billing">
              <Sparkles className="w-3.5 h-3.5" />
              Batch Invoicing
            </Link>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 rounded-xl border bg-card flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search student name or bill #..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 text-xs h-9"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Class Filter */}
          <select
            value={classFilter}
            onChange={(e) => {
              setClassFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-full md:w-44"
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-full md:w-36"
          >
            <option value="">All Statuses</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PARTIAL">Partially Paid</option>
            <option value="PAID">Fully Paid</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Bills Data Table */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-muted-foreground border rounded-xl bg-card">
          <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary mb-2" />
          Loading student bills...
        </div>
      ) : bills.length === 0 ? (
        <div className="p-12 text-center text-xs text-muted-foreground border border-dashed rounded-xl bg-card space-y-3">
          <FileText className="w-8 h-8 mx-auto text-muted-foreground/60" />
          <div>
            <p className="font-semibold text-foreground">No fee bills found</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {search || classFilter || statusFilter
                ? 'Try adjusting your search criteria or clearing filters.'
                : 'Click "Batch Invoicing" to generate fee bills for a class.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="border border-border/60 rounded-xl overflow-hidden bg-card shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Bill #</th>
                  <th className="py-2.5 px-3">Student</th>
                  <th className="py-2.5 px-3">Class</th>
                  <th className="py-2.5 px-3">Title / Month</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3 text-right">Payable</th>
                  <th className="py-2.5 px-3 text-right">Paid</th>
                  <th className="py-2.5 px-3 text-right">Balance Due</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {bills.map((b) => {
                  const due = Number(b.due_amount);
                  const isPaid = b.status === 'PAID';
                  const isCancelled = b.status === 'CANCELLED';

                  return (
                    <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-foreground">
                        {b.bill_number}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-foreground">
                        <Link
                          to="/finance/ledger/$studentId"
                          params={{ studentId: b.student_id }}
                          className="hover:underline flex items-center gap-1 group"
                        >
                          <span>{b.student_name || 'Student'}</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">{b.class_name}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-medium text-foreground">{b.bill_title}</span>
                        {b.billing_month && (
                          <span className="block text-[10px] text-muted-foreground">{b.billing_month}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                        {formatDate(b.due_date, calendarSystem)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium">
                        {Number(b.total_payable).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-600 font-medium">
                        {Number(b.paid_amount).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        <span className={due > 0 ? 'text-destructive' : 'text-muted-foreground'}>
                          {due.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">{getStatusBadge(b.status)}</td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {due > 0 && !isCancelled && (
                            <Button
                              size="sm"
                              variant="default"
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

                          {!isPaid && !isCancelled && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCancelBill(b)}
                              className="h-7 text-[11px] gap-1 px-2 text-destructive hover:text-destructive cursor-pointer"
                              title="Cancel Bill"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {meta && meta.total_pages > 1 && (
            <div className="p-3 border-t bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Showing page {meta.page} of {meta.total_pages} ({meta.total_records} bills total)
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

      {/* Payment Collect Dialog */}
      <PaymentCollectDialog
        isOpen={!!activeCollectBill}
        onClose={() => setActiveCollectBill(null)}
        bill={activeCollectBill}
        onSubmit={async (data) => recordPaymentMutation.mutateAsync(data)}
        isLoading={recordPaymentMutation.isPending}
        onPaymentSuccess={(payment: FeePayment) => {
          setGeneratedReceiptPaymentId(payment.id);
        }}
      />

      {/* Printable Invoice Modal */}
      <PrintableBillModal
        isOpen={!!activePrintBillId}
        onClose={() => setActivePrintBillId(null)}
        tenantId={activeTenantId}
        billId={activePrintBillId}
      />

      {/* Printable Receipt Modal (on instant payment success) */}
      <PrintableReceiptModal
        isOpen={!!generatedReceiptPaymentId}
        onClose={() => setGeneratedReceiptPaymentId(null)}
        tenantId={activeTenantId}
        paymentId={generatedReceiptPaymentId}
      />
    </div>
  );
};
