import React, { useState } from 'react';
import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import { useAcademicYearStatus } from '../hooks';
import type { AcademicYearStatusResponse } from '../types';
import { QuickAcademicYearTransitionDialog } from './QuickAcademicYearTransitionDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarClock, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function shouldShowBanner(
  status?: AcademicYearStatusResponse | null,
  canManage?: boolean
): boolean {
  if (!canManage) return false;
  if (!status) return false;
  return Boolean(status.is_expired && status.next_year);
}

export interface AcademicYearExpiryBannerProps {
  tenantId?: string;
  className?: string;
}

export const AcademicYearExpiryBanner: React.FC<AcademicYearExpiryBannerProps> = ({
  tenantId,
  className,
}) => {
  const { activeTenantId } = useAuth();
  const { isAdmin, isOfficeAdmin, isSuperAdmin, can } = usePermission();

  const effectiveTenantId = tenantId || activeTenantId || null;
  const canManage = Boolean(
    isAdmin || isOfficeAdmin || isSuperAdmin || can('MANAGE_TENANT_SETTINGS')
  );

  const { data: status, isLoading } = useAcademicYearStatus(effectiveTenantId);
  const [isTransitionDialogOpen, setIsTransitionDialogOpen] = useState<boolean>(false);

  if (isLoading || !effectiveTenantId || !shouldShowBanner(status, canManage) || !status?.next_year) {
    return null;
  }

  return (
    <>
      <aside
        role="alert"
        aria-live="polite"
        className={cn(
          'relative rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-950 dark:text-amber-100 shadow-xs transition-all',
          className
        )}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-300 shrink-0 mt-0.5 sm:mt-0">
              <CalendarClock className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm sm:text-base font-bold text-amber-950 dark:text-amber-100">
                  Academic Session Expired
                </span>
                <Badge
                  variant="outline"
                  className="border-amber-500/40 bg-amber-500/20 text-amber-800 dark:text-amber-200 text-[11px] font-semibold px-2 py-0.5"
                >
                  Action Required
                </Badge>
                {status.eligible_students_count > 0 && (
                  <Badge
                    variant="outline"
                    className="hidden md:inline-flex border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-[11px] px-2 py-0.5"
                  >
                    {status.eligible_students_count} Students Eligible
                  </Badge>
                )}
              </div>
              <p className="text-xs sm:text-sm text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
                The active academic session{' '}
                <span className="font-semibold text-foreground">
                  "{status.current_year?.name || 'Current Session'}"
                </span>{' '}
                ended{status.days_since_ended > 0 ? ` ${status.days_since_ended} day${status.days_since_ended === 1 ? '' : 's'} ago` : ' recently'}.
                Ready to transition into{' '}
                <span className="font-semibold text-foreground">"{status.next_year.name}"</span>?
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-stretch sm:self-auto">
            <Button
              type="button"
              onClick={() => setIsTransitionDialogOpen(true)}
              className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-600 dark:hover:bg-amber-700 font-semibold shadow-xs"
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Transition to {status.next_year.name}
            </Button>
          </div>
        </div>
      </aside>

      <QuickAcademicYearTransitionDialog
        open={isTransitionDialogOpen}
        onOpenChange={setIsTransitionDialogOpen}
        tenantId={effectiveTenantId}
        statusData={status}
      />
    </>
  );
};
