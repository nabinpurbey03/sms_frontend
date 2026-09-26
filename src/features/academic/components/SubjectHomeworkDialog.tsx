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
import { NepaliDatePicker } from '@/components/ui/nepali-date-picker';
import { Bell, Calendar, BookOpen, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateSectionNotice } from '../hooks';
import type { ClassWithDetails, AcademicSubject, SectionNoticeType } from '../types';

export type EnrichedSubject = AcademicSubject & {
  className: string;
};

interface SubjectHomeworkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  subject: EnrichedSubject | null;
  classes: ClassWithDetails[];
}

export const SubjectHomeworkDialog: React.FC<SubjectHomeworkDialogProps> = ({
  isOpen,
  onClose,
  tenantId,
  subject,
  classes,
}) => {
  const createNoticeMutation = useCreateSectionNotice();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [noticeType, setNoticeType] = useState<SectionNoticeType>('HOMEWORK');
  const [targetSectionId, setTargetSectionId] = useState<string>('all');
  const [dueDate, setDueDate] = useState('');

  // Target class details
  const targetClass = classes.find((c) => c.id === subject?.class_id);
  const sections = targetClass?.sections || [];

  useEffect(() => {
    if (subject && isOpen) {
      setTitle(`[${subject.name}] Homework: `);
      setContent('');
      setNoticeType('HOMEWORK');
      setTargetSectionId('all');
      setDueDate('');
    }
  }, [subject, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !tenantId) return;

    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!content.trim()) {
      toast.error('Homework details or instructions are required');
      return;
    }

    try {
      await createNoticeMutation.mutateAsync({
        tenantId,
        classId: subject.class_id,
        sectionId: targetSectionId,
        data: {
          title: title.trim(),
          content: content.trim(),
          notice_type: noticeType,
          due_date: dueDate ? dueDate : undefined,
        },
      });

      toast.success('Homework Posted Successfully', {
        description: `Broadcasted to ${subject.className} noticeboard.`,
      });
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to post homework');
    }
  };

  if (!subject) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Post Subject Homework / Notice
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Publish homework or updates for <strong>{subject.name}</strong> ({subject.className}).
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-1">
          {/* Target Section */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Target Classroom Section</Label>
            <select
              value={targetSectionId}
              onChange={(e) => setTargetSectionId(e.target.value)}
              className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Sections ({subject.className})</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  Section {s.name}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground">
              Select &quot;All Sections&quot; or target a specific cohort.
            </p>
          </div>

          {/* Notice Type & Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Activity Type</Label>
              <select
                value={noticeType}
                onChange={(e) => setNoticeType(e.target.value as SectionNoticeType)}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="HOMEWORK">Homework</option>
                <option value="ANNOUNCEMENT">Announcement</option>
                <option value="EXAM">Exam / Quiz Notice</option>
                <option value="URGENT">Urgent Alert</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <NepaliDatePicker
                id="subject-due-date"
                label="Due Date (Optional)"
                value={dueDate}
                onChange={(val) => setDueDate(val)}
                size="sm"
              />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Notice Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. [Mathematics] Chapter 4 Problem Set"
              className="h-9 text-xs"
              required
            />
          </div>

          {/* Content / Homework Instructions */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Instructions / Description</Label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Describe assignment tasks, submission instructions, or textbook page numbers..."
              rows={4}
              className="w-full rounded-lg border border-input bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              required
            />
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={createNoticeMutation.isPending}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createNoticeMutation.isPending || !title.trim() || !content.trim()}
              className="gap-1.5 text-xs"
            >
              {createNoticeMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Broadcast Homework
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
