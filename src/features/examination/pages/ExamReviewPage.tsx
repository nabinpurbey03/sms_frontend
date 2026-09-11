import React, { useState } from 'react';
import { useParams, useNavigate, Link } from '@tanstack/react-router';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Loader2,
  Calendar,
  GraduationCap,
  FileText,
  Download,
} from 'lucide-react';
import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import {
  useExamReview,
  useApproveExam,
  useSaveExamScores,
  useBatchGenerateReportCards,
  useDownloadAllClassReportCardsPdf,
} from '@/features/examination/hooks';
import type { ExamStatus } from '@/features/examination/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { TenantRequiredState } from '@/components/common/TenantRequiredState';
import { ExamApprovalMatrix } from '@/features/examination/components/ExamApprovalMatrix';
import { cn } from '@/lib/utils';

function renderExamStatusBadge(status: ExamStatus) {
  switch (status) {
    case 'APPROVED':
      return (
        <Badge variant="success" className="px-2.5 py-0.5 text-xs font-semibold gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Approved
        </Badge>
      );
    case 'PENDING_APPROVAL':
      return (
        <Badge variant="warning" className="px-2.5 py-0.5 text-xs font-semibold">
          Pending Approval
        </Badge>
      );
    case 'IN_PROGRESS':
      return (
        <Badge variant="info" className="px-2.5 py-0.5 text-xs font-semibold">
          In Progress
        </Badge>
      );
    case 'DRAFT':
      return (
        <Badge variant="outline" className="px-2.5 py-0.5 text-xs font-semibold">
          Draft
        </Badge>
      );
    case 'CANCELLED':
      return (
        <Badge variant="destructive" className="px-2.5 py-0.5 text-xs font-semibold">
          Cancelled
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export const ExamReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeTenantId } = useAuth();
  const { isAdmin, isOfficeAdmin, isSuperAdmin, can } = usePermission();

  // Route param extraction with pathname fallback
  const params = useParams({ strict: false }) as Record<string, string | undefined>;
  const examId =
    params?.examId ||
    (typeof window !== 'undefined'
      ? window.location.pathname.match(/\/examination\/exams\/([^/]+)/)?.[1]
      : undefined);

  // Queries & Mutations
  const {
    data: review,
    isLoading: reviewLoading,
    error: reviewError,
  } = useExamReview(activeTenantId, examId ?? null);

  const approveExamMutation = useApproveExam();
  const saveScoresMutation = useSaveExamScores();
  const batchGenerateMutation = useBatchGenerateReportCards();
  const downloadAllMutation = useDownloadAllClassReportCardsPdf();

  // Confirmation Dialog State
  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);
  const [isApproving, setIsApproving] = useState<boolean>(false);

  // Tenant Guard
  if (!activeTenantId) {
    return <TenantRequiredState featureName="examination review" />;
  }

  // RBAC Guard
  const canManage = can('MANAGE_EXAMS') || isAdmin || isOfficeAdmin || isSuperAdmin;
  if (!canManage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
        <Card className="max-w-md w-full p-6 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight">Access Denied</h2>
            <p className="text-sm text-muted-foreground">
              You do not have administrative permission to review or approve examinations.
            </p>
          </div>
          <Button
            onClick={() => navigate({ to: '/examination/exams' as any })}
            className="w-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return to Examinations
          </Button>
        </Card>
      </div>
    );
  }

  // Loading State
  if (reviewLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Loading examination approval review...
        </p>
      </div>
    );
  }

  // Error State
  if (reviewError || !review) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
        <Card className="max-w-md w-full p-6 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight">
              Examination Not Found
            </h2>
            <p className="text-sm text-muted-foreground">
              The requested examination could not be loaded or does not exist.
            </p>
          </div>
          <Button
            onClick={() => navigate({ to: '/examination/exams' as any })}
            className="w-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return to Examinations
          </Button>
        </Card>
      </div>
    );
  }

  // Calculations for submission progress
  const totalSubjects = review.subjects.length;
  const submittedSubjects = review.subjects.filter((s) => s.status === 'SUBMITTED').length;
  const pendingSubjects = review.subjects.filter((s) => s.status !== 'SUBMITTED');
  const percentSubmitted =
    totalSubjects > 0 ? Math.round((submittedSubjects / totalSubjects) * 100) : 0;

  const isApproved = review.exam.status === 'APPROVED';
  const canApprove = review.all_subjects_submitted && !isApproved;

  // Inline Score Save Callback
  const handleSaveScore = async (
    examSubjectId: string,
    studentId: string,
    newScore: number | null,
    newIsAbsent: boolean
  ) => {
    if (!activeTenantId) return;
    await saveScoresMutation.mutateAsync({
      tenantId: activeTenantId,
      examSubjectId,
      scores: [
        {
          student_id: studentId,
          score: newScore,
          is_absent: newIsAbsent,
        },
      ],
    });
  };

  // Action: Approve Exam
  const handleApprove = async () => {
    if (!activeTenantId || !review.exam.id || isApproving) return;

    setIsApproving(true);
    try {
      await approveExamMutation.mutateAsync({
        tenantId: activeTenantId,
        examId: review.exam.id,
      });
      setIsConfirmOpen(false);
    } catch (err) {
      console.error('Failed to approve examination:', err);
    } finally {
      setIsApproving(false);
    }
  };

  // Action: Batch Generate Report Cards (Once Approved)
  const handleBatchGenerate = async () => {
    if (!activeTenantId || !review.exam.id) return;
    await batchGenerateMutation.mutateAsync({
      tenantId: activeTenantId,
      examId: review.exam.id,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div className="space-y-2">
          <Link
            to={'/examination/exams' as any}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Examinations</span>
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {review.exam.name}
            </h1>
            {renderExamStatusBadge(review.exam.status)}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5 text-primary" />
              Class: <span className="font-semibold text-foreground">{review.class_name}</span>
            </span>
            {review.exam.academic_term && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Term: <span className="font-semibold text-foreground">{review.exam.academic_term}</span>
              </span>
            )}
          </div>
        </div>

        {/* Approval Status & CTA */}
        <div className="flex items-center gap-3 md:self-end">
          {isApproved ? (
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge
                variant="success"
                className="gap-2 py-2 px-3.5 text-xs font-semibold shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Exam Approved & Published
              </Badge>
              <Button
                type="button"
                onClick={handleBatchGenerate}
                disabled={batchGenerateMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2 shadow-xs cursor-pointer"
              >
                {batchGenerateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating Report Cards...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Generate Class Report Cards
                  </>
                )}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (activeTenantId && review) {
                    downloadAllMutation.mutate({
                      tenantId: activeTenantId,
                      examId: review.exam.id,
                      examName: review.exam.name,
                    });
                  }
                }}
                disabled={downloadAllMutation.isPending}
                variant="outline"
                className="font-semibold gap-2 cursor-pointer"
              >
                {downloadAllMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Download Class PDF
                  </>
                )}
              </Button>
            </div>
          ) : canApprove ? (
            <Button
              type="button"
              onClick={() => setIsConfirmOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-2 shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              Approve & Publish Exam
            </Button>
          ) : (
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0} className="inline-block cursor-not-allowed">
                    <Button
                      type="button"
                      disabled
                      className="opacity-60 font-semibold gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve & Publish Exam
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-center text-xs">
                  Cannot approve exam: All subjects must be SUBMITTED first.
                  Pending subjects: {pendingSubjects.map((s) => s.subject_name).join(', ')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* Submission Progress Tracker Card */}
      <Card className="p-4 bg-card border-border shadow-2xs">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              Subject Submissions Progress
            </span>
            <span className="font-medium text-muted-foreground">
              <strong className="text-foreground">{submittedSubjects}</strong> of{' '}
              <strong className="text-foreground">{totalSubjects}</strong> subjects submitted (
              {percentSubmitted}%)
            </span>
          </div>

          <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
            <div
              className={cn(
                'h-2.5 rounded-full transition-all duration-500',
                percentSubmitted === 100
                  ? 'bg-emerald-600 dark:bg-emerald-500'
                  : 'bg-primary'
              )}
              style={{ width: `${percentSubmitted}%` }}
            />
          </div>

          {!review.all_subjects_submitted && pendingSubjects.length > 0 && (
            <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
              Awaiting submission for:{' '}
              <span className="font-semibold">
                {pendingSubjects.map((s) => s.subject_name).join(', ')}
              </span>
            </p>
          )}
        </div>
      </Card>

      {/* Approval Matrix Table */}
      <ExamApprovalMatrix
        review={review}
        canEdit={!isApproved}
        onSaveScore={handleSaveScore}
      />

      {/* Confirmation Dialog for Publishing */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Approve and Publish Results?</span>
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm text-foreground/80">
              Once approved, exam results will be finalized and made visible to parents and
              students. All subject scores will be officially locked.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConfirmOpen(false)}
              disabled={isApproving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              onClick={handleApprove}
              disabled={isApproving}
            >
              {isApproving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                'Confirm & Publish'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExamReviewPage;
