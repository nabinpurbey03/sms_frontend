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
import type { AcademicSubject } from '../types';

interface SubjectDeleteDialogProps {
  subject: (AcademicSubject & { className?: string }) | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<any>;
  isLoading: boolean;
}

export const SubjectDeleteDialog: React.FC<SubjectDeleteDialogProps> = ({
  subject,
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}) => {
  if (!subject) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-10 h-10 rounded-full bg-destructive/15 text-destructive flex items-center justify-center mb-2">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <DialogTitle className="text-lg font-bold text-foreground">
            Delete Subject
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Are you sure you want to permanently remove{' '}
            <span className="font-semibold text-foreground">{subject.name}</span>
            {subject.code ? ` (${subject.code})` : ''} from{' '}
            <span className="font-semibold text-foreground">
              {subject.className || 'this class'}
            </span>
            ?
          </DialogDescription>
        </DialogHeader>

        <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-xs text-muted-foreground space-y-1.5">
          <p className="font-semibold text-destructive flex items-center gap-1.5">
            Deletion Consequences:
          </p>
          <ul className="list-disc pl-4 space-y-1 text-[11px]">
            <li>This subject will be removed from the class curriculum roster.</li>
            <li>Any teacher subject assignments tied to this subject will be revoked.</li>
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
            {isLoading ? 'Deleting...' : 'Confirm Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
