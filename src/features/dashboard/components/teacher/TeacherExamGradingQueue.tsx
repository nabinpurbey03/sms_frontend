import React, { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Award, CheckCircle2, Clock, Sparkles, Edit3 } from 'lucide-react';
import { useTeacherExamAssignments } from '@/features/examination/hooks';
import type { TeacherExamSubjectAssignment } from '@/features/examination/types';

export interface TeacherExamGradingQueueProps {
  tenantId: string;
}

function renderStatusBadge(status?: string) {
  const normalized = (status || 'PENDING').toUpperCase();

  switch (normalized) {
    case 'SUBMITTED':
      return (
        <Badge variant="success" className="text-xs px-2 py-0.5 gap-1 font-semibold shrink-0">
          <CheckCircle2 className="w-3 h-3" />
          Submitted
        </Badge>
      );
    case 'APPROVED':
      return (
        <Badge variant="info" className="text-xs px-2 py-0.5 gap-1 font-semibold shrink-0">
          <Sparkles className="w-3 h-3" />
          Published
        </Badge>
      );
    case 'DRAFT':
    case 'PENDING':
    default:
      return (
        <Badge variant="warning" className="text-xs px-2 py-0.5 gap-1 font-semibold shrink-0">
          <Clock className="w-3 h-3" />
          Scores Pending
        </Badge>
      );
  }
}

export const TeacherExamGradingQueue: React.FC<TeacherExamGradingQueueProps> = ({ tenantId }) => {
  const { data: assignments = [], isLoading } = useTeacherExamAssignments(tenantId || null);

  const pendingCount = useMemo(() => {
    return assignments.filter((a) => {
      const st = (a.status || 'PENDING').toUpperCase();
      return st === 'DRAFT' || st === 'PENDING' || !a.submitted_at;
    }).length;
  }, [assignments]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Award className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                Examinations & Grading Queue
              </h2>
              {pendingCount > 0 ? (
                <Badge variant="warning" className="text-xs font-semibold">
                  {pendingCount} Pending Submission
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs font-semibold">
                  {assignments.length} Assigned
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Active term examinations and subject score submissions
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2].map((i) => (
            <Card key={i} className="p-4 space-y-3 animate-pulse border-border">
              <div className="flex items-center justify-between gap-2">
                <div className="h-4 bg-muted rounded w-28" />
                <div className="h-5 bg-muted rounded-full w-24" />
              </div>
              <div className="h-4 bg-muted rounded w-40" />
              <div className="h-3 bg-muted rounded w-32" />
              <div className="h-8 bg-muted rounded w-full pt-2" />
            </Card>
          ))}
        </div>
      ) : assignments.length === 0 ? (
        <Card className="border-dashed p-8 text-center bg-card/60 flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-foreground">
            No active examination grading duties. All subject scores are up to date! ✨
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignments.map((item: TeacherExamSubjectAssignment) => {
            const isSubmittedOrApproved =
              (item.status as string) === 'SUBMITTED' ||
              (item.status as string) === 'APPROVED';

            return (
              <Card
                key={item.exam_subject_id}
                className="hover:border-primary/50 transition-colors shadow-2xs flex flex-col justify-between"
              >
                <CardContent className="p-4 space-y-3">
                  {/* Header: Exam name and Status Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      className="font-bold text-sm text-foreground truncate"
                      title={item.exam_name}
                    >
                      {item.exam_name}
                    </h3>
                    {renderStatusBadge(item.status)}
                  </div>

                  {/* Class & Subject Title */}
                  <div>
                    <p
                      className="text-xs text-muted-foreground font-medium truncate"
                      title={`${item.class_name} • ${item.subject_name}`}
                    >
                      {item.class_name} • {item.subject_name}
                    </p>
                  </div>

                  {/* Metrics row */}
                  <div className="text-xs text-muted-foreground pt-1 border-t border-border flex items-center justify-between">
                    <span>
                      Full Mark:{' '}
                      <span className="font-semibold text-foreground">{item.full_mark}</span>
                    </span>
                    <span>
                      Pass Mark:{' '}
                      <span className="font-semibold text-foreground">{item.pass_mark}</span>
                    </span>
                  </div>

                  {/* Direct action button */}
                  <div className="pt-2 border-t border-border">
                    <Button
                      size="sm"
                      asChild
                      className="w-full text-xs font-semibold h-8 gap-1.5 cursor-pointer"
                    >
                      <Link
                        to="/examination/scores"
                        search={
                          {
                            examId: item.exam_id,
                            classId: item.class_id,
                            subjectId: item.subject_id,
                          } as any
                        }
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        {isSubmittedOrApproved ? 'Review Scores' : 'Enter Scores'}
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
  );
};
