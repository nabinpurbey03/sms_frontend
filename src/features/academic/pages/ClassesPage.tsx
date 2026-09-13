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
import { Plus, Search, X, BookOpen, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from '@tanstack/react-router';
import { TenantRequiredState } from '@/components/common/TenantRequiredState';
import { EmptyState } from '@/components/common/EmptyState';
import type { ClassWithDetails, AcademicClass, AcademicStats } from '../types';
import { useTenants } from '@/features/tenants/hooks';
import { useDebounce } from 'use-debounce';

const SchoolSearchSelector = ({
  tenants,
  value,
  onChange,
  onSearchChange,
}: {
  tenants: any[];
  value: string | null;
  onChange: (id: string | null) => void;
  onSearchChange: (search: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // No internal filtering, the parent passes filtered tenants
  const filtered = tenants;

  const selectedTenant = tenants.find(t => t.id === value);

  return (
    <div className="relative w-full sm:w-[300px]">
      <div 
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate">
          {selectedTenant ? selectedTenant.name : "-- Select a School --"}
        </span>
      </div>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md z-50">
            <div className="p-2 border-b">
              <input 
                className="flex h-8 w-full rounded-sm border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" 
                placeholder="Search schools..."
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  onSearchChange(e.target.value);
                }}
                autoFocus
              />
            </div>
            <ul className="max-h-[190px] overflow-auto p-1 custom-scrollbar">
              {filtered.length === 0 ? (
                <li className="p-2 text-sm text-muted-foreground text-center">No schools found.</li>
              ) : (
                filtered.map(t => (
                  <li
                    key={t.id}
                    className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground ${t.id === value ? 'bg-accent font-medium' : ''}`}
                    onClick={() => {
                      onChange(t.id);
                      setIsOpen(false);
                      setSearchTerm('');
                      onSearchChange('');
                    }}
                  >
                    {t.name}
                  </li>
                ))
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export const ClassesPage: React.FC = () => {
  const { activeTenantId, activeRole } = useAuth();
  const { isSuperAdmin, can } = usePermission();
  const navigate = useNavigate();

  const [pageTenantId, setPageTenantId] = useState<string | null>(activeTenantId);
  
  React.useEffect(() => {
    setPageTenantId(activeTenantId);
  }, [activeTenantId]);

  const [tenantSearch, setTenantSearch] = useState('');
  const [debouncedTenantSearch] = useDebounce(tenantSearch, 400);

  // We fetch up to 100 since the backend max is 100
  const { data: tenantsResponse } = useTenants({ page: 1, page_size: 100, search: debouncedTenantSearch || undefined });
  const allTenants = tenantsResponse?.items || [];

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

  // Filter classes for teacher
  const scopedClasses = useMemo(() => {
    if (!isTeacherOnly || !assignedClassIds) return classesWithDetails;
    return classesWithDetails.filter((c) => assignedClassIds.has(c.id));
  }, [classesWithDetails, isTeacherOnly, assignedClassIds]);

  // Compute Stats
  const stats: AcademicStats = useMemo(() => {
    const totalClasses = scopedClasses.length;
    let totalSections = 0;
    let totalStudents = 0;

    for (const c of scopedClasses) {
      totalSections += c.sections.length;
      totalStudents += c.students.length;
    }

    const avgStudentsPerSection =
      totalSections > 0 ? Math.round(totalStudents / totalSections) : 0;

    return {
      totalClasses,
      totalSections,
      totalStudents,
      avgStudentsPerSection,
    };
  }, [scopedClasses]);

  // Filtered Classes
  const filteredClasses = useMemo(() => {
    if (!searchQuery.trim()) return scopedClasses;
    const q = searchQuery.toLowerCase();
    return scopedClasses.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.sections.some((s) => s.name.toLowerCase().includes(q))
    );
  }, [scopedClasses, searchQuery]);

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
        <div className="bg-muted/30 p-4 rounded-xl border border-border/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              Super Admin View
            </h3>
            <p className="text-sm text-muted-foreground">Select a school to view its classes and sections.</p>
          </div>
            <SchoolSearchSelector 
              tenants={allTenants} 
              value={pageTenantId} 
              onChange={setPageTenantId} 
              onSearchChange={setTenantSearch}
            />
        </div>
      )}

      {!pageTenantId && isSuperAdmin ? (
        <div className="text-center py-12 text-muted-foreground">
          Please select a school from the dropdown above to view its classes.
        </div>
      ) : (
        <>
          {/* Actions */}
      {canManage && (
        <div className="flex justify-end">
          <Button
            onClick={() => setIsCreateClassOpen(true)}
            className="gap-2 shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Class</span>
          </Button>
        </div>
      )}

      {/* KPI Stats */}
      <AcademicStatsCards stats={stats} isLoading={isLoading} />

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-3 p-4 rounded-xl border border-border/60 bg-card shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search classes by name or section..."
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

        <div className="text-xs text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{filteredClasses.length}</span>{' '}
          {filteredClasses.length === 1 ? 'class' : 'classes'}
        </div>
      </div>

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
        <div className="flex items-center gap-2 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-800 dark:text-purple-300 text-xs">
          <ShieldCheck className="w-4 h-4 shrink-0 text-purple-600 dark:text-purple-400" />
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
          {filteredClasses.map((cls) => (
            <ClassCard
              key={cls.id}
              cls={cls}
              canManage={canManage}
              teacherScope={teacherScopeByClassId.get(cls.id)}
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
          ))}
        </div>
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
        </>
      )}
    </div>
  );
};
