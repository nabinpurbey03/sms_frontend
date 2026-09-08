import React, { useState, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import {
  GraduationCap,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Lock,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Calendar,
  Layers,
  Table as TableIcon,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import {
  useExams,
  useTeacherExamAssignments,
} from '@/features/examination/hooks';
import { useClasses } from '@/features/academic/hooks';
import type { ExamStatus } from '@/features/examination/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TenantRequiredState } from '@/components/common/TenantRequiredState';

function renderExamStatusBadge(status: ExamStatus) {
  switch (status) {
    case 'APPROVED':
      return (
        <Badge variant="success" className="px-2 py-0.5 text-xs font-semibold gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Approved
        </Badge>
      );
    case 'PENDING_APPROVAL':
      return (
        <Badge variant="warning" className="px-2 py-0.5 text-xs font-semibold">
          Pending Approval
        </Badge>
      );
    case 'IN_PROGRESS':
      return (
        <Badge variant="info" className="px-2 py-0.5 text-xs font-semibold">
          In Progress
        </Badge>
      );
    case 'DRAFT':
      return (
        <Badge variant="outline" className="px-2 py-0.5 text-xs font-semibold">
          Draft
        </Badge>
      );
    case 'CANCELLED':
      return (
        <Badge variant="destructive" className="px-2 py-0.5 text-xs font-semibold">
          Cancelled
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export const ExamsListPage: React.FC = () => {
  const { activeTenantId } = useAuth();
  const { isAdmin, isOfficeAdmin, isSuperAdmin, isTeacher, can } = usePermission();

  const canManageExams = can('MANAGE_EXAMS') || isAdmin || isOfficeAdmin || isSuperAdmin;
  const canGrade = can('ENTER_EXAM_SCORES') || isTeacher || canManageExams;

  // Tabs: pure teacher defaults to my-duties, admin defaults to all-exams
  const [activeTab, setActiveTab] = useState<'all-exams' | 'my-duties'>(
    isTeacher && !canManageExams ? 'my-duties' : 'all-exams'
  );

  // Filters for All Exams view
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [examSearch, setExamSearch] = useState<string>('');

  // Filters for My Duties view
  const [dutySearch, setDutySearch] = useState<string>('');
  const [dutyStatusFilter, setDutyStatusFilter] = useState<'ALL' | 'PENDING' | 'SUBMITTED'>('ALL');

  // Queries
  const { data: classes = [], isLoading: classesLoading } = useClasses(activeTenantId);

  const {
    data: exams = [],
    isLoading: examsLoading,
    error: examsError,
  } = useExams(activeTenantId, {
    class_id: selectedClassId === 'ALL' ? undefined : selectedClassId,
    status: selectedStatus === 'ALL' ? undefined : selectedStatus,
  });

  const {
    data: teacherAssignments = [],
    isLoading: assignmentsLoading,
    error: assignmentsError,
  } = useTeacherExamAssignments(activeTenantId, {
    enabled: canGrade,
  });

  // Filtered exams list
  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      const matchesSearch =
        !examSearch.trim() ||
        exam.name.toLowerCase().includes(examSearch.toLowerCase().trim());
      return matchesSearch;
    });
  }, [exams, examSearch]);

  // Filtered teacher assignments
  const filteredAssignments = useMemo(() => {
    return teacherAssignments.filter((a) => {
      const matchesSearch =
        !dutySearch.trim() ||
        a.exam_name.toLowerCase().includes(dutySearch.toLowerCase().trim()) ||
        a.subject_name.toLowerCase().includes(dutySearch.toLowerCase().trim()) ||
        a.class_name.toLowerCase().includes(dutySearch.toLowerCase().trim());

      const matchesStatus =
        dutyStatusFilter === 'ALL' || a.status === dutyStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [teacherAssignments, dutySearch, dutyStatusFilter]);

  // Pending duties count for badges
  const pendingDutiesCount = useMemo(() => {
    return teacherAssignments.filter((a) => a.status === 'PENDING').length;
  }, [teacherAssignments]);

  const classMap = useMemo(() => {
    const map = new Map<string, string>();
    classes.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [classes]);

  // Tenant Guard
  if (!activeTenantId) {
    return <TenantRequiredState featureName="examinations" />;
  }

  // RBAC Guard
  if (!canManageExams && !canGrade) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
        <Card className="max-w-md w-full p-6 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight">Access Denied</h2>
            <p className="text-sm text-muted-foreground">
              You do not have permission to view school examinations or grading duties.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <GraduationCap className="w-7 h-7 text-primary" />
            Examinations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage school examinations, grade submissions, and approve results matrices.
          </p>
        </div>

        {canManageExams && (
          <Button asChild className="gap-2 font-semibold self-start sm:self-auto shadow-xs">
            <Link to={'/examination/exams/create' as any}>
              <Plus className="w-4 h-4" />
              Create Examination
            </Link>
          </Button>
        )}
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b pb-2">
        <Button
          type="button"
          variant={activeTab === 'all-exams' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('all-exams')}
          className="gap-2 font-medium"
        >
          <Layers className="w-4 h-4" />
          All School Exams
          {exams.length > 0 && (
            <Badge
              variant={activeTab === 'all-exams' ? 'secondary' : 'outline'}
              className="ml-1 text-[11px] px-1.5 py-0"
            >
              {exams.length}
            </Badge>
          )}
        </Button>

        {canGrade && (
          <Button
            type="button"
            variant={activeTab === 'my-duties' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('my-duties')}
            className="gap-2 font-medium"
          >
            <BookOpen className="w-4 h-4" />
            My Grading Duties
            {teacherAssignments.length > 0 && (
              <Badge
                variant={pendingDutiesCount > 0 ? 'warning' : 'secondary'}
                className="ml-1 text-[11px] px-1.5 py-0 font-bold"
              >
                {pendingDutiesCount > 0 ? `${pendingDutiesCount} Pending` : teacherAssignments.length}
              </Badge>
            )}
          </Button>
        )}
      </div>

      {/* TAB 1: ALL SCHOOL EXAMINATIONS */}
      {activeTab === 'all-exams' && (
        <div className="space-y-4">
          {/* Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3.5 rounded-xl border border-border shadow-2xs">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Search exam name..."
                  value={examSearch}
                  onChange={(e) => setExamSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              {/* Class Dropdown Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground font-medium">Class:</span>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="ALL">All Classes</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Dropdown Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground font-medium">Status:</span>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="PENDING_APPROVAL">Pending Approval</option>
                  <option value="APPROVED">Approved</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>

            <span className="text-xs text-muted-foreground self-end sm:self-center">
              Showing {filteredExams.length} of {exams.length} exams
            </span>
          </div>

          {/* Exams List Container */}
          {examsLoading || classesLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] p-8 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading examinations...</p>
            </div>
          ) : examsError ? (
            <Card className="border-destructive/30 bg-destructive/5 p-6 text-center">
              <p className="text-sm text-destructive font-medium">
                Failed to load examinations. Please refresh or try again later.
              </p>
            </Card>
          ) : filteredExams.length === 0 ? (
            <Card className="border-dashed p-10 text-center bg-card/60">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-3">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-foreground">No Examinations Found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {exams.length === 0
                  ? 'No examinations have been scheduled yet. Click Create Examination above to schedule one.'
                  : 'No examinations match the selected filter criteria.'}
              </p>
              {canManageExams && exams.length === 0 && (
                <Button asChild size="sm" className="mt-4">
                  <Link to={'/examination/exams/create' as any}>
                    <Plus className="w-4 h-4 mr-1.5" />
                    Create First Exam
                  </Link>
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredExams.map((exam) => {
                const className = classMap.get(exam.class_id) || 'Unknown Class';
                return (
                  <Card
                    key={exam.id}
                    className="hover:border-primary/50 transition-colors shadow-2xs flex flex-col justify-between"
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0">
                          <h3 className="font-bold text-sm text-foreground truncate" title={exam.name}>
                            {exam.name}
                          </h3>
                          <p className="text-xs font-medium text-primary flex items-center gap-1">
                            <GraduationCap className="w-3.5 h-3.5" />
                            {className}
                          </p>
                        </div>
                        {renderExamStatusBadge(exam.status)}
                      </div>

                      <div className="space-y-1.5 text-xs text-muted-foreground pt-1 border-t border-border">
                        {exam.academic_term && (
                          <div className="flex items-center justify-between">
                            <span>Academic Term:</span>
                            <span className="font-medium text-foreground">{exam.academic_term}</span>
                          </div>
                        )}
                        {(exam.start_date || exam.end_date) && (
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-muted-foreground" />
                              Schedule:
                            </span>
                            <span className="font-medium text-foreground">
                              {exam.start_date || 'TBD'} to {exam.end_date || 'TBD'}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 flex items-center justify-between gap-2 border-t border-border">
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="w-full text-xs font-semibold gap-1.5"
                        >
                          <Link to={`/examination/exams/${exam.id}/review` as any}>
                            <TableIcon className="w-3.5 h-3.5 text-primary" />
                            Review & Approval Matrix
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TEACHER'S GRADING DUTIES */}
      {activeTab === 'my-duties' && canGrade && (
        <div className="space-y-4">
          {/* Duty Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3.5 rounded-xl border border-border shadow-2xs">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Search subject, exam, or class..."
                  value={dutySearch}
                  onChange={(e) => setDutySearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant={dutyStatusFilter === 'ALL' ? 'default' : 'outline'}
                  onClick={() => setDutyStatusFilter('ALL')}
                  className="h-8 text-xs px-2.5 rounded-full"
                >
                  All ({teacherAssignments.length})
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={dutyStatusFilter === 'PENDING' ? 'default' : 'outline'}
                  onClick={() => setDutyStatusFilter('PENDING')}
                  className="h-8 text-xs px-2.5 rounded-full"
                >
                  Pending ({pendingDutiesCount})
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={dutyStatusFilter === 'SUBMITTED' ? 'default' : 'outline'}
                  onClick={() => setDutyStatusFilter('SUBMITTED')}
                  className="h-8 text-xs px-2.5 rounded-full"
                >
                  Submitted ({teacherAssignments.length - pendingDutiesCount})
                </Button>
              </div>
            </div>

            <span className="text-xs text-muted-foreground self-end sm:self-center">
              Showing {filteredAssignments.length} assignment(s)
            </span>
          </div>

          {/* Duties Container */}
          {assignmentsLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] p-8 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Loading your exam grading duties...
              </p>
            </div>
          ) : assignmentsError ? (
            <Card className="border-destructive/30 bg-destructive/5 p-6 text-center">
              <p className="text-sm text-destructive font-medium">
                Failed to load your grading duties. Please try again later.
              </p>
            </Card>
          ) : filteredAssignments.length === 0 ? (
            <Card className="border-dashed p-10 text-center bg-card/60">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-3">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-foreground">No Grading Duties</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {teacherAssignments.length === 0
                  ? "You have not been assigned to grade any examination subjects yet."
                  : "No grading assignments match your filter search."}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAssignments.map((duty) => {
                const isSubmitted = duty.status === 'SUBMITTED';

                return (
                  <Card
                    key={duty.exam_subject_id}
                    className="hover:border-primary/50 transition-colors shadow-2xs flex flex-col justify-between"
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 space-y-1">
                          <h3
                            className="font-bold text-sm text-foreground truncate"
                            title={duty.subject_name}
                          >
                            {duty.subject_name}
                          </h3>
                          <p className="text-xs text-muted-foreground font-medium truncate">
                            {duty.exam_name}
                          </p>
                        </div>
                        {isSubmitted ? (
                          <Badge
                            variant="success"
                            className="text-[11px] px-2 py-0 gap-1 font-semibold shrink-0"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            Submitted
                          </Badge>
                        ) : (
                          <Badge
                            variant="warning"
                            className="text-[11px] px-2 py-0 gap-1 font-semibold shrink-0"
                          >
                            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            Pending
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-1.5 text-xs text-muted-foreground pt-1 border-t border-border">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <GraduationCap className="w-3 h-3 text-primary" />
                            Class:
                          </span>
                          <span className="font-semibold text-foreground">{duty.class_name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Marks Criteria:</span>
                          <span className="font-mono text-[11px] font-semibold text-foreground">
                            Full: {duty.full_mark} | Pass: {duty.pass_mark}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border">
                        {isSubmitted ? (
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="w-full text-xs font-medium gap-1.5"
                          >
                            <Link
                              to={
                                `/examination/exams/${duty.exam_id}/grade/${duty.exam_subject_id}` as any
                              }
                            >
                              <Lock className="w-3.5 h-3.5" />
                              View Scores (Locked)
                            </Link>
                          </Button>
                        ) : (
                          <Button
                            asChild
                            size="sm"
                            className="w-full text-xs font-semibold gap-1.5"
                          >
                            <Link
                              to={
                                `/examination/exams/${duty.exam_id}/grade/${duty.exam_subject_id}` as any
                              }
                            >
                              Enter Scores
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExamsListPage;
