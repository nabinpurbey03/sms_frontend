import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTenantRollover, useAcademicYearStatus } from '../hooks';
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
import { useNavigate } from '@tanstack/react-router';
import { useCleanupEmptySections } from '@/features/academic/hooks';
import {
  AlertCircle,
  AlertTriangle,
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
  Bus,
  Wallet,
  Receipt,
} from 'lucide-react';
import { formatDualDateRange } from '@/features/school-settings/utils/nepaliDate';
import { useCalendarPreferenceStore } from '@/stores/calendarPreferenceStore';
import { useRolloverFinancialAudit } from '@/features/finance/hooks';
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
  const cleanupMutation = useCleanupEmptySections();
  const { data: statusData } = useAcademicYearStatus(tenantId);
  const { data: financialAudit, isLoading: isAuditLoading, error: auditError } = useRolloverFinancialAudit(tenantId, open);
  const navigate = useNavigate();

  // Wizard state: Step 0 (Financial Audit) -> Step 1 (Session Details) -> Step 2 (Student Preview) -> Step 3 (Summary/Execution)
  const [currentStep, setCurrentStep] = useState<0 | 1 | 2 | 3>(0);
  const [financialAuditAcknowledged, setFinancialAuditAcknowledged] = useState(false);
  const [summary, setSummary] = useState<TenantRolloverSummaryResponse | null>(null);
  const [previewData, setPreviewData] = useState<RolloverPreviewResponse | null>(null);
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);
  const [activeClassId, setActiveClassId] = useState<string>('');
  const [overrides, setOverrides] = useState<Record<string, RolloverAction>>({});
  const [isCleanupConfirmOpen, setIsCleanupConfirmOpen] = useState(false);

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
      copy_student_facilities: true,
    },
  });

  const startDate = watch('start_date');
  const endDate = watch('end_date');
  const sessionName = watch('name');
  const copyAssignments = watch('copy_teacher_assignments');
  const copyFacilities = watch('copy_student_facilities');

  const handleClose = () => {
    reset();
    setSummary(null);
    setPreviewData(null);
    setOverrides({});
    setActiveClassId('');
    setFinancialAuditAcknowledged(false);
    setCurrentStep(0);
    setIsCleanupConfirmOpen(false);
    onOpenChange(false);
  };

  const handleCleanupEmptySections = async () => {
    try {
      const secIds = summary?.empty_sections?.map((s) => s.section_id);
      const res = await cleanupMutation.mutateAsync({
        tenantId,
        sectionIds: secIds,
      });
      const deletedCount = res?.deleted_count ?? (secIds?.length || 0);
      toast.success(`Successfully cleaned up ${deletedCount} empty section(s).`);

      setSummary((prev) => {
        if (!prev) return null;
        const deletedIds = new Set(
          res?.deleted_sections?.map((d) => d.section_id) || secIds || []
        );
        const remaining = (prev.empty_sections || []).filter(
          (s) => !deletedIds.has(s.section_id)
        );
        return {
          ...prev,
          empty_sections_count: remaining.length,
          empty_sections: remaining,
        };
      });
      setIsCleanupConfirmOpen(false);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to clean up empty sections';
      toast.error('Cleanup Error', { description: msg });
    }
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
          copy_student_facilities: formValues.copy_student_facilities,
          financial_audit_acknowledged: true,
          student_overrides: studentOverrides.length > 0 ? studentOverrides : undefined,
        },
      });
      setSummary(res);
    } catch {
      // Error handled by mutation onError toast
    }
  };

  return (
    <>
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
                className={`flex items-center gap-1.5 ${
                  currentStep === 0
                    ? 'font-bold text-primary'
                    : currentStep > 0
                    ? 'text-muted-foreground'
                    : 'text-muted-foreground/60'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                    currentStep === 0
                      ? 'bg-primary text-primary-foreground'
                      : currentStep > 0
                      ? 'bg-emerald-500 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {currentStep > 0 ? <Check className="w-3 h-3" /> : '0'}
                </span>
                <span>0. Financial Audit</span>
              </div>

              <div className="h-0.5 flex-1 mx-2 bg-muted" />

              <div
                className={`flex items-center gap-1.5 ${
                  currentStep === 1
                    ? 'font-bold text-primary'
                    : currentStep > 1
                    ? 'text-muted-foreground'
                    : 'text-muted-foreground/60'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                    currentStep === 1
                      ? 'bg-primary text-primary-foreground'
                      : currentStep > 1
                      ? 'bg-emerald-500 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {currentStep > 1 ? <Check className="w-3 h-3" /> : '1'}
                </span>
                <span>1. Session Details</span>
              </div>

              <div className="h-0.5 flex-1 mx-2 bg-muted" />

              <div
                className={`flex items-center gap-1.5 ${
                  currentStep === 2
                    ? 'font-bold text-primary'
                    : currentStep > 2
                    ? 'text-muted-foreground'
                    : 'text-muted-foreground/60'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                    currentStep === 2
                      ? 'bg-primary text-primary-foreground'
                      : currentStep > 2
                      ? 'bg-emerald-500 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {currentStep > 2 ? <Check className="w-3 h-3" /> : '2'}
                </span>
                <span>2. Student Preview</span>
              </div>

              <div className="h-0.5 flex-1 mx-2 bg-muted" />

              <div
                className={`flex items-center gap-1.5 ${
                  currentStep === 3
                    ? 'font-bold text-primary'
                    : 'text-muted-foreground/60'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                    currentStep === 3
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  3
                </span>
                <span>3. Summary</span>
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

              {(summary.transport_profiles_carried_forward !== undefined ||
                summary.student_facilities_carried_forward !== undefined) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg border p-3 bg-muted/30 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <Bus className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground font-medium">Transport Subscriptions Carried Forward</div>
                      <div className="text-lg font-bold text-foreground">
                        {summary.transport_profiles_carried_forward ?? 0}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border p-3 bg-muted/30 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground font-medium">Facility Assignments Preserved</div>
                      <div className="text-lg font-bold text-foreground">
                        {summary.student_facilities_carried_forward ?? 0}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Empty Sections Audit Card */}
              {summary.empty_sections_count && summary.empty_sections_count > 0 ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                        Attention: Empty Sections Detected ({summary.empty_sections_count})
                      </h4>
                      <p className="text-xs text-amber-900/90 dark:text-amber-300/90 leading-relaxed">
                        Some sections have 0 students enrolled for session {summary.academic_year_name}. School policy requires active sections to have students; empty sections distort attendance tracking and block creating new sections (minimum 20 students rule).
                      </p>
                    </div>
                  </div>

                  {summary.empty_sections && summary.empty_sections.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {summary.empty_sections.map((sec) => (
                        <Badge
                          key={sec.section_id}
                          variant="outline"
                          className="bg-amber-500/15 border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs px-2.5 py-1"
                        >
                          {sec.class_name} - Section {sec.section_name}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setIsCleanupConfirmOpen(true)}
                      disabled={cleanupMutation.isPending}
                      className="h-8 text-xs font-semibold"
                    >
                      {cleanupMutation.isPending && (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      )}
                      Clean Up Empty Sections Now
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleClose();
                        navigate({ to: '/academic/classes' });
                      }}
                      className="h-8 text-xs font-semibold border-amber-500/40 text-amber-950 dark:text-amber-200 hover:bg-amber-500/20"
                    >
                      Review in Classes Page
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : currentStep === 0 ? (
            /* Step 0: Pre-Rollover Financial Audit */
            <div className="space-y-4 pt-1">
              {isAuditLoading ? (
                <div className="p-12 text-center border rounded-lg bg-muted/20 space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                  <p className="text-sm font-semibold text-foreground">
                    Analyzing outgoing session finances & receivables...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Compiling total billed, collected revenue, uncollected arrears, and student credit wallets.
                  </p>
                </div>
              ) : auditError ? (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-sm">Failed to load pre-rollover financial audit</p>
                    <p>
                      {(auditError as any)?.response?.data?.message ||
                        (auditError as any)?.message ||
                        'An error occurred while compiling the financial audit.'}
                    </p>
                  </div>
                </div>
              ) : financialAudit ? (
                <>
                  {/* Outgoing Session Header Banner */}
                  <div className="rounded-lg border bg-muted/30 p-3.5 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-xs text-muted-foreground font-medium">Outgoing Academic Session</div>
                      <div className="text-base font-bold text-foreground">
                        {financialAudit.outgoing_academic_year_name}
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs px-2.5 py-1">
                      Pre-Rollover Financial Reconciliation
                    </Badge>
                  </div>

                  {/* Financial KPI Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {/* 1. Total Billed */}
                    <div className="rounded-lg border p-3 bg-muted/40 text-center space-y-1">
                      <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Total Billed</span>
                      </div>
                      <div className="text-lg font-bold text-foreground truncate">
                        Rs. {Number(financialAudit.total_billed).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {financialAudit.cancelled_bills_count > 0 ? `${financialAudit.cancelled_bills_count} cancelled excluded` : 'Gross billed'}
                      </div>
                    </div>

                    {/* 2. Total Collected */}
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-center space-y-1">
                      <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Total Collected</span>
                      </div>
                      <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300 truncate">
                        Rs. {Number(financialAudit.total_collected).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 font-medium">
                        Rate: {financialAudit.collection_rate_percent}%
                      </div>
                    </div>

                    {/* 3. Unpaid Receivables (Opening Arrears) */}
                    <div className={`rounded-lg border p-3 text-center space-y-1 ${
                      Number(financialAudit.total_outstanding_dues) > 0
                        ? 'border-rose-500/30 bg-rose-500/10'
                        : 'bg-muted/40'
                    }`}>
                      <div className={`flex items-center justify-center gap-1.5 text-xs font-medium ${
                        Number(financialAudit.total_outstanding_dues) > 0
                          ? 'text-rose-700 dark:text-rose-400'
                          : 'text-muted-foreground'
                      }`}>
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Unpaid Receivables</span>
                      </div>
                      <div className={`text-lg font-bold truncate ${
                        Number(financialAudit.total_outstanding_dues) > 0
                          ? 'text-rose-700 dark:text-rose-300'
                          : 'text-foreground'
                      }`}>
                        Rs. {Number(financialAudit.total_outstanding_dues).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Carries as Opening Arrears
                      </div>
                    </div>

                    {/* 4. Advance Wallets */}
                    <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-center space-y-1">
                      <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-400">
                        <Wallet className="w-3.5 h-3.5" />
                        <span>Advance Wallets</span>
                      </div>
                      <div className="text-lg font-bold text-blue-700 dark:text-blue-300 truncate">
                        Rs. {Number(financialAudit.total_advance_wallet_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-blue-700/80 dark:text-blue-400/80">
                        {financialAudit.advance_wallet_students_count} student(s) with credit
                      </div>
                    </div>

                    {/* 5. Defaulters */}
                    <div className={`rounded-lg border p-3 text-center space-y-1 col-span-2 sm:col-span-1 ${
                      financialAudit.chronic_defaulters_count > 0
                        ? 'border-amber-500/30 bg-amber-500/10'
                        : 'bg-muted/40'
                    }`}>
                      <div className={`flex items-center justify-center gap-1.5 text-xs font-medium ${
                        financialAudit.chronic_defaulters_count > 0
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-muted-foreground'
                      }`}>
                        <Users className="w-3.5 h-3.5" />
                        <span>Defaulters</span>
                      </div>
                      <div className={`text-lg font-bold truncate ${
                        financialAudit.chronic_defaulters_count > 0
                          ? 'text-amber-700 dark:text-amber-300'
                          : 'text-foreground'
                      }`}>
                        {financialAudit.chronic_defaulters_count}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        Dues: Rs. {Number(financialAudit.chronic_defaulters_due_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {/* Warning Callouts */}
                  {financialAudit.warnings && financialAudit.warnings.length > 0 ? (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 space-y-2.5">
                      <div className="flex items-center gap-2 text-sm font-bold text-amber-950 dark:text-amber-200">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>Reconciliation Warnings ({financialAudit.warnings.length})</span>
                      </div>
                      <ul className="space-y-1.5 pl-6 list-disc text-xs text-amber-900/90 dark:text-amber-300/90 leading-relaxed">
                        {financialAudit.warnings.map((warn, i) => (
                          <li key={i}>{warn}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3.5 flex items-center gap-3 text-green-900 dark:text-green-200">
                      <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
                      <div className="text-xs">
                        All accounts in {financialAudit.outgoing_academic_year_name} are fully balanced. No uncollected arrears or pending cheques detected.
                      </div>
                    </div>
                  )}

                  {/* Advance Wallets Note */}
                  <div className="rounded-lg border p-3 bg-muted/20 flex items-start gap-3 text-xs leading-relaxed">
                    <Wallet className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div className="text-muted-foreground">
                      <strong className="text-foreground">Student Advance Wallet Carry-Forward:</strong>{' '}
                      All continuing active students with advance credit balances (Rs. {Number(financialAudit.total_advance_wallet_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} across {financialAudit.advance_wallet_students_count} student accounts) will automatically have their balances preserved and recognized in the new session.
                    </div>
                  </div>

                  {/* Mandatory Acknowledgment Checkbox */}
                  <div className="rounded-lg border p-4 bg-muted/30">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="financial-audit-ack"
                        checked={financialAuditAcknowledged}
                        onCheckedChange={(checked) => setFinancialAuditAcknowledged(!!checked)}
                        className="mt-0.5"
                      />
                      <div className="space-y-1 leading-none">
                        <Label
                          htmlFor="financial-audit-ack"
                          className="text-sm font-semibold cursor-pointer text-foreground"
                        >
                          I have reviewed and acknowledge the outgoing session financial status
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          I confirm that unpaid dues (Rs. {Number(financialAudit.total_outstanding_dues).toLocaleString('en-IN', { minimumFractionDigits: 2 })}) and advance wallet balances will be rolled over to the incoming academic session.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          ) : currentStep === 1 ? (
            /* Step 1: Session Timeline & Details */
            <div className="space-y-4 pt-1">
              {statusData?.current_year && !statusData.is_expired && (
                <div className="rounded-lg border border-amber-500/50 bg-amber-500/15 p-3.5 text-amber-950 dark:text-amber-100 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div className="text-xs leading-relaxed space-y-1">
                    <p className="font-semibold text-amber-900 dark:text-amber-200">
                      Active Academic Session Still in Progress ({statusData.current_year.name})
                    </p>
                    <p>
                      The current session is active through{' '}
                      <strong>
                        {formatDualDateRange(
                          statusData.current_year.start_date,
                          statusData.current_year.end_date,
                          calendarSystem
                        )}
                      </strong>
                      . Performing a rollover now will immediately close and archive this session, advance student cohorts mid-term, and lock daily attendance marking for remaining dates.
                    </p>
                  </div>
                </div>
              )}

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

              <div className="rounded-lg border p-3.5 bg-muted/20">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="copy_student_facilities"
                    checked={copyFacilities}
                    onCheckedChange={(checked) =>
                      setValue('copy_student_facilities', !!checked, { shouldValidate: true })
                    }
                    className="mt-0.5"
                  />
                  <div className="space-y-1 leading-none">
                    <Label
                      htmlFor="copy_student_facilities"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Preserve Student Transportation & Facility Subscriptions
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Seamlessly carry forward active bus routes, hostel, and recurring facility assignments for continuing students into the new session.
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
                                        {student.target_class_id ? (
                                          <SelectItem value="PROMOTE">
                                            <div className="flex items-center gap-1.5">
                                              <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
                                              <span>Promote</span>
                                            </div>
                                          </SelectItem>
                                        ) : (
                                          <SelectItem value="PROMOTE" disabled>
                                            <div className="flex items-center gap-1.5 opacity-50">
                                              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                                              <span>Promote (Final Grade)</span>
                                            </div>
                                          </SelectItem>
                                        )}
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
          ) : currentStep === 0 ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => setCurrentStep(1)}
                disabled={!financialAuditAcknowledged || isAuditLoading || !financialAudit}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Next: Session Details
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </>
          ) : currentStep === 1 ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(0)}
                disabled={isFetchingPreview}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back to Financial Audit
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

    {/* Confirmation Dialog: Empty Sections Cleanup */}
    <Dialog
      open={isCleanupConfirmOpen}
      onOpenChange={(val) => !cleanupMutation.isPending && setIsCleanupConfirmOpen(val)}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="w-10 h-10 rounded-full bg-destructive/15 text-destructive flex items-center justify-center mb-2">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <DialogTitle className="text-base font-bold text-foreground">
            Clean Up Empty Sections?
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            This will remove eligible empty sections created for session{' '}
            <strong>{summary?.academic_year_name}</strong> that have 0 enrolled students.
            Default sections (Section A) are preserved per policy.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCleanupConfirmOpen(false)}
            disabled={cleanupMutation.isPending}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleCleanupEmptySections}
            disabled={cleanupMutation.isPending}
            className="gap-1.5 text-xs"
          >
            {cleanupMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Confirm Clean Up</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  );
};
