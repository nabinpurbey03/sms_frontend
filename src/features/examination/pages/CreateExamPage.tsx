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
  CalendarDays,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import {
  useAllClassesWithDetails,
  useAssignments,
} from '@/features/academic/hooks';
import { useMembers } from '@/features/members/hooks';
import {
  useCreateExam,
  useAddExamSubject,
} from '@/features/examination/hooks';
import { useCurrentAcademicYear } from '@/features/academic-year/hooks/useCurrentAcademicYear';
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
import { Badge } from '@/components/ui/badge';
import { NepaliDatePicker } from '@/components/ui/nepali-date-picker';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { TenantRequiredState } from '@/components/common/TenantRequiredState';
import {
  ExamSubjectConfigList,
  type SubjectConfigItem,
} from '@/features/examination/components/ExamSubjectConfigList';
import { validateSubjectMarks } from '@/features/examination/types';

export const CreateExamPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeTenantId } = useAuth();
  const { can } = usePermission();

  // Form states
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [examName, setExamName] = useState<string>('');
  const { currentYear, currentYearId, isLoading: isYearLoading } =
    useCurrentAcademicYear(activeTenantId);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Track user overrides for subject configuration: Record<classId, Record<subjectId, Partial<SubjectConfigItem>>>
  const [overrides, setOverrides] = useState<
    Record<string, Record<string, Partial<SubjectConfigItem>>>
  >({});

  // Data Queries
  const { data: detailedClasses = [], isLoading: classesLoading } =
    useAllClassesWithDetails(activeTenantId);
  const { data: classAssignments = [], isLoading: assignmentsLoading } = useAssignments(
    activeTenantId,
    undefined // fetch all assignments for tenant
  );
  const { data: teachersData = [] } = useMembers(activeTenantId, 'TEACHER');

  const classes = detailedClasses;

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

  // Map assigned subject teachers by classId_subjectId from academic module
  const subjectTeacherMap = useMemo(() => {
    const map = new Map<string, { teacherId: string; teacherName: string }>();
    if (!classAssignments || classAssignments.length === 0) return map;

    for (const assignment of classAssignments) {
      if (!assignment.is_class_teacher && assignment.class_id && assignment.subject_id && assignment.teacher_id) {
        let teacherName = assignment.teacher_name;
        if (!teacherName) {
          const t = teachersData.find((teacher) => teacher.user_id === assignment.teacher_id);
          if (t) {
            teacherName = `${t.first_name} ${t.last_name}`.trim();
          }
        }
        map.set(`${assignment.class_id}_${assignment.subject_id}`, {
          teacherId: assignment.teacher_id,
          teacherName: teacherName || 'Assigned Subject Teacher',
        });
      }
    }
    return map;
  }, [classAssignments, teachersData]);

  // Handle class selection toggle
  const toggleClassSelection = (classId: string) => {
    setSelectedClassIds((prev) => {
      if (prev.includes(classId)) {
        return prev.filter((id) => id !== classId);
      }
      return [...prev, classId];
    });
  };

  // Derive subjectConfigs from loaded subjects, academic subject teachers, and user overrides
  const classSubjectConfigs = useMemo(() => {
    const configsMap: Record<string, SubjectConfigItem[]> = {};
    
    for (const classId of selectedClassIds) {
      const cls = classes.find(c => c.id === classId);
      if (!cls || !cls.subjects) {
        configsMap[classId] = [];
        continue;
      }

      configsMap[classId] = cls.subjects.map((s) => {
        const override = overrides[classId]?.[s.id];
        const autoTeacher = subjectTeacherMap.get(`${classId}_${s.id}`);
        const subjAny = s as any;

        const hasPractical =
          override?.hasPractical !== undefined
            ? override.hasPractical
            : subjAny.has_practical ?? false;

        const theoryFullMark =
          override?.theoryFullMark !== undefined
            ? override.theoryFullMark
            : subjAny.theory_full_mark != null
              ? Number(subjAny.theory_full_mark)
              : hasPractical
                ? 75
                : 100;

        const theoryPassMark =
          override?.theoryPassMark !== undefined
            ? override.theoryPassMark
            : subjAny.theory_pass_mark != null
              ? Number(subjAny.theory_pass_mark)
              : hasPractical
                ? 27
                : 40;

        const practicalFullMark =
          override?.practicalFullMark !== undefined
            ? override.practicalFullMark
            : subjAny.practical_full_mark != null
              ? Number(subjAny.practical_full_mark)
              : hasPractical
                ? 25
                : 0;

        const practicalPassMark =
          override?.practicalPassMark !== undefined
            ? override.practicalPassMark
            : subjAny.practical_pass_mark != null
              ? Number(subjAny.practical_pass_mark)
              : hasPractical
                ? 10
                : 0;

        const fullMark = hasPractical
          ? theoryFullMark + practicalFullMark
          : theoryFullMark;

        const passMark = hasPractical
          ? theoryPassMark + practicalPassMark
          : theoryPassMark;

        const included =
          override?.included !== undefined ? override.included : true;

        const assignedTeacherId =
          override?.assignedTeacherId !== undefined
            ? override.assignedTeacherId
            : autoTeacher?.teacherId || '';

        const autoAssignedTeacherId = autoTeacher?.teacherId || null;
        const autoAssignedTeacherName = autoTeacher?.teacherName || null;

        const error =
          override?.error !== undefined
            ? override.error
            : validateSubjectMarks({
                included,
                hasPractical,
                theoryFullMark,
                theoryPassMark,
                practicalFullMark,
                practicalPassMark,
              });

        return {
          subjectId: s.id,
          subjectName: s.name,
          subjectCode: s.code,
          included,
          hasPractical,
          theoryFullMark,
          theoryPassMark,
          practicalFullMark,
          practicalPassMark,
          fullMark,
          passMark,
          assignedTeacherId,
          autoAssignedTeacherId,
          autoAssignedTeacherName,
          error,
        };
      });
    }
    return configsMap;
  }, [selectedClassIds, classes, overrides, subjectTeacherMap]);

  const handleSubjectConfigsChange = (classId: string, configs: SubjectConfigItem[]) => {
    setOverrides((prev) => {
      const classOverrides: Record<string, Partial<SubjectConfigItem>> = {};
      for (const c of configs) {
        classOverrides[c.subjectId] = {
          included: c.included,
          hasPractical: c.hasPractical,
          theoryFullMark: c.theoryFullMark,
          theoryPassMark: c.theoryPassMark,
          practicalFullMark: c.practicalFullMark,
          practicalPassMark: c.practicalPassMark,
          fullMark: c.fullMark,
          passMark: c.passMark,
          assignedTeacherId: c.assignedTeacherId,
          error: c.error,
        };
      }
      return {
        ...prev,
        [classId]: classOverrides,
      };
    });
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

    if (!currentYearId) {
      toast.error('Validation Error', {
        description: 'No active academic year found. Cannot create examinations without an active academic year.',
      });
      return;
    }

    if (selectedClassIds.length === 0) {
      toast.error('Validation Error', {
        description: 'Please select at least one class for the examination.',
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

    if (startDate && endDate && endDate < startDate) {
      toast.error('Validation Error', {
        description: 'End date cannot be earlier than start date.',
      });
      return;
    }

    // Pre-validate subjects for all selected classes
    for (const classId of selectedClassIds) {
      const classConfigs = classSubjectConfigs[classId] || [];
      const included = classConfigs.filter((s) => s.included);
      
      if (included.length === 0) {
        toast.error('Validation Error', {
          description: `At least one subject must be included for each selected class.`,
        });
        return;
      }

      const unassignedSubjects = included.filter((s) => !s.assignedTeacherId);
      if (unassignedSubjects.length > 0) {
        const cls = classes.find((c) => c.id === classId);
        const subjectNames = unassignedSubjects.map((s) => s.subjectName).join(', ');
        toast.error('Validation Error', {
          description: `Please assign a grading teacher for all included subjects in ${cls?.name || 'the selected class'}: ${subjectNames}.`,
        });
        return;
      }
      
      const hasInvalidMarks = included.some(
        (s) =>
          s.theoryPassMark > s.theoryFullMark ||
          s.theoryFullMark < 1 ||
          (s.hasPractical &&
            (s.practicalPassMark > s.practicalFullMark || s.practicalFullMark < 1))
      );
      if (hasInvalidMarks) {
        toast.error('Validation Error', {
          description:
            'Pass mark cannot exceed full mark, and full marks must be at least 1.',
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Loop over all selected classes and create an exam for each
      for (const classId of selectedClassIds) {
        const createdExam = await createExamMutation.mutateAsync({
          tenantId: activeTenantId,
          data: {
            name: trimmedName,
            class_ids: [classId], // Frontend sends array per schema, backend actually takes class_id, let's fix backend payload to pass class_id
            class_id: classId,
            academic_term: currentYearId || undefined,
            academic_year_id: currentYearId || undefined,
            start_date: startDate || undefined,
            end_date: endDate || undefined,
          } as any, // Cast to any to handle schema misalignment if necessary
        });

        const classConfigs = classSubjectConfigs[classId] || [];
        const includedSubjects = classConfigs.filter((s) => s.included);

        for (const item of includedSubjects) {
          await addExamSubjectMutation.mutateAsync({
            tenantId: activeTenantId,
            examId: createdExam.id,
            data: {
              subject_id: item.subjectId,
              has_practical: item.hasPractical,
              theory_full_mark: item.theoryFullMark,
              theory_pass_mark: item.theoryPassMark,
              practical_full_mark: item.practicalFullMark,
              practical_pass_mark: item.practicalPassMark,
              full_mark: item.fullMark,
              pass_mark: item.passMark,
              teacher_id: item.assignedTeacherId || undefined,
            },
          });
        }
      }

      toast.success('Examinations created successfully', {
        description: `${trimmedName} created for ${selectedClassIds.length} class(es).`,
      });

      navigate({ to: '/examination/exams' as any });
    } catch (err: any) {
      console.error('Failed to create examinations:', err);
      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to create some examinations. Please check the logs.';
      toast.error('Failed to create examinations', {
        description: errorMessage,
      });
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
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={'/examination/exams' as any}>Examinations</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Create Examination</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
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
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-sm font-semibold">
                Target Classes <span className="text-destructive">*</span>
              </Label>
              {classesLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-3">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading classes...
                </div>
              ) : classes.length === 0 ? (
                <div className="text-sm text-muted-foreground p-3 border rounded-lg bg-muted/10">
                  No classes available.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-1 border rounded-lg p-3 bg-muted/10 max-h-[160px] overflow-y-auto">
                  {classes.map((cls) => (
                    <label key={cls.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1.5 rounded-md transition-colors">
                      <Checkbox
                        checked={selectedClassIds.includes(cls.id)}
                        onCheckedChange={() => toggleClassSelection(cls.id)}
                        disabled={isSubmitting}
                      />
                      <span className="text-sm font-medium truncate">{cls.name}</span>
                    </label>
                  ))}
                </div>
              )}
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

            {/* Academic Year - Strictly Locked to Current Session */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold flex items-center justify-between">
                <span>Academic Year</span>
                <span className="text-xs text-muted-foreground font-normal">Active Session</span>
              </Label>
              {currentYear ? (
                <div className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-muted/30">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
                      <CalendarDays className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground truncate">{currentYear.name}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 bg-primary/5 text-primary font-semibold">
                          Current
                        </Badge>
                      </div>
                      {(currentYear.start_date && currentYear.end_date) && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                          {currentYear.start_date} – {currentYear.end_date}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded-md border border-border/60 shrink-0">
                    <CalendarDays className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[11px] font-medium hidden sm:inline">Active session</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>No active academic year found for this school. Please set a current academic year in Academic Settings before creating exams.</span>
                </div>
              )}
            </div>

            {/* Start and End Dates */}
            <div className="grid grid-cols-2 gap-3">
              <NepaliDatePicker
                id="start-date"
                label="Start Date"
                value={startDate}
                onChange={(val) => setStartDate(val)}
                disabled={isSubmitting}
              />
              <NepaliDatePicker
                id="end-date"
                label="End Date"
                value={endDate}
                onChange={(val) => setEndDate(val)}
                minDate={startDate}
                disabled={isSubmitting}
              />
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
          {selectedClassIds.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center border rounded-xl bg-muted/20 border-dashed">
              <BookOpen className="w-8 h-8 text-muted-foreground/60 mb-2" />
              <p className="text-sm font-medium text-foreground">
                No Classes Selected
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select one or more classes above to configure subject marks and teacher
                assignments.
              </p>
            </div>
          ) : (
            <Accordion type="multiple" defaultValue={selectedClassIds} className="w-full space-y-3">
              {selectedClassIds.map((classId) => {
                const cls = classes.find((c) => c.id === classId);
                const classConfigs = classSubjectConfigs[classId] || [];
                if (!cls) return null;

                return (
                  <AccordionItem key={classId} value={classId} className="border rounded-lg bg-card/60 px-4">
                    <AccordionTrigger className="hover:no-underline py-4">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold">{cls.name} Subjects</span>
                        <span className="text-xs text-muted-foreground font-normal ml-2">
                          ({classConfigs.length} subjects)
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-4">
                      {classConfigs.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center p-4 border rounded-lg bg-muted/20 border-dashed">
                          No subjects found for this class. Add subjects in Academic &gt; Subjects first.
                        </div>
                      ) : (
                        <ExamSubjectConfigList
                          configs={classConfigs}
                          teachers={teacherList}
                          onChange={(configs) => handleSubjectConfigsChange(classId, configs)}
                          disabled={isSubmitting}
                        />
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
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
          disabled={
            isSubmitting ||
            !currentYearId ||
            isYearLoading ||
            selectedClassIds.length === 0 ||
            !examName.trim()
          }
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
