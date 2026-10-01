import React, { useMemo } from 'react';
import {
  Coins,
  Users,
  Bus,
  Percent,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ClassWithDetails } from '@/features/academic/types';
import type { FeeStructure, StudentDiscount } from '../types';

export interface ClassFeeCardProps {
  cls: ClassWithDetails;
  feeStructures: FeeStructure[];
  discounts: StudentDiscount[];
  onManageFee: (classId: string) => void;
  onAddFeeHead: (classId: string) => void;
}

export const ClassFeeCard: React.FC<ClassFeeCardProps> = ({
  cls,
  feeStructures,
  discounts,
  onManageFee,
  onAddFeeHead,
}) => {
  const sections = cls.sections || [];
  const students = cls.students || [];
  const totalStudents = students.length;
  const sectionNames =
    sections.length > 0 ? sections.map((s) => s.name).join(', ') : 'None';

  // Filter active fee structures for this class
  const activeFeeStructures = useMemo(
    () => feeStructures.filter((f) => f.is_active && (f.class_id === cls.id || !f.class_id)),
    [feeStructures, cls.id]
  );

  // Base monthly tuition sum (monthly billing frequency)
  const monthlyTuitionSum = useMemo(() => {
    return activeFeeStructures
      .filter((f) => f.frequency === 'MONTHLY')
      .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  }, [activeFeeStructures]);

  // Identify matching discounts for this class's students
  const classDiscounts = useMemo(() => {
    const studentIds = new Set(students.map((s) => s.id));
    if (studentIds.size === 0) return [];
    return discounts.filter((d) => d.is_active && studentIds.has(d.student_id));
  }, [students, discounts]);

  // Students on transport
  const transportCount = useMemo(() => {
    return classDiscounts.filter((d) => Boolean(d.is_transport_applicable)).length;
  }, [classDiscounts]);

  // Students with scholarship/concession percentage > 0
  const scholarshipCount = useMemo(() => {
    return classDiscounts.filter((d) => Number(d.discount_percent || 0) > 0).length;
  }, [classDiscounts]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onManageFee(cls.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onManageFee(cls.id);
        }
      }}
      className="group flex flex-col justify-between rounded-xl border border-border/70 bg-card p-5 shadow-xs hover:shadow-md hover:border-primary/50 transition-all duration-200 cursor-pointer text-left"
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                <Coins className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-base text-foreground tracking-tight group-hover:text-primary transition-colors flex items-center gap-1.5">
                <span>{cls.name}</span>
                <ArrowRight className="w-4 h-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary shrink-0" />
              </h3>
              {cls.sequence_order !== undefined && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-muted border border-border/70 text-muted-foreground shrink-0">
                  Grade {cls.sequence_order}
                </span>
              )}
            </div>

            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-2 flex-wrap">
              <span>Sections: {sectionNames}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {totalStudents} {totalStudents === 1 ? 'Student' : 'Students'}
              </span>
            </p>
          </div>
        </div>

        {/* Fee Configuration Summary */}
        <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 space-y-1.5 group-hover:border-primary/20 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Base Monthly Tuition
            </span>
            <Badge
              variant={activeFeeStructures.length > 0 ? 'outline' : 'secondary'}
              className="text-[10px] font-medium px-2 py-0.5 border-border/70 bg-background"
            >
              {activeFeeStructures.length}{' '}
              {activeFeeStructures.length === 1 ? 'Fee Head' : 'Fee Heads'}
            </Badge>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold font-mono text-foreground tracking-tight">
              NPR{' '}
              {monthlyTuitionSum.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="text-xs text-muted-foreground font-normal">/ mo</span>
          </div>
        </div>

        {/* Concession & Transport Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
              transportCount > 0
                ? 'bg-sky-500/10 border-sky-500/20 text-sky-700 dark:text-sky-300'
                : 'bg-muted/40 border-border/50 text-muted-foreground'
            }`}
          >
            <Bus className="w-3.5 h-3.5 shrink-0" />
            <span>{transportCount} on Transport</span>
          </div>

          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
              scholarshipCount > 0
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300'
                : 'bg-muted/40 border-border/50 text-muted-foreground'
            }`}
          >
            <Percent className="w-3.5 h-3.5 shrink-0" />
            <span>{scholarshipCount} with Concession</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div
        className="pt-3 mt-4 border-t border-border/50 flex items-center justify-between gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            onAddFeeHead(cls.id);
          }}
          className="text-xs gap-1.5 h-8 border-border/80 hover:bg-muted cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Fee Head</span>
        </Button>

        <Button
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onManageFee(cls.id);
          }}
          className="text-xs gap-1.5 h-8 font-medium group/btn cursor-pointer"
        >
          <span>Manage Fee Structure</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5" />
        </Button>
      </div>
    </div>
  );
};
