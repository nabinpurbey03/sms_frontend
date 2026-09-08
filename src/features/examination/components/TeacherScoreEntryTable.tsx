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
import { cn } from '@/lib/utils';

export interface StudentGradingRow {
  studentId: string;
  studentName: string;
  sectionId?: string | null;
  sectionName?: string | null;
  score: number | null;
  isAbsent: boolean;
}

export interface TeacherScoreEntryTableProps {
  students: StudentGradingRow[];
  fullMark: number;
  passMark: number;
  isLocked: boolean;
  onScoreChange: (studentId: string, score: number | null) => void;
  onAbsentToggle: (studentId: string, isAbsent: boolean) => void;
}

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function renderResultBadge(row: StudentGradingRow, passMark: number) {
  if (row.isAbsent) {
    return <Badge variant="destructive">Absent (0)</Badge>;
  }
  if (row.score !== null) {
    if (row.score >= passMark) {
      return <Badge variant="success">Pass</Badge>;
    }
    return <Badge variant="destructive">Fail</Badge>;
  }
  return <Badge variant="secondary">Pending</Badge>;
}

export const TeacherScoreEntryTable: React.FC<TeacherScoreEntryTableProps> = ({
  students,
  fullMark,
  passMark,
  isLocked,
  onScoreChange,
  onAbsentToggle,
}) => {
  const columns: Column<StudentGradingRow>[] = useMemo(
    () => [
      {
        header: 'Student',
        cell: (row) => (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 text-xs shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {getInitials(row.studentName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-semibold text-sm text-foreground leading-snug">
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
      },
      {
        header: 'Attendance Status',
        className: 'w-44 text-center',
        cell: (row) => (
          <div className="flex justify-center">
            <Button
              type="button"
              size="sm"
              disabled={isLocked}
              onClick={() => {
                const nextAbsent = !row.isAbsent;
                onAbsentToggle(row.studentId, nextAbsent);
                if (nextAbsent) {
                  onScoreChange(row.studentId, 0);
                }
              }}
              className={cn(
                'min-h-[36px] min-w-[110px] text-xs font-semibold transition-all shadow-xs',
                row.isAbsent
                  ? 'bg-rose-600 hover:bg-rose-700 text-white dark:bg-rose-600 dark:hover:bg-rose-700'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700'
              )}
            >
              {row.isAbsent ? 'Absent' : 'Present'}
            </Button>
          </div>
        ),
      },
      {
        header: 'Score Input',
        className: 'w-44 text-center',
        cell: (row) => {
          const isInvalid =
            !row.isAbsent &&
            row.score !== null &&
            (row.score < 0 || row.score > fullMark);

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
                        placeholder={row.isAbsent ? '0 (Absent)' : `0 - ${fullMark}`}
                        value={row.isAbsent ? '0' : (row.score ?? '')}
                        disabled={row.isAbsent || isLocked}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === '') {
                            onScoreChange(row.studentId, null);
                          } else {
                            const parsed = parseFloat(raw);
                            onScoreChange(
                              row.studentId,
                              isNaN(parsed) ? null : parsed
                            );
                          }
                        }}
                        className={cn(
                          'w-28 text-center font-semibold text-sm transition-all h-9',
                          row.isAbsent && 'bg-muted text-muted-foreground cursor-not-allowed font-medium',
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
            {renderResultBadge(row, passMark)}
          </div>
        ),
      },
    ],
    [fullMark, passMark, isLocked, onScoreChange, onAbsentToggle]
  );

  const renderCard = (row: StudentGradingRow) => {
    const isInvalid =
      !row.isAbsent &&
      row.score !== null &&
      (row.score < 0 || row.score > fullMark);

    return (
      <Card className="border-border/70 shadow-sm p-4 space-y-3 bg-card">
        {/* Top row: Avatar, Student Name, Section badge, Result badge */}
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
          <div className="shrink-0">{renderResultBadge(row, passMark)}</div>
        </div>

        {/* Side-by-side row: AB toggle button and Numeric score input */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40 items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground block">
              Attendance
            </label>
            <Button
              type="button"
              size="sm"
              disabled={isLocked}
              onClick={() => {
                const nextAbsent = !row.isAbsent;
                onAbsentToggle(row.studentId, nextAbsent);
                if (nextAbsent) {
                  onScoreChange(row.studentId, 0);
                }
              }}
              className={cn(
                'w-full min-h-[44px] text-xs font-semibold transition-colors shadow-xs',
                row.isAbsent
                  ? 'bg-rose-600 hover:bg-rose-700 text-white dark:bg-rose-600 dark:hover:bg-rose-700'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700'
              )}
            >
              {row.isAbsent ? 'Absent' : 'Present'}
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
              placeholder={row.isAbsent ? '0 (Absent)' : `0 - ${fullMark}`}
              value={row.isAbsent ? '0' : (row.score ?? '')}
              disabled={row.isAbsent || isLocked}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') {
                  onScoreChange(row.studentId, null);
                } else {
                  const parsed = parseFloat(raw);
                  onScoreChange(
                    row.studentId,
                    isNaN(parsed) ? null : parsed
                  );
                }
              }}
              className={cn(
                'min-h-[44px] text-center font-semibold text-sm',
                row.isAbsent && 'bg-muted text-muted-foreground cursor-not-allowed font-medium',
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
    <ResponsiveDataTable
      data={students}
      columns={columns}
      keyExtractor={(item) => item.studentId}
      renderCard={renderCard}
      emptyMessage="No students found for this class / section."
    />
  );
};

export default TeacherScoreEntryTable;
