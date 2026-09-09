import React, { useState, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Award,
  CheckCircle2,
  AlertCircle,
  Printer,
  ArrowRight,
  CalendarCheck,
} from 'lucide-react';

import { useAuth } from '@/auth/useAuth';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useMyChildrenReportCards } from '../hooks';

export const ParentReportCardsDashboardHub: React.FC = () => {
  const { activeTenantId } = useAuth();
  const { data: reportCardsData, isLoading } = useMyChildrenReportCards(activeTenantId);

  const children = useMemo(() => reportCardsData?.children ?? [], [reportCardsData?.children]);
  const totalPublishedExams = reportCardsData?.total_published_exams ?? 0;

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Determine active child
  const activeChild = useMemo(() => {
    if (!children.length) return null;
    if (selectedStudentId) {
      const found = children.find((c) => c.student_id === selectedStudentId);
      if (found) return found;
    }
    return children[0];
  }, [children, selectedStudentId]);

  // Loading skeleton
  if (isLoading) {
    return (
      <Card className="border-border/60 rounded-2xl overflow-hidden animate-pulse">
        <CardHeader className="p-4 sm:p-6 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-muted rounded w-1/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="h-28 bg-muted rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  // No children linked
  if (children.length === 0) {
    return null;
  }

  // Subtle banner when 0 exams published
  if (totalPublishedExams === 0) {
    return (
      <Card className="border-border/60 bg-card/60 rounded-2xl p-5">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
            <Award className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground">Official Academic Report Cards</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Examination report cards will appear here once approved &amp; published by the school administration.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 bg-card/90 rounded-2xl shadow-xs overflow-hidden">
      <CardHeader className="p-4 sm:p-6 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                Official Academic Report Cards
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Official examination transcripts approved and published by school administration
              </p>
            </div>
          </div>
          <Link
            to={'/academic/report-cards' as any}
            className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 self-start sm:self-auto shrink-0"
          >
            <span>View All Report Cards</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Child Switcher Tabs/Pills if multiple children */}
        {children.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pt-3 pb-1 scrollbar-none">
            {children.map((child) => {
              const isSelected = child.student_id === activeChild?.student_id;
              return (
                <button
                  key={child.student_id}
                  type="button"
                  onClick={() => setSelectedStudentId(child.student_id)}
                  className={cn(
                    'px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-2 shrink-0 border cursor-pointer',
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary font-semibold shadow-xs'
                      : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted border-border/60'
                  )}
                >
                  <span>{child.student_name}</span>
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded text-[10px]',
                      isSelected
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-background text-muted-foreground border border-border/40'
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
      </CardHeader>

      <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
        {/* Child has 0 published exams */}
        {activeChild && activeChild.exams.length === 0 && (
          <div className="rounded-xl border border-dashed border-border/70 p-6 text-center space-y-1 bg-muted/10">
            <p className="text-xs sm:text-sm font-semibold text-foreground">
              No Published Report Cards for {activeChild.student_name}
            </p>
            <p className="text-xs text-muted-foreground">
              Official transcripts for this student have not been approved &amp; published yet.
            </p>
          </div>
        )}

        {/* Child has published exams */}
        {activeChild && activeChild.exams.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {activeChild.exams.map((exam) => (
              <Card
                key={exam.exam_id}
                className="border-border/70 hover:border-border hover:shadow-md transition-all rounded-xl flex flex-col justify-between overflow-hidden bg-card"
              >
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
                    {exam.is_passed ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Passed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shrink-0">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Needs Improvement
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-1 space-y-3">
                  {/* Stats grid */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/50 text-center">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Total</span>
                      <p className="text-xs font-bold text-foreground">
                        {Number(exam.total_obtained).toFixed(1)}{' '}
                        <span className="text-[10px] font-normal text-muted-foreground">
                          /{exam.total_full_mark}
                        </span>
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Score</span>
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

                  {/* Badges / pills */}
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

                  {/* View official report card button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-semibold gap-1.5 mt-1 border-primary/30 text-primary hover:bg-primary/5 hover:border-primary"
                    onClick={() => {
                      const url = `/report-card/${activeTenantId}/${exam.exam_id}/${activeChild.student_id}`;
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
      </CardContent>
    </Card>
  );
};
