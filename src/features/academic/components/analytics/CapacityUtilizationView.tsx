import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from 'recharts';
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
  Users,
  CheckCircle2,
  AlertTriangle,
  TrendingDown,
  Layers,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  BarChart3,
  Loader2,
  AlertCircle,
  Settings2,
} from 'lucide-react';
import { useCapacityUtilization } from '../../hooks';
import type { SectionCapacityMetric } from '../../types';

interface CapacityUtilizationViewProps {
  tenantId: string;
  academicYearId: string;
}

type StatusFilter = 'ALL' | 'OVERCROWDED' | 'OPTIMAL' | 'BALANCED' | 'UNDERUTILIZED';

const ITEMS_PER_PAGE = 10;
const CAPACITY_PRESETS = [35, 40, 45, 50];

export const CapacityUtilizationView: React.FC<CapacityUtilizationViewProps> = ({
  tenantId,
  academicYearId,
}) => {
  const [targetCapacity, setTargetCapacity] = useState<number>(40);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading, error } = useCapacityUtilization(
    tenantId,
    academicYearId,
    targetCapacity
  );

  const sections = useMemo(() => data?.sections_breakdown || [], [data]);

  // Filtered sections based on search query and status filter
  const filteredSections = useMemo(() => {
    return sections.filter((s) => {
      if (statusFilter !== 'ALL' && s.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesClass = s.class_name.toLowerCase().includes(q);
        const matchesSection = s.section_name.toLowerCase().includes(q);
        const combined = `${s.class_name} ${s.section_name}`.toLowerCase();
        return matchesClass || matchesSection || combined.includes(q);
      }
      return true;
    });
  }, [sections, statusFilter, searchQuery]);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, targetCapacity]);

  const totalPages = Math.max(1, Math.ceil(filteredSections.length / ITEMS_PER_PAGE));
  const paginatedSections = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSections.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredSections, currentPage]);

  const getStatusColor = (status: SectionCapacityMetric['status']) => {
    switch (status) {
      case 'OVERCROWDED':
        return '#f43f5e'; // rose-500
      case 'OPTIMAL':
        return '#10b981'; // emerald-500
      case 'BALANCED':
        return '#3b82f6'; // blue-500
      case 'UNDERUTILIZED':
        return '#f59e0b'; // amber-500
      default:
        return '#64748b'; // slate-500
    }
  };

  const getStatusBadge = (status: SectionCapacityMetric['status']) => {
    switch (status) {
      case 'OVERCROWDED':
        return (
          <Badge
            variant="outline"
            className="border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-400 font-semibold gap-1"
          >
            <AlertTriangle className="w-3 h-3 text-rose-500" />
            Overcrowded
          </Badge>
        );
      case 'OPTIMAL':
        return (
          <Badge
            variant="outline"
            className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 font-semibold gap-1"
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            Optimal
          </Badge>
        );
      case 'BALANCED':
        return (
          <Badge
            variant="outline"
            className="border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-400 font-semibold"
          >
            Balanced
          </Badge>
        );
      case 'UNDERUTILIZED':
        return (
          <Badge
            variant="outline"
            className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400 font-semibold gap-1"
          >
            <TrendingDown className="w-3 h-3 text-amber-500" />
            Underutilized
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getFillRateColor = (rate: number) => {
    if (rate > 100) return 'bg-rose-500';
    if (rate >= 80) return 'bg-emerald-500';
    if (rate >= 60) return 'bg-blue-500';
    return 'bg-amber-500';
  };

  if (isLoading) {
    return (
      <div className="p-16 text-center text-muted-foreground flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Analyzing classroom section capacity &amp; utilization...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="p-8 text-center border-destructive/30">
        <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-2" />
        <h4 className="text-base font-semibold text-foreground">Capacity Analytics Unavailable</h4>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          Unable to compute classroom section capacity metrics for this academic year. Please ensure
          classrooms and student enrollments are configured.
        </p>
      </Card>
    );
  }

  // Format data for bar chart
  const chartData = sections.map((s) => ({
    name: `${s.class_name} - ${s.section_name}`,
    enrolled_count: s.enrolled_count,
    target_capacity: s.target_capacity,
    utilization_rate_pct: s.utilization_rate_pct,
    status: s.status,
  }));

  return (
    <div className="space-y-6">
      {/* Target Capacity Configuration Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-card/60 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Settings2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">Target Section Benchmark</h4>
            <p className="text-xs text-muted-foreground">
              Define the baseline classroom student threshold to calculate capacity utilization
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground mr-1">Threshold:</span>
          {CAPACITY_PRESETS.map((preset) => (
            <Button
              key={preset}
              variant={targetCapacity === preset ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTargetCapacity(preset)}
              className="h-8 px-3 text-xs font-medium"
            >
              {preset} Seats
            </Button>
          ))}
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Average Section Size */}
        <Card className="p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Average Section Size</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {data.average_section_size.toFixed(1)}
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-300 text-[11px]">
              {data.total_enrolled_students} Students
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Across {data.total_sections} classroom sections
          </p>
        </Card>

        {/* Optimal Sections Count */}
        <Card className="p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Optimal Sections</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {data.optimal_sections_count}
            </div>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300 text-[11px]">
              {data.total_sections > 0
                ? `${((data.optimal_sections_count / data.total_sections) * 100).toFixed(0)}% of total`
                : '0%'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Within 80%–100% capacity balance
          </p>
        </Card>

        {/* Overcrowded Sections Count */}
        <Card className="p-5 relative overflow-hidden border-rose-200 dark:border-rose-900/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Overcrowded Sections</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
              {data.overcrowded_sections_count}
            </div>
            <Badge
              variant="outline"
              className="bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-300 text-[11px] font-semibold"
            >
              {data.overcrowded_sections_count > 0 ? 'Exceeds Target' : 'None'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Exceeding {targetCapacity} students target
          </p>
        </Card>

        {/* Underutilized Sections Count */}
        <Card className="p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Underutilized Sections</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              {data.underutilized_sections_count}
            </div>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-300 text-[11px]">
              {data.total_sections > 0
                ? `${((data.underutilized_sections_count / data.total_sections) * 100).toFixed(0)}% of total`
                : '0%'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Less than 60% classroom occupancy
          </p>
        </Card>
      </div>

      {/* Visual Chart: Section Occupancy vs Target Capacity */}
      <Card className="p-6">
        <CardHeader className="p-0 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Section Occupancy vs Target Capacity ({targetCapacity} Seats)
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Bar height indicates active enrolled students. Dashed reference line denotes target section capacity.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
                <span>Overcrowded</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                <span>Optimal</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
                <span>Balanced</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                <span>Underutilized</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {chartData.length === 0 ? (
            <div className="h-[320px] flex items-center justify-center text-sm text-muted-foreground">
              No section data available to chart.
            </div>
          ) : (
            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 15, right: 25, left: -10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    domain={[0, (dataMax: number) => Math.max(dataMax + 5, targetCapacity + 10)]}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-lg border bg-popover/95 backdrop-blur-sm p-3 shadow-xl text-popover-foreground text-xs min-w-[200px] space-y-1.5 border-border/80">
                          <div className="font-semibold text-sm border-b pb-1 text-foreground">
                            {d.name}
                          </div>
                          <div className="flex justify-between items-center text-muted-foreground">
                            <span>Enrolled:</span>
                            <span className="font-semibold text-foreground">{d.enrolled_count} students</span>
                          </div>
                          <div className="flex justify-between items-center text-muted-foreground">
                            <span>Target:</span>
                            <span className="font-semibold text-foreground">{d.target_capacity} seats</span>
                          </div>
                          <div className="flex justify-between items-center text-muted-foreground">
                            <span>Fill Rate:</span>
                            <span className="font-semibold text-foreground">
                              {d.utilization_rate_pct.toFixed(1)}%
                            </span>
                          </div>
                          <div className="pt-1 flex justify-between items-center">
                            <span>Status:</span>
                            <span
                              className="font-bold px-1.5 py-0.5 rounded text-[10px]"
                              style={{
                                color: getStatusColor(d.status),
                                backgroundColor: `${getStatusColor(d.status)}15`,
                              }}
                            >
                              {d.status}
                            </span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine
                    y={targetCapacity}
                    stroke="#e11d48"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `Target: ${targetCapacity}`,
                      position: 'top',
                      fill: '#e11d48',
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  />
                  <Bar dataKey="enrolled_count" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section Capacity Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                Section Capacity Breakdown
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Detailed roster count, target thresholds, and fill rates across all classroom sections.
              </CardDescription>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Filter by class or section..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>

              <div className="w-full sm:w-44">
                <Select
                  value={statusFilter}
                  onValueChange={(val) => setStatusFilter(val as StatusFilter)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <Filter className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL" className="text-xs">All Statuses</SelectItem>
                    <SelectItem value="OVERCROWDED" className="text-xs text-rose-600 font-medium">Overcrowded</SelectItem>
                    <SelectItem value="OPTIMAL" className="text-xs text-emerald-600 font-medium">Optimal</SelectItem>
                    <SelectItem value="BALANCED" className="text-xs text-blue-600 font-medium">Balanced</SelectItem>
                    <SelectItem value="UNDERUTILIZED" className="text-xs text-amber-600 font-medium">Underutilized</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredSections.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium text-foreground">No matching sections found</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Try adjusting your search query or status filter.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[220px]">Class &amp; Section</TableHead>
                      <TableHead className="text-center w-[140px]">Enrolled Students</TableHead>
                      <TableHead className="text-center w-[130px]">Target Capacity</TableHead>
                      <TableHead className="w-[200px]">Fill Rate %</TableHead>
                      <TableHead className="text-right w-[150px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedSections.map((s) => (
                      <TableRow key={s.section_id}>
                        <TableCell className="font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{s.class_name}</span>
                            <span className="text-muted-foreground">&ndash;</span>
                            <span className="text-primary font-medium">Section {s.section_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-semibold text-foreground">
                          {s.enrolled_count}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {s.target_capacity}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium text-foreground">
                                {s.utilization_rate_pct.toFixed(1)}%
                              </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${getFillRateColor(s.utilization_rate_pct)}`}
                                style={{
                                  width: `${Math.min(Math.max(s.utilization_rate_pct, 0), 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {getStatusBadge(s.status)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-muted-foreground">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredSections.length)} of{' '}
                    {filteredSections.length} sections
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
