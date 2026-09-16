import React, { useState } from 'react';
import type { ClassWithDetails, AcademicClass } from '../types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  GraduationCap,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  GitCommit,
  Layers,
  Users,
  Info,
  ArrowUpDown,
} from 'lucide-react';

interface ClassProgressionPipelineProps {
  classes: (ClassWithDetails | AcademicClass)[];
  onSelectClass?: (classId: string) => void;
  onOpenReorder?: () => void;
  className?: string;
  defaultExpanded?: boolean;
}

export const ClassProgressionPipeline: React.FC<ClassProgressionPipelineProps> = ({
  classes,
  onSelectClass,
  onOpenReorder,
  className = '',
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Sort classes strictly by sequence_order ascending
  const sortedClasses = [...classes].sort((a, b) => {
    const seqA = a.sequence_order ?? 0;
    const seqB = b.sequence_order ?? 0;
    if (seqA !== seqB) return seqA - seqB;
    return a.name.localeCompare(b.name);
  });

  if (sortedClasses.length === 0) {
    return null;
  }

  return (
    <Card className={`overflow-hidden border border-border/70 bg-gradient-to-br from-card to-muted/20 shadow-xs ${className}`}>
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
            <GitCommit className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              Academic Progression Chronology
              <Badge variant="outline" className="text-[10px] font-normal py-0 h-4 border-primary/30 text-primary">
                {sortedClasses.length} {sortedClasses.length === 1 ? 'Grade' : 'Grades'}
              </Badge>
            </h3>
            <p className="text-xs text-muted-foreground">
              Sequential order determining student promotion ($N \to N+1$) during annual rollover.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenReorder && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenReorder}
              className="h-8 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Configure Order</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? (
              <>
                <span className="hidden sm:inline">Collapse</span>
                <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                <span className="hidden sm:inline">View Timeline</span>
                <ChevronDown className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Expanded Stepper Pipeline */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          <div className="overflow-x-auto pb-3 pt-1 scrollbar-thin">
            <div className="flex items-center min-w-max gap-2 sm:gap-3">
              {sortedClasses.map((cls, idx) => {
                const isFinal = idx === sortedClasses.length - 1;
                const nextCls = !isFinal ? sortedClasses[idx + 1] : null;
                const withDetails = cls as ClassWithDetails;
                const studentCount = withDetails.students?.length;
                const sectionCount = withDetails.sections?.length;

                return (
                  <React.Fragment key={cls.id}>
                    {/* Grade Node */}
                    <div
                      role={onSelectClass ? 'button' : undefined}
                      tabIndex={onSelectClass ? 0 : undefined}
                      onClick={() => onSelectClass?.(cls.id)}
                      onKeyDown={(e) => {
                        if (onSelectClass && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          onSelectClass(cls.id);
                        }
                      }}
                      className={`group relative flex flex-col justify-between rounded-xl border p-3 min-w-[140px] max-w-[180px] transition-all duration-200 ${
                        onSelectClass
                          ? 'cursor-pointer hover:border-primary hover:shadow-sm hover:scale-[1.02]'
                          : ''
                      } ${
                        isFinal
                          ? 'border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/10'
                          : 'border-border/80 bg-card hover:bg-muted/30'
                      }`}
                    >
                      {/* Top Bar: Sequence badge */}
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            isFinal
                              ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                              : 'bg-primary/10 text-primary'
                          }`}
                        >
                          Step #{cls.sequence_order ?? idx + 1}
                        </span>
                        {isFinal && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-0.5">
                            <GraduationCap className="w-3 h-3" />
                            Final
                          </span>
                        )}
                      </div>

                      {/* Class Name */}
                      <h4 className="font-bold text-sm text-foreground tracking-tight group-hover:text-primary transition-colors truncate">
                        {cls.name}
                      </h4>

                      {/* Counts */}
                      {(studentCount !== undefined || sectionCount !== undefined) && (
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1.5 pt-1.5 border-t border-border/40">
                          {studentCount !== undefined && (
                            <span className="flex items-center gap-0.5" title={`${studentCount} students`}>
                              <Users className="w-3 h-3" />
                              {studentCount}
                            </span>
                          )}
                          {sectionCount !== undefined && (
                            <span className="flex items-center gap-0.5" title={`${sectionCount} sections`}>
                              <Layers className="w-3 h-3" />
                              {sectionCount} sec
                            </span>
                          )}
                        </div>
                      )}

                      {/* Promotion target indicator */}
                      <div className="text-[10px] text-muted-foreground mt-2 font-medium">
                        {isFinal ? (
                          <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-0.5">
                            ➜ Graduating
                          </span>
                        ) : (
                          <span className="truncate block" title={`Promotes to ${nextCls?.name}`}>
                            ➜ {nextCls?.name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Arrow between nodes */}
                    <div className="flex flex-col items-center justify-center px-0.5 text-muted-foreground/60 shrink-0">
                      <ArrowRight className="w-4 h-4 text-primary/70" />
                    </div>
                  </React.Fragment>
                );
              })}

              {/* Terminal Graduation Milestone Node */}
              <div className="flex flex-col justify-between rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-500/10 p-3 min-w-[140px] max-w-[170px]">
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                    Exit
                  </span>
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-emerald-800 dark:text-emerald-300">
                    Graduation
                  </h4>
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5 leading-tight">
                    Final grade cohort receives GRADUATED status.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Educational Note */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 px-3 py-2 rounded-lg border border-border/50">
            <Info className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>
              <strong>How this works:</strong> Non-standard classes (e.g. PG, Nursery, LKG, UKG) advance sequentially based on their step number. When a rollover executes, students move from Step #N into Step #(N+1), preserving section names.
            </span>
          </div>
        </div>
      )}
    </Card>
  );
};
