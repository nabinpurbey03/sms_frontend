import React, { useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  UserX,
  BookOpen,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePermission } from '@/auth/usePermission';
import { useAuth } from '@/auth/useAuth';
import { useStaffingStatus } from '@/features/academic/hooks';

interface StaffingReadinessBannerProps {
  tenantId: string | null;
  academicYearId?: string | null;
}

export const StaffingReadinessBanner: React.FC<StaffingReadinessBannerProps> = ({
  tenantId,
  academicYearId,
}) => {
  const { activeRole } = useAuth();
  const { can, isSuperAdmin } = usePermission();
  const [isDismissed, setIsDismissed] = useState(false);

  const canManageTeachers =
    activeRole === 'ADMIN' ||
    activeRole === 'OFFICE_ADMIN' ||
    can('ASSIGN_TEACHERS') ||
    isSuperAdmin;

  const { data: staffing, isLoading } = useStaffingStatus(
    canManageTeachers ? tenantId : null,
    academicYearId
  );

  if (!canManageTeachers || !tenantId || isLoading || !staffing || isDismissed) {
    return null;
  }

  // State 1: Gaps detected (Action Required)
  if (!staffing.is_fully_staffed) {
    const { missing_class_teachers_count, missing_subject_teachers_count } =
      staffing.summary;

    return (
      <div className="relative overflow-hidden rounded-xl border border-amber-500/40 bg-amber-500/10 dark:bg-amber-950/20 p-4 shadow-xs transition-all">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-amber-500/20 p-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Staffing Action Required
                </h4>
                <Badge
                  variant="outline"
                  className="border-amber-500/40 text-amber-800 dark:text-amber-300 bg-amber-500/10 text-[10px] font-medium"
                >
                  Unassigned Slots
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-amber-800/90 dark:text-amber-300/80">
                Vacant teaching positions detected in current session. Classes and examinations require assigned educators.
              </p>

              {/* Breakdown Tags */}
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {missing_class_teachers_count > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-900 dark:text-amber-200">
                    <UserX className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
                    {missing_class_teachers_count} Section{missing_class_teachers_count > 1 ? 's' : ''} Missing Class Teacher
                  </span>
                )}
                {missing_subject_teachers_count > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-900 dark:text-amber-200">
                    <BookOpen className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
                    {missing_subject_teachers_count} Subject{missing_subject_teachers_count > 1 ? 's' : ''} Unassigned
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <Button
              asChild
              size="sm"
              className="h-8 gap-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-600 dark:hover:bg-amber-500 shadow-xs"
            >
              <Link
                to="/academic/assignments"
                search={{ filter: 'unassigned' }}
              >
                <span>Review & Assign</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDismissed(true)}
              className="h-8 w-8 text-amber-800/70 dark:text-amber-400 hover:text-amber-950 dark:hover:text-amber-100 hover:bg-amber-500/20"
              title="Dismiss for this session"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // State 2: 100% Staffed (Subtle confirmation for admins)
  if (staffing.is_fully_staffed && staffing.summary.total_sections > 0) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 px-3.5 py-2.5 text-xs text-emerald-800 dark:text-emerald-300">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="font-medium">
            Teaching staff fully assigned across all {staffing.summary.total_sections} sections and {staffing.summary.total_subject_slots} subject slots.
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-100 ml-2"
          aria-label="Dismiss banner"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return null;
};
