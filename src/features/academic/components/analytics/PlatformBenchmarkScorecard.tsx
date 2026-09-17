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
  Building2,
  Users,
  UserCheck,
  TrendingUp,
  Award,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  AlertCircle,
  Trophy,
  Globe,
  Sparkles,
} from 'lucide-react';
import { usePlatformBenchmark } from '../../hooks';
import type { SchoolBenchmarkCardDTO } from '../../types';

interface PlatformBenchmarkScorecardProps {
  className?: string;
}

type TierFilter = 'ALL' | 'Top Tier' | 'Strong' | 'Average' | 'Requires Support';

const ITEMS_PER_PAGE = 10;

export const PlatformBenchmarkScorecard: React.FC<PlatformBenchmarkScorecardProps> = ({
  className,
}) => {
  const { data, isLoading, error } = usePlatformBenchmark();
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<TierFilter>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  const schools = useMemo(() => data?.schools_ranked || [], [data]);

  // Filtered schools
  const filteredSchools = useMemo(() => {
    return schools.filter((s) => {
      if (tierFilter !== 'ALL' && s.performance_tier !== tierFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = s.school_name.toLowerCase().includes(q);
        const matchesDomain = s.domain_name ? s.domain_name.toLowerCase().includes(q) : false;
        return matchesName || matchesDomain;
      }
      return true;
    });
  }, [schools, tierFilter, searchQuery]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, tierFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredSchools.length / ITEMS_PER_PAGE));
  const paginatedSchools = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSchools.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredSchools, currentPage]);

  const renderTierBadge = (tier: SchoolBenchmarkCardDTO['performance_tier']) => {
    switch (tier) {
      case 'Top Tier':
        return (
          <Badge
            variant="outline"
            className="border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/60 dark:text-purple-300 font-semibold gap-1"
          >
            <Sparkles className="w-3 h-3 text-purple-500" />
            Top Tier
          </Badge>
        );
      case 'Strong':
        return (
          <Badge
            variant="outline"
            className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold gap-1"
          >
            <Award className="w-3 h-3 text-emerald-500" />
            Strong
          </Badge>
        );
      case 'Average':
        return (
          <Badge
            variant="outline"
            className="border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300 font-semibold"
          >
            Average
          </Badge>
        );
      case 'Requires Support':
        return (
          <Badge
            variant="outline"
            className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-semibold gap-1"
          >
            <AlertCircle className="w-3 h-3 text-amber-500" />
            Requires Support
          </Badge>
        );
      default:
        return <Badge variant="outline">{tier}</Badge>;
    }
  };

  const renderRankBadge = (index: number) => {
    if (index === 0) {
      return (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 font-bold text-xs border border-amber-300">
          #1
        </span>
      );
    }
    if (index === 1) {
      return (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-300">
          #2
        </span>
      );
    }
    if (index === 2) {
      return (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-950/70 dark:text-orange-300 font-bold text-xs border border-orange-300">
          #3
        </span>
      );
    }
    return <span className="text-xs font-semibold text-muted-foreground pl-1.5">#{index + 1}</span>;
  };

  if (isLoading) {
    return (
      <div className="p-16 text-center text-muted-foreground flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Aggregating cross-school network benchmarking intelligence...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="p-8 text-center border-destructive/30">
        <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-2" />
        <h4 className="text-base font-semibold text-foreground">Platform Benchmark Unavailable</h4>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          Unable to fetch network-wide comparative intelligence. Please ensure you have super-admin privileges.
        </p>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* Platform Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-gradient-to-r from-primary/5 via-primary/10 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shadow-sm">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-foreground">Network-Wide Institutional Benchmark</h3>
              <Badge variant="outline" className="bg-primary/15 text-primary border-primary/30 text-[10px] uppercase font-bold tracking-wider">
                SuperAdmin Intel
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Comparative scorecard benchmarking student retention, attendance efficiency, and performance across all school campuses.
            </p>
          </div>
        </div>
      </div>

      {/* Platform Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Evaluated Schools */}
        <Card className="p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Evaluated Schools</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {data.total_schools_evaluated}
            </div>
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-300 text-[11px]">
              Campuses Active
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Multi-tenant network branches
          </p>
        </Card>

        {/* Platform Average Attendance */}
        <Card className="p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Network Avg. Attendance</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {data.platform_average_attendance.toFixed(1)}%
            </div>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300 text-[11px]">
              Baseline Norm
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Average across evaluated institutions
          </p>
        </Card>

        {/* Platform Average Retention */}
        <Card className="p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Network Avg. Retention</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
              {data.platform_average_retention.toFixed(1)}%
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-300 text-[11px]">
              Year-over-Year
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Cohort progression benchmark
          </p>
        </Card>

        {/* Total Enrolled Students across Network */}
        <Card className="p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Network Students</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {data.platform_total_students.toLocaleString()}
            </div>
            <Badge variant="outline" className="bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-300 text-[11px]">
              Active Learners
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Enrolled across all network campuses
          </p>
        </Card>
      </div>

      {/* Multi-School Leaderboard Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                Network School Performance Leaderboard
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Comparative ranking of member institutions evaluated by attendance reliability, retention, and student volume.
              </CardDescription>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search schools..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>

              <div className="w-full sm:w-44">
                <Select
                  value={tierFilter}
                  onValueChange={(val) => setTierFilter(val as TierFilter)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <Filter className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                    <SelectValue placeholder="All Tiers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL" className="text-xs">All Tiers</SelectItem>
                    <SelectItem value="Top Tier" className="text-xs text-purple-600 font-medium">Top Tier</SelectItem>
                    <SelectItem value="Strong" className="text-xs text-emerald-600 font-medium">Strong</SelectItem>
                    <SelectItem value="Average" className="text-xs text-sky-600 font-medium">Average</SelectItem>
                    <SelectItem value="Requires Support" className="text-xs text-amber-600 font-medium">Requires Support</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredSchools.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium text-foreground">No schools matched the search criteria</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Try adjusting your search query or performance tier filter.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Rank</TableHead>
                      <TableHead className="w-[240px]">School Name</TableHead>
                      <TableHead className="text-center w-[130px]">Active Students</TableHead>
                      <TableHead className="text-center w-[140px]">Classes / Sections</TableHead>
                      <TableHead className="text-center w-[130px]">Attendance Rate</TableHead>
                      <TableHead className="text-center w-[130px]">Retention Rate</TableHead>
                      <TableHead className="text-center w-[110px]">Avg. GPA</TableHead>
                      <TableHead className="text-right w-[150px]">Performance Tier</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedSchools.map((school, idx) => {
                      const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + idx;
                      return (
                        <TableRow key={school.tenant_id}>
                          <TableCell>
                            {renderRankBadge(globalIndex)}
                          </TableCell>
                          <TableCell className="font-medium text-foreground">
                            <div>
                              <div className="font-semibold text-foreground text-sm">
                                {school.school_name}
                              </div>
                              {school.domain_name && (
                                <div className="text-[11px] text-muted-foreground">
                                  {school.domain_name}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-semibold text-foreground">
                            {school.active_students_count.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">{school.total_classes_count}</span> classes{' '}
                            / <span className="font-medium text-foreground">{school.total_sections_count}</span> sections
                          </TableCell>
                          <TableCell className="text-center text-xs">
                            {school.attendance_rate_pct != null ? (
                              <span
                                className={`font-semibold ${
                                  school.attendance_rate_pct >= 85
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : school.attendance_rate_pct >= 70
                                    ? 'text-foreground'
                                    : 'text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {school.attendance_rate_pct.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground/60">&mdash;</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-xs">
                            {school.retention_rate_pct != null ? (
                              <span
                                className={`font-semibold ${
                                  school.retention_rate_pct >= 80
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : school.retention_rate_pct >= 60
                                    ? 'text-foreground'
                                    : 'text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {school.retention_rate_pct.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground/60">&mdash;</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-xs">
                            {school.average_gpa != null ? (
                              <span className="font-semibold text-foreground">
                                {school.average_gpa.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/60">&mdash;</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {renderTierBadge(school.performance_tier)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-muted-foreground">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredSchools.length)} of{' '}
                    {filteredSchools.length} schools
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-7 w-7 p-0"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-xs font-medium px-2">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="h-7 w-7 p-0"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
