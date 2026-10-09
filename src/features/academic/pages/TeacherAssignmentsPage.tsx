import React, { useState, useMemo, useEffect } from 'react';
import { useSearch } from '@tanstack/react-router';
import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import {
  useAssignments,
  useAllClassesWithDetails,
  useDeleteAssignment,
  useStaffingStatus,
} from '../hooks';
import { useCurrentAcademicYear } from '@/features/academic-year/hooks/useCurrentAcademicYear';
import { AssignTeacherDialog } from '../components/AssignTeacherDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  UserCheck,
  BookOpen,
  Plus,
  Trash2,
  Search,
  GraduationCap,
  Layers,
  X,
  AlertTriangle,
  CheckCircle2,
  UserX,
} from 'lucide-react';
import { TenantRequiredState } from '@/components/common/TenantRequiredState';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import type { TeacherAssignment } from '../types';

export const TeacherAssignmentsPage: React.FC = () => {
  const { activeTenantId } = useAuth();
  const { can } = usePermission();
  const canAssign = can('ASSIGN_TEACHERS');

  const search = useSearch({ strict: false }) as { filter?: string };

  const { currentYear, currentYearId } = useCurrentAcademicYear(activeTenantId);
  const isReadOnly = currentYear?.is_closed ?? false;

  const { data: assignments = [], isLoading, isError, refetch } = useAssignments(activeTenantId, { academic_year_id: currentYearId });
  const { data: classes = [] } = useAllClassesWithDetails(activeTenantId, currentYearId);
  const { data: staffingStatus } = useStaffingStatus(activeTenantId, currentYearId);
  const deleteAssignmentMutation = useDeleteAssignment();

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'subject' | 'class_teacher'>('subject');
  const [dialogClassId, setDialogClassId] = useState<string | undefined>();
  const [dialogSectionId, setDialogSectionId] = useState<string | undefined>();
  const [dialogSubjectId, setDialogSubjectId] = useState<string | undefined>();

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<TeacherAssignment | null>(null);

  // Filters State
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'CLASS_TEACHER' | 'SUBJECT' | 'UNASSIGNED'>(
    search.filter === 'unassigned' ? 'UNASSIGNED' : 'ALL'
  );
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (search.filter === 'unassigned') {
      setTypeFilter('UNASSIGNED');
    }
  }, [search.filter]);

  const openDialog = (
    mode: 'subject' | 'class_teacher',
    prefill?: { classId?: string; sectionId?: string; subjectId?: string }
  ) => {
    setDialogMode(mode);
    setDialogClassId(prefill?.classId);
    setDialogSectionId(prefill?.sectionId);
    setDialogSubjectId(prefill?.subjectId);
    setDialogOpen(true);
  };

  const handleDelete = (assignment: TeacherAssignment) => {
    setAssignmentToDelete(assignment);
  };

  const handleConfirmDelete = async () => {
    if (!activeTenantId || !assignmentToDelete) return;
    setDeletingId(assignmentToDelete.id);
    try {
      await deleteAssignmentMutation.mutateAsync({
        tenantId: activeTenantId,
        assignmentId: assignmentToDelete.id,
      });
      setAssignmentToDelete(null);
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered Assignments (Assigned)
  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      if (selectedClassFilter !== 'ALL' && a.class_id !== selectedClassFilter) {
        return false;
      }
      if (typeFilter === 'CLASS_TEACHER' && !a.is_class_teacher) {
        return false;
      }
      if (typeFilter === 'SUBJECT' && a.is_class_teacher) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const teacher = (a.teacher_name || '').toLowerCase();
        const subject = (a.subject_name || '').toLowerCase();
        const cls = (a.class_name || '').toLowerCase();
        const sec = (a.section_name || '').toLowerCase();
        return teacher.includes(q) || subject.includes(q) || cls.includes(q) || sec.includes(q);
      }
      return true;
    });
  }, [assignments, selectedClassFilter, typeFilter, searchQuery]);

  // Unassigned Items (Gaps)
  const unassignedItems = useMemo(() => {
    if (!staffingStatus) return [];
    const items: Array<{
      id: string;
      class_id: string;
      class_name: string;
      section_id?: string;
      section_name: string;
      type: 'CLASS_TEACHER' | 'SUBJECT';
      subject_id?: string;
      subject_name?: string;
      subject_code?: string | null;
    }> = [];

    // Track already-assigned subject IDs for defensive deduplication
    const assignedSubjectIds = new Set(
      assignments.filter((a) => !a.is_class_teacher && a.subject_id).map((a) => a.subject_id)
    );

    for (const ct of staffingStatus.missing_class_teachers) {
      items.push({
        id: `missing-ct-${ct.class_id}-${ct.section_id}`,
        class_id: ct.class_id,
        class_name: ct.class_name,
        section_id: ct.section_id,
        section_name: ct.section_name || 'Entire Class',
        type: 'CLASS_TEACHER',
      });
    }

    for (const st of staffingStatus.missing_subject_teachers) {
      // Defensive check: if subject is already assigned in active assignments, skip
      if (st.subject_id && assignedSubjectIds.has(st.subject_id)) {
        continue;
      }
      items.push({
        id: `missing-st-${st.class_id}-${st.section_id || 'all'}-${st.subject_id}`,
        class_id: st.class_id,
        class_name: st.class_name,
        section_id: st.section_id || undefined,
        section_name: st.section_name || 'All Sections (Class-Wide)',
        type: 'SUBJECT',
        subject_id: st.subject_id,
        subject_name: st.subject_name,
        subject_code: st.subject_code,
      });
    }

    return items.filter((item) => {
      if (selectedClassFilter !== 'ALL' && item.class_id !== selectedClassFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const cName = item.class_name.toLowerCase();
        const sName = item.section_name.toLowerCase();
        const subName = (item.subject_name || '').toLowerCase();
        return cName.includes(q) || sName.includes(q) || subName.includes(q);
      }
      return true;
    });
  }, [staffingStatus, assignments, selectedClassFilter, searchQuery]);

  const classTeacherCount = assignments.filter((a) => a.is_class_teacher).length;
  const subjectTeacherCount = assignments.filter((a) => !a.is_class_teacher).length;
  const unassignedCount =
    (staffingStatus?.summary.missing_class_teachers_count ?? 0) +
    (staffingStatus?.summary.missing_subject_teachers_count ?? 0);

  if (!activeTenantId) {
    return <TenantRequiredState featureName="teacher class and subject assignments" />;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card
          role="button"
          tabIndex={0}
          onClick={() => setTypeFilter('ALL')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setTypeFilter('ALL');
            }
          }}
          className={`bg-card shadow-xs border p-4 cursor-pointer transition-all hover:shadow-sm ${
            typeFilter === 'ALL' ? 'ring-2 ring-primary/30 border-primary/50' : 'border-border/70'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Assignments
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">{assignments.length}</p>
            </div>
            <div className="p-3 rounded-xl bg-muted text-muted-foreground">
              <Layers className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card
          role="button"
          tabIndex={0}
          onClick={() => setTypeFilter('CLASS_TEACHER')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setTypeFilter('CLASS_TEACHER');
            }
          }}
          className={`bg-card shadow-xs border p-4 cursor-pointer transition-all hover:shadow-sm ${
            typeFilter === 'CLASS_TEACHER' ? 'ring-2 ring-purple-500/30 border-purple-500/50' : 'border-border/70'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Class Teachers
              </p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                {classTeacherCount}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card
          role="button"
          tabIndex={0}
          onClick={() => setTypeFilter('SUBJECT')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setTypeFilter('SUBJECT');
            }
          }}
          className={`bg-card shadow-xs border p-4 cursor-pointer transition-all hover:shadow-sm ${
            typeFilter === 'SUBJECT' ? 'ring-2 ring-primary/30 border-primary/50' : 'border-border/70'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Subject Teachers
              </p>
              <p className="text-2xl font-bold text-primary mt-1">
                {subjectTeacherCount}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card
          role="button"
          tabIndex={0}
          onClick={() => setTypeFilter('UNASSIGNED')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setTypeFilter('UNASSIGNED');
            }
          }}
          className={`bg-card shadow-xs border p-4 cursor-pointer transition-all hover:shadow-sm ${
            typeFilter === 'UNASSIGNED'
              ? 'ring-2 ring-amber-500/30 border-amber-500/50'
              : 'border-border/70'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Unassigned Slots
              </p>
              <p
                className={`text-2xl font-bold mt-1 ${
                  unassignedCount > 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {unassignedCount}
              </p>
            </div>
            <div
              className={`p-3 rounded-xl ${
                unassignedCount > 0
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-card p-3 rounded-xl border shadow-xs">
        <div className="flex flex-1 items-center gap-2 flex-wrap">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search teacher, subject, class..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-9 text-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter by Type */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg text-xs font-medium">
            <button
              type="button"
              onClick={() => setTypeFilter('ALL')}
              className={`px-2.5 py-1 rounded transition-colors ${
                typeFilter === 'ALL' ? 'bg-card text-foreground font-bold shadow-xs' : 'text-muted-foreground'
              }`}
            >
              All ({assignments.length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('CLASS_TEACHER')}
              className={`px-2.5 py-1 rounded transition-colors ${
                typeFilter === 'CLASS_TEACHER' ? 'bg-card text-foreground font-bold shadow-xs' : 'text-muted-foreground'
              }`}
            >
              Class Teachers ({classTeacherCount})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('SUBJECT')}
              className={`px-2.5 py-1 rounded transition-colors ${
                typeFilter === 'SUBJECT' ? 'bg-card text-foreground font-bold shadow-xs' : 'text-muted-foreground'
              }`}
            >
              Subject Teachers ({subjectTeacherCount})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('UNASSIGNED')}
              className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                typeFilter === 'UNASSIGNED'
                  ? 'bg-card text-amber-700 dark:text-amber-300 font-bold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>Unassigned</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  unassignedCount > 0
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {unassignedCount}
              </span>
            </button>
          </div>

          {/* Filter by Class */}
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="ALL">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {canAssign && !isReadOnly && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openDialog('class_teacher')}
              className="h-9 gap-1.5 text-xs shadow-2xs"
            >
              <UserCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Appoint Class Teacher</span>
            </Button>
            <Button
              size="sm"
              onClick={() => openDialog('subject')}
              className="h-9 gap-1.5 text-xs shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Assign Subject Teacher</span>
            </Button>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {isError && (
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center justify-between">
          <span>Failed to load teacher assignments from server.</span>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="h-7 text-xs">
            Retry
          </Button>
        </div>
      )}

      {/* Main Table View */}
      {isLoading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-12 bg-card rounded-xl border" />
          <div className="h-16 bg-card rounded-xl border" />
          <div className="h-16 bg-card rounded-xl border" />
        </div>
      ) : typeFilter === 'UNASSIGNED' ? (
        unassignedItems.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="All Positions Staffed"
            description={
              searchQuery || selectedClassFilter !== 'ALL'
                ? 'No unassigned positions match your active filters.'
                : 'All classes and sections have appointed class teachers and assigned subject teachers.'
            }
          />
        ) : (
          <div className="rounded-xl border border-amber-500/30 overflow-hidden bg-card shadow-xs">
            <div className="bg-amber-500/10 px-4 py-2.5 border-b border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  {unassignedItems.length} Unassigned Position{unassignedItems.length === 1 ? '' : 's'} Requiring Faculty
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                Click &quot;Assign&quot; to quickly fulfill a vacant role
              </span>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-1/3">Vacant Role</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Class & Section</TableHead>
                  <TableHead>Subject</TableHead>
                  {canAssign && !isReadOnly && <TableHead className="w-28 text-right">Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {unassignedItems.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/20">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
                          <UserX className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-foreground">
                            {item.type === 'CLASS_TEACHER' ? 'Class Teacher Needed' : 'Subject Teacher Needed'}
                          </p>
                          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                            Vacant Position
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      {item.type === 'CLASS_TEACHER' ? (
                        <Badge variant="purple" className="text-[10px] gap-1 px-2 py-0.5">
                          <UserCheck className="w-3 h-3" />
                          Class Teacher
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] gap-1 px-2 py-0.5 border-amber-500/30 text-amber-700 dark:text-amber-300">
                          <BookOpen className="w-3 h-3" />
                          Subject Teacher
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="text-xs sm:text-sm font-medium text-foreground">
                          {item.class_name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {item.section_name.startsWith('Section') || item.section_name.includes('All') || item.section_name.includes('Entire')
                            ? item.section_name
                            : `Section ${item.section_name}`}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell>
                      {item.type === 'CLASS_TEACHER' ? (
                        <span className="text-xs text-muted-foreground italic">— Entire Section —</span>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          <BookOpen className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>
                            {item.subject_name}
                            {item.subject_code ? ` (${item.subject_code})` : ''}
                          </span>
                        </div>
                      )}
                    </TableCell>

                    {canAssign && !isReadOnly && (
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={item.type === 'CLASS_TEACHER' ? 'outline' : 'default'}
                          onClick={() =>
                            openDialog(
                              item.type === 'CLASS_TEACHER' ? 'class_teacher' : 'subject',
                              {
                                classId: item.class_id,
                                sectionId: item.section_id,
                                subjectId: item.subject_id,
                              }
                            )
                          }
                          className="h-8 text-xs gap-1 shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Assign</span>
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      ) : filteredAssignments.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No Teacher Assignments Found"
          description={
            searchQuery || selectedClassFilter !== 'ALL' || typeFilter !== 'ALL'
              ? 'No records match your active filters.'
              : 'Get started by appointing a class teacher or assigning instructors to subjects.'
          }
          action={
            canAssign ? (
              <Button size="sm" onClick={() => openDialog('subject')} className="gap-1.5">
                <Plus className="w-4 h-4" />
                Assign Subject Teacher
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-xl border border-border/80 overflow-hidden bg-card shadow-xs">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-1/3">Teacher</TableHead>
                <TableHead>Assignment Type</TableHead>
                <TableHead>Class & Section</TableHead>
                <TableHead>Subject</TableHead>
                {canAssign && <TableHead className="w-20 text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssignments.map((a) => (
                <TableRow key={a.id} className="hover:bg-muted/20">
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {(a.teacher_name || 'T')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                          {a.teacher_name || 'Assigned Faculty'}
                        </p>
                        <p className="text-[11px] font-mono text-muted-foreground truncate">
                          ID: {a.teacher_id.slice(-8)}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    {a.is_class_teacher ? (
                      <Badge variant="purple" className="text-[10px] gap-1 px-2 py-0.5">
                        <UserCheck className="w-3 h-3" />
                        Class Teacher
                      </Badge>
                    ) : (
                      <Badge variant="default" className="text-[10px] gap-1 px-2 py-0.5">
                        <BookOpen className="w-3 h-3" />
                        Subject Teacher
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell>
                    <div className="space-y-0.5">
                      <p className="text-xs sm:text-sm font-medium text-foreground">
                        {a.class_name || 'Class'}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {a.section_name ? `Section ${a.section_name}` : 'All Sections'}
                      </p>
                    </div>
                  </TableCell>

                  <TableCell>
                    {a.is_class_teacher ? (
                      <span className="text-xs text-muted-foreground italic">—</span>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <BookOpen className="w-3.5 h-3.5 text-primary" />
                        <span>{a.subject_name || 'Curriculum Subject'}</span>
                      </div>
                    )}
                  </TableCell>

                  {canAssign && !isReadOnly && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(a)}
                        disabled={deletingId === a.id}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                        title="Revoke Assignment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Assignment Dialog */}
      {dialogOpen && (
        <AssignTeacherDialog
          isOpen={dialogOpen}
          onClose={() => setDialogOpen(false)}
          classes={classes}
          tenantId={activeTenantId}
          initialMode={dialogMode}
          defaultClassId={dialogClassId}
          defaultSectionId={dialogSectionId}
          defaultSubjectId={dialogSubjectId}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!assignmentToDelete}
        onOpenChange={(open) => !open && setAssignmentToDelete(null)}
        title="Remove Teacher Assignment"
        description={`Are you sure you want to remove the assignment for ${assignmentToDelete?.teacher_name || 'this teacher'} in ${assignmentToDelete?.class_name || 'this class'}?`}
        confirmLabel="Remove Assignment"
        variant="destructive"
        isPending={!!deletingId}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
