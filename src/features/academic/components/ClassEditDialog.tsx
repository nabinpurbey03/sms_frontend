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
import { toast } from 'sonner';
import type { AcademicClass, ClassUpdateDTO } from '../types';

interface ClassEditDialogProps {
  cls: AcademicClass | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (classId: string, data: ClassUpdateDTO) => Promise<any>;
  isLoading: boolean;
}

export const ClassEditDialog: React.FC<ClassEditDialogProps> = ({
  cls,
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}) => {
  if (!cls) return null;

  return (
    <ClassEditForm
      cls={cls}
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={onSubmit}
      isLoading={isLoading}
    />
  );
};

const ClassEditForm: React.FC<ClassEditDialogProps & { cls: AcademicClass }> = ({
  cls,
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const [name, setName] = useState(cls.name);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Class name is required');
      return;
    }

    try {
      await onSubmit(cls.id, { name: name.trim() });
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
            <DialogTitle className="text-lg font-bold">Rename Class</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update the display name for this academic level.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5 py-1">
            <Label htmlFor="editClassName" className="text-xs font-semibold">
              Class Name *
            </Label>
            <Input
              id="editClassName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Grade 10 - Advanced"
              className="h-9 text-xs"
              required
            />
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
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
