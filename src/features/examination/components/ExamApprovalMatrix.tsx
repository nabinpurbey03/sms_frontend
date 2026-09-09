import React, { useState, useMemo } from 'react';
import type { ExamFullReviewResponse } from '../types';
import { InlineScoreCell } from './InlineScoreCell';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import {
  Search,
  CheckCircle2,
  Clock,
  User,
  Users,
  Award,
  Filter,
  FileText,
} from 'lucide-react';
import { useAuth } from '@/auth/useAuth';
import { cn } from '@/lib/utils';

export interface ExamApprovalMatrixProps {
  review: ExamFullReviewResponse;
  canEdit: boolean;
  onSaveScore: (
    examSubjectId: string,
    studentId: string,
    newScore: number | null,
    newIsAbsent: boolean
  ) => Promise<void>;
}

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const ExamApprovalMatrix: React.FC<ExamApprovalMatrixProps> = ({
  review,
  canEdit,
  onSaveScore,
}) => {
  const { activeTenantId } = useAuth();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('ALL');

  // Extract unique sections
  const sections = useMemo(() => {
    const map = new Map<string, string>();
    review.students.forEach((st) => {
      if (st.section_id && st.section_name) {
        map.set(st.section_id, st.section_name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [review.students]);

  // Filter students based on search and section
  const filteredStudents = useMemo(() => {
    return review.students.filter((st) => {
      const fullName = [st.first_name, st.middle_name, st.last_name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch =
        !searchQuery.trim() || fullName.includes(searchQuery.toLowerCase().trim());

      const matchesSection =
        selectedSection === 'ALL' ||
        st.section_id === selectedSection ||
        st.section_name === selectedSection;

      return matchesSearch && matchesSection;
    });
  }, [review.students, searchQuery, selectedSection]);

  const totalStudents = review.students.length;
  const passCount = review.students.filter((s) => s.passed_all).length;
  const failCount = totalStudents - passCount;

  return (
    <div className="space-y-4">
      {/* Search & Section Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3.5 rounded-xl border border-border shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search student name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          {sections.length > 0 && (
            <div className="flex items-center gap-1 overflow-x-auto">
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1 mr-1">
                <Filter className="w-3.5 h-3.5" />
                Section:
              </span>
              <Button
                type="button"
                size="sm"
                variant={selectedSection === 'ALL' ? 'default' : 'outline'}
                onClick={() => setSelectedSection('ALL')}
                className="h-8 text-xs px-2.5 rounded-full"
              >
                All
              </Button>
              {sections.map((sec) => (
                <Button
                  key={sec.id}
                  type="button"
                  size="sm"
                  variant={selectedSection === sec.id ? 'default' : 'outline'}
                  onClick={() => setSelectedSection(sec.id)}
                  className="h-8 text-xs px-2.5 rounded-full"
                >
                  {sec.name}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Student Stats */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground self-end sm:self-center shrink-0">
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-primary" />
            <span>
              Showing {filteredStudents.length} of {totalStudents}
            </span>
          </span>
          <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
            <Award className="w-3.5 h-3.5" />
            <span>Passed: {passCount}</span>
          </span>
          <span className="flex items-center gap-1 font-medium text-destructive">
            <span>Failed: {failCount}</span>
          </span>
        </div>
      </div>

      {/* Main Results Matrix Table */}
      {review.students.length === 0 ? (
        <Card className="border-dashed p-8 text-center bg-card/60">
          <p className="text-sm text-muted-foreground">
            No students are currently enrolled in this class.
          </p>
        </Card>
      ) : filteredStudents.length === 0 ? (
        <Card className="border-dashed p-8 text-center bg-card/60">
          <p className="text-sm text-muted-foreground">
            No students match your filter criteria.
          </p>
        </Card>
      ) : (
        <div className="w-full overflow-x-auto rounded-xl border border-border bg-card shadow-2xs">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {/* Sticky Student Column Header */}
                <th
                  scope="col"
                  className={cn(
                    'sticky left-0 z-20 min-w-[220px] max-w-[240px] px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider',
                    'bg-muted/95 backdrop-blur shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-border'
                  )}
                >
                  Student
                </th>

                {/* Dynamic Subject Headers */}
                {review.subjects.map((subj) => (
                  <th
                    key={subj.id}
                    scope="col"
                    className="min-w-[170px] px-3 py-3 text-center border-r border-border last:border-r-0"
                  >
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="font-bold text-foreground text-xs leading-snug">
                        {subj.subject_name}
                      </span>
                      <div className="flex items-center gap-1">
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 font-medium"
                        >
                          F: {subj.full_mark} | P: {subj.pass_mark}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground max-w-[150px] truncate">
                        <User className="w-3 h-3 shrink-0" />
                        <span className="truncate">
                          {subj.assigned_teacher_name || 'Unassigned'}
                        </span>
                      </div>
                      <div>
                        {subj.status === 'SUBMITTED' ? (
                          <Badge
                            variant="success"
                            className="text-[10px] px-2 py-0 gap-1 font-semibold"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            SUBMITTED
                          </Badge>
                        ) : (
                          <Badge
                            variant="warning"
                            className="text-[10px] px-2 py-0 gap-1 font-semibold"
                          >
                            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            PENDING
                          </Badge>
                        )}
                      </div>
                    </div>
                  </th>
                ))}

                {/* Overall Aggregates Columns */}
                <th
                  scope="col"
                  className="min-w-[110px] px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider border-r border-border"
                >
                  Total Score
                </th>
                <th
                  scope="col"
                  className="min-w-[90px] px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider border-r border-border"
                >
                  Percentage
                </th>
                <th
                  scope="col"
                  className="min-w-[90px] px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider"
                >
                  Result
                </th>
                {!canEdit && (
                  <th
                    scope="col"
                    className="min-w-[100px] px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider border-l border-border"
                  >
                    Report Card
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredStudents.map((st) => {
                const fullName = [st.first_name, st.middle_name, st.last_name]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <tr
                    key={st.student_id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    {/* Sticky Student Row Cell */}
                    <td
                      className={cn(
                        'sticky left-0 z-10 px-4 py-3 min-w-[220px] max-w-[240px]',
                        'bg-card/95 backdrop-blur shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-border'
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-7 w-7 text-xs shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {getInitials(fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-xs text-foreground truncate">
                            {fullName}
                          </span>
                          {st.section_name && (
                            <div className="mt-0.5">
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 font-normal"
                              >
                                {st.section_name}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Dynamic Subject Score Cells */}
                    {review.subjects.map((subj) => {
                      const scoreRecord =
                        st.subject_scores[subj.subject_id] ||
                        st.subject_scores[subj.id];

                      return (
                        <td
                          key={subj.id}
                          className="px-2 py-2 text-center border-r border-border last:border-r-0"
                        >
                          <InlineScoreCell
                            score={scoreRecord?.score}
                            isAbsent={scoreRecord?.is_absent ?? false}
                            fullMark={subj.full_mark}
                            passMark={subj.pass_mark}
                            canEdit={canEdit}
                            onSave={(newScore, newIsAbsent) =>
                              onSaveScore(
                                subj.id,
                                st.student_id,
                                newScore,
                                newIsAbsent
                              )
                            }
                          />
                        </td>
                      );
                    })}

                    {/* Total Score */}
                    <td className="px-3 py-2 text-center border-r border-border font-mono text-xs font-semibold text-foreground">
                      {st.total_score}
                      <span className="text-[11px] text-muted-foreground font-normal">
                        {' '}
                        / {st.total_full_mark}
                      </span>
                    </td>

                    {/* Percentage */}
                    <td className="px-3 py-2 text-center border-r border-border font-mono text-xs font-semibold">
                      {typeof st.percentage === 'number'
                        ? `${st.percentage.toFixed(1)}%`
                        : '0.0%'}
                    </td>

                    {/* Result Badge */}
                    <td className="px-3 py-2 text-center">
                      {st.passed_all ? (
                        <Badge
                          variant="success"
                          className="text-[11px] font-semibold px-2 py-0.5"
                        >
                          Pass
                        </Badge>
                      ) : (
                        <Badge
                          variant="destructive"
                          className="text-[11px] font-semibold px-2 py-0.5"
                        >
                          Fail
                        </Badge>
                      )}
                    </td>

                    {/* Report Card Preview Action (When Approved) */}
                    {!canEdit && (
                      <td className="px-3 py-2 text-center border-l border-border">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs px-2 gap-1 text-primary hover:bg-primary/10 cursor-pointer"
                          onClick={() => {
                            const url = `/report-card/${activeTenantId}/${review.exam.id}/${st.student_id}`;
                            window.open(url, '_blank');
                          }}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Preview</span>
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
