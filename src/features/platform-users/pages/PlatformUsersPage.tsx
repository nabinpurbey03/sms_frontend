import React, { useState } from 'react';
import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import { Navigate, useNavigate } from '@tanstack/react-router';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { UsersRound, Search, MoreVertical, Loader2, Trash, UserMinus, CheckCircle2, AlertTriangle, ShieldCheck, UserCog, Briefcase, GraduationCap, Users, Eye, X } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { cn } from '@/lib/utils';
import { usePlatformUsers, useSoftDeleteUser, useHardDeleteUser, PlatformUser } from '../api';
import { useStartViewSession } from '../hooks';
import { useDebounce } from 'use-debounce';
import { useSuperAdminDashboard } from '@/features/dashboard/hooks';
import { toast } from 'sonner';
import { UserMembershipsDrawer } from '../components/UserMembershipsDrawer';
import { useViewAsStore } from '@/stores/viewAsStore';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

const getRoleBadgeVariant = (role: string): 'role-super-admin' | 'role-admin' | 'role-office-admin' | 'role-teacher' | 'role-parent' | 'secondary' => {
  switch (role.toUpperCase()) {
    case 'SUPER_ADMIN':
      return 'role-super-admin';
    case 'ADMIN':
    case 'PRINCIPAL':
      return 'role-admin';
    case 'OFFICE_ADMIN':
      return 'role-office-admin';
    case 'TEACHER':
      return 'role-teacher';
    case 'PARENT':
      return 'role-parent';
    default:
      return 'secondary';
  }
};

const formatRole = (role: string): string => {
  switch (role.toUpperCase()) {
    case 'SUPER_ADMIN':
      return 'Super Admin';
    case 'ADMIN':
      return 'Principal';
    case 'OFFICE_ADMIN':
      return 'Office Admin';
    case 'TEACHER':
      return 'Teacher';
    case 'PARENT':
      return 'Parent';
    default:
      return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  }
};

