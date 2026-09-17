import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  GraduationCap,
  Award,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  BookOpen,
  ArrowRight,
  Download,
  RefreshCw,
  Plus,
  Search,
  Flame,
} from 'lucide-react';

import { useAuth } from '@/auth/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ResponsiveDataTable, type Column } from '@/components/common/ResponsiveDataTable';
import { cn } from '@/lib/utils';
import { StatCard } from '@/components/ui/stat-card';
import { ChartCard } from '@/components/ui/chart-card';
import { DonutChart } from '@/components/ui/charts/donut-chart';
import { TrendAreaChart } from '@/components/ui/charts/trend-area-chart';
import { ComparisonBarChart } from '@/components/ui/charts/comparison-bar-chart';
import { SubjectRadarChart } from '@/components/ui/charts/radar-chart';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

import { useExamResultsAnalytics } from '@/features/examination/hooks';
import { useClasses } from '@/features/academic/hooks';
import { exportSchoolResultsCsv } from '@/features/examination/utils/exportSchoolResultsCsv';
import type {
  ClassResultSummary,
  AtRiskStudentItem,
} from '@/features/examination/types';

interface SchoolResultsDashboardHubProps {
  academicYearId?: string | null;
}

export const SchoolResultsDashboardHub: React.FC<SchoolResultsDashboardHubProps> = ({ academicYearId }) => {
  const navigate = useNavigate();
  const { activeTenantId, activeTenantName } = useAuth();

  // Filters state
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedExamName, setSelectedExamName] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [subjectPage, setSubjectPage] = useState<number>(1);
  const SUBJECTS_PER_PAGE = 9;

  // Data Queries
  const { data: classes = [] } = useClasses(activeTenantId);
  const {
    data: analytics,
    isLoading,
    isFetching,
    refetch,
  } = useExamResultsAnalytics(activeTenantId, {
    class_id: selectedClassId || undefined,
    academic_year_id: academicYearId || undefined,
  });

  const classSummaries = analytics?.class_summaries;
  const subjectSummaries = analytics?.subject_summaries;
  const atRiskStudents = analytics?.at_risk_students;
  const topAchievers = analytics?.top_achievers ?? [];
  const kpis = analytics?.kpis;
  const pipeline = analytics?.pipeline;

  const passRate = kpis?.school_pass_rate;
  const evaluatedCount = kpis?.total_students_evaluated ?? 0;
  const passedCount = kpis?.total_passed ?? 0;
  const failedCount = kpis?.total_failed ?? 0;
  const avgScore = kpis?.school_average_percentage;

  const totalExams = pipeline?.total_exams ?? 0;
  const draftCount = pipeline?.draft_count ?? 0;
  const gradingCount = pipeline?.in_progress_count ?? 0;
  const pendingCount = pipeline?.pending_approval_count ?? 0;
  const publishedCount = pipeline?.approved_count ?? 0;
  const atRiskCount = kpis?.total_failed ?? 0;

  // Extract distinct exam names from class summaries for filter dropdown
  const availableExams = useMemo(() => {
    if (!classSummaries) return [];
    const exams = new Set<string>();
    classSummaries.forEach((c) => {
      if (c.exam_name && c.exam_name.trim()) exams.add(c.exam_name);
    });
    return Array.from(exams);
  }, [classSummaries]);

  // Handle CSV Export
  const handleExportCsv = () => {
    if (!analytics) return;
    const selectedClassName = classes.find((c) => c.id === selectedClassId)?.name;
    exportSchoolResultsCsv(analytics, activeTenantName || 'School', {
      term: selectedExamName || undefined,
      className: selectedClassName,
    });
  };

  // Filtered Class Summaries by search
  const filteredClassSummaries = useMemo(() => {
    if (!classSummaries) return [];
    let result = classSummaries;
    if (selectedExamName) {
      result = result.filter(c => c.exam_name === selectedExamName);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.class_name.toLowerCase().includes(q) ||
          c.exam_name.toLowerCase().includes(q) ||
          (c.academic_term && c.academic_term.toLowerCase().includes(q))
      );
    }
    return result;
  }, [classSummaries, searchQuery, selectedExamName]);

  // Filtered Subjects by search
  const filteredSubjectSummaries = useMemo(() => {
    if (!subjectSummaries) return [];
    let result = subjectSummaries;
    if (selectedExamName) {
      result = result.filter(s => s.exam_name === selectedExamName);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.subject_name.toLowerCase().includes(q) ||
          s.class_name.toLowerCase().includes(q) ||
          s.exam_name.toLowerCase().includes(q)
      );
    }
    return result;
  }, [subjectSummaries, searchQuery, selectedExamName]);

  // Filtered At-Risk Students by search
  const filteredAtRiskStudents = useMemo(() => {
    if (!atRiskStudents) return [];
    let result = atRiskStudents;
    if (selectedExamName) {
      result = result.filter(s => s.exam_name === selectedExamName);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.student_name.toLowerCase().includes(q) ||
          s.class_name.toLowerCase().includes(q) ||
          (s.section_name && s.section_name.toLowerCase().includes(q)) ||
          s.failed_subject_names.some((fn) => fn.toLowerCase().includes(q))
      );
    }
    return result;
  }, [atRiskStudents, searchQuery, selectedExamName]);

  // At-Risk Student Trend data across exams
  const atRiskTrend = useMemo(() => {
    const list = selectedExamName ? filteredAtRiskStudents : (atRiskStudents || []);
    if (!list || list.length === 0) return [];
    const examCounts = new Map<string, number>();
    list.forEach((student) => {
      const name = student.exam_name || 'Exam';
      examCounts.set(name, (examCounts.get(name) || 0) + 1);
    });
    return Array.from(examCounts.entries()).map(([exam, count]) => ({
      exam,
      count,
    }));
  }, [atRiskStudents, filteredAtRiskStudents, selectedExamName]);

  // Subject analytics pagination
  const totalSubjectPages = Math.ceil(filteredSubjectSummaries.length / SUBJECTS_PER_PAGE);
  const safeSubjectPage = Math.min(Math.max(1, subjectPage), Math.max(1, totalSubjectPages));
  const paginatedSubjects = useMemo(() => {
    const start = (safeSubjectPage - 1) * SUBJECTS_PER_PAGE;
    return filteredSubjectSummaries.slice(start, start + SUBJECTS_PER_PAGE);
  }, [filteredSubjectSummaries, safeSubjectPage]);

  // Table Columns for Class Performance
  const classColumns: Column<ClassResultSummary>[] = [
    {
      header: 'Class & Examination',
      accessorKey: 'class_name',
      cell: (item) => (
        <div>
          <div className="font-semibold text-sm text-foreground flex items-center gap-1.5">
            <BookOpen className="h-4 w-4 text-primary shrink-0" />
            <span>{item.class_name}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">{item.exam_name}</div>
          {item.academic_term && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-1">
              {item.academic_term}
            </Badge>
          )}
        </div>
      ),
    },
    {
      header: 'Evaluated Students',
      accessorKey: 'total_students',
      cell: (item) => (
        <div className="space-y-1">
          <span className="text-sm font-bold text-foreground">{item.total_students}</span>
          <div className="text-[11px] text-muted-foreground">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              {item.passed_students} passed
            </span>{' '}
            •{' '}
            <span className="text-rose-600 dark:text-rose-400 font-medium">
              {item.failed_students} failed
            </span>
          </div>
        </div>
      ),
    },
    {
      header: 'Pass Rate',
      accessorKey: 'pass_rate',
      cell: (item) => {
        const rate = item.pass_rate;
        const colorClass =
          rate >= 80
            ? 'bg-emerald-500'
            : rate >= 60
            ? 'bg-amber-500'
            : 'bg-rose-500';
        const badgeStyle =
          rate >= 80
            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
            : rate >= 60
            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
            : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30';

        return (
          <div className="space-y-1.5 min-w-[130px]">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className={`text-xs font-semibold ${badgeStyle}`}>
                {rate}%
              </Badge>
            </div>
            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full ${colorClass} transition-all`}
                style={{ width: `${Math.min(100, Math.max(0, rate))}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      header: 'Average Score',
      accessorKey: 'average_percentage',
      cell: (item) => (
        <div>
          <span className="text-sm font-bold text-foreground">
            {item.average_percentage}%
          </span>
          <p className="text-[11px] text-muted-foreground">mean marks</p>
        </div>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (item) => {
        const status = item.status;
        const style =
          status === 'APPROVED'
            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
            : status === 'PENDING_APPROVAL'
            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
            : status === 'IN_PROGRESS'
            ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30'
            : 'bg-muted text-muted-foreground';

        return (
          <Badge variant="outline" className={`text-[10px] font-semibold uppercase ${style}`}>
            {status.replace('_', ' ')}
          </Badge>
        );
      },
    },
    {
      header: 'Action',
      accessorKey: 'exam_id',
      cell: (item) => (
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-8"
          onClick={() => navigate({ to: `/examination/exams/${item.exam_id}/review` as any })}
        >
          {item.status === 'PENDING_APPROVAL' ? 'Review & Approve' : 'View Matrix'}
        </Button>
      ),
    },
  ];

  // Table Columns for At-Risk Students
  const atRiskColumns: Column<AtRiskStudentItem>[] = [
    {
      header: 'Student & Section',
      accessorKey: 'student_name',
      cell: (item) => (
        <div>
          <div className="font-semibold text-sm text-foreground">{item.student_name}</div>
          <div className="text-xs text-muted-foreground">
            {item.class_name}
            {item.section_name ? ` • Section ${item.section_name}` : ''}
          </div>
        </div>
      ),
    },
    {
      header: 'Examination',
      accessorKey: 'exam_name',
      cell: (item) => <span className="text-xs text-foreground font-medium">{item.exam_name}</span>,
    },
    {
      header: 'Failed Subjects',
      accessorKey: 'failed_subjects_count',
      cell: (item) => (
        <div className="space-y-1">
          <Badge variant="outline" className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 text-xs font-semibold">
            {item.failed_subjects_count} {item.failed_subjects_count === 1 ? 'Subject' : 'Subjects'}
          </Badge>
          <div className="flex flex-wrap gap-1 pt-0.5">
            {item.failed_subject_names.map((name, i) => {
              const isAbsent = name.includes('(Absent)');
              return (
                <span
                  key={i}
                  className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded font-medium border inline-flex items-center gap-1',
                    isAbsent
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                      : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30'
                  )}
                >
                  {isAbsent && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />}
                  {name}
                </span>
              );
            })}
          </div>
        </div>
      ),
    },
    {
      header: 'Overall Marks %',
      accessorKey: 'overall_percentage',
      cell: (item) => (
        <div>
          <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
            {item.overall_percentage}%
          </span>
          <p className="text-[11px] text-muted-foreground">below threshold</p>
        </div>
      ),
    },
  ];

  return (
    <Card className="border-border/60 shadow-sm rounded-2xl overflow-hidden">
      {/* 1. Header & Controls */}
      <CardHeader className="p-5 pb-4 border-b bg-card/60">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                <GraduationCap className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                School Academic Results & Examination Performance
              </CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm">
              Live results command center for monitoring examination progress, pass rates, and academic support needs.
            </CardDescription>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center flex-wrap gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={!analytics || isLoading}
              className="text-xs h-10 px-4 font-medium"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-10 w-10"
              title="Refresh results data"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" asChild className="text-xs h-10 px-4 font-semibold">
              <Link to="/examination/exams/create">
                <Plus className="h-4 w-4 mr-1.5" />
                Create Exam
              </Link>
            </Button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5">
          {/* Class Filter */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase">
              Filter by Class
            </label>
            <Select
              value={selectedClassId || 'all'}
              onValueChange={(value) => {
                setSelectedClassId(value === 'all' ? '' : value);
                setSubjectPage(1);
              }}
            >
              <SelectTrigger className="w-full h-10">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Exam Name Filter */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase">
              Filter by Exam
            </label>
            <Select
              value={selectedExamName || 'all'}
              onValueChange={(value) => {
                setSelectedExamName(value === 'all' ? '' : value);
                setSubjectPage(1);
              }}
            >
              <SelectTrigger className="w-full h-10">
                <SelectValue placeholder="All Exams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Exams</SelectItem>
                {availableExams.map((exam) => (
                  <SelectItem key={exam} value={exam}>
                    {exam}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search Filter */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase">
              Search Results
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search class, subject, student..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 pl-9 text-sm"
              />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-6">
        {/* 2. Urgent Attention Banner: Exams Awaiting Admin Approval */}
        {analytics?.pending_approvals && analytics.pending_approvals.length > 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-900 dark:text-amber-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
                  <AlertTriangle className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2.5">
                    <span>
                      {analytics.pending_approvals.length}{' '}
                      {analytics.pending_approvals.length === 1
                        ? 'Examination'
                        : 'Examinations'}{' '}
                      Awaiting Admin Approval & Results Publishing
                    </span>
                    <Badge variant="outline" className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 text-[10px]">
                      Action Required
                    </Badge>
                  </h3>
                  <p className="text-sm text-amber-700/80 dark:text-amber-300/80 mt-1">
                    Teachers have submitted all subject scores. Review score matrices and publish official student results.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white text-sm h-10 px-4 font-semibold shadow-sm"
                  onClick={() =>
                    navigate({
                      to: `/examination/exams/${analytics.pending_approvals[0].exam_id}/review` as any,
                    })
                  }
                >
                  Review First ({analytics.pending_approvals[0].class_name})
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>

            {/* List of pending exams if more than 1 */}
            {analytics.pending_approvals.length > 1 && (
              <div className="mt-4 pt-4 border-t border-amber-500/20 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {analytics.pending_approvals.map((item) => (
                  <div
                    key={item.exam_id}
                    className="flex items-center justify-between p-3 rounded-lg bg-background/60 border border-amber-500/20 text-sm"
                  >
                    <div className="truncate mr-3">
                      <p className="font-semibold truncate">{item.exam_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.class_name} • {item.student_count} students
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-primary hover:underline px-3"
                      onClick={() => navigate({ to: `/examination/exams/${item.exam_id}/review` as any })}
                    >
                      Review
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. Executive KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatCard
            title="Overall Pass Rate"
            value={passRate != null ? `${passRate.toFixed(1)}%` : '—'}
            icon={CheckCircle2}
            description={`${passedCount} of ${evaluatedCount} students passed`}
            trend={
              passRate != null
                ? {
                    value: passRate >= 70 ? 3.5 : -2.1,
                    label: 'vs last exam',
                  }
                : undefined
            }
          />
          <StatCard
            title="School Average Score"
            value={avgScore != null ? `${avgScore.toFixed(1)}%` : '—'}
            icon={TrendingUp}
            description="Mean score across all subjects"
          />
          <StatCard
            title="Exam Pipeline"
            value={totalExams}
            icon={BookOpen}
            description={`${draftCount} draft · ${gradingCount} grading · ${pendingCount} pending · ${publishedCount} published`}
          />
          <StatCard
            title="At-Risk Students"
            value={atRiskCount}
            icon={AlertTriangle}
            description="Students failing 1+ subjects"
          />
        </div>

        {/* 4. Visual Charts: Pass/Fail Donut & Pipeline Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <ChartCard
            title="Pass / Fail Distribution"
            description="Overall student outcomes"
            isLoading={isLoading}
            isEmpty={!isLoading && evaluatedCount === 0}
          >
            <DonutChart
              data={[
                { name: 'Passed', value: passedCount, color: '#10b981' },
                { name: 'Failed', value: failedCount, color: '#f43f5e' },
              ]}
              centerValue={passRate != null ? `${passRate.toFixed(0)}%` : '—'}
              centerLabel="Pass Rate"
            />
          </ChartCard>

          <ChartCard
            title="Exam Pipeline"
            description="Examination stage distribution"
            isLoading={isLoading}
            isEmpty={!isLoading && totalExams === 0}
          >
            <ComparisonBarChart
              data={[
                { stage: 'Draft', count: draftCount },
                { stage: 'Grading', count: gradingCount },
                { stage: 'Pending Approval', count: pendingCount },
                { stage: 'Published', count: publishedCount },
              ]}
              bars={[{ dataKey: 'count', color: 'hsl(var(--primary))' }]}
              categoryKey="stage"
              layout="vertical"
              height={180}
              barColorFn={(entry) => {
                const stage = entry.stage as string;
                if (stage === 'Published') return '#10b981';
                if (stage === 'Grading') return '#3b82f6';
                if (stage === 'Pending Approval') return '#f59e0b';
                return '#94a3b8';
              }}
            />
          </ChartCard>
        </div>

        {/* 5. Tab Navigation & Contents */}
        <Tabs defaultValue="classes" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-2 gap-2">
            <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:grid-cols-4 h-auto p-1">
              <TabsTrigger value="classes" className="gap-1.5 py-1.5 text-xs">
                <GraduationCap className="h-4 w-4" />
                Classes
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                  {filteredClassSummaries.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="subjects" className="gap-1.5 py-1.5 text-xs">
                <BookOpen className="h-4 w-4" />
                Subjects
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                  {filteredSubjectSummaries.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="at_risk" className="gap-1.5 py-1.5 text-xs">
                <AlertTriangle className="h-4 w-4" />
                At-Risk
                <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0">
                  {filteredAtRiskStudents.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="achievers" className="gap-1.5 py-1.5 text-xs">
                <Award className="h-4 w-4" />
                Achievers
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                  {topAchievers.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-xs text-muted-foreground hover:text-foreground hidden sm:flex self-end sm:self-auto"
            >
              <Link to="/examination/exams">
                Examinations Hub
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </div>

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium text-muted-foreground">
                Aggregating school examination results...
              </p>
            </div>
          ) : (
            <>
              {/* Tab 1: Class Performance */}
              <TabsContent value="classes" className="space-y-4">
                <ChartCard
                  title="Class Pass Rate Comparison"
                  description="Pass rate across classes"
                  isEmpty={filteredClassSummaries.length === 0}
                >
                  <ComparisonBarChart
                    data={filteredClassSummaries.map((cls) => ({
                      name: cls.class_name,
                      rate: cls.pass_rate ?? 0,
                    }))}
                    bars={[{ dataKey: 'rate', color: '#10b981', label: 'Pass Rate %' }]}
                    categoryKey="name"
                    layout="horizontal"
                    valueFormatter={(v: number) => `${v}%`}
                    barColorFn={(entry) => {
                      const rate = entry.rate as number;
                      if (rate >= 80) return '#10b981';
                      if (rate >= 60) return '#3b82f6';
                      return '#f43f5e';
                    }}
                  />
                </ChartCard>

                {filteredClassSummaries.length === 0 ? (
                  <div className="py-12 text-center border rounded-xl bg-muted/20 border-dashed space-y-3">
                    <BookOpen className="h-8 w-8 text-muted-foreground/60 mx-auto" />
                    <p className="text-sm font-semibold text-foreground">No Class Results Found</p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Create an examination and submit subject scores to generate class performance leaderboards.
                    </p>
                    <Button size="sm" asChild className="text-xs">
                      <Link to="/examination/exams/create">Create New Exam</Link>
                    </Button>
                  </div>
                ) : (
                  <ResponsiveDataTable
                    data={filteredClassSummaries}
                    columns={classColumns}
                    keyExtractor={(item) => `${item.exam_id}-${item.class_id}`}
                  />
                )}
              </TabsContent>

              {/* Tab 2: Subject Analytics */}
              <TabsContent value="subjects" className="space-y-4">
                <ChartCard
                  title="Subject Performance Overview"
                  description="Average score per subject"
                  isEmpty={filteredSubjectSummaries.length === 0}
                >
                  <SubjectRadarChart
                    data={filteredSubjectSummaries.map((subj) => ({
                      subject: subj.subject_name,
                      score: subj.average_score ?? 0,
                      fullMark: subj.full_mark || 100,
                    }))}
                  />
                </ChartCard>

                {filteredSubjectSummaries.length === 0 ? (
                  <div className="py-12 text-center border rounded-xl bg-muted/20 border-dashed space-y-2">
                    <GraduationCap className="h-8 w-8 text-muted-foreground/60 mx-auto" />
                    <p className="text-sm font-semibold text-foreground">No Subject Data Available</p>
                    <p className="text-xs text-muted-foreground">
                      Subject analytics will appear once teachers grade subject papers.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {paginatedSubjects.map((sub, idx) => {
                        const isHighPerforming = sub.pass_rate >= 80;
                        const isLowPerforming = sub.pass_rate < 60;

                        return (
                          <Card
                            key={`${sub.subject_id}-${idx}`}
                            className="border-border/60 hover:shadow-sm transition-all rounded-xl"
                          >
                            <CardHeader className="p-4 pb-2">
                              <div className="flex items-center justify-between">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] ${
                                    isHighPerforming
                                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                                      : isLowPerforming
                                      ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30'
                                      : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                                  }`}
                                >
                                  {isHighPerforming
                                    ? 'High Performing'
                                    : isLowPerforming
                                    ? 'Needs Attention'
                                    : 'On Track'}
                                </Badge>
                                <span className="text-[11px] text-muted-foreground font-medium">
                                  Full: {sub.full_mark}
                                </span>
                              </div>
                              <CardTitle className="text-sm font-bold text-foreground pt-1.5 truncate">
                                {sub.subject_name}
                              </CardTitle>
                              <CardDescription className="text-xs truncate">
                                {sub.class_name} • {sub.exam_name}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 pt-1 space-y-2">
                              <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t">
                                <div className="p-2 rounded-lg bg-muted/40">
                                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                                    Evaluated
                                  </p>
                                  <p className="text-sm font-bold text-foreground">
                                    {sub.students_evaluated}
                                  </p>
                                </div>
                                <div className="p-2 rounded-lg bg-muted/40">
                                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                                    Pass Rate
                                  </p>
                                  <p
                                    className={`text-sm font-bold ${
                                      isHighPerforming
                                        ? 'text-emerald-600'
                                        : isLowPerforming
                                        ? 'text-rose-600'
                                        : 'text-amber-600'
                                    }`}
                                  >
                                    {sub.pass_rate}%
                                  </p>
                                </div>
                                <div className="p-2 rounded-lg bg-muted/40">
                                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                                    Average
                                  </p>
                                  <p className="text-sm font-bold text-foreground">
                                    {sub.average_score}
                                  </p>
                                </div>
                              </div>
                              {sub.attendance_rate !== undefined && (
                                <div className="flex items-center justify-between text-[11px] pt-2 border-t text-muted-foreground font-medium">
                                  <span>Exam Attendance:</span>
                                  <span
                                    className={cn(
                                      'font-semibold',
                                      (sub.attendance_rate ?? 100) < 90
                                        ? 'text-amber-600 dark:text-amber-400'
                                        : 'text-foreground'
                                    )}
                                  >
                                    {sub.attendance_rate}%{' '}
                                    {sub.absent_count
                                      ? `(${sub.absent_count} Absent)`
                                      : '(All Present)'}
                                  </span>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>

                    {totalSubjectPages > 1 && (
                      <div className="flex items-center justify-between pt-2">
                        <p className="text-xs text-muted-foreground">
                          Showing {(safeSubjectPage - 1) * SUBJECTS_PER_PAGE + 1}–
                          {Math.min(
                            safeSubjectPage * SUBJECTS_PER_PAGE,
                            filteredSubjectSummaries.length
                          )}{' '}
                          of {filteredSubjectSummaries.length} subjects
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs px-3"
                            disabled={safeSubjectPage <= 1}
                            onClick={() => setSubjectPage((p) => Math.max(1, p - 1))}
                          >
                            Previous
                          </Button>
                          <span className="text-xs font-medium text-muted-foreground">
                            {safeSubjectPage} / {totalSubjectPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs px-3"
                            disabled={safeSubjectPage >= totalSubjectPages}
                            onClick={() => setSubjectPage((p) => Math.min(totalSubjectPages, p + 1))}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* Tab 3: At-Risk Students */}
              <TabsContent value="at_risk" className="space-y-4">
                <ChartCard
                  title="At-Risk Student Trend"
                  description="Tracking count of students failing 1+ subjects"
                  isEmpty={!atRiskTrend || atRiskTrend.length === 0}
                  emptyMessage="Trend data will appear after multiple exams"
                >
                  <TrendAreaChart
                    data={atRiskTrend || []}
                    dataKey="count"
                    xAxisKey="exam"
                    color="#f43f5e"
                    valueFormatter={(v: number) => `${v} students`}
                  />
                </ChartCard>

                {filteredAtRiskStudents.length === 0 ? (
                  <div className="py-12 text-center border rounded-xl bg-muted/20 border-dashed space-y-2">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                    <p className="text-sm font-semibold text-foreground">No At-Risk Students Detected</p>
                    <p className="text-xs text-muted-foreground">
                      All evaluated students have passed their configured subject requirements.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                      <span>Students failing 1 or more subjects requiring academic counseling:</span>
                      <span className="font-semibold text-rose-600 dark:text-rose-400">
                        {filteredAtRiskStudents.length} Students
                      </span>
                    </div>
                    <ResponsiveDataTable
                      data={filteredAtRiskStudents}
                      columns={atRiskColumns}
                      keyExtractor={(item) => `${item.student_id}-${item.exam_name}`}
                    />
                  </div>
                )}
              </TabsContent>

              {/* Tab 4: Top Achievers */}
              <TabsContent value="achievers" className="space-y-4">
                <ChartCard
                  title="Top Achievers Leaderboard"
                  description="Highest scoring students"
                  isEmpty={topAchievers.length === 0}
                >
                  <ComparisonBarChart
                    data={topAchievers.slice(0, 10).map((student) => ({
                      name: `#${student.rank} ${student.student_name}`,
                      score: student.overall_percentage ?? 0,
                    }))}
                    bars={[{ dataKey: 'score', color: 'hsl(var(--primary))', label: 'Score %' }]}
                    categoryKey="name"
                    layout="vertical"
                    valueFormatter={(v: number) => `${v}%`}
                    height={Math.max(200, Math.min(topAchievers.length, 10) * 40)}
                  />
                </ChartCard>

                {topAchievers.length === 0 ? (
                  <div className="py-12 text-center border rounded-xl bg-muted/20 border-dashed space-y-2">
                    <Award className="h-8 w-8 text-muted-foreground/60 mx-auto" />
                    <p className="text-sm font-semibold text-foreground">No Achievers Scored Yet</p>
                    <p className="text-xs text-muted-foreground">
                      Top ranking students will appear here as examination scores are submitted.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {topAchievers.map((achiever) => {
                      const badgeBg =
                        achiever.rank === 1
                          ? 'bg-amber-500 text-amber-950 font-bold'
                          : achiever.rank === 2
                          ? 'bg-slate-300 text-slate-900 font-bold'
                          : achiever.rank === 3
                          ? 'bg-amber-700 text-amber-100 font-bold'
                          : 'bg-muted text-foreground';

                      return (
                        <Card
                          key={`${achiever.student_id}-${achiever.rank}`}
                          className="border-border/60 hover:shadow-sm transition-all rounded-xl relative overflow-hidden"
                        >
                          {achiever.rank === 1 && (
                            <div className="absolute top-0 right-0 p-1.5 bg-amber-500/10 text-amber-600 rounded-bl-lg">
                              <Flame className="h-4 w-4" />
                            </div>
                          )}
                          <CardContent className="p-4 flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0 ${badgeBg}`}
                            >
                              #{achiever.rank}
                            </div>
                            <div className="truncate flex-1">
                              <div className="font-semibold text-sm text-foreground truncate">
                                {achiever.student_name}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {achiever.class_name}
                                {achiever.section_name ? ` • Sec ${achiever.section_name}` : ''}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                                {achiever.overall_percentage}%
                              </div>
                              <div className="text-[10px] text-muted-foreground">score</div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SchoolResultsDashboardHub;
