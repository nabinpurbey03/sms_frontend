import React, { useState } from 'react';
import {
  Bell,
  BookOpen,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  Megaphone,
  CalendarDays,
  CheckSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  useSectionNotices,
  useCreateSectionNotice,
  useDeleteSectionNotice,
} from '../hooks';
import type { AcademicSection, SectionNoticeType } from '../types';

interface SectionNoticeboardTabProps {
  tenantId: string;
  classId: string;
  className: string;
  currentSection: AcademicSection | null;
  allSections: AcademicSection[];
  canPostNotice: boolean;
  currentUserId?: string;
  isAdmin: boolean;
}

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; color: string; badgeClass: string }
> = {
  HOMEWORK: {
    label: 'Daily Homework',
    icon: <BookOpen className="w-3.5 h-3.5" />,
    color: 'amber',
    badgeClass:
      'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  },
  ANNOUNCEMENT: {
    label: 'Announcement',
    icon: <Megaphone className="w-3.5 h-3.5" />,
    color: 'indigo',
    badgeClass:
      'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20',
  },
  REMINDER: {
    label: 'Reminder',
    icon: <Clock className="w-3.5 h-3.5" />,
    color: 'sky',
    badgeClass:
      'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  },
  EVENT: {
    label: 'Event / Activity',
    icon: <CalendarDays className="w-3.5 h-3.5" />,
    color: 'emerald',
    badgeClass:
      'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  },
};

export const SectionNoticeboardTab: React.FC<SectionNoticeboardTabProps> = ({
  tenantId,
  classId,
  className,
  currentSection,
  allSections,
  canPostNotice,
  currentUserId,
  isAdmin,
}) => {
  const sectionId = currentSection?.id || 'all';
  const { data: notices = [], isLoading } = useSectionNotices(tenantId, classId, sectionId);
  const createNoticeMutation = useCreateSectionNotice();
  const deleteNoticeMutation = useDeleteSectionNotice();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('ALL');

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [noticeType, setNoticeType] = useState<SectionNoticeType>('HOMEWORK');
  const [targetSectionId, setTargetSectionId] = useState<string>(currentSection?.id || 'all');
  const [dueDate, setDueDate] = useState('');

  const handleOpenCreate = () => {
    setTitle('');
    setContent('');
    setNoticeType('HOMEWORK');
    setTargetSectionId(currentSection?.id || 'all');
    setDueDate('');
    setIsCreateOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    await createNoticeMutation.mutateAsync({
      tenantId,
      classId,
      sectionId: targetSectionId,
      data: {
        title: title.trim(),
        content: content.trim(),
        notice_type: noticeType,
        due_date: dueDate || undefined,
      },
    });
    setIsCreateOpen(false);
  };

  const handleDelete = async (noticeId: string) => {
    await deleteNoticeMutation.mutateAsync({
      tenantId,
      classId,
      sectionId,
      noticeId,
    });
  };

  const filteredNotices = notices.filter((n) => {
    if (filterType === 'ALL') return true;
    return n.notice_type === filterType;
  });

  return (
    <div className="space-y-4">
      {/* Action and Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1 text-xs rounded-lg font-semibold transition-colors cursor-pointer border ${
              filterType === 'ALL'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted/60 text-muted-foreground border-border/60 hover:bg-muted'
            }`}
          >
            All Updates ({notices.length})
          </button>
          {Object.entries(TYPE_CONFIG).map(([key, config]) => {
            const count = notices.filter((n) => n.notice_type === key).length;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilterType(key)}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer border flex items-center gap-1.5 ${
                  filterType === key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/60 text-muted-foreground border-border/60 hover:bg-muted'
                }`}
              >
                {config.icon}
                <span>{config.label}</span>
                {count > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-background/80 text-[10px] font-bold">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {canPostNotice && (
          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="gap-1.5 text-xs shadow-xs shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            Post Notice or Homework
          </Button>
        )}
      </div>

      {/* Notices Feed */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs">Loading classroom noticeboard...</span>
        </div>
      ) : filteredNotices.length === 0 ? (
        <div className="p-10 rounded-xl border border-dashed border-border/80 text-center space-y-2">
          <Bell className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-xs font-bold text-foreground">No Notices or Homework Posted</p>
          <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
            {canPostNotice
              ? 'Keep your students and parents informed by posting daily homework, reading assignments, or class announcements.'
              : 'There are currently no active announcements or assignments for this section.'}
          </p>
          {canPostNotice && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenCreate}
              className="gap-1.5 text-xs mt-2"
            >
              <Plus className="w-3.5 h-3.5" />
              Create First Notice
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredNotices.map((n) => {
            const config = TYPE_CONFIG[n.notice_type] || TYPE_CONFIG.ANNOUNCEMENT;
            const canDelete = isAdmin || (currentUserId && n.author_id === currentUserId);
            const isDeleting =
              deleteNoticeMutation.isPending &&
              deleteNoticeMutation.variables?.noticeId === n.id;

            return (
              <div
                key={n.id}
                className="p-4 rounded-xl bg-card border border-border/70 hover:border-border transition-all flex flex-col justify-between shadow-xs space-y-3"
              >
                {/* Top Badge bar */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${config.badgeClass}`}
                    >
                      {config.icon}
                      {config.label}
                    </span>

                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-muted text-muted-foreground border border-border/60">
                      {n.section_name ? `Sec ${n.section_name}` : 'Class-wide'}
                    </span>
                  </div>

                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(n.id)}
                      disabled={isDeleting}
                      className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer shrink-0"
                      title="Delete notice"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                    </Button>
                  )}
                </div>

                {/* Content */}
                <div className="space-y-1.5 flex-1">
                  <h4 className="text-sm font-bold text-foreground tracking-tight leading-snug">
                    {n.title}
                  </h4>
                  <p className="text-xs text-foreground/85 whitespace-pre-wrap leading-relaxed">
                    {n.content}
                  </p>
                </div>

                {/* Footer with Due Date & Author info */}
                <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <span>by</span>
                    <span className="font-semibold text-foreground">
                      {n.author_name || 'Teacher'}
                    </span>
                    <span>•</span>
                    <span>{new Date(n.created_at).toLocaleDateString()}</span>
                  </div>

                  {n.due_date && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 text-[10px]">
                      <Calendar className="w-3 h-3" />
                      Due: {new Date(n.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Post Notice Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-primary" />
              Broadcast Notice or Homework
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Send daily homework, instructions, or class reminders for {className}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-3.5 py-1">
            {/* Notice Type Selector */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Notice Type</label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    'HOMEWORK',
                    'ANNOUNCEMENT',
                    'REMINDER',
                    'EVENT',
                  ] as SectionNoticeType[]
                ).map((type) => {
                  const cfg = TYPE_CONFIG[type];
                  const isSelected = noticeType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNoticeType(type)}
                      className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary shadow-xs'
                          : 'border-border bg-card text-muted-foreground hover:border-border/80'
                      }`}
                    >
                      {cfg.icon}
                      <span>{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Section */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Target Audience</label>
              <select
                value={targetSectionId}
                onChange={(e) => setTargetSectionId(e.target.value)}
                className="w-full h-8 text-xs rounded-lg border border-border bg-background px-2.5 text-foreground focus:ring-1 focus:ring-primary focus:outline-hidden"
              >
                <option value="all">Entire Class (All Sections)</option>
                {allSections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    Section {sec.name} only
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Title</label>
              <Input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Math Chapter 5 Exercises 1-10"
                className="h-8 text-xs"
              />
            </div>

            {/* Due Date (Visible especially for Homework) */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Due Date / Deadline</span>
                <span className="text-[10px] font-normal text-muted-foreground">Optional</span>
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            {/* Content Textarea */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Details & Instructions
              </label>
              <textarea
                required
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Describe the homework assignment, submission criteria, or details for parents..."
                className="w-full text-xs rounded-lg border border-border bg-background p-2.5 text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary focus:outline-hidden resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createNoticeMutation.isPending || !title.trim() || !content.trim()}
                className="text-xs gap-1.5 shadow-xs"
              >
                {createNoticeMutation.isPending && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                Post Update
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
