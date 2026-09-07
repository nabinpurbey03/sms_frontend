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
import { Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import type { AcademicSubject } from '../types';

interface SubjectEditDialogProps {
  subject: (AcademicSubject & { className?: string }) | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    classId: string,
    subjectId: string,
    data: { name: string; code?: string }
  ) => Promise<any>;
  isLoading: boolean;
}

const SubjectEditForm: React.FC<{
  subject: AcademicSubject & { className?: string };
  onClose: () => void;
  onSubmit: (
    classId: string,
    subjectId: string,
    data: { name: string; code?: string }
  ) => Promise<any>;
  isLoading: boolean;
}> = ({ subject, onClose, onSubmit, isLoading }) => {
  const [name, setName] = useState(subject.name);
  const [code, setCode] = useState(subject.code || '');

  if (!subject) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Subject name is required');
      return;
    }

    try {
      await onSubmit(subject.class_id, subject.id, {
        name: name.trim(),
        code: code.trim().toUpperCase() || undefined,
      });
      onClose();
    } catch {
      // handled by mutation onError
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
              <Edit2 className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-foreground">
              Edit Curriculum Subject
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Update title or code for this subject in{' '}
              <span className="font-semibold text-foreground">{subject.className || 'class'}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-subject-name" className="text-xs font-semibold text-foreground">
                Subject Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-subject-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-subject-code" className="text-xs font-semibold text-foreground">
                Subject Code
              </Label>
              <Input
                id="edit-subject-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                disabled={isLoading}
                placeholder="e.g. SCI-10"
                className="h-9 text-xs font-mono"
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
              disabled={isLoading || !name.trim()}
              className="text-xs font-semibold"
            >
              {isLoading ? 'Saving Changes...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
  );
};

export const SubjectEditDialog: React.FC<SubjectEditDialogProps> = ({
  subject,
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}) => {
  if (!subject) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SubjectEditForm
        key={subject.id}
        subject={subject}
        onClose={onClose}
        onSubmit={onSubmit}
        isLoading={isLoading}
      />
    </Dialog>
  );
};
