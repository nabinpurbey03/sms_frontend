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
  Clock,
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

import { useExamResultsAnalytics } from '@/features/examination/hooks';
import { useClasses } from '@/features/academic/hooks';
import { exportSchoolResultsCsv } from '@/features/examination/utils/exportSchoolResultsCsv';
import type {
  ClassResultSummary,
  AtRiskStudentItem,
} from '@/features/examination/types';

type ActiveTabOption = 'classes' | 'subjects' | 'at_risk' | 'achievers';

export const SchoolResultsDashboardHub: React.FC = () => {
  const navigate = useNavigate();
  const { activeTenantId, activeTenantName } = useAuth();

  // Filters state
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedExamName, setSelectedExamName] = useState<string>('');
  const [activeTab, setActiveTab] = useState<ActiveTabOption>('classes');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data Queries
  const { data: classes = [] } = useClasses(activeTenantId);
  const {
    data: analytics,
    isLoading,
    isFetching,
    refetch,
  } = useExamResultsAnalytics(activeTenantId, {
    class_id: selectedClassId || undefined,
  });

  const classSummaries = analytics?.class_summaries;
  const subjectSummaries = analytics?.subject_summaries;
  const atRiskStudents = analytics?.at_risk_students;

  // Extract distinct exam names from class summaries for filter dropdown
  const availableExams = useMemo(() => {
    if (!classSummaries) return [];
    const exams = new Set<string>();
    classSummaries.forEach((c) => {
      if (c.exam_name) exams.add(c.exam_name);
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
      <CardHeader className="p-4 sm:p-6 pb-4 border-b bg-card/60">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
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
          <div className="flex items-center flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={!analytics || isLoading}
              className="text-xs h-9 font-medium"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="text-xs h-9"
              title="Refresh results data"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" asChild className="text-xs h-9 font-semibold">
              <Link to="/examination/exams/create">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Create Exam
              </Link>
            </Button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-4">
          {/* Class Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase">
              Filter by Class
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Exam Name Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase">
              Filter by Exam
            </label>
            <select
              value={selectedExamName}
              onChange={(e) => setSelectedExamName(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Exams</option>
              {availableExams.map((exam) => (
                <option key={exam} value={exam}>
                  {exam}
                </option>
              ))}
            </select>
          </div>

          {/* Search Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase">
              Search Results
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search class, subject, student..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-8 text-xs"
              />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* 2. Urgent Attention Banner: Exams Awaiting Admin Approval */}
        {analytics?.pending_approvals && analytics.pending_approvals.length > 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
                  <AlertTriangle className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2">
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
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Teachers have submitted all subject scores. Review score matrices and publish official student results.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 font-semibold shadow-sm"
                  onClick={() =>
                    navigate({
                      to: `/examination/exams/${analytics.pending_approvals[0].exam_id}/review` as any,
                    })
                  }
                >
                  Review First ({analytics.pending_approvals[0].class_name})
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </div>
            </div>

            {/* List of pending exams if more than 1 */}
            {analytics.pending_approvals.length > 1 && (
              <div className="mt-3 pt-3 border-t border-amber-500/20 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {analytics.pending_approvals.map((item) => (
                  <div
                    key={item.exam_id}
                    className="flex items-center justify-between p-2 rounded-lg bg-background/60 border border-amber-500/20 text-xs"
                  >
                    <div className="truncate mr-2">
                      <p className="font-semibold truncate">{item.exam_name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {item.class_name} • {item.student_count} students
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[11px] text-primary hover:underline px-2"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* KPI 1: Overall Pass Rate */}
          <Card className="border-border/60 bg-card/60 shadow-none rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Overall Pass Rate
              </CardTitle>
              <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-foreground">
                {analytics?.kpis?.school_pass_rate !== undefined
                  ? `${analytics.kpis.school_pass_rate}%`
                  : '0%'}
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 truncate">
                <span className="font-medium text-foreground">
                  {analytics?.kpis?.total_passed || 0}
                </span>{' '}
                of {analytics?.kpis?.total_students_evaluated || 0} evaluations passed
              </p>
            </CardContent>
          </Card>

          {/* KPI 2: School Average Marks */}
          <Card className="border-border/60 bg-card/60 shadow-none rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                School Average Score
              </CardTitle>
              <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
                <TrendingUp className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-foreground">
                {analytics?.kpis?.school_average_percentage !== undefined
                  ? `${analytics.kpis.school_average_percentage}%`
                  : '0%'}
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                Mean performance across scored subjects
              </p>
            </CardContent>
          </Card>

          {/* KPI 3: Exam Pipeline */}
          <Card className="border-border/60 bg-card/60 shadow-none rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Exam Pipeline
              </CardTitle>
              <div className="p-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg">
                <Clock className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-1.5">
              <div className="text-2xl font-bold text-foreground">
                {analytics?.pipeline?.total_exams || 0}{' '}
                <span className="text-xs font-normal text-muted-foreground">Exams Total</span>
              </div>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted/40">
                  {analytics?.pipeline?.draft_count || 0} Draft
                </Badge>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30">
                  {analytics?.pipeline?.in_progress_count || 0} Grading
                </Badge>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                  {analytics?.pipeline?.pending_approval_count || 0} Pending
                </Badge>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                  {analytics?.pipeline?.approved_count || 0} Published
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* KPI 4: Academic Attention / At-Risk */}
          <Card className="border-border/60 bg-card/60 shadow-none rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Academic Attention
              </CardTitle>
              <div className="p-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                {analytics?.kpis?.total_failed || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {analytics?.kpis?.total_failed ? 'Students failed 1+ subjects' : 'All students meeting benchmarks'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 4. Tab Navigation */}
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('classes')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'classes'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              Class Performance ({filteredClassSummaries.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('subjects')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'subjects'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              Subject Analytics ({filteredSubjectSummaries.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('at_risk')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'at_risk'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              At-Risk Students ({filteredAtRiskStudents.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('achievers')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'achievers'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              Top Achievers ({analytics?.top_achievers?.length || 0})
            </button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-xs text-muted-foreground hover:text-foreground hidden sm:flex"
          >
            <Link to="/examination/exams">
              Examinations Hub
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        </div>

        {/* 5. Tab Contents */}
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
            {activeTab === 'classes' && (
              <div>
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
              </div>
            )}

            {/* Tab 2: Subject Analytics */}
            {activeTab === 'subjects' && (
              <div>
                {filteredSubjectSummaries.length === 0 ? (
                  <div className="py-12 text-center border rounded-xl bg-muted/20 border-dashed space-y-2">
                    <GraduationCap className="h-8 w-8 text-muted-foreground/60 mx-auto" />
                    <p className="text-sm font-semibold text-foreground">No Subject Data Available</p>
                    <p className="text-xs text-muted-foreground">
                      Subject analytics will appear once teachers grade subject papers.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredSubjectSummaries.map((sub, idx) => {
                      const isHighPerforming = sub.pass_rate >= 80;
                      const isLowPerforming = sub.pass_rate < 60;

                      return (
                        <Card key={`${sub.subject_id}-${idx}`} className="border-border/60 hover:shadow-sm transition-all rounded-xl">
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
                                {isHighPerforming ? 'High Performing' : isLowPerforming ? 'Needs Attention' : 'On Track'}
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
                                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Evaluated</p>
                                <p className="text-sm font-bold text-foreground">{sub.students_evaluated}</p>
                              </div>
                              <div className="p-2 rounded-lg bg-muted/40">
                                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Pass Rate</p>
                                <p className={`text-sm font-bold ${isHighPerforming ? 'text-emerald-600' : isLowPerforming ? 'text-rose-600' : 'text-amber-600'}`}>
                                  {sub.pass_rate}%
                                </p>
                              </div>
                              <div className="p-2 rounded-lg bg-muted/40">
                                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Average</p>
                                <p className="text-sm font-bold text-foreground">{sub.average_score}</p>
                              </div>
                            </div>
                            {sub.attendance_rate !== undefined && (
                              <div className="flex items-center justify-between text-[11px] pt-2 border-t text-muted-foreground font-medium">
                                <span>Exam Attendance:</span>
                                <span className={cn('font-semibold', (sub.attendance_rate ?? 100) < 90 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground')}>
                                  {sub.attendance_rate}% {sub.absent_count ? `(${sub.absent_count} Absent)` : '(All Present)'}
                                </span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: At-Risk Students */}
            {activeTab === 'at_risk' && (
              <div>
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
              </div>
            )}

            {/* Tab 4: Top Achievers */}
            {activeTab === 'achievers' && (
              <div>
                {(!analytics?.top_achievers || analytics.top_achievers.length === 0) ? (
                  <div className="py-12 text-center border rounded-xl bg-muted/20 border-dashed space-y-2">
                    <Award className="h-8 w-8 text-muted-foreground/60 mx-auto" />
                    <p className="text-sm font-semibold text-foreground">No Achievers Scored Yet</p>
                    <p className="text-xs text-muted-foreground">
                      Top ranking students will appear here as examination scores are submitted.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {analytics.top_achievers.map((achiever) => {
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
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0 ${badgeBg}`}>
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
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SchoolResultsDashboardHub;
