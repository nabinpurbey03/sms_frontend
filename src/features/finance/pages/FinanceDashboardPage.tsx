import React, { useState, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { useAuth } from '@/auth/useAuth';
import { useCurrentAcademicYear } from '@/features/academic-year/hooks/useCurrentAcademicYear';
import {
  useFinanceDashboardSummary,
  useCreateFeeStructure,
  useBatchGenerateBills,
} from '../hooks';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
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
  Calendar,
  LayoutDashboard,
  ArrowUpRight,
  Search,
  ArrowRight,
  Activity,
  Layers,
  Banknote,
  ShieldAlert,
  Tag,
  BadgePercent,
  GraduationCap,
  RefreshCw,
  Copy,
  Check,
  X,
  AlertTriangle,
} from 'lucide-react';
import { FeeStructureDialog } from '../components/FeeStructureDialog';
import { PrintableReceiptModal } from '../components/PrintableReceiptModal';
import { useCalendarPreferenceStore } from '@/stores/calendarPreferenceStore';
import { formatDate } from '@/features/school-settings/utils/nepaliDate';
import {
  formatCurrency,
  formatCompactCurrency,
  formatCompactNumber,
} from '../utils/cashierUtils';

const getPaymentMethodBadgeClass = (method: string): string => {
  switch (method?.toUpperCase()) {
    case 'CASH':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    case 'BANK_TRANSFER':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    case 'CHEQUE':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    case 'DIGITAL_WALLET':
    case 'ESEWA':
    case 'KHALTI':
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
    case 'OTHER':
    default:
      return 'bg-muted text-muted-foreground border-border/60';
  }
};

const getChannelBarColor = (method: string): string => {
  switch (method?.toUpperCase()) {
    case 'CASH':
      return 'bg-emerald-500';
    case 'BANK_TRANSFER':
      return 'bg-blue-500';
    case 'CHEQUE':
      return 'bg-amber-500';
    case 'DIGITAL_WALLET':
    case 'ESEWA':
    case 'KHALTI':
      return 'bg-purple-500';
    case 'OTHER':
    default:
      return 'bg-slate-400 dark:bg-slate-600';
  }
};

