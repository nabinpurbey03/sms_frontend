import React, { useState, useEffect, useMemo } from 'react';
import {
  GraduationCap,
  Search,
  Download,
  RefreshCw,
  History,
  X,
  Filter,
  MoreHorizontal,
  Copy,
  Phone,
  PhoneCall,
  CreditCard,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAcademicYears } from '@/features/academic-year/hooks';
import { useClasses, useGraduatedStudents } from '../hooks';
import { useAlumniClearance } from '@/features/finance/hooks';
import type { AlumniClearanceItem } from '@/features/finance/types';
import type { AcademicStudent, GraduatedStudentDTO } from '../types';
import { StudentEnrollmentHistoryDialog } from './StudentEnrollmentHistoryDialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface GraduatedStudentsTableProps {
  tenantId: string | null;
  initialAcademicYearId?: string | null;
}

export const GraduatedStudentsTable: React.FC<GraduatedStudentsTableProps> = ({
  tenantId,
  initialAcademicYearId,
}) => {
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState(initialAcademicYearId || 'ALL');
  const [selectedClassId, setSelectedClassId] = useState('ALL');

  // History Dialog State
  const [historyStudent, setHistoryStudent] = useState<AcademicStudent | null>(null);

  // Sync with initialAcademicYearId when updated from parent
  useEffect(() => {
    if (initialAcademicYearId) {
      setSelectedBatchId(initialAcademicYearId);
    }
  }, [initialAcademicYearId]);

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

  // Alumni Financial Clearance Query
  const { data: clearanceResponse } = useAlumniClearance(tenantId, {
    academic_year_id: selectedBatchId !== 'ALL' ? selectedBatchId : undefined,
    page_size: 100,
  });

  const clearanceMap = useMemo(() => {
    const map = new Map<string, AlumniClearanceItem>();
    if (clearanceResponse?.items) {
      clearanceResponse.items.forEach((item) => {
        map.set(item.student_id, item);
      });
    }
    return map;
  }, [clearanceResponse?.items]);

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

  const handleCopy = (text: string, message: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    toast.success(message);
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
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
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

        {/* Graduating Batch Quick-Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap mr-1 flex items-center gap-1">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Batches:</span>
          </span>
          <button
            type="button"
            onClick={() => setSelectedBatchId('ALL')}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border',
              selectedBatchId === 'ALL'
                ? 'bg-primary text-primary-foreground shadow-2xs border-primary'
                : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/50'
            )}
          >
            All Batches
          </button>
          {academicYears.map((yr) => {
            const isActive = selectedBatchId === yr.id;
            return (
              <button
                key={yr.id}
                type="button"
                onClick={() => setSelectedBatchId(yr.id)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-2xs border-primary'
                    : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/50'
                )}
              >
                {yr.name}
              </button>
            );
          })}
        </div>

        {/* Dropdown Filters Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50 text-xs">
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
                  <TableHead>Financial Clearance</TableHead>
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
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
                              <span className="truncate">ID: {student.student_id.slice(0, 8)}</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(student.student_id, 'Student ID copied to clipboard')}
                                className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                                title="Copy full Student ID"
                              >
                                <Copy className="w-2.5 h-2.5" />
                              </button>
                            </div>
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
                              <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                                <span>{student.parent_phone}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(student.parent_phone!, 'Parent phone copied to clipboard')}
                                  className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                                  title="Copy parent phone"
                                >
                                  <Copy className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">Not Linked</span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge
                          variant="purple"
                          className="text-[10px] gap-1 px-2 py-0.5"
                        >
                          <GraduationCap className="w-3 h-3" />
                          Graduated
                        </Badge>
                      </TableCell>

                      {/* Financial Clearance */}
                      <TableCell>
                        {(() => {
                          const clearance = clearanceMap.get(student.student_id);
                          const isPending =
                            clearance?.clearance_status === 'PENDING_CLEARANCE' ||
                            (clearance && Number(clearance.total_due) > 0);

                          if (isPending) {
                            return (
                              <div className="flex flex-col items-start gap-0.5">
                                <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] font-medium">
                                  Pending Clearance
                                </Badge>
                                {clearance && Number(clearance.total_due) > 0 && (
                                  <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400">
                                    Due: NPR {Number(clearance.total_due).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </span>
                                )}
                              </div>
                            );
                          }

                          return (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-medium">
                              Cleared
                            </Badge>
                          );
                        })()}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
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
                            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-primary cursor-pointer"
                            title="View Academic History"
                          >
                            <History className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Timeline</span>
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                                title="Quick actions"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                                <span className="sr-only">More actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
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
                                className="cursor-pointer gap-2 text-xs"
                              >
                                <History className="w-3.5 h-3.5 text-primary" />
                                <span>Timeline History</span>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() =>
                                  handleCopy(student.student_id, 'Student ID copied to clipboard')
                                }
                                className="cursor-pointer gap-2 text-xs"
                              >
                                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>Copy Student ID</span>
                              </DropdownMenuItem>

                              <DropdownMenuItem asChild className="cursor-pointer gap-2 text-xs">
                                <Link to="/finance/alumni-clearance">
                                  <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>Clearance Register</span>
                                </Link>
                              </DropdownMenuItem>

                              {student.parent_phone && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleCopy(student.parent_phone!, 'Parent phone copied to clipboard')
                                    }
                                    className="cursor-pointer gap-2 text-xs"
                                  >
                                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Copy Parent Phone</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild className="cursor-pointer gap-2 text-xs">
                                    <a href={`tel:${student.parent_phone}`}>
                                      <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
                                      <span>Call Parent</span>
                                    </a>
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
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
