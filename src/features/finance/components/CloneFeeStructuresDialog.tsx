import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  CopyPlus,
  Loader2,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  School,
  GraduationCap,
  Users,
  Sparkles,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAcademicYears } from '@/features/academic-year/hooks/useAcademicYears';
import { useCloneFeeStructures, calculateAdjustedAmount } from '../hooks';
import {
  PERCENTAGE_PRESETS,
  ROUNDING_OPTIONS,
  filterAndSortCandidateAcademicYears,
  formatCloneSampleText,
  isCloneScopeValid,
} from '../utils/feeCloneUtils';

export interface CloneFeeStructuresDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string | null;
  currentYearId?: string;
  onSuccess?: () => void;
}

export const CloneFeeStructuresDialog: React.FC<CloneFeeStructuresDialogProps> = ({
  isOpen,
  onClose,
  tenantId,
  currentYearId,
  onSuccess,
}) => {
  const { data: academicYears = [], isLoading: isLoadingYears } = useAcademicYears(tenantId);
  const cloneMutation = useCloneFeeStructures(tenantId);

  // Filter out currentYearId, sort descending
  const candidateYears = useMemo(() => {
    return filterAndSortCandidateAcademicYears(academicYears, currentYearId);
  }, [academicYears, currentYearId]);

  // Form State
  const [sourceYearId, setSourceYearId] = useState<string>('');
  const [percentageIncrease, setPercentageIncrease] = useState<number>(0);
  const [roundToNearest, setRoundToNearest] = useState<number>(10);
  const [includeSchoolFees, setIncludeSchoolFees] = useState<boolean>(true);
  const [includeClassFees, setIncludeClassFees] = useState<boolean>(true);
  const [includeStudentPresets, setIncludeStudentPresets] = useState<boolean>(true);

  // Initialize / Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setPercentageIncrease(0);
      setRoundToNearest(10);
      setIncludeSchoolFees(true);
      setIncludeClassFees(true);
      setIncludeStudentPresets(true);
    }
  }, [isOpen]);

  // Set default source academic year to the immediately preceding one
  useEffect(() => {
    if (isOpen && candidateYears.length > 0) {
      if (!sourceYearId || !candidateYears.some((y) => y.id === sourceYearId)) {
        setSourceYearId(candidateYears[0].id);
      }
    }
  }, [isOpen, candidateYears, sourceYearId]);

  const hasCandidateYears = candidateYears.length > 0;
  const isScopeValid = isCloneScopeValid({
    includeSchoolFees,
    includeClassFees,
    includeStudentPresets,
  });

  const sampleAdjusted = useMemo(() => {
    return calculateAdjustedAmount(1000, percentageIncrease, roundToNearest);
  }, [percentageIncrease, roundToNearest]);

  const sampleText = useMemo(() => {
    return formatCloneSampleText(1000, percentageIncrease, roundToNearest);
  }, [percentageIncrease, roundToNearest]);

  const handleClone = async () => {
    if (!sourceYearId || !isScopeValid) return;

    try {
      await cloneMutation.mutateAsync({
        source_academic_year_id: sourceYearId,
        target_academic_year_id: currentYearId,
        percentage_increase: percentageIncrease,
        round_to_nearest: roundToNearest,
        include_school_fees: includeSchoolFees,
        include_class_fees: includeClassFees,
        include_student_presets: includeStudentPresets,
      });

      onSuccess?.();
      onClose();
    } catch {
      // Toast notification is handled by useCloneFeeStructures hook
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
              <CopyPlus className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Clone Fee Structures from Previous Session
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Replicate fee schedules and student presets into the current session with optional inflation adjustments.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isLoadingYears ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-xs">Loading academic sessions...</span>
          </div>
        ) : !hasCandidateYears ? (
          <div className="py-8 px-4 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <AlertCircle className="w-6 h-6 text-amber-500" />
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-foreground text-sm">
                No previous academic session found
              </h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No previous academic session found to clone fee structures from. You can create new fee structures manually for this session.
              </p>
            </div>
            <DialogFooter className="mt-4 sm:justify-center">
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {/* 1. Source Academic Year Selector */}
            <div className="space-y-2">
              <Label htmlFor="source-year-select" className="text-xs font-semibold text-foreground">
                Source Academic Session <span className="text-destructive">*</span>
              </Label>
              <Select value={sourceYearId} onValueChange={setSourceYearId}>
                <SelectTrigger id="source-year-select" className="w-full h-10 text-xs">
                  <SelectValue placeholder="Select previous academic year..." />
                </SelectTrigger>
                <SelectContent>
                  {candidateYears.map((year) => (
                    <SelectItem key={year.id} value={year.id} className="text-xs">
                      <div className="flex items-center justify-between gap-3 w-full">
                        <span className="font-medium">{year.name}</span>
                        {year.is_current && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 ml-2">
                            Current
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Fee heads and presets will be read from this session.
              </p>
            </div>

            {/* 2. Percentage Adjustment / Hike */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="percentage-input" className="text-xs font-semibold text-foreground">
                  Percentage Adjustment / Hike (%)
                </Label>
                <span className="text-[11px] text-muted-foreground">e.g. 5 for +5%, -5 for -5%</span>
              </div>
              <div className="relative">
                <Input
                  id="percentage-input"
                  type="number"
                  step="0.5"
                  value={percentageIncrease}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setPercentageIncrease(isNaN(val) ? 0 : val);
                  }}
                  className="pr-8 h-9 text-xs"
                  placeholder="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground pointer-events-none">
                  %
                </span>
              </div>

              {/* Quick Adjustment Pill Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground mr-1">Quick Select:</span>
                {PERCENTAGE_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setPercentageIncrease(preset.value)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer',
                      percentageIncrease === preset.value
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs dark:bg-purple-600 dark:border-purple-600'
                        : 'bg-muted/50 text-muted-foreground border-border/60 hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Rounding Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">Rounding Rule</Label>
                <span className="text-[11px] text-muted-foreground">Applied after percentage calculation</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {ROUNDING_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRoundToNearest(opt.value)}
                    className={cn(
                      'p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1',
                      roundToNearest === opt.value
                        ? 'border-purple-500 bg-purple-500/10 text-purple-950 dark:text-purple-100 font-semibold shadow-xs ring-1 ring-purple-500/30'
                        : 'border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                    )}
                  >
                    <div className="text-xs font-semibold text-foreground">{opt.label}</div>
                    <div className="text-[10px] text-muted-foreground line-clamp-1">{opt.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Scope Checkboxes */}
            <div className="space-y-2.5">
              <Label className="text-xs font-semibold text-foreground">Scope to Clone</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <label
                  htmlFor="include-school-fees"
                  className={cn(
                    'flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all',
                    includeSchoolFees
                      ? 'border-purple-300 dark:border-purple-800 bg-purple-50/40 dark:bg-purple-950/20'
                      : 'border-border/60 bg-background hover:bg-muted/30 opacity-70'
                  )}
                >
                  <Checkbox
                    id="include-school-fees"
                    checked={includeSchoolFees}
                    onCheckedChange={(c) => setIncludeSchoolFees(!!c)}
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <School className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                      <span>School Fees</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">General campus fees</p>
                  </div>
                </label>

                <label
                  htmlFor="include-class-fees"
                  className={cn(
                    'flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all',
                    includeClassFees
                      ? 'border-purple-300 dark:border-purple-800 bg-purple-50/40 dark:bg-purple-950/20'
                      : 'border-border/60 bg-background hover:bg-muted/30 opacity-70'
                  )}
                >
                  <Checkbox
                    id="include-class-fees"
                    checked={includeClassFees}
                    onCheckedChange={(c) => setIncludeClassFees(!!c)}
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <GraduationCap className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                      <span>Class Fees</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Grade schedules</p>
                  </div>
                </label>

                <label
                  htmlFor="include-student-presets"
                  className={cn(
                    'flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all',
                    includeStudentPresets
                      ? 'border-purple-300 dark:border-purple-800 bg-purple-50/40 dark:bg-purple-950/20'
                      : 'border-border/60 bg-background hover:bg-muted/30 opacity-70'
                  )}
                >
                  <Checkbox
                    id="include-student-presets"
                    checked={includeStudentPresets}
                    onCheckedChange={(c) => setIncludeStudentPresets(!!c)}
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <Users className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                      <span>Student Presets</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Transport &amp; facilities</p>
                  </div>
                </label>
              </div>

              {!isScopeValid && (
                <p className="text-[11px] text-destructive flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" />
                  Please select at least one fee scope to clone.
                </p>
              )}
            </div>

            {/* 5. Interactive Preview & Safety Card */}
            <div className="rounded-xl border border-primary/20 bg-primary/[0.03] dark:bg-primary/[0.06] p-3.5 space-y-3">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-foreground">
                  <span className="font-semibold text-foreground">Safe Preservation:</span> Existing fee heads in the current session will be safely preserved and not overwritten.
                </div>
              </div>

              <div className="rounded-lg bg-background border border-border/60 p-2.5 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                  <span>Interactive Sample Preview:</span>
                </div>
                <div className="flex items-center gap-2 font-mono shrink-0">
                  <span className="line-through text-muted-foreground text-[11px]">NPR 1,000</span>
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  <Badge variant="secondary" className="font-semibold text-primary">
                    NPR {sampleAdjusted.toLocaleString()}
                  </Badge>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground italic">
                {sampleText}
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={cloneMutation.isPending}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleClone}
                disabled={!sourceYearId || !isScopeValid || cloneMutation.isPending}
                className="gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
              >
                {cloneMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Cloning Fee Structures...</span>
                  </>
                ) : (
                  <>
                    <CopyPlus className="w-4 h-4" />
                    <span>Clone Fee Structures</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
