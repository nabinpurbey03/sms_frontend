import React from 'react';
import { AlertCircle, BookOpen, SlidersHorizontal, FlaskConical } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  EXAM_MARK_PRESETS,
  type ExamMarkPresetKey,
  deriveTotalMarks,
  validateSubjectMarks,
  applyPresetToSubject,
  MARK_INPUT_CLASS,
} from '../types';

export interface SubjectConfigItem {
  subjectId: string;
  subjectName: string;
  subjectCode?: string | null;
  included: boolean;
  hasPractical: boolean;
  theoryFullMark: number;
  theoryPassMark: number;
  practicalFullMark: number;
  practicalPassMark: number;
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
      const merged = { ...item, ...updates };
      const { fullMark, passMark } = deriveTotalMarks(merged);
      const newItem: SubjectConfigItem = {
        ...merged,
        fullMark,
        passMark,
      };
      newItem.error = validateSubjectMarks(newItem);
      return newItem;
    });
    onChange(updated);
  };

  const handleIncludeToggle = (index: number, included: boolean) => {
    handleUpdate(index, { included });
  };

  const handleToggleAll = (included: boolean) => {
    const updated = configs.map((item) => {
      const newItem = { ...item, included };
      newItem.error = validateSubjectMarks(newItem);
      return newItem;
    });
    onChange(updated);
  };

  const handlePracticalToggle = (index: number, hasPractical: boolean) => {
    const current = configs[index];
    if (!current) return;
    if (hasPractical) {
      const theoryFullMark = current.theoryFullMark === 100 ? 75 : current.theoryFullMark;
      const theoryPassMark = current.theoryFullMark === 100 ? 27 : current.theoryPassMark;
      const practicalFullMark = current.practicalFullMark > 0 ? current.practicalFullMark : 25;
      const practicalPassMark = current.practicalPassMark > 0 ? current.practicalPassMark : 10;
      handleUpdate(index, {
        hasPractical: true,
        theoryFullMark,
        theoryPassMark,
        practicalFullMark,
        practicalPassMark,
      });
    } else {
      const theoryFullMark = current.theoryFullMark === 75 ? 100 : current.theoryFullMark;
      const theoryPassMark = current.theoryPassMark === 27 ? 40 : current.theoryPassMark;
      handleUpdate(index, {
        hasPractical: false,
        theoryFullMark,
        theoryPassMark,
        practicalFullMark: 0,
        practicalPassMark: 0,
      });
    }
  };

  const handlePresetSelect = (index: number, presetKey: ExamMarkPresetKey) => {
    const updated = configs.map((item, i) => {
      if (i !== index) return item;
      return applyPresetToSubject(item, presetKey);
    });
    onChange(updated);
  };

  const handleBatchPreset = (presetKey: ExamMarkPresetKey) => {
    const updated = configs.map((item) => {
      if (!item.included) return item;
      return applyPresetToSubject(item, presetKey);
    });
    onChange(updated);
  };

  const handleTheoryFullMarkChange = (index: number, valStr: string) => {
    const theoryFullMark = valStr === '' ? 0 : Math.max(0, parseInt(valStr, 10) || 0);
    handleUpdate(index, { theoryFullMark });
  };

  const handleTheoryPassMarkChange = (index: number, valStr: string) => {
    const theoryPassMark = valStr === '' ? 0 : Math.max(0, parseInt(valStr, 10) || 0);
    handleUpdate(index, { theoryPassMark });
  };

  const handlePracticalFullMarkChange = (index: number, valStr: string) => {
    const practicalFullMark = valStr === '' ? 0 : Math.max(0, parseInt(valStr, 10) || 0);
    handleUpdate(index, { practicalFullMark });
  };

  const handlePracticalPassMarkChange = (index: number, valStr: string) => {
    const practicalPassMark = valStr === '' ? 0 : Math.max(0, parseInt(valStr, 10) || 0);
    handleUpdate(index, { practicalPassMark });
  };

  const handleTeacherChange = (index: number, teacherId: string) => {
    handleUpdate(index, { assignedTeacherId: teacherId });
  };

  const hasAnyError = configs.some((c) => c.included && !!c.error);
  const allIncluded = configs.length > 0 && configs.every((c) => c.included);
  const includedCount = configs.filter((c) => c.included).length;

  if (configs.length === 0) {
    return null;
  }

  return (
    <div>
      {/* Real-time validation error banner */}
      {hasAnyError && (
        <div className="m-4 mb-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive text-sm flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            Pass mark cannot exceed full mark, and full marks must be at least 1. Please review highlighted subjects.
          </span>
        </div>
      )}

      {/* Batch Preset Bar (Flush Toolbar Header) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 sm:px-5 py-2.5 bg-muted/20 border-b">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <SlidersHorizontal className="w-4 h-4 text-primary" />
          <span>Quick Apply Presets to Included Subjects ({includedCount}):</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(['75_25', '80_20', '50_50', '100_TH'] as const).map((key) => {
            const p = EXAM_MARK_PRESETS[key];
            return (
              <Button
                key={key}
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2.5 py-0 font-medium hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-colors"
                disabled={disabled || includedCount === 0}
                onClick={() => handleBatchPreset(key)}
                title={`Apply ${p.label} preset to all ${includedCount} included subjects`}
              >
                {p.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Desktop View (>= md): Comprehensive Table */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <Table className="min-w-[880px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px] text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Checkbox
                      checked={allIncluded}
                      onCheckedChange={(checked) => handleToggleAll(!!checked)}
                      disabled={disabled || configs.length === 0}
                      aria-label="Toggle all subjects"
                    />
                    <span className="text-xs">Include</span>
                  </div>
                </TableHead>
                <TableHead className="min-w-[220px]">Subject & Presets</TableHead>
                <TableHead className="w-[170px]">Theory Marks</TableHead>
                <TableHead className="w-[170px]">Practical Marks</TableHead>
                <TableHead className="w-[110px] text-center">Total</TableHead>
                <TableHead className="min-w-[200px]">
                  Grading Teacher <span className="text-destructive">*</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.map((item, index) => {
                const isExcluded = !item.included;
                const hasError = !!item.error;

                return (
                  <TableRow
                    key={item.subjectId}
                    className={cn(
                      'transition-colors',
                      isExcluded && 'opacity-50 bg-muted/20'
                    )}
                  >
                    {/* Column 1: Include Toggle */}
                    <TableCell className="align-top py-3 w-[80px] text-center">
                      <label className="flex flex-col items-center justify-center gap-1 cursor-pointer select-none">
                        <Checkbox
                          checked={item.included}
                          onCheckedChange={(checked) =>
                            handleIncludeToggle(index, !!checked)
                          }
                          disabled={disabled}
                          aria-label={`Include ${item.subjectName}`}
                        />
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {item.included ? 'Included' : 'Excluded'}
                        </span>
                      </label>
                    </TableCell>

                    {/* Column 2: Subject Details + Practical Switch + Presets */}
                    <TableCell className="align-top py-3 min-w-[220px]">
                      <div className="space-y-2">
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

                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                          {/* Practical Toggle Switch */}
                          <label className="flex items-center gap-1.5 cursor-pointer text-xs select-none">
                            <Checkbox
                              checked={item.hasPractical}
                              onCheckedChange={(checked) =>
                                handlePracticalToggle(index, !!checked)
                              }
                              disabled={disabled || isExcluded}
                            />
                            <span
                              className={cn(
                                'text-xs font-medium flex items-center gap-1',
                                item.hasPractical
                                  ? 'text-primary font-semibold'
                                  : 'text-muted-foreground'
                              )}
                            >
                              <FlaskConical className="w-3.5 h-3.5" />
                              Practical
                            </span>
                          </label>

                          {/* Preset quick pills */}
                          <div className="flex items-center gap-1">
                            {(['75_25', '80_20', '50_50', '100_TH'] as const).map((key) => {
                              const p = EXAM_MARK_PRESETS[key];
                              const isCurrent =
                                item.hasPractical === p.hasPractical &&
                                item.theoryFullMark === p.theoryFullMark &&
                                item.theoryPassMark === p.theoryPassMark &&
                                item.practicalFullMark === p.practicalFullMark &&
                                item.practicalPassMark === p.practicalPassMark;

                              return (
                                <button
                                  key={key}
                                  type="button"
                                  disabled={disabled || isExcluded}
                                  onClick={() => handlePresetSelect(index, key)}
                                  className={cn(
                                    'text-[10px] px-1.5 py-0.5 rounded border transition-colors font-medium',
                                    isCurrent
                                      ? 'bg-primary text-primary-foreground border-primary shadow-xs font-semibold'
                                      : 'bg-background hover:bg-muted text-muted-foreground border-input'
                                  )}
                                >
                                  {p.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Column 3: Theory Marks */}
                    <TableCell className="align-top py-3 w-[170px]">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] text-muted-foreground font-medium block text-center mb-0.5">
                              Full
                            </span>
                            <Input
                              type="number"
                              min={1}
                              max={1000}
                              value={item.theoryFullMark === 0 ? '' : item.theoryFullMark}
                              onChange={(e) =>
                                handleTheoryFullMarkChange(index, e.target.value)
                              }
                              disabled={disabled || isExcluded}
                              className={cn(
                                MARK_INPUT_CLASS,
                                item.included &&
                                  (item.theoryFullMark < 1 ||
                                    item.theoryPassMark > item.theoryFullMark) &&
                                  'border-destructive text-destructive'
                              )}
                              placeholder="75"
                            />
                          </div>
                          <span className="text-muted-foreground/50 text-sm font-semibold pt-3.5 select-none">
                            /
                          </span>
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] text-muted-foreground font-medium block text-center mb-0.5">
                              Pass
                            </span>
                            <Input
                              type="number"
                              min={0}
                              max={item.theoryFullMark || 1000}
                              value={item.theoryPassMark === 0 ? '0' : item.theoryPassMark}
                              onChange={(e) =>
                                handleTheoryPassMarkChange(index, e.target.value)
                              }
                              disabled={disabled || isExcluded}
                              className={cn(
                                MARK_INPUT_CLASS,
                                item.included &&
                                  item.theoryPassMark > item.theoryFullMark &&
                                  'border-destructive text-destructive'
                              )}
                              placeholder="27"
                            />
                          </div>
                        </div>
                        {item.included &&
                          (item.theoryPassMark > item.theoryFullMark ||
                            item.theoryFullMark < 1) && (
                            <p className="text-[11px] text-destructive font-medium leading-tight mt-1">
                              {item.theoryPassMark > item.theoryFullMark
                                ? 'Theory pass cannot exceed full'
                                : 'Theory full must be ≥ 1'}
                            </p>
                          )}
                      </div>
                    </TableCell>

                    {/* Column 4: Practical Marks */}
                    <TableCell className="align-top py-3 w-[170px]">
                      {item.hasPractical ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] text-muted-foreground font-medium block text-center mb-0.5">
                                Full
                              </span>
                              <Input
                                type="number"
                                min={1}
                                max={1000}
                                value={
                                  item.practicalFullMark === 0
                                    ? ''
                                    : item.practicalFullMark
                                }
                                onChange={(e) =>
                                  handlePracticalFullMarkChange(index, e.target.value)
                                }
                                disabled={disabled || isExcluded}
                                className={cn(
                                  MARK_INPUT_CLASS,
                                  item.included &&
                                    (item.practicalFullMark < 1 ||
                                      item.practicalPassMark >
                                        item.practicalFullMark) &&
                                    'border-destructive text-destructive'
                                )}
                                placeholder="25"
                              />
                            </div>
                            <span className="text-muted-foreground/50 text-sm font-semibold pt-3.5 select-none">
                              /
                            </span>
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] text-muted-foreground font-medium block text-center mb-0.5">
                                Pass
                              </span>
                              <Input
                                type="number"
                                min={0}
                                max={item.practicalFullMark || 1000}
                                value={
                                  item.practicalPassMark === 0
                                    ? '0'
                                    : item.practicalPassMark
                                }
                                onChange={(e) =>
                                  handlePracticalPassMarkChange(index, e.target.value)
                                }
                                disabled={disabled || isExcluded}
                                className={cn(
                                  MARK_INPUT_CLASS,
                                  item.included &&
                                    item.practicalPassMark >
                                      item.practicalFullMark &&
                                    'border-destructive text-destructive'
                                )}
                                placeholder="10"
                              />
                            </div>
                          </div>
                          {item.included &&
                            (item.practicalPassMark > item.practicalFullMark ||
                              item.practicalFullMark < 1) && (
                              <p className="text-[11px] text-destructive font-medium leading-tight mt-1">
                                {item.practicalPassMark > item.practicalFullMark
                                  ? 'Practical pass cannot exceed full'
                                  : 'Practical full must be ≥ 1'}
                              </p>
                            )}
                        </div>
                      ) : (
                        <div className="pt-3">
                          <button
                            type="button"
                            disabled={disabled || isExcluded}
                            onClick={() => handlePracticalToggle(index, true)}
                            className="h-8 px-2.5 rounded-lg border border-dashed border-muted-foreground/30 hover:border-primary/50 bg-muted/20 hover:bg-primary/5 text-xs text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1.5 disabled:pointer-events-none disabled:opacity-50 select-none group w-full"
                            title="Click to enable practical component"
                          >
                            <span>— Theory Only —</span>
                          </button>
                        </div>
                      )}
                    </TableCell>

                    {/* Column 5: Read-only Total Badge */}
                    <TableCell className="align-top py-3 w-[110px] text-center">
                      <div className="pt-3 flex flex-col items-center justify-center">
                        <Badge
                          variant="secondary"
                          className="text-xs font-mono font-semibold px-2.5 py-0.5 whitespace-nowrap bg-muted/80 border border-border/60 text-foreground"
                        >
                          {item.fullMark} / {item.passMark}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                          Full / Pass
                        </span>
                      </div>
                    </TableCell>

                    {/* Column 6: Teacher Assignment */}
                    <TableCell className="align-top py-3 min-w-[200px]">
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
                          className={cn(
                            'w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50',
                            !item.assignedTeacherId &&
                              item.included &&
                              'border-amber-500/80 focus:ring-amber-500 text-amber-900 dark:text-amber-100'
                          )}
                        >
                          <option value="">
                            {item.autoAssignedTeacherName
                              ? `-- None (Unassigned) --`
                              : `-- Select Grading Teacher --`}
                          </option>
                          {teachers.map((t) => (
                            <option key={t.user_id} value={t.user_id}>
                              {t.first_name} {t.last_name}
                              {item.autoAssignedTeacherId === t.user_id ? ' (Subject Teacher)' : ''}
                            </option>
                          ))}
                        </select>
                        {item.included && !item.assignedTeacherId && (
                          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                            * Grading teacher is required
                          </p>
                        )}
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
      </div>

      {/* Mobile View (< md): Comprehensive Card List */}
      <div className="md:hidden p-4 space-y-3 bg-muted/10">
        {configs.map((item, index) => {
          const isExcluded = !item.included;
          const hasError = !!item.error;

          return (
            <Card
              key={item.subjectId}
              className={cn(
                'transition-all border',
                isExcluded && 'opacity-60 bg-muted/20'
              )}
            >
              <CardContent className="p-4 space-y-3.5">
                {/* Header: Name, Code & Include checkbox */}
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

                {/* Practical Toggle + Preset Pills */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs select-none min-h-[36px]">
                    <Checkbox
                      checked={item.hasPractical}
                      onCheckedChange={(checked) =>
                        handlePracticalToggle(index, !!checked)
                      }
                      disabled={disabled || isExcluded}
                    />
                    <span
                      className={cn(
                        'text-xs font-medium flex items-center gap-1',
                        item.hasPractical
                          ? 'text-primary font-semibold'
                          : 'text-muted-foreground'
                      )}
                    >
                      <FlaskConical className="w-3.5 h-3.5" />
                      Practical
                    </span>
                  </label>

                  <div className="flex items-center gap-1 overflow-x-auto py-1">
                    {(['75_25', '80_20', '50_50', '100_TH'] as const).map((key) => {
                      const p = EXAM_MARK_PRESETS[key];
                      const isCurrent =
                        item.hasPractical === p.hasPractical &&
                        item.theoryFullMark === p.theoryFullMark &&
                        item.theoryPassMark === p.theoryPassMark &&
                        item.practicalFullMark === p.practicalFullMark &&
                        item.practicalPassMark === p.practicalPassMark;

                      return (
                        <button
                          key={key}
                          type="button"
                          disabled={disabled || isExcluded}
                          onClick={() => handlePresetSelect(index, key)}
                          className={cn(
                            'text-[10px] px-2 py-1 rounded-md border transition-colors font-medium min-h-[32px] shrink-0',
                            isCurrent
                              ? 'bg-primary text-primary-foreground border-primary shadow-xs font-semibold'
                              : 'bg-background hover:bg-muted text-muted-foreground border-input'
                          )}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Theory Inputs */}
                <div className="space-y-1.5 p-3 rounded-lg bg-muted/20 border border-border/50">
                  <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Theory Marks</span>
                    <span className="text-[11px] text-muted-foreground font-normal">Full / Pass</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] text-muted-foreground font-medium block mb-1">
                        Theory Full
                      </label>
                      <Input
                        type="number"
                        min={1}
                        max={1000}
                        value={item.theoryFullMark === 0 ? '' : item.theoryFullMark}
                        onChange={(e) =>
                          handleTheoryFullMarkChange(index, e.target.value)
                        }
                        disabled={disabled || isExcluded}
                        className={cn(
                          'w-full h-10 text-sm font-semibold font-mono text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                          item.included &&
                            (item.theoryFullMark < 1 ||
                              item.theoryPassMark > item.theoryFullMark) &&
                            'border-destructive text-destructive'
                        )}
                        placeholder="75"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground font-medium block mb-1">
                        Theory Pass
                      </label>
                      <Input
                        type="number"
                        min={0}
                        max={item.theoryFullMark || 1000}
                        value={item.theoryPassMark === 0 ? '0' : item.theoryPassMark}
                        onChange={(e) =>
                          handleTheoryPassMarkChange(index, e.target.value)
                        }
                        disabled={disabled || isExcluded}
                        className={cn(
                          'w-full h-10 text-sm font-semibold font-mono text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                          item.included &&
                            item.theoryPassMark > item.theoryFullMark &&
                            'border-destructive text-destructive'
                        )}
                        placeholder="27"
                      />
                    </div>
                  </div>
                  {item.included &&
                    (item.theoryPassMark > item.theoryFullMark ||
                      item.theoryFullMark < 1) && (
                      <p className="text-[11px] text-destructive font-medium leading-tight mt-1">
                        {item.theoryPassMark > item.theoryFullMark
                          ? 'Theory pass cannot exceed full'
                          : 'Theory full must be ≥ 1'}
                      </p>
                    )}
                </div>

                {/* Practical Inputs (when active) */}
                {item.hasPractical ? (
                  <div className="space-y-1.5 p-3 rounded-lg bg-muted/20 border border-border/50">
                    <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span>Practical Marks</span>
                      <span className="text-[11px] text-muted-foreground font-normal">Full / Pass</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[11px] text-muted-foreground font-medium block mb-1">
                          Practical Full
                        </label>
                        <Input
                          type="number"
                          min={1}
                          max={1000}
                          value={
                            item.practicalFullMark === 0
                              ? ''
                              : item.practicalFullMark
                          }
                          onChange={(e) =>
                            handlePracticalFullMarkChange(index, e.target.value)
                          }
                          disabled={disabled || isExcluded}
                          className={cn(
                            'w-full h-10 text-sm font-semibold font-mono text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                            item.included &&
                              (item.practicalFullMark < 1 ||
                                item.practicalPassMark > item.practicalFullMark) &&
                              'border-destructive text-destructive'
                          )}
                          placeholder="25"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-muted-foreground font-medium block mb-1">
                          Practical Pass
                        </label>
                        <Input
                          type="number"
                          min={0}
                          max={item.practicalFullMark || 1000}
                          value={
                            item.practicalPassMark === 0
                              ? '0'
                              : item.practicalPassMark
                          }
                          onChange={(e) =>
                            handlePracticalPassMarkChange(index, e.target.value)
                          }
                          disabled={disabled || isExcluded}
                          className={cn(
                            'w-full h-10 text-sm font-semibold font-mono text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                            item.included &&
                              item.practicalPassMark > item.practicalFullMark &&
                              'border-destructive text-destructive'
                          )}
                          placeholder="10"
                        />
                      </div>
                    </div>
                    {item.included &&
                      (item.practicalPassMark > item.practicalFullMark ||
                        item.practicalFullMark < 1) && (
                        <p className="text-[11px] text-destructive font-medium leading-tight mt-1">
                          {item.practicalPassMark > item.practicalFullMark
                            ? 'Practical pass cannot exceed full'
                            : 'Practical full must be ≥ 1'}
                        </p>
                      )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/10">
                    <span className="text-xs text-muted-foreground italic">— Theory Only —</span>
                    <button
                      type="button"
                      disabled={disabled || isExcluded}
                      onClick={() => handlePracticalToggle(index, true)}
                      className="text-xs text-primary hover:underline font-medium min-h-[36px] flex items-center gap-1 disabled:opacity-50"
                    >
                      <FlaskConical className="w-3.5 h-3.5" />
                      <span>+ Enable Practical</span>
                    </button>
                  </div>
                )}

                {/* Total Marks Banner */}
                <div className="flex items-center justify-between bg-muted/40 p-2.5 rounded-lg text-xs">
                  <span className="font-medium text-muted-foreground">
                    Combined Total:
                  </span>
                  <Badge variant="secondary" className="font-mono font-semibold text-xs px-2.5 py-1 bg-muted/80 border border-border/60 text-foreground">
                    {item.fullMark} Marks (Pass {item.passMark})
                  </Badge>
                </div>

                {/* Error Banner */}
                {hasError && item.included && (
                  <div className="text-xs text-destructive flex items-center gap-1.5 font-medium bg-destructive/10 p-2 rounded-md">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{item.error}</span>
                  </div>
                )}

                {/* Teacher Selection */}
                <div className="space-y-1.5 pt-1 border-t">
                  <div className="flex items-center justify-between gap-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Grading Teacher <span className="text-destructive">*</span>
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
                    className={cn(
                      'w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50',
                      !item.assignedTeacherId &&
                        item.included &&
                        'border-amber-500/80 focus:ring-amber-500 text-amber-900 dark:text-amber-100'
                    )}
                  >
                    <option value="">
                      {item.autoAssignedTeacherName
                        ? `-- None (Unassigned) --`
                        : `-- Select Grading Teacher --`}
                    </option>
                    {teachers.map((t) => (
                      <option key={t.user_id} value={t.user_id}>
                        {t.first_name} {t.last_name}
                        {item.autoAssignedTeacherId === t.user_id ? ' (Subject Teacher)' : ''}
                      </option>
                    ))}
                  </select>
                  {item.included && !item.assignedTeacherId && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                      * Grading teacher is required
                    </p>
                  )}
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
