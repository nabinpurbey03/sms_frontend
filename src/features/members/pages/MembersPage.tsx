import React, { useState, useMemo } from 'react';
import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import {
  useMembers,
  useMemberStats,
  useCreateMember,
  useAssignRole,
  useRevokeRole,
  useDeleteMember,
} from '../hooks';
import { MemberStatsCards } from '../components/MemberStatsCards';
import { MemberFiltersToolbar } from '../components/MemberFiltersToolbar';
import { MemberTable } from '../components/MemberTable';
import { MemberAddDialog } from '../components/MemberAddDialog';
import { MemberRoleDialog } from '../components/MemberRoleDialog';
import { MemberDetailDrawer } from '../components/MemberDetailDrawer';
import { MemberDeleteDialog } from '../components/MemberDeleteDialog';
import { Building2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import type { TenantMember, MemberRole, TenantMemberCreateDTO } from '../types';

export const MembersPage: React.FC = () => {
  const { activeTenantId, activeTenantName, activeRole } = useAuth();
  const { isSuperAdmin } = usePermission();

  // Filters State
  const [selectedRole, setSelectedRole] = useState<MemberRole | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialogs State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [inspectingMember, setInspectingMember] = useState<TenantMember | null>(null);
  const [managingRoleMember, setManagingRoleMember] = useState<TenantMember | null>(null);
  const [deletingMember, setDeletingMember] = useState<TenantMember | null>(null);

  // Queries & Mutations
  const {
    data: allMembers = [],
    isLoading,
    isError,
    refetch,
  } = useMembers(activeTenantId, selectedRole === 'ALL' ? undefined : selectedRole);

  const stats = useMemberStats(allMembers);

  const createMemberMutation = useCreateMember();
  const assignRoleMutation = useAssignRole();
  const revokeRoleMutation = useRevokeRole();
  const deleteMemberMutation = useDeleteMember();

  // Permissions
  const canManageMembers =
    isSuperAdmin || activeRole === 'ADMIN' || activeRole === 'OFFICE_ADMIN';
  const canGrantRoles = isSuperAdmin || activeRole === 'ADMIN';

  // Filtered members by search query and active status
  const filteredMembers = useMemo(() => {
    return allMembers.filter((m) => {
      // Status filter
      if (statusFilter === 'ACTIVE' && !m.is_active) return false;
      if (statusFilter === 'INACTIVE' && m.is_active) return false;

      // Role filter (already handled on query if selected, but double checked)
      if (selectedRole !== 'ALL' && !m.roles.includes(selectedRole)) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const fullName = `${m.first_name} ${m.middle_name || ''} ${m.last_name}`.toLowerCase();
        const email = m.email.toLowerCase();
        const roles = m.roles.join(' ').toLowerCase();
        return fullName.includes(q) || email.includes(q) || roles.includes(q);
      }

      return true;
    });
  }, [allMembers, statusFilter, selectedRole, searchQuery]);

  // Export CSV
  const handleExportCsv = () => {
    if (filteredMembers.length === 0) {
      toast.error('No members to export');
      return;
    }

    const headers = ['User ID', 'First Name', 'Last Name', 'Email', 'Roles', 'Status', 'Phone'];
    const rows = filteredMembers.map((m) => [
      m.user_id,
      m.first_name,
      m.last_name,
      m.email,
      m.roles.join('; '),
      m.is_active ? 'Active' : 'Inactive',
      m.phone || '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const safeTenantName = (activeTenantName || 'school').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.setAttribute('download', `${safeTenantName}_members_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Roster Exported', {
      description: `Downloaded CSV with ${filteredMembers.length} member records.`,
    });
  };

  // Handlers
  const handleCreateMember = async (data: TenantMemberCreateDTO) => {
    if (!activeTenantId) return;
    await createMemberMutation.mutateAsync({
      tenantId: activeTenantId,
      data,
    });
  };

  const handleAssignRole = async (role: MemberRole) => {
    if (!activeTenantId || !managingRoleMember) return;
    const updated = await assignRoleMutation.mutateAsync({
      tenantId: activeTenantId,
      userId: managingRoleMember.user_id,
      role,
    });
    // Update local modal state
    if (updated && updated.roles) {
      setManagingRoleMember(updated);
    }
  };

  const handleRevokeRole = async (role: MemberRole) => {
    if (!activeTenantId || !managingRoleMember) return;
    await revokeRoleMutation.mutateAsync({
      tenantId: activeTenantId,
      userId: managingRoleMember.user_id,
      role,
    });
    // Update local modal state
    setManagingRoleMember((prev) =>
      prev
        ? {
            ...prev,
            roles: prev.roles.filter((r) => r !== role),
          }
        : null
    );
  };

  const handleDeleteMember = async () => {
    if (!activeTenantId || !deletingMember) return;
    await deleteMemberMutation.mutateAsync({
      tenantId: activeTenantId,
      userId: deletingMember.user_id,
      roles: deletingMember.roles,
    });
    setDeletingMember(null);
  };

  // Empty State: No active tenant selected
  if (!activeTenantId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
          <Building2 className="w-8 h-8" />
        </div>
        <div className="space-y-1 max-w-md">
          <h2 className="text-xl font-bold text-foreground">Select a School Portal</h2>
          <p className="text-sm text-muted-foreground">
            You must switch to an active school tenant in order to manage faculty members, teachers,
            staff, and parents.
          </p>
        </div>
        <Button asChild>
          <Link to="/tenants">View All Schools</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              School Members Hub
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {activeTenantName || 'Current School'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage teachers, staff, parents, and administrators with granular role-based access control.
          </p>
        </div>

        {canManageMembers && (
          <Button
            onClick={() => setIsAddOpen(true)}
            className="gap-2 shadow-xs shrink-0 self-start sm:self-auto"
          >
            <Users className="w-4 h-4" />
            <span>Add Member</span>
          </Button>
        )}
      </div>

      {/* KPI Stats Cards */}
      <MemberStatsCards
        stats={stats}
        selectedRole={selectedRole}
        onSelectRole={(role) => setSelectedRole(role)}
        isLoading={isLoading}
      />

      {/* Filters & Actions Toolbar */}
      <MemberFiltersToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedRole={selectedRole}
        onRoleChange={setSelectedRole}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        onExportCsv={handleExportCsv}
        onAddMember={() => setIsAddOpen(true)}
        canManageMembers={canManageMembers}
        totalFilteredCount={filteredMembers.length}
      />

      {/* Error state alert */}
      {isError && (
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center justify-between">
          <span>Failed to fetch live members from the server. Showing cached or fallback data.</span>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="h-7 text-xs">
            Retry
          </Button>
        </div>
      )}

      {/* Members Roster Table */}
      <MemberTable
        members={filteredMembers}
        isLoading={isLoading}
        canManageMembers={canManageMembers}
        onInspectMember={(m) => setInspectingMember(m)}
        onManageRoles={(m) => setManagingRoleMember(m)}
        onDeleteMember={(m) => setDeletingMember(m)}
      />

      {/* Dialog: Associate Member by Phone */}
      <MemberAddDialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSubmit={handleCreateMember}
        isLoading={createMemberMutation.isPending}
        canCreateAdminRoles={canGrantRoles}
        tenantId={activeTenantId}
      />

      {/* Dialog: Manage Roles */}
      <MemberRoleDialog
        member={managingRoleMember}
        isOpen={!!managingRoleMember}
        onClose={() => setManagingRoleMember(null)}
        onAssignRole={handleAssignRole}
        onRevokeRole={handleRevokeRole}
        isLoading={assignRoleMutation.isPending || revokeRoleMutation.isPending}
        canManageRoles={canGrantRoles}
      />

      {/* Drawer: Member Detail & ReBAC Inspector */}
      <MemberDetailDrawer
        member={inspectingMember}
        isOpen={!!inspectingMember}
        onClose={() => setInspectingMember(null)}
        tenantId={activeTenantId}
        onManageRoles={(m) => setManagingRoleMember(m)}
      />

      {/* Dialog: Confirm Deletion */}
      <MemberDeleteDialog
        member={deletingMember}
        isOpen={!!deletingMember}
        onClose={() => setDeletingMember(null)}
        onConfirm={handleDeleteMember}
        isLoading={deleteMemberMutation.isPending}
      />
    </div>
  );
};
