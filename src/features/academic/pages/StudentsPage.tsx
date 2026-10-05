import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import {
  useAllClassesWithDetails,
  useAddStudent,
  useBulkAddStudents,
  useDeleteStudent,
  useUpdateStudentStatus,
  useGraduatedStudents,
} from '../hooks';
import type { AcademicStudent, StudentCreateDTO } from '../types';
import { StudentEnrollGlobalDialog } from '../components/StudentEnrollGlobalDialog';
import { BulkStudentUploadDialog } from '../components/BulkStudentUploadDialog';
import { StudentDeleteDialog } from '../components/StudentDeleteDialog';
import { ParentStudentLinkDialog } from '@/features/members/components/ParentStudentLinkDialog';
import { useCurrentAcademicYear } from '@/features/academic-year/hooks/useCurrentAcademicYear';
import { StudentEnrollmentHistoryDialog } from '../components/StudentEnrollmentHistoryDialog';
import {
  Users,
  GraduationCap,
  Layers,
  Plus,
  UploadCloud,
  Download,
  Building2,
  Filter,
  MoreHorizontal,
  Trash2,
  CheckCircle2,
  Clock,
  Ban,
  ArrowRightLeft,
  HeartHandshake,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { FilterToolbar } from '@/components/common/FilterToolbar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';

type EnrichedStudent = AcademicStudent & {
  className: string;
  sectionName: string;
};

export const StudentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeTenantId, activeTenantName } = useAuth();
  const { can, isSuperAdmin } = usePermission();
  const canManage = can('MANAGE_SECTIONS_STUDENTS') || isSuperAdmin;



  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Modal States
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<EnrichedStudent | null>(null);
  const [linkingStudent, setLinkingStudent] = useState<EnrichedStudent | null>(null);
  const [historyStudent, setHistoryStudent] = useState<EnrichedStudent | null>(null);

  const { currentYearId } = useCurrentAcademicYear(activeTenantId);

  // Queries & Mutations
  const {
    data: classesWithDetails = [],
    isLoading,
    isError,
    refetch,
  } = useAllClassesWithDetails(activeTenantId, currentYearId);

  const { data: graduatedData } = useGraduatedStudents(activeTenantId, { limit: 1 });

  const addStudentMutation = useAddStudent();
  const bulkAddMutation = useBulkAddStudents();
  const deleteStudentMutation = useDeleteStudent();
  const updateStatusMutation = useUpdateStudentStatus();

  // Flatten students from all classes and sections
  const allStudents = useMemo(() => {
    const list: EnrichedStudent[] = [];
    for (const cls of classesWithDetails) {
      for (const st of cls.students) {
        const sec = cls.sections.find((s) => s.id === st.section_id);
        list.push({
          ...st,
          className: cls.name,
          sectionName: sec?.name || 'Unassigned',
        });
      }
    }
    return list;
  }, [classesWithDetails]);

  // Distinct classes and sections for filters
  const availableClasses = useMemo(() => {
    return classesWithDetails.map((c) => ({ id: c.id, name: c.name }));
  }, [classesWithDetails]);

  const availableSections = useMemo(() => {
    if (classFilter === 'ALL') {
      const set = new Set<string>();
      classesWithDetails.forEach((c) => c.sections.forEach((s) => set.add(s.name)));
      return Array.from(set).sort();
    }
    const cls = classesWithDetails.find((c) => c.id === classFilter);
    return cls ? cls.sections.map((s) => s.name).sort() : [];
  }, [classesWithDetails, classFilter]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return allStudents.filter((st) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const fullName = `${st.first_name} ${st.middle_name || ''} ${st.last_name}`.toLowerCase();
        const matchesName = fullName.includes(q);
        const matchesClass = st.className.toLowerCase().includes(q);
        const matchesSection = st.sectionName.toLowerCase().includes(q);
        if (!matchesName && !matchesClass && !matchesSection) return false;
      }

      // Class Filter
      if (classFilter !== 'ALL' && st.class_id !== classFilter) {
        return false;
      }

      // Section Filter
      if (sectionFilter !== 'ALL' && st.sectionName !== sectionFilter) {
        return false;
      }

      // Status Filter
      if (statusFilter !== 'ALL' && st.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [allStudents, searchQuery, classFilter, sectionFilter, statusFilter]);

  // Auto-reset pagination when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, classFilter, sectionFilter, statusFilter, pageSize]);

  // Derived pagination values
  const totalRecords = filteredStudents.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedStudents = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, safePage, pageSize]);

  // KPI Metrics
  const metrics = useMemo(() => {
    const total = allStudents.length;
    const active = allStudents.filter((s) => s.status === 'ACTIVE').length;
    const classesCount = classesWithDetails.length;
    const sectionsCount = classesWithDetails.reduce((acc, c) => acc + c.sections.length, 0);
    return { total, active, classesCount, sectionsCount };
  }, [allStudents, classesWithDetails]);

  // Export Filtered Students to CSV
  const handleExportCSV = () => {
    if (filteredStudents.length === 0) {
      toast.error('No students to export.');
      return;
    }

    const headers = 'ID,First Name,Middle Name,Last Name,Class,Section,Status,Enrolled Date\n';
    const rows = filteredStudents
      .map((s) =>
        [
          s.id,
          s.first_name,
          s.middle_name || '',
          s.last_name,
          `"${s.className}"`,
          `"Section ${s.sectionName}"`,
          s.status,
          s.created_at ? new Date(s.created_at).toLocaleDateString() : '',
        ].join(',')
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `students_roster_${activeTenantName?.replace(/\s+/g, '_') || 'school'}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Roster Exported', {
      description: `Exported ${filteredStudents.length} student record(s) to CSV.`,
    });
  };

  // Status Badge Component
  const renderStatusBadge = (status: AcademicStudent['status']) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <Badge variant="success" className="text-[10px] gap-1 px-2 py-0.5">
            <CheckCircle2 className="w-3 h-3" />
            Active
          </Badge>
        );
      case 'TRANSFERRED':
        return (
          <Badge variant="warning" className="text-[10px] gap-1 px-2 py-0.5">
            <ArrowRightLeft className="w-3 h-3" />
            Transferred
          </Badge>
        );
      case 'GRADUATED':
        return (
          <Badge variant="purple" className="text-[10px] gap-1 px-2 py-0.5">
            <GraduationCap className="w-3 h-3" />
            Graduated
          </Badge>
        );
      case 'SUSPENDED':
        return (
          <Badge variant="destructive" className="text-[10px] gap-1 px-2 py-0.5">
            <Ban className="w-3 h-3" />
            Suspended
          </Badge>
        );
      default:
        return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
    }
  };

  // Single Student Enrollment Submission
  const handleSingleEnroll = async (classId: string, sectionId: string, data: StudentCreateDTO) => {
    if (!activeTenantId) return;
    await addStudentMutation.mutateAsync({
      tenantId: activeTenantId,
      classId,
      sectionId,
      data,
      academicYearId: currentYearId,
    });
  };

  // Bulk Student Upload Submission
  const handleBulkEnroll = async (classId: string, sectionId: string, file: File) => {
    if (!activeTenantId) return;
    await bulkAddMutation.mutateAsync({
      tenantId: activeTenantId,
      classId,
      sectionId,
      file,
      academicYearId: currentYearId,
    });
  };

  // Delete Student Submission
  const handleDeleteStudent = async () => {
    if (!activeTenantId || !studentToDelete) return;
    await deleteStudentMutation.mutateAsync({
      tenantId: activeTenantId,
      classId: studentToDelete.class_id,
      studentId: studentToDelete.id,
    });
    setStudentToDelete(null);
  };

  // If no tenant selected
  if (!activeTenantId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
          <Building2 className="w-8 h-8" />
        </div>
        <div className="space-y-1 max-w-md">
          <h2 className="text-xl font-bold text-foreground">Select a School Portal</h2>
          <p className="text-sm text-muted-foreground">
            You must switch to an active school tenant in order to view, search, and manage students.
          </p>
        </div>
        <Button asChild>
          <Link to="/tenants">View All Schools</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header with Segmented Roster Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Student Directory
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Manage student enrollments, class assignments, cohort records, and academic status.
          </p>
        </div>

        {/* Segmented Roster Switcher */}
        <div className="flex items-center p-1 bg-muted/60 rounded-xl border border-border/50 text-xs font-medium self-start sm:self-auto shrink-0 shadow-2xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background text-foreground font-semibold shadow-xs">
            <Users className="w-4 h-4 text-primary" />
            <span>Active Roster</span>
            <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1.5 font-bold">
              {metrics.active}
            </Badge>
          </div>
          <Link
            to="/academic/alumni"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/50 transition-colors"
          >
            <GraduationCap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Alumni Directory</span>
            <Badge variant="purple" className="ml-1 text-[10px] h-4 px-1.5 font-bold">
              {graduatedData?.total_graduates ?? 0}
            </Badge>
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          title="Total Students"
          value={metrics.total}
          icon={Users}
          description="Across entire school"
          variant="default"
          loading={isLoading}
        />
        <StatCard
          title="Active Enrollment"
          value={metrics.active}
          icon={CheckCircle2}
          description="Attending classes"
          variant="emerald"
          loading={isLoading}
        />
        <StatCard
          title="Enrolled Classes"
          value={metrics.classesCount}
          icon={GraduationCap}
          description="Active grades"
          variant="default"
          loading={isLoading}
        />
        <StatCard
          title="Active Sections"
          value={metrics.sectionsCount}
          icon={Layers}
          description="Section cohorts"
          variant="blue"
          loading={isLoading}
        />
        <StatCard
          title="Graduated / Alumni"
          value={graduatedData?.total_graduates ?? 0}
          icon={GraduationCap}
          description="Graduated alumni records"
          variant="purple"
          onClick={() => navigate({ to: '/academic/alumni' })}
        />
      </div>

      {/* Filter and Search Bar */}
      <FilterToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by student name, class, or section..."
        showingCount={filteredStudents.length}
        totalCount={allStudents.length}
        unitLabel="students"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={filteredStudents.length === 0}
              className="h-9 gap-1.5 text-xs shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
            {canManage && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBulkOpen(true)}
                  className="h-9 gap-1.5 text-xs font-semibold shadow-2xs"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Bulk Upload</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsEnrollOpen(true)}
                  disabled={classesWithDetails.length === 0}
                  className="h-9 gap-1.5 text-xs shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Enroll Student</span>
                </Button>
              </>
            )}
          </div>
        }
      >
        <div className="flex items-center gap-1.5 text-muted-foreground mr-1">
          <Filter className="w-3.5 h-3.5" />
          <span className="font-semibold text-xs">Filter:</span>
        </div>

        {/* Class Filter */}
        <select
          value={classFilter}
          onChange={(e) => {
            setClassFilter(e.target.value);
            setSectionFilter('ALL');
          }}
          className="h-9 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
        >
          <option value="ALL">All Classes</option>
          {availableClasses.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name}
            </option>
          ))}
        </select>

        {/* Section Filter */}
        <select
          value={sectionFilter}
          onChange={(e) => setSectionFilter(e.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
        >
          <option value="ALL">All Sections</option>
          {availableSections.map((secName) => (
            <option key={secName} value={secName}>
              Section {secName}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="TRANSFERRED">Transferred</option>
          <option value="GRADUATED">Graduated</option>
          <option value="SUSPENDED">Suspended</option>
        </select>

        {/* Reset Filters button */}
        {(classFilter !== 'ALL' || sectionFilter !== 'ALL' || statusFilter !== 'ALL' || searchQuery) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setClassFilter('ALL');
              setSectionFilter('ALL');
              setStatusFilter('ALL');
              setSearchQuery('');
            }}
            className="h-9 text-xs text-muted-foreground hover:text-foreground"
          >
            Reset Filters
          </Button>
        )}
      </FilterToolbar>

      {/* Error Alert */}
      {isError && (
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center justify-between">
          <span>Failed to load student rosters from server. Showing cached records.</span>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="h-7 text-xs">
            Retry
          </Button>
        </div>
      )}

      {/* Student Roster Table */}
      <div className="rounded-2xl border bg-card shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 bg-muted/40 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">No Students Found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {searchQuery || classFilter !== 'ALL' || sectionFilter !== 'ALL' || statusFilter !== 'ALL'
                ? 'No students match the current filters. Try resetting your search.'
                : 'No students are enrolled in this school yet. Use the Enroll Student or Bulk Upload buttons above to get started.'}
            </p>
            {canManage && !searchQuery && classFilter === 'ALL' && (
              <div className="pt-2 flex justify-center gap-2">
                <Button onClick={() => setIsEnrollOpen(true)} className="gap-1.5 text-xs">
                  <Plus className="w-3.5 h-3.5" />
                  Enroll First Student
                </Button>
                <Button variant="outline" onClick={() => setIsBulkOpen(true)} className="gap-1.5 text-xs">
                  <UploadCloud className="w-3.5 h-3.5" />
                  Bulk Upload CSV
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b bg-muted/30 text-muted-foreground font-semibold">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Class & Section</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Enrolled Date</th>
                  {canManage && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedStudents.map((st) => {
                  const fullName = [st.first_name, st.middle_name, st.last_name]
                    .filter(Boolean)
                    .join(' ');
                  const initials = `${st.first_name[0] || ''}${st.last_name[0] || ''}`.toUpperCase();

                  return (
                    <tr key={st.id} className="hover:bg-muted/20 transition-colors">
                      {/* Student Name & Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 rounded-lg ring-1 ring-border shrink-0">
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-[11px] rounded-lg">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-bold text-foreground truncate text-xs">
                              {fullName}
                            </p>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              ID: {st.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Class & Section */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <span>{st.className}</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono font-semibold">
                            Sec {st.sectionName}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {renderStatusBadge(st.status)}
                      </td>

                      {/* Enrolled Date */}
                      <td className="py-3 px-4 text-muted-foreground">
                        <span className="flex items-center gap-1 text-[11px]">
                          <Clock className="w-3 h-3 opacity-60" />
                          {st.created_at ? new Date(st.created_at).toLocaleDateString() : 'Active Term'}
                        </span>
                      </td>

                      {/* Actions */}
                      {canManage && (
                        <td className="py-3 px-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel className="text-xs">Update Status</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    tenantId: activeTenantId!,
                                    classId: st.class_id,
                                    studentId: st.id,
                                    status: 'ACTIVE',
                                  })
                                }
                                disabled={st.status === 'ACTIVE'}
                                className="text-xs cursor-pointer"
                              >
                                Mark as Active
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    tenantId: activeTenantId!,
                                    classId: st.class_id,
                                    studentId: st.id,
                                    status: 'TRANSFERRED',
                                  })
                                }
                                disabled={st.status === 'TRANSFERRED'}
                                className="text-xs cursor-pointer"
                              >
                                Mark as Transferred
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    tenantId: activeTenantId!,
                                    classId: st.class_id,
                                    studentId: st.id,
                                    status: 'GRADUATED',
                                  })
                                }
                                disabled={st.status === 'GRADUATED'}
                                className="text-xs cursor-pointer"
                              >
                                Mark as Graduated
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    tenantId: activeTenantId!,
                                    classId: st.class_id,
                                    studentId: st.id,
                                    status: 'SUSPENDED',
                                  })
                                }
                                disabled={st.status === 'SUSPENDED'}
                                className="text-xs cursor-pointer text-amber-600 dark:text-amber-400"
                              >
                                Mark as Suspended
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />
                              <DropdownMenuLabel className="text-xs">History</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => setHistoryStudent(st)}
                                className="text-xs cursor-pointer"
                              >
                                View Enrollment History
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />
                              <DropdownMenuLabel className="text-xs">Guardian ReBAC</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => setLinkingStudent(st)}
                                className="text-xs cursor-pointer gap-2"
                              >
                                <HeartHandshake className="w-3.5 h-3.5 text-primary" />
                                Link Parent by Phone
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setStudentToDelete(st)}
                                className="text-xs text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer gap-2"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Remove Student
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!isLoading && filteredStudents.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-border/60 bg-muted/15 text-xs text-muted-foreground">
            {/* Record Count & Page Size */}
            <div className="flex flex-wrap items-center gap-3">
              <span>
                Showing <strong className="text-foreground">{Math.min(totalRecords, (safePage - 1) * pageSize + 1)}</strong> to{' '}
                <strong className="text-foreground">{Math.min(safePage * pageSize, totalRecords)}</strong> of{' '}
                <strong className="text-foreground">{totalRecords}</strong> students
                {totalRecords < allStudents.length && (
                  <span className="opacity-70 ml-1">
                    (filtered from {allStudents.length} total)
                  </span>
                )}
              </span>

              <div className="flex items-center gap-1.5 ml-2 border-l border-border/60 pl-3">
                <span className="text-[11px]">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-7 rounded border border-input bg-background px-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Page Navigation Controls */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1 select-none">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentPage(1)}
                  disabled={safePage === 1}
                  title="First Page"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-40"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  title="Previous Page"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const p = i + 1;
                    if (
                      p === 1 ||
                      p === totalPages ||
                      Math.abs(p - safePage) <= 1
                    ) {
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setCurrentPage(p)}
                          className={`min-w-[28px] h-7 px-2 flex items-center justify-center rounded-md text-xs transition-colors font-medium ${
                            safePage === p
                              ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                              : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    } else if (
                      (p === 2 && safePage > 3) ||
                      (p === totalPages - 1 && safePage < totalPages - 2)
                    ) {
                      return (
                        <span key={`ellipsis-${p}`} className="px-1 text-muted-foreground/50">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  title="Next Page"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safePage === totalPages}
                  title="Last Page"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-40"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialog: Single Student Enrollment */}
      <StudentEnrollGlobalDialog
        isOpen={isEnrollOpen}
        onClose={() => setIsEnrollOpen(false)}
        classes={classesWithDetails}
        onSubmit={handleSingleEnroll}
        isLoading={addStudentMutation.isPending}
      />

      {/* Dialog: Bulk Student Upload */}
      <BulkStudentUploadDialog
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        classes={classesWithDetails}
        onSubmit={handleBulkEnroll}
        isLoading={bulkAddMutation.isPending}
      />

      {/* Dialog: Delete Student Confirmation */}
      <StudentDeleteDialog
        student={studentToDelete}
        isOpen={!!studentToDelete}
        onClose={() => setStudentToDelete(null)}
        onConfirm={handleDeleteStudent}
        isLoading={deleteStudentMutation.isPending}
      />

      <StudentEnrollmentHistoryDialog
        open={!!historyStudent}
        onOpenChange={(val) => !val && setHistoryStudent(null)}
        student={historyStudent}
      />

      {/* Dialog: Link Parent / Guardian to Student */}
      <ParentStudentLinkDialog
        isOpen={!!linkingStudent}
        onClose={() => setLinkingStudent(null)}
        tenantId={activeTenantId}
        student={
          linkingStudent
            ? {
                id: linkingStudent.id,
                name: [linkingStudent.first_name, linkingStudent.middle_name, linkingStudent.last_name]
                  .filter(Boolean)
                  .join(' '),
                className: linkingStudent.className,
                sectionName: linkingStudent.sectionName,
              }
            : null
        }
      />
    </div>
  );
};
