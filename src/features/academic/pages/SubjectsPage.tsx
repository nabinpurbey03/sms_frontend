import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import {
  useAllClassesWithDetails,
  useCreateSubject,
  useUpdateSubject,
  useDeleteSubject,
  useBulkCreateSubjects,
  useMyTeacherAssignments,
  useAssignments,
} from '../hooks';
import type { AcademicSubject, SubjectCreateDTO } from '../types';
import { SubjectCreateGlobalDialog } from '../components/SubjectCreateGlobalDialog';
import { SubjectEditDialog } from '../components/SubjectEditDialog';
import { SubjectDeleteDialog } from '../components/SubjectDeleteDialog';
import { BulkSubjectUploadDialog } from '../components/BulkSubjectUploadDialog';
import { SubjectHomeworkDialog } from '../components/SubjectHomeworkDialog';

import {
  BookOpen,
  Layers,
  GraduationCap,
  Search,
  Plus,
  UploadCloud,
  Download,
  X,
  Building2,
  Filter,
  MoreHorizontal,
  Edit2,
  Trash2,
  Tag,
  Clock,
  Award,
  Bell,
  ArrowUpRight,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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

type EnrichedSubject = AcademicSubject & {
  className: string;
};

export const SubjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeTenantId, activeTenantName, activeRole } = useAuth();
  const { can, isSuperAdmin } = usePermission();
  const canManage = can('MANAGE_CLASSES_SUBJECTS') || isSuperAdmin;
  const isTeacherOnly = activeRole === 'TEACHER' && !canManage;

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [subjectViewTab, setSubjectViewTab] = useState<'my' | 'all'>('my');

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<EnrichedSubject | null>(null);
  const [subjectToDelete, setSubjectToDelete] = useState<EnrichedSubject | null>(null);
  const [homeworkSubject, setHomeworkSubject] = useState<EnrichedSubject | null>(null);

  // Queries & Mutations
  const {
    data: classesWithDetails = [],
    isLoading,
    isError,
    refetch,
  } = useAllClassesWithDetails(activeTenantId);

  const { data: myAssignments = [], isLoading: isMyAssignmentsLoading } = useMyTeacherAssignments(
    activeTenantId,
    { enabled: !!activeTenantId }
  );

  const { data: allAssignments = [] } = useAssignments(activeTenantId);

  const createSubjectMutation = useCreateSubject();
  const updateSubjectMutation = useUpdateSubject();
  const deleteSubjectMutation = useDeleteSubject();
  const bulkCreateMutation = useBulkCreateSubjects();

  // Switch default tab depending on role
  useEffect(() => {
    if (isTeacherOnly) {
      setSubjectViewTab('my');
    } else {
      setSubjectViewTab('all');
    }
  }, [isTeacherOnly]);

  // Flatten subjects across all classes
  const allSubjects = useMemo(() => {
    const list: EnrichedSubject[] = [];
    for (const cls of classesWithDetails) {
      for (const sub of cls.subjects) {
        list.push({
          ...sub,
          className: cls.name,
        });
      }
    }
    return list;
  }, [classesWithDetails]);

  // Build a lookup: subject_id -> assignments
  const assignmentsBySubjectId = useMemo(() => {
    const map = new Map<string, typeof allAssignments>();
    for (const a of allAssignments) {
      if (a.subject_id) {
        const list = map.get(a.subject_id) || [];
        list.push(a);
        map.set(a.subject_id, list);
      }
    }
    return map;
  }, [allAssignments]);

  // Set of subject IDs assigned to the current teacher
  const myAssignedSubjectIds = useMemo(() => {
    return new Set(
      myAssignments.filter((a) => a.subject_id).map((a) => a.subject_id as string)
    );
  }, [myAssignments]);

  // All teaching subjects assigned to me
  const myTeachingSubjects = useMemo(() => {
    return allSubjects.filter((sub) => myAssignedSubjectIds.has(sub.id));
  }, [allSubjects, myAssignedSubjectIds]);

  // Base list depending on active tab
  const baseSubjectsList = subjectViewTab === 'my' ? myTeachingSubjects : allSubjects;

  // Distinct classes for filter dropdown
  const availableClasses = useMemo(() => {
    return classesWithDetails.map((c) => ({ id: c.id, name: c.name }));
  }, [classesWithDetails]);

  // Filtered Subjects
  const filteredSubjects = useMemo(() => {
    return baseSubjectsList.filter((sub) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = sub.name.toLowerCase().includes(q);
        const matchesCode = sub.code ? sub.code.toLowerCase().includes(q) : false;
        const matchesClass = sub.className.toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesClass) return false;
      }

      // Class Filter
      if (classFilter !== 'ALL' && sub.class_id !== classFilter) {
        return false;
      }

      return true;
    });
  }, [baseSubjectsList, searchQuery, classFilter]);

  // KPI Metrics
  const metrics = useMemo(() => {
    const totalSubjects = allSubjects.length;
    const mySubjectsCount = myTeachingSubjects.length;
    const codedSubjects = allSubjects.filter((s) => Boolean(s.code)).length;
    const classesCount = classesWithDetails.length;
    const myClassesCount = new Set(myTeachingSubjects.map((s) => s.class_id)).size;
    const avgPerClass =
      classesCount > 0 ? (totalSubjects / classesCount).toFixed(1) : '0';

    return {
      totalSubjects,
      mySubjectsCount,
      codedSubjects,
      classesCount,
      myClassesCount,
      avgPerClass,
    };
  }, [allSubjects, myTeachingSubjects, classesWithDetails]);

  // Export Filtered Subjects to CSV
  const handleExportCSV = () => {
    if (filteredSubjects.length === 0) {
      toast.error('No subjects to export.');
      return;
    }

    const headers = 'ID,Subject Name,Subject Code,Class,Created Date\n';
    const rows = filteredSubjects
      .map((s) =>
        [
          s.id,
          `"${s.name}"`,
          s.code ? `"${s.code}"` : '',
          `"${s.className}"`,
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
      `subjects_curriculum_${activeTenantName?.replace(/\s+/g, '_') || 'school'}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Curriculum Exported', {
      description: `Exported ${filteredSubjects.length} subject(s) to CSV.`,
    });
  };

  // Create Subject
  const handleCreateSubject = async (classId: string, data: SubjectCreateDTO) => {
    if (!activeTenantId) return;
    await createSubjectMutation.mutateAsync({
      tenantId: activeTenantId,
      classId,
      data,
    });
  };

  // Edit Subject
  const handleEditSubject = async (
    classId: string,
    subjectId: string,
    data: { name: string; code?: string }
  ) => {
    if (!activeTenantId) return;
    await updateSubjectMutation.mutateAsync({
      tenantId: activeTenantId,
      classId,
      subjectId,
      data,
    });
  };

  // Delete Subject (triggered after confirmation)
  const handleDeleteSubject = async () => {
    if (!activeTenantId || !subjectToDelete) return;
    await deleteSubjectMutation.mutateAsync({
      tenantId: activeTenantId,
      classId: subjectToDelete.class_id,
      subjectId: subjectToDelete.id,
    });
    setSubjectToDelete(null);
  };

  // Bulk Create Subjects
  const handleBulkCreate = async (classId: string, subjects: SubjectCreateDTO[]) => {
    if (!activeTenantId) return;
    await bulkCreateMutation.mutateAsync({
      tenantId: activeTenantId,
      classId,
      subjects,
    });
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
            You must switch to an active school tenant in order to view, design, and manage academic subjects.
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {isTeacherOnly ? (
          <>
            <div className="p-4 rounded-2xl bg-card border shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">My Teaching Subjects</span>
                <Award className="w-4 h-4 text-primary" />
              </div>
              <p className="text-2xl font-bold text-foreground">{metrics.mySubjectsCount}</p>
              <p className="text-[11px] text-muted-foreground">Assigned courses</p>
            </div>

            <div className="p-4 rounded-2xl bg-card border shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Classes Taught</span>
                <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {metrics.myClassesCount}
              </p>
              <p className="text-[11px] text-muted-foreground">Active cohorts</p>
            </div>

            <div className="p-4 rounded-2xl bg-card border shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Total Curriculum</span>
                <BookOpen className="w-4 h-4 text-primary" />
              </div>
              <p className="text-2xl font-bold text-foreground">{metrics.totalSubjects}</p>
              <p className="text-[11px] text-muted-foreground">Across all grades</p>
            </div>

            <div className="p-4 rounded-2xl bg-card border shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Standardized Codes</span>
                <Tag className="w-4 h-4 text-primary" />
              </div>
              <p className="text-2xl font-bold text-foreground">{metrics.codedSubjects}</p>
              <p className="text-[11px] text-muted-foreground">Report card codes</p>
            </div>
          </>
        ) : (
          <>
            <div className="p-4 rounded-2xl bg-card border shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Total Subjects</span>
                <BookOpen className="w-4 h-4 text-primary" />
              </div>
              <p className="text-2xl font-bold text-foreground">{metrics.totalSubjects}</p>
              <p className="text-[11px] text-muted-foreground">Across curriculum</p>
            </div>

            <div className="p-4 rounded-2xl bg-card border shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Active Classes</span>
                <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {metrics.classesCount}
              </p>
              <p className="text-[11px] text-muted-foreground">Grades with subjects</p>
            </div>

            <div className="p-4 rounded-2xl bg-card border shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Standardized Codes</span>
                <Tag className="w-4 h-4 text-primary" />
              </div>
              <p className="text-2xl font-bold text-foreground">{metrics.codedSubjects}</p>
              <p className="text-[11px] text-muted-foreground">Report card codes</p>
            </div>

            <div className="p-4 rounded-2xl bg-card border shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Avg Per Grade</span>
                <Layers className="w-4 h-4 text-primary" />
              </div>
              <p className="text-2xl font-bold text-foreground">{metrics.avgPerClass}</p>
              <p className="text-[11px] text-muted-foreground">Courses per class</p>
            </div>
          </>
        )}
      </div>

      {/* View Switcher: My Teaching Subjects vs All Curriculum Subjects */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-1.5 rounded-xl bg-muted/40 border border-border/50">
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant={subjectViewTab === 'my' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSubjectViewTab('my')}
            className={`h-8 text-xs font-semibold gap-2 ${
              subjectViewTab === 'my' ? 'shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>My Teaching Subjects</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                subjectViewTab === 'my'
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {myTeachingSubjects.length}
            </span>
          </Button>

          <Button
            type="button"
            variant={subjectViewTab === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSubjectViewTab('all')}
            className={`h-8 text-xs font-semibold gap-2 ${
              subjectViewTab === 'all' ? 'shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>All Curriculum Subjects</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                subjectViewTab === 'all'
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {allSubjects.length}
            </span>
          </Button>
        </div>

        {isTeacherOnly && (
          <div className="text-[11px] text-muted-foreground px-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Teacher Teaching Mode Active
          </div>
        )}
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
              placeholder="Search by subject name, code, or class..."
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

          {/* Export & Actions & Record Count */}
          <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground hidden lg:inline mr-1">
              Showing <strong className="text-foreground">{filteredSubjects.length}</strong> of{' '}
              {allSubjects.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={filteredSubjects.length === 0}
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
                  disabled={classesWithDetails.length === 0}
                  className="h-9 gap-1.5 text-xs shadow-2xs font-semibold"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Bulk Upload</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsCreateOpen(true)}
                  disabled={classesWithDetails.length === 0}
                  className="h-9 gap-1.5 text-xs shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Subject</span>
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
            onChange={(e) => setClassFilter(e.target.value)}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">All Academic Classes</option>
            {availableClasses.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>

          {/* Reset Filters */}
          {(classFilter !== 'ALL' || searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setClassFilter('ALL');
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
          <span>Failed to load curriculum subjects from server. Showing cached subjects.</span>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="h-7 text-xs">
            Retry
          </Button>
        </div>
      )}

      {/* Subjects Table */}
      <div className="rounded-2xl border bg-card shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 bg-muted/40 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : filteredSubjects.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              {subjectViewTab === 'my' ? (
                <Award className="w-6 h-6 text-primary" />
              ) : (
                <BookOpen className="w-6 h-6" />
              )}
            </div>
            <h3 className="text-base font-semibold text-foreground">
              {subjectViewTab === 'my' && myTeachingSubjects.length === 0
                ? 'No Assigned Teaching Subjects'
                : 'No Subjects Found'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {subjectViewTab === 'my' && myTeachingSubjects.length === 0
                ? 'You are not currently assigned to teach any curriculum subjects in this school. Contact your school administrator or academic coordinator to assign your classes and subjects.'
                : searchQuery || classFilter !== 'ALL'
                ? 'No subjects match your current filter criteria. Try resetting filters.'
                : 'No curriculum subjects registered yet. Add subjects to academic classes to build out your curriculum.'}
            </p>
            {subjectViewTab === 'my' && myTeachingSubjects.length === 0 ? (
              <div className="pt-2 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSubjectViewTab('all')}
                  className="gap-1.5 text-xs"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Browse All Curriculum Subjects
                </Button>
              </div>
            ) : canManage && !searchQuery && classFilter === 'ALL' ? (
              <div className="pt-2 flex justify-center gap-2">
                <Button onClick={() => setIsCreateOpen(true)} className="gap-1.5 text-xs">
                  <Plus className="w-3.5 h-3.5" />
                  Add First Subject
                </Button>
                <Button variant="outline" onClick={() => setIsBulkOpen(true)} className="gap-1.5 text-xs">
                  <UploadCloud className="w-3.5 h-3.5" />
                  Bulk Upload CSV
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b bg-muted/30 text-muted-foreground font-semibold">
                  <th className="py-3 px-4">Subject Name</th>
                  <th className="py-3 px-4">Academic Class</th>
                  <th className="py-3 px-4">Assigned Instructor</th>
                  <th className="py-3 px-4">Subject Code</th>
                  <th className="py-3 px-4 text-right">Teaching Activities & Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredSubjects.map((sub) => {
                  const isAssignedToMe = myAssignedSubjectIds.has(sub.id);
                  const assignments = assignmentsBySubjectId.get(sub.id) || [];
                  const teacherNames = Array.from(
                    new Set(assignments.filter((a) => a.teacher_name).map((a) => a.teacher_name!))
                  );
                  const assignedSections = Array.from(
                    new Set(assignments.filter((a) => a.section_name).map((a) => a.section_name!))
                  );

                  return (
                    <tr
                      key={sub.id}
                      className={`hover:bg-muted/20 transition-colors ${
                        isAssignedToMe ? 'bg-primary/[0.02]' : ''
                      }`}
                    >
                      {/* Subject Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`p-2 rounded-xl shrink-0 ${
                              isAssignedToMe
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-primary/10 text-primary'
                            }`}
                          >
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-bold text-foreground truncate text-xs">
                                {sub.name}
                              </p>
                              {isAssignedToMe && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.2 rounded-full">
                                  <Award className="w-2.5 h-2.5" />
                                  Taught by You
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              ID: {sub.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Academic Class */}
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="bg-muted/50 font-semibold text-foreground text-xs py-0.5">
                          {sub.className}
                        </Badge>
                      </td>

                      {/* Assigned Instructor */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          {teacherNames.length > 0 ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-medium text-foreground">
                                {teacherNames.join(', ')}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/60 italic">
                              Unassigned
                            </span>
                          )}
                          {assignedSections.length > 0 && (
                            <div className="text-[10px] text-muted-foreground">
                              Sections: {assignedSections.map((s) => `Sec ${s}`).join(', ')}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Subject Code */}
                      <td className="py-3 px-4">
                        {sub.code ? (
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                            {sub.code}
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/60 italic font-mono">
                            None
                          </span>
                        )}
                      </td>

                      {/* Teaching Activities & Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Post Homework */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setHomeworkSubject(sub)}
                            className="h-7 text-[11px] px-2.5 gap-1 bg-card hover:bg-muted cursor-pointer shadow-2xs font-medium"
                            title="Broadcast homework or announcement for this subject"
                          >
                            <Bell className="w-3 h-3 text-primary" />
                            <span>Homework</span>
                          </Button>

                          {/* Grade Exams */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate({ to: '/examination/scores' })}
                            className="h-7 text-[11px] px-2.5 gap-1 bg-card hover:bg-muted cursor-pointer shadow-2xs font-medium"
                            title="Enter exam scores or view grading"
                          >
                            <GraduationCap className="w-3 h-3 text-indigo-500" />
                            <span>Grading</span>
                          </Button>

                          {/* Class Workspace */}
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                            title="Open Class Details"
                          >
                            <Link to="/academic/classes/$classId" params={{ classId: sub.class_id }}>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </Link>
                          </Button>

                          {/* Admin Actions */}
                          {canManage && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuLabel className="text-xs">Subject Actions</DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() => setEditingSubject(sub)}
                                  className="text-xs cursor-pointer gap-2"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  Edit Subject
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setSubjectToDelete(sub)}
                                  className="text-xs text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer gap-2"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete Subject
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dialog: Create Subject */}
      <SubjectCreateGlobalDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        classes={classesWithDetails}
        onSubmit={handleCreateSubject}
        isLoading={createSubjectMutation.isPending}
      />

      {/* Dialog: Edit Subject */}
      <SubjectEditDialog
        subject={editingSubject}
        isOpen={!!editingSubject}
        onClose={() => setEditingSubject(null)}
        onSubmit={handleEditSubject}
        isLoading={updateSubjectMutation.isPending}
      />

      {/* Dialog: Delete Subject Confirmation */}
      <SubjectDeleteDialog
        subject={subjectToDelete}
        isOpen={!!subjectToDelete}
        onClose={() => setSubjectToDelete(null)}
        onConfirm={handleDeleteSubject}
        isLoading={deleteSubjectMutation.isPending}
      />

      {/* Dialog: Bulk Upload Subjects */}
      <BulkSubjectUploadDialog
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        classes={classesWithDetails}
        onSubmit={handleBulkCreate}
        isLoading={bulkCreateMutation.isPending}
      />

      {/* Dialog: Post Homework / Subject Announcement */}
      <SubjectHomeworkDialog
        isOpen={!!homeworkSubject}
        onClose={() => setHomeworkSubject(null)}
        tenantId={activeTenantId}
        subject={homeworkSubject}
        classes={classesWithDetails}
      />
    </div>
  );
};
