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
import { Label } from '@/components/ui/label';
import {
  Shield,
  ShieldCheck,
  GraduationCap,
  HeartHandshake,
  Plus,
  Trash2,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import type { TenantMember, MemberRole } from '../types';

interface MemberRoleDialogProps {
  member: TenantMember | null;
  isOpen: boolean;
  onClose: () => void;
  onAssignRole: (role: MemberRole) => Promise<any>;
  onRevokeRole: (role: MemberRole) => Promise<any>;
  isLoading: boolean;
  canManageRoles?: boolean;
}

const ALL_ROLES: Array<{
  id: MemberRole;
  label: string;
  desc: string;
  icon: React.ElementType;
}> = [
  {
    id: 'TEACHER',
    label: 'Teacher',
    desc: 'Instructs classes, manages section attendance, grading',
    icon: GraduationCap,
  },
  {
    id: 'OFFICE_ADMIN',
    label: 'Office Admin',
    desc: 'Academic operations, class & student enrollment',
    icon: Shield,
  },
  {
    id: 'PARENT',
    label: 'Parent',
    desc: 'View linked children attendance & reports',
    icon: HeartHandshake,
  },
  {
    id: 'ADMIN',
    label: 'School Admin',
    desc: 'Full administrative authority for this school tenant',
    icon: ShieldCheck,
  },
];

export const MemberRoleDialog: React.FC<MemberRoleDialogProps> = ({
  member,
  isOpen,
  onClose,
  onAssignRole,
  onRevokeRole,
  isLoading,
  canManageRoles = true,
}) => {
  const [selectedNewRole, setSelectedNewRole] = useState<MemberRole | ''>('');
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [roleToRevoke, setRoleToRevoke] = useState<MemberRole | null>(null);

  if (!member) return null;

  const currentRoles = member.roles;
  const availableRoles = ALL_ROLES.filter((r) => !currentRoles.includes(r.id));

  const handleAssign = async () => {
    if (!selectedNewRole) return;
    try {
      setIsActionLoading(true);
      await onAssignRole(selectedNewRole as MemberRole);
      setSelectedNewRole('');
    } catch {
      // Error handled by mutation onError toast
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRevoke = async (role: MemberRole) => {
    try {
      setIsActionLoading(true);
      await onRevokeRole(role);
    } catch {
      // Error handled by mutation onError toast
    } finally {
      setIsActionLoading(false);
    }
  };

  const fullName = [member.first_name, member.middle_name, member.last_name]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg w-full overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Manage Roles & Permissions</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground break-words">
            Configure tenant-scoped roles for{' '}
            <span className="font-semibold text-foreground">{fullName}</span>{' '}
            <span className="break-all text-muted-foreground/80">({member.email})</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Permission Notice Banner for Non-Admin Users */}
          {!canManageRoles && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-200 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="space-y-0.5 min-w-0">
                <p className="font-semibold text-foreground">Role Alterations Restricted</p>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  Only School Administrators (Principal) have permission to grant or revoke member roles. As an Office Admin, you have view-only access to role configurations.
                </p>
              </div>
            </div>
          )}

          {/* Currently Assigned Roles */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">Current Active Roles</Label>
            <div className="space-y-2">
              {currentRoles.map((role) => {
                const roleDef = ALL_ROLES.find((r) => r.id === role);
                const Icon = roleDef?.icon || Shield;
                const isOnlyRole = currentRoles.length === 1;

                return (
                  <div
                    key={role}
                    className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-muted/20 gap-3 min-w-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {roleDef?.label || role}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {roleDef?.desc || 'Custom assigned tenant role'}
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setRoleToRevoke(role)}
                      disabled={!canManageRoles || isLoading || isActionLoading || isOnlyRole}
                      title={
                        !canManageRoles
                          ? 'Only School Administrators have permission to revoke member roles.'
                          : isOnlyRole
                          ? 'A member must hold at least one role. To remove this user entirely, use Remove Member.'
                          : 'Revoke this specific role'
                      }
                      className="text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5 shrink-0 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Revoke</span>
                    </Button>
                  </div>
                );
              })}
            </div>

            {currentRoles.length === 1 && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                This member holds 1 role. To remove them from the school completely, use the Remove Member action.
              </p>
            )}
          </div>

          {/* Assign Additional Role */}
          {availableRoles.length > 0 && (
            <div className="space-y-2 pt-3 border-t border-border/50">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">
                  Grant Additional Role
                </Label>
                {!canManageRoles && (
                  <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                    Admin Only
                  </span>
                )}
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 min-w-0">
                <select
                  value={selectedNewRole}
                  onChange={(e) => setSelectedNewRole(e.target.value as MemberRole)}
                  disabled={!canManageRoles || isLoading || isActionLoading}
                  className="flex-1 min-w-0 h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select a role to assign...</option>
                  {availableRoles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAssign}
                  disabled={!canManageRoles || !selectedNewRole || isLoading || isActionLoading}
                  title={
                    !canManageRoles
                      ? 'Only School Administrators have permission to assign member roles.'
                      : undefined
                  }
                  className="h-9 gap-1.5 text-xs shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Grant Role
                </Button>
              </div>
              {selectedNewRole && (
                <p className="text-[11px] text-muted-foreground">
                  {ALL_ROLES.find((r) => r.id === selectedNewRole)?.desc}
                </p>
              )}
              {!canManageRoles && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  Role assignment requires School Admin privileges.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} className="text-xs">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Role Revocation Confirmation Dialog */}
    <Dialog open={!!roleToRevoke} onOpenChange={(open) => !open && setRoleToRevoke(null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-10 h-10 rounded-full bg-destructive/15 text-destructive flex items-center justify-center mb-2">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <DialogTitle className="text-lg font-bold text-foreground">
            Confirm Role Revocation
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Are you sure you want to revoke the role{' '}
            <span className="font-semibold text-foreground">{roleToRevoke}</span> from{' '}
            <span className="font-semibold text-foreground">{fullName}</span>?
          </DialogDescription>
        </DialogHeader>

        <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-xs text-muted-foreground space-y-1.5">
          <p className="font-semibold text-destructive">Impact:</p>
          <p className="text-[11px]">
            This member will immediately lose access to all permissions and administrative scopes provided by the {roleToRevoke} role.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setRoleToRevoke(null)}
            disabled={isActionLoading}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={async () => {
              if (roleToRevoke) {
                await handleRevoke(roleToRevoke);
                setRoleToRevoke(null);
              }
            }}
            disabled={isActionLoading}
            className="text-xs"
          >
            {isActionLoading ? 'Revoking...' : 'Confirm Revoke'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
);
};
