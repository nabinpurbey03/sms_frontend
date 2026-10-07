import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Trash2, ShieldAlert, AlertCircle, Info, Loader2 } from 'lucide-react';
import { useEmptySections, useCleanupEmptySections } from '../hooks';
import type { EmptySectionResponse } from '../types';
import { toast } from 'sonner';

export interface EmptySectionsCleanupModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string | null;
}

export interface GroupedClassSections {
  class_id: string;
  class_name: string;
  sections: EmptySectionResponse[];
}

export function groupEmptySectionsByClass(
  emptySections: EmptySectionResponse[] | null | undefined
): GroupedClassSections[] {
  if (!emptySections || !Array.isArray(emptySections)) return [];
  const map = new Map<string, GroupedClassSections>();

  for (const s of emptySections) {
    const classId = s.class_id;
    if (!map.has(classId)) {
      map.set(classId, {
        class_id: s.class_id,
        class_name: s.class_name,
        sections: [],
      });
    }
    map.get(classId)!.sections.push(s);
  }

  return Array.from(map.values()).sort((a, b) => a.class_name.localeCompare(b.class_name));
}

export function filterDeletableEmptySections(
  emptySections: EmptySectionResponse[] | null | undefined
): EmptySectionResponse[] {
  if (!emptySections || !Array.isArray(emptySections)) return [];
  return emptySections.filter((s) => s.can_delete);
}

export function isSectionADefault(section: EmptySectionResponse): boolean {
  return (
    section.section_name?.trim().toUpperCase() === 'A' ||
    section.can_delete === false
  );
}

export function getSectionResolutionMeta(section: EmptySectionResponse) {
  const isSectionA = isSectionADefault(section);
  if (isSectionA) {
    return {
      canDelete: false,
      badgeText: 'Required · Default Section',
      noticeText: "Section 'A' is required and cannot be deleted. Please assign or enroll students into this section.",
    };
  }
  return {
    canDelete: true,
    badgeText: 'Empty · Deletable',
    noticeText: null,
  };
}

export function computeBulkDeleteCount(
  emptySections: EmptySectionResponse[] | null | undefined
): number {
  return filterDeletableEmptySections(emptySections).length;
}

