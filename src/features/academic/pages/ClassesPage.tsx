import React, { useState, useMemo } from 'react';
import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import {
  useAllClassesWithDetails,
  useMyTeacherAssignments,
  useCreateClass,
  useUpdateClass,
  useDeleteClass,
  useCreateSection,
  useAddStudent,
} from '../hooks';
import { useDailyAttendanceStatus } from '@/features/attendance/hooks';
import { AcademicStatsCards } from '../components/AcademicStatsCards';
import { ClassCard, type TeacherClassScope } from '../components/ClassCard';
import { ClassCreateDialog } from '../components/ClassCreateDialog';
import { ClassEditDialog } from '../components/ClassEditDialog';
import { ClassDeleteDialog } from '../components/ClassDeleteDialog';
import { SectionAddDialog } from '../components/SectionAddDialog';
import { ClassDetailModal } from '../components/ClassDetailModal';
import { ClassProgressionPipeline } from '../components/ClassProgressionPipeline';
import { ClassReorderDialog } from '../components/ClassReorderDialog';
import { Plus, BookOpen, ShieldCheck, School } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from '@tanstack/react-router';
import { TenantRequiredState } from '@/components/common/TenantRequiredState';
import { EmptyState } from '@/components/common/EmptyState';
import { FilterToolbar } from '@/components/common/FilterToolbar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SchoolSearchSelect } from '@/features/academic-year/components/SchoolSearchSelect';
import { useTenant } from '@/features/tenants/hooks';
import type { ClassWithDetails, AcademicClass, AcademicStats } from '../types';

