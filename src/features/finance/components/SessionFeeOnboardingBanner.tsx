import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface SessionFeeOnboardingBannerProps {
  currentSessionName: string;
  hasPreviousSessions: boolean;
  latestPreviousYearName?: string;
  onOpenCloneDialog: () => void;
  onAddFeeStructure: () => void;
  className?: string;
}

export const SessionFeeOnboardingBanner: React.FC<SessionFeeOnboardingBannerProps> = ({
  currentSessionName,
  hasPreviousSessions,
  latestPreviousYearName,
  onOpenCloneDialog,
  onAddFeeStructure,
  className,
}) => {
  const previousYearLabel = latestPreviousYearName || 'previous session';

  return (
    <div
      className={cn(
        'bg-gradient-to-r from-indigo-50/80 via-sky-50/50 to-background dark:from-indigo-950/25 dark:via-sky-950/15 dark:to-card border border-indigo-100/80 dark:border-indigo-900/40 rounded-xl p-5 shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4',
        className
      )}
    >
      <div className="flex items-start sm:items-center gap-3.5">
        <div className="h-10 w-10 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h4 className="font-semibold text-foreground text-base tracking-tight">
            Set up fee structures for {currentSessionName}
          </h4>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5 max-w-2xl leading-relaxed">
            {hasPreviousSessions
              ? `No fee structures exist for this academic session yet. You can clone fee structures and rules from ${previousYearLabel} with 1-click (including custom percentage increases), or configure them manually.`
              : 'No fee structures exist for this academic session yet. Get started by creating your school-level or class-level fee structures.'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 shrink-0">
        {hasPreviousSessions ? (
          <>
            <Button
              onClick={onOpenCloneDialog}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs gap-1.5"
            >
              <Sparkles className="h-4 w-4" />
              <span>Clone from {previousYearLabel}</span>
              <ArrowRight className="h-4 w-4 ml-0.5" />
            </Button>
            <Button
              variant="outline"
              onClick={onAddFeeStructure}
              className="border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
            >
              + Create Manually
            </Button>
          </>
        ) : (
          <Button
            onClick={onAddFeeStructure}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
          >
            + Add Fee Structure
          </Button>
        )}
      </div>
    </div>
  );
};
