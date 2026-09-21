import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  GraduationCap,
  Shield,
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
import { usePermission } from '@/auth/usePermission';
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
  currentUserRole?: string | null;
}

export const MemberAddDialog: React.FC<MemberAddDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  tenantId: propTenantId,
  currentUserRole,
}) => {
  const { activeTenantId, activeRole: authRole } = useAuth();
  const { isSuperAdmin } = usePermission();
  const tenantId = propTenantId || activeTenantId;

  // Determine permission level:
  // Admin (and Super Admin) can add: Teacher, Office Admin
  // Office Admin can only add: Teacher
  const effectiveRole = currentUserRole || authRole;
  const isOfficeAdmin = effectiveRole === 'OFFICE_ADMIN' && !isSuperAdmin;

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

    if (!/^(98|97|96)\d{8}$/.test(cleanPhone)) {
      toast.error('Invalid Mobile Number', {
        description: 'Mobile number must be a valid 10-digit number starting with 98, 97, or 96.',
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
      // Always reset role to TEACHER when a new user is found
      setRole('TEACHER');
    } catch {
      setSearchState('not_found');
      setSearchedUser(null);
    }
  };

  const handleAssignSubmit = async () => {
    if (!searchedUser || !tenantId) return;

    // Enforce role restriction: Office Admin can only assign TEACHER
    const finalRole: TenantMemberCreateDTO['role'] = isOfficeAdmin ? 'TEACHER' : role;

    await onSubmit({
      phone: searchedUser.phone,
      user_id: searchedUser.id,
      first_name: searchedUser.first_name,
      middle_name: searchedUser.middle_name || undefined,
      last_name: searchedUser.last_name,
      email: searchedUser.email,
      role: finalRole,
    });

    handleClose();
  };

  const handleCopyRegisterLink = () => {
    const registerUrl = `${window.location.origin}/register`;
    navigator.clipboard.writeText(registerUrl);
    setCopiedLink(true);
    toast.success('Registration Link Copied', {
      description: 'Send this link to the user so they can create their account.',
    });
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const userInitials = searchedUser
    ? `${searchedUser.first_name.charAt(0)}${searchedUser.last_name.charAt(0)}`.toUpperCase()
    : 'U';

  const userFullName = searchedUser
    ? [searchedUser.first_name, searchedUser.middle_name, searchedUser.last_name].filter(Boolean).join(' ')
    : '';

  const targetRoleLabel = isOfficeAdmin
    ? 'Teacher'
    : role === 'OFFICE_ADMIN'
    ? 'Office Admin'
    : 'Teacher';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg md:max-w-xl w-full p-0 gap-0 overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
        {/* Header - Fixed & Sticky at Top */}
        <div className="shrink-0 p-5 sm:p-6 border-b border-border/70 bg-muted/20">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <UserPlus className="w-4 h-4" />
              </span>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Member Onboarding
              </span>
            </div>
            <DialogTitle className="text-xl font-bold text-foreground">
              Add School Member by Phone
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {isOfficeAdmin
                ? 'Search a registered user by their 10-digit mobile number to onboard them as a Teacher.'
                : 'Search a registered user by mobile number to onboard them as a Teacher or Office Admin.'}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Content Body - Smooth Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 min-h-0">
          {/* Step 1: Phone Search Form */}
          {searchState !== 'found' ? (
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
                    className="pl-24 text-sm font-medium tracking-wide h-10"
                    autoFocus
                  />
                </div>
                <Button
                  type="submit"
                  disabled={!phone.trim() || searchState === 'searching' || isLoading}
                  className="gap-1.5 shrink-0 px-4 h-10 font-medium"
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
                Users must have an existing account registered with this phone number.
              </p>
            </div>
          ) : (
            /* Compact Header when user is found so it doesn't take vertical space */
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border/70 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Smartphone className="w-3.5 h-3.5 text-primary" />
                <span>Searched Phone:</span>
                <strong className="text-foreground font-mono">+977 {searchedUser?.phone}</strong>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchState('idle');
                  setSearchedUser(null);
                  setPhone('');
                }}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Change Phone
              </Button>
            </div>
          )}

          {/* Step 2: Search Results Display */}

          {/* State A: User Found */}
          {searchState === 'found' && searchedUser && (
            <div className="space-y-4 animate-in fade-in-50 duration-200">
              {/* Found User Profile Card */}
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-11 w-11 border-2 border-emerald-500/30 bg-emerald-500/10 shrink-0">
                      <AvatarFallback className="text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-foreground truncate">{userFullName}</h4>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                          <UserCheck className="w-3 h-3" /> Registered
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{searchedUser.email}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Phone: <strong className="text-foreground font-mono">+977 {searchedUser.phone}</strong>
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    UID: {searchedUser.id.slice(0, 8)}...
                  </span>
                </div>
              </div>

              {/* Step 3: Role Selection tailored by Permission */}
              {isOfficeAdmin ? (
                /* Office Admin: Can ONLY add Teacher */
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground">
                      Role to Assign in School
                    </Label>
                    <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      Office Admin Access
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shrink-0">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-foreground">Teacher</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                            Faculty
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                          Instructs classes, marks attendance, and grades subjects.
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Assigned</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    As an Office Admin, you have authority to onboard Teachers to the faculty roster.
                  </p>
                </div>
              ) : (
                /* Admin: Can add Teacher and Office Admin */
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">
                    Select Role to Assign in School <span className="text-destructive">*</span>
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Teacher Option */}
                    <div
                      onClick={() => setRole('TEACHER')}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        role === 'TEACHER'
                          ? 'border-emerald-500 bg-emerald-500/10 shadow-xs ring-1 ring-emerald-500'
                          : 'border-border/70 hover:border-border hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="p-2 rounded-lg shrink-0 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 bg-emerald-500/10">
                          <GraduationCap className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-foreground">Teacher</span>
                            {role === 'TEACHER' && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                            Instructs classes, marks attendance, grades subjects.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Office Admin Option */}
                    <div
                      onClick={() => setRole('OFFICE_ADMIN')}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        role === 'OFFICE_ADMIN'
                          ? 'border-indigo-500 bg-indigo-500/10 shadow-xs ring-1 ring-indigo-500'
                          : 'border-border/70 hover:border-border hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="p-2 rounded-lg shrink-0 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 bg-indigo-500/10">
                          <Shield className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-foreground">Office Admin</span>
                            {role === 'OFFICE_ADMIN' && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                            Manages school operations, classes, and rosters.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Inline Primary Action: Instant Click directly beneath the card */}
              <div className="pt-2">
                <Button
                  type="button"
                  onClick={handleAssignSubmit}
                  disabled={isLoading || !searchedUser}
                  className="w-full h-11 text-sm font-semibold gap-2 shadow-md shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer transition-all active:scale-[0.99]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Adding Member...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm & Add as {targetRoleLabel}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* State B: Not Found Notice */}
          {searchState === 'not_found' && (
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3 animate-in fade-in-50 duration-200">
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
                    <strong className="text-foreground font-mono">+977 {phone}</strong>.
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Users must create their account on Schools Up Pro first. Once registered,
                    you will be able to search them here and onboard them to this school.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-amber-500/20 flex flex-wrap items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyRegisterLink}
                  className="gap-1.5 text-xs h-8 cursor-pointer"
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
                  className="text-xs text-muted-foreground hover:text-foreground h-8 cursor-pointer"
                >
                  Try Another Number
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
