import React, { useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { useUserMemberships } from '../api';
import { Loader2, School, Shield, AlertCircle } from 'lucide-react';
import type { PlatformUser } from '../api';
import { toast } from 'sonner';

interface UserMembershipsDrawerProps {
  user: PlatformUser | null;
  isOpen: boolean;
  onClose: () => void;
}

export const UserMembershipsDrawer: React.FC<UserMembershipsDrawerProps> = ({
  user,
  isOpen,
  onClose,
}) => {
  const { data: memberships, isLoading, isError, error } = useUserMemberships(user?.id ?? null);

  useEffect(() => {
    if (isError && error) {
      toast.error(error.message || 'Failed to load user memberships');
    }
  }, [isError, error]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>User Memberships</SheetTitle>
          <SheetDescription>
            {user ? `Memberships for ${user.first_name} ${user.last_name}` : 'Loading...'}
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p>Loading memberships...</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-10 text-destructive border-destructive/20 border rounded-lg bg-destructive/10">
            <AlertCircle className="w-10 h-10 mb-3 text-destructive" />
            <p className="text-center font-medium">Failed to load memberships.</p>
            <p className="text-sm opacity-80 mt-1">{error?.message}</p>
          </div>
        ) : !memberships || memberships.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground border rounded-lg bg-muted/20">
            <School className="w-10 h-10 mb-3 text-muted-foreground/50" />
            <p>No memberships found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {memberships.map((membership) => (
              <div
                key={membership.id || membership.tenant_id}
                className="p-4 border rounded-lg bg-card shadow-sm space-y-3"
              >
                <div className="flex items-center gap-2">
                  <School className="w-4 h-4 text-primary" />
                  <span className="font-medium">{membership.tenant_name}</span>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  {membership.roles?.length ? (
                    membership.roles.map((role) => (
                      <Badge key={role} variant="secondary" className="capitalize">
                        {role.replace(/_/g, ' ').toLowerCase()}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No roles assigned</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
