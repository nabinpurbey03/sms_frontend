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
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
  UserX,
  ShieldAlert,
} from 'lucide-react';
import type { AtRiskStudentDTO } from '../../types';

interface AtRiskStudentTableProps {
  students: AtRiskStudentDTO[];
  className?: string;
}

type SeverityFilter = 'ALL' | 'CRITICAL' | 'HIGH' | 'MODERATE' | 'WATCHLIST';

const ITEMS_PER_PAGE = 10;

export const AtRiskStudentTable: React.FC<AtRiskStudentTableProps> = ({
  students,
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter students based on search and severity
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      // Severity filter
      if (severityFilter !== 'ALL' && student.risk_level !== severityFilter) {
        return false;
      }

      // Search query filter (matches student name or class name)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = student.student_name.toLowerCase().includes(query);
        const matchesClass = student.class_name.toLowerCase().includes(query);
        const matchesSection = student.section_name?.toLowerCase().includes(query) ?? false;
        return matchesName || matchesClass || matchesSection;
      }

      return true;
    });
  }, [students, severityFilter, searchQuery]);

  // Reset pagination on filter change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, severityFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / ITEMS_PER_PAGE));
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredStudents.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredStudents, currentPage]);

  const renderRiskBadge = (level: AtRiskStudentDTO['risk_level']) => {
    switch (level) {
      case 'CRITICAL':
        return (
          <Badge
            variant="outline"
            className="bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-300 dark:border-rose-800 font-semibold"
          >
            CRITICAL (&lt;65%)
          </Badge>
        );
      case 'HIGH':
        return (
          <Badge
            variant="outline"
            className="bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300 border-orange-300 dark:border-orange-800 font-semibold"
          >
            HIGH (65-75%)
          </Badge>
        );
      case 'MODERATE':
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-medium"
          >
            MODERATE (75-80%)
          </Badge>
        );
      case 'WATCHLIST':
        return (
          <Badge
            variant="outline"
            className="bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border-sky-300 dark:border-sky-800 font-medium"
          >
            WATCHLIST (80-85%)
          </Badge>
        );
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  const getRateColor = (rate: number) => {
    if (rate < 65) return 'bg-rose-500';
    if (rate < 75) return 'bg-orange-500';
    if (rate < 80) return 'bg-amber-500';
    return 'bg-sky-500';
  };

  const getRateTextColor = (rate: number) => {
    if (rate < 65) return 'text-rose-600 dark:text-rose-400 font-bold';
    if (rate < 75) return 'text-orange-600 dark:text-orange-400 font-semibold';
    if (rate < 80) return 'text-amber-600 dark:text-amber-400 font-semibold';
    return 'text-sky-600 dark:text-sky-400 font-medium';
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              Early Warning At-Risk Student Registry
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Students identified with chronic absenteeism or declining attendance requiring pastoral intervention.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground">
              Total Flagged:{' '}
              <strong className="text-foreground font-semibold">{students.length}</strong>
            </span>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by student name or class..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0 hidden sm:inline-block" />
            <Select
              value={severityFilter}
              onValueChange={(val) => setSeverityFilter(val as SeverityFilter)}
            >
              <SelectTrigger className="w-[170px] h-9 text-xs">
                <SelectValue placeholder="Filter Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">All Risk Levels ({students.length})</SelectItem>
                <SelectItem value="CRITICAL" className="text-xs">
                  Critical ({students.filter((s) => s.risk_level === 'CRITICAL').length})
                </SelectItem>
                <SelectItem value="HIGH" className="text-xs">
                  High ({students.filter((s) => s.risk_level === 'HIGH').length})
                </SelectItem>
                <SelectItem value="MODERATE" className="text-xs">
                  Moderate ({students.filter((s) => s.risk_level === 'MODERATE').length})
                </SelectItem>
                <SelectItem value="WATCHLIST" className="text-xs">
                  Watchlist ({students.filter((s) => s.risk_level === 'WATCHLIST').length})
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {students.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mb-3 text-emerald-600 dark:text-emerald-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h4 className="font-semibold text-foreground text-sm">Clean Attendance Health</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              No students currently flagged at risk for this academic session.
            </p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground flex flex-col items-center justify-center">
            <UserX className="w-8 h-8 text-muted-foreground/60 mb-2" />
            <p className="text-sm font-medium text-foreground">No students match filter criteria</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Try adjusting your search keywords or risk severity filter.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[220px]">Student Name</TableHead>
                    <TableHead className="w-[160px]">Class & Section</TableHead>
                    <TableHead className="w-[190px]">Attendance Rate</TableHead>
                    <TableHead className="text-center">Present / Total Days</TableHead>
                    <TableHead className="text-center">Absent Days</TableHead>
                    <TableHead className="text-right">Risk Level</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedStudents.map((student) => (
                    <TableRow key={student.student_id}>
                      <TableCell className="font-medium text-foreground">
                        {student.student_name}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{student.class_name}</span>
                        {student.section_name && <span> - Section {student.section_name}</span>}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className={getRateTextColor(student.attendance_rate)}>
                              {student.attendance_rate.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${getRateColor(student.attendance_rate)}`}
                              style={{
                                width: `${Math.min(Math.max(student.attendance_rate, 0), 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium text-xs">
                        <span className="text-emerald-600 dark:text-emerald-400">{student.present_days}</span>
                        {' '}/ {student.total_sessions}
                      </TableCell>
                      <TableCell className="text-center font-medium text-xs text-rose-600 dark:text-rose-400">
                        {student.absent_days}
                      </TableCell>
                      <TableCell className="text-right">
                        {renderRiskBadge(student.risk_level)}
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
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredStudents.length)}
                </span>{' '}
                of{' '}
                <span className="font-medium text-foreground">{filteredStudents.length}</span> at-risk
                students
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
