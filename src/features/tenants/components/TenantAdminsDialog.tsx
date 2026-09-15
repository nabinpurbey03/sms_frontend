import React, { useState } from 'react';
import {
  Shield,
  ShieldAlert,
  UserPlus,
  Mail,
  Phone,
  Calendar,
  User,
  RefreshCw,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTenantAdmins } from '../hooks';
import type { TenantAdminResponseDTO } from '../types';
import { TenantAdminAssignDialog } from './TenantAdminAssignDialog';

export interface TenantAdminsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  tenantName: string;
}

export const TenantAdminsDialog: React.FC<TenantAdminsDialogProps> = ({
  open,
  onOpenChange,
  tenantId,
  tenantName,
}) => {
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  const {
    data: admins = [],
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useTenantAdmins(tenantId, { enabled: open && Boolean(tenantId) });

  const adminList = Array.isArray(admins) ? admins : [];

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(new Date(dateString));
    } catch {
      return dateString;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[620px] p-0 rounded-2xl border-border shadow-2xl overflow-hidden">
          {/* Header */}
          <DialogHeader className="p-5 sm:p-6 pb-4 border-b bg-muted/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary shrink-0">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-foreground">
                    School Administrators
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Authorized administrators managing{' '}
                    <span className="font-semibold text-foreground">{tenantName}</span>
                  </DialogDescription>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => refetch()}
                  disabled={isFetching}
                  title="Refresh administrators list"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                </Button>
                <Button
                  size="sm"
                  onClick={() => setAssignDialogOpen(true)}
                  className="gap-1.5 shadow-sm font-semibold rounded-xl text-xs"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>+ Assign Administrator</span>
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Dialog Body Content */}
          <div className="p-5 sm:p-6 max-h-[420px] overflow-y-auto">
            {/* Loading Skeleton */}
            {isLoading && (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl border border-border bg-card/60 animate-pulse space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-muted" />
                        <div className="space-y-1.5">
                          <div className="h-4 w-32 bg-muted rounded" />
                          <div className="h-3 w-20 bg-muted rounded" />
                        </div>
                      </div>
                      <div className="h-5 w-16 bg-muted rounded-full" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-border/40">
                      <div className="h-3 w-40 bg-muted rounded" />
                      <div className="h-3 w-28 bg-muted rounded" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error State */}
            {!isLoading && isError && (
              <div className="py-10 px-4 text-center space-y-3">
                <div className="h-10 w-10 mx-auto rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Unable to load administrators
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    An error occurred while fetching the administrator list.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  className="rounded-xl text-xs"
                >
                  Try Again
                </Button>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !isError && adminList.length === 0 && (
              <div className="py-10 px-6 flex flex-col items-center justify-center text-center">
                <div className="h-12 w-12 rounded-2xl bg-muted/80 flex items-center justify-center text-muted-foreground mb-3">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-semibold text-foreground">
                  No Administrators Assigned
                </h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  {tenantName} does not have any assigned administrators yet. Assign an
                  administrator to grant them school governance access.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAssignDialogOpen(true)}
                  className="mt-4 gap-1.5 rounded-xl text-xs font-semibold"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Assign First Administrator</span>
                </Button>
              </div>
            )}

            {/* Admin List */}
            {!isLoading && !isError && adminList.length > 0 && (
              <div className="space-y-3">
                {adminList.map((admin: TenantAdminResponseDTO) => {
                  const fullName =
                    [admin.first_name, admin.last_name].filter(Boolean).join(' ').trim() ||
                    'School Administrator';

                  const initials =
                    [admin.first_name?.[0], admin.last_name?.[0]]
                      .filter(Boolean)
                      .join('')
                      .toUpperCase() || 'SA';

                  return (
                    <div
                      key={admin.user_id}
                      className="p-4 rounded-xl border border-border bg-card text-card-foreground shadow-sm hover:border-primary/30 transition-all space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-semibold text-foreground truncate">
                              {fullName}
                            </h4>
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono truncate">
                              <User className="h-3 w-3 shrink-0" />
                              <span className="truncate">{admin.user_id}</span>
                            </div>
                          </div>
                        </div>

                        <Badge
                          variant={admin.is_active ? 'success' : 'secondary'}
                          className="text-[11px] font-semibold px-2 py-0.5 shrink-0"
                        >
                          {admin.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2 truncate">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                          <span className="truncate">{admin.email || 'No email provided'}</span>
                        </div>
                        <div className="flex items-center gap-2 truncate">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                          <span className="truncate">{admin.phone || 'No phone provided'}</span>
                        </div>
                        <div className="flex items-center gap-2 sm:col-span-2 text-[11px] text-muted-foreground/80">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                          <span>Assigned on {formatDate(admin.assigned_at)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="p-4 border-t bg-muted/10 flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nested Assignment Dialog */}
      <TenantAdminAssignDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        tenantId={tenantId}
        tenantName={tenantName}
        onSuccess={() => {
          refetch();
        }}
      />
    </>
  );
};
