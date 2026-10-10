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
import { AlertTriangle, Loader2 } from 'lucide-react';
import type { AcademicClass } from '../types';

interface ClassDeleteDialogProps {
  cls: AcademicClass | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (classId: string, hard: boolean) => Promise<any>;
  isLoading: boolean;
  canHardDelete: boolean;
}

export const ClassDeleteDialog: React.FC<ClassDeleteDialogProps> = ({
  cls,
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  canHardDelete,
}) => {
  const [hardDelete, setHardDelete] = useState(false);

  if (!cls) return null;

  const handleConfirm = async () => {
    await onConfirm(cls.id, hardDelete);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center mb-1 shadow-2xs">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
            Delete Class: {cls.name}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Are you sure you want to delete <span className="font-semibold text-foreground">{cls.name}</span>?
            This will impact all associated sections, subject mappings, and student rosters.
          </DialogDescription>
        </DialogHeader>

        <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-xs text-muted-foreground space-y-2">
          <p className="font-semibold text-destructive">Deletion Impact:</p>
          <ul className="list-disc pl-4 space-y-1 text-[11px]">
            <li>Sections and students under {cls.name} will be removed from active view.</li>
            <li>Teacher assignments for this class will be revoked.</li>
          </ul>

          {canHardDelete && (
            <label className="flex items-center gap-2 pt-2 border-t border-destructive/20 text-foreground cursor-pointer font-medium text-xs">
              <input
                type="checkbox"
                checked={hardDelete}
                onChange={(e) => setHardDelete(e.target.checked)}
                className="rounded border-destructive/40 text-destructive focus:ring-destructive"
              />
              <span>Permanently Hard Delete (Cascade database purge)</span>
            </label>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2 border-t border-border/50">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="h-9 text-xs font-medium cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
            className="h-9 text-xs font-semibold gap-1.5 shadow-2xs cursor-pointer"
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isLoading ? 'Deleting...' : 'Confirm Deletion'}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
