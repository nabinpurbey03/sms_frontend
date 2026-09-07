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
import { Badge } from '@/components/ui/badge';
import {
  useTenants,
  useCreateTenant,
  useUpdateTenant,
  useUploadTenantLogo,
  useDeleteTenant,
} from '../hooks';
import { TenantStatsCards } from '../components/TenantStatsCards';
import { TenantFormDialog } from '../components/TenantFormDialog';
import { TenantLogoDialog } from '../components/TenantLogoDialog';
import { TenantDeleteDialog } from '../components/TenantDeleteDialog';
import { TenantGridView } from '../components/TenantGridView';
import { TenantTableView } from '../components/TenantTableView';
import type { Tenant, TenantFormData } from '../types';

export const TenantsPage: React.FC = () => {
  const { isSuperAdmin } = usePermission();
  const { activeTenantId, switchTenant } = useAuth();

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  // Dialog State
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [tenantToEdit, setTenantToEdit] = useState<Tenant | null>(null);

  const [logoDialogOpen, setLogoDialogOpen] = useState(false);
  const [tenantForLogo, setTenantForLogo] = useState<Tenant | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);

  // Queries & Mutations
  const { data: tenantsResponse, isLoading, refetch } = useTenants({
    search: searchQuery,
    is_active:
      statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
  });

  const createMutation = useCreateTenant();
  const updateMutation = useUpdateTenant();
  const uploadLogoMutation = useUploadTenantLogo();
  const deleteMutation = useDeleteTenant();

  const allTenants = useMemo(() => tenantsResponse?.items || [], [tenantsResponse]);

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
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="purple" className="text-[10px] px-2 py-0.5">
              PLATFORM OWNER
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">
              TENANT MANAGEMENT
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            School Tenants Directory
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Register, configure, and oversee institutional school portals across the multi-tenant platform.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-10 px-3 text-xs font-semibold"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>
          <Button
            onClick={handleOpenCreate}
            className="h-10 px-4 text-xs font-bold shadow-md shadow-primary/25"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Register School
          </Button>
        </div>
      </div>

      {/* Summary KPI Stats */}
      <TenantStatsCards tenants={allTenants} isLoading={isLoading} />

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-2xl border bg-card shadow-xs">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by school name, domain slug, or email..."
            className="pl-9 h-10 text-xs rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Status Filter Buttons */}
          <div className="flex items-center rounded-xl border p-1 bg-muted/30">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                statusFilter === 'all'
                  ? 'bg-card text-foreground shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All ({allTenants.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                statusFilter === 'active'
                  ? 'bg-emerald-500 text-white shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                statusFilter === 'inactive'
                  ? 'bg-destructive text-destructive-foreground shadow-xs font-bold'
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
