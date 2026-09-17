import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  User,
  Phone,
  Calendar,
  Sparkles,
  Trash2,
  Send,
  Loader2,
  AlertCircle,
  Award,
  HeartPulse,
  Info,
  ShieldAlert,
} from 'lucide-react';
import {
  useStudentRemarks,
  useCreateStudentRemark,
  useDeleteStudentRemark,
} from '../hooks';
import type { AcademicStudent, StudentRemarkCategory } from '../types';
import type { ParentMappingDTO } from '@/features/members/types';

interface StudentDetailDrawerProps {
  student: AcademicStudent | null;
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  className?: string;
  sectionName?: string;
  parentInfo?: ParentMappingDTO | null;
  canAddRemark: boolean;
  currentUserId?: string;
  isAdmin: boolean;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  ACADEMIC: <Award className="w-3.5 h-3.5 text-blue-500" />,
  BEHAVIORAL: <Sparkles className="w-3.5 h-3.5 text-purple-500" />,
  MEDICAL: <HeartPulse className="w-3.5 h-3.5 text-rose-500" />,
  GENERAL: <Info className="w-3.5 h-3.5 text-slate-500" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  ACADEMIC: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  BEHAVIORAL: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
  MEDICAL: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
  GENERAL: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800',
};

export const StudentDetailDrawer: React.FC<StudentDetailDrawerProps> = ({
  student,
  isOpen,
  onClose,
  tenantId,
  className,
  sectionName,
  parentInfo,
  canAddRemark,
  currentUserId,
  isAdmin,
}) => {
  const studentId = student?.id || null;
  const { data: remarks = [], isLoading: isRemarksLoading } = useStudentRemarks(tenantId, studentId);
  const createRemarkMutation = useCreateStudentRemark();
  const deleteRemarkMutation = useDeleteStudentRemark();

  const [category, setCategory] = useState<StudentRemarkCategory>('GENERAL');
  const [note, setNote] = useState('');

  if (!student) return null;

  const fullName = [student.first_name, student.middle_name, student.last_name]
    .filter(Boolean)
    .join(' ');

  const handleAddRemark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !note.trim()) return;

    await createRemarkMutation.mutateAsync({
      tenantId,
      studentId,
      data: {
        category,
        note: note.trim(),
      },
    });
    setNote('');
  };

  const handleDeleteRemark = async (remarkId: string) => {
    if (!studentId) return;
    await deleteRemarkMutation.mutateAsync({
      tenantId,
      studentId,
      remarkId,
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col h-full bg-background border-l border-border/80 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/60 bg-muted/20">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-lg shrink-0">
              {student.first_name?.[0]?.toUpperCase() || 'S'}
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <SheetTitle className="text-base font-bold text-foreground truncate">
                {fullName}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground flex items-center gap-2">
                <span>{className || 'Class'}</span>
                {sectionName && <span>• Section {sectionName}</span>}
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  {student.status}
                </span>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Body content with scrollable area */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Quick Details Cards */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-card border border-border/60 space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-primary" />
                Enrollment Status
              </span>
              <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                {student.status || 'ACTIVE'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-card border border-border/60 space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Enrolled Since
              </span>
              <p className="font-semibold text-foreground truncate">
                {student.created_at ? new Date(student.created_at).toLocaleDateString() : 'Current Session'}
              </p>
            </div>
          </div>

          {/* Parent / Guardian Card */}
          <div className="p-3.5 rounded-xl bg-card border border-border/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Parent / Guardian Contact
              </span>
              {parentInfo && (
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                  {parentInfo.relationship_type || 'Parent'}
                </span>
              )}
            </div>

            {parentInfo ? (
              <div className="space-y-1.5 text-xs pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-medium text-foreground">{parentInfo.parent_name}</span>
                </div>
                {parentInfo.parent_phone && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Phone:</span>
                    <a
                      href={`tel:${parentInfo.parent_phone}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {parentInfo.parent_phone}
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>No parent or guardian account linked yet.</span>
              </div>
            )}
          </div>

          {/* Teacher Observations & Behavioral Remarks Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold text-foreground tracking-tight uppercase">
                  Teacher Observations ({remarks.length})
                </h3>
              </div>
            </div>

            {/* Add Remark Form */}
            {canAddRemark && (
              <form
                onSubmit={handleAddRemark}
                className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-muted-foreground">Category:</span>
                  <div className="flex gap-1">
                    {(['GENERAL', 'ACADEMIC', 'BEHAVIORAL', 'MEDICAL'] as StudentRemarkCategory[]).map(
                      (cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setCategory(cat)}
                          className={`px-2 py-0.5 text-[10px] rounded-md font-semibold transition-colors cursor-pointer border ${
                            category === cat
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background text-muted-foreground border-border/60 hover:bg-muted'
                          }`}
                        >
                          {cat}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div>
                  <textarea
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Log academic progress, behavior, or health observations..."
                    className="w-full text-xs rounded-lg border border-border/80 bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary resize-none"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={createRemarkMutation.isPending || !note.trim()}
                    className="h-7 text-xs gap-1.5 shadow-xs"
                  >
                    {createRemarkMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    Log Observation
                  </Button>
                </div>
              </form>
            )}

            {/* Observation List */}
            {isRemarksLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">Loading observations...</span>
              </div>
            ) : remarks.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-border/80 text-center space-y-1">
                <ShieldAlert className="w-6 h-6 text-muted-foreground mx-auto" />
                <p className="text-xs font-medium text-foreground">No Observations Recorded</p>
                <p className="text-[11px] text-muted-foreground">
                  Teachers and admins can log notes regarding student performance and habits here.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {remarks.map((r) => {
                  const canDelete = isAdmin || (currentUserId && r.author_id === currentUserId);
                  const isDeleting =
                    deleteRemarkMutation.isPending &&
                    deleteRemarkMutation.variables?.remarkId === r.id;

                  return (
                    <div
                      key={r.id}
                      className="p-3 rounded-xl bg-card border border-border/60 hover:border-border transition-colors space-y-1.5 text-xs shadow-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${
                              CATEGORY_COLORS[r.category] || CATEGORY_COLORS.GENERAL
                            }`}
                          >
                            {CATEGORY_ICONS[r.category] || CATEGORY_ICONS.GENERAL}
                            {r.category}
                          </span>
                          <span className="text-[10px] font-medium text-muted-foreground">
                            by {r.author_name || 'Teacher'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(r.created_at).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteRemark(r.id)}
                              disabled={isDeleting}
                              className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                              title="Delete observation"
                            >
                              {isDeleting ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                        {r.note}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
