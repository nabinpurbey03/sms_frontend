import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/auth/useAuth';
import { usePermission } from '@/auth/usePermission';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useTenants,
  useCreateTenant,
  useUpdateTenant,
  useUploadTenantLogo,
  useDeleteTenant,
} from '../hooks';
import { useSuperAdminDashboard } from '@/features/dashboard/hooks';
import { TenantStatsCards } from '../components/TenantStatsCards';
import { TenantFormDialog } from '../components/TenantFormDialog';
import { TenantLogoDialog } from '../components/TenantLogoDialog';
import { TenantDeleteDialog } from '../components/TenantDeleteDialog';
import { TenantGridView } from '../components/TenantGridView';
import { TenantTableView } from '../components/TenantTableView';
import type { Tenant, TenantFormData } from '../types';

import { useDebounce } from 'use-debounce';

export const TenantsPage: React.FC = () => {
  const { isSuperAdmin } = usePermission();
  const { activeTenantId, switchTenant } = useAuth();

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch] = useDebounce(searchQuery, 300);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Dialog State
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [tenantToEdit, setTenantToEdit] = useState<Tenant | null>(null);

  const [logoDialogOpen, setLogoDialogOpen] = useState(false);
  const [tenantForLogo, setTenantForLogo] = useState<Tenant | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);

  // Queries & Mutations
  const { data: tenantsResponse, isLoading, refetch } = useTenants({
    search: debouncedSearch,
    is_active:
      statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
    page,
    page_size: pageSize,
  });

  const { data: dashboardMetrics } = useSuperAdminDashboard(isSuperAdmin);

  const createMutation = useCreateTenant();
  const updateMutation = useUpdateTenant();
  const uploadLogoMutation = useUploadTenantLogo();
  const deleteMutation = useDeleteTenant();

  const allTenants = useMemo(() => tenantsResponse?.items || [], [tenantsResponse]);

  const globalStats = {
    total: dashboardMetrics?.total_tenants ?? 0,
    active: dashboardMetrics?.active_tenants ?? 0,
    inactive: dashboardMetrics?.inactive_tenants ?? 0,
  };

  // Handlers
  const handleOpenCreate = () => {
    setTenantToEdit(null);
    setFormDialogOpen(true);
  };

  const handleOpenEdit = (tenant: Tenant) => {
    setTenantToEdit(tenant);
    setFormDialogOpen(true);
  };

  const handleOpenLogo = (tenant: Tenant) => {
    setTenantForLogo(tenant);
    setLogoDialogOpen(true);
  };

  const handleOpenDelete = (tenant: Tenant) => {
    setTenantToDelete(tenant);
    setDeleteDialogOpen(true);
  };

  const handleToggleStatus = async (tenant: Tenant) => {
    await updateMutation.mutateAsync({
      tenantId: tenant.id,
      data: { is_active: !tenant.is_active },
    });
  };

  const handleFormSubmit = async (data: TenantFormData) => {
    if (tenantToEdit) {
      await updateMutation.mutateAsync({
        tenantId: tenantToEdit.id,
        data,
      });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!tenantForLogo) return;
    await uploadLogoMutation.mutateAsync({
      tenantId: tenantForLogo.id,
      file,
    });
  };

  const handleDeleteConfirm = async (tenantId: string) => {
    await deleteMutation.mutateAsync(tenantId);
  };

  const handleSwitchTenant = (tenant: Tenant) => {
    switchTenant(tenant.id);
  };

  if (!isSuperAdmin) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center space-y-3">
        <ShieldCheck className="h-10 w-10 text-destructive mx-auto" />
        <h2 className="text-base font-bold text-destructive">Super Admin Access Required</h2>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Tenant provisioning and cross-organization administration is restricted strictly to platform Super Administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Action Header */}
      <div className="flex justify-end items-center gap-2">
        <div className="flex items-center gap-3">
          <Button onClick={handleOpenCreate} size="sm" className="gap-1.5 rounded-xl shadow-xs">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New School</span>
          </Button>
          <Button variant="outline" size="icon" onClick={() => refetch()} className="h-9 w-9 rounded-xl border-dashed">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-primary' : ''}`} />
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <TenantStatsCards 
        tenants={allTenants} 
        globalStats={globalStats}
        isLoading={isLoading} 
      />

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-2xl border bg-card shadow-xs">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search by school name, domain slug, or email..."
            className="pl-9 h-10 text-xs rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Status Filter */}
          <div className="flex items-center rounded-xl border p-1 bg-muted/30">
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all');
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                statusFilter === 'all'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('active');
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                statusFilter === 'active'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('inactive');
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                statusFilter === 'inactive'
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Inactive
            </button>
          </div>

          {/* View Toggle (Grid / Table) */}
          <div className="flex items-center rounded-xl border p-1 bg-muted/30">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'table'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Table View"
              aria-label="Table View"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Grid Cards View"
              aria-label="Grid Cards View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content (Table or Grid View) */}
      {viewMode === 'table' ? (
        <TenantTableView
          tenants={allTenants}
          activeTenantId={activeTenantId}
          onSwitchTenant={handleSwitchTenant}
          onEdit={handleOpenEdit}
          onUploadLogo={handleOpenLogo}
          onToggleStatus={handleToggleStatus}
          onDelete={handleOpenDelete}
        />
      ) : (
        <TenantGridView
          tenants={allTenants}
          activeTenantId={activeTenantId}
          onSwitchTenant={handleSwitchTenant}
          onEdit={handleOpenEdit}
          onUploadLogo={handleOpenLogo}
          onToggleStatus={handleToggleStatus}
          onDelete={handleOpenDelete}
        />
      )}

      {/* Pagination Controls */}
      {tenantsResponse && tenantsResponse.total_pages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 mt-6 text-sm text-muted-foreground bg-transparent">
          <div>
            Showing <span className="font-semibold text-foreground">{(page - 1) * pageSize + 1}</span> to <span className="font-semibold text-foreground">{Math.min(page * pageSize, tenantsResponse.total)}</span> of <span className="font-semibold text-foreground">{tenantsResponse.total}</span> schools
          </div>
          
          <div className="flex items-center gap-1 font-medium select-none">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2 py-1 flex items-center gap-1 hover:text-foreground disabled:opacity-50 disabled:hover:text-muted-foreground transition-colors"
            >
              &laquo; prev
            </button>
            
            <div className="flex items-center gap-0.5 px-2">
              {Array.from({ length: tenantsResponse.total_pages }).map((_, i) => {
                const p = i + 1;
                // Simple logic to show current, prev, next, first, last
                if (p === 1 || p === tenantsResponse.total_pages || Math.abs(p - page) <= 1) {
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                        page === p
                          ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                          : 'hover:bg-muted/50 hover:text-foreground'
                      }`}
                    >
                      {p}
                    </button>
                  );
                } else if (p === 2 && page > 3) {
                  return <span key="dots-1" className="px-1 text-muted-foreground/50">...</span>;
                } else if (p === tenantsResponse.total_pages - 1 && page < tenantsResponse.total_pages - 2) {
                  return <span key="dots-2" className="px-1 text-muted-foreground/50">...</span>;
                }
                return null;
              })}
            </div>

            <button
              onClick={() => setPage((p) => Math.min(tenantsResponse.total_pages, p + 1))}
              disabled={page === tenantsResponse.total_pages}
              className="px-2 py-1 flex items-center gap-1 hover:text-foreground disabled:opacity-50 disabled:hover:text-muted-foreground transition-colors"
            >
              next &raquo;
            </button>
          </div>
        </div>
      )}

      {/* Dialog Modals */}
      <TenantFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        tenantToEdit={tenantToEdit}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <TenantLogoDialog
        open={logoDialogOpen}
        onOpenChange={setLogoDialogOpen}
        tenant={tenantForLogo}
        onUpload={handleLogoUpload}
        isUploading={uploadLogoMutation.isPending}
      />

      <TenantDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        tenant={tenantToDelete}
        onConfirmDelete={handleDeleteConfirm}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
};
