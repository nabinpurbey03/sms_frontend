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
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import type { AcademicSection, StudentCreateDTO } from '../types';

interface StudentAddDialogProps {
  isOpen: boolean;
  onClose: () => void;
  classNameTitle: string;
  sections: AcademicSection[];
  defaultSectionId?: string;
  onSubmit: (sectionId: string, data: StudentCreateDTO) => Promise<any>;
  isLoading: boolean;
}

export const StudentAddDialog: React.FC<StudentAddDialogProps> = ({
  isOpen,
  onClose,
  classNameTitle,
  sections,
  defaultSectionId,
  onSubmit,
  isLoading,
}) => {
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [sectionId, setSectionId] = useState(defaultSectionId || (sections[0]?.id ?? ''));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('First name and last name are required');
      return;
    }
    const targetSection = sectionId || sections[0]?.id;
    if (!targetSection) {
      toast.error('No section available in this class');
      return;
    }

    try {
      await onSubmit(targetSection, {
        first_name: firstName.trim(),
        middle_name: middleName.trim() || undefined,
        last_name: lastName.trim(),
      });
      setFirstName('');
      setMiddleName('');
      setLastName('');
      onClose();
    } catch {
      // Handled by hook toast
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-1">
              <UserPlus className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold">Enroll Student in {classNameTitle}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add an enrolled student to an active section roster.
            </DialogDescription>
          </DialogHeader>

          {/* Section Picker if multiple */}
          {sections.length > 1 && (
            <div className="space-y-1.5">
              <Label htmlFor="secSelect" className="text-xs font-semibold">
                Select Section *
              </Label>
              <select
                id="secSelect"
                value={sectionId || defaultSectionId}
                onChange={(e) => setSectionId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                required
              >
                {sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    Section {sec.name} ({sec.student_count ?? 0} students)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Student Names */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="space-y-1">
              <Label htmlFor="sFirstName" className="text-xs font-medium">
                First Name *
              </Label>
              <Input
                id="sFirstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Aarav"
                className="h-9 text-xs"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sMiddleName" className="text-xs font-medium">
                Middle Name
              </Label>
              <Input
                id="sMiddleName"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                placeholder="e.g. B."
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sLastName" className="text-xs font-medium">
                Last Name *
              </Label>
              <Input
                id="sLastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Sharma"
                className="h-9 text-xs"
                required
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
            <Button type="submit" disabled={isLoading} className="text-xs">
              {isLoading ? 'Enrolling...' : 'Enroll Student'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
