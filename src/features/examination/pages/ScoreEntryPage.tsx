import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Lock,
  Save,
  Send,
  AlertTriangle,
  ShieldAlert,
  Loader2,
  Users,
  Check,
  XCircle,
  Award,
} from 'lucide-react';
import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import {
  useExamReview,
  useSaveExamScores,
  useSubmitExamSubject,
} from '@/features/examination/hooks';
import type { StudentScoreItemDTO } from '@/features/examination/types';
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
import { TenantRequiredState } from '@/components/common/TenantRequiredState';
import {
  TeacherScoreEntryTable,
  type StudentGradingRow,
} from '@/features/examination/components/TeacherScoreEntryTable';

export const ScoreEntryPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeTenantId, user } = useAuth();
  const { isTeacher, isAdmin, isOfficeAdmin, isSuperAdmin, can } =
    usePermission();

  // Route params retrieval with pathname fallback
  const params = useParams({ strict: false }) as Record<
    string,
    string | undefined
  >;

  const examId =
    params?.examId ||
    (typeof window !== 'undefined'
      ? window.location.pathname.match(
          /\/examination\/exams\/([^/]+)\/grade/
        )?.[1]
      : undefined);

  const examSubjectId =
    params?.examSubjectId ||
    (typeof window !== 'undefined'
      ? window.location.pathname.match(/\/grade\/([^/?#]+)/)?.[1]
      : undefined);

  // Queries & Mutations
  const {
    data: review,
    isLoading: reviewLoading,
    error: reviewError,
  } = useExamReview(activeTenantId, examId ?? null);

  const saveScoresMutation = useSaveExamScores();
  const submitSubjectMutation = useSubmitExamSubject();

  // Local state for edits
  const [localGrades, setLocalGrades] = useState<
    Record<string, { score: number | null; isAbsent: boolean }>
  >({});
  const [selectedSectionId, setSelectedSectionId] = useState<string>('ALL');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);

  // Active Subject
  const subjectsList = review?.subjects;
  const subject = useMemo(() => {
    if (!subjectsList || !examSubjectId) return null;
    return (
      subjectsList.find(
        (s) => s.id === examSubjectId || s.subject_id === examSubjectId
      ) ?? null
    );
  }, [subjectsList, examSubjectId]);

  // Handle score change
  const handleScoreChange = (studentId: string, score: number | null) => {
    setLocalGrades((prev) => ({
      ...prev,
      [studentId]: {
        score,
        isAbsent: false,
      },
    }));
  };

  // Handle absent toggle
  const handleAbsentToggle = (studentId: string, isAbsent: boolean) => {
    setLocalGrades((prev) => ({
      ...prev,
      [studentId]: {
        score: isAbsent ? null : (prev[studentId]?.score ?? null),
        isAbsent,
      },
    }));
  };

  // Map students to StudentGradingRow
  const rawStudents = review?.students;
  const studentRows: StudentGradingRow[] = useMemo(() => {
    if (!rawStudents) return [];

    return rawStudents.map((st) => {
      const fullName = [st.first_name, st.middle_name, st.last_name]
        .filter(Boolean)
        .join(' ');
      const local = localGrades[st.student_id];
      const existing = subject
        ? st.subject_scores[subject.subject_id] ||
          st.subject_scores[subject.id]
        : undefined;

      const score =
        local !== undefined ? local.score : (existing?.score ?? null);
      const isAbsent =
        local !== undefined
          ? local.isAbsent
          : (existing?.is_absent ?? false);

      return {
        studentId: st.student_id,
        studentName: fullName,
        sectionId: st.section_id,
        sectionName: st.section_name,
        score,
        isAbsent,
      };
    });
  }, [rawStudents, localGrades, subject]);

  // Unique sections for filter tabs
  const sections = useMemo(() => {
    if (!rawStudents) return [];
    const map = new Map<string, string>();
    for (const st of rawStudents) {
      if (st.section_id && st.section_name) {
        map.set(st.section_id, st.section_name);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [rawStudents]);

  // Filtered students according to section tab
  const visibleStudents = useMemo(() => {
    if (selectedSectionId === 'ALL') return studentRows;
    return studentRows.filter((r) => r.sectionId === selectedSectionId);
  }, [studentRows, selectedSectionId]);

  // Subject constants & counters
  const fullMark = subject?.full_mark ?? 100;
  const passMark = subject?.pass_mark ?? 40;
  const isLocked = subject?.status === 'SUBMITTED';

  const totalStudents = studentRows.length;
  const absentCount = studentRows.filter((r) => r.isAbsent).length;
  const gradedCount = studentRows.filter(
    (r) => r.isAbsent || r.score !== null
  ).length;
  const passCount = studentRows.filter(
    (r) => !r.isAbsent && r.score !== null && r.score >= passMark
  ).length;

  // Tenant Guard
  if (!activeTenantId) {
    return <TenantRequiredState featureName="score entry" />;
  }

  // Loading State
  if (reviewLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Loading examination grading sheet...
        </p>
      </div>
    );
  }

  // Error / Not Found State
  if (reviewError || !review || !subject) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
        <Card className="max-w-md w-full p-6 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight">
              Exam Subject Not Found
            </h2>
            <p className="text-sm text-muted-foreground">
              The requested examination or subject could not be located.
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

  // ReBAC Guard:
  // If user is Teacher and not admin, verify assigned_teacher_id === user?.id
  const isPrivileged = isAdmin || isOfficeAdmin || isSuperAdmin;
  const isAssignedTeacher = Boolean(
    subject.assigned_teacher_id &&
      user?.id &&
      subject.assigned_teacher_id === user.id
  );

  if (!can('ENTER_EXAM_SCORES') || (isTeacher && !isPrivileged && !isAssignedTeacher)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
        <Card className="max-w-md w-full p-6 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight">Access Denied</h2>
            <p className="text-sm text-muted-foreground">
              You are not assigned to grade this exam subject.
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

  // Action: Save Draft
  const handleSaveDraft = async () => {
    if (!activeTenantId || !subject || isLocked || isSaving) return;

    // Validate scores bounds
    const invalidRow = studentRows.find(
      (r) =>
        !r.isAbsent &&
        r.score !== null &&
        (r.score < 0 || r.score > fullMark)
    );
    if (invalidRow) {
      toast.error('Validation Error', {
        description: `Student ${invalidRow.studentName} has an invalid score. Must be between 0 and ${fullMark}.`,
      });
      return;
    }

    const payload: StudentScoreItemDTO[] = studentRows.map((r) => ({
      student_id: r.studentId,
      score: r.isAbsent ? null : r.score,
      is_absent: r.isAbsent,
    }));

    setIsSaving(true);
    try {
      await saveScoresMutation.mutateAsync({
        tenantId: activeTenantId,
        examSubjectId: subject.id,
        scores: payload,
      });
    } catch (err: any) {
      console.error('Failed to save scores:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Action: Submit Final Scores
  const handleSubmitFinal = async () => {
    if (!activeTenantId || !subject || isLocked || isSubmitting) return;

    // Validate scores bounds
    const invalidRow = studentRows.find(
      (r) =>
        !r.isAbsent &&
        r.score !== null &&
        (r.score < 0 || r.score > fullMark)
    );
    if (invalidRow) {
      toast.error('Validation Error', {
        description: `Student ${invalidRow.studentName} has an invalid score. Must be between 0 and ${fullMark}.`,
      });
      return;
    }

    const payload: StudentScoreItemDTO[] = studentRows.map((r) => ({
      student_id: r.studentId,
      score: r.isAbsent ? null : r.score,
      is_absent: r.isAbsent,
    }));

    setIsSubmitting(true);
    try {
      await saveScoresMutation.mutateAsync({
        tenantId: activeTenantId,
        examSubjectId: subject.id,
        scores: payload,
      });

      await submitSubjectMutation.mutateAsync({
        tenantId: activeTenantId,
        examSubjectId: subject.id,
      });

      setIsConfirmOpen(false);
    } catch (err: any) {
      console.error('Failed to submit final scores:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
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
              {subject.subject_name}
            </h1>
            {isLocked ? (
              <Badge
                variant="success"
                className="gap-1.5 py-1 px-3 text-xs font-semibold"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Submitted & Locked
              </Badge>
            ) : (
              <Badge
                variant="warning"
                className="gap-1.5 py-1 px-3 text-xs font-semibold"
              >
                <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                Grading in Progress
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {review.exam.name} • Class: {review.class_name}
          </p>
        </div>

        {/* Action Bar (Top / Mobile & Desktop) */}
        <div className="flex items-center gap-2 sm:self-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isLocked || isSaving || isSubmitting}
            className="font-medium"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </>
            )}
          </Button>

          <Button
            type="button"
            onClick={() => setIsConfirmOpen(true)}
            disabled={isLocked || isSaving || isSubmitting}
            className="font-medium"
          >
            <Send className="w-4 h-4 mr-2" />
            Submit Final Scores
          </Button>
        </div>
      </div>

      {/* Status Banner when Locked */}
      {isLocked && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-sm">
          <Lock className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div>
            <p className="font-semibold text-foreground">Score Entry Locked</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              This subject has been submitted and is locked for teacher edits.
              Scores can no longer be modified.
            </p>
          </div>
        </div>
      )}

      {/* Subject Criteria Badges & Quick Stat Counters */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Full Mark: {fullMark}
          </Badge>
          <Badge variant="outline" className="text-xs">
            Pass Mark: {passMark}
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-3.5 flex items-center justify-between shadow-xs">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Total Students
              </p>
              <p className="text-xl font-bold tracking-tight text-foreground">
                {totalStudents}
              </p>
            </div>
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </Card>

          <Card className="p-3.5 flex items-center justify-between shadow-xs">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Graded Count
              </p>
              <p className="text-xl font-bold tracking-tight text-foreground">
                {gradedCount}
              </p>
            </div>
            <div className="w-9 h-9 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Check className="w-4 h-4" />
            </div>
          </Card>

          <Card className="p-3.5 flex items-center justify-between shadow-xs">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Absent Count
              </p>
              <p className="text-xl font-bold tracking-tight text-destructive">
                {absentCount}
              </p>
            </div>
            <div className="w-9 h-9 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </Card>

          <Card className="p-3.5 flex items-center justify-between shadow-xs">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Pass Count
              </p>
              <p className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {passCount}
              </p>
            </div>
            <div className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </Card>
        </div>
      </div>

      {/* Section Filter Tabs */}
      {sections.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1 shrink-0">
            Sections:
          </span>
          <Button
            type="button"
            size="sm"
            variant={selectedSectionId === 'ALL' ? 'default' : 'outline'}
            onClick={() => setSelectedSectionId('ALL')}
            className="rounded-full px-3.5 h-8 text-xs font-medium shrink-0"
          >
            All Sections ({studentRows.length})
          </Button>
          {sections.map((sec) => {
            const count = studentRows.filter(
              (r) => r.sectionId === sec.id
            ).length;
            return (
              <Button
                key={sec.id}
                type="button"
                size="sm"
                variant={selectedSectionId === sec.id ? 'default' : 'outline'}
                onClick={() => setSelectedSectionId(sec.id)}
                className="rounded-full px-3.5 h-8 text-xs font-medium shrink-0"
              >
                {sec.name} ({count})
              </Button>
            );
          })}
        </div>
      )}

      {/* Teacher Grading Table */}
      <TeacherScoreEntryTable
        students={visibleStudents}
        fullMark={fullMark}
        passMark={passMark}
        isLocked={isLocked}
        onScoreChange={handleScoreChange}
        onAbsentToggle={handleAbsentToggle}
      />

      {/* Confirmation Dialog for Final Submission */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              <span>Submit Final Scores</span>
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm text-foreground/80">
              Are you sure you want to submit? Once submitted, scores will be
              locked and cannot be edited by teachers.
            </DialogDescription>
          </DialogHeader>

          {totalStudents - gradedCount > 0 && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
              <Clock className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <span>
                Note: {totalStudents - gradedCount} student(s) currently have
                no score or attendance recorded.
              </span>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConfirmOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmitFinal}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Confirm & Submit'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScoreEntryPage;
