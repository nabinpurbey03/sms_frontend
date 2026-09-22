import React from 'react';
import { Link } from '@tanstack/react-router';
import {
  Building2,
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
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
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
import { TenantLogoAvatar } from './TenantLogoAvatar';
import type { Tenant, TenantDirectoryItemDTO } from '../types';

interface TenantGridViewProps {
  tenants: (TenantDirectoryItemDTO | Tenant)[];
  activeTenantId: string | null;
  onSwitchTenant: (tenant: any) => void;
  onEdit: (tenant: any) => void;
  onUploadLogo: (tenant: any) => void;
  onToggleStatus: (tenant: any) => void;
  onDelete: (tenant: any) => void;
  onManageAdmins?: (tenant: any) => void;
}

export const TenantGridView: React.FC<TenantGridViewProps> = ({
  tenants,
  activeTenantId,
  onSwitchTenant,
  onEdit,
  onUploadLogo,
  onToggleStatus,
  onDelete,
  onManageAdmins,
}) => {
  if (tenants.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-card/60 space-y-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted mx-auto text-muted-foreground">
          <Building2 className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold text-foreground">No School Tenants Found</p>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          No schools match your search query or status filter. Try clearing filters or provision a new school.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tenants.map((tenant) => {
        const isCurrentActive = tenant.id === activeTenantId;
        const metrics = 'metrics' in tenant ? tenant.metrics : undefined;
        const admin = 'admin' in tenant ? tenant.admin : undefined;

        return (
          <Card
            key={tenant.id}
            className={`flex flex-col justify-between rounded-2xl border transition-all duration-200 hover:shadow-lg bg-card ${
              isCurrentActive
                ? 'border-primary shadow-md ring-1 ring-primary/40'
                : 'border-border/70 hover:border-border'
            }`}
          >
            {/* Card Header */}
            <CardHeader className="p-4 sm:p-5 pb-3">
              <div className="flex items-start justify-between gap-3">
                {/* Logo & School Name */}
                <div className="flex items-start gap-3 min-w-0">
                  <TenantLogoAvatar
                    logoUrl={tenant.logo_url}
                    name={tenant.name}
                    className="h-12 w-12 min-h-[48px] min-w-[48px]"
                    iconClassName="h-6 w-6"
                    onClick={() => onUploadLogo(tenant)}
                    editable={true}
                  />

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-bold text-sm text-foreground leading-tight truncate">
                        {tenant.name}
                      </h3>
                      {isCurrentActive && (
                        <Badge variant="purple" className="text-[9px] px-1.5 py-0">
                          Active Scope
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                      <Globe className="h-3 w-3 shrink-0 text-primary" />
                      <span className="truncate">{tenant.domain_name}</span>
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="shrink-0">
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
              </div>
            </CardHeader>

            {/* Card Body: Health Metrics & Administrator */}
            <CardContent className="p-4 sm:p-5 pt-0 space-y-3">
              {/* 3-Column Health Metrics Grid */}
              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-muted/30 border border-border/50 text-center">
                <div className="space-y-0.5">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider font-mono">
                    Students
                  </div>
                  <div className="text-sm font-bold text-foreground">
                    {metrics?.total_students ?? 0}
                  </div>
                </div>
                <div className="space-y-0.5 border-x border-border/40 px-1">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider font-mono">
                    Staff / Ratio
                  </div>
                  <div className="text-sm font-bold text-foreground">
                    {metrics?.total_teachers ?? 0}
                    <span className="text-[10px] font-normal text-muted-foreground ml-1">
                      ({metrics?.student_teacher_ratio ? `${metrics.student_teacher_ratio}:1` : 'N/A'})
                    </span>
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider font-mono">
                    Attendance
                  </div>
                  <div className="text-sm font-bold text-foreground">
                    {metrics?.today_attendance_percentage !== null &&
                    metrics?.today_attendance_percentage !== undefined
                      ? `${metrics.today_attendance_percentage}%`
                      : 'Pending'}
                  </div>
                </div>
              </div>

              {/* Administrator Section */}
              {admin ? (
                <div
                  onClick={() => onManageAdmins?.(tenant)}
                  className={cn(
                    'flex items-center justify-between p-2.5 rounded-xl bg-muted/20 border border-border/40 text-xs transition-colors',
                    onManageAdmins && 'cursor-pointer hover:bg-muted/40 hover:border-primary/30'
                  )}
                  title={onManageAdmins ? 'Click to manage school administrators' : undefined}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Shield className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate text-xs">
                        {admin.first_name} {admin.last_name}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate font-mono">
                        {admin.phone || admin.email || 'Administrator'}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-medium shrink-0">
                    Admin
                  </Badge>
                </div>
              ) : (
                <div className="flex items-center justify-between p-2 rounded-xl bg-muted/20 border border-dashed border-border/60 text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Shield className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                    <span className="text-[11px]">No Admin Assigned</span>
                  </div>
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
              )}
            </CardContent>

            {/* Card Footer */}
            <CardFooter className="p-4 sm:p-5 pt-2 border-t flex items-center gap-2">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold gap-1.5 flex-1"
              >
                <Link to={'/tenants/$tenantId' as any} params={{ tenantId: tenant.id } as any}>
                  <BarChart2 className="h-3.5 w-3.5" />
                  <span>360° Analytics</span>
                </Link>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground shrink-0"
                    aria-label="School Actions"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel className="text-xs">
                    School Administration
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={() => onSwitchTenant(tenant)}
                    className="cursor-pointer text-xs font-semibold text-primary"
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-2 text-primary" />
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
                        <span>Suspend School</span>
                      </>
                    ) : (
                      <>
                        <Power className="h-3.5 w-3.5 mr-2 text-emerald-500" />
                        <span>Activate School</span>
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
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
};
