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
import { useSelectedAcademicYear } from '@/features/academic-year/hooks/useSelectedAcademicYear';
import { StudentEnrollmentHistoryDialog } from '../components/StudentEnrollmentHistoryDialog';
import {
  Users,
  GraduationCap,
  Layers,
  Search,
  Plus,
  UploadCloud,
  Download,
  X,
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
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link } from '@tanstack/react-router';
import { toast } from 'sonner';

type EnrichedStudent = AcademicStudent & {
  className: string;
  sectionName: string;
};

export const StudentsPage: React.FC = () => {
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

  const { selectedYearId } = useSelectedAcademicYear();

  // Queries & Mutations
  const {
    data: classesWithDetails = [],
    isLoading,
    isError,
    refetch,
  } = useAllClassesWithDetails(activeTenantId, selectedYearId);

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
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px] gap-1 px-2 py-0.5">
            <CheckCircle2 className="w-3 h-3" />
            Active
          </Badge>
        );
      case 'TRANSFERRED':
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 text-[10px] gap-1 px-2 py-0.5">
            <ArrowRightLeft className="w-3 h-3" />
            Transferred
          </Badge>
        );
      case 'GRADUATED':
        return (
          <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20 text-[10px] gap-1 px-2 py-0.5">
            <GraduationCap className="w-3 h-3" />
            Graduated
          </Badge>
        );
      case 'SUSPENDED':
        return (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] gap-1 px-2 py-0.5">
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
      academicYearId: selectedYearId,
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
      academicYearId: selectedYearId,
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
      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-card border shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Total Students</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{metrics.total}</p>
          <p className="text-[11px] text-muted-foreground">Across entire school</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Active Enrollment</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {metrics.active}
          </p>
          <p className="text-[11px] text-muted-foreground">Attending classes</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Enrolled Classes</span>
            <GraduationCap className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{metrics.classesCount}</p>
          <p className="text-[11px] text-muted-foreground">Active grades</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Active Sections</span>
            <Layers className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{metrics.sectionsCount}</p>
          <p className="text-[11px] text-muted-foreground">Section cohorts</p>
        </div>

        <Link
          to="/academic/alumni"
          className="p-4 rounded-2xl bg-card border hover:border-purple-500/40 hover:shadow-md transition-all space-y-1 group relative block"
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
              Graduated / Alumni
            </span>
            <div className="w-6 h-6 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <GraduationCap className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {graduatedData?.total_graduates ?? 0}
            </p>
            <span className="text-[11px] font-medium text-purple-600 dark:text-purple-400 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
              View alumni &rarr;
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground group-hover:text-muted-foreground/80">
            Graduated alumni records
          </p>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-border/60 bg-card shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, class, or section..."
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

          {/* Export Action & Record Counter */}
          <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground hidden lg:inline mr-1">
              Showing <strong className="text-foreground">{filteredStudents.length}</strong> of{' '}
              {allStudents.length}
            </span>
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
        </div>

        {/* Dropdown Filters Row */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/50 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-semibold">Filter by:</span>
          </div>

          {/* Class Filter */}
          <select
            value={classFilter}
            onChange={(e) => {
              setClassFilter(e.target.value);
              setSectionFilter('ALL');
            }}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
              className="h-8 text-xs text-muted-foreground hover:text-foreground ml-auto"
            >
              Reset Filters
            </Button>
          )}
        </div>
      </div>

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
