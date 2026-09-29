import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTenantRollover } from '../hooks';
import { academicYearApi } from '../api';
import {
  tenantRolloverSchema,
  type TenantRolloverForm,
  type TenantRolloverSummaryResponse,
  type RolloverPreviewResponse,
  type RolloverAction,
  type StudentRolloverOverride,
} from '../schema';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { NepaliDatePicker } from '@/components/ui/nepali-date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertCircle,
  CheckCircle2,
  GraduationCap,
  Loader2,
  RefreshCw,
  Users,
  BookOpen,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  LogOut,
  Check,
  UserCheck,
  UserMinus,
  Sparkles,
} from 'lucide-react';
import { formatDualDateRange } from '@/features/school-settings/utils/nepaliDate';
import { useCalendarPreferenceStore } from '@/stores/calendarPreferenceStore';
import { toast } from 'sonner';

export interface TenantRolloverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  tenantName?: string;
}

export const TenantRolloverDialog: React.FC<TenantRolloverDialogProps> = ({
  open,
  onOpenChange,
  tenantId,
  tenantName,
}) => {
  const { calendarSystem } = useCalendarPreferenceStore();
  const rolloverMutation = useTenantRollover();

  // Wizard state
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [summary, setSummary] = useState<TenantRolloverSummaryResponse | null>(null);
  const [previewData, setPreviewData] = useState<RolloverPreviewResponse | null>(null);
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);
  const [activeClassId, setActiveClassId] = useState<string>('');
  const [overrides, setOverrides] = useState<Record<string, RolloverAction>>({});

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<TenantRolloverForm>({
    resolver: zodResolver(tenantRolloverSchema),
    defaultValues: {
      name: '',
      start_date: '',
      end_date: '',
      copy_teacher_assignments: true,
    },
  });

  const startDate = watch('start_date');
  const endDate = watch('end_date');
  const sessionName = watch('name');
  const copyAssignments = watch('copy_teacher_assignments');

  const handleClose = () => {
    reset();
    setSummary(null);
    setPreviewData(null);
    setOverrides({});
    setActiveClassId('');
    setCurrentStep(1);
    onOpenChange(false);
  };

  // Step 1 -> Step 2: Validate & Fetch Preview
  const handleProceedToStep2 = async () => {
    const isValid = await trigger(['name', 'start_date', 'end_date', 'copy_teacher_assignments']);
    if (!isValid) return;

    setIsFetchingPreview(true);
    try {
      const data = await academicYearApi.previewRollover(tenantId);
      setPreviewData(data);
      if (data.classes.length > 0 && !activeClassId) {
        setActiveClassId(data.classes[0].class_id);
      }
      setCurrentStep(2);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to fetch rollover preview';
      toast.error('Preview Error', { description: msg });
    } finally {
      setIsFetchingPreview(false);
    }
  };

  // Live computed metrics across all students in all classes
  const liveMetrics = useMemo(() => {
    if (!previewData) {
      return { total: 0, promote: 0, retain: 0, transfer: 0, graduate: 0 };
    }

    let total = 0;
    let promote = 0;
    let retain = 0;
    let transfer = 0;
    let graduate = 0;

    for (const cls of previewData.classes) {
      for (const st of cls.students) {
        total++;
        const effectiveAction = overrides[st.student_id] ?? st.default_action;
        if (effectiveAction === 'RETAIN') {
          retain++;
        } else if (effectiveAction === 'TRANSFER') {
          transfer++;
        } else if (effectiveAction === 'GRADUATE') {
          graduate++;
        } else {
          // PROMOTE
          if (st.target_class_id) {
            promote++;
          } else {
            // Student in terminal class without target class graduates
            graduate++;
          }
        }
      }
    }

    return { total, promote, retain, transfer, graduate };
  }, [previewData, overrides]);

  // Selected class
  const activeClass = useMemo(() => {
    if (!previewData) return null;
    return (
      previewData.classes.find((c) => c.class_id === activeClassId) ||
      previewData.classes[0] ||
      null
    );
  }, [previewData, activeClassId]);

  // Handle student action override
  const handleActionChange = (
    studentId: string,
    action: RolloverAction,
    defaultAction: RolloverAction
  ) => {
    setOverrides((prev) => {
      if (action === defaultAction) {
        const next = { ...prev };
        delete next[studentId];
        return next;
      }
      return {
        ...prev,
        [studentId]: action,
      };
    });
  };

  // Reset overrides for a specific class
  const handleResetClassOverrides = (classId: string) => {
    const cls = previewData?.classes.find((c) => c.class_id === classId);
    if (!cls) return;
    setOverrides((prev) => {
      const next = { ...prev };
      for (const st of cls.students) {
        delete next[st.student_id];
      }
      return next;
    });
  };

  // Check how many overrides exist in a specific class
  const getClassOverrideCount = (classId: string) => {
    const cls = previewData?.classes.find((c) => c.class_id === classId);
    if (!cls) return 0;
    return cls.students.filter((st) => overrides[st.student_id] !== undefined).length;
  };

  // Final execution of rollover
  const handleExecuteRollover = async () => {
    const formValues = getValues();
    const studentOverrides: StudentRolloverOverride[] = Object.entries(overrides).map(
      ([student_id, action]) => ({
        student_id,
        action,
      })
    );

    try {
      const res = await rolloverMutation.mutateAsync({
        tenantId,
        data: {
          name: formValues.name,
          start_date: formValues.start_date,
          end_date: formValues.end_date,
          copy_teacher_assignments: formValues.copy_teacher_assignments,
          student_overrides: studentOverrides.length > 0 ? studentOverrides : undefined,
        },
      });
      setSummary(res);
    } catch {
      // Error handled by mutation onError toast
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) {
          if (!rolloverMutation.isPending && !isFetchingPreview) handleClose();
        } else {
          onOpenChange(val);
        }
      }}
    >
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-6">
        <DialogHeader className="shrink-0 pb-3 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <RefreshCw className="w-5 h-5 text-amber-600" />
              Promotion & Rollover Wizard
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            Roll over {tenantName || 'school'} to a new academic session with selective student promotions, grade retentions, and transfers.
          </DialogDescription>

          {/* Wizard Step Indicator */}
          {!summary && (
            <div className="flex items-center justify-between mt-3 pt-2 text-xs">
              <div
                className={`flex items-center gap-2 ${
                  currentStep === 1
                    ? 'font-bold text-primary'
                    : currentStep > 1
                    ? 'text-muted-foreground'
                    : 'text-muted-foreground/60'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                    currentStep === 1
                      ? 'bg-primary text-primary-foreground'
                      : currentStep > 1
                      ? 'bg-emerald-500 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {currentStep > 1 ? <Check className="w-3.5 h-3.5" /> : '1'}
                </span>
                <span>1. Session Timeline</span>
              </div>

              <div className="h-0.5 flex-1 mx-3 bg-muted" />

              <div
                className={`flex items-center gap-2 ${
                  currentStep === 2
                    ? 'font-bold text-primary'
                    : currentStep > 2
                    ? 'text-muted-foreground'
                    : 'text-muted-foreground/60'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                    currentStep === 2
                      ? 'bg-primary text-primary-foreground'
                      : currentStep > 2
                      ? 'bg-emerald-500 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {currentStep > 2 ? <Check className="w-3.5 h-3.5" /> : '2'}
                </span>
                <span>2. Cohort Staging & Overrides</span>
              </div>

              <div className="h-0.5 flex-1 mx-3 bg-muted" />

              <div
                className={`flex items-center gap-2 ${
                  currentStep === 3
                    ? 'font-bold text-primary'
                    : 'text-muted-foreground/60'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                    currentStep === 3
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  3
                </span>
                <span>3. Verification & Execution</span>
              </div>
            </div>
          )}
        </DialogHeader>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-3">
          {summary ? (
            /* Post-Execution Summary View */
            <div className="space-y-5">
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-5 text-green-900 dark:text-green-200 flex items-start gap-4">
                <CheckCircle2 className="h-6 w-6 shrink-0 text-green-600 dark:text-green-400 mt-0.5" />
                <div>
                  <h4 className="text-base font-semibold text-green-800 dark:text-green-300">
                    Academic Rollover Completed Successfully
                  </h4>
                  <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                    Academic session <strong>{summary.academic_year_name}</strong> is now the active academic year for{' '}
                    <strong>{tenantName || 'your school'}</strong>. Student records and cohort enrollments have been committed.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="rounded-lg border p-3.5 text-center bg-muted/40">
                  <div className="flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-medium mb-1">
                    <UserCheck className="w-4 h-4" />
                    <span>Promoted</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{summary.total_students_promoted}</p>
                </div>

                <div className="rounded-lg border p-3.5 text-center bg-muted/40">
                  <div className="flex items-center justify-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs font-medium mb-1">
                    <RotateCcw className="w-4 h-4" />
                    <span>Retained</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{summary.total_students_retained}</p>
                </div>

                <div className="rounded-lg border p-3.5 text-center bg-muted/40">
                  <div className="flex items-center justify-center gap-1.5 text-rose-600 dark:text-rose-400 text-xs font-medium mb-1">
                    <UserMinus className="w-4 h-4" />
                    <span>Transferred</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{summary.total_students_transferred}</p>
                </div>

                <div className="rounded-lg border p-3.5 text-center bg-muted/40">
                  <div className="flex items-center justify-center gap-1.5 text-blue-600 dark:text-blue-400 text-xs font-medium mb-1">
                    <GraduationCap className="w-4 h-4" />
                    <span>Graduated</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{summary.total_students_graduated}</p>
                </div>

                <div className="rounded-lg border p-3.5 text-center bg-muted/40 col-span-2 sm:col-span-1">
                  <div className="flex items-center justify-center gap-1.5 text-purple-600 dark:text-purple-400 text-xs font-medium mb-1">
                    <BookOpen className="w-4 h-4" />
                    <span>Faculty Copied</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{summary.teacher_assignments_copied}</p>
                </div>
              </div>
            </div>
          ) : currentStep === 1 ? (
            /* Step 1: Session Timeline & Details */
            <div className="space-y-4 pt-1">
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 text-amber-900 dark:text-amber-200 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="text-xs leading-relaxed space-y-1">
                  <p className="font-semibold text-amber-800 dark:text-amber-300">
                    Important Rollover Rules:
                  </p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>The current active academic session will be marked closed and archived.</li>
                    <li>Students will sequentially advance to the next class based on class sequence ordering.</li>
                    <li>In Step 2, you can retain individual students in their current grade or mark withdrawals/transfers.</li>
                    <li>Students in the final graduating class will transition to Alumni.</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tenant-rollover-name">
                  New Academic Session Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="tenant-rollover-name"
                  placeholder="e.g. Academic Session 2083/2084"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <NepaliDatePicker
                  id="tenant-rollover-start-date"
                  label="Start Date *"
                  value={startDate}
                  onChange={(val) => setValue('start_date', val, { shouldValidate: true })}
                  error={errors.start_date?.message}
                />
                <NepaliDatePicker
                  id="tenant-rollover-end-date"
                  label="End Date *"
                  value={endDate}
                  onChange={(val) => setValue('end_date', val, { shouldValidate: true })}
                  error={errors.end_date?.message}
                />
              </div>

              {startDate && endDate && (
                <div className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded border flex items-center justify-between">
                  <span className="font-medium text-foreground">Calculated Duration:</span>
                  <span className="font-semibold text-primary">
                    {formatDualDateRange(startDate, endDate, calendarSystem)}
                  </span>
                </div>
              )}

              <div className="rounded-lg border p-3.5 bg-muted/20">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="copy_teacher_assignments"
                    checked={copyAssignments}
                    onCheckedChange={(checked) =>
                      setValue('copy_teacher_assignments', !!checked, { shouldValidate: true })
                    }
                    className="mt-0.5"
                  />
                  <div className="space-y-1 leading-none">
                    <Label
                      htmlFor="copy_teacher_assignments"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Preserve Teacher Class & Subject Assignments
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically replicate class teacher and subject teacher allocations into the new academic year.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : currentStep === 2 ? (
            /* Step 2: Cohort Staging & Student Overrides */
            <div className="space-y-4">
              {/* Top Summary Badge Bar with Live Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/30">
                  <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide">
                      Total
                    </div>
                    <div className="text-sm font-bold truncate">{liveMetrics.total} Students</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-md border border-emerald-500/20 bg-emerald-500/10">
                  <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300 tracking-wide">
                      Promoting
                    </div>
                    <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300 truncate">
                      {liveMetrics.promote}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-md border border-amber-500/20 bg-amber-500/10">
                  <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300 tracking-wide">
                      Retaining
                    </div>
                    <div className="text-sm font-bold text-amber-700 dark:text-amber-300 truncate">
                      {liveMetrics.retain}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-md border border-rose-500/20 bg-rose-500/10">
                  <UserMinus className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-300 tracking-wide">
                      Transferring
                    </div>
                    <div className="text-sm font-bold text-rose-700 dark:text-rose-300 truncate">
                      {liveMetrics.transfer}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-md border border-blue-500/20 bg-blue-500/10 col-span-2 sm:col-span-1">
                  <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300 tracking-wide">
                      Graduating
                    </div>
                    <div className="text-sm font-bold text-blue-700 dark:text-blue-300 truncate">
                      {liveMetrics.graduate}
                    </div>
                  </div>
                </div>
              </div>

              {/* Class Tabs */}
              {previewData && previewData.classes.length > 0 ? (
                <div className="space-y-3">
                  <div className="border-b pb-2">
                    <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
                      {previewData.classes.map((cls) => {
                        const isSelected = cls.class_id === activeClass?.class_id;
                        const classOverrideCount = getClassOverrideCount(cls.class_id);

                        return (
                          <button
                            key={cls.class_id}
                            type="button"
                            onClick={() => setActiveClassId(cls.class_id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-2 border ${
                              isSelected
                                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                : 'bg-muted/40 hover:bg-muted text-foreground border-transparent'
                            }`}
                          >
                            <span>{cls.class_name}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                isSelected
                                  ? 'bg-primary-foreground/20 text-primary-foreground'
                                  : 'bg-muted-foreground/15 text-muted-foreground'
                              }`}
                            >
                              {cls.total_students}
                            </span>
                            {classOverrideCount > 0 && (
                              <span
                                className={`text-[10px] font-bold px-1 rounded-full ${
                                  isSelected
                                    ? 'bg-amber-300 text-amber-950'
                                    : 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
                                }`}
                              >
                                {classOverrideCount} edited
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Active Class Header & Actions */}
                  {activeClass && (
                    <div className="flex items-center justify-between bg-muted/20 px-3 py-2 rounded-md border text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{activeClass.class_name}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground">
                          {activeClass.target_class_name ? (
                            <>
                              Advances to:{' '}
                              <strong className="text-foreground">{activeClass.target_class_name}</strong>
                            </>
                          ) : (
                            <strong className="text-blue-600 dark:text-blue-400">
                              Final Grade (Graduating to Alumni)
                            </strong>
                          )}
                        </span>
                      </div>

                      {getClassOverrideCount(activeClass.class_id) > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => handleResetClassOverrides(activeClass.class_id)}
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Reset Class Overrides
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Student Table */}
                  <div className="rounded-md border overflow-hidden">
                    <div className="max-h-[300px] overflow-y-auto">
                      <Table>
                        <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur z-10">
                          <TableRow>
                            <TableHead className="w-[30%]">Student Name</TableHead>
                            <TableHead className="w-[15%]">Section</TableHead>
                            <TableHead className="w-[30%]">Target Progression</TableHead>
                            <TableHead className="w-[25%] text-right">Rollover Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activeClass && activeClass.students.length > 0 ? (
                            activeClass.students.map((student) => {
                              const effectiveAction =
                                overrides[student.student_id] ?? student.default_action;

                              return (
                                <TableRow key={student.student_id}>
                                  <TableCell className="font-medium text-xs py-2.5">
                                    {student.name}
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground py-2.5">
                                    {student.current_section_name || '—'}
                                  </TableCell>
                                  <TableCell className="py-2.5">
                                    {effectiveAction === 'RETAIN' ? (
                                      <Badge
                                        variant="outline"
                                        className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 flex items-center gap-1 w-fit"
                                      >
                                        <RotateCcw className="w-3 h-3" />
                                        {student.current_class_name} (Repeat)
                                      </Badge>
                                    ) : effectiveAction === 'TRANSFER' ? (
                                      <Badge
                                        variant="outline"
                                        className="text-xs bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 flex items-center gap-1 w-fit"
                                      >
                                        <LogOut className="w-3 h-3" />
                                        Transfer Out
                                      </Badge>
                                    ) : effectiveAction === 'GRADUATE' || !student.target_class_id ? (
                                      <Badge
                                        variant="outline"
                                        className="text-xs bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 flex items-center gap-1 w-fit"
                                      >
                                        <GraduationCap className="w-3 h-3" />
                                        Alumni (Graduated)
                                      </Badge>
                                    ) : (
                                      <Badge
                                        variant="outline"
                                        className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1 w-fit"
                                      >
                                        <ArrowRight className="w-3 h-3" />
                                        {student.current_class_name} → {student.target_class_name}
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right py-2.5">
                                    <Select
                                      value={effectiveAction}
                                      onValueChange={(val) =>
                                        handleActionChange(
                                          student.student_id,
                                          val as RolloverAction,
                                          student.default_action
                                        )
                                      }
                                    >
                                      <SelectTrigger className="w-[170px] h-8 text-xs ml-auto">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent align="end">
                                        <SelectItem value="PROMOTE">
                                          <div className="flex items-center gap-1.5">
                                            <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
                                            <span>Promote</span>
                                          </div>
                                        </SelectItem>
                                        <SelectItem value="RETAIN">
                                          <div className="flex items-center gap-1.5">
                                            <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                                            <span>Retain in Current Grade</span>
                                          </div>
                                        </SelectItem>
                                        <SelectItem value="TRANSFER">
                                          <div className="flex items-center gap-1.5">
                                            <LogOut className="w-3.5 h-3.5 text-rose-600" />
                                            <span>Transfer Out</span>
                                          </div>
                                        </SelectItem>
                                        <SelectItem value="GRADUATE">
                                          <div className="flex items-center gap-1.5">
                                            <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                                            <span>Graduate</span>
                                          </div>
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          ) : (
                            <TableRow>
                              <TableCell colSpan={4} className="h-24 text-center text-xs text-muted-foreground">
                                No active students currently enrolled in this class.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center border rounded-lg text-sm text-muted-foreground">
                  No classes or students found to roll over.
                </div>
              )}
            </div>
          ) : (
            /* Step 3: Verification Scorecard & Execution */
            <div className="space-y-4 pt-1">
              <div className="rounded-lg border p-4 bg-muted/20 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Rollover Plan Scorecard
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">New Academic Session: </span>
                    <span className="font-semibold text-foreground">{sessionName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Duration: </span>
                    <span className="font-semibold text-foreground">
                      {formatDualDateRange(startDate, endDate, calendarSystem)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Replicate Faculty Assignments: </span>
                    <span className="font-semibold text-foreground">
                      {copyAssignments ? 'Yes (Replicated)' : 'No (Start Empty)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Custom Student Overrides: </span>
                    <span className="font-semibold text-foreground">
                      {Object.keys(overrides).length > 0
                        ? `${Object.keys(overrides).length} students customized`
                        : 'None (Default Progression)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Scorecard metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg border p-3 text-center bg-muted/40">
                  <div className="text-xs text-muted-foreground mb-1 font-medium">Total Cohort</div>
                  <div className="text-xl font-bold text-foreground">{liveMetrics.total}</div>
                </div>

                <div className="rounded-lg border p-3 text-center border-emerald-500/30 bg-emerald-500/10">
                  <div className="text-xs text-emerald-700 dark:text-emerald-400 mb-1 font-medium">
                    Total Promoted
                  </div>
                  <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                    {liveMetrics.promote}
                  </div>
                </div>

                <div
                  className={`rounded-lg border p-3 text-center ${
                    liveMetrics.retain > 0
                      ? 'border-amber-500/40 bg-amber-500/15'
                      : 'bg-muted/40'
                  }`}
                >
                  <div
                    className={`text-xs mb-1 font-medium ${
                      liveMetrics.retain > 0
                        ? 'text-amber-700 dark:text-amber-300 font-semibold'
                        : 'text-muted-foreground'
                    }`}
                  >
                    Total Retained
                  </div>
                  <div
                    className={`text-xl font-bold ${
                      liveMetrics.retain > 0
                        ? 'text-amber-700 dark:text-amber-300'
                        : 'text-foreground'
                    }`}
                  >
                    {liveMetrics.retain}
                  </div>
                </div>

                <div
                  className={`rounded-lg border p-3 text-center ${
                    liveMetrics.transfer > 0
                      ? 'border-rose-500/40 bg-rose-500/15'
                      : 'bg-muted/40'
                  }`}
                >
                  <div
                    className={`text-xs mb-1 font-medium ${
                      liveMetrics.transfer > 0
                        ? 'text-rose-700 dark:text-rose-300 font-semibold'
                        : 'text-muted-foreground'
                    }`}
                  >
                    Total Transferred
                  </div>
                  <div
                    className={`text-xl font-bold ${
                      liveMetrics.transfer > 0
                        ? 'text-rose-700 dark:text-rose-300'
                        : 'text-foreground'
                    }`}
                  >
                    {liveMetrics.transfer}
                  </div>
                </div>
              </div>

              {/* List of customized students if any */}
              {Object.keys(overrides).length > 0 && previewData && (
                <div className="rounded-lg border p-3 space-y-2 max-h-40 overflow-y-auto">
                  <div className="text-xs font-semibold text-muted-foreground">
                    Customized Student Overrides ({Object.keys(overrides).length})
                  </div>
                  <div className="space-y-1.5">
                    {Object.entries(overrides).map(([studentId, action]) => {
                      let studentName = studentId;
                      let className = '';

                      for (const cls of previewData.classes) {
                        const found = cls.students.find((s) => s.student_id === studentId);
                        if (found) {
                          studentName = found.name;
                          className = cls.class_name;
                          break;
                        }
                      }

                      return (
                        <div
                          key={studentId}
                          className="flex items-center justify-between text-xs py-1 px-2 rounded bg-muted/40"
                        >
                          <span className="font-medium text-foreground">
                            {studentName} ({className})
                          </span>
                          {action === 'RETAIN' ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-500/30"
                            >
                              Retained in Current Grade
                            </Badge>
                          ) : action === 'TRANSFER' ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-rose-500/10 text-rose-700 border-rose-500/30"
                            >
                              Transfer Out
                            </Badge>
                          ) : action === 'GRADUATE' ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-blue-500/10 text-blue-700 border-blue-500/30"
                            >
                              Graduate (Alumni)
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
                            >
                              Promote
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Caution Callout */}
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 text-amber-900 dark:text-amber-200 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <p className="text-xs leading-relaxed">
                  This action will archive the current session, promote student cohorts, and create active records for the new session.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Dialog Footer Actions */}
        <DialogFooter className="shrink-0 pt-3 border-t flex items-center justify-between sm:justify-between w-full">
          {summary ? (
            <div className="w-full flex justify-end">
              <Button type="button" onClick={handleClose}>
                Done
              </Button>
            </div>
          ) : currentStep === 1 ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isFetchingPreview}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleProceedToStep2}
                disabled={isFetchingPreview}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isFetchingPreview && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isFetchingPreview ? 'Preparing Staging...' : 'Next: Review Students'}
                {!isFetchingPreview && <ChevronRight className="ml-1 h-4 w-4" />}
              </Button>
            </>
          ) : currentStep === 2 ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(1)}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back to Session Details
              </Button>
              <Button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Next: Final Review
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(2)}
                disabled={rolloverMutation.isPending}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={handleExecuteRollover}
                disabled={rolloverMutation.isPending}
              >
                {rolloverMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {rolloverMutation.isPending ? 'Executing Rollover...' : 'Execute Rollover'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
