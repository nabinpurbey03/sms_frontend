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
import { Label } from '@/components/ui/label';
import { BookOpen, UserCheck, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { useMembers } from '@/features/members/hooks';
import { useAssignClassTeacher, useAssignSubjectTeacher } from '../hooks';
import type { ClassWithDetails } from '../types';

interface AssignTeacherDialogProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassWithDetails[];
  tenantId: string | null;
  initialMode?: 'subject' | 'class_teacher';
  defaultClassId?: string;
  defaultSubjectId?: string;
}

export const AssignTeacherDialog: React.FC<AssignTeacherDialogProps> = ({
  isOpen,
  onClose,
  classes,
  tenantId,
  initialMode = 'subject',
  defaultClassId,
  defaultSubjectId,
}) => {
  const [mode, setMode] = useState<'subject' | 'class_teacher'>(initialMode);
  const [selectedClassId, setSelectedClassId] = useState<string>(
    () => defaultClassId || classes[0]?.id || ''
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(() => {
    const cls = classes.find((c) => c.id === (defaultClassId || classes[0]?.id));
    return defaultSubjectId || cls?.subjects[0]?.id || '';
  });
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [teacherSource, setTeacherSource] = useState<'roster' | 'phone'>('roster');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [teacherPhone, setTeacherPhone] = useState<string>('');

  const { data: members = [] } = useMembers(tenantId, 'TEACHER');
  const teachers = members.filter((m) => m.roles.includes('TEACHER'));

  const assignClassTeacherMutation = useAssignClassTeacher();
  const assignSubjectTeacherMutation = useAssignSubjectTeacher();

  const isSubmitting =
    assignClassTeacherMutation.isPending || assignSubjectTeacherMutation.isPending;

  // When selected class changes, update subject & section options
  const currentClass = classes.find((c) => c.id === selectedClassId);
  const subjects = currentClass?.subjects || [];
  const sections = currentClass?.sections || [];

  const handleClassChange = (clsId: string) => {
    setSelectedClassId(clsId);
    const cls = classes.find((c) => c.id === clsId);
    setSelectedSubjectId(cls?.subjects[0]?.id || '');
    setSelectedSectionId('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    if (!selectedClassId) {
      toast.error('Please select a class');
      return;
    }

    if (mode === 'subject' && !selectedSubjectId) {
      toast.error('Please select a subject');
      return;
    }

    if (teacherSource === 'roster' && !selectedTeacherId) {
      toast.error('Please select a teacher from the roster');
      return;
    }

    if (teacherSource === 'phone') {
      const cleanPhone = teacherPhone.trim().replace(/[^0-9]/g, '');
      if (cleanPhone.length < 10) {
        toast.error('Please enter a valid 10-digit mobile number');
        return;
      }
    }

    const payload = {
      teacher_id: teacherSource === 'roster' ? selectedTeacherId : undefined,
      teacher_phone: teacherSource === 'phone' ? teacherPhone.trim() : undefined,
      section_id: mode === 'class_teacher' ? (selectedSectionId || undefined) : undefined,
    };

    try {
      if (mode === 'class_teacher') {
        await assignClassTeacherMutation.mutateAsync({
          tenantId,
          classId: selectedClassId,
          data: payload,
        });
      } else {
        await assignSubjectTeacherMutation.mutateAsync({
          tenantId,
          classId: selectedClassId,
          subjectId: selectedSubjectId,
          data: payload,
        });
      }
      onClose();
    } catch {
      // Handled in mutation onError
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              {mode === 'class_teacher' ? (
                <UserCheck className="w-5 h-5" />
              ) : (
                <BookOpen className="w-5 h-5" />
              )}
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                {mode === 'class_teacher' ? 'Appoint Class Teacher' : 'Assign Subject Teacher'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {mode === 'class_teacher'
                  ? 'Set the primary teacher responsible for a class or section.'
                  : 'Assign an instructor to teach a specific subject.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-muted rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode('subject')}
            className={`py-1.5 rounded-lg transition-all ${
              mode === 'subject'
                ? 'bg-card text-foreground shadow-xs font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Subject Teacher
          </button>
          <button
            type="button"
            onClick={() => setMode('class_teacher')}
            className={`py-1.5 rounded-lg transition-all ${
              mode === 'class_teacher'
                ? 'bg-card text-foreground shadow-xs font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Class Teacher
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Class Select */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Target Class</Label>
            <select
              value={selectedClassId}
              onChange={(e) => handleClassChange(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section Select */}
          {mode === 'class_teacher' ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Section (Optional)</Label>
                <span className="text-[10px] text-muted-foreground">Applies to all if unselected</span>
              </div>
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All Sections / Entire Class</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    Section {s.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60 text-xs text-muted-foreground flex items-center justify-between">
              <span>Section Scope:</span>
              <span className="font-semibold text-foreground">All Sections (Class-Wide)</span>
            </div>
          )}

          {/* Subject Select (Only in Subject Teacher mode) */}
          {mode === 'subject' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Subject</Label>
              {subjects.length === 0 ? (
                <p className="text-xs text-amber-500 font-medium">
                  No subjects created for this class yet. Add subjects in the Subjects tab first.
                </p>
              ) : (
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.code ? `(${s.code})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Teacher Selection Source Toggle */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Teacher</Label>
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setTeacherSource('roster')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    teacherSource === 'roster'
                      ? 'bg-primary/10 text-primary font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  From Faculty Roster
                </button>
                <span className="text-muted-foreground">·</span>
                <button
                  type="button"
                  onClick={() => setTeacherSource('phone')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    teacherSource === 'phone'
                      ? 'bg-primary/10 text-primary font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  By Mobile No
                </button>
              </div>
            </div>

            {teacherSource === 'roster' ? (
              teachers.length === 0 ? (
                <div className="p-3 rounded-lg border border-dashed text-xs text-muted-foreground">
                  No registered teachers found in this school. You can invite teachers in Members or assign by mobile number.
                </div>
              ) : (
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="" disabled>
                    Select a faculty teacher...
                  </option>
                  {teachers.map((t) => (
                    <option key={t.user_id} value={t.user_id}>
                      {t.first_name} {t.last_name} ({t.email})
                    </option>
                  ))}
                </select>
              )
            ) : (
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="tel"
                  placeholder="10-digit phone (e.g. 9841234567)"
                  value={teacherPhone}
                  onChange={(e) => setTeacherPhone(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || (mode === 'subject' && subjects.length === 0)}
              className="gap-2"
            >
              {mode === 'class_teacher' ? (
                <UserCheck className="w-4 h-4" />
              ) : (
                <BookOpen className="w-4 h-4" />
              )}
              {isSubmitting
                ? 'Saving...'
                : mode === 'class_teacher'
                ? 'Appoint Class Teacher'
                : 'Assign Subject Teacher'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
