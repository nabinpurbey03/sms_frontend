import React, { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useAuth } from '@/auth/useAuth';
import { hasPermission } from '@/config/permissions';
import { useCurrentAcademicYear } from '@/features/academic-year/hooks/useCurrentAcademicYear';
import { useClasses } from '@/features/academic/hooks';
import {
  useBills,
  useCancelBill,
  useRecordPayment,
} from '../hooks';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Search,
  CreditCard,
  Printer,
  Ban,
  ExternalLink,
  Loader2,
  Calendar,
  Filter,
  Tag,
} from 'lucide-react';
import type { FeeBill, BillStatus, FeePayment } from '../types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PaymentCollectDialog } from '../components/PaymentCollectDialog';
import { PrintableBillModal } from '../components/PrintableBillModal';
import { PrintableReceiptModal } from '../components/PrintableReceiptModal';
import { CancelBillDialog } from '../components/CancelBillDialog';
import { getCancelBillEligibility } from '../utils/cashierUtils';
import { useCalendarPreferenceStore } from '@/stores/calendarPreferenceStore';
import { formatDate } from '@/features/school-settings/utils/nepaliDate';

export const BillsPage: React.FC = () => {
  const { activeTenantId, activeRole, user } = useAuth();
  const canManageFinance = hasPermission(activeRole, 'MANAGE_FINANCE') || !!user?.is_super_admin;
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
  const [activeCancelBill, setActiveCancelBill] = useState<FeeBill | null>(null);

  // Mutations
  const cancelBillMutation = useCancelBill(activeTenantId);
  const recordPaymentMutation = useRecordPayment(activeTenantId);

  const getStatusBadge = (status: BillStatus, discountAmt: number = 0) => {
    switch (status) {
      case 'PAID':
        if (discountAmt > 0) {
          return (
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-1 cursor-help">
                    <Badge variant="success" className="gap-1 pr-1.5 shadow-2xs">
                      PAID
                      <span className="text-[8px] font-mono font-bold bg-emerald-700/30 text-emerald-100 dark:text-emerald-200 px-1 py-0.2 rounded-xs uppercase">
                        DISC
                      </span>
                    </Badge>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs font-normal">
                  Fully settled with NPR {discountAmt.toFixed(2)} counter discount.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }
        return <Badge variant="success">PAID</Badge>;
      case 'PARTIAL':
        if (discountAmt > 0) {
          return (
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-1 cursor-help">
                    <Badge variant="warning" className="gap-1 pr-1.5 shadow-2xs">
                      PARTIAL
                      <span className="text-[8px] font-mono font-bold bg-amber-700/30 text-amber-100 dark:text-amber-200 px-1 py-0.2 rounded-xs uppercase">
                        DISC
                      </span>
                    </Badge>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs font-normal">
                  Partially settled with NPR {discountAmt.toFixed(2)} counter discount.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }
        return <Badge variant="warning">PARTIAL</Badge>;
      case 'CANCELLED':
        return <Badge variant="secondary">CANCELLED</Badge>;
      case 'UNPAID':
      default:
        return <Badge variant="outline">UNPAID</Badge>;
    }
  };

  const handleConfirmCancelBill = async () => {
    if (!activeCancelBill) return;
    try {
      await cancelBillMutation.mutateAsync(activeCancelBill.id);
      setActiveCancelBill(null);
    } catch {
      // Error is caught and surfaced by useCancelBill mutation onError toast
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
                : 'Generate fee bills using Invoice Generation in the sidebar.'}
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
                  const discount = Number(
                    b.discount_amount ?? Math.max(0, Number(b.total_payable) - Number(b.paid_amount) - due)
                  );
                  const cancelEligibility = getCancelBillEligibility(b, canManageFinance);

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
                      <td className="py-2.5 px-3 text-right font-mono">
                        {discount > 0 ? (
                          <TooltipProvider delayDuration={150}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="inline-flex flex-col items-end cursor-help group">
                                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                    {Number(b.paid_amount).toFixed(2)}
                                  </span>
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 px-1 py-0.2 rounded-xs mt-0.5">
                                    <Tag className="w-2.5 h-2.5" />
                                    -{discount.toFixed(2)}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="text-xs space-y-1 p-2.5 shadow-md">
                                <p className="font-semibold border-b border-border/50 pb-1">Payment & Discount Breakdown</p>
                                <div className="grid grid-cols-2 gap-x-3 text-[11px]">
                                  <span className="text-muted-foreground">Total Payable:</span>
                                  <span className="font-mono text-right">NPR {Number(b.total_payable).toFixed(2)}</span>
                                  <span className="text-amber-600 dark:text-amber-400 font-medium">Discount / Waived:</span>
                                  <span className="font-mono text-right text-amber-600 dark:text-amber-400 font-medium">- NPR {discount.toFixed(2)}</span>
                                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Net Cash Paid:</span>
                                  <span className="font-mono text-right text-emerald-600 dark:text-emerald-400 font-medium">NPR {Number(b.paid_amount).toFixed(2)}</span>
                                  <span className="text-muted-foreground pt-1 border-t border-border/40">Balance Due:</span>
                                  <span className="font-mono text-right pt-1 border-t border-border/40 font-bold">NPR {due.toFixed(2)}</span>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            {Number(b.paid_amount).toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        <span className={due > 0 ? 'text-destructive' : 'text-muted-foreground'}>
                          {due.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">{getStatusBadge(b.status, discount)}</td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {due > 0 && !isCancelled && canManageFinance && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => setActiveCollectBill(b)}
                              className="h-7 text-[11px] gap-1 px-2.5 cursor-pointer shadow-2xs"
                            >
                              <CreditCard className="w-3 h-3" />
                              Pay
                            </Button>
                          )}

                          <TooltipProvider delayDuration={150}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setActivePrintBillId(b.id)}
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                                  aria-label="Print Invoice"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                Print Invoice
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          {canManageFinance && !isCancelled && (
                            cancelEligibility.canCancel ? (
                              <TooltipProvider delayDuration={150}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setActiveCancelBill(b)}
                                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                                      aria-label={`Cancel Bill ${b.bill_number}`}
                                    >
                                      <Ban className="w-3.5 h-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="left" className="text-xs">
                                    Void & Cancel Bill
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <TooltipProvider delayDuration={150}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-block">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        disabled
                                        className="h-7 w-7 p-0 text-muted-foreground/30 cursor-not-allowed"
                                        aria-label={cancelEligibility.reason || 'Cannot cancel bill'}
                                      >
                                        <Ban className="w-3.5 h-3.5" />
                                      </Button>
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="left" className="text-xs max-w-xs">
                                    {cancelEligibility.reason}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )
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

      {/* Cancel Bill Confirmation Dialog */}
      <CancelBillDialog
        bill={activeCancelBill}
        isOpen={!!activeCancelBill}
        onClose={() => setActiveCancelBill(null)}
        onConfirm={handleConfirmCancelBill}
        isPending={cancelBillMutation.isPending}
      />
    </div>
  );
};

