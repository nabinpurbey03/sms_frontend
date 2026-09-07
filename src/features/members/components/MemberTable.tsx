import React from 'react';
import {
  MoreHorizontal,
  ShieldAlert,
  UserCheck,
  Eye,
  Trash2,
  Copy,
  Mail,
  GraduationCap,
  HeartHandshake,
  Shield,
  ShieldCheck,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { TenantMember, MemberRole } from '../types';

interface MemberTableProps {
  members: TenantMember[];
  isLoading: boolean;
  canManageMembers: boolean;
  onInspectMember: (member: TenantMember) => void;
  onManageRoles: (member: TenantMember) => void;
  onDeleteMember: (member: TenantMember) => void;
}

const ROLE_BADGE_CONFIG: Record<
  MemberRole,
  { label: string; bg: string; text: string; border: string; icon: React.ElementType }
> = {
  ADMIN: {
    label: 'School Admin',
    bg: 'bg-purple-500/10',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-500/25',
    icon: ShieldCheck,
  },
  OFFICE_ADMIN: {
    label: 'Office Admin',
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-500/25',
    icon: Shield,
  },
  TEACHER: {
    label: 'Teacher',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-500/25',
    icon: GraduationCap,
  },
  PARENT: {
    label: 'Parent',
    bg: 'bg-amber-500/10',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-500/25',
    icon: HeartHandshake,
  },
  SUPER_ADMIN: {
    label: 'Super Admin',
    bg: 'bg-rose-500/10',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-500/25',
    icon: ShieldAlert,
  },
};

const getInitials = (firstName: string, lastName: string): string => {
  const f = firstName ? firstName[0].toUpperCase() : '';
  const l = lastName ? lastName[0].toUpperCase() : '';
  return `${f}${l}` || 'U';
};

const getAvatarBg = (email: string): string => {
  const colors = [
    'bg-blue-600',
    'bg-emerald-600',
    'bg-purple-600',
    'bg-amber-600',
    'bg-rose-600',
    'bg-indigo-600',
    'bg-teal-600',
  ];
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

export const MemberTable: React.FC<MemberTableProps> = ({
  members,
  isLoading,
  canManageMembers,
  onInspectMember,
  onManageRoles,
  onDeleteMember,
}) => {
  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    toast.success('Email copied to clipboard');
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <div className="p-8 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="w-1/4 h-4 rounded bg-muted" />
                <div className="w-1/3 h-3 rounded bg-muted/60" />
              </div>
              <div className="w-24 h-6 rounded-full bg-muted" />
              <div className="w-16 h-4 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/80 bg-card p-12 text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3 text-muted-foreground">
          <UserCheck className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-foreground">No members found</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
          No members matched your search criteria or role filters. Try adjusting your query or onboard a new member.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-xs">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[300px]">Member</TableHead>
            <TableHead>Assigned Roles</TableHead>
            <TableHead className="w-[140px]">Tenant Status</TableHead>
            <TableHead className="w-[160px] hidden md:table-cell">Contact</TableHead>
            <TableHead className="w-[70px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => {
            const fullName = [member.first_name, member.middle_name, member.last_name]
              .filter(Boolean)
              .join(' ');
            const initials = getInitials(member.first_name, member.last_name);
            const avatarColor = getAvatarBg(member.email);

            return (
              <TableRow key={member.user_id} className="hover:bg-muted/40 transition-colors">
                {/* Member Info */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-full ${avatarColor} text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs`}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onInspectMember(member)}
                        className="font-semibold text-sm text-foreground hover:text-primary transition-colors text-left truncate block cursor-pointer"
                      >
                        {fullName}
                      </button>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3 shrink-0" />
                        {member.email}
                      </p>
                    </div>
                  </div>
                </TableCell>

                {/* Multi-Role Badges */}
                <TableCell>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {member.roles.map((role) => {
                      const config = ROLE_BADGE_CONFIG[role] || {
                        label: role,
                        bg: 'bg-muted',
                        text: 'text-muted-foreground',
                        border: 'border-border',
                        icon: Shield,
                      };
                      const Icon = config.icon;

                      return (
                        <span
                          key={role}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}
                        >
                          <Icon className="w-3 h-3" />
                          {config.label}
                        </span>
                      );
                    })}
                    {member.roles.length > 1 && (
                      <span className="text-[10px] font-semibold text-muted-foreground px-1.5 py-0.5 rounded bg-muted/60 border border-border/40">
                        Multi-Role
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* Status */}
                <TableCell>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      member.is_active
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-muted text-muted-foreground border border-border'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        member.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'
                      }`}
                    />
                    {member.is_active ? 'Active' : 'Inactive'}
                  </span>
                </TableCell>

                {/* Contact (Phone / ID) */}
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                  {member.phone || 'No phone registered'}
                </TableCell>

                {/* Actions Dropdown */}
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                        <span className="sr-only">Open actions menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
                        Member Options
                      </DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() => onInspectMember(member)}
                        className="cursor-pointer gap-2 text-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View Profile & ReBAC
                      </DropdownMenuItem>

                      {canManageMembers && (
                        <DropdownMenuItem
                          onClick={() => onManageRoles(member)}
                          className="cursor-pointer gap-2 text-xs"
                        >
                          <Shield className="w-3.5 h-3.5" />
                          Manage Roles ({member.roles.length})
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuItem
                        onClick={() => handleCopyEmail(member.email)}
                        className="cursor-pointer gap-2 text-xs"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copy Email Address
                      </DropdownMenuItem>

                      {canManageMembers && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onDeleteMember(member)}
                            className="cursor-pointer gap-2 text-xs text-destructive focus:text-destructive focus:bg-destructive/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Remove from School
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
