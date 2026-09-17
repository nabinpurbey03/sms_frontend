import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  GraduationCap,
  BookOpen,
} from 'lucide-react';
import type { SubjectMasteryMetric } from '../../types';

interface SubjectMasteryTableProps {
  mastery: SubjectMasteryMetric[];
  className?: string;
}

type DifficultyFilter = 'ALL' | 'Rigorous' | 'Balanced' | 'High Mastery';

const ITEMS_PER_PAGE = 10;

export const SubjectMasteryTable: React.FC<SubjectMasteryTableProps> = ({
  mastery,
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter subjects based on search and difficulty
  const filteredMastery = useMemo(() => {
    return mastery.filter((item) => {
      // Difficulty filter
      if (difficultyFilter !== 'ALL' && item.difficulty_classification !== difficultyFilter) {
        return false;
      }

      // Search query filter (matches subject name or class name)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesSubject = item.subject_name.toLowerCase().includes(query);
        const matchesClass = item.class_name ? item.class_name.toLowerCase().includes(query) : false;
        return matchesSubject || matchesClass;
      }

      return true;
    });
  }, [mastery, difficultyFilter, searchQuery]);

  // Reset pagination on filter change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, difficultyFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredMastery.length / ITEMS_PER_PAGE));
  const paginatedMastery = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMastery.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredMastery, currentPage]);

  const renderDifficultyBadge = (diff: SubjectMasteryMetric['difficulty_classification']) => {
    switch (diff) {
      case 'Rigorous':
        return (
          <Badge
            variant="outline"
            className="bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-300 dark:border-rose-800 font-semibold text-[11px]"
          >
            Rigorous (&lt;60%)
          </Badge>
        );
      case 'Balanced':
        return (
          <Badge
            variant="outline"
            className="bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border-sky-300 dark:border-sky-800 font-medium text-[11px]"
          >
            Balanced (60-85%)
          </Badge>
        );
      case 'High Mastery':
        return (
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-semibold text-[11px]"
          >
            High Mastery (&gt;85%)
          </Badge>
        );
      default:
        return <Badge variant="outline">{diff}</Badge>;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-indigo-500';
    return 'bg-rose-500';
  };

  const getScoreTextColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 dark:text-emerald-400 font-semibold';
    if (score >= 60) return 'text-indigo-600 dark:text-indigo-400 font-semibold';
    return 'text-rose-600 dark:text-rose-400 font-bold';
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-primary" />
              Curriculum Mastery &amp; Subject Difficulty Registry
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Comprehensive subject-level metrics on pass rates, score distributions, and academic rigor classification.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground">
              Total Subjects:{' '}
              <strong className="text-foreground font-semibold">{mastery.length}</strong>
            </span>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by subject name or class..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0 hidden sm:inline-block" />
            <Select
              value={difficultyFilter}
              onValueChange={(val) => setDifficultyFilter(val as DifficultyFilter)}
            >
              <SelectTrigger className="w-[180px] h-9 text-xs">
                <SelectValue placeholder="Filter Classification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">
                  All Classifications ({mastery.length})
                </SelectItem>
                <SelectItem value="Rigorous" className="text-xs">
                  Rigorous ({mastery.filter((m) => m.difficulty_classification === 'Rigorous').length})
                </SelectItem>
                <SelectItem value="Balanced" className="text-xs">
                  Balanced ({mastery.filter((m) => m.difficulty_classification === 'Balanced').length})
                </SelectItem>
                <SelectItem value="High Mastery" className="text-xs">
                  High Mastery ({mastery.filter((m) => m.difficulty_classification === 'High Mastery').length})
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {mastery.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mb-3">
              <BookOpen className="w-6 h-6 text-muted-foreground/60" />
            </div>
            <h4 className="font-semibold text-foreground text-sm">No Curriculum Data</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              No subject mastery evaluations recorded for this academic session yet.
            </p>
          </div>
        ) : filteredMastery.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground flex flex-col items-center justify-center">
            <BookOpen className="w-8 h-8 text-muted-foreground/60 mb-2" />
            <p className="text-sm font-medium text-foreground">No subjects match filter criteria</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Try adjusting your search query or difficulty classification filter.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Subject Name</TableHead>
                    <TableHead className="w-[140px]">Class</TableHead>
                    <TableHead className="w-[180px]">Average Score</TableHead>
                    <TableHead className="text-center">Pass Rate</TableHead>
                    <TableHead className="text-center">Score Range (Min - Max)</TableHead>
                    <TableHead className="text-center">Classification</TableHead>
                    <TableHead className="text-right">Evaluated Scores</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedMastery.map((item) => (
                    <TableRow key={item.subject_id}>
                      <TableCell className="font-medium text-foreground">
                        {item.subject_name}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.class_name ? (
                          <span className="font-medium text-foreground">{item.class_name}</span>
                        ) : (
                          <span className="text-muted-foreground/60">&mdash;</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className={getScoreTextColor(item.average_score_pct)}>
                              {item.average_score_pct.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${getScoreColor(item.average_score_pct)}`}
                              style={{
                                width: `${Math.min(Math.max(item.average_score_pct, 0), 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium text-xs">
                        <span
                          className={
                            item.pass_rate_pct >= 85
                              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                              : item.pass_rate_pct >= 60
                              ? 'text-foreground'
                              : 'text-rose-600 dark:text-rose-400 font-semibold'
                          }
                        >
                          {item.pass_rate_pct.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-medium text-xs text-muted-foreground">
                        <span className="text-foreground">{item.lowest_score}%</span>
                        {' '}&ndash;{' '}
                        <span className="text-foreground">{item.highest_score}%</span>
                      </TableCell>
                      <TableCell className="text-center">
                        {renderDifficultyBadge(item.difficulty_classification)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-xs text-foreground">
                        {item.total_scores_evaluated.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination / Record info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 text-xs text-muted-foreground">
              <div>
                Showing{' '}
                <span className="font-medium text-foreground">
                  {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium text-foreground">
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredMastery.length)}
                </span>{' '}
                of{' '}
                <span className="font-medium text-foreground">{filteredMastery.length}</span> subjects
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-xs"
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                    Previous
                  </Button>
                  <span className="px-2 font-medium text-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-xs"
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