export const ClassesPage: React.FC = () => {
  const { activeTenantId, activeRole } = useAuth();
  const { isSuperAdmin, can } = usePermission();
  const navigate = useNavigate();

  const [pageTenantId, setPageTenantId] = useState<string | null>(activeTenantId);
  
  React.useEffect(() => {
    setPageTenantId(activeTenantId);
  }, [activeTenantId]);

  const { data: effectiveTenant } = useTenant(pageTenantId);


  const canManage =
    isSuperAdmin || can('MANAGE_CLASSES_SUBJECTS') || activeRole === 'ADMIN' || activeRole === 'OFFICE_ADMIN';
  const canHardDelete = isSuperAdmin || activeRole === 'ADMIN';
  const isTeacherOnly = activeRole === 'TEACHER' && !canManage;

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');

  // Detail Modal State (URL-based routing handles page-level detail view)
  const [detailModalClass, setDetailModalClass] = useState<ClassWithDetails | null>(null);

  // Dialogs State
  const [isCreateClassOpen, setIsCreateClassOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<AcademicClass | null>(null);
  const [deletingClass, setDeletingClass] = useState<AcademicClass | null>(null);
  const [addingSectionClass, setAddingSectionClass] = useState<AcademicClass | null>(null);
  const [isReorderOpen, setIsReorderOpen] = useState(false);

  // Queries & Mutations
  const {
    data: classesWithDetails = [],
    isLoading,
    isError,
    refetch,
  } = useAllClassesWithDetails(pageTenantId);

  const { data: myTeacherAssignments = [] } = useMyTeacherAssignments(
    pageTenantId,
    { enabled: isTeacherOnly }
  );

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const { data: dailyStatus } = useDailyAttendanceStatus(pageTenantId, todayStr, undefined, {
    enabled: !!pageTenantId,
  });
  const markedSectionIds = useMemo(() => {
    return new Set(dailyStatus?.marked_section_ids || []);
  }, [dailyStatus]);

  const createClassMutation = useCreateClass();
  const updateClassMutation = useUpdateClass();
  const deleteClassMutation = useDeleteClass();
  const createSectionMutation = useCreateSection();
  const addStudentMutation = useAddStudent();

  // Teacher scope mapping
  const { assignedClassIds, teacherScopeByClassId } = useMemo(() => {
    if (!isTeacherOnly) {
      return {
        assignedClassIds: null,
        teacherScopeByClassId: new Map<string, TeacherClassScope>(),
      };
    }

    const classIds = new Set<string>();
    const scopeMap = new Map<string, TeacherClassScope>();

    for (const a of myTeacherAssignments) {
      if (!a.class_id) continue;
      classIds.add(a.class_id);

      let scope = scopeMap.get(a.class_id);
      if (!scope) {
        scope = {
          isClassTeacher: false,
          classTeacherSections: [],
          isSubjectTeacher: false,
          subjectNames: [],
        };
        scopeMap.set(a.class_id, scope);
      }

      if (a.is_class_teacher) {
        scope.isClassTeacher = true;
        if (a.section_id) {
          if (!scope.classTeacherSections.some((s) => s.id === a.section_id)) {
            scope.classTeacherSections.push({
              id: a.section_id,
              name: a.section_name || 'A',
            });
          }
        }
      } else {
        scope.isSubjectTeacher = true;
        if (a.subject_name && !scope.subjectNames.includes(a.subject_name)) {
          scope.subjectNames.push(a.subject_name);
        }
      }
    }

    for (const scope of scopeMap.values()) {
      if (scope.isClassTeacher) {
        scope.isTodayAttendanceMarked = scope.classTeacherSections.some((sec) =>
          markedSectionIds.has(sec.id)
        );
      }
    }

    return { assignedClassIds: classIds, teacherScopeByClassId: scopeMap };
  }, [isTeacherOnly, myTeacherAssignments, markedSectionIds]);

  // Sort classes strictly by sequence_order ascending so chronology is preserved everywhere
  const sortedClasses = useMemo(() => {
    return [...classesWithDetails].sort((a, b) => {
      const seqA = a.sequence_order ?? 0;
      const seqB = b.sequence_order ?? 0;
      if (seqA !== seqB) return seqA - seqB;
      return a.name.localeCompare(b.name);
    });
  }, [classesWithDetails]);

  // Progression lookup map for each class
  const progressionMetaMap = useMemo(() => {
    const map = new Map<string, { sequenceIndex: number; nextClassName: string | null; isHighestGrade: boolean }>();
    sortedClasses.forEach((c, idx) => {
      const isFinal = idx === sortedClasses.length - 1;
      const nextCls = !isFinal ? sortedClasses[idx + 1] : null;
      map.set(c.id, {
        sequenceIndex: c.sequence_order ?? (idx + 1),
        nextClassName: nextCls ? nextCls.name : null,
        isHighestGrade: isFinal && sortedClasses.length > 1,
      });
    });
    return map;
  }, [sortedClasses]);

  // Filter classes for teacher to only those where they are designated Class Teacher
  const scopedClasses = useMemo(() => {
    if (!isTeacherOnly || !assignedClassIds) return sortedClasses;
    return sortedClasses.filter((c) => {
      const scope = teacherScopeByClassId.get(c.id);
      return !!scope?.isClassTeacher;
    });
  }, [sortedClasses, isTeacherOnly, assignedClassIds, teacherScopeByClassId]);

  // Compute Stats
  const stats: AcademicStats & { configuredSubjects?: number } = useMemo(() => {
    const totalClasses = scopedClasses.length;
    let totalSections = 0;
    let totalStudents = 0;
    let configuredSubjects = 0;

    for (const c of scopedClasses) {
      configuredSubjects += c.subjects?.length || 0;
      if (isTeacherOnly) {
        const scope = teacherScopeByClassId.get(c.id);
        const secIds = new Set(scope?.classTeacherSections.map((s) => s.id) || []);
        if (secIds.size === 0 && scope?.isClassTeacher) {
          totalSections += c.sections.length;
          totalStudents += c.students.length;
        } else {
          totalSections += secIds.size;
          totalStudents += c.students.filter((st) => st.section_id && secIds.has(st.section_id)).length;
        }
      } else {
        totalSections += c.sections.length;
        totalStudents += c.students.length;
      }
    }

    const avgStudentsPerSection =
      totalSections > 0 ? Math.round(totalStudents / totalSections) : 0;

    return {
      totalClasses,
      totalSections,
      totalStudents,
      avgStudentsPerSection,
      configuredSubjects,
    };
  }, [scopedClasses, isTeacherOnly, teacherScopeByClassId]);

  // Filtered Classes
  const filteredClasses = useMemo(() => {
    if (!searchQuery.trim()) return scopedClasses;
    const q = searchQuery.toLowerCase();
    return scopedClasses.filter((c) => {
      const scope = isTeacherOnly ? teacherScopeByClassId.get(c.id) : null;
      const relevantSections = isTeacherOnly && scope?.classTeacherSections.length
        ? c.sections.filter((s) => scope.classTeacherSections.some((ct) => ct.id === s.id))
        : c.sections;
      return (
        c.name.toLowerCase().includes(q) ||
        relevantSections.some((s) => s.name.toLowerCase().includes(q))
      );
    });
  }, [scopedClasses, searchQuery, isTeacherOnly, teacherScopeByClassId]);

  // Sync detailed modal class with latest query data
  const activeDetailClass = useMemo(() => {
    if (!detailModalClass) return null;
    return classesWithDetails.find((c) => c.id === detailModalClass.id) || detailModalClass;
  }, [classesWithDetails, detailModalClass]);

  if (!pageTenantId && !isSuperAdmin) {
    return <TenantRequiredState featureName="academic classes and sections" />;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Super Admin Tenant Selector */}
      {isSuperAdmin && (
        <Card className="p-3.5 sm:p-4 rounded-2xl border border-primary/20 bg-primary/[0.03] dark:bg-primary/[0.06] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 transition-all">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <School className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  School Scope
                </span>
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-primary/30 text-primary font-medium">
                  Super Admin
                </Badge>
              </div>
              <p className="text-sm font-medium text-foreground truncate mt-0.5">
                {effectiveTenant ? (
                  <span className="flex items-center gap-1.5">
                    <span className="font-semibold text-foreground">{effectiveTenant.name}</span>
                    {effectiveTenant.domain_name && (
                      <span className="text-xs text-muted-foreground font-normal">
                        ({effectiveTenant.domain_name})
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs">
                    Select a school to view its classes and sections
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <SchoolSearchSelect
              selectedTenantId={pageTenantId || ''}
              onSelectTenant={(id) => setPageTenantId(id || null)}
              className="w-full sm:w-80"
            />
          </div>
        </Card>
      )}

      {!pageTenantId && isSuperAdmin ? (
        <div className="text-center py-12 text-muted-foreground">
          Please select a school from the dropdown above to view its classes.
        </div>
      ) : (
        <>
          {/* KPI Stats */}
          <AcademicStatsCards stats={stats} isLoading={isLoading} />

          {/* Search and Action Bar */}
          <FilterToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search classes by name or section..."
            showingCount={filteredClasses.length}
            totalCount={scopedClasses.length}
            unitLabel={scopedClasses.length === 1 ? 'class' : 'classes'}
            actions={
              canManage ? (
                <Button
                  onClick={() => setIsCreateClassOpen(true)}
                  size="sm"
                  className="gap-1.5 h-9 shadow-xs shrink-0 text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Class</span>
                </Button>
              ) : undefined
            }
          />

          {/* Error Alert */}
          {isError && (
            <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center justify-between">
              <span>Failed to load classes from server. Showing cached data.</span>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="h-7 text-xs">
                Retry
              </Button>
            </div>
          )}

          {/* Teacher View Scope Banner */}
          {isTeacherOnly && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-300 text-xs">
              <ShieldCheck className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <span>
                <strong>Teacher View:</strong> Displaying only classes where you are assigned as a Class Teacher or Subject Teacher.
              </span>
            </div>
          )}

      {/* Classes Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-56 rounded-xl border border-border/60 bg-muted/20 animate-pulse p-5 space-y-4">
              <div className="h-6 w-1/3 bg-muted rounded" />
              <div className="h-4 w-2/3 bg-muted/60 rounded" />
              <div className="h-10 bg-muted/40 rounded-lg" />
            </div>
          ))}
        </div>
      ) : filteredClasses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={isTeacherOnly && !searchQuery ? 'No Assigned Classes' : 'No Classes Found'}
          description={
            searchQuery
              ? 'No classes match your search term. Try a different query.'
              : isTeacherOnly
              ? 'You are not currently assigned as a Class Teacher or Subject Teacher for any class. Please contact your school administrator to assign your curriculum or class responsibilities.'
              : 'Start setting up your school curriculum by creating your first academic class.'
          }
          action={
            canManage && !searchQuery ? (
              <Button
                onClick={() => setIsCreateClassOpen(true)}
                className="gap-1.5 text-xs mt-2"
              >
                <Plus className="w-3.5 h-3.5" />
                Create First Class
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClasses.map((cls) => {
            const meta = progressionMetaMap.get(cls.id);
            return (
              <ClassCard
                key={cls.id}
                cls={cls}
                canManage={canManage}
                teacherScope={teacherScopeByClassId.get(cls.id)}
                sequenceIndex={meta?.sequenceIndex}
                totalClasses={sortedClasses.length}
                nextClassName={meta?.nextClassName}
                isHighestGrade={meta?.isHighestGrade}
                onMarkAttendance={(clsId, secId) =>
                  navigate({
                    to: '/attendance/mark',
                    search: { classId: clsId, sectionId: secId } as any,
                  })
                }
                onOpenDetails={() => {}}
                onOpenDetailsPage={(id) => navigate({ to: '/academic/classes/$classId', params: { classId: id } })}
                onAddSection={(c) => setAddingSectionClass(c)}
                onEditClass={(c) => setEditingClass(c)}
                onDeleteClass={(c) => setDeletingClass(c)}
              />
            );
          })}
        </div>
      )}

      {/* Academic Progression Chronology */}
      {sortedClasses.length > 0 && (
        <ClassProgressionPipeline
          classes={sortedClasses}
          onSelectClass={(id) => navigate({ to: '/academic/classes/$classId', params: { classId: id } })}
          onOpenReorder={canManage ? () => setIsReorderOpen(true) : undefined}
        />
      )}

      {/* Dialog: Create Class */}
      <ClassCreateDialog
        isOpen={isCreateClassOpen}
        onClose={() => setIsCreateClassOpen(false)}
        onSubmit={async (data) => {
          if (!activeTenantId) return;
          await createClassMutation.mutateAsync({
            tenantId: activeTenantId,
            data,
          });
        }}
        isLoading={createClassMutation.isPending}
      />

      {/* Dialog: Edit Class */}
      <ClassEditDialog
        cls={editingClass}
        isOpen={!!editingClass}
        onClose={() => setEditingClass(null)}
        onSubmit={async (classId, data) => {
          if (!activeTenantId) return;
          await updateClassMutation.mutateAsync({
            tenantId: activeTenantId,
            classId,
            data,
          });
        }}
        isLoading={updateClassMutation.isPending}
      />

      {/* Dialog: Delete Class */}
      <ClassDeleteDialog
        cls={deletingClass}
        isOpen={!!deletingClass}
        onClose={() => setDeletingClass(null)}
        onConfirm={async (classId, hard) => {
          if (!activeTenantId) return;
          await deleteClassMutation.mutateAsync({
            tenantId: activeTenantId,
            classId,
            hard,
          });
        }}
        isLoading={deleteClassMutation.isPending}
        canHardDelete={canHardDelete}
      />

      {/* Dialog: Add Section */}
      <SectionAddDialog
        cls={addingSectionClass}
        tenantId={activeTenantId}
        isOpen={!!addingSectionClass}
        onClose={() => setAddingSectionClass(null)}
        onConfirm={async (classId) => {
          if (!activeTenantId) return;
          await createSectionMutation.mutateAsync({
            tenantId: activeTenantId,
            classId,
          });
        }}
        isLoading={createSectionMutation.isPending}
      />

      {/* Modal: Class Detail Inspector (kept for dropdown menu) */}
      <ClassDetailModal
        cls={activeDetailClass}
        tenantId={activeTenantId}
        isOpen={!!detailModalClass}
        onClose={() => setDetailModalClass(null)}
        canManage={canManage}
        onAddStudent={async (sectionId, data) => {
          if (!activeTenantId || !detailModalClass) return;
          await addStudentMutation.mutateAsync({
            tenantId: activeTenantId,
            classId: detailModalClass.id,
            sectionId,
            data,
          });
        }}
        onAddSection={async (classId) => {
          if (!activeTenantId) return;
          await createSectionMutation.mutateAsync({
            tenantId: activeTenantId,
            classId,
          });
        }}
        isAddingStudent={addStudentMutation.isPending}
        isAddingSection={createSectionMutation.isPending}
      />

      {/* Dialog: Reorder Progression Sequence */}
      <ClassReorderDialog
        isOpen={isReorderOpen}
        onClose={() => setIsReorderOpen(false)}
        classes={sortedClasses}
        tenantId={pageTenantId || activeTenantId || ''}
      />
        </>
      )}
    </div>
  );
};
