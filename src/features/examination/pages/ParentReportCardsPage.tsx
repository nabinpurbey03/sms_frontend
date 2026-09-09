import React, { useState, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Award,
  CheckCircle2,
  AlertCircle,
  Printer,
  CalendarCheck,
  School,
  Baby,
  Filter,
} from 'lucide-react';

import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import { TenantRequiredState } from '@/components/common/TenantRequiredState';
import { EmptyState } from '@/components/common/EmptyState';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useMyChildrenReportCards } from '../hooks';

export const ParentReportCardsPage: React.FC = () => {
  const { activeTenantId, activeTenantName } = useAuth();
  const { isParent } = usePermission();

  // Read URL search param studentId if present
  const searchStudentId = useMemo(
    () =>
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('studentId')
        : null,
    []
  );

  const {
    data: reportCardsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useMyChildrenReportCards(activeTenantId);

  const children = useMemo(() => reportCardsData?.children ?? [], [reportCardsData?.children]);

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(searchStudentId);
  const [selectedTerm, setSelectedTerm] = useState<string>('ALL');

  // Determine active child
  const activeChild = useMemo(() => {
    if (!children.length) return null;
    if (selectedStudentId) {
      const found = children.find((c) => c.student_id === selectedStudentId);
      if (found) return found;
    }
    return children[0];
  }, [children, selectedStudentId]);

  // Extract unique academic terms for active child
  const terms = useMemo(() => {
    if (!activeChild) return [];
    const termSet = new Set<string>();
    activeChild.exams.forEach((e) => {
      if (e.academic_term) {
        termSet.add(e.academic_term);
      }
    });
    return Array.from(termSet).sort();
  }, [activeChild]);

  // Filter exams by selected term
  const filteredExams = useMemo(() => {
    if (!activeChild) return [];
    if (selectedTerm === 'ALL') return activeChild.exams;
    return activeChild.exams.filter((e) => e.academic_term === selectedTerm);
  }, [activeChild, selectedTerm]);

  // Guard: only parents should access this view
  if (!isParent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] text-center gap-3 p-6">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <p className="text-sm font-semibold text-foreground">Access Restricted</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          Only parents can view this page. Switch to a parent persona to view your linked children&apos;s report cards.
        </p>
      </div>
    );
  }

  // Guard: active tenant required
  if (!activeTenantId) {
    return <TenantRequiredState featureName="report cards" />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              Official Academic Report Cards
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5">
              <School className="w-3.5 h-3.5" />
              {activeTenantName || 'Current School'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Official examination transcripts approved and published by school administration.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button variant="outline" size="sm" asChild className="text-xs font-medium">
            <Link to="/academic/my-children">
              <Baby className="w-3.5 h-3.5 mr-1.5 text-primary" />
              My Children
            </Link>
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          <div className="h-14 rounded-xl bg-muted animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-56 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-destructive/30 bg-destructive/5 text-center gap-3">
          <AlertCircle className="w-8 h-8 text-destructive" />
          <p className="text-xs font-semibold text-destructive">Failed to load report cards</p>
          <p className="text-[11px] text-muted-foreground max-w-xs">
            {(error as any)?.message || 'Could not load published report cards. Please try again.'}
          </p>
          <Button size="sm" onClick={() => refetch()} className="text-xs">
            Try Again
          </Button>
        </div>
      )}

      {/* Empty State: No Children Linked */}
      {!isLoading && !isError && children.length === 0 && (
        <EmptyState
          icon={Baby}
          title="No Children Linked Yet"
          description="No students have been linked to your parent account in this school. Please contact your school administration to link your enrolled children."
        />
      )}

      {/* Children Switcher Tabs (if multiple children) */}
      {!isLoading && !isError && children.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-border/60">
          {children.map((child) => {
            const isSelected = child.student_id === activeChild?.student_id;
            return (
              <button
                key={child.student_id}
                type="button"
                onClick={() => {
                  setSelectedStudentId(child.student_id);
                  setSelectedTerm('ALL');
                }}
                className={cn(
                  'px-4 py-2 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-2 shrink-0 border-b-2 cursor-pointer',
                  isSelected
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
                )}
              >
                <span>{child.student_name}</span>
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded text-[10px]',
                    isSelected
                      ? 'bg-primary/15 text-primary'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {child.class_name}
                </span>
                {child.exams.length > 0 && (
                  <span
                    className={cn(
                      'w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold',
                      isSelected
                        ? 'bg-amber-400 text-amber-950'
                        : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                    )}
                  >
                    {child.exams.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Active Child Toolbar & Term Filter */}
      {!isLoading && !isError && activeChild && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-card rounded-xl border border-border/70 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm border border-primary/20 shrink-0">
              {activeChild.student_name?.[0]?.toUpperCase() || 'S'}
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>{activeChild.student_name}</span>
                <span className="text-xs font-normal text-muted-foreground px-2 py-0.5 rounded-full bg-muted border border-border">
                  {activeChild.class_name}
                  {activeChild.section_name ? ` · Section ${activeChild.section_name}` : ''}
                </span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeChild.exams.length}{' '}
                {activeChild.exams.length === 1
                  ? 'published report card'
                  : 'published report cards'}
              </p>
            </div>
          </div>

          {/* Term Filter Dropdown */}
          {terms.length > 0 && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 shrink-0">
                <Filter className="w-3.5 h-3.5" />
                <span>Term:</span>
              </label>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="h-8.5 px-3 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary min-w-[150px]"
              >
                <option value="ALL">All Academic Terms ({activeChild.exams.length})</option>
                {terms.map((t) => {
                  const count = activeChild.exams.filter((e) => e.academic_term === t).length;
                  return (
                    <option key={t} value={t}>
                      {t} ({count})
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Empty State: No Exams for Active Child */}
      {!isLoading && !isError && activeChild && activeChild.exams.length === 0 && (
        <EmptyState
          icon={Award}
          title="No Published Report Cards Yet"
          description={`Official examination transcripts for ${activeChild.student_name} will appear here once approved and published by the school administration.`}
        />
      )}

      {/* Empty State: Filter Term Mismatch */}
      {!isLoading &&
        !isError &&
        activeChild &&
        activeChild.exams.length > 0 &&
        filteredExams.length === 0 && (
          <EmptyState
            icon={Filter}
            title="No Report Cards for Selected Term"
            description={`No published report cards were found for "${selectedTerm}". Switch to All Academic Terms to view available transcripts.`}
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTerm('ALL')}
                className="text-xs"
              >
                View All Terms
              </Button>
            }
          />
        )}

      {/* Exams Grid */}
      {!isLoading && !isError && filteredExams.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExams.map((exam) => (
            <Card
              key={exam.exam_id}
              className="border-border/70 hover:border-border hover:shadow-md transition-all rounded-xl flex flex-col justify-between overflow-hidden bg-card"
            >
              {/* Status color indicator */}
              <div
                className={cn(
                  'h-1 w-full',
                  exam.is_passed ? 'bg-emerald-500' : 'bg-rose-500'
                )}
              />

              <CardHeader className="p-4 pb-2 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-foreground truncate">{exam.exam_name}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {exam.academic_term ? `${exam.academic_term} • ` : ''}
                      {exam.class_name}
                      {exam.section_name ? ` (${exam.section_name})` : ''}
                    </p>
                  </div>
                  <Badge variant="success" className="gap-1 shrink-0 text-[10px]">
                    <CheckCircle2 className="w-3 h-3" />
                    Published
                  </Badge>
                </div>

                <div className="flex items-center gap-2 pt-0.5">
                  {exam.is_passed ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Passed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Needs Improvement
                    </span>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-4 pt-1 space-y-3">
                {/* Score Summary Box */}
                <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-muted/40 border border-border/50 text-center">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Grand Total</span>
                    <p className="text-xs font-bold text-foreground">
                      {Number(exam.total_obtained).toFixed(1)}{' '}
                      <span className="text-[10px] font-normal text-muted-foreground">
                        /{exam.total_full_mark}
                      </span>
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Percentage</span>
                    <p className="text-xs font-bold text-foreground">
                      {Number(exam.percentage).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Grade / GPA</span>
                    <p className="text-xs font-bold text-foreground">
                      {exam.grade}{' '}
                      <span className="text-[10px] font-normal text-muted-foreground">
                        ({Number(exam.gpa).toFixed(2)})
                      </span>
                    </p>
                  </div>
                </div>

                {/* Rank & Attendance Row */}
                <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                  {exam.rank_in_class && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-semibold">
                      <Award className="w-3 h-3 text-amber-500" />
                      Rank #{exam.rank_in_class} in Class
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 font-medium">
                    <CalendarCheck className="w-3 h-3 text-blue-500" />
                    {exam.exam_attendance_rate}% Exam Attendance
                  </span>
                </div>

                {/* Action: Open Report Card Modal */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-semibold gap-1.5 mt-1 border-primary/30 text-primary hover:bg-primary/5 hover:border-primary cursor-pointer"
                  onClick={() => {
                    const url = `/report-card/${activeTenantId}/${exam.exam_id}/${activeChild!.student_id}`;
                    window.open(url, '_blank');
                  }}
                >
                  <Printer className="w-3.5 h-3.5 text-primary" />
                  <span>View Official Report Card</span>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
