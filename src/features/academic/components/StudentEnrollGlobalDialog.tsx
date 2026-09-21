import React, { useState, useEffect } from 'react';
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
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import type { ClassWithDetails, StudentCreateDTO } from '../types';

interface StudentEnrollGlobalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassWithDetails[];
  onSubmit: (
    classId: string,
    sectionId: string,
    data: StudentCreateDTO
  ) => Promise<any>;
  isLoading: boolean;
}

export const StudentEnrollGlobalDialog: React.FC<StudentEnrollGlobalDialogProps> = ({
  isOpen,
  onClose,
  classes,
  onSubmit,
  isLoading,
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');

  const effectiveClass =
    (selectedClassId && classes.find((c) => c.id === selectedClassId)) ||
    classes[0] ||
    null;
  const effectiveClassId = effectiveClass?.id || '';

  const sections = effectiveClass?.sections || [];
  const effectiveSection =
    (selectedSectionId && sections.find((s) => s.id === selectedSectionId)) ||
    sections[0] ||
    null;
  const effectiveSectionId = effectiveSection?.id || '';

  useEffect(() => {
    if (classes.length > 0) {
      if (!selectedClassId || !classes.some((c) => c.id === selectedClassId)) {
        setSelectedClassId(classes[0].id);
      }
    }
  }, [classes, selectedClassId, isOpen]);

  useEffect(() => {
    if (sections.length > 0) {
      if (!selectedSectionId || !sections.some((s) => s.id === selectedSectionId)) {
        setSelectedSectionId(sections[0].id);
      }
    } else {
      setSelectedSectionId('');
    }
  }, [sections, selectedSectionId, isOpen]);

  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');

  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    const cls = classes.find((c) => c.id === classId);
    if (cls && cls.sections.length > 0) {
      setSelectedSectionId(cls.sections[0].id);
    } else {
      setSelectedSectionId('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('First name and last name are required');
      return;
    }
    if (!effectiveClassId || !effectiveSectionId) {
      toast.error('Please choose a class and section for enrollment.');
      return;
    }

    try {
      await onSubmit(effectiveClassId, effectiveSectionId, {
        first_name: firstName.trim(),
        middle_name: middleName.trim() || undefined,
        last_name: lastName.trim(),
      });
      setFirstName('');
      setMiddleName('');
      setLastName('');
      onClose();
    } catch {
      // error handled by mutation onError
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
              <UserPlus className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-foreground">
              Enroll New Student
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Register a student into an academic class and allocate them to an active section.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-4">
            {/* Target Class & Section */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Class <span className="text-destructive">*</span>
                </Label>
                <select
                  value={effectiveClassId}
                  onChange={(e) => handleClassChange(e.target.value)}
                  disabled={isLoading}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Section <span className="text-destructive">*</span>
                </Label>
                <select
                  value={effectiveSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  disabled={isLoading || sections.length === 0}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {sections.length === 0 ? (
                    <option value="">No sections available</option>
                  ) : (
                    sections.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        Section {sec.name} ({sec.student_count ?? 0} students)
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Student Name Stack */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="enroll-first-name" className="text-xs font-semibold text-foreground">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="enroll-first-name"
                  placeholder="e.g. Aarav"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={isLoading}
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="enroll-middle-name" className="text-xs font-semibold text-foreground">
                  Middle Name <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
                </Label>
                <Input
                  id="enroll-middle-name"
                  placeholder="e.g. Bahadur"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  disabled={isLoading}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="enroll-last-name" className="text-xs font-semibold text-foreground">
                Last Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="enroll-last-name"
                placeholder="e.g. Sharma"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={isLoading}
                required
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !firstName.trim() || !lastName.trim() || !selectedSectionId}
              className="text-xs gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {isLoading ? 'Enrolling...' : 'Enroll Student'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
