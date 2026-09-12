import React, { useState, useMemo } from 'react';
import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import {
  useAssignments,
  useAllClassesWithDetails,
  useDeleteAssignment,
} from '../hooks';
import { useSelectedAcademicYear } from '@/features/academic-year/hooks/useSelectedAcademicYear';
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
} from 'lucide-react';
import { TenantRequiredState } from '@/components/common/TenantRequiredState';
import { EmptyState } from '@/components/common/EmptyState';
import type { TeacherAssignment } from '../types';

export const TeacherAssignmentsPage: React.FC = () => {
  const { activeTenantId } = useAuth();
  const { can } = usePermission();
  const canAssign = can('ASSIGN_TEACHERS');

  const { selectedYear, selectedYearId } = useSelectedAcademicYear();
  const isReadOnly = selectedYear?.is_closed || !selectedYear?.is_current;

  const { data: assignments = [], isLoading, isError, refetch } = useAssignments(activeTenantId, { academic_year_id: selectedYearId });
  const { data: classes = [] } = useAllClassesWithDetails(activeTenantId, selectedYearId);
  const deleteAssignmentMutation = useDeleteAssignment();

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'subject' | 'class_teacher'>('subject');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filters State
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'CLASS_TEACHER' | 'SUBJECT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const openDialog = (mode: 'subject' | 'class_teacher') => {
    setDialogMode(mode);
    setDialogOpen(true);
  };

  const handleDelete = async (assignment: TeacherAssignment) => {
    if (!activeTenantId) return;
    const confirmed = window.confirm(
      `Remove assignment for ${assignment.teacher_name || 'this teacher'} in ${assignment.class_name || 'Class'}?`
    );
    if (!confirmed) return;

    setDeletingId(assignment.id);
    try {
      await deleteAssignmentMutation.mutateAsync({
        tenantId: activeTenantId,
        assignmentId: assignment.id,
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered Assignments
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

  const classTeacherCount = assignments.filter((a) => a.is_class_teacher).length;
  const subjectTeacherCount = assignments.filter((a) => !a.is_class_teacher).length;

  if (!activeTenantId) {
    return <TenantRequiredState featureName="teacher class and subject assignments" />;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Actions */}
      {canAssign && !isReadOnly && (
        <div className="flex justify-end">
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openDialog('class_teacher')}
              className="gap-1.5"
            >
              <UserCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Appoint Class Teacher</span>
            </Button>
            <Button
              size="sm"
              onClick={() => openDialog('subject')}
              className="gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Assign Subject Teacher</span>
            </Button>
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="bg-card shadow-xs border-border/70 p-4">
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

        <Card className="bg-card shadow-xs border-border/70 p-4">
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

        <Card className="bg-card shadow-xs border-border/70 p-4">
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
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border shadow-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search teacher, subject, class..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Filter by Type */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg text-xs font-medium">
            <button
              type="button"
              onClick={() => setTypeFilter('ALL')}
              className={`px-2.5 py-1 rounded transition-colors ${
                typeFilter === 'ALL' ? 'bg-card text-foreground font-bold shadow-xs' : 'text-muted-foreground'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('CLASS_TEACHER')}
              className={`px-2.5 py-1 rounded transition-colors ${
                typeFilter === 'CLASS_TEACHER' ? 'bg-card text-foreground font-bold shadow-xs' : 'text-muted-foreground'
              }`}
            >
              Class Teachers
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('SUBJECT')}
              className={`px-2.5 py-1 rounded transition-colors ${
                typeFilter === 'SUBJECT' ? 'bg-card text-foreground font-bold shadow-xs' : 'text-muted-foreground'
              }`}
            >
              Subject Teachers
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
        />
      )}
    </div>
  );
};
