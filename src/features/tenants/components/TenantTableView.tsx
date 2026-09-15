import React from 'react';
import { Link } from '@tanstack/react-router';
import {
  Building2,
  Mail,
  Phone,
  MoreVertical,
  Edit2,
  Image,
  Trash2,
  Power,
  PowerOff,
  Globe,
  Sparkles,
  BarChart2,
  Shield,
  UserPlus,
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
import { cn } from '@/lib/utils';
import type { Tenant, TenantDirectoryItemDTO } from '../types';

interface TenantTableViewProps {
  tenants: (TenantDirectoryItemDTO | Tenant)[];
  activeTenantId: string | null;
  onSwitchTenant: (tenant: any) => void;
  onEdit: (tenant: any) => void;
  onUploadLogo: (tenant: any) => void;
  onToggleStatus: (tenant: any) => void;
  onDelete: (tenant: any) => void;
  onManageAdmins?: (tenant: any) => void;
}

export const TenantTableView: React.FC<TenantTableViewProps> = ({
  tenants,
  activeTenantId,
  onSwitchTenant,
  onEdit,
  onUploadLogo,
  onToggleStatus,
  onDelete,
  onManageAdmins,
}) => {
  const columns: Column<TenantDirectoryItemDTO | Tenant>[] = [
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
                <span className="truncate">{tenant.domain_name}</span>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Health Metrics',
      cell: (tenant) => {
        const metrics = 'metrics' in tenant ? tenant.metrics : undefined;
        if (!metrics) {
          return <span className="text-xs italic text-muted-foreground/60">No telemetry</span>;
        }

        const attendancePct = metrics.today_attendance_percentage;

        return (
          <div className="space-y-1 text-xs min-w-[170px]">
            <div className="text-foreground font-medium flex items-center gap-1.5 flex-wrap">
              <span>{metrics.total_students ?? 0} Students</span>
              <span className="text-muted-foreground/40">•</span>
              <span>{metrics.total_teachers ?? 0} Teachers</span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Ratio:{' '}
              <span className="font-mono font-medium text-foreground">
                {metrics.student_teacher_ratio ? `${metrics.student_teacher_ratio}:1` : 'N/A'}
              </span>
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <Badge
                variant={attendancePct !== null && attendancePct !== undefined ? 'outline' : 'secondary'}
                className="text-[10px] px-1.5 py-0 font-medium shrink-0"
              >
                {attendancePct !== null && attendancePct !== undefined
                  ? `${attendancePct}%`
                  : 'Pending'}
              </Badge>
              {attendancePct !== null && attendancePct !== undefined && (
                <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden shrink-0">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, attendancePct))}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: 'School Administrator',
      cell: (tenant) => {
        const admin = 'admin' in tenant ? tenant.admin : undefined;

        if (admin) {
          return (
            <div
              onClick={() => onManageAdmins?.(tenant)}
              className={cn(
                'space-y-0.5 text-xs text-left group min-w-[150px]',
                onManageAdmins && 'cursor-pointer'
              )}
              title={onManageAdmins ? 'Click to manage school administrators' : undefined}
            >
              <div className="flex items-center gap-1.5 font-semibold text-foreground group-hover:text-primary transition-colors">
                <Shield className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="truncate">
                  {admin.first_name} {admin.last_name}
                </span>
              </div>
              {admin.email && (
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
                  <Mail className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                  <span className="truncate">{admin.email}</span>
                </div>
              )}
              {admin.phone && (
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate font-mono">
                  <Phone className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                  <span>{admin.phone}</span>
                </div>
              )}
            </div>
          );
        }

        return (
          <div className="flex items-center gap-2 min-w-[140px]">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 text-muted-foreground">
              Unassigned
            </Badge>
            {onManageAdmins && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onManageAdmins(tenant)}
                className="h-6 px-2 text-[11px] font-semibold text-primary hover:text-primary hover:bg-primary/10 rounded-lg"
              >
                <UserPlus className="h-3 w-3 mr-1" />
                Assign
              </Button>
            )}
          </div>
        );
      },
    },
    {
      header: 'Contact & Status',
      cell: (tenant) => (
        <div className="space-y-1 text-xs min-w-[140px]">
          <div>
            {tenant.is_active ? (
              <Badge variant="success" className="text-[10px] px-2 py-0.5 font-semibold">
                Active
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-[10px] px-2 py-0.5 font-semibold">
                Suspended
              </Badge>
            )}
          </div>
          <div className="space-y-0.5 text-muted-foreground">
            {tenant.email ? (
              <div className="flex items-center gap-1.5 truncate">
                <Mail className="h-3 w-3 shrink-0 text-muted-foreground/80" />
                <span className="truncate">{tenant.email}</span>
              </div>
            ) : (
              <span className="text-[11px] italic text-muted-foreground/60">No email</span>
            )}
            {tenant.phone && (
              <div className="flex items-center gap-1.5 truncate font-mono text-[11px]">
                <Phone className="h-3 w-3 shrink-0 text-muted-foreground/80" />
                <span>{tenant.phone}</span>
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right min-w-[190px]',
      cell: (tenant) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button asChild variant="outline" size="sm" className="h-8 text-xs font-semibold gap-1">
            <Link to={'/tenants/$tenantId' as any} params={{ tenantId: tenant.id } as any}>
              <BarChart2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">360° Analytics</span>
              <span className="sm:hidden">360°</span>
            </Link>
          </Button>

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
                <span>Switch School Scope</span>
              </DropdownMenuItem>

              {onManageAdmins && (
                <DropdownMenuItem
                  onClick={() => onManageAdmins(tenant)}
                  className="cursor-pointer text-xs font-medium"
                >
                  <Shield className="h-3.5 w-3.5 mr-2 text-primary" />
                  <span>Manage School Administrators</span>
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                onClick={() => onEdit(tenant)}
                className="cursor-pointer text-xs"
              >
                <Edit2 className="h-3.5 w-3.5 mr-2" />
                <span>Edit School Info</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => onUploadLogo(tenant)}
                className="cursor-pointer text-xs"
              >
                <Image className="h-3.5 w-3.5 mr-2" />
                <span>Update School Logo</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => onToggleStatus(tenant)}
                className="cursor-pointer text-xs"
              >
                {tenant.is_active ? (
                  <>
                    <PowerOff className="h-3.5 w-3.5 mr-2 text-amber-500" />
                    <span>Suspend School</span>
                  </>
                ) : (
                  <>
                    <Power className="h-3.5 w-3.5 mr-2 text-emerald-500" />
                    <span>Reactivate School</span>
                  </>
                )}
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(tenant)}
                className="cursor-pointer text-xs font-semibold text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                <span>Delete School</span>
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