export const FinanceDashboardPage: React.FC = () => {
  const { activeTenantId, activeRole } = useAuth();
  const { calendarSystem } = useCalendarPreferenceStore();
  const { currentYear, isLoading: isLoadingYear } = useCurrentAcademicYear(activeTenantId);
  const {
    data: summary,
    isLoading: isLoadingSummary,
    isFetching: isFetchingSummary,
    isError: isSummaryError,
    refetch: refetchSummary,
  } = useFinanceDashboardSummary(activeTenantId);

  // Dialog States
  const [isFeeStructureOpen, setIsFeeStructureOpen] = useState(false);
  const [selectedReceiptPaymentId, setSelectedReceiptPaymentId] = useState<string | null>(null);

  // Tab & Search States
  const [activeTab, setActiveTab] = useState<'collections' | 'concessions'>('collections');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedReceipt, setCopiedReceipt] = useState<string | null>(null);

  // Mutations
  const createFeeStructureMutation = useCreateFeeStructure(activeTenantId);
  const batchBillMutation = useBatchGenerateBills(activeTenantId);

  // Core Financial Metrics
  const monthCollected = Number(summary?.total_collected_month || 0);
  const yearCollected = Number(summary?.total_collected_year || 0);
  const outstandingDues = Number(summary?.total_outstanding_dues || 0);
  const collectionRate = Number(summary?.collection_rate_percent || 0);
  const defaultersCount = summary?.total_defaulters_count || 0;
  const recentPayments = summary?.recent_payments || [];
  const yearDiscounts = Number(summary?.total_discount_year || 0);
  const monthDiscounts = Number(summary?.total_discount_month || 0);
  const discountedStudentsCount = summary?.total_discounted_students_count || 0;
  const openingArrears = Number(summary?.total_opening_arrears || 0);
  const alumniDues = Number(summary?.total_alumni_dues || 0);
  const isNewSessionUnbilled = Boolean(summary?.is_new_session_unbilled);
  const activeSessionDues = Math.max(0, outstandingDues - openingArrears - alumniDues);

  // Analytical derivations
  const totalInvoiced = yearCollected + outstandingDues;
  const realizedPercent = totalInvoiced > 0 ? Math.min(100, Math.round((yearCollected / totalInvoiced) * 100)) : 0;
  const duePercent = totalInvoiced > 0 ? Math.max(0, 100 - realizedPercent) : 0;

  const concessionPayments = useMemo(() => {
    return recentPayments.filter((p) => Number(p.discount_amount || 0) > 0);
  }, [recentPayments]);

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

  const filteredConcessionPayments = useMemo(() => {
    if (!searchQuery.trim()) return concessionPayments;
    const q = searchQuery.toLowerCase().trim();
    return concessionPayments.filter((p) => {
      const receiptMatch = p.receipt_number?.toLowerCase().includes(q);
      const studentMatch = p.student_name?.toLowerCase().includes(q);
      const billMatch = p.bill_number?.toLowerCase().includes(q);
      const cashierMatch = p.received_by_name?.toLowerCase().includes(q);
      return receiptMatch || studentMatch || billMatch || cashierMatch;
    });
  }, [concessionPayments, searchQuery]);

  const handleCopyReceipt = (receiptNo: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(receiptNo);
    setCopiedReceipt(receiptNo);
    setTimeout(() => setCopiedReceipt(null), 2000);
  };

  const isAccountant = activeRole === 'ACCOUNTANT';
  const pageTitle = isAccountant ? 'Dashboard' : 'Finance Dashboard';

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header & Quick Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <LayoutDashboard className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {pageTitle}
                </h1>
                <Badge
                  variant="outline"
                  className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 flex items-center gap-1"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
                  Live Finance
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Real-time fee collection, outstanding balances, and cash flow intelligence.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Refresh Action */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => refetchSummary()}
            disabled={isFetchingSummary}
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            title="Refresh dashboard metrics"
            aria-label="Refresh financial data"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isFetchingSummary ? 'animate-spin text-primary' : ''}`}
              aria-hidden="true"
            />
            <span className="ml-1 text-xs hidden sm:inline">Sync</span>
          </Button>

          {/* Academic Session Indicator */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 border border-border/60 text-xs font-semibold text-foreground/80 shadow-2xs"
            title="Active academic session"
          >
            <Calendar className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
            <span>
              {isLoadingYear ? 'Loading...' : currentYear?.name || 'Active Session'}
            </span>
          </div>

          {/* Primary Action: Direct Payment Collection */}
          <Link to="/finance/bills">
            <Button
              size="sm"
              className="gap-1.5 text-xs font-semibold shadow-xs cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <CreditCard className="w-3.5 h-3.5" aria-hidden="true" />
              Collect Payment
            </Button>
          </Link>

          <Link to="/finance/batch-billing">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs font-medium shadow-2xs cursor-pointer hover:bg-accent"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
              Batch Invoicing
            </Button>
          </Link>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsFeeStructureOpen(true)}
            className="gap-1.5 text-xs font-medium shadow-2xs cursor-pointer hover:bg-accent"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            Fee Head
          </Button>
        </div>
      </div>

      {/* Error Alert Banner */}
      {isSummaryError && (
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start sm:items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
            <div>
              <p className="text-xs sm:text-sm font-semibold">
                Failed to load live finance summary.
              </p>
              <p className="text-[11px] opacity-80 mt-0.5">
                A network or server error occurred while retrieving real-time ledger metrics.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetchSummary()}
            className="gap-1.5 text-xs font-semibold shrink-0 cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            Retry Connection
          </Button>
        </div>
      )}

      {/* Post-Rollover Session Onboarding Banner */}
      {isNewSessionUnbilled && (
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-background dark:from-amber-950/40 dark:via-indigo-950/30 dark:to-card p-5 sm:p-6 shadow-xs transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
                <Sparkles className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                    New Academic Session Active
                  </h3>
                  <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10 text-[10px] font-semibold uppercase">
                    Unbilled Session
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  New Academic Session Active — 0 invoices generated yet for this session.
                </p>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-background/80 dark:bg-card/80 border border-border/60 shadow-2xs">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Layers className="w-4 h-4" aria-hidden="true" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                    Opening Arrears (Active Students)
                  </span>
                  <span className="text-sm font-extrabold font-mono tabular-nums text-foreground">
                    {formatCurrency(summary?.total_opening_arrears ?? 0)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-background/80 dark:bg-card/80 border border-border/60 shadow-2xs">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <GraduationCap className="w-4 h-4" aria-hidden="true" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                    Alumni Dues (Graduated Students)
                  </span>
                  <span className="text-sm font-extrabold font-mono tabular-nums text-foreground">
                    {formatCurrency(summary?.total_alumni_dues ?? 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap sm:flex-nowrap lg:flex-col gap-2.5 shrink-0 justify-end">
            <Link to="/finance/bills">
              <Button className="w-full gap-2 text-xs font-semibold shadow-xs bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer">
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                Generate Session Bills
              </Button>
            </Link>
            <Link to={'/finance/alumni-clearance' as any}>
              <Button variant="outline" className="w-full gap-2 text-xs font-medium border-amber-500/30 hover:bg-amber-500/10 text-amber-800 dark:text-amber-300 cursor-pointer">
                <GraduationCap className="w-4 h-4" aria-hidden="true" />
                View Alumni Clearance
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* 2. Top Analytics Suite - Symmetrical 5 KPI Cards */}
      <section className="space-y-4" aria-label="Financial Analytics and Key Performance Indicators">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
          {isLoadingSummary ? (
            Array.from({ length: 5 }).map((_, idx) => (
              <Card key={`kpi-skeleton-${idx}`} className="border-border/60 p-4 space-y-2.5">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-6 w-6 rounded-lg" />
                </div>
                <Skeleton className="h-7 w-28" />
                <Skeleton className="h-3.5 w-36" />
              </Card>
            ))
          ) : (
            <>
              {/* KPI 1: This Month Collection */}
              <Card className="relative overflow-hidden border-border/60 hover:shadow-xs transition-shadow">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
                <CardHeader className="flex flex-row items-center justify-between p-4 pb-1.5 space-y-0">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                    This Month Collection
                  </span>
                  <div className="p-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0">
                    <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-1.5">
                  <div className="flex items-baseline gap-1" title={formatCurrency(monthCollected)}>
                    <span className="text-xs font-semibold text-muted-foreground uppercase">NPR</span>
                    <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-sans tabular-nums">
                      {formatCompactNumber(monthCollected)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      Current Month
                    </span>
                    <span className="text-[11px] text-muted-foreground truncate">Realized cash flow</span>
                  </div>
                </CardContent>
              </Card>

              {/* KPI 2: Session Cumulative Collection */}
              <Card className="relative overflow-hidden border-border/60 hover:shadow-xs transition-shadow">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-400" />
                <CardHeader className="flex flex-row items-center justify-between p-4 pb-1.5 space-y-0">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                    Session Collection
                  </span>
                  <div className="p-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg shrink-0">
                    <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-1.5">
                  <div className="flex items-baseline gap-1" title={formatCurrency(yearCollected)}>
                    <span className="text-xs font-semibold text-muted-foreground uppercase">NPR</span>
                    <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-sans tabular-nums">
                      {formatCompactNumber(yearCollected)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                      Cumulative
                    </span>
                    <span className="text-[11px] text-muted-foreground truncate">Active session inflow</span>
                  </div>
                </CardContent>
              </Card>

              {/* KPI 3: Outstanding Receivables / Dues */}
              <Card className="relative overflow-hidden border-border/60 hover:shadow-xs transition-shadow">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-400" />
                <CardHeader className="flex flex-row items-center justify-between p-4 pb-1.5 space-y-0">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                    Outstanding Dues
                  </span>
                  <div className="p-1.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg shrink-0">
                    <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-1.5">
                  <div
                    className="flex items-baseline gap-1"
                    title={`Total Outstanding: ${formatCurrency(outstandingDues)}${
                      openingArrears > 0 || alumniDues > 0
                        ? `\n• Active Session: ${formatCurrency(activeSessionDues)}\n• Prior Arrears: ${formatCurrency(openingArrears)}\n• Alumni Dues: ${formatCurrency(alumniDues)}`
                        : ''
                    }`}
                  >
                    <span className="text-xs font-semibold text-rose-600/70 dark:text-rose-400/70 uppercase">NPR</span>
                    <span className="text-xl sm:text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 font-sans tabular-nums">
                      {formatCompactNumber(outstandingDues)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center text-[10px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">
                      {defaultersCount} Delinquent
                    </span>
                    <span className="text-[11px] text-muted-foreground truncate">Unpaid / partial bills</span>
                  </div>
                </CardContent>
              </Card>

              {/* KPI 4: Total Concessions & Waivers (Compact label) */}
              <Card className="relative overflow-hidden border-border/60 hover:shadow-xs transition-shadow">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-yellow-400" />
                <CardHeader className="flex flex-row items-center justify-between p-4 pb-1.5 space-y-0">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate" title="Total Concessions & Waivers">
                    Fee Concessions
                  </span>
                  <div className="p-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg border border-amber-500/20 shrink-0">
                    <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-1.5">
                  <div className="flex items-baseline gap-1" title={formatCurrency(yearDiscounts)}>
                    <span className="text-xs font-semibold text-amber-600/70 dark:text-amber-400/70 uppercase">NPR</span>
                    <span className="text-xl sm:text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-sans tabular-nums">
                      {formatCompactNumber(yearDiscounts)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 font-sans tabular-nums">
                      Month: {formatCompactCurrency(monthDiscounts)}
                    </span>
                    <span className="text-[11px] text-muted-foreground truncate">
                      {discountedStudentsCount} student{discountedStudentsCount === 1 ? '' : 's'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* KPI 5: Collection Efficiency */}
              <Card className="relative overflow-hidden border-border/60 hover:shadow-xs transition-shadow">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-400" />
                <CardHeader className="flex flex-row items-center justify-between p-4 pb-1.5 space-y-0">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                    Collection Rate
                  </span>
                  <div className="p-1.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg shrink-0">
                    <Percent className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-1.5">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-sans tabular-nums">
                      {collectionRate.toFixed(1)}%
                    </span>
                    <span className="text-[11px] font-normal text-muted-foreground">
                      of invoiced
                    </span>
                  </div>
                  <div
                    className="w-full bg-muted rounded-full h-1.5 overflow-hidden"
                    role="progressbar"
                    aria-valuenow={Math.round(collectionRate)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Collection efficiency rate"
                  >
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        collectionRate >= 80
                          ? 'bg-emerald-500'
                          : collectionRate >= 50
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, collectionRate))}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                    <span>Benchmark: &gt;85%</span>
                    <span className={`text-[10px] font-semibold px-1 py-0.2 rounded ${
                      collectionRate >= 80
                        ? 'text-emerald-600 bg-emerald-500/10'
                        : collectionRate >= 50
                        ? 'text-amber-600 bg-amber-500/10'
                        : 'text-rose-600 bg-rose-500/10'
                    }`}>
                      {collectionRate >= 80 ? 'Optimal' : collectionRate >= 50 ? 'Moderate' : 'Action Needed'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Financial Health Breakdown & Velocity Pulse */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Card A: Revenue Realization & Receivables Proportion (7 cols) */}
          <Card className="lg:col-span-7 border-border/60 shadow-2xs">
            <CardHeader className="p-4 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" aria-hidden="true" />
                    Revenue Realization & Recovery Health
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Total expected billed revenue vs realized cash flow for this session.
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className="font-mono tabular-nums text-xs"
                  title={formatCurrency(totalInvoiced)}
                >
                  Total Invoiced: {formatCompactCurrency(totalInvoiced)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-4">
              {/* Stacked Proportional Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" aria-hidden="true" />
                    Realized ({realizedPercent}%)
                  </span>
                  <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" aria-hidden="true" />
                    Outstanding Dues ({duePercent}%)
                  </span>
                </div>
                <div
                  className="h-3 w-full rounded-full bg-muted overflow-hidden flex"
                  role="progressbar"
                  aria-valuenow={realizedPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Revenue realization versus outstanding receivables"
                >
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

              {/* Metric Breakdown Grid - 4 Columns */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-border/40">
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                    Cash Realized
                  </span>
                  <span
                    className="text-sm font-bold font-sans tabular-nums text-emerald-600 dark:text-emerald-400 block mt-0.5"
                    title={formatCurrency(yearCollected)}
                  >
                    {formatCompactCurrency(yearCollected)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Inflow</span>
                </div>

                <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                    Active Session
                  </span>
                  <span
                    className="text-sm font-bold font-sans tabular-nums text-rose-600 dark:text-rose-400 block mt-0.5"
                    title={formatCurrency(activeSessionDues)}
                  >
                    {formatCompactCurrency(activeSessionDues)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{defaultersCount} Accounts</span>
                </div>

                <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                    Prior & Alumni
                  </span>
                  <span
                    className="text-sm font-bold font-sans tabular-nums text-amber-600 dark:text-amber-400 block mt-0.5"
                    title={`Prior Arrears: ${formatCurrency(openingArrears)} | Alumni: ${formatCurrency(alumniDues)}`}
                  >
                    {formatCompactCurrency(openingArrears + alumniDues)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Arrears</span>
                </div>

                <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                    Target Recovery
                  </span>
                  <span className="text-sm font-bold font-sans text-foreground block mt-0.5 truncate">
                    {collectionRate >= 80 ? 'Optimal' : collectionRate >= 50 ? 'Moderate' : 'Action Needed'}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    &gt; 85% Benchmark
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
                    <Banknote className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    Payment Channels & Velocity
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Recent receipts breakdown by payment gateway & mode.
                  </CardDescription>
                </div>
                <span className="text-xs font-semibold text-muted-foreground font-sans tabular-nums">
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
                  <span
                    className="text-sm font-bold font-sans tabular-nums text-primary block"
                    title={formatCurrency(recentTotal)}
                  >
                    {formatCompactCurrency(recentTotal)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                    Avg. Transaction
                  </span>
                  <span
                    className="text-sm font-bold font-sans tabular-nums text-foreground block"
                    title={formatCurrency(avgReceipt)}
                  >
                    {formatCompactCurrency(avgReceipt)}
                  </span>
                </div>
              </div>

              {/* Segmented Volume Share Bar */}
              {channelBreakdown.length > 0 && recentTotal > 0 && (
                <div className="space-y-1.5 pt-0.5">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <span>Channel Mix (% Volume)</span>
                    <span className="font-sans tabular-nums">{channelBreakdown.length} Mode{channelBreakdown.length > 1 ? 's' : ''}</span>
                  </div>
                  <div
                    className="h-2 w-full rounded-full bg-muted overflow-hidden flex"
                    role="progressbar"
                    aria-label="Payment channels volume share distribution"
                  >
                    {channelBreakdown.map(([method, data]) => {
                      const pct = Math.max(2, (data.total / recentTotal) * 100);
                      return (
                        <div
                          key={`bar-${method}`}
                          className={`h-full transition-all duration-500 ${getChannelBarColor(method)}`}
                          style={{ width: `${pct}%` }}
                          title={`${method}: ${((data.total / recentTotal) * 100).toFixed(1)}% (${formatCurrency(data.total)})`}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Payment Mode Pills */}
              <div className="space-y-1.5 pt-1">
                {channelBreakdown.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-1">
                    No transactions recorded yet.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {channelBreakdown.map(([method, data]) => {
                      const pct = recentTotal > 0 ? Math.round((data.total / recentTotal) * 100) : 0;
                      return (
                        <div
                          key={method}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${getPaymentMethodBadgeClass(
                            method
                          )}`}
                        >
                          <span>{method}</span>
                          <span className="font-sans text-[10px] opacity-75">
                            ({pct}%)
                          </span>
                          <span
                            className="font-sans tabular-nums text-[11px] font-bold ml-0.5"
                            title={formatCurrency(data.total)}
                          >
                            {formatCompactCurrency(data.total)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Defaulter Action Callout */}
        {defaultersCount > 0 && (
          <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
            <div className="flex items-start sm:items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
              <div>
                <span className="font-bold block" title={formatCurrency(outstandingDues)}>
                  {defaultersCount} Students have Overdue Fees ({formatCompactCurrency(outstandingDues)} outstanding)
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
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
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
            to="/finance/bills"
            className="p-4 rounded-xl border border-border/60 bg-card hover:border-emerald-500/50 hover:bg-accent/40 transition-all duration-200 flex flex-col justify-between group cursor-pointer shadow-2xs"
          >
            <div className="flex items-start justify-between">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                <CreditCard className="w-5 h-5" aria-hidden="true" />
              </div>
              <Badge variant="outline" className="text-[10px] font-semibold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
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
              View &amp; Collect Bills
              <ArrowUpRight className="w-3.5 h-3.5 ml-1" aria-hidden="true" />
            </div>
          </Link>

          {/* Card 2: Bills & Invoices */}
          <Link
            to="/finance/bills"
            className="p-4 rounded-xl border border-border/60 bg-card hover:border-blue-500/50 hover:bg-accent/40 transition-all duration-200 flex flex-col justify-between group cursor-pointer shadow-2xs"
          >
            <div className="flex items-start justify-between">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5" aria-hidden="true" />
              </div>
              <Badge variant="outline" className="text-[10px] font-semibold border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/5">
                Student Invoices
              </Badge>
            </div>
            <div className="mt-3">
              <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                Bills & Invoices
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Generate monthly class invoices, track payment status, manage transportation, and filter dues.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">
              Manage Invoices
              <ArrowUpRight className="w-3.5 h-3.5 ml-1" aria-hidden="true" />
            </div>
          </Link>

          {/* Card 3: Fee Structures */}
          <Link
            to="/finance/structures"
            className="p-4 rounded-xl border border-border/60 bg-card hover:border-amber-500/50 hover:bg-accent/40 transition-all duration-200 flex flex-col justify-between group cursor-pointer shadow-2xs"
          >
            <div className="flex items-start justify-between">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                <Coins className="w-5 h-5" aria-hidden="true" />
              </div>
              <Badge variant="outline" className="text-[10px] font-semibold border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5">
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
              <ArrowUpRight className="w-3.5 h-3.5 ml-1" aria-hidden="true" />
            </div>
          </Link>

          {/* Card 4: Payment History & Audits */}
          <Link
            to="/finance/transactions"
            className="p-4 rounded-xl border border-border/60 bg-card hover:border-purple-500/50 hover:bg-accent/40 transition-all duration-200 flex flex-col justify-between group cursor-pointer shadow-2xs"
          >
            <div className="flex items-start justify-between">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
                <Receipt className="w-5 h-5" aria-hidden="true" />
              </div>
              <Badge variant="outline" className="text-[10px] font-semibold border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/5">
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
              <ArrowUpRight className="w-3.5 h-3.5 ml-1" aria-hidden="true" />
            </div>
          </Link>
        </div>
      </section>

      {/* 4. Unified Financial Activity Hub (Tabbed Collections & Concessions) */}
      <section className="space-y-3" aria-label="Financial Activity and Ledger Hub">
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as 'collections' | 'concessions')}
          className="space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
            <TabsList className="h-9">
              <TabsTrigger value="collections" className="gap-2 text-xs">
                <Receipt className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                <span>Recent Collections</span>
                <span className="px-1.5 py-0.2 rounded-full bg-primary/10 text-primary text-[10px] font-sans tabular-nums">
                  {recentPayments.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="concessions" className="gap-2 text-xs">
                <BadgePercent className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                <span>Concessions & Waivers</span>
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] font-sans tabular-nums">
                  {concessionPayments.length}
                </span>
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  placeholder="Search receipt, student..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 pr-7 text-xs bg-card"
                  aria-label="Filter recent transactions"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                    aria-label="Clear search input"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>

              {activeTab === 'collections' ? (
                <Link
                  to="/finance/transactions"
                  className="text-xs text-primary hover:underline font-semibold shrink-0 ml-1 inline-flex items-center gap-0.5"
                >
                  <span>All</span>
                  <ArrowRight className="w-3 h-3" aria-hidden="true" />
                </Link>
              ) : (
                <Link
                  to="/finance/transactions"
                  search={{ tab: 'discounts' }}
                  className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-semibold shrink-0 ml-1 inline-flex items-center gap-0.5"
                >
                  <span>Register</span>
                  <ArrowRight className="w-3 h-3" aria-hidden="true" />
                </Link>
              )}
            </div>
          </div>

          {/* TAB 1: Recent Collections */}
          <TabsContent value="collections" className="space-y-3 mt-0">
            {isLoadingSummary ? (
              <div className="border border-border/60 rounded-xl overflow-hidden bg-card p-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={`skel-row-${i}`} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-6 w-16 rounded-md" />
                  </div>
                ))}
              </div>
            ) : filteredRecentPayments.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl bg-card space-y-2">
                <div className="p-3 rounded-full bg-muted/60 text-muted-foreground w-fit mx-auto">
                  <Receipt className="w-6 h-6" aria-hidden="true" />
                </div>
                <p className="font-medium text-foreground">
                  {searchQuery ? 'No payments matching your search.' : 'No payments recorded in this academic session yet.'}
                </p>
                <p className="text-muted-foreground text-[11px]">
                  {searchQuery
                    ? 'Check your receipt number or student name query, or reset the filter.'
                    : 'Use "Collect Payment" to record a new fee transaction and issue a receipt.'}
                </p>
                {searchQuery && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSearchQuery('')}
                    className="text-xs mt-2 h-7"
                  >
                    Clear Filter
                  </Button>
                )}
              </div>
            ) : (
              <div className="border border-border/60 rounded-xl overflow-hidden bg-card shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left" aria-label="Recent Collections Ledger">
                    <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground font-semibold">
                      <tr>
                        <th scope="col" className="py-2.5 px-4">Receipt #</th>
                        <th scope="col" className="py-2.5 px-4">Student</th>
                        <th scope="col" className="py-2.5 px-4">Bill Ref</th>
                        <th scope="col" className="py-2.5 px-4">Payment Method</th>
                        <th scope="col" className="py-2.5 px-4">Date</th>
                        <th scope="col" className="py-2.5 px-4 text-right">Amount Paid</th>
                        <th scope="col" className="py-2.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredRecentPayments.map((p) => (
                        <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-4 font-mono font-bold text-foreground">
                            <div className="flex items-center gap-1.5">
                              <span>{p.receipt_number}</span>
                              <button
                                type="button"
                                onClick={(e) => handleCopyReceipt(p.receipt_number, e)}
                                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                                title="Copy receipt number"
                                aria-label={`Copy receipt ${p.receipt_number}`}
                              >
                                {copiedReceipt === p.receipt_number ? (
                                  <Check className="w-3 h-3 text-emerald-500" aria-hidden="true" />
                                ) : (
                                  <Copy className="w-3 h-3 opacity-60 hover:opacity-100" aria-hidden="true" />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="py-2.5 px-4 font-medium text-foreground">
                            {p.student_id ? (
                              <Link
                                to="/finance/ledger/$studentId"
                                params={{ studentId: p.student_id }}
                                className="hover:underline hover:text-primary inline-flex items-center gap-1 group font-medium"
                                title={`View student ledger for ${p.student_name || 'Student'}`}
                              >
                                <span>{p.student_name || 'Student'}</span>
                                <ArrowUpRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary" aria-hidden="true" />
                              </Link>
                            ) : (
                              <span>{p.student_name || 'Student'}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-muted-foreground">
                            {p.bill_number ? (
                              <Link
                                to="/finance/bills"
                                className="hover:underline hover:text-primary inline-flex items-center gap-1 group"
                                title={`View bill ${p.bill_number}`}
                              >
                                <span>{p.bill_number}</span>
                                <ArrowUpRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
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
                          <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap">
                            {formatDate(p.payment_date, calendarSystem)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-sans tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
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
                              <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Receipt</span>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-3 bg-muted/30 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Showing {filteredRecentPayments.length} of {recentPayments.length} recent collections
                  </span>
                  <Link
                    to="/finance/transactions"
                    className="font-semibold text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Full Transaction History →
                  </Link>
                </div>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: Recent Concessions & Waivers Audit */}
          <TabsContent value="concessions" className="space-y-3 mt-0">
            {isLoadingSummary ? (
              <div className="border border-border/60 rounded-xl overflow-hidden bg-card p-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={`skel-concession-${i}`} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-6 w-16 rounded-md" />
                  </div>
                ))}
              </div>
            ) : filteredConcessionPayments.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl bg-card space-y-2">
                <div className="p-3 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 w-fit mx-auto border border-amber-500/20">
                  <Tag className="w-6 h-6" aria-hidden="true" />
                </div>
                <p className="font-medium text-foreground">
                  {searchQuery ? 'No fee concessions matching your search.' : 'No recent fee waivers recorded.'}
                </p>
                <p className="text-muted-foreground text-[11px]">
                  Discounts applied during billing payments will appear here with student details, receipt reference, and approving cashier.
                </p>
                {searchQuery && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSearchQuery('')}
                    className="text-xs mt-2 h-7"
                  >
                    Clear Filter
                  </Button>
                )}
              </div>
            ) : (
              <div className="border border-border/60 rounded-xl overflow-hidden bg-card shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left" aria-label="Recent Concessions and Waivers Audit Feed">
                    <thead className="bg-amber-500/5 border-b border-border/60 text-muted-foreground font-semibold">
                      <tr>
                        <th scope="col" className="py-2.5 px-4">Receipt #</th>
                        <th scope="col" className="py-2.5 px-4">Student</th>
                        <th scope="col" className="py-2.5 px-4">Concession / Waiver</th>
                        <th scope="col" className="py-2.5 px-4">Type</th>
                        <th scope="col" className="py-2.5 px-4">Approved / Handled By</th>
                        <th scope="col" className="py-2.5 px-4">Date</th>
                        <th scope="col" className="py-2.5 px-4 text-right">Net Paid</th>
                        <th scope="col" className="py-2.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredConcessionPayments.map((p) => {
                        const discountAmt = Number(p.discount_amount || 0);
                        const discountRate = p.discount_rate;
                        const isPercent = p.discount_type === 'PERCENT';
                        const discountTypeLabel = isPercent
                          ? `${discountRate ?? ''}% Waiver`
                          : 'Fixed Discount';

                        return (
                          <tr key={`concession-${p.id}`} className="hover:bg-amber-500/5 transition-colors">
                            <td className="py-2.5 px-4 font-mono font-bold text-foreground">
                              <div className="flex items-center gap-1.5">
                                <span>{p.receipt_number}</span>
                                <button
                                  type="button"
                                  onClick={(e) => handleCopyReceipt(p.receipt_number, e)}
                                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                                  title="Copy receipt number"
                                  aria-label={`Copy receipt ${p.receipt_number}`}
                                >
                                  {copiedReceipt === p.receipt_number ? (
                                    <Check className="w-3 h-3 text-emerald-500" aria-hidden="true" />
                                  ) : (
                                    <Copy className="w-3 h-3 opacity-60 hover:opacity-100" aria-hidden="true" />
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="py-2.5 px-4">
                              {p.student_id ? (
                                <Link
                                  to="/finance/ledger/$studentId"
                                  params={{ studentId: p.student_id }}
                                  className="hover:underline hover:text-primary inline-flex items-center gap-1 group font-medium text-foreground"
                                  title={`View student ledger for ${p.student_name || 'Student'}`}
                                >
                                  <span>{p.student_name || 'Student'}</span>
                                  <ArrowUpRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary" aria-hidden="true" />
                                </Link>
                              ) : (
                                <div className="font-medium text-foreground">
                                  {p.student_name || 'Student'}
                                </div>
                              )}
                              {p.bill_number && (
                                <Link
                                  to="/finance/bills"
                                  className="font-mono text-[10px] text-muted-foreground hover:underline hover:text-primary block"
                                >
                                  Bill: {p.bill_number}
                                </Link>
                              )}
                            </td>
                            <td className="py-2.5 px-4">
                              <span className="inline-flex items-center gap-1 font-sans tabular-nums font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-[11px]">
                                -{formatCurrency(discountAmt)}
                              </span>
                            </td>
                            <td className="py-2.5 px-4">
                              <Badge variant="outline" className="text-[10px] font-semibold border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/10">
                                {discountTypeLabel}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-4 text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                Received by {p.received_by_name || 'Cashier'}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap">
                              {formatDate(p.payment_date, calendarSystem)}
                            </td>
                            <td className="py-2.5 px-4 text-right font-sans tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(p.amount_paid)}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedReceiptPaymentId(p.id)}
                                className="h-7 text-xs gap-1.5 cursor-pointer hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-300"
                                aria-label={`Print receipt for ${p.receipt_number}`}
                              >
                                <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Receipt</span>
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="p-3 bg-muted/30 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Showing {filteredConcessionPayments.length} of {concessionPayments.length} recent discounted transactions
                  </span>
                  <Link
                    to="/finance/transactions"
                    search={{ tab: 'discounts' }}
                    className="font-semibold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1"
                  >
                    View Full Concession Register →
                  </Link>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
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
