import React, { useState, useMemo } from 'react';
import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import {
  useAllClassesWithDetails,
  useCreateClass,
  useUpdateClass,
  useDeleteClass,
  useCreateSection,
  useAddStudent,
} from '../hooks';
import { AcademicStatsCards } from '../components/AcademicStatsCards';
import { ClassCard } from '../components/ClassCard';
import { ClassCreateDialog } from '../components/ClassCreateDialog';
import { ClassEditDialog } from '../components/ClassEditDialog';
import { ClassDeleteDialog } from '../components/ClassDeleteDialog';
import { SectionAddDialog } from '../components/SectionAddDialog';
import { ClassDetailPage } from './ClassDetailPage';
import { ClassDetailModal } from '../components/ClassDetailModal';
import { Building2, Plus, Search, X, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from '@tanstack/react-router';
import type { ClassWithDetails, AcademicClass, AcademicStats } from '../types';

export const ClassesPage: React.FC = () => {
  const { activeTenantId, activeTenantName, activeRole } = useAuth();
  const { isSuperAdmin, can } = usePermission();

  const canManage =
    isSuperAdmin || can('MANAGE_CLASSES_SUBJECTS') || activeRole === 'ADMIN' || activeRole === 'OFFICE_ADMIN';
  const canHardDelete = isSuperAdmin || activeRole === 'ADMIN';

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');

  // Detail Page State
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
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
  } = useAllClassesWithDetails(activeTenantId);

  const createClassMutation = useCreateClass();
  const updateClassMutation = useUpdateClass();
  const deleteClassMutation = useDeleteClass();
  const createSectionMutation = useCreateSection();
  const addStudentMutation = useAddStudent();

  // Compute Stats
  const stats: AcademicStats = useMemo(() => {
    const totalClasses = classesWithDetails.length;
    let totalSections = 0;
    let totalStudents = 0;

    for (const c of classesWithDetails) {
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
  }, [classesWithDetails]);

  // Filtered Classes
  const filteredClasses = useMemo(() => {
    if (!searchQuery.trim()) return classesWithDetails;
    const q = searchQuery.toLowerCase();
    return classesWithDetails.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.sections.some((s) => s.name.toLowerCase().includes(q))
    );
  }, [classesWithDetails, searchQuery]);

  // Get selected class from filtered list
  const selectedClass = useMemo(() => {
    if (!selectedClassId) return null;
    return filteredClasses.find((c) => c.id === selectedClassId) || null;
  }, [filteredClasses, selectedClassId]);

  // Sync detailed modal class with latest query data
  const activeDetailClass = useMemo(() => {
    if (!detailModalClass) return null;
    return classesWithDetails.find((c) => c.id === detailModalClass.id) || detailModalClass;
  }, [classesWithDetails, detailModalClass]);

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
            You must switch to an active school tenant in order to configure and view academic classes and sections.
          </p>
        </div>
        <Button asChild>
          <Link to="/tenants">View All Schools</Link>
        </Button>
      </div>
    );
  }

  // If a class is selected, render the detail page
  if (selectedClass) {
    return (
      <>
        <ClassDetailPage
          cls={selectedClass}
          tenantId={activeTenantId}
          onBack={() => setSelectedClassId(null)}
        />
      </>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Classes & Sections
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {activeTenantName || 'Current School'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Organize academic classes, auto-provision sections, and monitor student capacity under the 20-student expansion policy.
          </p>
        </div>

        {canManage && (
          <Button
            onClick={() => setIsCreateClassOpen(true)}
            className="gap-2 shadow-xs shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create Class</span>
          </Button>
        )}
      </div>

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
        <div className="rounded-xl border border-dashed border-border/80 bg-card p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-foreground">No Classes Found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {searchQuery
              ? 'No classes match your search term. Try a different query.'
              : 'Start setting up your school curriculum by creating your first academic class.'}
          </p>
          {canManage && !searchQuery && (
            <Button
              onClick={() => setIsCreateClassOpen(true)}
              className="gap-1.5 text-xs mt-2"
            >
              <Plus className="w-3.5 h-3.5" />
              Create First Class
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClasses.map((cls) => (
            <ClassCard
              key={cls.id}
              cls={cls}
              canManage={canManage}
              onOpenDetails={() => {}}
              onOpenDetailsPage={(id) => setSelectedClassId(id)}
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
    </div>
  );
};