export const EmptySectionsCleanupModal: React.FC<EmptySectionsCleanupModalProps> = ({
  isOpen,
  onClose,
  tenantId,
}) => {
  const { data: emptySections = [], isLoading, isRefetching } = useEmptySections(
    tenantId,
    undefined,
    { enabled: isOpen && !!tenantId }
  );

  const cleanupMutation = useCleanupEmptySections();

  // Confirmation states
  const [sectionToDelete, setSectionToDelete] = useState<EmptySectionResponse | null>(null);
  const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false);

  const grouped = useMemo(() => groupEmptySectionsByClass(emptySections), [emptySections]);
  const deletableCount = useMemo(() => computeBulkDeleteCount(emptySections), [emptySections]);

  const handleDeleteSingle = async (section: EmptySectionResponse) => {
    if (!tenantId) return;
    try {
      await cleanupMutation.mutateAsync({
        tenantId,
        sectionIds: [section.section_id],
      });
      toast.success(`Deleted section ${section.section_name} of ${section.class_name}`);
      setSectionToDelete(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete section');
    }
  };

  const handleDeleteBulk = async () => {
    if (!tenantId) return;
    try {
      const deletable = filterDeletableEmptySections(emptySections);
      const sectionIds = deletable.map((s) => s.section_id);
      const res = await cleanupMutation.mutateAsync({
        tenantId,
        sectionIds,
      });
      toast.success(
        `Successfully cleaned up ${res.deleted_count ?? sectionIds.length} empty section(s).`
      );
      setIsBulkConfirmOpen(false);
      if (emptySections.length <= sectionIds.length) {
        onClose();
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete empty sections');
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-border/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  Empty Sections Resolution
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Review and resolve academic sections that currently have zero enrolled students.
                </DialogDescription>
              </div>
            </div>

            {/* Policy Note Callout */}
            <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-950 dark:text-amber-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>School Policy:</strong> Sections with 0 students for the active academic session distort attendance reporting and block adding new sections (minimum 20 students rule). You must fill or delete them.
              </p>
            </div>
          </DialogHeader>

          {/* Body Section */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-xs">Loading empty sections...</span>
              </div>
            ) : emptySections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 flex items-center justify-center">
                  <Info className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-foreground">No Empty Sections Found</h4>
                <p className="text-xs text-muted-foreground max-w-sm">
                  All active sections in your school have enrolled students. Attendance metrics and section creation rules are in full compliance.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {grouped.map((group) => (
                  <div
                    key={group.class_id}
                    className="border border-border/60 rounded-xl overflow-hidden bg-card/50"
                  >
                    <div className="px-4 py-2.5 bg-muted/40 border-b border-border/60 flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">
                        Class: {group.class_name}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {group.sections.length} empty {group.sections.length === 1 ? 'section' : 'sections'}
                      </span>
                    </div>

                    <div className="divide-y divide-border/40">
                      {group.sections.map((sec) => {
                        const meta = getSectionResolutionMeta(sec);
                        return (
                          <div
                            key={sec.section_id}
                            className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground">
                                  Section {sec.section_name}
                                </span>
                                <Badge
                                  variant="secondary"
                                  className={
                                    meta.canDelete
                                      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px]'
                                      : 'bg-muted text-muted-foreground text-[10px]'
                                  }
                                >
                                  {meta.badgeText}
                                </Badge>
                              </div>
                              {meta.noticeText && (
                                <p className="text-[11px] text-muted-foreground italic">
                                  {meta.noticeText}
                                </p>
                              )}
                            </div>

                            {meta.canDelete && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setSectionToDelete(sec)}
                                className="h-8 gap-1.5 text-xs self-start sm:self-auto shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete Section</span>
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer with Bulk Action */}
          <DialogFooter className="p-4 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              {deletableCount > 0 ? (
                <span>
                  <strong>{deletableCount}</strong> eligible empty section(s) can be deleted safely.
                </span>
              ) : (
                <span>No deletable empty sections.</span>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
                Close
              </Button>
              {deletableCount > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsBulkConfirmOpen(true)}
                  disabled={cleanupMutation.isPending}
                  className="gap-1.5 text-xs"
                >
                  {cleanupMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>Delete All Eligible Empty Sections ({deletableCount})</span>
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog: Single Section Delete */}
      <Dialog
        open={!!sectionToDelete}
        onOpenChange={(open) => !open && setSectionToDelete(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-destructive/15 text-destructive flex items-center justify-center mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-bold text-foreground">
              Delete Empty Section {sectionToDelete?.section_name}?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete Section <strong>{sectionToDelete?.section_name}</strong> of{' '}
              <strong>{sectionToDelete?.class_name}</strong>? This section currently has 0 enrolled students.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSectionToDelete(null)}
              disabled={cleanupMutation.isPending}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => sectionToDelete && handleDeleteSingle(sectionToDelete)}
              disabled={cleanupMutation.isPending}
              className="gap-1.5 text-xs"
            >
              {cleanupMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Confirm Delete</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog: Bulk Delete */}
      <Dialog
        open={isBulkConfirmOpen}
        onOpenChange={(open) => !open && setIsBulkConfirmOpen(false)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-destructive/15 text-destructive flex items-center justify-center mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-bold text-foreground">
              Delete {deletableCount} Empty Section(s)?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete {deletableCount} empty section(s)? Past academic year records and attendance history remain preserved.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBulkConfirmOpen(false)}
              disabled={cleanupMutation.isPending}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteBulk}
              disabled={cleanupMutation.isPending}
              className="gap-1.5 text-xs"
            >
              {cleanupMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Confirm Delete All ({deletableCount})</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
