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
import { BookOpen, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { ClassCreateDTO } from '../types';

interface ClassCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ClassCreateDTO) => Promise<any>;
  isLoading: boolean;
}

export const ClassCreateDialog: React.FC<ClassCreateDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Class name is required');
      return;
    }

    try {
      await onSubmit({ name: name.trim() });
      setName('');
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
              <BookOpen className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold">Create Academic Class</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define a new class level. In accordance with school policy, Section A is automatically created.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5 py-1">
            <Label htmlFor="className" className="text-xs font-semibold">
              Class Name *
            </Label>
            <Input
              id="className"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Grade 11, Playgroup, Kindergarten"
              className="h-9 text-xs"
              required
            />
          </div>

          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span>
              <strong>Auto-Provisioning:</strong> Creating this class will automatically create <strong>Section A</strong>. Future sections (B, C...) can be unlocked when Section A reaches 20 students.
            </span>
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
              {isLoading ? 'Creating...' : 'Create Class'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
