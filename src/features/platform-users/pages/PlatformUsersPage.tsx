import React, { useState } from 'react';
import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import { Navigate } from '@tanstack/react-router';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { UsersRound, Search, MoreVertical, Loader2, Trash, UserMinus, ShieldAlert, CheckCircle2, AlertTriangle, ShieldCheck, UserCog, Briefcase, GraduationCap, Users } from 'lucide-react';
import { usePlatformUsers, useSoftDeleteUser, useHardDeleteUser, PlatformUser } from '../api';
import { useDebounce } from 'use-debounce';
import { useSuperAdminDashboard } from '@/features/dashboard/hooks';
import { toast } from 'sonner';

export const PlatformUsersPage: React.FC = () => {
  const { user } = useAuth();
  const { isSuperAdmin } = usePermission();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch] = useDebounce(searchTerm, 500);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'super_admin' | 'user'>('all');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading } = usePlatformUsers({
    search: debouncedSearch,
    is_active: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
    role: roleFilter === 'all' ? undefined : roleFilter,
    page,
    page_size: pageSize,
  });

  const softDeleteMutation = useSoftDeleteUser();
  const hardDeleteMutation = useHardDeleteUser();

  const { data: dashboardMetrics, isLoading: isDashboardLoading } = useSuperAdminDashboard(isSuperAdmin);

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

  const handleHardDelete = async (u: PlatformUser) => {
    if (u.id === user?.id) {
      toast.error('Cannot delete yourself');
      return;
    }
    if (window.confirm(`Are you sure you want to permanently delete ${u.first_name}? This cannot be undone.`)) {
      await hardDeleteMutation.mutateAsync(u.id);
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
          <Card className="border-border/60 hover:shadow-md transition-shadow rounded-2xl bg-card">
            <div className="p-4 sm:p-5 flex flex-row items-center justify-between pb-2">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-mono">Total Users</h3>
              <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                <UsersRound className="h-5 w-5" />
              </div>
            </div>
            <div className="px-4 sm:px-5 pb-5">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
                {isDashboardLoading ? '...' : dashboardMetrics?.total_platform_users ?? 0}
              </div>
            </div>
          </Card>
          
          <Card className="border-border/60 hover:shadow-md transition-shadow rounded-2xl bg-card">
            <div className="p-4 sm:p-5 flex flex-row items-center justify-between pb-2">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-mono">Active Users</h3>
              <div className="p-2.5 bg-green-500/10 text-green-600 rounded-xl">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <div className="px-4 sm:px-5 pb-5">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
                {isDashboardLoading ? '...' : dashboardMetrics?.active_users ?? 0}
              </div>
            </div>
          </Card>

          <Card className="border-border/60 hover:shadow-md transition-shadow rounded-2xl bg-card">
            <div className="p-4 sm:p-5 flex flex-row items-center justify-between pb-2">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-mono">Super Admins</h3>
              <div className="p-2.5 bg-purple-500/10 text-purple-600 rounded-xl">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>
            <div className="px-4 sm:px-5 pb-5">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
                {isDashboardLoading ? '...' : dashboardMetrics?.total_super_admins ?? 0}
              </div>
            </div>
          </Card>

          <Card className="border-border/60 hover:shadow-md transition-shadow rounded-2xl bg-card">
            <div className="p-4 sm:p-5 flex flex-row items-center justify-between pb-2">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-mono">Inactive Users</h3>
              <div className="p-2.5 bg-red-500/10 text-red-600 rounded-xl">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
            <div className="px-4 sm:px-5 pb-5">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
                {isDashboardLoading ? '...' : dashboardMetrics?.inactive_users ?? 0}
              </div>
            </div>
          </Card>

          {/* New Role Cards Row */}
          <Card className="border-border/60 hover:shadow-md transition-shadow rounded-2xl bg-card">
            <div className="p-4 sm:p-5 flex flex-row items-center justify-between pb-2">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-mono">School Admins</h3>
              <div className="p-2.5 bg-blue-500/10 text-blue-600 rounded-xl">
                <UserCog className="h-5 w-5" />
              </div>
            </div>
            <div className="px-4 sm:px-5 pb-5">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
                {isDashboardLoading ? '...' : dashboardMetrics?.total_admins ?? 0}
              </div>
            </div>
          </Card>

          <Card className="border-border/60 hover:shadow-md transition-shadow rounded-2xl bg-card">
            <div className="p-4 sm:p-5 flex flex-row items-center justify-between pb-2">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-mono">Office Admins</h3>
              <div className="p-2.5 bg-cyan-500/10 text-cyan-600 rounded-xl">
                <Briefcase className="h-5 w-5" />
              </div>
            </div>
            <div className="px-4 sm:px-5 pb-5">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
                {isDashboardLoading ? '...' : dashboardMetrics?.total_office_admins ?? 0}
              </div>
            </div>
          </Card>

          <Card className="border-border/60 hover:shadow-md transition-shadow rounded-2xl bg-card">
            <div className="p-4 sm:p-5 flex flex-row items-center justify-between pb-2">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-mono">Teachers</h3>
              <div className="p-2.5 bg-orange-500/10 text-orange-600 rounded-xl">
                <GraduationCap className="h-5 w-5" />
              </div>
            </div>
            <div className="px-4 sm:px-5 pb-5">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
                {isDashboardLoading ? '...' : dashboardMetrics?.total_teachers ?? 0}
              </div>
            </div>
          </Card>

          <Card className="border-border/60 hover:shadow-md transition-shadow rounded-2xl bg-card">
            <div className="p-4 sm:p-5 flex flex-row items-center justify-between pb-2">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-mono">Parents</h3>
              <div className="p-2.5 bg-pink-500/10 text-pink-600 rounded-xl">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <div className="px-4 sm:px-5 pb-5">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
                {isDashboardLoading ? '...' : dashboardMetrics?.total_parents ?? 0}
              </div>
            </div>
          </Card>
        </div>

        <Card className="overflow-hidden flex flex-col h-[calc(100vh-200px)]">
        <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/20 shrink-0">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or phone..."
              className="pl-9 h-9"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
            />
          </div>
          
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 p-1 rounded-lg border bg-background">
              <button
                type="button"
                onClick={() => { setStatusFilter('all'); setPage(1); }}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  statusFilter === 'all' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => { setStatusFilter('active'); setPage(1); }}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  statusFilter === 'active' ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => { setStatusFilter('inactive'); setPage(1); }}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  statusFilter === 'inactive' ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Inactive
              </button>
            </div>

            <div className="flex items-center gap-1.5 p-1 rounded-lg border bg-background hidden sm:flex">
              <button
                type="button"
                onClick={() => { setRoleFilter('all'); setPage(1); }}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  roleFilter === 'all' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Any Role
              </button>
              <button
                type="button"
                onClick={() => { setRoleFilter('super_admin'); setPage(1); }}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  roleFilter === 'super_admin' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Super Admins
              </button>
              <button
                type="button"
                onClick={() => { setRoleFilter('user'); setPage(1); }}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  roleFilter === 'user' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
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
                      {u.is_super_admin && (
                        <Badge variant="default" className="bg-primary/20 text-primary hover:bg-primary/30 border-0">
                          SUPER ADMIN
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {u.is_active ? (
                        <Badge variant="outline" className="border-green-500/50 text-green-600 bg-green-50/50 dark:bg-green-500/10">
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
    </div>
  );
};
