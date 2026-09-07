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
import type { TenantMember } from '../types';

interface MemberDeleteDialogProps {
  member: TenantMember | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<any>;
  isLoading: boolean;
}

export const MemberDeleteDialog: React.FC<MemberDeleteDialogProps> = ({
  member,
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}) => {
  if (!member) return null;

  const fullName = [member.first_name, member.middle_name, member.last_name]
    .filter(Boolean)
    .join(' ');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-10 h-10 rounded-full bg-destructive/15 text-destructive flex items-center justify-center mb-2">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <DialogTitle className="text-lg font-bold text-foreground">
            Remove Member from School
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Are you sure you want to remove{' '}
            <span className="font-semibold text-foreground">{fullName}</span> ({member.email}) from
            this school tenant?
          </DialogDescription>
        </DialogHeader>

        <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-xs text-muted-foreground space-y-1.5">
          <p className="font-semibold text-destructive flex items-center gap-1.5">
            What happens when you remove a member:
          </p>
          <ul className="list-disc pl-4 space-y-1 text-[11px]">
            <li>All active tenant roles ({member.roles.join(', ')}) will be revoked.</li>
            <li>The user will immediately lose access to this school portal.</li>
            <li>Their historical audit logs and academic records will remain preserved.</li>
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
            {isLoading ? 'Removing...' : 'Confirm Removal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
