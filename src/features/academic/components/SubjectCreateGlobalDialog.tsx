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
import { BookOpen, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { ClassWithDetails, SubjectCreateDTO } from '../types';

interface SubjectCreateGlobalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassWithDetails[];
  defaultClassId?: string;
  onSubmit: (classId: string, data: SubjectCreateDTO) => Promise<any>;
  isLoading: boolean;
}

export const SubjectCreateGlobalDialog: React.FC<SubjectCreateGlobalDialogProps> = ({
  isOpen,
  onClose,
  classes,
  defaultClassId,
  onSubmit,
  isLoading,
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>(
    defaultClassId || classes[0]?.id || ''
  );
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Subject name is required');
      return;
    }
    const targetClass = selectedClassId || classes[0]?.id;
    if (!targetClass) {
      toast.error('No class available to assign subject to');
      return;
    }

    try {
      await onSubmit(targetClass, {
        name: name.trim(),
        code: code.trim().toUpperCase() || undefined,
      });
      setName('');
      setCode('');
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
              <BookOpen className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-foreground">
              Add Curriculum Subject
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Register a course or subject into an academic grade curriculum.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-4">
            {/* Target Class Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Target Class <span className="text-destructive">*</span>
              </Label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                disabled={isLoading}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.subjects.length} current subjects)
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Name */}
            <div className="space-y-1.5">
              <Label htmlFor="subject-name" className="text-xs font-semibold text-foreground">
                Subject Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="subject-name"
                placeholder="e.g. Mathematics, English, Science"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                required
                className="h-9 text-xs"
              />
            </div>

            {/* Subject Code */}
            <div className="space-y-1.5">
              <Label htmlFor="subject-code" className="text-xs font-semibold text-foreground">
                Subject Code <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
              </Label>
              <Input
                id="subject-code"
                placeholder="e.g. MTH-101, ENG-09"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                disabled={isLoading}
                className="h-9 text-xs font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Official code identifier used for report cards and grading systems.
              </p>
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
              disabled={isLoading || !name.trim() || !selectedClassId}
              className="text-xs gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              {isLoading ? 'Adding...' : 'Add Subject'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
