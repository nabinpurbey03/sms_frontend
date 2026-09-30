import React, { useState, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { useAuth } from '@/auth/useAuth';
import { useCurrentAcademicYear } from '@/features/academic-year/hooks/useCurrentAcademicYear';
import {
  useFinanceDashboardSummary,
  useCreateFeeStructure,
  useSetStudentDiscount,
  useBatchGenerateBills,
} from '../hooks';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  LayoutDashboard,
  ArrowUpRight,
  AlertTriangle,
  Search,
  CheckCircle2,
  ArrowRight,
  Activity,
  Layers,
  Banknote,
  ShieldAlert,
} from 'lucide-react';
import { FeeStructureDialog } from '../components/FeeStructureDialog';
import { StudentDiscountDialog } from '../components/StudentDiscountDialog';
import { BatchBillGenerateDialog } from '../components/BatchBillGenerateDialog';
import { PrintableReceiptModal } from '../components/PrintableReceiptModal';

const formatCurrency = (amount: number | string): string => {
  return `NPR ${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const getPaymentMethodBadgeClass = (method: string): string => {
  switch (method?.toUpperCase()) {
    case 'CASH':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    case 'ESEWA':
      return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
    case 'KHALTI':
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
    case 'BANK_TRANSFER':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    case 'CHEQUE':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    case 'POS_CARD':
      return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20';
    default:
      return 'bg-muted text-muted-foreground border-border/60';
  }
};

export const FinanceDashboardPage: React.FC = () => {
  const { activeTenantId, activeRole } = useAuth();
  const { currentYear, isLoading: isLoadingYear } = useCurrentAcademicYear(activeTenantId);
  const { data: summary, isLoading: isLoadingSummary } = useFinanceDashboardSummary(activeTenantId);

  // Dialog States
  const [isFeeStructureOpen, setIsFeeStructureOpen] = useState(false);
  const [isDiscountOpen, setIsDiscountOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [selectedReceiptPaymentId, setSelectedReceiptPaymentId] = useState<string | null>(null);

  // Local Search for recent payments
  const [searchQuery, setSearchQuery] = useState('');

  // Mutations
  const createFeeStructureMutation = useCreateFeeStructure(activeTenantId);
  const setDiscountMutation = useSetStudentDiscount(activeTenantId);
  const batchBillMutation = useBatchGenerateBills(activeTenantId);

  // Core Financial Metrics
  const monthCollected = Number(summary?.total_collected_month || 0);
  const yearCollected = Number(summary?.total_collected_year || 0);
  const outstandingDues = Number(summary?.total_outstanding_dues || 0);
  const collectionRate = Number(summary?.collection_rate_percent || 0);
  const defaultersCount = summary?.total_defaulters_count || 0;
  const recentPayments = summary?.recent_payments || [];

  // Analytical derivations
  const totalInvoiced = yearCollected + outstandingDues;
  const realizedPercent = totalInvoiced > 0 ? Math.min(100, Math.round((yearCollected / totalInvoiced) * 100)) : 0;
  const duePercent = totalInvoiced > 0 ? Math.max(0, 100 - realizedPercent) : 0;

  const recentTotal = useMemo(() => {
    return recentPayments.reduce((acc, p) => acc + Number(p.amount_paid || 0), 0);
  }, [recentPayments]);

  const avgReceipt = recentPayments.length > 0 ? recentTotal / recentPayments.length : 0;

  const channelBreakdown = useMemo(() => {
    const counts: Record<string, { count: number; total: number }> = {};
    recentPayments.forEach((p) => {
      const method = p.payment_method || 'OTHER';
      if (!counts[method]) {
        counts[method] = { count: 0, total: 0 };
      }
      counts[method].count += 1;
      counts[method].total += Number(p.amount_paid || 0);
    });
    return Object.entries(counts).sort((a, b) => b[1].total - a[1].total);
  }, [recentPayments]);

  const filteredRecentPayments = useMemo(() => {
    if (!searchQuery.trim()) return recentPayments;
    const q = searchQuery.toLowerCase().trim();
    return recentPayments.filter((p) => {
      const receiptMatch = p.receipt_number?.toLowerCase().includes(q);
      const studentMatch = p.student_name?.toLowerCase().includes(q);
      const billMatch = p.bill_number?.toLowerCase().includes(q);
      const methodMatch = p.payment_method?.toLowerCase().includes(q);
      return receiptMatch || studentMatch || billMatch || methodMatch;
    });
  }, [recentPayments, searchQuery]);

  const isAccountant = activeRole === 'ACCOUNTANT';
  const pageTitle = isAccountant ? 'Dashboard' : 'Finance Dashboard';

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header & Quick Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {pageTitle}
                </h1>
                <Badge variant="outline" className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 border-primary/30 text-primary bg-primary/5">
                  Live Finance
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Real-time fee collection, outstanding balances, and cash flow intelligence.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Locked Academic Session Indicator */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 border border-border/60 text-xs font-semibold text-foreground/80 shadow-2xs"
            title="Finance operations are strictly bound to the active academic session"
          >
            <Lock className="w-3.5 h-3.5 text-primary" />
            <span>
              Session: {isLoadingYear ? 'Loading...' : currentYear?.name || 'Active Session'}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              (Locked)
            </span>
          </div>

          {/* Primary Action: Direct Payment Collection */}
          <Link to="/finance/collect">
            <Button
              size="sm"
              className="gap-1.5 text-xs font-semibold shadow-xs cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CreditCard className="w-3.5 h-3.5" />
              Collect Payment
            </Button>
          </Link>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsBatchOpen(true)}
            className="gap-1.5 text-xs font-medium shadow-2xs cursor-pointer hover:bg-accent"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Batch Invoicing
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsFeeStructureOpen(true)}
            className="gap-1.5 text-xs font-medium shadow-2xs cursor-pointer hover:bg-accent"
          >
            <Plus className="w-3.5 h-3.5" />
            Fee Head
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsDiscountOpen(true)}
            className="gap-1.5 text-xs font-medium shadow-2xs cursor-pointer hover:bg-accent"
          >
            <Percent className="w-3.5 h-3.5" />
            Concessions
          </Button>
        </div>
      </div>

      {/* 2. Top Analytics Suite (Shifted to Prominent Top) */}
      <section className="space-y-4" aria-label="Financial Analytics and Key Performance Indicators">
        {/* KPI Summary Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: This Month Collection */}
          <Card className="relative overflow-hidden border-border/60 hover:shadow-xs transition-shadow">
            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
            <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 space-y-0">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                This Month Collection
              </span>
              <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
                <TrendingUp className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="text-xl sm:text-2xl font-bold font-mono text-foreground">
                {isLoadingSummary ? (
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                ) : (
                  formatCurrency(monthCollected)
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="inline-flex items-center text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  Current Month
                </span>
                <span className="text-[11px] text-muted-foreground">Realized cash flow</span>
              </div>
            </CardContent>
          </Card>

          {/* KPI 2: Session Cumulative Collection */}
          <Card className="relative overflow-hidden border-border/60 hover:shadow-xs transition-shadow">
            <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
            <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 space-y-0">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Session Collection
              </span>
              <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
                <Wallet className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="text-xl sm:text-2xl font-bold font-mono text-foreground">
                {isLoadingSummary ? (
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                ) : (
                  formatCurrency(yearCollected)
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="inline-flex items-center text-[10px] font-semibold text-blue-600 bg-blue-500/10 px-1.5 py-0.5 rounded">
                  Cumulative
                </span>
                <span className="text-[11px] text-muted-foreground">Active session inflow</span>
              </div>
            </CardContent>
          </Card>

          {/* KPI 3: Outstanding Receivables / Dues */}
          <Card className="relative overflow-hidden border-border/60 hover:shadow-xs transition-shadow">
            <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
            <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 space-y-0">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Outstanding Dues
              </span>
              <div className="p-2 bg-rose-500/10 text-rose-600 rounded-lg">
                <AlertCircle className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="text-xl sm:text-2xl font-bold font-mono text-rose-600">
                {isLoadingSummary ? (
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                ) : (
                  formatCurrency(outstandingDues)
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="inline-flex items-center text-[10px] font-semibold text-rose-600 bg-rose-500/10 px-1.5 py-0.5 rounded">
                  {defaultersCount} Delinquent
                </span>
                <span className="text-[11px] text-muted-foreground">Unpaid / partial bills</span>
              </div>
            </CardContent>
          </Card>

          {/* KPI 4: Collection Efficiency */}
          <Card className="relative overflow-hidden border-border/60 hover:shadow-xs transition-shadow">
            <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
            <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 space-y-0">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Collection Efficiency
              </span>
              <div className="p-2 bg-purple-500/10 text-purple-600 rounded-lg">
                <Percent className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="text-xl sm:text-2xl font-bold font-mono text-foreground flex items-baseline gap-2">
                {isLoadingSummary ? (
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <span>{collectionRate.toFixed(1)}%</span>
                    <span className="text-[11px] font-normal text-muted-foreground">
                      of invoiced
                    </span>
                  </>
                )}
              </div>
              <div className="w-full bg-muted rounded-full h-2 mt-2.5 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    collectionRate >= 80
                      ? 'bg-emerald-500'
                      : collectionRate >= 50
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, collectionRate))}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Health Breakdown & Velocity Pulse */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Card A: Revenue Realization & Receivables Proportion (7 cols) */}
          <Card className="lg:col-span-7 border-border/60 shadow-2xs">
            <CardHeader className="p-4 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    Revenue Realization & Recovery Health
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Total expected billed revenue vs realized cash flow for this session.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  Total Invoiced: {formatCurrency(totalInvoiced)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-4">
              {/* Stacked Proportional Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    Realized ({realizedPercent}%)
                  </span>
                  <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                    Outstanding Dues ({duePercent}%)
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-muted overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-500"
                    style={{ width: `${realizedPercent}%` }}
                    title={`Realized: ${formatCurrency(yearCollected)} (${realizedPercent}%)`}
                  />
                  <div
                    className="bg-rose-500 h-full transition-all duration-500"
                    style={{ width: `${duePercent}%` }}
                    title={`Outstanding: ${formatCurrency(outstandingDues)} (${duePercent}%)`}
                  />
                </div>
              </div>

              {/* Metric Breakdown Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-border/40">
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                    Cash Realized
                  </span>
                  <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 block mt-0.5">
                    {formatCurrency(yearCollected)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Bank & Cash Inflow</span>
                </div>

                <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                    Pending Dues
                  </span>
                  <span className="text-sm font-bold font-mono text-rose-600 dark:text-rose-400 block mt-0.5">
                    {formatCurrency(outstandingDues)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{defaultersCount} Accounts</span>
                </div>

                <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50 col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                    Target Recovery
                  </span>
                  <span className="text-sm font-bold font-mono text-foreground block mt-0.5">
                    {collectionRate >= 80 ? 'Optimal' : collectionRate >= 50 ? 'Moderate' : 'Action Needed'}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Benchmark: &gt; 85%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card B: Payment Channels & Cash Flow Velocity (5 cols) */}
          <Card className="lg:col-span-5 border-border/60 shadow-2xs">
            <CardHeader className="p-4 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    Payment Channels & Velocity
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Recent receipts breakdown by payment gateway & mode.
                  </CardDescription>
                </div>
                <span className="text-xs font-semibold text-muted-foreground">
                  {recentPayments.length} Recent
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-3">
              {/* Velocity Highlights */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                    Recent Collections Total
                  </span>
                  <span className="text-sm font-bold font-mono text-primary block">
                    {formatCurrency(recentTotal)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                    Avg. Transaction
                  </span>
                  <span className="text-sm font-bold font-mono text-foreground block">
                    {formatCurrency(avgReceipt)}
                  </span>
                </div>
              </div>

              {/* Payment Mode Pills */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-semibold text-muted-foreground block">
                  Active Channels in Session:
                </span>
                {channelBreakdown.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-1">
                    No transactions recorded yet.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {channelBreakdown.map(([method, data]) => (
                      <div
                        key={method}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${getPaymentMethodBadgeClass(
                          method
                        )}`}
                      >
                        <span>{method}</span>
                        <span className="font-mono text-[10px] opacity-80">
                          ({data.count})
                        </span>
                        <span className="font-mono text-[11px] font-bold ml-1">
                          NPR {data.total.toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Defaulter Action Callout (Rendered when outstanding bills exist) */}
        {defaultersCount > 0 && (
          <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
            <div className="flex items-start sm:items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <span className="font-bold block">
                  {defaultersCount} Students have Overdue Fees ({formatCurrency(outstandingDues)} outstanding)
                </span>
                <span className="text-amber-800 dark:text-amber-300 text-[11px]">
                  Take proactive recovery measures. Review delinquent student lists, print overdue summaries, or contact guardians.
                </span>
              </div>
            </div>
            <Link
              to="/finance/bills"
              className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
            >
              Inspect Overdue Invoices
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </section>

      {/* 3. Operations & Quick Navigation Hub */}
      <section className="space-y-3" aria-label="Finance Operations Launchpad">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Quick Operations & Workflow Hub
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Collect Payment */}
          <Link
            to="/finance/collect"
            className="p-4 rounded-xl border border-border/60 bg-card hover:border-emerald-500/50 hover:bg-accent/40 transition-all duration-200 flex flex-col justify-between group cursor-pointer shadow-2xs"
          >
            <div className="flex items-start justify-between">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 group-hover:scale-105 transition-transform">
                <CreditCard className="w-5 h-5" />
              </div>
              <Badge variant="outline" className="text-[10px] font-semibold border-emerald-500/30 text-emerald-600 bg-emerald-500/5">
                Instant Receipt
              </Badge>
            </div>
            <div className="mt-3">
              <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                Collect Payment
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Receive cash, digital wallet (eSewa/Khalti), or bank deposits and issue official receipts.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">
              Open Terminal
              <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>

          {/* Card 2: Bills & Invoices */}
          <Link
            to="/finance/bills"
            className="p-4 rounded-xl border border-border/60 bg-card hover:border-blue-500/50 hover:bg-accent/40 transition-all duration-200 flex flex-col justify-between group cursor-pointer shadow-2xs"
          >
            <div className="flex items-start justify-between">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <Badge variant="outline" className="text-[10px] font-semibold border-blue-500/30 text-blue-600 bg-blue-500/5">
                Student Invoices
              </Badge>
            </div>
            <div className="mt-3">
              <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                Bills & Invoices
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Generate monthly class invoices, track payment status, issue discounts, and filter dues.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">
              Manage Invoices
              <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>

          {/* Card 3: Fee Structures */}
          <Link
            to="/finance/structures"
            className="p-4 rounded-xl border border-border/60 bg-card hover:border-amber-500/50 hover:bg-accent/40 transition-all duration-200 flex flex-col justify-between group cursor-pointer shadow-2xs"
          >
            <div className="flex items-start justify-between">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 group-hover:scale-105 transition-transform">
                <Coins className="w-5 h-5" />
              </div>
              <Badge variant="outline" className="text-[10px] font-semibold border-amber-500/30 text-amber-600 bg-amber-500/5">
                Session Config
              </Badge>
            </div>
            <div className="mt-3">
              <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                Fee Structures
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Configure monthly tuition, admission, exam, transport, and custom fee heads per class.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center text-xs font-semibold text-amber-600 dark:text-amber-400 group-hover:translate-x-1 transition-transform">
              Configure Rates
              <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>

          {/* Card 4: Payment History & Audits */}
          <Link
            to="/finance/transactions"
            className="p-4 rounded-xl border border-border/60 bg-card hover:border-purple-500/50 hover:bg-accent/40 transition-all duration-200 flex flex-col justify-between group cursor-pointer shadow-2xs"
          >
            <div className="flex items-start justify-between">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 group-hover:scale-105 transition-transform">
                <Receipt className="w-5 h-5" />
              </div>
              <Badge variant="outline" className="text-[10px] font-semibold border-purple-500/30 text-purple-600 bg-purple-500/5">
                Audit Trail
              </Badge>
            </div>
            <div className="mt-3">
              <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                Payment History
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Audit trail of all recorded collections, search by receipt number, and reprint receipts.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center text-xs font-semibold text-purple-600 dark:text-purple-400 group-hover:translate-x-1 transition-transform">
              Transaction Log
              <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>
        </div>
      </section>

      {/* 4. Recent Collections Ledger */}
      <section className="space-y-3" aria-label="Recent Collections Ledger">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" />
              Recent Fee Collections
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Latest transactions recorded across all payment channels.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-48 sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search receipt, student..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs bg-card"
              />
            </div>

            <Link
              to="/finance/transactions"
              className="text-xs text-primary hover:underline font-semibold shrink-0 ml-1"
            >
              All Transactions →
            </Link>
          </div>
        </div>

        {isLoadingSummary ? (
          <div className="p-8 text-center text-xs text-muted-foreground border rounded-xl bg-card">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary mb-2" />
            Loading recent payments...
          </div>
        ) : filteredRecentPayments.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl bg-card space-y-2">
            <div className="p-3 rounded-full bg-muted/60 text-muted-foreground w-fit mx-auto">
              <Receipt className="w-6 h-6" />
            </div>
            <p className="font-medium text-foreground">
              {searchQuery ? 'No payments matching your search.' : 'No payments recorded in this academic session yet.'}
            </p>
            <p className="text-muted-foreground text-[11px]">
              Use "Collect Payment" to record a new fee transaction and issue a receipt.
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
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4 text-right">Amount Paid</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredRecentPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-bold text-foreground">
                        {p.receipt_number}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-foreground">
                        {p.student_name || 'Student'}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-muted-foreground">
                        {p.bill_number ? (
                          <Link
                            to="/finance/bills"
                            className="hover:underline hover:text-primary"
                          >
                            {p.bill_number}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase font-mono ${getPaymentMethodBadgeClass(
                            p.payment_method
                          )}`}
                        >
                          {p.payment_method}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground font-mono">
                        {p.payment_date}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(p.amount_paid)}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedReceiptPaymentId(p.id)}
                          className="h-7 text-xs gap-1.5 cursor-pointer hover:bg-primary/10 hover:text-primary"
                          aria-label={`Print receipt for ${p.receipt_number}`}
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Receipt</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* 5. Modals & Dialogs */}
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
