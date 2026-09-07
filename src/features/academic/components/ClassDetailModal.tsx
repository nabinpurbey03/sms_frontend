import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
  Layers,
  Users,
  BookOpen,
  Plus,
  Trash2,
  Lock,
  Sparkles,
  UserPlus,
  AlertTriangle,
} from 'lucide-react';
import {
  useCreateSubject,
  useDeleteSubject,
  useDeleteSection,
} from '../hooks';
import { StudentAddDialog } from './StudentAddDialog';
import { SectionAddDialog } from './SectionAddDialog';
import type { ClassWithDetails, AcademicStudent, AcademicSubject, AcademicSection } from '../types';

interface ClassDetailModalProps {
  cls: ClassWithDetails | null;
  tenantId: string | null;
  isOpen: boolean;
  onClose: () => void;
  canManage: boolean;
  onAddStudent: (sectionId: string, data: any) => Promise<any>;
  onAddSection: (classId: string) => Promise<any>;
  isAddingStudent: boolean;
  isAddingSection: boolean;
}

export const ClassDetailModal: React.FC<ClassDetailModalProps> = ({
  cls,
  tenantId,
  isOpen,
  onClose,
  canManage,
  onAddStudent,
  onAddSection,
  isAddingStudent,
  isAddingSection,
}) => {
  const [activeTab, setActiveTab] = useState<'roster' | 'subjects' | 'expansion'>('roster');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [isEnrollStudentOpen, setIsEnrollStudentOpen] = useState(false);
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);

  // Inline Subject Creation State
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectCode, setNewSubjectCode] = useState('');
  const [subjectToDelete, setSubjectToDelete] = useState<AcademicSubject | null>(null);
  const [sectionToDelete, setSectionToDelete] = useState<AcademicSection | null>(null);

  const createSubjectMutation = useCreateSubject();
  const deleteSubjectMutation = useDeleteSubject();
  const deleteSectionMutation = useDeleteSection();

  if (!cls) return null;

  const sections = cls.sections || [];
  const currentSection =
    sections.find((s) => s.id === selectedSectionId) || sections[0] || null;

  const sectionStudents = currentSection
    ? cls.students.filter((st) => st.section_id === currentSection.id)
    : [];

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !newSubjectName.trim()) return;
    await createSubjectMutation.mutateAsync({
      tenantId,
      classId: cls.id,
      data: {
        name: newSubjectName.trim(),
        code: newSubjectCode.trim() || undefined,
      },
    });
    setNewSubjectName('');
    setNewSubjectCode('');
  };

  const handleDeleteSubject = async (subjectId: string) => {
    if (!tenantId) return;
    await deleteSubjectMutation.mutateAsync({
      tenantId,
      classId: cls.id,
      subjectId,
    });
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!tenantId) return;
    await deleteSectionMutation.mutateAsync({
      tenantId,
      classId: cls.id,
      sectionId,
    });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0">
          {/* Header */}
          <div className="p-6 border-b border-border/60 bg-muted/20">
            <DialogHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-md bg-primary/10 text-primary">
                  <BookOpen className="w-4 h-4" />
                </span>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Academic Class Details
                </span>
              </div>
              <DialogTitle className="text-xl font-extrabold text-foreground">{cls.name}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Manage section rosters, curriculum subjects, and sequential capacity expansion.
              </DialogDescription>
            </DialogHeader>

            {/* Quick Metrics */}
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                <Users className="w-3.5 h-3.5" />
                {cls.students.length} Total Students
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20">
                <Layers className="w-3.5 h-3.5" />
                {sections.length} {sections.length === 1 ? 'Section' : 'Sections'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
                {cls.subjects.length} Subjects
              </span>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-1 mt-6 border-b border-border/60 -mb-6">
              <button
                type="button"
                onClick={() => setActiveTab('roster')}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'roster'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Section Rosters
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('subjects')}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'subjects'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Curriculum Subjects ({cls.subjects.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('expansion')}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'expansion'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                20-Student Expansion Policy
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-5">
            {/* Tab 1: Section Rosters */}
            {activeTab === 'roster' && (
              <div className="space-y-4">
                {/* Section Selector Pills */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground mr-1">Section:</span>
                    {sections.map((sec) => {
                      const isSelected = currentSection?.id === sec.id;
                      return (
                        <button
                          key={sec.id}
                          type="button"
                          onClick={() => setSelectedSectionId(sec.id)}
                          className={`px-3 py-1 text-xs rounded-lg font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-primary text-primary-foreground shadow-xs'
                              : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                        >
                          Section {sec.name} ({sec.student_count ?? 0})
                        </button>
                      );
                    })}
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => setIsEnrollStudentOpen(true)}
                        className="h-8 gap-1.5 text-xs shadow-xs"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Enroll Student
                      </Button>
                      {currentSection && sections.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSectionToDelete(currentSection)}
                          className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                          title="Delete this section"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Section Capacity Pill */}
                {currentSection && (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/50 text-xs">
                    <span className="text-muted-foreground font-medium">
                      Section {currentSection.name} Capacity:
                    </span>
                    <span className="font-semibold text-foreground">
                      {sectionStudents.length} / 20 Students{' '}
                      {sectionStudents.length >= 20 ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold ml-1">
                          (Capacity met for next expansion)
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 font-normal ml-1">
                          ({20 - sectionStudents.length} more needed for next section)
                        </span>
                      )}
                    </span>
                  </div>
                )}

                {/* Students Table */}
                {sectionStudents.length === 0 ? (
                  <div className="p-8 rounded-xl border border-dashed border-border/80 text-center space-y-2">
                    <Users className="w-8 h-8 text-muted-foreground mx-auto" />
                    <p className="text-xs font-semibold text-foreground">No Students Enrolled</p>
                    <p className="text-[11px] text-muted-foreground">
                      Click Enroll Student to register pupils into Section {currentSection?.name || 'A'}.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border/60 overflow-hidden shadow-xs">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-[60px]">#</TableHead>
                          <TableHead>Student Name</TableHead>
                          <TableHead className="w-[120px]">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sectionStudents.map((st: AcademicStudent, index: number) => {
                          const fullName = [st.first_name, st.middle_name, st.last_name]
                            .filter(Boolean)
                            .join(' ');
                          return (
                            <TableRow key={st.id} className="hover:bg-muted/40">
                              <TableCell className="font-mono text-xs text-muted-foreground">
                                {index + 1}
                              </TableCell>
                              <TableCell className="font-semibold text-xs text-foreground">
                                {fullName}
                              </TableCell>
                              <TableCell>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                  ● {st.status}
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Curriculum Subjects */}
            {activeTab === 'subjects' && (
              <div className="space-y-4">
                {canManage && (
                  <form
                    onSubmit={handleCreateSubject}
                    className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5 p-3.5 rounded-xl border border-border/70 bg-card"
                  >
                    <div className="flex-1 space-y-1">
                      <label className="text-xs font-semibold text-foreground">Subject Name *</label>
                      <Input
                        value={newSubjectName}
                        onChange={(e) => setNewSubjectName(e.target.value)}
                        placeholder="e.g. Environmental Science"
                        className="h-8 text-xs"
                        required
                      />
                    </div>
                    <div className="w-full sm:w-36 space-y-1">
                      <label className="text-xs font-semibold text-foreground">Code (Optional)</label>
                      <Input
                        value={newSubjectCode}
                        onChange={(e) => setNewSubjectCode(e.target.value)}
                        placeholder="e.g. ENV10"
                        className="h-8 text-xs font-mono uppercase"
                      />
                    </div>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={createSubjectMutation.isPending || !newSubjectName.trim()}
                      className="h-8 text-xs gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Subject
                    </Button>
                  </form>
                )}

                {/* Subjects Grid */}
                {cls.subjects.length === 0 ? (
                  <div className="p-8 rounded-xl border border-dashed border-border/80 text-center space-y-2">
                    <BookOpen className="w-8 h-8 text-muted-foreground mx-auto" />
                    <p className="text-xs font-semibold text-foreground">No Subjects Configured</p>
                    <p className="text-[11px] text-muted-foreground">
                      Register curriculum subjects taught in {cls.name}.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {cls.subjects.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-card shadow-xs"
                      >
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-foreground">{sub.name}</p>
                          {sub.code && (
                            <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {sub.code}
                            </span>
                          )}
                        </div>

                        {canManage && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSubjectToDelete(sub)}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive cursor-pointer"
                            title="Delete subject"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: 20-Student Expansion Policy */}
            {activeTab === 'expansion' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-border/70 bg-card space-y-2">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-primary" />
                    PBAC Academic Section Expansion Architecture
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    To maintain optimal student-teacher ratios and prevent empty section fragmentation,
                    sections are provisioned sequentially (<strong>Section A → Section B → Section C</strong>).
                    A new section can only be unlocked once the previous section reaches <strong>at least 20 enrolled students</strong>.
                  </p>
                </div>

                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Current Class Status
                  </h5>
                  <div className="space-y-2">
                    {sections.map((sec, idx) => {
                      const count = sec.student_count ?? 0;
                      const isMet = count >= 20;
                      return (
                        <div
                          key={sec.id}
                          className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/20"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                                isMet
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                              }`}
                            >
                              {sec.name}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-foreground">Section {sec.name}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {count} enrolled students {idx === 0 ? '(Default section)' : ''}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            {isMet ? (
                              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                Threshold Met (≥ 20)
                              </span>
                            ) : (
                              <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                {20 - count} more needed
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {canManage && (
                  <div className="pt-2 flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => setIsAddSectionOpen(true)}
                      className="gap-1.5 text-xs shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Check & Add Next Section
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border/60 bg-card flex justify-end">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enroll Student Dialog */}
      <StudentAddDialog
        isOpen={isEnrollStudentOpen}
        onClose={() => setIsEnrollStudentOpen(false)}
        classNameTitle={cls.name}
        sections={sections}
        defaultSectionId={currentSection?.id}
        onSubmit={async (sectionId, data) => {
          await onAddStudent(sectionId, data);
        }}
        isLoading={isAddingStudent}
      />

      {/* Add Section Dialog */}
      <SectionAddDialog
        cls={cls}
        tenantId={tenantId}
        isOpen={isAddSectionOpen}
        onClose={() => setIsAddSectionOpen(false)}
        onConfirm={async (classId) => {
          await onAddSection(classId);
        }}
        isLoading={isAddingSection}
      />

      {/* Subject Delete Confirmation Dialog */}
      <Dialog
        open={!!subjectToDelete}
        onOpenChange={(open) => !open && setSubjectToDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-destructive/15 text-destructive flex items-center justify-center mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-foreground">
              Delete Subject
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to remove{' '}
              <span className="font-semibold text-foreground">{subjectToDelete?.name}</span>{' '}
              {subjectToDelete?.code ? `(${subjectToDelete.code})` : ''} from{' '}
              <span className="font-semibold text-foreground">{cls.name}</span>?
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-destructive">Notice:</p>
            <p className="text-[11px]">
              This will remove this subject from the class curriculum and revoke any associated teacher subject assignments.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSubjectToDelete(null)}
              disabled={deleteSubjectMutation.isPending}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={async () => {
                if (subjectToDelete) {
                  await handleDeleteSubject(subjectToDelete.id);
                  setSubjectToDelete(null);
                }
              }}
              disabled={deleteSubjectMutation.isPending}
              className="text-xs"
            >
              {deleteSubjectMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Section Delete Confirmation Dialog */}
      <Dialog
        open={!!sectionToDelete}
        onOpenChange={(open) => !open && setSectionToDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-destructive/15 text-destructive flex items-center justify-center mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-foreground">
              Delete Section: {sectionToDelete?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to permanently delete Section{' '}
              <span className="font-semibold text-foreground">{sectionToDelete?.name}</span> from{' '}
              <span className="font-semibold text-foreground">{cls.name}</span>?
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-xs text-muted-foreground space-y-2">
            <p className="font-semibold text-destructive">Deletion Notice:</p>
            <ul className="list-disc pl-4 space-y-1 text-[11px]">
              <li>
                This section currently has{' '}
                <span className="font-semibold text-foreground">
                  {sectionToDelete ? cls.students.filter((s) => s.section_id === sectionToDelete.id).length : 0}
                </span>{' '}
                enrolled student(s).
              </li>
              <li>Students enrolled in this section will be unassigned from this section roster.</li>
              <li>This action cannot be undone.</li>
            </ul>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSectionToDelete(null)}
              disabled={deleteSectionMutation.isPending}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={async () => {
                if (sectionToDelete) {
                  await handleDeleteSection(sectionToDelete.id);
                  if (selectedSectionId === sectionToDelete.id) {
                    setSelectedSectionId('');
                  }
                  setSectionToDelete(null);
                }
              }}
              disabled={deleteSectionMutation.isPending}
              className="text-xs"
            >
              {deleteSectionMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
