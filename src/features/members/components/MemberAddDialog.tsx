import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  GraduationCap,
  HeartHandshake,
  Shield,
  ShieldCheck,
  Search,
  Loader2,
  Smartphone,
  Copy,
  CheckCircle2,
  UserCheck,
  AlertCircle,
  RefreshCw,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/auth/useAuth';
import { membersApi } from '../api';
import type {
  TenantMemberCreateDTO,
  RegisteredUserSearchResult,
} from '../types';

interface MemberAddDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TenantMemberCreateDTO) => Promise<any>;
  isLoading: boolean;
  canCreateAdminRoles?: boolean;
  tenantId?: string | null;
}

const ROLE_OPTIONS: Array<{
  id: TenantMemberCreateDTO['role'];
  label: string;
  desc: string;
  icon: React.ElementType;
  color: string;
  badge: string;
}> = [
  {
    id: 'TEACHER',
    label: 'Teacher',
    desc: 'Instructs classes, takes attendance, grades subjects',
    icon: GraduationCap,
    color: 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  },
  {
    id: 'PARENT',
    label: 'Parent / Guardian',
    desc: 'Views attendance, reports & notices of linked students',
    icon: HeartHandshake,
    color: 'text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10',
    badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  },
  {
    id: 'OFFICE_ADMIN',
    label: 'Office Admin',
    desc: 'Manages school operations, classes, and student rosters',
    icon: Shield,
    color: 'text-indigo-600 dark:text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
    badge: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400',
  },
  {
    id: 'ADMIN',
    label: 'School Admin (Principal)',
    desc: 'Full administrative authority across the entire school',
    icon: ShieldCheck,
    color: 'text-purple-600 dark:text-purple-400 border-purple-500/30 bg-purple-500/10',
    badge: 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
  },
];

