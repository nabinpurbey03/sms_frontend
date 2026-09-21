import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowRightLeft, Loader2, ArrowRight, AlertCircle, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useUpdateStudent } from '../hooks';
import type { AcademicStudent, ClassWithDetails } from '../types';

interface ChangeStudentSectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  student: AcademicStudent | null;
  cls: ClassWithDetails;
  currentSectionId: string;
  tenantId: string;
}

export const ChangeStudentSectionDialog: React.FC<ChangeStudentSectionDialogProps> = ({
  isOpen,
  onClose,
  student,
  cls,
  currentSectionId,
  tenantId,
}) => {
  const [targetSectionId, setTargetSectionId] = useState<string>('');
  const updateStudentMutation = useUpdateStudent();

  const sections = cls.sections || [];
  const currentSection = sections.find((s) => s.id === currentSectionId);

  // Available target sections (excluding the current one)
  const availableTargetSections = useMemo(() => {
    return sections.filter((s) => s.id !== currentSectionId);
  }, [sections, currentSectionId]);

  // Section student counts to show capacity
  const sectionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of sections) counts.set(s.id, 0);
    for (const st of cls.students || []) {
      if (st.section_id && counts.has(st.section_id)) {
        counts.set(st.section_id, (counts.get(st.section_id) || 0) + 1);
      }
    }
    return counts;
  }, [sections, cls.students]);

  useEffect(() => {
    if (availableTargetSections.length > 0) {
      setTargetSectionId(availableTargetSections[0].id);
    } else {
      setTargetSectionId('');
    }
  }, [availableTargetSections, isOpen]);

  if (!student) return null;

  const studentFullName = [student.first_name, student.middle_name, student.last_name]
    .filter(Boolean)
    .join(' ');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSectionId) {
      toast.error('Please select a target section');
      return;
    }

    const targetSection = sections.find((s) => s.id === targetSectionId);

    try {
      await updateStudentMutation.mutateAsync({
        tenantId,
        classId: cls.id,
        sectionId: currentSectionId,
        studentId: student.id,
        data: {
          target_section_id: targetSectionId,
        },
      });
      toast.success('Section Changed', {
        description: `${studentFullName} has been moved to Section ${targetSection?.name || ''}.`,
      });
      onClose();
    } catch {
      // Handled in mutation hook
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Change Student Section
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Move {studentFullName} to a different section in {cls.name}.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {availableTargetSections.length === 0 ? (
          <div className="py-6 px-4 text-center space-y-2">
            <div className="p-2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 w-fit mx-auto">
              <AlertCircle className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-foreground">
              No Other Sections Available
            </p>
            <p className="text-[11px] text-muted-foreground">
              {cls.name} currently only has Section {currentSection?.name || 'A'}. Add another section to enable student transfers.
            </p>
            <div className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* Transfer Visual Card */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/60">
              <div className="space-y-0.5">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Current Section
                </span>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-xs font-bold px-2 py-0.5 bg-background">
                    Section {currentSection?.name || 'Unassigned'}
                  </Badge>
                </div>
              </div>

              <div className="p-1.5 rounded-full bg-muted text-muted-foreground">
                <ArrowRight className="w-4 h-4" />
              </div>

              <div className="space-y-0.5 text-right">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Target Section
                </span>
                <div>
                  <Badge variant="purple" className="text-xs font-bold px-2 py-0.5">
                    Section {sections.find((s) => s.id === targetSectionId)?.name || '...'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Target Section Selection */}
            <div className="space-y-1.5">
              <Label htmlFor="target-section" className="text-xs font-semibold">
                Select Destination Section <span className="text-destructive">*</span>
              </Label>
              <select
                id="target-section"
                value={targetSectionId}
                onChange={(e) => setTargetSectionId(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                {availableTargetSections.map((sec) => {
                  const count = sectionCounts.get(sec.id) || 0;
                  return (
                    <option key={sec.id} value={sec.id}>
                      Section {sec.name} ({count} / 20 students currently)
                    </option>
                  );
                })}
              </select>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span>
                  The student will immediately appear in the new section's attendance & grade rosters.
                </span>
              </p>
            </div>

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={updateStudentMutation.isPending}
                className="h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={updateStudentMutation.isPending || !targetSectionId}
                className="h-9 text-xs gap-1.5"
              >
                {updateStudentMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Transferring...
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    Change Section
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
