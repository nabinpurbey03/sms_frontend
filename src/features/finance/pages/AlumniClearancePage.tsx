import React, { useState, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { useAuth } from '@/auth/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import {
  GraduationCap,
  Search,
  X,
  Filter,
  CheckCircle2,
  Clock,
  Banknote,
  FileText,
  Copy,
  RefreshCw,
  CreditCard,
  Receipt,
  ExternalLink,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  useAlumniClearance,
  useRecordPayment,
  useStudentLedger,
  ALUMNI_CLEARANCE_KEY,
  FINANCE_DASHBOARD_KEY,
  STUDENT_LEDGER_KEY,
} from '../hooks';
import type { AlumniClearanceItem, FeePayment } from '../types';
import { SessionArchiveSelect } from '../components/SessionArchiveSelect';
import { PaymentCollectDialog } from '../components/PaymentCollectDialog';
import { PrintableStatementModal } from '../components/PrintableStatementModal';

const formatNpr = (val: number | string | undefined | null): string => {
  const num = Number(val || 0);
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const AlumniClearancePage: React.FC = () => {
  const { activeTenantId } = useAuth();
  const queryClient = useQueryClient();

  // Filters State
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING_CLEARANCE' | 'CLEARED'>('ALL');
  const [selectedArchiveYearId, setSelectedArchiveYearId] = useState<string | undefined>(undefined);

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Dialog & Modal State
  const [studentForPayment, setStudentForPayment] = useState<AlumniClearanceItem | null>(null);
  const [studentForStatement, setStudentForStatement] = useState<AlumniClearanceItem | null>(null);

  // Mutation
  const recordPaymentMutation = useRecordPayment(activeTenantId);

  // Query alumni clearance data
  const {
    data: clearanceResponse,
    isLoading,
    isFetching,
    refetch,
  } = useAlumniClearance(activeTenantId, {
    search: debouncedSearch.trim() || undefined,
    clearance_status: statusFilter === 'ALL' ? undefined : statusFilter,
    academic_year_id: selectedArchiveYearId,
    page_size: 100,
  });

  // Fetch ledger data for modals when a student is selected
  const activeStudentIdForLedger = studentForPayment?.student_id || studentForStatement?.student_id || null;
  const { data: activeStudentLedger, isLoading: isLedgerLoading } = useStudentLedger(activeTenantId, activeStudentIdForLedger);

  const unpaidBills = useMemo(() => {
    if (!activeStudentLedger?.bills) return [];
    return activeStudentLedger.bills.filter(
      (b) => b.status !== 'PAID' && b.status !== 'CANCELLED'
    );
  }, [activeStudentLedger]);

  // If ledger finishes loading and no unpaid bills found for settlement
  React.useEffect(() => {
    if (studentForPayment && !isLedgerLoading && activeStudentLedger) {
      if (unpaidBills.length === 0) {
        toast.error('No unpaid bills found in current ledger for settlement; please view full student ledger.');
        setStudentForPayment(null);
      }
    }
  }, [studentForPayment, isLedgerLoading, activeStudentLedger, unpaidBills.length]);

  const items = clearanceResponse?.items || [];
  const totalCount = clearanceResponse?.total_count || 0;
  const clearedCount = clearanceResponse?.cleared_count || 0;
  const pendingCount = clearanceResponse?.pending_count || 0;
  const totalAlumniDues = clearanceResponse?.total_alumni_dues || 0;

  const handleCopy = (text: string, message: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    toast.success(message);
  };

  const getFullName = (item: AlumniClearanceItem) => {
    return `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Alumnus';
  };

  const getInitials = (item: AlumniClearanceItem) => {
    const f = item.first_name?.[0] || '';
    const l = item.last_name?.[0] || '';
    return (f + l).toUpperCase() || 'AL';
  };

  const handlePaymentSuccess = (payment: FeePayment) => {
    setStudentForPayment(null);
    queryClient.invalidateQueries({ queryKey: [ALUMNI_CLEARANCE_KEY, activeTenantId] });
    queryClient.invalidateQueries({ queryKey: [FINANCE_DASHBOARD_KEY, activeTenantId] });
    queryClient.invalidateQueries({ queryKey: [STUDENT_LEDGER_KEY, activeTenantId] });
    toast.success('Clearance Payment Recorded', {
      description: `Receipt #${payment.receipt_number} issued successfully.`,
    });
  };

  const hasActiveFilters = Boolean(search || statusFilter !== 'ALL' || selectedArchiveYearId);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link to="/finance" className="hover:text-foreground transition-colors">
              Finance
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium">Alumni Clearance Register</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Alumni Clearance Register
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Track and settle outstanding financial obligations for graduated students prior to certificate issuance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading || isFetching}
            className="h-9 gap-1.5 text-xs shadow-2xs cursor-pointer"
            title="Refresh clearance records"
          >
            <RefreshCw
              className={cn('w-3.5 h-3.5', (isLoading || isFetching) && 'animate-spin')}
            />
            <span>Refresh</span>
          </Button>

          <Link to="/academic/alumni">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs shadow-2xs cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Academic Alumni</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Graduated */}
        <Card className="relative overflow-hidden border-border/60 hover:shadow-xs transition-shadow">
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 space-y-0">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Total Graduated
            </span>
            <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg border border-indigo-500/20">
              <GraduationCap className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-black tracking-tight text-foreground">
              {totalCount.toLocaleString()}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Graduated alumni on register
            </p>
          </CardContent>
        </Card>

        {/* KPI 2: Cleared Alumni */}
        <Card className="relative overflow-hidden border-border/60 hover:shadow-xs transition-shadow">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 space-y-0">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Cleared Alumni
            </span>
            <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-500/20">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
              {clearedCount.toLocaleString()}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
              <span>Zero outstanding balance</span>
              {totalCount > 0 && (
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  ({Math.round((clearedCount / totalCount) * 100)}%)
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        {/* KPI 3: Pending Clearance */}
        <Card className="relative overflow-hidden border-border/60 hover:shadow-xs transition-shadow">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 space-y-0">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Pending Clearance
            </span>
            <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg border border-amber-500/20">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-black tracking-tight text-amber-600 dark:text-amber-400">
              {pendingCount.toLocaleString()}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Awaiting dues settlement
            </p>
          </CardContent>
        </Card>

        {/* KPI 4: Total Alumni Receivables */}
        <Card className="relative overflow-hidden border-border/60 hover:shadow-xs transition-shadow">
          <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 space-y-0">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Alumni Receivables
            </span>
            <div className="p-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg border border-rose-500/20">
              <Banknote className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-black tracking-tight text-foreground font-mono">
              NPR {formatNpr(totalAlumniDues)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Total uncollected alumni arrears
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card className="border-border/60 shadow-xs">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by student name, admission no, roll no..."
                className="pl-9 pr-8 h-9 text-xs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Session Archive Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">
                Graduation Session:
              </span>
              <SessionArchiveSelect
                value={selectedArchiveYearId}
                onChange={(id) => setSelectedArchiveYearId(id)}
              />
            </div>
          </div>

          {/* Status Filter Tabs & Reset */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50 text-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                <span>Status:</span>
              </span>

              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border',
                  statusFilter === 'ALL'
                    ? 'bg-primary text-primary-foreground shadow-2xs border-primary'
                    : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/50'
                )}
              >
                All Alumni ({totalCount})
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('PENDING_CLEARANCE')}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border flex items-center gap-1.5',
                  statusFilter === 'PENDING_CLEARANCE'
                    ? 'bg-amber-600 text-white shadow-2xs border-amber-600'
                    : 'bg-muted/40 hover:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-border/50'
                )}
              >
                <Clock className="w-3 h-3" />
                <span>Pending Clearance ({pendingCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('CLEARED')}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border flex items-center gap-1.5',
                  statusFilter === 'CLEARED'
                    ? 'bg-emerald-600 text-white shadow-2xs border-emerald-600'
                    : 'bg-muted/40 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-border/50'
                )}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Cleared ({clearedCount})</span>
              </button>
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('ALL');
                  setSelectedArchiveYearId(undefined);
                }}
                className="h-7 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Reset Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Table Card */}
      <div className="rounded-2xl border border-border/60 bg-card shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 bg-muted/40 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">No Alumni Records Found</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {hasActiveFilters
                ? 'No graduated students match the selected filters or search criteria. Try resetting filters.'
                : 'No graduated alumni are currently registered in this institution.'}
            </p>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('ALL');
                  setSelectedArchiveYearId(undefined);
                }}
                className="text-xs mt-2"
              >
                Reset All Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[260px]">Student</TableHead>
                  <TableHead>Terminal Session &amp; Class</TableHead>
                  <TableHead className="text-right">Total Billed</TableHead>
                  <TableHead className="text-right">Total Paid</TableHead>
                  <TableHead className="text-right">Total Due</TableHead>
                  <TableHead className="text-center">Clearance Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const fullName = getFullName(item);
                  const initials = getInitials(item);
                  const totalDue = Number(item.total_due || 0);
                  const isCleared = item.clearance_status === 'CLEARED' || totalDue <= 0;

                  return (
                    <TableRow key={item.student_id} className="hover:bg-muted/30">
                      {/* Student Info */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8 rounded-full border border-border/50 shrink-0">
                            <AvatarFallback className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold text-[11px]">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-xs text-foreground truncate">
                              {fullName}
                            </span>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                              {item.admission_number && (
                                <span className="truncate">Adm: {item.admission_number}</span>
                              )}
                              {item.roll_number && (
                                <span>Roll: {item.roll_number}</span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleCopy(item.student_id, 'Student ID copied')}
                                className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                                title="Copy Student ID"
                              >
                                <Copy className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Terminal Session & Class */}
                      <TableCell>
                        <div className="flex flex-col min-w-0 gap-0.5">
                          <span className="text-xs font-medium text-foreground truncate">
                            {item.graduation_class_name || 'Graduated Class'}
                          </span>
                          <span className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                            <GraduationCap className="w-3 h-3 text-primary" />
                            {item.graduation_academic_year_name || 'Alumni Session'}
                          </span>
                        </div>
                      </TableCell>

                      {/* Total Billed */}
                      <TableCell className="text-right text-xs font-mono">
                        NPR {formatNpr(item.total_billed)}
                      </TableCell>

                      {/* Total Paid */}
                      <TableCell className="text-right text-xs font-mono text-emerald-600 dark:text-emerald-400">
                        NPR {formatNpr(item.total_paid)}
                      </TableCell>

                      {/* Total Due */}
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            'text-xs font-mono font-bold',
                            totalDue > 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-muted-foreground'
                          )}
                        >
                          NPR {formatNpr(totalDue)}
                        </span>
                      </TableCell>

                      {/* Clearance Status Badge */}
                      <TableCell className="text-center">
                        {isCleared ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-semibold gap-1 text-[11px] px-2.5 py-0.5">
                            <CheckCircle2 className="w-3 h-3" />
                            CLEARED
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-semibold gap-1 text-[11px] px-2.5 py-0.5">
                            <Clock className="w-3 h-3" />
                            PENDING CLEARANCE
                          </Badge>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {totalDue > 0 ? (
                            studentForPayment?.student_id === item.student_id && isLedgerLoading ? (
                              <Button
                                size="sm"
                                disabled
                                className="h-8 gap-1.5 text-xs font-medium shadow-2xs bg-amber-600 text-white opacity-85 cursor-wait"
                              >
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Loading...</span>
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => setStudentForPayment(item)}
                                className="h-8 gap-1.5 text-xs font-medium shadow-2xs bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                                title="Collect dues and issue clearance"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>Collect &amp; Settle</span>
                              </Button>
                            )
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setStudentForStatement(item)}
                              className="h-8 gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 shadow-2xs cursor-pointer"
                              title="Print clearance statement"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Clearance Slip</span>
                            </Button>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                              >
                                <span>More</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 text-xs">
                              <DropdownMenuItem
                                onClick={() => setStudentForStatement(item)}
                                className="cursor-pointer gap-2"
                              >
                                <FileText className="w-3.5 h-3.5 text-primary" />
                                <span>View Statement</span>
                              </DropdownMenuItem>

                              {totalDue > 0 && (
                                <DropdownMenuItem
                                  disabled={studentForPayment?.student_id === item.student_id && isLedgerLoading}
                                  onClick={() => setStudentForPayment(item)}
                                  className="cursor-pointer gap-2"
                                >
                                  {studentForPayment?.student_id === item.student_id && isLedgerLoading ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                                  ) : (
                                    <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                                  )}
                                  <span>
                                    {studentForPayment?.student_id === item.student_id && isLedgerLoading
                                      ? 'Loading Ledger...'
                                      : 'Collect & Settle'}
                                  </span>
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSeparator />

                              <DropdownMenuItem asChild className="cursor-pointer gap-2">
                                <Link to="/finance/ledger/$studentId" params={{ studentId: item.student_id }}>
                                  <Receipt className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span>Student Ledger</span>
                                </Link>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => handleCopy(item.student_id, 'Student ID copied')}
                                className="cursor-pointer gap-2"
                              >
                                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>Copy Student ID</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Collect & Settle Modal */}
      {studentForPayment && !isLedgerLoading && unpaidBills.length > 0 && (
        <PaymentCollectDialog
          isOpen={Boolean(studentForPayment && !isLedgerLoading && unpaidBills.length > 0)}
          onClose={() => setStudentForPayment(null)}
          bill={unpaidBills[0] || null}
          isPayAllMode={true}
          totalAccountDue={Number(studentForPayment.total_due || 0)}
          unpaidBills={unpaidBills}
          studentName={getFullName(studentForPayment)}
          className={studentForPayment.graduation_class_name || undefined}
          tenantId={activeTenantId}
          onSubmit={async (data) => recordPaymentMutation.mutateAsync(data)}
          isLoading={recordPaymentMutation.isPending}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {/* Printable Statement / Clearance Slip Modal */}
      {studentForStatement && (
        <PrintableStatementModal
          isOpen={!!studentForStatement}
          onClose={() => setStudentForStatement(null)}
          tenantId={activeTenantId}
          studentId={studentForStatement.student_id}
          studentName={getFullName(studentForStatement)}
          className={studentForStatement.graduation_class_name || undefined}
          academicYearName={studentForStatement.graduation_academic_year_name || undefined}
          bills={activeStudentLedger?.bills || []}
          payments={activeStudentLedger?.payments || []}
          totalBilled={Number(studentForStatement.total_billed || 0)}
          totalPaid={Number(studentForStatement.total_paid || 0)}
          totalDue={Number(studentForStatement.total_due || 0)}
        />
      )}
    </div>
  );
};

export default AlumniClearancePage;
