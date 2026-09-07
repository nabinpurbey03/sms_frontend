import React, { useState } from 'react';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Tenant } from '../types';

interface TenantDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant | null;
  onConfirmDelete: (tenantId: string) => Promise<void>;
  isDeleting?: boolean;
}

export const TenantDeleteDialog: React.FC<TenantDeleteDialogProps> = ({
  open,
  onOpenChange,
  tenant,
  onConfirmDelete,
  isDeleting = false,
}) => {
  const [confirmSlug, setConfirmSlug] = useState('');

  if (!tenant) return null;

  const isMatch = confirmSlug.trim() === tenant.domain_name;

  const handleDelete = async () => {
    if (!isMatch) return;
    await onConfirmDelete(tenant.id);
    setConfirmSlug('');
    onOpenChange(false);
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) setConfirmSlug('');
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 rounded-2xl border-destructive/30 shadow-2xl overflow-hidden">
        <DialogHeader className="p-5 sm:p-6 pb-4 border-b bg-destructive/5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-destructive/15 text-destructive shrink-0">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-destructive">
                Hard Delete School Tenant
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                This action is destructive and irreversible.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 sm:p-6 space-y-4">
          <p className="text-xs text-foreground leading-relaxed">
            You are about to permanently purge{' '}
            <strong className="font-bold text-foreground">{tenant.name}</strong> (
            <code className="font-mono text-primary font-semibold">{tenant.domain_name}</code>).
          </p>

          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive space-y-1">
            <p className="font-bold">⚠️ Irrevocable Purge Consequences:</p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-destructive/90">
              <li>All associated academic classes, sections, and subjects</li>
              <li>Enrolled student rosters and attendance historical records</li>
              <li>Faculty duties, teacher assignments, and parent links</li>
              <li>Stored brand assets and logos</li>
            </ul>
          </div>

          <div className="space-y-2 pt-1">
            <Label htmlFor="slug-confirm" className="text-xs font-semibold text-muted-foreground">
              To verify deletion, type the domain slug{' '}
              <span className="font-mono font-bold text-foreground select-all">
                {tenant.domain_name}
              </span>{' '}
              below:
            </Label>
            <Input
              id="slug-confirm"
              value={confirmSlug}
              onChange={(e) => setConfirmSlug(e.target.value)}
              placeholder={tenant.domain_name}
              className="h-10 font-mono text-xs border-destructive/40 focus-visible:ring-destructive"
              autoComplete="off"
            />
          </div>
        </div>

        <DialogFooter className="p-4 sm:p-6 pt-3 border-t bg-muted/20 flex items-center justify-between sm:justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={!isMatch || isDeleting}
            className="min-w-[140px] font-semibold"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-1.5" />
                Confirm Deletion
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
