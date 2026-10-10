import React, { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useAuth } from '@/auth/useAuth';
import { useCurrentAcademicYear } from '@/features/academic-year/hooks/useCurrentAcademicYear';
import { useClasses, useAcademicYears } from '@/features/academic/hooks';
import { useBills, useCancelBill } from '../hooks';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Search,
  ExternalLink,
  Loader2,
  Calendar,
  Filter,
  Tag,
  BookOpen,
  Archive,
  Ban,
  Sparkles,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import type { FeeBill, BillStatus } from '../types';
import { SessionArchiveSelect } from '../components/SessionArchiveSelect';
import { CancelBillDialog } from '../components/CancelBillDialog';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useCalendarPreferenceStore } from '@/stores/calendarPreferenceStore';
import { formatDate } from '@/features/school-settings/utils/nepaliDate';
import { formatStudentFullName } from '../utils/cashierUtils';
import { exportBillsToCsv } from '../utils/exportCsv';

export const BillsPage: React.FC = () => {
  const { activeTenantId } = useAuth();
  const { calendarSystem } = useCalendarPreferenceStore();
  const { currentYear } = useCurrentAcademicYear(activeTenantId);
  const { data: classesData } = useClasses(activeTenantId);
  const classes = classesData || [];

  // Filters State
  const [selectedArchiveYearId, setSelectedArchiveYearId] = useState<string | undefined>(undefined);
  const [billToCancel, setBillToCancel] = useState<FeeBill | null>(null);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data: academicYears = [] } = useAcademicYears(activeTenantId);
  const selectedYear = academicYears.find((y) => y.id === selectedArchiveYearId) || (selectedArchiveYearId ? null : currentYear);
  const isArchived = Boolean(selectedArchiveYearId && currentYear && selectedArchiveYearId !== currentYear.id);

  const cancelBillMutation = useCancelBill(activeTenantId);

  const handleConfirmCancel = async () => {
    if (!billToCancel) return;
    try {
      await cancelBillMutation.mutateAsync(billToCancel.id);
      setBillToCancel(null);
    } catch {
      // Handled by mutation toast
    }
  };

  // Queries
  const { data: billsData, isLoading } = useBills(activeTenantId, {
    search: search.trim() || undefined,
    class_id: classFilter || undefined,
    status: statusFilter || undefined,
    academic_year_id: selectedArchiveYearId,
    page,
    page_size: 25,
  });

  const bills = billsData?.items || [];
  const meta = billsData?.meta;

  const handleExportCsv = () => {
    if (!bills || bills.length === 0) {
      toast.info('No fee bills found to export.');
      return;
    }
    const dateStr = new Date().toISOString().split('T')[0];
    exportBillsToCsv(bills, `bills-export-${dateStr}`);
  };

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
          <SessionArchiveSelect
            value={selectedArchiveYearId}
            onChange={(id) => {
              setSelectedArchiveYearId(id);
              setPage(1);
            }}
          />

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={bills.length === 0 || isLoading}
            className="gap-1.5 text-xs font-semibold shadow-2xs cursor-pointer"
            title={bills.length === 0 ? 'No bills to export' : 'Export current bills to CSV'}
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>

          {isArchived ? (
            <Button
              size="sm"
              disabled
              className="gap-1.5 text-xs font-semibold opacity-50 cursor-not-allowed"
              title="Bill creation is disabled for archived sessions"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Generate Bills
            </Button>
          ) : (
            <Link to="/finance/batch-billing">
              <Button
                size="sm"
                className="gap-1.5 text-xs font-semibold shadow-xs cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Generate Bills
              </Button>
            </Link>
          )}
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

      {/* Sticky Archived Session Banner */}
      {isArchived && (
        <div className="sticky top-0 z-10 rounded-xl border border-amber-500/40 bg-amber-500/15 dark:bg-amber-950/80 backdrop-blur-md p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs text-amber-950 dark:text-amber-200">
          <div className="flex items-center gap-2.5">
            <Archive className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <span className="font-bold">
                Viewing Archived Session {selectedYear?.name ? `(${selectedYear.name})` : ''} (Read-Only)
              </span>
              <span className="mx-1.5 hidden sm:inline">—</span>
              <span className="text-amber-900/90 dark:text-amber-300 block sm:inline mt-0.5 sm:mt-0">
                Creation and cancellation of bills are disabled for past sessions.
              </span>
            </div>
          </div>
          <Badge
            variant="outline"
            className="border-amber-500/40 bg-amber-500/20 text-amber-900 dark:text-amber-200 text-[10px] font-bold shrink-0 uppercase w-fit"
          >
            Read-Only Archive
          </Badge>
        </div>
      )}

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
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {bills.map((b) => {
                  const due = Number(b.due_amount);
                  const discount = Number(
                    b.discount_amount ?? Math.max(0, Number(b.total_payable) - Number(b.paid_amount) - due)
                  );
                  const studentDisplayName = formatStudentFullName(b);

                  return (
                    <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-foreground">
                        {b.bill_number}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-foreground">
                        <Link
                          to="/finance/ledger/$studentId"
                          params={{ studentId: b.student_id }}
                          className="hover:text-primary transition-colors inline-flex items-center gap-1.5 group font-semibold"
                        >
                          <span>{studentDisplayName}</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
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
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1.5 px-2.5 font-medium hover:bg-primary/5 hover:text-primary hover:border-primary/40 transition-colors shadow-2xs cursor-pointer"
                          >
                            <Link
                              to="/finance/ledger/$studentId"
                              params={{ studentId: b.student_id }}
                            >
                              <BookOpen className="w-3.5 h-3.5 text-primary" />
                              <span>View Ledger</span>
                            </Link>
                          </Button>

                          {b.status !== 'CANCELLED' && b.status !== 'PAID' && (
                            isArchived ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled
                                className="h-7 text-xs px-2 text-muted-foreground opacity-40 cursor-not-allowed"
                                title="Cancellation disabled for archived sessions"
                              >
                                <Ban className="w-3.5 h-3.5" />
                                <span className="sr-only sm:not-sr-only sm:inline-block">Cancel</span>
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={cancelBillMutation.isPending}
                                onClick={() => setBillToCancel(b)}
                                title="Void and cancel fee bill"
                                className="h-7 text-xs px-2 text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                              >
                                <Ban className="w-3.5 h-3.5" />
                                <span className="sr-only sm:not-sr-only sm:inline-block">Cancel</span>
                              </Button>
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

      {/* Cancel Bill Dialog */}
      <CancelBillDialog
        bill={billToCancel}
        isOpen={Boolean(billToCancel)}
        onClose={() => setBillToCancel(null)}
        onConfirm={handleConfirmCancel}
        isPending={cancelBillMutation.isPending}
      />
    </div>
  );
};

