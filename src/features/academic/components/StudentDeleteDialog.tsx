import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import type { AcademicStudent } from '../types';

interface StudentDeleteDialogProps {
  student: (AcademicStudent & { className?: string; sectionName?: string }) | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<any>;
  isLoading: boolean;
}

export const StudentDeleteDialog: React.FC<StudentDeleteDialogProps> = ({
  student,
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}) => {
  if (!student) return null;

  const fullName = [student.first_name, student.middle_name, student.last_name]
    .filter(Boolean)
    .join(' ');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-10 h-10 rounded-full bg-destructive/15 text-destructive flex items-center justify-center mb-2">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <DialogTitle className="text-lg font-bold text-foreground">
            Remove Student from Roster
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Are you sure you want to permanently remove{' '}
            <span className="font-semibold text-foreground">{fullName}</span> from{' '}
            <span className="font-semibold text-foreground">
              {student.className || 'this class'}
              {student.sectionName ? ` (Section ${student.sectionName})` : ''}
            </span>
            ?
          </DialogDescription>
        </DialogHeader>

        <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-xs text-muted-foreground space-y-1.5">
          <p className="font-semibold text-destructive flex items-center gap-1.5">
            Notice of Deletion:
          </p>
          <ul className="list-disc pl-4 space-y-1 text-[11px]">
            <li>The student will be unenrolled from their current class and section roster.</li>
            <li>Section capacity count will decrease accordingly.</li>
            <li>This action cannot be undone.</li>
          </ul>
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
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
            className="text-xs"
          >
            {isLoading ? 'Removing...' : 'Confirm Remove'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
