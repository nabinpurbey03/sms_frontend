import React from 'react';
import { useAuth } from '@/auth/useAuth';
import { useParentChildrenFees } from '../hooks';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/common/EmptyState';
import { TenantRequiredState } from '@/components/common/TenantRequiredState';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Coins,
  Receipt,
  User,
  GraduationCap,
  Calendar,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import type { FeeBill } from '../types';
import { useCalendarPreferenceStore } from '@/stores/calendarPreferenceStore';
import { formatDualDate } from '@/features/school-settings/utils/nepaliDate';

export const ParentFeeStatusPage: React.FC = () => {
  const { activeTenantId } = useAuth();
  const { calendarSystem } = useCalendarPreferenceStore();
  const {
    data: childrenFees = [],
    isLoading,
    isError,
  } = useParentChildrenFees(activeTenantId);

  if (!activeTenantId) {
    return <TenantRequiredState featureName="children fee status" />;
  }

  // Summary Metrics across all linked children
  const totalPayable = childrenFees.reduce(
    (sum, c) => sum + (Number(c.total_payable) || 0),
    0
  );
  const totalPaid = childrenFees.reduce(
    (sum, c) => sum + (Number(c.total_paid) || 0),
    0
  );
  const totalDue = childrenFees.reduce(
    (sum, c) => sum + (Number(c.outstanding_due) || 0),
    0
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-medium text-[10px]">
            Paid
          </Badge>
        );
      case 'PARTIAL':
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-medium text-[10px]">
            Partially Paid
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge variant="secondary" className="font-medium text-[10px]">
            Cancelled
          </Badge>
        );
      case 'UNPAID':
      default:
        return (
          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 font-medium text-[10px]">
            Unpaid
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Coins className="w-6 h-6 text-primary" />
            Fee Status & Invoices
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            View billing history, payment clearance, and outstanding fee dues for your enrolled children.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1 text-xs font-semibold gap-1.5 border-primary/30 text-primary bg-primary/5">
            <Receipt className="w-3.5 h-3.5" />
            <span>Parent Portal (Read-Only)</span>
          </Badge>
        </div>
      </div>

      {/* Top Combined KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Billed"
          value={`NPR ${totalPayable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={Coins}
          description="Total payable across all children"
          variant="default"
          loading={isLoading}
        />
        <StatCard
          title="Total Paid"
          value={`NPR ${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={CheckCircle2}
          description="Total cleared payments"
          variant="emerald"
          loading={isLoading}
        />
        <StatCard
          title="Outstanding Due"
          value={`NPR ${totalDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={AlertCircle}
          description="Total balance to be paid at school"
          variant={totalDue > 0 ? 'amber' : 'blue'}
          loading={isLoading}
        />
      </div>

      {/* Error state */}
      {isError && (
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs">
          Failed to load fee information. Please try again later or contact the school office.
        </div>
      )}

      {/* Children list */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="p-6 space-y-4 animate-pulse">
              <div className="h-6 w-48 bg-muted rounded-md" />
              <div className="h-20 bg-muted/40 rounded-lg" />
            </Card>
          ))}
        </div>
      ) : childrenFees.length === 0 ? (
        <EmptyState
          icon={User}
          title="No Children Linked"
          description="No students are currently linked to your parent account in this school session. Please contact the school administration to link your child."
        />
      ) : (
        <div className="space-y-6">
          {childrenFees.map((child) => {
            const payable = Number(child.total_payable) || 0;
            const paid = Number(child.total_paid) || 0;
            const due = Number(child.outstanding_due) || 0;

            return (
              <Card
                key={child.student_id}
                className="overflow-hidden border border-border/60 shadow-xs rounded-2xl bg-card"
              >
                {/* Child Header Card */}
                <div className="p-4 sm:p-5 border-b border-border/40 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-base shrink-0">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base sm:text-lg font-bold text-foreground">
                          {child.student_name}
                        </h2>
                        <Badge variant="outline" className="text-[11px] font-medium">
                          {child.class_name} {child.section_name ? `• Sec ${child.section_name}` : ''}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Enrolled Student Roster
                      </p>
                    </div>
                  </div>

                  {/* Child Balance Metrics */}
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-mono">
                    <div className="px-3 py-1.5 rounded-lg bg-card border border-border/50">
                      <span className="text-muted-foreground block text-[10px] font-sans uppercase">Total Billed</span>
                      <span className="font-bold text-foreground">
                        NPR {payable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                      <span className="block text-[10px] font-sans uppercase opacity-80">Paid</span>
                      <span className="font-bold">
                        NPR {paid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div
                      className={`px-3 py-1.5 rounded-lg border font-bold ${
                        due > 0
                          ? 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300'
                          : 'bg-muted/40 border-border text-muted-foreground'
                      }`}
                    >
                      <span className="block text-[10px] font-sans uppercase opacity-80">Due Balance</span>
                      <span>
                        NPR {due.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Child Bills Table */}
                <div className="p-4 sm:p-5 space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5" />
                    Billing Statements & Vouchers
                  </h3>

                  {child.bills.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground bg-muted/10 rounded-xl border border-dashed border-border/50">
                      No invoices have been issued for {child.student_name} yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-border/50">
                      <Table>
                        <TableHeader className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                          <TableRow>
                            <TableHead className="py-2.5 px-3">Bill Number</TableHead>
                            <TableHead className="py-2.5 px-3">Title / Month</TableHead>
                            <TableHead className="py-2.5 px-3">Due Date</TableHead>
                            <TableHead className="py-2.5 px-3 text-right">Payable</TableHead>
                            <TableHead className="py-2.5 px-3 text-right">Paid</TableHead>
                            <TableHead className="py-2.5 px-3 text-right">Balance</TableHead>
                            <TableHead className="py-2.5 px-3 text-center">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-border/40 text-xs">
                          {child.bills.map((bill: FeeBill) => {
                            const bPayable = Number(bill.total_payable) || 0;
                            const bPaid = Number(bill.paid_amount) || 0;
                            const bDue = Number(bill.due_amount) || 0;

                            return (
                              <TableRow key={bill.id} className="hover:bg-muted/20">
                                <TableCell className="py-2.5 px-3 font-mono font-medium text-foreground">
                                  {bill.bill_number}
                                </TableCell>
                                <TableCell className="py-2.5 px-3">
                                  <div className="font-semibold text-foreground">{bill.bill_title}</div>
                                  <div className="text-[11px] text-muted-foreground">
                                    {bill.billing_month || 'Standard Period'}
                                  </div>
                                </TableCell>
                                <TableCell className="py-2.5 px-3 text-muted-foreground flex items-center gap-1 mt-1 sm:mt-0">
                                  <Calendar className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                                  <span className="whitespace-nowrap">{formatDualDate(bill.due_date, calendarSystem)}</span>
                                </TableCell>
                                <TableCell className="py-2.5 px-3 text-right font-mono font-medium text-foreground">
                                  NPR {bPayable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                                  NPR {bPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                                  NPR {bDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="py-2.5 px-3 text-center">
                                  {getStatusBadge(bill.status)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
