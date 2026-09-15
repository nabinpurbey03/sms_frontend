import React, { useState, useEffect } from 'react';
import { Phone, Mail, User, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAssignTenantAdmin } from '../hooks';
import type { TenantAdminAssignRequest } from '../types';
import { cn } from '@/lib/utils';

export interface TenantAdminAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  tenantName: string;
  onSuccess?: () => void;
}

type AssignMode = 'phone' | 'email' | 'user_id';

export const TenantAdminAssignDialog: React.FC<TenantAdminAssignDialogProps> = ({
  open,
  onOpenChange,
  tenantId,
  tenantName,
  onSuccess,
}) => {
  const [mode, setMode] = useState<AssignMode>('phone');
  const [inputValue, setInputValue] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const assignMutation = useAssignTenantAdmin();

  // Reset form state on open or close
  useEffect(() => {
    if (open) {
      setMode('phone');
      setInputValue('');
      setValidationError(null);
    }
  }, [open]);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setInputValue('');
      setValidationError(null);
    }
    onOpenChange(isOpen);
  };

  const handleModeChange = (newMode: AssignMode) => {
    setMode(newMode);
    setInputValue('');
    setValidationError(null);
  };

  const validate = (): boolean => {
    const trimmed = inputValue.trim();

    if (mode === 'phone') {
      if (!trimmed) {
        setValidationError('Phone number is required');
        return false;
      }
      const digits = trimmed.replace(/[\s-+]/g, '');
      if (digits.length < 7 || digits.length > 15) {
        setValidationError('Please enter a valid phone number (e.g. 98XXXXXXXX or +977-98XXXXXXXX)');
        return false;
      }
    } else if (mode === 'email') {
      if (!trimmed) {
        setValidationError('Email address is required');
        return false;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmed)) {
        setValidationError('Please enter a valid email address (e.g. principal@example.com)');
        return false;
      }
    } else if (mode === 'user_id') {
      if (!trimmed) {
        setValidationError('User ID is required');
        return false;
      }
      if (trimmed.length < 8) {
        setValidationError('Please enter a valid User UUID');
        return false;
      }
    }

    setValidationError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const trimmed = inputValue.trim();
    const payload: TenantAdminAssignRequest = {};

    if (mode === 'phone') {
      payload.phone = trimmed;
    } else if (mode === 'email') {
      payload.email = trimmed;
    } else if (mode === 'user_id') {
      payload.user_id = trimmed;
    }

    try {
      await assignMutation.mutateAsync({
        tenantId,
        payload,
      });
      onSuccess?.();
      handleOpenChange(false);
    } catch {
      // Error notifications are handled by the useAssignTenantAdmin mutation hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 rounded-2xl border-border shadow-2xl overflow-hidden">
        <DialogHeader className="p-5 sm:p-6 pb-4 border-b bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary shrink-0">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Assign School Administrator
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Assign an existing user as administrator for{' '}
                <span className="font-semibold text-foreground">{tenantName}</span>.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="p-5 sm:p-6 space-y-5">
            {/* Mode Selector Pill Buttons */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">Assignment Method</Label>
              <div className="flex flex-wrap gap-1.5 p-1 bg-muted/60 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleModeChange('phone')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                    mode === 'phone'
                      ? 'bg-background text-foreground shadow-sm font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>Phone Number</span>
                  <span className="text-[10px] uppercase font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                    Recommended
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('email')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                    mode === 'email'
                      ? 'bg-background text-foreground shadow-sm font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>Email Address</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('user_id')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                    mode === 'user_id'
                      ? 'bg-background text-foreground shadow-sm font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <User className="h-3.5 w-3.5" />
                  <span>User ID</span>
                </button>
              </div>
            </div>

            {/* Mode-Specific Primary Input */}
            <div className="space-y-1.5">
              <Label htmlFor="admin-identifier" className="text-xs font-semibold text-foreground">
                {mode === 'phone' && 'Administrator Phone Number'}
                {mode === 'email' && 'Administrator Email Address'}
                {mode === 'user_id' && 'User ID (UUID)'}
              </Label>

              <div className="relative">
                <Input
                  id="admin-identifier"
                  type={mode === 'email' ? 'email' : mode === 'phone' ? 'tel' : 'text'}
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder={
                    mode === 'phone'
                      ? '98XXXXXXXX or +977-98XXXXXXXX'
                      : mode === 'email'
                        ? 'principal@example.com'
                        : 'User UUID (e.g. 123e4567-e89b-...)'
                  }
                  className={cn(
                    'h-10 text-sm rounded-xl',
                    validationError && 'border-destructive focus-visible:ring-destructive'
                  )}
                  disabled={assignMutation.isPending}
                  autoFocus
                />
              </div>

              <p className="text-xs text-muted-foreground">
                {mode === 'phone' &&
                  'Assigns the existing registered user with this phone as School Administrator.'}
                {mode === 'email' &&
                  'Assigns the existing registered user with this email as School Administrator.'}
                {mode === 'user_id' &&
                  'Assigns the user directly using their system UUID.'}
              </p>

              {validationError && (
                <div className="flex items-center gap-1.5 text-xs text-destructive font-medium pt-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="p-4 border-t bg-muted/10 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenChange(false)}
              disabled={assignMutation.isPending}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={assignMutation.isPending || !inputValue.trim()}
              className="gap-2 rounded-xl text-xs font-semibold"
            >
              {assignMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Assigning...</span>
                </>
              ) : (
                'Assign Administrator'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
