import React, { useState } from 'react';
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
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUpdateTenantStatus } from '../hooks';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Tenant } from '../types';

interface TenantGridViewProps {
  tenants: Tenant[];
  activeTenantId: string | null;
  onSwitchTenant: (tenant: Tenant) => void;
  onEdit: (tenant: Tenant) => void;
  onUploadLogo: (tenant: Tenant) => void;
  onToggleStatus: (tenant: Tenant) => void;
  onDelete: (tenant: Tenant) => void;
}

export const TenantGridView: React.FC<TenantGridViewProps> = ({
  tenants,
  activeTenantId,
  onSwitchTenant,
  onEdit,
  onUploadLogo,
  onToggleStatus,
  onDelete,
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
                    <div className="flex h-12 w-12 min-h-[48px] min-w-[48px] items-center justify-center rounded-2xl bg-card border border-border/80 shadow-xs overflow-hidden p-1 shrink-0">
                      {tenant.logo_url ? (
                        <img
                          src={tenant.logo_url}
                          alt={tenant.name}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <Building2 className="h-6 w-6 text-primary" />
                      )}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-bold text-sm text-foreground leading-tight truncate">
                          {tenant.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                        <Globe className="h-3 w-3 shrink-0 text-primary" />
                        <span className="truncate">{tenant.domain_name}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge & Menu */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {tenant.is_active ? (
                      <Badge variant="success" className="text-[10px] px-2 py-0.5">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px] px-2 py-0.5">
                        Inactive
                      </Badge>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
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
                </div>
              </CardHeader>

              {/* Card Body Contact & Address */}
              <CardContent className="p-4 sm:p-5 pt-0 space-y-2.5">
                {/* Address Badge */}
                <div className="flex items-start gap-1.5 p-2 rounded-xl bg-muted/40 border border-border/50 text-[11px] text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  {tenant.address ? (
                    <span className="line-clamp-1 leading-snug">
                      {tenant.address.municipality}-{tenant.address.ward}, {tenant.address.district},{' '}
                      {tenant.address.province}
                    </span>
                  ) : (
                    <span className="italic text-muted-foreground/80">Address not specified</span>
                  )}
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail className="h-3 w-3 shrink-0 text-muted-foreground/80" />
                    <span className="truncate">{tenant.email || 'No email provided'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <Phone className="h-3 w-3 shrink-0 text-muted-foreground/80" />
                    <span className="truncate">{tenant.phone || 'No phone'}</span>
                  </div>
                </div>
              </CardContent>

              {/* Card Footer Quick Action */}
              <CardFooter className="p-4 sm:p-5 pt-2 border-t flex items-center justify-between gap-2">
                <span className="text-[10px] text-muted-foreground font-mono">
                  Added {new Date(tenant.created_at).toLocaleDateString()}
                </span>

                {isCurrentActive ? (
                  <Badge variant="purple" className="text-[10px] px-2 py-0.5 font-bold">
                    Active Scope
                  </Badge>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSwitchTenant(tenant)}
                    className="h-7 text-xs font-semibold hover:bg-primary hover:text-primary-foreground border-border/80"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Switch Scope
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
  );
};
