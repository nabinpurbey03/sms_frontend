import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Layers, CheckCircle2, Lock, AlertCircle } from 'lucide-react';
import { useSectionEligibility } from '../hooks';
import type { AcademicClass } from '../types';

interface SectionAddDialogProps {
  cls: AcademicClass | null;
  tenantId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (classId: string) => Promise<any>;
  isLoading: boolean;
}

export const SectionAddDialog: React.FC<SectionAddDialogProps> = ({
  cls,
  tenantId,
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}) => {
  const { data: eligibility, isLoading: isChecking } = useSectionEligibility(
    tenantId,
    cls ? cls.id : null
  );

  if (!cls) return null;

  const handleConfirm = async () => {
    await onConfirm(cls.id);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-1">
            <Layers className="w-5 h-5" />
          </div>
          <DialogTitle className="text-lg font-bold">Add Next Section to {cls.name}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Evaluate capacity and sequentially expand this class according to the 20-student policy.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {isChecking ? (
            <div className="p-6 text-center text-xs text-muted-foreground animate-pulse space-y-2">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
              <p>Evaluating section student capacity...</p>
            </div>
          ) : eligibility?.can_add ? (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-2">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Expansion Eligible!</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The previous section has met or exceeded the 20-student threshold. Provisioning will create{' '}
                  <strong className="text-foreground">Section {eligibility.next_section_name}</strong>.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/40 border border-border/50 text-xs flex justify-between items-center">
                <span className="text-muted-foreground">New Section Designation:</span>
                <span className="font-bold text-foreground text-sm">
                  Section {eligibility.next_section_name}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-2">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-sm">
                  <Lock className="w-5 h-5" />
                  <span>Section Locked</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {eligibility?.reason ||
                    'The previous section must have at least 20 active students before a new section can be created.'}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30 border border-border/40 text-[11px] text-muted-foreground flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <span>
                  Enroll additional students into the current section to reach 20 students. The next sequential section will then automatically become available.
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="text-xs"
          >
            Cancel
          </Button>
          {eligibility?.can_add && (
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={isLoading || isChecking}
              className="text-xs gap-1.5"
            >
              {isLoading
                ? 'Creating...'
                : `Create Section ${eligibility.next_section_name}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
