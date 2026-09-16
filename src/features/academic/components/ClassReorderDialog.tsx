import React, { useState, useEffect } from 'react';
import type { ClassWithDetails, AcademicClass } from '../types';
import { useReorderClasses } from '../hooks';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  GraduationCap,
  Loader2,
  Info,
  RotateCcw,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';

interface ClassReorderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  classes: (ClassWithDetails | AcademicClass)[];
  tenantId: string;
}

export const ClassReorderDialog: React.FC<ClassReorderDialogProps> = ({
  isOpen,
  onClose,
  classes,
  tenantId,
}) => {
  const reorderMutation = useReorderClasses();
  const [items, setItems] = useState<(ClassWithDetails | AcademicClass)[]>([]);

  // Initialize ordered list whenever dialog opens or classes change
  useEffect(() => {
    if (isOpen) {
      const sorted = [...classes].sort((a, b) => {
        const seqA = a.sequence_order ?? 0;
        const seqB = b.sequence_order ?? 0;
        if (seqA !== seqB) return seqA - seqB;
        return a.name.localeCompare(b.name);
      });
      setItems(sorted);
    }
  }, [isOpen, classes]);

  const moveUp = (index: number) => {
    if (index <= 0) return;
    setItems((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const moveDown = (index: number) => {
    if (index >= items.length - 1) return;
    setItems((prev) => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const handleReset = () => {
    const sorted = [...classes].sort((a, b) => {
      const seqA = a.sequence_order ?? 0;
      const seqB = b.sequence_order ?? 0;
      if (seqA !== seqB) return seqA - seqB;
      return a.name.localeCompare(b.name);
    });
    setItems(sorted);
  };

  const hasChanged = items.some((item, idx) => {
    const orig = classes[idx];
    return !orig || orig.id !== item.id;
  });

  const handleSave = async () => {
    if (!tenantId || items.length === 0) return;
    try {
      await reorderMutation.mutateAsync({
        tenantId,
        data: {
          class_ids: items.map((c) => c.id),
        },
      });
      onClose();
    } catch {
      // Error handled by hook toast
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ArrowUpDown className="w-5 h-5 text-primary" />
            Configure Class Progression Sequence
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Adjust the chronological order of classes. During an academic year rollover, students in Step #N promote to Step #(N+1), while the final step graduates.
          </DialogDescription>
        </DialogHeader>

        {/* Live Preview Strip */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-1.5">
          <p className="text-[11px] font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Live Progression Preview
          </p>
          <div className="overflow-x-auto pb-1 scrollbar-thin">
            <div className="flex items-center min-w-max gap-1.5 text-xs">
              {items.map((item, idx) => (
                <React.Fragment key={item.id}>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-card border border-border/70 font-semibold text-foreground shadow-2xs">
                    <span className="text-[10px] text-muted-foreground font-normal">#{idx + 1}</span>
                    {item.name}
                  </span>
                  <ArrowRight className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                </React.Fragment>
              ))}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 font-semibold text-emerald-700 dark:text-emerald-300">
                <GraduationCap className="w-3.5 h-3.5" />
                Graduation
              </span>
            </div>
          </div>
        </div>

        {/* Reorderable Items List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[360px] scrollbar-thin">
          {items.map((item, index) => {
            const isFirst = index === 0;
            const isLast = index === items.length - 1;
            const withDetails = item as ClassWithDetails;

            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg border border-border/70 bg-card hover:bg-muted/30 transition-colors gap-3"
              >
                {/* Left: Step Badge & Class Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-7 h-7 rounded-md bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-xs font-bold shrink-0">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-foreground truncate">{item.name}</span>
                      {isLast && (
                        <Badge variant="outline" className="text-[10px] py-0 h-4 border-amber-500/30 text-amber-600 bg-amber-500/5">
                          Graduating Grade
                        </Badge>
                      )}
                    </div>
                    {(withDetails.students !== undefined || withDetails.sections !== undefined) && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                        {withDetails.students !== undefined && (
                          <span>{withDetails.students.length} students</span>
                        )}
                        {withDetails.sections !== undefined && (
                          <>
                            <span>·</span>
                            <span>{withDetails.sections.length} sections</span>
                          </>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Up / Down Action Controls */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => moveUp(index)}
                    disabled={isFirst}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    title="Move Up"
                  >
                    <ArrowUp className="w-4 h-4" />
                    <span className="sr-only">Move Up</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => moveDown(index)}
                    disabled={isLast}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    title="Move Down"
                  >
                    <ArrowDown className="w-4 h-4" />
                    <span className="sr-only">Move Down</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Informational Guidance */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/50">
          <Info className="w-4 h-4 text-primary shrink-0" />
          <span>
            Reordering defines the path for future promotions. Current students remain in their assigned classes until a rollover is executed.
          </span>
        </div>

        {/* Footer */}
        <DialogFooter className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-border/50">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={!hasChanged || reorderMutation.isPending}
            className="text-xs text-muted-foreground hover:text-foreground gap-1.5 h-9"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Order
          </Button>
          <div className="flex items-center gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={reorderMutation.isPending}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={!hasChanged || reorderMutation.isPending}
              className="text-xs h-9 gap-1.5 bg-primary text-primary-foreground font-semibold"
            >
              {reorderMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Save Sequence
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