export const MemberAddDialog: React.FC<MemberAddDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  canCreateAdminRoles = true,
  tenantId: propTenantId,
}) => {
  const { activeTenantId } = useAuth();
  const tenantId = propTenantId || activeTenantId;

  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<TenantMemberCreateDTO['role']>('TEACHER');
  const [searchState, setSearchState] = useState<'idle' | 'searching' | 'found' | 'not_found'>('idle');
  const [searchedUser, setSearchedUser] = useState<RegisteredUserSearchResult | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const resetForm = () => {
    setPhone('');
    setRole('TEACHER');
    setSearchState('idle');
    setSearchedUser(null);
    setCopiedLink(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPhone = phone.trim().replace(/[^0-9]/g, '');

    if (!cleanPhone) {
      toast.error('Mobile Number Required', {
        description: 'Please enter a 10-digit mobile number to search.',
      });
      return;
    }

    if (!/^(98|97)\d{8}$/.test(cleanPhone)) {
      toast.error('Invalid Mobile Number', {
        description: 'Mobile number must be a valid 10-digit number starting with 98 or 97.',
      });
      return;
    }

    if (!tenantId) {
      toast.error('No Active School', {
        description: 'Please select a school before searching members.',
      });
      return;
    }

    setSearchState('searching');
    setSearchedUser(null);

    try {
      const user = await membersApi.searchUserByPhone(tenantId, cleanPhone);
      setSearchedUser(user);
      setSearchState('found');
    } catch {
      setSearchState('not_found');
      setSearchedUser(null);
    }
  };

  const handleAssignSubmit = async () => {
    if (!searchedUser || !tenantId) return;

    await onSubmit({
      phone: searchedUser.phone,
      user_id: searchedUser.id,
      first_name: searchedUser.first_name,
      middle_name: searchedUser.middle_name || undefined,
      last_name: searchedUser.last_name,
      email: searchedUser.email,
      role,
    });

    handleClose();
  };

  const handleCopyRegisterLink = () => {
    const registerUrl = `${window.location.origin}/register`;
    navigator.clipboard.writeText(registerUrl);
    setCopiedLink(true);
    toast.success('Registration Link Copied', {
      description: 'Send this link to the teacher or parent so they can create their account.',
    });
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const userInitials = searchedUser
    ? `${searchedUser.first_name.charAt(0)}${searchedUser.last_name.charAt(0)}`.toUpperCase()
    : 'U';

  const userFullName = searchedUser
    ? [searchedUser.first_name, searchedUser.middle_name, searchedUser.last_name].filter(Boolean).join(' ')
    : '';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border/70 bg-muted/20">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <UserPlus className="w-4 h-4" />
              </span>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Member Association
              </span>
            </div>
            <DialogTitle className="text-xl font-bold text-foreground">
              Associate Member by Phone
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Search a registered teacher or parent by their 10-digit mobile number to onboard them into this school.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Step 1: Phone Search Form */}
          <div className="space-y-2">
            <Label htmlFor="search-phone" className="text-xs font-semibold text-foreground">
              Registered Mobile Phone <span className="text-destructive">*</span>
            </Label>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-muted-foreground pointer-events-none">
                  <Smartphone className="w-4 h-4" />
                  <span className="text-xs font-medium border-r border-border pr-2">+977</span>
                </div>
                <Input
                  id="search-phone"
                  type="tel"
                  placeholder="98XXXXXXXX / 97XXXXXXXX"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (searchState !== 'idle') {
                      setSearchState('idle');
                    }
                  }}
                  disabled={searchState === 'searching' || isLoading}
                  className="pl-24 text-sm font-medium tracking-wide"
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                disabled={!phone.trim() || searchState === 'searching' || isLoading}
                className="gap-1.5 shrink-0 px-4"
              >
                {searchState === 'searching' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Search User
                  </>
                )}
              </Button>
            </form>
            <p className="text-[11px] text-muted-foreground">
              Users must have registered their account with this mobile phone on Schools Up Pro.
            </p>
          </div>

          {/* Step 2: Search Results Display */}

          {/* State A: User Found */}
          {searchState === 'found' && searchedUser && (
            <div className="space-y-4 pt-1 animate-in fade-in-50 duration-200">
              {/* Found User Profile Card */}
              <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11 border-2 border-emerald-500/30 bg-emerald-500/10">
                      <AvatarFallback className="text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-foreground">{userFullName}</h4>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                          <UserCheck className="w-3 h-3" /> Registered
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{searchedUser.email}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchState('idle');
                      setSearchedUser(null);
                      setPhone('');
                    }}
                    className="h-8 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" />
                    Search Another
                  </Button>
                </div>

                <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Phone: <strong className="text-foreground">+977 {searchedUser.phone}</strong>
                  </span>
                  <span className="font-mono text-[11px]">ID: {searchedUser.id.slice(0, 8)}...</span>
                </div>
              </div>

              {/* Step 3: Role Selection */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">
                  Select Role to Assign in this School <span className="text-destructive">*</span>
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {ROLE_OPTIONS.filter((opt) => {
                    if (!canCreateAdminRoles && (opt.id === 'ADMIN' || opt.id === 'OFFICE_ADMIN')) {
                      return false;
                    }
                    return true;
                  }).map((opt) => {
                    const isSelected = role === opt.id;
                    const IconComponent = opt.icon;

                    return (
                      <div
                        key={opt.id}
                        onClick={() => setRole(opt.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/5 shadow-xs ring-1 ring-primary'
                            : 'border-border/70 hover:border-border hover:bg-muted/30'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={`p-2 rounded-lg shrink-0 ${opt.color}`}>
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold text-foreground">{opt.label}</span>
                              {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />}
                            </div>
                            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                              {opt.desc}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* State B: Not Found Notice */}
          {searchState === 'not_found' && (
            <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-3 animate-in fade-in-50 duration-200">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-foreground">
                    No Registered User Found
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    There is currently no account registered with phone number{' '}
                    <strong className="text-foreground">+977 {phone}</strong>.
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Users must create their account on the Schools Up Pro portal first. Once registered,
                    you will be able to search them here and assign their teaching or guardian role.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-amber-500/20 flex flex-wrap items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyRegisterLink}
                  className="gap-1.5 text-xs h-8"
                >
                  {copiedLink ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Portal Sign-Up Link
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchState('idle');
                    setPhone('');
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground h-8"
                >
                  Try Another Number
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-border/70 bg-muted/10">
          <DialogFooter className="flex-row items-center justify-between sm:justify-between w-full">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="text-xs"
            >
              Cancel
            </Button>

            {searchState === 'found' && (
              <Button
                type="button"
                onClick={handleAssignSubmit}
                disabled={isLoading || !searchedUser}
                className="gap-1.5 text-xs font-semibold shadow-md shadow-primary/20"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Assign Role to Member
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
