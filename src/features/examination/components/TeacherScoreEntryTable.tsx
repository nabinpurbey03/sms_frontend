import React, { useMemo } from 'react';
import { ResponsiveDataTable, type Column } from '@/components/common/ResponsiveDataTable';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  evaluateStudentResult,
  type StudentGradingRow,
} from '@/features/examination/types';

export type { StudentGradingRow };

export interface TeacherScoreEntryTableProps {
  students: StudentGradingRow[];
  hasPractical: boolean;
  theoryFullMark: number;
  theoryPassMark: number;
  practicalFullMark: number;
  practicalPassMark: number;
  fullMark: number;
  passMark: number;
  isLocked: boolean;
  onTheoryScoreChange: (studentId: string, score: number | null) => void;
  onTheoryAbsentToggle: (studentId: string, isAbsent: boolean) => void;
  onPracticalScoreChange: (studentId: string, score: number | null) => void;
  onPracticalAbsentToggle: (studentId: string, isAbsent: boolean) => void;
  onFillMaxPractical?: () => void;
}

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function renderResultBadge(
  row: StudentGradingRow,
  options: {
    hasPractical: boolean;
    theoryPassMark: number;
    practicalPassMark: number;
    passMark: number;
  }
) {
  const evaluation = evaluateStudentResult({
    hasPractical: options.hasPractical,
    theoryScore: row.theoryScore,
    isTheoryAbsent: row.isTheoryAbsent,
    theoryPassMark: options.theoryPassMark,
    practicalScore: row.practicalScore,
    isPracticalAbsent: row.isPracticalAbsent,
    practicalPassMark: options.practicalPassMark,
    passMark: options.passMark,
  });

  const badge = (
    <Badge
      variant={evaluation.variant as any}
      className={cn(
        'font-semibold text-xs transition-colors shrink-0',
        evaluation.variant === 'success' && 'bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700'
      )}
    >
      {evaluation.status}
    </Badge>
  );

  if (evaluation.tooltip) {
    return (
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} className="inline-flex cursor-help">
              {badge}
            </span>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className={cn(
              'text-xs font-medium',
              evaluation.variant === 'destructive' &&
                'bg-destructive text-destructive-foreground border-destructive'
            )}
          >
            {evaluation.tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}

export const TeacherScoreEntryTable: React.FC<TeacherScoreEntryTableProps> = ({
  students,
  hasPractical,
  theoryFullMark,
  theoryPassMark,
  practicalFullMark,
  practicalPassMark,
  fullMark,
  passMark,
  isLocked,
  onTheoryScoreChange,
  onTheoryAbsentToggle,
  onPracticalScoreChange,
  onPracticalAbsentToggle,
  onFillMaxPractical,
}) => {
  const columns: Column<StudentGradingRow>[] = useMemo(() => {
    const studentColumn: Column<StudentGradingRow> = {
      header: 'Student',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 text-xs shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {getInitials(row.studentName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-sm text-foreground leading-snug truncate">
              {row.studentName}
            </span>
            {row.sectionName && (
              <div className="mt-0.5">
                <Badge
                  variant="outline"
                  className="text-[11px] px-1.5 py-0 font-normal"
                >
                  {row.sectionName}
                </Badge>
              </div>
            )}
          </div>
        </div>
      ),
    };

    if (hasPractical) {
      const theoryColumn: Column<StudentGradingRow> = {
        header: (
          <div className="flex flex-col items-center">
            <span>Theory</span>
            <span className="text-[10px] text-muted-foreground font-normal">
              0 - {theoryFullMark} (Pass: {theoryPassMark})
            </span>
          </div>
        ),
        className: 'w-60 text-center',
        cell: (row) => {
          const rawScore: any = row.theoryScore;
          const scoreNum =
            rawScore !== null && rawScore !== undefined && rawScore !== ''
              ? Number(rawScore)
              : null;
          const isInvalid =
            !row.isTheoryAbsent &&
            scoreNum !== null &&
            !isNaN(scoreNum) &&
            (scoreNum < 0 || scoreNum > theoryFullMark);

          return (
            <div className="flex items-center justify-center gap-2">
              <Button
                type="button"
                size="sm"
                disabled={isLocked}
                onClick={() =>
                  onTheoryAbsentToggle(row.studentId, !row.isTheoryAbsent)
                }
                className={cn(
                  'h-8 min-w-[84px] text-xs font-semibold shrink-0 transition-all shadow-xs',
                  row.isTheoryAbsent
                    ? 'bg-rose-600 hover:bg-rose-700 text-white dark:bg-rose-600 dark:hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700'
                )}
              >
                {row.isTheoryAbsent ? 'TH Absent' : 'Present'}
              </Button>
              <TooltipProvider delayDuration={150}>
                <Tooltip open={isInvalid ? undefined : false}>
                  <TooltipTrigger asChild>
                    <div className="relative inline-block">
                      <Input
                        type="number"
                        min={0}
                        max={theoryFullMark}
                        step="0.5"
                        placeholder={
                          row.isTheoryAbsent ? '0' : `0 - ${theoryFullMark}`
                        }
                        value={
                          row.isTheoryAbsent ? '0' : (row.theoryScore ?? '')
                        }
                        disabled={row.isTheoryAbsent || isLocked}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === '') {
                            onTheoryScoreChange(row.studentId, null);
                          } else {
                            const parsed = parseFloat(raw);
                            onTheoryScoreChange(
                              row.studentId,
                              isNaN(parsed) ? null : parsed
                            );
                          }
                        }}
                        className={cn(
                          'w-24 text-center font-semibold text-sm transition-all h-8',
                          row.isTheoryAbsent &&
                            'bg-muted text-muted-foreground cursor-not-allowed font-medium',
                          isInvalid &&
                            'border-destructive text-destructive focus-visible:ring-destructive bg-destructive/5'
                        )}
                      />
                    </div>
                  </TooltipTrigger>
                  {isInvalid && (
                    <TooltipContent
                      side="top"
                      className="bg-destructive text-destructive-foreground border-destructive text-xs"
                    >
                      Theory score must be between 0 and {theoryFullMark}
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          );
        },
      };

      const practicalColumn: Column<StudentGradingRow> = {
        header: (
          <div className="flex flex-col items-center">
            <span>Practical</span>
            <span className="text-[10px] text-muted-foreground font-normal">
              0 - {practicalFullMark} (Pass: {practicalPassMark})
            </span>
          </div>
        ),
        className: 'w-60 text-center',
        cell: (row) => {
          const rawScore: any = row.practicalScore;
          const scoreNum =
            rawScore !== null && rawScore !== undefined && rawScore !== ''
              ? Number(rawScore)
              : null;
          const isInvalid =
            !row.isPracticalAbsent &&
            scoreNum !== null &&
            !isNaN(scoreNum) &&
            (scoreNum < 0 || scoreNum > practicalFullMark);

          return (
            <div className="flex items-center justify-center gap-2">
              <Button
                type="button"
                size="sm"
                disabled={isLocked}
                onClick={() =>
                  onPracticalAbsentToggle(row.studentId, !row.isPracticalAbsent)
                }
                className={cn(
                  'h-8 min-w-[84px] text-xs font-semibold shrink-0 transition-all shadow-xs',
                  row.isPracticalAbsent
                    ? 'bg-rose-600 hover:bg-rose-700 text-white dark:bg-rose-600 dark:hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700'
                )}
              >
                {row.isPracticalAbsent ? 'PR Absent' : 'Present'}
              </Button>
              <TooltipProvider delayDuration={150}>
                <Tooltip open={isInvalid ? undefined : false}>
                  <TooltipTrigger asChild>
                    <div className="relative inline-block">
                      <Input
                        type="number"
                        min={0}
                        max={practicalFullMark}
                        step="0.5"
                        placeholder={
                          row.isPracticalAbsent ? '0' : `0 - ${practicalFullMark}`
                        }
                        value={
                          row.isPracticalAbsent ? '0' : (row.practicalScore ?? '')
                        }
                        disabled={row.isPracticalAbsent || isLocked}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === '') {
                            onPracticalScoreChange(row.studentId, null);
                          } else {
                            const parsed = parseFloat(raw);
                            onPracticalScoreChange(
                              row.studentId,
                              isNaN(parsed) ? null : parsed
                            );
                          }
                        }}
                        className={cn(
                          'w-24 text-center font-semibold text-sm transition-all h-8',
                          row.isPracticalAbsent &&
                            'bg-muted text-muted-foreground cursor-not-allowed font-medium',
                          isInvalid &&
                            'border-destructive text-destructive focus-visible:ring-destructive bg-destructive/5'
                        )}
                      />
                    </div>
                  </TooltipTrigger>
                  {isInvalid && (
                    <TooltipContent
                      side="top"
                      className="bg-destructive text-destructive-foreground border-destructive text-xs"
                    >
                      Practical score must be between 0 and {practicalFullMark}
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          );
        },
      };

      const totalMarksColumn: Column<StudentGradingRow> = {
        header: 'Total Marks',
        className: 'w-32 text-center',
        cell: (row) => (
          <div className="flex items-center justify-center font-mono font-medium text-sm">
            {row.score !== null ? (
              <>
                <span className="font-semibold text-foreground">{row.score}</span>
                <span className="text-muted-foreground text-xs ml-0.5">
                  / {fullMark}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">— / {fullMark}</span>
            )}
          </div>
        ),
      };

      const resultColumn: Column<StudentGradingRow> = {
        header: 'Result Pill',
        className: 'w-36 text-center',
        cell: (row) => (
          <div className="flex justify-center">
            {renderResultBadge(row, {
              hasPractical,
              theoryPassMark,
              practicalPassMark,
              passMark,
            })}
          </div>
        ),
      };

      return [
        studentColumn,
        theoryColumn,
        practicalColumn,
        totalMarksColumn,
        resultColumn,
      ];
    }

    // When !hasPractical
    return [
      studentColumn,
      {
        header: 'Attendance Status',
        className: 'w-44 text-center',
        cell: (row) => (
          <div className="flex justify-center">
            <Button
              type="button"
              size="sm"
              disabled={isLocked}
              onClick={() =>
                onTheoryAbsentToggle(row.studentId, !row.isTheoryAbsent)
              }
              className={cn(
                'min-h-[36px] min-w-[110px] text-xs font-semibold transition-all shadow-xs',
                row.isTheoryAbsent
                  ? 'bg-rose-600 hover:bg-rose-700 text-white dark:bg-rose-600 dark:hover:bg-rose-700'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700'
              )}
            >
              {row.isTheoryAbsent ? 'Absent' : 'Present'}
            </Button>
          </div>
        ),
      },
      {
        header: 'Score Input',
        className: 'w-44 text-center',
        cell: (row) => {
          const rawScore: any = row.theoryScore ?? row.score;
          const scoreNum =
            rawScore !== null && rawScore !== undefined && rawScore !== ''
              ? Number(rawScore)
              : null;
          const fullMarkNum = Number(fullMark);
          const isInvalid =
            !row.isTheoryAbsent &&
            scoreNum !== null &&
            !isNaN(scoreNum) &&
            (scoreNum < 0 || scoreNum > fullMarkNum);

          return (
            <div className="flex flex-col items-center justify-center">
              <TooltipProvider delayDuration={150}>
                <Tooltip open={isInvalid ? undefined : false}>
                  <TooltipTrigger asChild>
                    <div className="relative inline-block">
                      <Input
                        type="number"
                        min={0}
                        max={fullMark}
                        step="0.5"
                        placeholder={
                          row.isTheoryAbsent
                            ? '0 (Absent)'
                            : `0 - ${fullMark}`
                        }
                        value={
                          row.isTheoryAbsent
                            ? '0'
                            : (row.theoryScore ?? row.score ?? '')
                        }
                        disabled={row.isTheoryAbsent || isLocked}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === '') {
                            onTheoryScoreChange(row.studentId, null);
                          } else {
                            const parsed = parseFloat(raw);
                            onTheoryScoreChange(
                              row.studentId,
                              isNaN(parsed) ? null : parsed
                            );
                          }
                        }}
                        className={cn(
                          'w-28 text-center font-semibold text-sm transition-all h-9',
                          row.isTheoryAbsent &&
                            'bg-muted text-muted-foreground cursor-not-allowed font-medium',
                          isInvalid &&
                            'border-destructive text-destructive focus-visible:ring-destructive focus-visible:border-destructive bg-destructive/5'
                        )}
                      />
                    </div>
                  </TooltipTrigger>
                  {isInvalid && (
                    <TooltipContent
                      side="top"
                      className="bg-destructive text-destructive-foreground border-destructive text-xs"
                    >
                      Score must be between 0 and {fullMark}
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              {isInvalid && (
                <span className="text-[11px] text-destructive font-medium mt-1">
                  Score must be between 0 and {fullMark}
                </span>
              )}
            </div>
          );
        },
      },
      {
        header: 'Result Pill',
        className: 'w-32 text-center',
        cell: (row) => (
          <div className="flex justify-center">
            {renderResultBadge(row, {
              hasPractical,
              theoryPassMark,
              practicalPassMark,
              passMark,
            })}
          </div>
        ),
      },
    ];
  }, [
    hasPractical,
    theoryFullMark,
    theoryPassMark,
    practicalFullMark,
    practicalPassMark,
    fullMark,
    passMark,
    isLocked,
    onTheoryScoreChange,
    onTheoryAbsentToggle,
    onPracticalScoreChange,
    onPracticalAbsentToggle,
  ]);

  const renderCard = (row: StudentGradingRow) => {
    if (hasPractical) {
      const rawTheory: any = row.theoryScore;
      const thNum =
        rawTheory !== null && rawTheory !== undefined && rawTheory !== ''
          ? Number(rawTheory)
          : null;
      const isTheoryInvalid =
        !row.isTheoryAbsent &&
        thNum !== null &&
        !isNaN(thNum) &&
        (thNum < 0 || thNum > theoryFullMark);

      const rawPractical: any = row.practicalScore;
      const prNum =
        rawPractical !== null && rawPractical !== undefined && rawPractical !== ''
          ? Number(rawPractical)
          : null;
      const isPracticalInvalid =
        !row.isPracticalAbsent &&
        prNum !== null &&
        !isNaN(prNum) &&
        (prNum < 0 || prNum > practicalFullMark);

      return (
        <Card className="border-border/70 shadow-sm p-4 space-y-3 bg-card">
          {/* Header row: Avatar, Student name, Section, Result Pill */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-10 w-10 text-xs shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {getInitials(row.studentName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">
                  {row.studentName}
                </p>
                {row.sectionName && (
                  <Badge
                    variant="outline"
                    className="text-[11px] px-1.5 py-0 mt-0.5 font-normal"
                  >
                    {row.sectionName}
                  </Badge>
                )}
              </div>
            </div>
            <div className="shrink-0">
              {renderResultBadge(row, {
                hasPractical,
                theoryPassMark,
                practicalPassMark,
                passMark,
              })}
            </div>
          </div>

          {/* Theory Component Row */}
          <div className="p-2.5 rounded-lg border bg-muted/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">
                Theory (Max: {theoryFullMark}, Pass: {theoryPassMark})
              </span>
              <Button
                type="button"
                size="sm"
                disabled={isLocked}
                onClick={() =>
                  onTheoryAbsentToggle(row.studentId, !row.isTheoryAbsent)
                }
                className={cn(
                  'h-7 px-2.5 text-xs font-semibold shadow-xs',
                  row.isTheoryAbsent
                    ? 'bg-rose-600 hover:bg-rose-700 text-white dark:bg-rose-600 dark:hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700'
                )}
              >
                {row.isTheoryAbsent ? 'TH Absent' : 'Present'}
              </Button>
            </div>
            <Input
              type="number"
              min={0}
              max={theoryFullMark}
              step="0.5"
              placeholder={
                row.isTheoryAbsent ? '0 (Absent)' : `Theory 0 - ${theoryFullMark}`
              }
              value={row.isTheoryAbsent ? '0' : (row.theoryScore ?? '')}
              disabled={row.isTheoryAbsent || isLocked}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') onTheoryScoreChange(row.studentId, null);
                else {
                  const parsed = parseFloat(raw);
                  onTheoryScoreChange(
                    row.studentId,
                    isNaN(parsed) ? null : parsed
                  );
                }
              }}
              className={cn(
                'h-9 text-center font-semibold text-sm',
                row.isTheoryAbsent &&
                  'bg-muted text-muted-foreground cursor-not-allowed',
                isTheoryInvalid &&
                  'border-destructive text-destructive bg-destructive/5'
              )}
            />
            {isTheoryInvalid && (
              <p className="text-[11px] text-destructive font-medium">
                Theory score must be between 0 and {theoryFullMark}
              </p>
            )}
          </div>

          {/* Practical Component Row */}
          <div className="p-2.5 rounded-lg border bg-muted/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">
                Practical (Max: {practicalFullMark}, Pass: {practicalPassMark})
              </span>
              <Button
                type="button"
                size="sm"
                disabled={isLocked}
                onClick={() =>
                  onPracticalAbsentToggle(
                    row.studentId,
                    !row.isPracticalAbsent
                  )
                }
                className={cn(
                  'h-7 px-2.5 text-xs font-semibold shadow-xs',
                  row.isPracticalAbsent
                    ? 'bg-rose-600 hover:bg-rose-700 text-white dark:bg-rose-600 dark:hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700'
                )}
              >
                {row.isPracticalAbsent ? 'PR Absent' : 'Present'}
              </Button>
            </div>
            <Input
              type="number"
              min={0}
              max={practicalFullMark}
              step="0.5"
              placeholder={
                row.isPracticalAbsent
                  ? '0 (Absent)'
                  : `Practical 0 - ${practicalFullMark}`
              }
              value={row.isPracticalAbsent ? '0' : (row.practicalScore ?? '')}
              disabled={row.isPracticalAbsent || isLocked}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') onPracticalScoreChange(row.studentId, null);
                else {
                  const parsed = parseFloat(raw);
                  onPracticalScoreChange(
                    row.studentId,
                    isNaN(parsed) ? null : parsed
                  );
                }
              }}
              className={cn(
                'h-9 text-center font-semibold text-sm',
                row.isPracticalAbsent &&
                  'bg-muted text-muted-foreground cursor-not-allowed',
                isPracticalInvalid &&
                  'border-destructive text-destructive bg-destructive/5'
              )}
            />
            {isPracticalInvalid && (
              <p className="text-[11px] text-destructive font-medium">
                Practical score must be between 0 and {practicalFullMark}
              </p>
            )}
          </div>

          {/* Total Marks Footer */}
          <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
            <span className="text-muted-foreground font-medium">Total Score</span>
            <span className="font-semibold text-foreground font-mono">
              {row.score !== null ? `${row.score} / ${fullMark}` : `— / ${fullMark}`}
            </span>
          </div>
        </Card>
      );
    }

    // Mobile card when !hasPractical
    const rawScore: any = row.theoryScore ?? row.score;
    const scoreNum =
      rawScore !== null && rawScore !== undefined && rawScore !== ''
        ? Number(rawScore)
        : null;
    const fullMarkNum = Number(fullMark);
    const isInvalid =
      !row.isTheoryAbsent &&
      scoreNum !== null &&
      !isNaN(scoreNum) &&
      (scoreNum < 0 || scoreNum > fullMarkNum);

    return (
      <Card className="border-border/70 shadow-sm p-4 space-y-3 bg-card">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-10 w-10 text-xs shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {getInitials(row.studentName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-foreground truncate">
                {row.studentName}
              </p>
              {row.sectionName && (
                <Badge
                  variant="outline"
                  className="text-[11px] px-1.5 py-0 mt-0.5 font-normal"
                >
                  {row.sectionName}
                </Badge>
              )}
            </div>
          </div>
          <div className="shrink-0">
            {renderResultBadge(row, {
              hasPractical,
              theoryPassMark,
              practicalPassMark,
              passMark,
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40 items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground block">
              Attendance
            </label>
            <Button
              type="button"
              size="sm"
              disabled={isLocked}
              onClick={() =>
                onTheoryAbsentToggle(row.studentId, !row.isTheoryAbsent)
              }
              className={cn(
                'w-full min-h-[44px] text-xs font-semibold transition-colors shadow-xs',
                row.isTheoryAbsent
                  ? 'bg-rose-600 hover:bg-rose-700 text-white dark:bg-rose-600 dark:hover:bg-rose-700'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700'
              )}
            >
              {row.isTheoryAbsent ? 'Absent' : 'Present'}
            </Button>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground block">
              Score (0 - {fullMark})
            </label>
            <Input
              type="number"
              min={0}
              max={fullMark}
              step="0.5"
              placeholder={
                row.isTheoryAbsent ? '0 (Absent)' : `0 - ${fullMark}`
              }
              value={
                row.isTheoryAbsent ? '0' : (row.theoryScore ?? row.score ?? '')
              }
              disabled={row.isTheoryAbsent || isLocked}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') {
                  onTheoryScoreChange(row.studentId, null);
                } else {
                  const parsed = parseFloat(raw);
                  onTheoryScoreChange(
                    row.studentId,
                    isNaN(parsed) ? null : parsed
                  );
                }
              }}
              className={cn(
                'min-h-[44px] text-center font-semibold text-sm',
                row.isTheoryAbsent &&
                  'bg-muted text-muted-foreground cursor-not-allowed font-medium',
                isInvalid &&
                  'border-destructive text-destructive focus-visible:ring-destructive bg-destructive/5'
              )}
            />
          </div>
        </div>

        {isInvalid && (
          <p className="text-xs text-destructive font-medium pt-1">
            Score must be between 0 and {fullMark}
          </p>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-3">
      {hasPractical && onFillMaxPractical && !isLocked && (
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onFillMaxPractical}
            className="gap-1.5 text-xs font-semibold border-primary/30 hover:bg-primary/5 hover:text-primary transition-colors shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            Fill All Present with Max Practical Marks
          </Button>
        </div>
      )}

      <ResponsiveDataTable
        data={students}
        columns={columns}
        keyExtractor={(item) => item.studentId}
        renderCard={renderCard}
        emptyMessage="No students found for this class / section."
      />
    </div>
  );
};

export default TeacherScoreEntryTable;
