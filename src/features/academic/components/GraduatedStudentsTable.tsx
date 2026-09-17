import React, { useState, useEffect, useMemo } from 'react';
import {
  GraduationCap,
  Search,
  Download,
  RefreshCw,
  History,
  X,
  Filter,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAcademicYears } from '@/features/academic-year/hooks';
import { useClasses, useGraduatedStudents } from '../hooks';
import type { AcademicStudent, GraduatedStudentDTO } from '../types';
import { StudentEnrollmentHistoryDialog } from './StudentEnrollmentHistoryDialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface GraduatedStudentsTableProps {
  tenantId: string | null;
}

export const GraduatedStudentsTable: React.FC<GraduatedStudentsTableProps> = ({ tenantId }) => {
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('ALL');
  const [selectedClassId, setSelectedClassId] = useState('ALL');

  // History Dialog State
  const [historyStudent, setHistoryStudent] = useState<AcademicStudent | null>(null);

  // Debounce search query by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Dropdown options
  const { data: academicYears = [] } = useAcademicYears(tenantId);
  const { data: classes = [] } = useClasses(tenantId);

  // Graduated Students Query
  const {
    data: graduatedData,
    isLoading,
    isFetching,
    refetch,
  } = useGraduatedStudents(tenantId, {
    academic_year_id: selectedBatchId !== 'ALL' ? selectedBatchId : undefined,
    class_id: selectedClassId !== 'ALL' ? selectedClassId : undefined,
    search: debouncedSearch.trim() || undefined,
  });

  const graduates: GraduatedStudentDTO[] = useMemo(() => {
    if (!graduatedData) return [];
    if (Array.isArray(graduatedData)) return graduatedData;
    return (graduatedData as any).items || [];
  }, [graduatedData]);

  const getFullName = (s: GraduatedStudentDTO) => {
    return [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(' ');
  };

  const getInitials = (s: GraduatedStudentDTO) => {
    const f = s.first_name?.[0] || '';
    const l = s.last_name?.[0] || '';
    return (f + l).toUpperCase() || 'ST';
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toISOString().split('T')[0];
    } catch {
      return dateStr;
    }
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    if (!graduates.length) {
      toast.error('No alumni records available to export');
      return;
    }

    const headers = [
      'student_id',
      'name',
      'final_class',
      'final_section',
      'graduation_batch',
      'exit_date',
      'status',
    ];

    const rows = graduates.map((s) => [
      s.student_id,
      getFullName(s),
      s.final_class_name || '',
      s.final_section_name || '',
      s.graduation_academic_year_name || 'Alumni',
      s.exit_date ? s.exit_date.split('T')[0] : '',
      s.status || 'GRADUATED',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `alumni_roster_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Alumni Roster Exported', {
      description: `Exported ${graduates.length} alumni record(s) to CSV.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="p-4 rounded-xl border border-border/60 bg-card shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search alumni by name..."
              className="pl-9 pr-8 h-9 text-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground hidden lg:inline mr-1">
              Showing <strong className="text-foreground">{graduates.length}</strong> alumni
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={graduates.length === 0}
              className="h-9 gap-1.5 text-xs shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Alumni CSV</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading || isFetching}
              className="h-9 w-9 p-0"
              title="Refresh alumni"
            >
              <RefreshCw
                className={cn('w-3.5 h-3.5', (isLoading || isFetching) && 'animate-spin')}
              />
            </Button>
          </div>
        </div>

        {/* Dropdown Filters Row */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/50 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-semibold">Filter by:</span>
          </div>

          {/* Batch Selector */}
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">All Graduating Batches</option>
            {academicYears.map((yr) => (
              <option key={yr.id} value={yr.id}>
                {yr.name}
              </option>
            ))}
          </select>

          {/* Class Selector */}
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">All Final Classes</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>

          {/* Reset Filters */}
          {(selectedBatchId !== 'ALL' || selectedClassId !== 'ALL' || searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedBatchId('ALL');
                setSelectedClassId('ALL');
                setSearchQuery('');
              }}
              className="h-8 text-xs text-muted-foreground hover:text-foreground ml-auto"
            >
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Table Content */}
      <div className="rounded-2xl border bg-card shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 bg-muted/40 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : graduates.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">No Graduated Students Found</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Students marked as GRADUATED or promoted past final grade will appear in this directory.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[260px]">Student</TableHead>
                  <TableHead>Final Grade &amp; Section</TableHead>
                  <TableHead>Graduation Session</TableHead>
                  <TableHead>Graduation / Exit Date</TableHead>
                  <TableHead>Parent Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {graduates.map((student) => {
                  const fullName = getFullName(student);
                  const initials = getInitials(student);

                  return (
                    <TableRow key={student.student_id} className="hover:bg-muted/30">
                      {/* Student Info */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8 rounded-full border border-border/50 shrink-0">
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-[11px]">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-xs text-foreground truncate">
                              {fullName}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono truncate">
                              ID: {student.student_id.slice(0, 8)}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Final Grade & Section */}
                      <TableCell>
                        <Badge variant="secondary" className="text-xs font-normal">
                          {student.final_class_name}
                          {student.final_section_name ? ` - Section ${student.final_section_name}` : ''}
                        </Badge>
                      </TableCell>

                      {/* Graduation Session */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="text-xs font-normal gap-1 bg-muted/40"
                        >
                          <GraduationCap className="w-3.5 h-3.5 text-primary" />
                          <span>{student.graduation_academic_year_name || 'Alumni'}</span>
                        </Badge>
                      </TableCell>

                      {/* Graduation / Exit Date */}
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(student.exit_date)}
                      </TableCell>

                      {/* Parent Contact */}
                      <TableCell className="text-xs">
                        {student.parent_name || student.parent_phone ? (
                          <div className="flex flex-col min-w-0">
                            {student.parent_name && (
                              <span className="text-foreground font-medium truncate">
                                {student.parent_name}
                              </span>
                            )}
                            {student.parent_phone && (
                              <span className="text-muted-foreground text-[11px]">
                                {student.parent_phone}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">Not Linked</span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20 text-[10px] gap-1 px-2 py-0.5"
                        >
                          <GraduationCap className="w-3 h-3" />
                          Graduated
                        </Badge>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setHistoryStudent({
                              id: student.student_id,
                              tenant_id: tenantId || '',
                              first_name: student.first_name,
                              middle_name: student.middle_name,
                              last_name: student.last_name,
                              status: 'GRADUATED',
                            } as AcademicStudent)
                          }
                          className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-primary"
                        >
                          <History className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">View Academic History</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Student Enrollment History Dialog */}
      <StudentEnrollmentHistoryDialog
        open={!!historyStudent}
        onOpenChange={(val) => !val && setHistoryStudent(null)}
        student={historyStudent}
      />
    </div>
  );
};
