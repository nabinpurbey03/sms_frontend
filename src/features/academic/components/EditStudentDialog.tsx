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
import { UserCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useUpdateStudent } from '../hooks';
import type { AcademicStudent } from '../types';

interface EditStudentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  student: AcademicStudent | null;
  classId: string;
  sectionId: string;
  tenantId: string;
}

export const EditStudentDialog: React.FC<EditStudentDialogProps> = ({
  isOpen,
  onClose,
  student,
  classId,
  sectionId,
  tenantId,
}) => {
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');

  const updateStudentMutation = useUpdateStudent();

  useEffect(() => {
    if (student) {
      setFirstName(student.first_name || '');
      setMiddleName(student.middle_name || '');
      setLastName(student.last_name || '');
    }
  }, [student, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;

    const trimmedFirst = firstName.trim();
    const trimmedMiddle = middleName.trim();
    const trimmedLast = lastName.trim();

    if (!trimmedFirst) {
      toast.error('First name is required');
      return;
    }
    if (!trimmedLast) {
      toast.error('Last name is required');
      return;
    }

    try {
      await updateStudentMutation.mutateAsync({
        tenantId,
        classId,
        sectionId,
        studentId: student.id,
        data: {
          first_name: trimmedFirst,
          middle_name: trimmedMiddle || null,
          last_name: trimmedLast,
        },
      });
      onClose();
    } catch {
      // Handled in mutation hook toast
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-2xs">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
                Edit Student Name
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                Update official name records for this student.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-first-name" className="text-xs font-semibold">
              First Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-first-name"
              placeholder="e.g., Aarav"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="h-9 text-xs"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-middle-name" className="text-xs font-semibold">
              Middle Name <span className="text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <Input
              id="edit-middle-name"
              placeholder="e.g., Kumar"
              value={middleName}
              onChange={(e) => setMiddleName(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-last-name" className="text-xs font-semibold">
              Last Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-last-name"
              placeholder="e.g., Sharma"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="h-9 text-xs"
            />
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={updateStudentMutation.isPending}
              className="h-9 text-xs font-medium cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={updateStudentMutation.isPending}
              className="h-9 text-xs font-semibold gap-1.5 shadow-2xs cursor-pointer"
            >
              {updateStudentMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
