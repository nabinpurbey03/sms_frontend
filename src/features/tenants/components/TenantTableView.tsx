import React from 'react';
import {
  Building2,
  MapPin,
  Mail,
  Phone,
  MoreVertical,
  Edit2,
  Image,
  Trash2,
  ExternalLink,
  Power,
  PowerOff,
  Globe,
  Sparkles,
} from 'lucide-react';
import { ResponsiveDataTable, type Column } from '@/components/common/ResponsiveDataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Tenant } from '../types';

interface TenantTableViewProps {
  tenants: Tenant[];
  activeTenantId: string | null;
  onSwitchTenant: (tenant: Tenant) => void;
  onEdit: (tenant: Tenant) => void;
  onUploadLogo: (tenant: Tenant) => void;
  onToggleStatus: (tenant: Tenant) => void;
  onDelete: (tenant: Tenant) => void;
}

export const TenantTableView: React.FC<TenantTableViewProps> = ({
  tenants,
  activeTenantId,
  onSwitchTenant,
  onEdit,
  onUploadLogo,
  onToggleStatus,
  onDelete,
}) => {
  const columns: Column<Tenant>[] = [
    {
      header: 'School Entity',
      accessorKey: 'name',
      cell: (tenant) => {
        const isCurrentActive = tenant.id === activeTenantId;

        return (
          <div className="flex items-center gap-3 py-1">
            <div className="flex h-10 w-10 min-h-[40px] min-w-[40px] items-center justify-center rounded-xl bg-card border border-border/80 shadow-xs overflow-hidden p-1 shrink-0">
              {tenant.logo_url ? (
                <img
                  src={tenant.logo_url}
                  alt={tenant.name}
                  className="h-full w-full object-contain"
                />
              ) : (
                <Building2 className="h-5 w-5 text-primary" />
              )}
            </div>

            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-foreground hover:underline cursor-pointer">
                  {tenant.name}
                </span>
                {isCurrentActive && (
                  <Badge variant="purple" className="text-[9px] px-1.5 py-0">
                    Active Scope
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                <Globe className="h-3 w-3 text-primary shrink-0" />
                <span>{tenant.domain_name}</span>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Contact Info',
      cell: (tenant) => (
        <div className="space-y-0.5 text-xs text-muted-foreground">
          {tenant.email ? (
            <div className="flex items-center gap-1.5 truncate">
              <Mail className="h-3 w-3 shrink-0 text-muted-foreground/80" />
              <span className="truncate">{tenant.email}</span>
            </div>
          ) : (
            <span className="text-[11px] italic text-muted-foreground/60">No email</span>
          )}
          {tenant.phone && (
            <div className="flex items-center gap-1.5 truncate">
              <Phone className="h-3 w-3 shrink-0 text-muted-foreground/80" />
              <span>{tenant.phone}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Geographic Location',
      cell: (tenant) =>
        tenant.address ? (
          <div className="flex items-start gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <span className="line-clamp-2">
              {tenant.address.municipality}-{tenant.address.ward}, {tenant.address.district}
            </span>
          </div>
        ) : (
          <span className="text-xs italic text-muted-foreground/60">Not specified</span>
        ),
    },
    {
      header: 'Portal Status',
      accessorKey: 'is_active',
      cell: (tenant) =>
        tenant.is_active ? (
          <Badge variant="success" className="text-[10px] px-2 py-0.5 font-semibold">
            Active
          </Badge>
        ) : (
          <Badge variant="destructive" className="text-[10px] px-2 py-0.5 font-semibold">
            Inactive
          </Badge>
        ),
    },
    {
      header: 'Created On',
      accessorKey: 'created_at',
      cell: (tenant) => (
        <span className="text-xs font-mono text-muted-foreground">
          {new Date(tenant.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: (tenant) => (
        <div className="flex items-center justify-end gap-1">
          {tenant.id !== activeTenantId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSwitchTenant(tenant)}
              className="h-7 px-2 text-xs font-semibold hidden md:inline-flex"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Switch
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                aria-label="Actions"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="text-xs">School Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => onSwitchTenant(tenant)}
                className="cursor-pointer text-xs font-semibold text-primary"
              >
                <Sparkles className="h-3.5 w-3.5 mr-2" />
                <span>Switch Portal Scope</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => onEdit(tenant)}
                className="cursor-pointer text-xs"
              >
                <Edit2 className="h-3.5 w-3.5 mr-2" />
                <span>Edit School Details</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => onUploadLogo(tenant)}
                className="cursor-pointer text-xs"
              >
                <Image className="h-3.5 w-3.5 mr-2" />
                <span>Upload Brand Logo</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => onToggleStatus(tenant)}
                className="cursor-pointer text-xs"
              >
                {tenant.is_active ? (
                  <>
                    <PowerOff className="h-3.5 w-3.5 mr-2 text-amber-500" />
                    <span>Suspend Portal</span>
                  </>
                ) : (
                  <>
                    <Power className="h-3.5 w-3.5 mr-2 text-emerald-500" />
                    <span>Activate Portal</span>
                  </>
                )}
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(tenant)}
                className="cursor-pointer text-xs font-semibold text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                <span>Hard Delete School</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <ResponsiveDataTable
      data={tenants}
      columns={columns}
      keyExtractor={(item) => item.id}
      emptyMessage="No school tenants match your search query."
    />
  );
};
