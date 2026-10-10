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
import { BookOpen, Loader2 } from 'lucide-react';
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
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mb-1 shadow-2xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold tracking-tight text-foreground">Rename Class</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
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
              type="submit"
              disabled={isLoading}
              className="h-9 text-xs font-semibold gap-1.5 shadow-2xs cursor-pointer"
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isLoading ? 'Saving...' : 'Save Changes'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
