import React, { useMemo } from 'react';
import type { AcademicClass, ClassWithDetails } from '../types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  GitCommit,
  GraduationCap,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ClassProgressionNavigatorProps {
  classes: (AcademicClass | ClassWithDetails)[];
  currentClassId: string;
  onSelectClass: (classId: string) => void;
  isTeacherOnly?: boolean;
  assignedClassIds?: Set<string>;
  className?: string;
}

export const ClassProgressionNavigator: React.FC<ClassProgressionNavigatorProps> = ({
  classes,
  currentClassId,
  onSelectClass,
  isTeacherOnly,
  assignedClassIds,
  className,
}) => {
  // 1. Sorting: Sort classes strictly by sequence_order ascending, tie-breaking with name.localeCompare
  // 2. Teacher Scoping: If isTeacherOnly and assignedClassIds is provided, filter to only assigned classes
  const sortedClasses = useMemo(() => {
    let list = [...classes];
    if (isTeacherOnly && assignedClassIds) {
      list = list.filter((cls) => assignedClassIds.has(cls.id));
    }
    return list.sort((a, b) => {
      const seqA = a.sequence_order ?? 0;
      const seqB = b.sequence_order ?? 0;
      if (seqA !== seqB) return seqA - seqB;
      return a.name.localeCompare(b.name);
    });
  }, [classes, isTeacherOnly, assignedClassIds]);

  // If no classes match, return null
  if (sortedClasses.length === 0) {
    return null;
  }

  // 3. Pointers
  const currentIndex = sortedClasses.findIndex((c) => c.id === currentClassId);
  const currentClass = currentIndex >= 0 ? sortedClasses[currentIndex] : null;
  const prevClass = currentIndex > 0 ? sortedClasses[currentIndex - 1] : null;
  const nextClass =
    currentIndex >= 0 && currentIndex < sortedClasses.length - 1
      ? sortedClasses[currentIndex + 1]
      : null;

  const isFirstStep = currentIndex <= 0;
  const isFinalStep =
    currentIndex >= 0 && currentIndex === sortedClasses.length - 1;
  const stepNumber = currentIndex >= 0 ? currentIndex + 1 : 1;
  const totalSteps = sortedClasses.length;

  const nextButton = (
    <Button
      variant="ghost"
      size="sm"
      disabled={isFinalStep || !nextClass}
      onClick={() => nextClass && onSelectClass(nextClass.id)}
      className="h-8 px-2 gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
      aria-label={nextClass ? `Next grade: ${nextClass.name}` : 'Next grade'}
    >
      <span className="hidden sm:inline">{nextClass?.name}</span>
      <ChevronRight className="w-4 h-4" />
    </Button>
  );

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-xl border border-border/70 bg-card/90 shadow-2xs p-0.5 gap-0.5',
        className
      )}
    >
      {/* Previous Button */}
      <Button
        variant="ghost"
        size="sm"
        disabled={isFirstStep || !prevClass}
        onClick={() => prevClass && onSelectClass(prevClass.id)}
        className="h-8 px-2 gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
        aria-label={prevClass ? `Previous grade: ${prevClass.name}` : 'Previous grade'}
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="hidden sm:inline">{prevClass?.name}</span>
      </Button>

      {/* Chronology Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 gap-1.5 text-xs text-foreground hover:bg-accent/60 cursor-pointer font-normal"
            aria-label="Academic Progression Chronology"
          >
            <GitCommit className="w-3.5 h-3.5 text-primary shrink-0" />
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 font-bold border-primary/30 text-primary"
            >
              Step #{stepNumber}
            </Badge>
            <span className="font-bold text-xs truncate max-w-[120px]">
              {currentClass?.name ?? 'Select Grade'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-64 max-h-80 overflow-y-auto">
          <DropdownMenuLabel className="font-normal px-2.5 py-1.5">
            <div className="font-semibold text-xs text-foreground flex items-center justify-between">
              <span>Academic Progression Chronology</span>
              <span className="text-[10px] font-normal text-muted-foreground">
                {totalSteps} {totalSteps === 1 ? 'Grade' : 'Grades'}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Promotion order: Step #N → Step #N+1
            </p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {sortedClasses.map((cls, idx) => {
            const isCurrent = cls.id === currentClassId;
            const isFinal = idx === sortedClasses.length - 1;
            const step = idx + 1;

            return (
              <DropdownMenuItem
                key={cls.id}
                onClick={() => onSelectClass(cls.id)}
                className={cn(
                  'flex items-center gap-2 cursor-pointer py-1.5 px-2 text-xs',
                  isCurrent && 'bg-primary/10 font-bold text-primary focus:bg-primary/15'
                )}
              >
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] px-1.5 py-0 shrink-0 font-medium',
                    isCurrent
                      ? 'border-primary/40 text-primary font-bold bg-primary/10'
                      : 'border-border text-muted-foreground'
                  )}
                >
                  Step #{step}
                </Badge>
                <span
                  className={cn(
                    'truncate text-xs',
                    isCurrent ? 'font-bold text-primary' : 'text-foreground font-medium'
                  )}
                >
                  {cls.name}
                </span>
                {(isFinal || isCurrent) && (
                  <div className="ml-auto flex items-center gap-1.5 shrink-0">
                    {isFinal && (
                      <Badge
                        variant="outline"
                        className="text-[9px] border-amber-500/40 text-amber-600 dark:text-amber-400 gap-1 px-1.5 py-0 font-medium"
                      >
                        <GraduationCap className="w-2.5 h-2.5" /> Final
                      </Badge>
                    )}
                    {isCurrent && <Check className="w-3.5 h-3.5 text-primary" />}
                  </div>
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Next Button */}
      {isFinalStep ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">{nextButton}</span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Terminal grade — students graduate at rollover
          </TooltipContent>
        </Tooltip>
      ) : (
        nextButton
      )}
    </div>
  );
};

export default ClassProgressionNavigator;
