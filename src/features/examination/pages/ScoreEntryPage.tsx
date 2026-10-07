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
import {
  deriveStudentScore,
  evaluateStudentResult,
  buildStudentScorePayload,
  validateStudentScoreBounds,
} from '@/features/examination/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
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
  const isPrivileged = isAdmin || isOfficeAdmin || isSuperAdmin;

  // Route params retrieval with pathname fallback and search params support
  const params = useParams({ strict: false }) as Record<
    string,
    string | undefined
  >;

  const searchParams =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : null;

  const examId =
    params?.examId ||
    searchParams?.get('examId') ||
    (typeof window !== 'undefined'
      ? window.location.pathname.match(
          /\/examination\/exams\/([^/]+)\/grade/
        )?.[1]
      : undefined);

  const examSubjectId =
    params?.examSubjectId ||
    searchParams?.get('subjectId') ||
    searchParams?.get('examSubjectId') ||
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
    Record<
      string,
      {
        theoryScore: number | null;
        isTheoryAbsent: boolean;
        practicalScore: number | null;
        isPracticalAbsent: boolean;
      }
    >
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

  // Subject constants
  const hasPractical = Boolean(subject?.has_practical);
  const theoryFullMark = Number(
    subject?.theory_full_mark ?? subject?.full_mark ?? 100
  );
  const theoryPassMark = Number(
    subject?.theory_pass_mark ?? subject?.pass_mark ?? 40
  );
  const practicalFullMark = Number(subject?.practical_full_mark ?? 0);
  const practicalPassMark = Number(subject?.practical_pass_mark ?? 0);
  const fullMark = Number(
    subject?.full_mark ??
      (hasPractical ? theoryFullMark + practicalFullMark : theoryFullMark)
  );
  const passMark = Number(
    subject?.pass_mark ??
      (hasPractical ? theoryPassMark + practicalPassMark : theoryPassMark)
  );
  const isLocked = !isPrivileged && subject?.status === 'SUBMITTED';

  const rawStudents = review?.students;

  const getInitialStudentState = (studentId: string) => {
    const st = rawStudents?.find((s) => s.student_id === studentId);
    const existing = subject
      ? st?.subject_scores[subject.subject_id] ||
        st?.subject_scores[subject.id]
      : undefined;

    if (!existing) {
      return {
        theoryScore: null,
        isTheoryAbsent: false,
        practicalScore: null,
        isPracticalAbsent: false,
      };
    }

    if (hasPractical) {
      return {
        theoryScore:
          existing.theory_score !== null && existing.theory_score !== undefined
            ? Number(existing.theory_score)
            : null,
        isTheoryAbsent: Boolean(
          existing.is_theory_absent ?? existing.is_absent ?? false
        ),
        practicalScore:
          existing.practical_score !== null &&
          existing.practical_score !== undefined
            ? Number(existing.practical_score)
            : null,
        isPracticalAbsent: Boolean(existing.is_practical_absent ?? false),
      };
    }

    const raw =
      existing.theory_score !== null && existing.theory_score !== undefined
        ? existing.theory_score
        : existing.score;

    return {
      theoryScore: raw !== null && raw !== undefined ? Number(raw) : null,
      isTheoryAbsent: Boolean(
        existing.is_theory_absent ?? existing.is_absent ?? false
      ),
      practicalScore: null,
      isPracticalAbsent: false,
    };
  };

  // Handle theory score change
  const handleTheoryScoreChange = (studentId: string, score: number | null) => {
    setLocalGrades((prev) => {
      const cur = prev[studentId] ?? getInitialStudentState(studentId);
      return {
        ...prev,
        [studentId]: {
          ...cur,
          theoryScore: score,
          isTheoryAbsent: false,
        },
      };
    });
  };

  // Handle theory absent toggle
  const handleTheoryAbsentToggle = (studentId: string, isAbsent: boolean) => {
    setLocalGrades((prev) => {
      const cur = prev[studentId] ?? getInitialStudentState(studentId);
      return {
        ...prev,
        [studentId]: {
          ...cur,
          isTheoryAbsent: isAbsent,
          theoryScore: isAbsent
            ? 0
            : cur.theoryScore === 0
            ? null
            : cur.theoryScore,
        },
      };
    });
  };

  // Handle practical score change
  const handlePracticalScoreChange = (
    studentId: string,
    score: number | null
  ) => {
    setLocalGrades((prev) => {
      const cur = prev[studentId] ?? getInitialStudentState(studentId);
      return {
        ...prev,
        [studentId]: {
          ...cur,
          practicalScore: score,
          isPracticalAbsent: false,
        },
      };
    });
  };

  // Handle practical absent toggle
  const handlePracticalAbsentToggle = (
    studentId: string,
    isAbsent: boolean
  ) => {
    setLocalGrades((prev) => {
      const cur = prev[studentId] ?? getInitialStudentState(studentId);
      return {
        ...prev,
        [studentId]: {
          ...cur,
          isPracticalAbsent: isAbsent,
          practicalScore: isAbsent
            ? 0
            : cur.practicalScore === 0
            ? null
            : cur.practicalScore,
        },
      };
    });
  };

  // Fill max practical marks for present students
  const handleFillMaxPractical = () => {
    if (!hasPractical || isLocked) return;
    setLocalGrades((prev) => {
      const next = { ...prev };
      for (const st of rawStudents ?? []) {
        const cur = next[st.student_id] ?? getInitialStudentState(st.student_id);
        if (!cur.isPracticalAbsent) {
          next[st.student_id] = {
            ...cur,
            practicalScore: practicalFullMark,
          };
        }
      }
      return next;
    });
    toast.success('Practical Marks Filled', {
      description: `Filled all present students with maximum practical marks (${practicalFullMark}).`,
    });
  };

  // Map students to StudentGradingRow
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

      let theoryScore: number | null = null;
      let isTheoryAbsent = false;
      let practicalScore: number | null = null;
      let isPracticalAbsent = false;

      if (local !== undefined) {
        theoryScore = local.theoryScore;
        isTheoryAbsent = local.isTheoryAbsent;
        practicalScore = local.practicalScore;
        isPracticalAbsent = local.isPracticalAbsent;
      } else if (existing) {
        if (hasPractical) {
          theoryScore =
            existing.theory_score !== null &&
            existing.theory_score !== undefined
              ? Number(existing.theory_score)
              : null;
          isTheoryAbsent = Boolean(
            existing.is_theory_absent ?? existing.is_absent ?? false
          );
          practicalScore =
            existing.practical_score !== null &&
            existing.practical_score !== undefined
              ? Number(existing.practical_score)
              : null;
          isPracticalAbsent = Boolean(existing.is_practical_absent ?? false);
        } else {
          const raw =
            existing.theory_score !== null &&
            existing.theory_score !== undefined
              ? existing.theory_score
              : existing.score;
          theoryScore = raw !== null && raw !== undefined ? Number(raw) : null;
          isTheoryAbsent = Boolean(
            existing.is_theory_absent ?? existing.is_absent ?? false
          );
          practicalScore = null;
          isPracticalAbsent = false;
        }
      }

      const isAbsent = hasPractical
        ? isTheoryAbsent && isPracticalAbsent
        : isTheoryAbsent;

      const derivedScore = deriveStudentScore(
        {
          theoryScore,
          isTheoryAbsent,
          practicalScore,
          isPracticalAbsent,
        },
        hasPractical
      );

      return {
        studentId: st.student_id,
        studentName: fullName,
        sectionId: st.section_id,
        sectionName: st.section_name,
        theoryScore,
        isTheoryAbsent,
        practicalScore,
        isPracticalAbsent,
        score: derivedScore,
        isAbsent,
      };
    });
  }, [rawStudents, localGrades, subject, hasPractical]);

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

  const totalStudents = studentRows.length;
  const absentCount = studentRows.filter((r) => r.isAbsent).length;
  const gradedCount = studentRows.filter((r) => {
    if (hasPractical) {
      const thDone = r.isTheoryAbsent || r.theoryScore !== null;
      const prDone = r.isPracticalAbsent || r.practicalScore !== null;
      return thDone && prDone;
    }
    return r.isTheoryAbsent || r.theoryScore !== null || r.score !== null;
  }).length;

  const passCount = studentRows.filter((r) => {
    const evalResult = evaluateStudentResult({
      hasPractical,
      theoryScore: r.theoryScore,
      isTheoryAbsent: r.isTheoryAbsent,
      theoryPassMark,
      practicalScore: r.practicalScore,
      isPracticalAbsent: r.isPracticalAbsent,
      practicalPassMark,
      passMark,
    });
    return evalResult.isPass;
  }).length;

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

  // ReBAC Guard
  const isAssignedTeacher = Boolean(
    subject.assigned_teacher_id &&
      user?.id &&
      subject.assigned_teacher_id === user.id
  );

  if (
    !can('ENTER_EXAM_SCORES') ||
    (isTeacher && !isPrivileged && !isAssignedTeacher)
  ) {
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

  const validateScores = (): boolean => {
    for (const r of studentRows) {
      const err = validateStudentScoreBounds(r, {
        hasPractical,
        theoryFullMark,
        practicalFullMark,
        fullMark,
      });
      if (err) {
        toast.error('Validation Error', {
          description: err,
        });
        return false;
      }
    }
    return true;
  };

  // Action: Save Draft
  const handleSaveDraft = async () => {
    if (!activeTenantId || !subject || isLocked || isSaving) return;

    if (!validateScores()) return;

    const payload: StudentScoreItemDTO[] = studentRows.map((r) =>
      buildStudentScorePayload(r, hasPractical)
    );

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

    if (!validateScores()) return;

    const payload: StudentScoreItemDTO[] = studentRows.map((r) =>
      buildStudentScorePayload(r, hasPractical)
    );

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
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to={'/examination/exams' as any}>Examinations</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link
                    to={'/examination/exams/$examId/review' as any}
                    params={{ examId } as any}
                  >
                    {review.exam.name}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>
                  {subject.subject_name} Score Entry
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
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
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Full Mark: {fullMark}
          </Badge>
          <Badge variant="outline" className="text-xs">
            Pass Mark: {passMark}
          </Badge>
          {hasPractical && (
            <>
              <Badge variant="secondary" className="text-xs">
                Theory: {theoryFullMark} (Pass: {theoryPassMark})
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Practical: {practicalFullMark} (Pass: {practicalPassMark})
              </Badge>
            </>
          )}
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
        <div className="flex flex-wrap items-center gap-2 pb-1 pt-1">
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
        hasPractical={hasPractical}
        theoryFullMark={theoryFullMark}
        theoryPassMark={theoryPassMark}
        practicalFullMark={practicalFullMark}
        practicalPassMark={practicalPassMark}
        fullMark={fullMark}
        passMark={passMark}
        isLocked={isLocked}
        onTheoryScoreChange={handleTheoryScoreChange}
        onTheoryAbsentToggle={handleTheoryAbsentToggle}
        onPracticalScoreChange={handlePracticalScoreChange}
        onPracticalAbsentToggle={handlePracticalAbsentToggle}
        onFillMaxPractical={handleFillMaxPractical}
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