export const PlatformUsersPage: React.FC = () => {
  const { user } = useAuth();
  const { isSuperAdmin } = usePermission();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch] = useDebounce(searchTerm, 500);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'super_admin' | 'user'>('all');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [selectedUserForMemberships, setSelectedUserForMemberships] = useState<PlatformUser | null>(null);
  const [viewAsUser, setViewAsUser] = useState<PlatformUser | null>(null);

  const { data, isLoading } = usePlatformUsers({
    search: debouncedSearch,
    is_active: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
    role: roleFilter === 'all' ? undefined : roleFilter,
    page,
    page_size: pageSize,
  });

  const softDeleteMutation = useSoftDeleteUser();
  const hardDeleteMutation = useHardDeleteUser();
  const startViewSessionMutation = useStartViewSession();
  const startSession = useViewAsStore((state) => state.startSession);

  const { data: dashboardMetrics, isLoading: isDashboardLoading } = useSuperAdminDashboard(isSuperAdmin);
  const [userToHardDelete, setUserToHardDelete] = useState<PlatformUser | null>(null);

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSoftDelete = async (u: PlatformUser) => {
    if (u.id === user?.id) {
      toast.error('Cannot deactivate yourself');
      return;
    }
    await softDeleteMutation.mutateAsync(u.id);
  };

  const handleHardDelete = (u: PlatformUser) => {
    if (u.id === user?.id) {
      toast.error('Cannot delete yourself');
      return;
    }
    setUserToHardDelete(u);
  };

  const handleConfirmHardDelete = async () => {
    if (!userToHardDelete) return;
    try {
      await hardDeleteMutation.mutateAsync(userToHardDelete.id);
      setUserToHardDelete(null);
    } catch {
      // error handled in mutation
    }
  };

  const handleOpenViewAs = (u: PlatformUser) => {
    if (u.id === user?.id) {
      toast.error('Cannot view as yourself');
      return;
    }
    setViewAsUser(u);
  };

  const handleConfirmViewAs = async () => {
    if (!viewAsUser) return;
    try {
      const res = await startViewSessionMutation.mutateAsync(viewAsUser.id);
      startSession(res.token, viewAsUser.id);
      toast.success(`Started View As session for ${viewAsUser.first_name}`);
      setViewAsUser(null);
      navigate({ to: '/dashboard' });
    } catch {
      toast.error('Failed to start View As session');
    }
  };

  const handlePreviousPage = () => {
    if (data?.meta.has_previous) setPage((p) => Math.max(1, p - 1));
  };

  const handleNextPage = () => {
    if (data?.meta.has_next) setPage((p) => p + 1);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto min-h-[calc(100vh-64px)]">
      <div className="space-y-6 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <StatCard
            title="Total Users"
            value={dashboardMetrics?.total_platform_users ?? 0}
            loading={isDashboardLoading}
            icon={UsersRound}
            variant="default"
          />
          <StatCard
            title="Active Users"
            value={dashboardMetrics?.active_users ?? 0}
            loading={isDashboardLoading}
            icon={CheckCircle2}
            variant="emerald"
          />
          <StatCard
            title="Super Admins"
            value={dashboardMetrics?.total_super_admins ?? 0}
            loading={isDashboardLoading}
            icon={ShieldCheck}
            variant="purple"
          />
          <StatCard
            title="Inactive Users"
            value={dashboardMetrics?.inactive_users ?? 0}
            loading={isDashboardLoading}
            icon={AlertTriangle}
            variant="amber"
          />
          <StatCard
            title="School Admins"
            value={dashboardMetrics?.total_admins ?? 0}
            loading={isDashboardLoading}
            icon={UserCog}
            variant="default"
          />
          <StatCard
            title="Office Admins"
            value={dashboardMetrics?.total_office_admins ?? 0}
            loading={isDashboardLoading}
            icon={Briefcase}
            variant="blue"
          />
          <StatCard
            title="Teachers"
            value={dashboardMetrics?.total_teachers ?? 0}
            loading={isDashboardLoading}
            icon={GraduationCap}
            variant="emerald"
          />
          <StatCard
            title="Parents"
            value={dashboardMetrics?.total_parents ?? 0}
            loading={isDashboardLoading}
            icon={Users}
            variant="amber"
          />
        </div>

        <Card className="overflow-hidden flex flex-col h-[calc(100vh-200px)]">
        <div className="p-3.5 sm:p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 shrink-0">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by name, email, or phone..."
              className="pl-9 pr-8 h-9 text-xs rounded-lg"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-3 text-sm flex-wrap">
            <div className="flex items-center rounded-lg border border-border/70 p-0.5 bg-muted/40">
              <button
                type="button"
                onClick={() => { setStatusFilter('all'); setPage(1); }}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer select-none',
                  statusFilter === 'all'
                    ? 'bg-background text-foreground shadow-2xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => { setStatusFilter('active'); setPage(1); }}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer select-none',
                  statusFilter === 'active'
                    ? 'bg-background text-foreground shadow-2xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => { setStatusFilter('inactive'); setPage(1); }}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer select-none',
                  statusFilter === 'inactive'
                    ? 'bg-background text-foreground shadow-2xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Inactive
              </button>
            </div>

            <div className="flex items-center rounded-lg border border-border/70 p-0.5 bg-muted/40 hidden sm:flex">
              <button
                type="button"
                onClick={() => { setRoleFilter('all'); setPage(1); }}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer select-none',
                  roleFilter === 'all'
                    ? 'bg-background text-foreground shadow-2xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Any Role
              </button>
              <button
                type="button"
                onClick={() => { setRoleFilter('super_admin'); setPage(1); }}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer select-none',
                  roleFilter === 'super_admin'
                    ? 'bg-background text-foreground shadow-2xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Platform Admins
              </button>
              <button
                type="button"
                onClick={() => { setRoleFilter('user'); setPage(1); }}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer select-none',
                  roleFilter === 'user'
                    ? 'bg-background text-foreground shadow-2xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Users
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mb-4" />
              <p>Loading platform users...</p>
            </div>
          ) : data?.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <UsersRound className="w-12 h-12 mb-4 text-muted-foreground/50" />
              <p>No users found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                <TableRow>
                  <TableHead>User Details</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>System Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium">
                        {u.first_name} {u.middle_name} {u.last_name}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono mt-1">
                        ID: {u.id.substring(0, 8)}...
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{u.email}</div>
                      <div className="text-sm text-muted-foreground">{u.phone}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {u.is_super_admin && (
                          <Badge variant="role-super-admin">
                            Super Admin
                          </Badge>
                        )}
                        {((u as any).roles as string[] | undefined)?.map((role) => (
                          <Badge key={role} variant={getRoleBadgeVariant(role)}>
                            {formatRole(role)}
                          </Badge>
                        ))}
                        {!(u.is_super_admin || (u as any).roles?.length) && (
                          <Badge variant="secondary">User</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {u.is_active ? (
                        <Badge variant="success">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Deactivated</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" disabled={u.id === user?.id}>
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => setSelectedUserForMemberships(u)}
                          >
                            <Briefcase className="w-4 h-4 mr-2" />
                            View Memberships
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer text-blue-600 focus:bg-blue-50 focus:text-blue-700"
                            onClick={() => handleOpenViewAs(u)}
                            disabled={startViewSessionMutation.isPending}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View As User
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-orange-600 focus:bg-orange-50 focus:text-orange-700 cursor-pointer"
                            onClick={() => handleSoftDelete(u)}
                            disabled={softDeleteMutation.isPending || hardDeleteMutation.isPending}
                          >
                            <UserMinus className="w-4 h-4 mr-2" />
                            Soft Delete
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer font-medium"
                            onClick={() => handleHardDelete(u)}
                            disabled={softDeleteMutation.isPending || hardDeleteMutation.isPending}
                          >
                            <Trash className="w-4 h-4 mr-2" />
                            Hard Delete (Irreversible)
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination Controls */}
        {data && data.meta.total_pages > 1 && (
          <div className="p-4 border-t flex items-center justify-between bg-muted/10 shrink-0">
            <div className="text-sm text-muted-foreground">
              Showing page {data.meta.current_page} of {data.meta.total_pages} ({data.meta.total_records} total users)
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={!data.meta.has_previous}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={!data.meta.has_next}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
      </div>
      <UserMembershipsDrawer
        user={selectedUserForMemberships}
        isOpen={!!selectedUserForMemberships}
        onClose={() => setSelectedUserForMemberships(null)}
      />

      <Dialog open={!!viewAsUser} onOpenChange={(open) => !open && setViewAsUser(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              View As User Session
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <p>
                You are about to start a session viewing as{' '}
                <span className="font-semibold text-foreground">
                  {viewAsUser?.first_name} {viewAsUser?.last_name}
                </span>{' '}
                ({viewAsUser?.email}).
              </p>
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-amber-700 dark:text-amber-400 text-xs space-y-1">
                <p className="font-medium">Audited & Read-Only Access:</p>
                <p>
                  All mutating actions (create, update, delete) are strictly disabled during this session.
                  All actions taken during this session are recorded in the audit trail for security and compliance.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setViewAsUser(null)}
              disabled={startViewSessionMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleConfirmViewAs}
              disabled={startViewSessionMutation.isPending}
            >
              {startViewSessionMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Start View Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hard Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!userToHardDelete}
        onOpenChange={(open) => !open && setUserToHardDelete(null)}
        title="Permanently Delete Platform User"
        description={`Are you sure you want to permanently delete ${userToHardDelete?.first_name} ${userToHardDelete?.last_name}? This action cannot be undone and will revoke all associated memberships.`}
        confirmLabel="Permanently Delete"
        variant="destructive"
        isPending={hardDeleteMutation.isPending}
        onConfirm={handleConfirmHardDelete}
      />
    </div>
  );
};
