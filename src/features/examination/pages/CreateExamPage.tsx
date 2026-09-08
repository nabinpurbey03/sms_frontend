import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ClipboardList,
  GraduationCap,
  BookOpen,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import {
  useClasses,
  useClassSubjects,
  useAssignments,
} from '@/features/academic/hooks';
import { useMembers } from '@/features/members/hooks';
import {
  useCreateExam,
  useAddExamSubject,
} from '@/features/examination/hooks';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TenantRequiredState } from '@/components/common/TenantRequiredState';
import {
  ExamSubjectConfigList,
  type SubjectConfigItem,
} from '@/features/examination/components/ExamSubjectConfigList';

export const CreateExamPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeTenantId } = useAuth();
  const { can } = usePermission();

  // Form states
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [examName, setExamName] = useState<string>('');
  const [academicTerm, setAcademicTerm] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Track user overrides for subject configuration
  const [overrides, setOverrides] = useState<
    Record<string, Partial<SubjectConfigItem>>
  >({});

  // Data Queries
  const { data: classes = [], isLoading: classesLoading } =
    useClasses(activeTenantId);
  const { data: subjects = [], isLoading: subjectsLoading } = useClassSubjects(
    activeTenantId,
    selectedClassId || null
  );
  const { data: classAssignments = [] } = useAssignments(
    selectedClassId ? activeTenantId : null,
    selectedClassId ? { class_id: selectedClassId } : undefined
  );
  const { data: teachersData = [] } = useMembers(activeTenantId, 'TEACHER');

  // Mutations
  const createExamMutation = useCreateExam();
  const addExamSubjectMutation = useAddExamSubject();

  // Transform teachers list
  const teacherList = useMemo(
    () =>
      teachersData.map((t) => ({
        user_id: t.user_id,
        first_name: t.first_name,
        last_name: t.last_name,
      })),
    [teachersData]
  );

  // Map assigned subject teachers by subject_id from academic module
  const subjectTeacherMap = useMemo(() => {
    const map = new Map<string, { teacherId: string; teacherName: string }>();
    if (!classAssignments || classAssignments.length === 0) return map;

    for (const assignment of classAssignments) {
      if (!assignment.is_class_teacher && assignment.subject_id && assignment.teacher_id) {
        let teacherName = assignment.teacher_name;
        if (!teacherName) {
          const t = teachersData.find((teacher) => teacher.user_id === assignment.teacher_id);
          if (t) {
            teacherName = `${t.first_name} ${t.last_name}`.trim();
          }
        }
        map.set(assignment.subject_id, {
          teacherId: assignment.teacher_id,
          teacherName: teacherName || 'Assigned Subject Teacher',
        });
      }
    }
    return map;
  }, [classAssignments, teachersData]);

  // Handle class selection change
  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    setOverrides({});
  };

  // Derive subjectConfigs from loaded subjects, academic subject teachers, and user overrides
  const subjectConfigs = useMemo<SubjectConfigItem[]>(() => {
    if (!selectedClassId || !subjects) return [];

    return subjects.map((s) => {
      const override = overrides[s.id];
      const autoTeacher = subjectTeacherMap.get(s.id);

      const fullMark =
        override?.fullMark !== undefined ? override.fullMark : 100;
      const passMark =
        override?.passMark !== undefined ? override.passMark : 40;
      const included =
        override?.included !== undefined ? override.included : true;

      // Auto-assign from Subject Teacher, allowing explicit Admin override
      const assignedTeacherId =
        override?.assignedTeacherId !== undefined
          ? override.assignedTeacherId
          : autoTeacher?.teacherId || '';

      const autoAssignedTeacherId = autoTeacher?.teacherId || null;
      const autoAssignedTeacherName = autoTeacher?.teacherName || null;

      const error =
        override?.error !== undefined
          ? override.error
          : included && passMark > fullMark
            ? 'Pass mark cannot exceed full mark'
            : undefined;

      return {
        subjectId: s.id,
        subjectName: s.name,
        subjectCode: s.code,
        included,
        fullMark,
        passMark,
        assignedTeacherId,
        autoAssignedTeacherId,
        autoAssignedTeacherName,
        error,
      };
    });
  }, [selectedClassId, subjects, overrides, subjectTeacherMap]);

  const handleSubjectConfigsChange = (configs: SubjectConfigItem[]) => {
    const newOverrides: Record<string, Partial<SubjectConfigItem>> = {};
    for (const c of configs) {
      newOverrides[c.subjectId] = {
        included: c.included,
        fullMark: c.fullMark,
        passMark: c.passMark,
        assignedTeacherId: c.assignedTeacherId,
        error: c.error,
      };
    }
    setOverrides(newOverrides);
  };

  // Submission handler
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!activeTenantId) {
      toast.error('School context required', {
        description: 'Please switch to an active school tenant to create exams.',
      });
      return;
    }

    if (!selectedClassId) {
      toast.error('Validation Error', {
        description: 'Please select a class for the examination.',
      });
      return;
    }

    const trimmedName = examName.trim();
    if (trimmedName.length < 2) {
      toast.error('Validation Error', {
        description: 'Exam name must be at least 2 characters.',
      });
      return;
    }

    // 1. Validate that at least one subject is included
    const includedSubjects = subjectConfigs.filter((s) => s.included);
    if (includedSubjects.length === 0) {
      toast.error('Validation Error', {
        description: 'At least one subject must be included in the examination.',
      });
      return;
    }

    // 2. Validate that no included subject has passMark > fullMark
    const hasInvalidMarks = includedSubjects.some(
      (s) => s.passMark > s.fullMark || s.fullMark < 1 || s.passMark < 0
    );
    if (hasInvalidMarks) {
      toast.error('Validation Error', {
        description:
          'Pass mark cannot exceed full mark, and full mark must be at least 1.',
      });
      return;
    }

    if (startDate && endDate && endDate < startDate) {
      toast.error('Validation Error', {
        description: 'End date cannot be earlier than start date.',
      });
      return;
    }

    // 3. Set isSubmitting = true
    setIsSubmitting(true);

    try {
      // 4. Create the exam
      const createdExam = await createExamMutation.mutateAsync({
        tenantId: activeTenantId,
        data: {
          name: trimmedName,
          class_id: selectedClassId,
          academic_term: academicTerm.trim() || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        },
      });

      // 5. For each included subject (with auto-assigned or overridden teacher):
      for (const item of includedSubjects) {
        await addExamSubjectMutation.mutateAsync({
          tenantId: activeTenantId,
          examId: createdExam.id,
          data: {
            subject_id: item.subjectId,
            full_mark: item.fullMark,
            pass_mark: item.passMark,
            teacher_id: item.assignedTeacherId || undefined,
          },
        });
      }

      // 6. Toast via Sonner
      toast.success('Examination created successfully', {
        description: `${trimmedName} created with ${includedSubjects.length} subject(s).`,
      });

      // 7. Navigate to /examination/exams
      navigate({ to: '/examination/exams' as any });
    } catch (err: any) {
      console.error('Failed to create examination:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // RBAC Guard: check MANAGE_EXAMS permission
  const canManageExams = can('MANAGE_EXAMS');
  if (!canManageExams) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
        <Card className="max-w-md w-full p-6 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight">Access Denied</h2>
            <p className="text-sm text-muted-foreground">
              You do not have permission to create examinations. Only
              Administrators and Office Administrators can access this feature.
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

  // Tenant Context Guard
  if (!activeTenantId) {
    return <TenantRequiredState featureName="examination creation" />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header & Breadcrumb */}
      <div className="space-y-3 border-b pb-5">
        <Link
          to={'/examination/exams' as any}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Examinations</span>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Create New Examination
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Set up term exam, specify subject pass marks, and assign teachers
            for grading.
          </p>
        </div>
      </div>

      {/* Card 1: Exam Details */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            <span>Exam Details</span>
          </CardTitle>
          <CardDescription>
            Specify the exam name, class assignment, term, and schedule dates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Class Selector */}
            <div className="space-y-1.5">
              <Label htmlFor="exam-class" className="text-sm font-semibold">
                Target Class <span className="text-destructive">*</span>
              </Label>
              <select
                id="exam-class"
                value={selectedClassId}
                onChange={(e) => handleClassChange(e.target.value)}
                disabled={isSubmitting || classesLoading}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">-- Select Class --</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Exam Name */}
            <div className="space-y-1.5">
              <Label htmlFor="exam-name" className="text-sm font-semibold">
                Exam Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="exam-name"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                placeholder="e.g. First Term Final Examination 2026"
                disabled={isSubmitting}
              />
            </div>

            {/* Academic Term */}
            <div className="space-y-1.5">
              <Label htmlFor="academic-term" className="text-sm font-semibold">
                Academic Term (Optional)
              </Label>
              <Input
                id="academic-term"
                value={academicTerm}
                onChange={(e) => setAcademicTerm(e.target.value)}
                placeholder="e.g. First Term"
                disabled={isSubmitting}
              />
            </div>

            {/* Start and End Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="start-date" className="text-sm font-semibold">
                  Start Date
                </Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end-date" className="text-sm font-semibold">
                  End Date
                </Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Subject Marks & Teacher Assignment */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            <span>Subject Marks & Teacher Assignment</span>
          </CardTitle>
          <CardDescription>
            Configure passing marks and designate faculty members responsible for
            entering scores.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedClassId ? (
            <div className="flex flex-col items-center justify-center p-8 text-center border rounded-xl bg-muted/20 border-dashed">
              <BookOpen className="w-8 h-8 text-muted-foreground/60 mb-2" />
              <p className="text-sm font-medium text-foreground">
                No Class Selected
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select a class above to configure subject marks and teacher
                assignments.
              </p>
            </div>
          ) : subjectsLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground ml-2">
                Loading class curriculum subjects...
              </span>
            </div>
          ) : subjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center border rounded-xl bg-muted/20 border-dashed space-y-3">
              <BookOpen className="w-8 h-8 text-muted-foreground/60" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  No subjects found for this class.
                </p>
                <p className="text-xs text-muted-foreground">
                  Add subjects in Academic &gt; Subjects first.
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/academic/subjects">Go to Subjects</Link>
              </Button>
            </div>
          ) : (
            <ExamSubjectConfigList
              configs={subjectConfigs}
              teachers={teacherList}
              onChange={handleSubjectConfigsChange}
              disabled={isSubmitting}
            />
          )}
        </CardContent>
      </Card>

      {/* Footer / Action Bar */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate({ to: '/examination/exams' as any })}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || !selectedClassId || !examName.trim()}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating Examination...
            </>
          ) : (
            'Create Examination'
          )}
        </Button>
      </div>
    </form>
  );
};

export default CreateExamPage;
