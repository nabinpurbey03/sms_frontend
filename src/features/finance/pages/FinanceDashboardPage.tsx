import React, { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useAuth } from '@/auth/useAuth';
import { useCurrentAcademicYear } from '@/features/academic-year/hooks/useCurrentAcademicYear';
import {
  useFinanceDashboardSummary,
  useCreateFeeStructure,
  useSetStudentDiscount,
  useBatchGenerateBills,
} from '../hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Wallet,
  TrendingUp,
  AlertCircle,
  Percent,
  Plus,
  Sparkles,
  CreditCard,
  FileText,
  Coins,
  Receipt,
  Printer,
  Lock,
  Loader2,
  Calendar,
} from 'lucide-react';
import { FeeStructureDialog } from '../components/FeeStructureDialog';
import { StudentDiscountDialog } from '../components/StudentDiscountDialog';
import { BatchBillGenerateDialog } from '../components/BatchBillGenerateDialog';
import { PrintableReceiptModal } from '../components/PrintableReceiptModal';

export const FinanceDashboardPage: React.FC = () => {
  const { activeTenantId } = useAuth();
  const { currentYear, isLoading: isLoadingYear } = useCurrentAcademicYear(activeTenantId);
  const { data: summary, isLoading: isLoadingSummary } = useFinanceDashboardSummary(activeTenantId);

  // Dialog States
  const [isFeeStructureOpen, setIsFeeStructureOpen] = useState(false);
  const [isDiscountOpen, setIsDiscountOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [selectedReceiptPaymentId, setSelectedReceiptPaymentId] = useState<string | null>(null);

  // Mutations
  const createFeeStructureMutation = useCreateFeeStructure(activeTenantId);
  const setDiscountMutation = useSetStudentDiscount(activeTenantId);
  const batchBillMutation = useBatchGenerateBills(activeTenantId);

  const monthCollected = Number(summary?.total_collected_month || 0);
  const yearCollected = Number(summary?.total_collected_year || 0);
  const outstandingDues = Number(summary?.total_outstanding_dues || 0);
  const collectionRate = Number(summary?.collection_rate_percent || 0);
  const defaultersCount = summary?.total_defaulters_count || 0;
  const recentPayments = summary?.recent_payments || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Wallet className="w-6 h-6 text-primary" />
            Finance Overview & Cash Flow
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Real-time fee collection, outstanding balances, and batch invoicing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Strictly Locked Academic Session Badge (Per Requirements) */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary"
            title="Finance operations are strictly bound to the active academic session"
          >
            <Lock className="w-3.5 h-3.5 text-primary" />
            <span>
              Session: {isLoadingYear ? 'Loading...' : currentYear?.name || 'Active Session'} (Locked)
            </span>
          </div>

          <Button
            size="sm"
            onClick={() => setIsBatchOpen(true)}
            className="gap-1.5 text-xs shadow-xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Batch Invoicing
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsFeeStructureOpen(true)}
            className="gap-1.5 text-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Fee Head
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsDiscountOpen(true)}
            className="gap-1.5 text-xs cursor-pointer"
          >
            <Percent className="w-3.5 h-3.5" />
            Concessions
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Collections This Month */}
        <Card className="border-border/60 hover:shadow-xs transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              This Month Collection
            </CardTitle>
            <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-xl sm:text-2xl font-bold font-mono text-foreground">
              {isLoadingSummary ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : (
                `NPR ${monthCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Current monthly collection total</p>
          </CardContent>
        </Card>

        {/* Card 2: Total Session Collection */}
        <Card className="border-border/60 hover:shadow-xs transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Session Collection
            </CardTitle>
            <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
              <Wallet className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-xl sm:text-2xl font-bold font-mono text-foreground">
              {isLoadingSummary ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : (
                `NPR ${yearCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Cumulative for active academic session</p>
          </CardContent>
        </Card>

        {/* Card 3: Outstanding Dues */}
        <Card className="border-border/60 hover:shadow-xs transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Outstanding Dues
            </CardTitle>
            <div className="p-2 bg-rose-500/10 text-rose-600 rounded-lg">
              <AlertCircle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-xl sm:text-2xl font-bold font-mono text-rose-600">
              {isLoadingSummary ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : (
                `NPR ${outstandingDues.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <span className="font-semibold text-foreground">{defaultersCount}</span> unpaid / partial bills
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Collection Rate */}
        <Card className="border-border/60 hover:shadow-xs transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Collection Efficiency
            </CardTitle>
            <div className="p-2 bg-purple-500/10 text-purple-600 rounded-lg">
              <Percent className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-xl sm:text-2xl font-bold font-mono text-foreground">
              {isLoadingSummary ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : (
                `${collectionRate.toFixed(1)}%`
              )}
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, collectionRate))}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation Hub */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Link
          to="/finance/collect"
          className="p-3.5 rounded-xl border border-border/60 bg-card hover:bg-accent/40 transition-colors flex items-center gap-3 group cursor-pointer"
        >
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 group-hover:scale-105 transition-transform">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-foreground">Collect Payments</h2>
            <p className="text-[11px] text-muted-foreground">Receive cash, digital, or cheques</p>
          </div>
        </Link>

        <Link
          to="/finance/bills"
          className="p-3.5 rounded-xl border border-border/60 bg-card hover:bg-accent/40 transition-colors flex items-center gap-3 group cursor-pointer"
        >
          <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600 group-hover:scale-105 transition-transform">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-foreground">Bills & Invoices</h2>
            <p className="text-[11px] text-muted-foreground">View & manage student bills</p>
          </div>
        </Link>

        <Link
          to="/finance/structures"
          className="p-3.5 rounded-xl border border-border/60 bg-card hover:bg-accent/40 transition-colors flex items-center gap-3 group cursor-pointer"
        >
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 group-hover:scale-105 transition-transform">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-foreground">Fee Structures</h2>
            <p className="text-[11px] text-muted-foreground">Class tuition & yearly fees</p>
          </div>
        </Link>

        <Link
          to="/finance/transactions"
          className="p-3.5 rounded-xl border border-border/60 bg-card hover:bg-accent/40 transition-colors flex items-center gap-3 group cursor-pointer"
        >
          <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-600 group-hover:scale-105 transition-transform">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-foreground">Payment History</h2>
            <p className="text-[11px] text-muted-foreground">Print duplicate receipts</p>
          </div>
        </Link>
      </div>

      {/* Recent Payments Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" />
            Recent Fee Collections
          </h2>
          <Link
            to="/finance/transactions"
            className="text-xs text-primary hover:underline font-medium"
          >
            View All Transactions →
          </Link>
        </div>

        {isLoadingSummary ? (
          <div className="p-8 text-center text-xs text-muted-foreground border rounded-xl bg-card">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary mb-2" />
            Loading recent payments...
          </div>
        ) : recentPayments.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl bg-card">
            No payments recorded in this academic session yet. Use "Collect Payment" to record your first transaction.
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
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4 text-right">Amount Paid</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {recentPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-bold text-foreground">
                        {p.receipt_number}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-foreground">
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
                      <td className="py-2.5 px-4 text-muted-foreground">{p.payment_date}</td>
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
                          Receipt
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Fee Structure Dialog */}
      <FeeStructureDialog
        isOpen={isFeeStructureOpen}
        onClose={() => setIsFeeStructureOpen(false)}
        onSubmit={async (data) => createFeeStructureMutation.mutateAsync(data)}
        isLoading={createFeeStructureMutation.isPending}
        tenantId={activeTenantId}
      />

      {/* Student Discount Dialog */}
      <StudentDiscountDialog
        isOpen={isDiscountOpen}
        onClose={() => setIsDiscountOpen(false)}
        onSubmit={async (data) => setDiscountMutation.mutateAsync(data)}
        isLoading={setDiscountMutation.isPending}
        tenantId={activeTenantId}
      />

      {/* Batch Bill Invoicing Dialog */}
      <BatchBillGenerateDialog
        isOpen={isBatchOpen}
        onClose={() => setIsBatchOpen(false)}
        onSubmit={async (data) => batchBillMutation.mutateAsync(data)}
        isLoading={batchBillMutation.isPending}
        tenantId={activeTenantId}
      />

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
