import React from 'react';
import { AlertCircle, BookOpen } from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface SubjectConfigItem {
  subjectId: string;
  subjectName: string;
  subjectCode?: string | null;
  included: boolean;
  fullMark: number;
  passMark: number;
  assignedTeacherId: string;
  autoAssignedTeacherId?: string | null;
  autoAssignedTeacherName?: string | null;
  error?: string;
}

export interface ExamSubjectConfigListProps {
  configs: SubjectConfigItem[];
  teachers: { user_id: string; first_name: string; last_name: string }[];
  onChange: (configs: SubjectConfigItem[]) => void;
  disabled?: boolean;
}

export const ExamSubjectConfigList: React.FC<ExamSubjectConfigListProps> = ({
  configs,
  teachers,
  onChange,
  disabled = false,
}) => {
  const handleUpdate = (index: number, updates: Partial<SubjectConfigItem>) => {
    const updated = configs.map((item, i) => {
      if (i !== index) return item;
      const newItem = { ...item, ...updates };
      if (newItem.included && newItem.passMark > newItem.fullMark) {
        newItem.error = 'Pass mark cannot exceed full mark';
      } else {
        newItem.error = undefined;
      }
      return newItem;
    });
    onChange(updated);
  };

  const handleIncludeToggle = (index: number, included: boolean) => {
    handleUpdate(index, { included });
  };

  const handleToggleAll = (included: boolean) => {
    const updated = configs.map((item) => ({
      ...item,
      included,
      error:
        included && item.passMark > item.fullMark
          ? 'Pass mark cannot exceed full mark'
          : undefined,
    }));
    onChange(updated);
  };

  const handleFullMarkChange = (index: number, valStr: string) => {
    const fullMark = valStr === '' ? 0 : Math.max(0, parseInt(valStr, 10) || 0);
    handleUpdate(index, { fullMark });
  };

  const handlePassMarkChange = (index: number, valStr: string) => {
    const passMark = valStr === '' ? 0 : Math.max(0, parseInt(valStr, 10) || 0);
    handleUpdate(index, { passMark });
  };

  const handleTeacherChange = (index: number, teacherId: string) => {
    handleUpdate(index, { assignedTeacherId: teacherId });
  };

  const hasAnyError = configs.some(
    (c) => c.included && c.passMark > c.fullMark
  );
  const allIncluded = configs.length > 0 && configs.every((c) => c.included);

  if (configs.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Real-time validation error banner */}
      {hasAnyError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive text-sm flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Pass mark cannot exceed full mark. Please review the highlighted subjects.</span>
        </div>
      )}

      {/* Desktop View (>= md): Clean Table */}
      <div className="hidden md:block rounded-xl border bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={allIncluded}
                    onCheckedChange={(checked) => handleToggleAll(!!checked)}
                    disabled={disabled || configs.length === 0}
                    aria-label="Toggle all subjects"
                  />
                  <span>Include in Exam</span>
                </div>
              </TableHead>
              <TableHead>Subject</TableHead>
              <TableHead className="w-[140px]">Full Mark</TableHead>
              <TableHead className="w-[160px]">Pass Mark</TableHead>
              <TableHead className="w-[280px]">Grading Teacher</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {configs.map((item, index) => {
              const isExcluded = !item.included;
              const hasError = !!item.error || (item.included && item.passMark > item.fullMark);

              return (
                <TableRow
                  key={item.subjectId}
                  className={cn(
                    'transition-colors',
                    isExcluded && 'opacity-50 bg-muted/20'
                  )}
                >
                  <TableCell>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <Checkbox
                        checked={item.included}
                        onCheckedChange={(checked) =>
                          handleIncludeToggle(index, !!checked)
                        }
                        disabled={disabled}
                      />
                      <span className="text-xs text-muted-foreground">
                        {item.included ? 'Included' : 'Excluded'}
                      </span>
                    </label>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-foreground">
                          {item.subjectName}
                        </div>
                        {item.subjectCode && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 mt-0.5"
                          >
                            {item.subjectCode}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      max={1000}
                      value={item.fullMark === 0 ? '' : item.fullMark}
                      onChange={(e) =>
                        handleFullMarkChange(index, e.target.value)
                      }
                      disabled={disabled || isExcluded}
                      className="h-9 w-28"
                      placeholder="100"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      max={item.fullMark || 1000}
                      value={item.passMark === 0 ? '0' : item.passMark}
                      onChange={(e) =>
                        handlePassMarkChange(index, e.target.value)
                      }
                      disabled={disabled || isExcluded}
                      className={cn(
                        'h-9 w-28',
                        hasError &&
                          'border-destructive focus-visible:ring-destructive text-destructive'
                      )}
                      placeholder="40"
                    />
                    {hasError && (
                      <p className="text-[11px] text-destructive mt-1 font-medium leading-tight">
                        Pass mark cannot exceed full mark
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1">
                          {item.autoAssignedTeacherId &&
                            item.assignedTeacherId === item.autoAssignedTeacherId && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                              >
                                Auto-assigned
                              </Badge>
                            )}
                          {item.autoAssignedTeacherId &&
                            item.assignedTeacherId !== item.autoAssignedTeacherId && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                              >
                                Admin Override
                              </Badge>
                            )}
                        </div>
                        {item.autoAssignedTeacherId &&
                          item.assignedTeacherId !== item.autoAssignedTeacherId && (
                            <button
                              type="button"
                              onClick={() =>
                                handleTeacherChange(index, item.autoAssignedTeacherId || '')
                              }
                              disabled={disabled || isExcluded}
                              className="text-[10px] text-primary hover:underline font-medium"
                            >
                              Reset to Auto
                            </button>
                          )}
                      </div>
                      <select
                        value={item.assignedTeacherId}
                        onChange={(e) =>
                          handleTeacherChange(index, e.target.value)
                        }
                        disabled={disabled || isExcluded}
                        className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">
                          {item.autoAssignedTeacherName
                            ? `-- None (Unassigned) --`
                            : `-- Select Grading Teacher (Optional) --`}
                        </option>
                        {teachers.map((t) => (
                          <option key={t.user_id} value={t.user_id}>
                            {t.first_name} {t.last_name}
                            {item.autoAssignedTeacherId === t.user_id ? ' (Subject Teacher)' : ''}
                          </option>
                        ))}
                      </select>
                      {item.autoAssignedTeacherName ? (
                        <p className="text-[11px] text-muted-foreground truncate">
                          Subject Teacher:{' '}
                          <span className="font-medium text-foreground">
                            {item.autoAssignedTeacherName}
                          </span>
                        </p>
                      ) : (
                        <p className="text-[11px] text-muted-foreground italic">
                          No subject teacher assigned
                        </p>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile View (< md): Card List */}
      <div className="md:hidden space-y-3">
        {configs.map((item, index) => {
          const isExcluded = !item.included;
          const hasError = !!item.error || (item.included && item.passMark > item.fullMark);

          return (
            <Card
              key={item.subjectId}
              className={cn(
                'transition-all border',
                isExcluded && 'opacity-60 bg-muted/20'
              )}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2 border-b pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-foreground">
                        {item.subjectName}
                      </div>
                      {item.subjectCode && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 mt-0.5"
                        >
                          {item.subjectCode}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium select-none">
                    <Checkbox
                      checked={item.included}
                      onCheckedChange={(checked) =>
                        handleIncludeToggle(index, !!checked)
                      }
                      disabled={disabled}
                    />
                    <span>Include</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Full Mark
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={1000}
                      value={item.fullMark === 0 ? '' : item.fullMark}
                      onChange={(e) =>
                        handleFullMarkChange(index, e.target.value)
                      }
                      disabled={disabled || isExcluded}
                      className="h-9"
                      placeholder="100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Pass Mark
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={item.fullMark || 1000}
                      value={item.passMark === 0 ? '0' : item.passMark}
                      onChange={(e) =>
                        handlePassMarkChange(index, e.target.value)
                      }
                      disabled={disabled || isExcluded}
                      className={cn(
                        'h-9',
                        hasError &&
                          'border-destructive focus-visible:ring-destructive text-destructive'
                      )}
                      placeholder="40"
                    />
                  </div>
                </div>

                {hasError && (
                  <div className="text-xs text-destructive flex items-center gap-1.5 font-medium bg-destructive/10 p-2 rounded-md">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Pass mark cannot exceed full mark</span>
                  </div>
                )}

                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between gap-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Grading Teacher
                    </label>
                    <div className="flex items-center gap-1.5">
                      {item.autoAssignedTeacherId &&
                        item.assignedTeacherId === item.autoAssignedTeacherId && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                          >
                            Auto-assigned
                          </Badge>
                        )}
                      {item.autoAssignedTeacherId &&
                        item.assignedTeacherId !== item.autoAssignedTeacherId && (
                          <>
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                            >
                              Admin Override
                            </Badge>
                            <button
                              type="button"
                              onClick={() =>
                                handleTeacherChange(index, item.autoAssignedTeacherId || '')
                              }
                              disabled={disabled || isExcluded}
                              className="text-[11px] text-primary hover:underline font-medium min-h-[28px] flex items-center"
                            >
                              Reset to Auto
                            </button>
                          </>
                        )}
                    </div>
                  </div>
                  <select
                    value={item.assignedTeacherId}
                    onChange={(e) =>
                      handleTeacherChange(index, e.target.value)
                    }
                    disabled={disabled || isExcluded}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">
                      {item.autoAssignedTeacherName
                        ? `-- None (Unassigned) --`
                        : `-- Select Grading Teacher (Optional) --`}
                    </option>
                    {teachers.map((t) => (
                      <option key={t.user_id} value={t.user_id}>
                        {t.first_name} {t.last_name}
                        {item.autoAssignedTeacherId === t.user_id ? ' (Subject Teacher)' : ''}
                      </option>
                    ))}
                  </select>
                  {item.autoAssignedTeacherName ? (
                    <p className="text-[11px] text-muted-foreground truncate">
                      Subject Teacher:{' '}
                      <span className="font-medium text-foreground">
                        {item.autoAssignedTeacherName}
                      </span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground italic">
                      No subject teacher assigned
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ExamSubjectConfigList;
