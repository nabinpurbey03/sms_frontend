import React, { useState, useMemo, useEffect } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Smartphone,
  Search,
  Loader2,
  CheckCircle2,
  HeartHandshake,
  UserCheck,
  Users,
  Star,
  Unlink2,
  UserRoundSearch,
  RefreshCw,
  Phone,
  Copy,
  Check,
  AlertTriangle,
  User,
  Heart,
  Shield,
  ShieldCheck,
  GraduationCap,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAllClassesWithDetails } from '@/features/academic/hooks';
import {
  useSearchUserByPhone,
  useLinkParentToStudent,
  useUnlinkStudentParent,
  useStudentParent,
} from '../hooks';
import type { RegisteredUserSearchResult } from '../types';

interface ParentStudentLinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string | null;
  parent?: {
    id: string;
    name: string;
    phone?: string | null;
  } | null;
  student?: {
    id: string;
    name: string;
    className?: string;
    sectionName?: string;
  } | null;
  onSuccess?: () => void;
}

const RELATIONSHIP_OPTIONS = [
  { id: 'FATHER', label: 'Father', icon: User, desc: 'Paternal guardian' },
  { id: 'MOTHER', label: 'Mother', icon: Heart, desc: 'Maternal guardian' },
  { id: 'GUARDIAN', label: 'Guardian', icon: Shield, desc: 'Legal guardian' },
  { id: 'OTHER', label: 'Other', icon: Users, desc: 'Authorized caretaker' },
];

export const ParentStudentLinkDialog: React.FC<ParentStudentLinkDialogProps> = ({
  isOpen,
  onClose,
  tenantId,
  parent,
  student,
  onSuccess,
}) => {
  const isFromParent = !!parent;
  const isFromStudent = !!student;

  // ─── State ────────────────────────────────────────────────────────────────
  const [searchState, setSearchState] = useState<'idle' | 'verifying' | 'found'>('idle');
  const [foundParent, setFoundParent] = useState<RegisteredUserSearchResult | null>(null);
  const [parentPhone, setParentPhone] = useState<string>(parent?.phone || '');
  const [relationshipType, setRelationshipType] = useState<string>('GUARDIAN');
  const [isPrimaryContact, setIsPrimaryContact] = useState<boolean>(true);
  const [isRelinking, setIsRelinking] = useState<boolean>(false);
  const [isConfirmingUnlink, setIsConfirmingUnlink] = useState<boolean>(false);
  const [copiedPhone, setCopiedPhone] = useState<boolean>(false);

  // Class/section/student select (for the "from parent" flow)
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(student?.id || '');

  // ─── Queries ─────────────────────────────────────────────────────────────
  const { data: classesWithDetails = [], isLoading: isLoadingClasses } =
    useAllClassesWithDetails(tenantId);

  const {
    data: linkedParent,
    isLoading: isLoadingLinkedParent,
    refetch: refetchLinkedParent,
    isFetching: isFetchingLinkedParent,
  } = useStudentParent(tenantId, student?.id || null);

  const searchPhoneMutation = useSearchUserByPhone();
  const linkParentMutation = useLinkParentToStudent();
  const unlinkParentMutation = useUnlinkStudentParent();

  // Reset form when dialog opens or student changes
  const [activeStudentId, setActiveStudentId] = useState<string | null>(
    student?.id || null
  );

  useEffect(() => {
    if (!isOpen) {
      setSearchState('idle');
      setFoundParent(null);
      setParentPhone('');
      setRelationshipType('GUARDIAN');
      setIsPrimaryContact(true);
      setIsRelinking(false);
      setIsConfirmingUnlink(false);
      setSelectedClassId('');
      setSelectedSectionId('');
      setSelectedStudentId(student?.id || '');
    } else {
      if (student?.id && student.id !== activeStudentId) {
        setActiveStudentId(student.id);
      }
      setSearchState('idle');
      setFoundParent(null);
      setRelationshipType('GUARDIAN');
      setIsPrimaryContact(true);
      setIsConfirmingUnlink(false);
    }
  }, [isOpen, student?.id, activeStudentId]);

  const showSearchSection = !isFromParent && (!linkedParent || isRelinking);

  // ─── Derived ─────────────────────────────────────────────────────────────
  const selectedClass = useMemo(
    () => classesWithDetails.find((c) => c.id === selectedClassId),
    [classesWithDetails, selectedClassId]
  );

  const availableStudents = useMemo(() => {
    if (!selectedClass) return [];
    let list = selectedClass.students.filter((s) => s.status === 'ACTIVE');
    if (selectedSectionId && selectedSectionId !== 'ALL') {
      list = list.filter((s) => s.section_id === selectedSectionId);
    }
    return list;
  }, [selectedClass, selectedSectionId]);

  const getRelationshipLabel = (type: string) => {
    const option = RELATIONSHIP_OPTIONS.find((opt) => opt.id === type);
    return option?.label || type;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPhone(true);
    toast.success('Phone Number Copied');
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleSearchPhone = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPhone = parentPhone.trim().replace(/[^0-9]/g, '');
    if (!cleanPhone || !/^(98|97|96)\d{8}$/.test(cleanPhone)) {
      toast.error('Invalid Mobile Number', {
        description: 'Please enter a 10-digit mobile number starting with 98, 97, or 96.',
      });
      return;
    }
    if (!tenantId) return;

    setSearchState('verifying');
    setFoundParent(null);
    try {
      const user = await searchPhoneMutation.mutateAsync({
        tenantId,
        phone: cleanPhone,
      });
      setFoundParent(user);
      setSearchState('found');
    } catch {
      setFoundParent(null);
      setSearchState('idle');
      toast.error('Parent Not Found', {
        description: `No registered account found with phone +977 ${cleanPhone}. The parent must register on Schools Up Pro first.`,
      });
    }
  };

  const handleUnlinkParent = async () => {
    if (!tenantId || !student?.id) return;
    try {
      await unlinkParentMutation.mutateAsync({
        tenantId,
        studentId: student.id,
      });
      setIsRelinking(true);
      setIsConfirmingUnlink(false);
      setFoundParent(null);
      setParentPhone('');
      setSearchState('idle');
      refetchLinkedParent();
    } catch {
      // Toast handled by mutation
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!tenantId) return;

    const targetStudentId = isFromStudent ? student!.id : selectedStudentId;
    if (!targetStudentId) {
      toast.error('Student Selection Required', {
        description: 'Please select an enrolled student to link.',
      });
      return;
    }

    if (!isFromParent && !foundParent && !parentPhone.trim()) {
      toast.error('Parent Information Required', {
        description: 'Please search for a parent by phone number.',
      });
      return;
    }

    const payload: {
      student_id: string;
      relationship_type: string;
      is_primary_contact: boolean;
      parent_id?: string;
      parent_phone?: string;
    } = {
      student_id: targetStudentId,
      relationship_type: relationshipType,
      is_primary_contact: isPrimaryContact,
    };

    if (isFromParent && parent) {
      payload.parent_id = parent.id;
    } else if (foundParent) {
      payload.parent_id = foundParent.id;
      payload.parent_phone = foundParent.phone;
    } else {
      payload.parent_phone = parentPhone.trim().replace(/[^0-9]/g, '');
    }

    try {
      await linkParentMutation.mutateAsync({ tenantId, payload });
      handleClose();
      refetchLinkedParent();
      if (onSuccess) onSuccess();
    } catch {
      // Handled inside mutation hook
    }
  };

  const handleClose = () => {
    setSearchState('idle');
    setFoundParent(null);
    setParentPhone('');
    setRelationshipType('GUARDIAN');
    setIsPrimaryContact(true);
    setIsRelinking(false);
    setIsConfirmingUnlink(false);
    setSelectedClassId('');
    setSelectedSectionId('');
    setSelectedStudentId(student?.id || '');
    onClose();
  };

  const isSubmitting = linkParentMutation.isPending;
  const isSearching = searchPhoneMutation.isPending || searchState === 'verifying';
  const isUnlinking = unlinkParentMutation.isPending;

  const currentRelationshipLabel = getRelationshipLabel(relationshipType);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg md:max-w-xl w-full p-0 gap-0 overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
        {/* ── Fixed Header ── */}
        <div className="shrink-0 p-5 sm:p-6 border-b border-border/70 bg-muted/20">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <HeartHandshake className="w-4 h-4" />
              </span>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Guardian Management
              </span>
            </div>
            <DialogTitle className="text-xl font-bold text-foreground">
              {isFromParent
                ? `Link Student to ${parent?.name}`
                : isFromStudent
                ? `Manage Guardian for ${student?.name}`
                : 'Link Guardian & Student'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {isFromStudent
                ? 'Link a registered parent account for automatic attendance alerts, report cards, and notices.'
                : 'Establish a verified relationship so the guardian can monitor attendance, notices, and grades.'}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* ── Scrollable Body ── */}
        <form
          id="parent-link-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 min-h-0"
        >
          {/* ── Context Card: Student or Parent ── */}
          {isFromStudent && student && (
            <div className="p-3.5 rounded-xl border border-border/70 bg-card shadow-2xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 font-bold text-sm">
                  {student.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-foreground truncate">
                      {student.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                      {student.className || 'Class'}
                      {student.sectionName ? ` · Section ${student.sectionName}` : ''}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Enrolled Pupil Roster
                  </p>
                </div>
              </div>

              <div className="shrink-0">
                {isLoadingLinkedParent ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : linkedParent ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25">
                    <UserRoundSearch className="w-3.5 h-3.5" />
                    No Guardian
                  </span>
                )}
              </div>
            </div>
          )}

          {isFromParent && parent && (
            <div className="p-3.5 rounded-xl border border-border/70 bg-card shadow-2xs flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0 font-bold text-sm">
                  {parent.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <span className="text-xs text-muted-foreground block">Guardian Account:</span>
                  <strong className="text-foreground text-sm font-bold">{parent.name}</strong>
                </div>
              </div>
              {parent.phone && (
                <span className="font-mono text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-md border border-border/60">
                  +977 {parent.phone}
                </span>
              )}
            </div>
          )}

          {/* ── Active Linked Parent Display ── */}
          {isFromStudent && (
            <div className="space-y-3">
              {isLoadingLinkedParent ? (
                <div className="p-6 rounded-xl border border-dashed border-border/80 flex flex-col items-center justify-center text-xs text-muted-foreground gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span>Loading linked guardian record...</span>
                </div>
              ) : linkedParent ? (
                /* ── Linked Parent Card ── */
                <div className="space-y-3">
                  <div className="p-4 rounded-xl border border-indigo-500/25 bg-gradient-to-br from-indigo-500/5 via-card to-background shadow-xs space-y-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-11 w-11 border-2 border-indigo-500/30 bg-indigo-500/10 shrink-0">
                          <AvatarFallback className="text-indigo-700 dark:text-indigo-300 font-bold text-sm">
                            {linkedParent.first_name?.[0]?.toUpperCase() || 'P'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-foreground truncate">
                              {linkedParent.first_name} {linkedParent.last_name}
                            </h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                              {getRelationshipLabel(linkedParent.relationship_type)}
                            </span>
                            {linkedParent.is_primary_contact && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                Primary
                              </span>
                            )}
                          </div>
                          {linkedParent.email && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {linkedParent.email}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action buttons on card */}
                      {!isRelinking && !isConfirmingUnlink && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setIsRelinking(true);
                              setIsConfirmingUnlink(false);
                            }}
                            className="h-8 px-2.5 text-xs gap-1.5 cursor-pointer hover:bg-muted"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Change</span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsConfirmingUnlink(true)}
                            disabled={isUnlinking}
                            className="h-8 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                            title="Unlink guardian"
                          >
                            <Unlink2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Contact information bar */}
                    {linkedParent.phone && (
                      <div className="pt-2.5 border-t border-indigo-500/15 flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>Mobile:</span>
                          <strong className="text-foreground font-mono">+977 {linkedParent.phone}</strong>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(linkedParent.phone!)}
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          {copiedPhone ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600 mr-1" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 mr-1" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Unlink Confirmation Card */}
                  {isConfirmingUnlink && (
                    <div className="p-4 rounded-xl border border-destructive/40 bg-destructive/5 space-y-3 animate-in fade-in-50">
                      <div className="flex items-start gap-2.5 text-xs text-destructive">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-foreground">Confirm Guardian Removal</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Are you sure you want to unlink <strong className="text-foreground">{linkedParent.first_name} {linkedParent.last_name}</strong>? They will immediately lose access to this pupil's attendance and academic reports.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsConfirmingUnlink(false)}
                          disabled={isUnlinking}
                          className="h-8 text-xs cursor-pointer"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={handleUnlinkParent}
                          disabled={isUnlinking}
                          className="h-8 text-xs font-semibold gap-1.5 cursor-pointer"
                        >
                          {isUnlinking ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Unlinking...
                            </>
                          ) : (
                            <>
                              <Unlink2 className="w-3.5 h-3.5" />
                              Confirm Unlink
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Empty state when unlinked */
                <div className="p-5 rounded-xl border border-dashed border-border/80 bg-muted/20 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                    <UserRoundSearch className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-foreground">No Guardian Connected</h5>
                    <p className="text-[11px] text-muted-foreground max-w-xs mx-auto mt-0.5">
                      Enter the parent's registered 10-digit mobile number below to connect them with this student.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Search & Link Form (when replacing or when no parent is linked) ── */}
          {showSearchSection && (
            <div className="space-y-4 pt-1">
              {/* Divider / Section Header */}
              {linkedParent && isRelinking && (
                <div className="flex items-center justify-between pb-1 border-b border-border/60">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <RefreshCw className="w-3.5 h-3.5 text-primary" />
                    <span>Select Replacement Guardian</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsRelinking(false);
                      setFoundParent(null);
                      setParentPhone('');
                      setSearchState('idle');
                    }}
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cancel Replacement
                  </Button>
                </div>
              )}

              {/* Phone Search Box */}
              {searchState !== 'found' ? (
                <div className="space-y-2">
                  <Label htmlFor="parent-search-phone" className="text-xs font-semibold text-foreground">
                    Parent / Guardian Mobile Phone <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-muted-foreground pointer-events-none">
                        <Smartphone className="w-4 h-4" />
                        <span className="text-xs font-medium border-r border-border pr-2">+977</span>
                      </div>
                      <Input
                        id="parent-search-phone"
                        type="tel"
                        placeholder="98XXXXXXXX / 97XXXXXXXX"
                        value={parentPhone}
                        onChange={(e) => {
                          setParentPhone(e.target.value);
                          if (searchState !== 'idle') {
                            setSearchState('idle');
                          }
                        }}
                        disabled={isSearching || isSubmitting}
                        className="pl-24 text-sm font-medium tracking-wide h-10"
                        autoFocus
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={handleSearchPhone}
                      disabled={!parentPhone.trim() || isSearching || isSubmitting}
                      className="gap-1.5 shrink-0 px-4 h-10 font-medium cursor-pointer"
                    >
                      {isSearching ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Searching...</span>
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4" />
                          <span>Find Parent</span>
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Users must have registered their mobile account on Schools Up Pro.
                  </p>
                </div>
              ) : (
                /* Collapsed Search Header when Parent is Found */
                <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border/70 text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Smartphone className="w-3.5 h-3.5 text-primary" />
                    <span>Parent Phone:</span>
                    <strong className="text-foreground font-mono">+977 {foundParent?.phone}</strong>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchState('idle');
                      setFoundParent(null);
                      setParentPhone('');
                    }}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Change Number
                  </Button>
                </div>
              )}

              {/* Found Parent Profile Card */}
              {searchState === 'found' && foundParent && (
                <div className="space-y-4 animate-in fade-in-50 duration-200">
                  <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar className="h-10 w-10 border border-emerald-500/30 bg-emerald-500/20 shrink-0">
                          <AvatarFallback className="text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                            {foundParent.first_name?.[0]?.toUpperCase()}
                            {foundParent.last_name?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">
                              {foundParent.first_name} {foundParent.last_name}
                            </h4>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                              <UserCheck className="w-3 h-3" /> Registered
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{foundParent.email}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Relationship Type Selector Pills */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-foreground">
                      Relationship to Student <span className="text-destructive">*</span>
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {RELATIONSHIP_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        const isSelected = relationshipType === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setRelationshipType(opt.id)}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                              isSelected
                                ? 'border-primary bg-primary/10 ring-1 ring-primary shadow-xs'
                                : 'border-border/70 hover:border-border hover:bg-muted/30'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <Icon className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                              {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-foreground block">{opt.label}</span>
                              <span className="text-[10px] text-muted-foreground line-clamp-1">{opt.desc}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Primary Contact Checkbox Tile */}
                  <div
                    onClick={() => setIsPrimaryContact(!isPrimaryContact)}
                    className="p-3 rounded-xl border border-border/70 bg-card hover:bg-muted/20 cursor-pointer transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <Checkbox
                        id="primary-contact-tile"
                        checked={isPrimaryContact}
                        onCheckedChange={(c) => setIsPrimaryContact(Boolean(c))}
                        disabled={isSubmitting}
                      />
                      <div>
                        <Label htmlFor="primary-contact-tile" className="text-xs font-semibold text-foreground cursor-pointer">
                          Set as Primary Contact
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          Receives automated SMS for daily attendance and exam scores.
                        </p>
                      </div>
                    </div>
                    {isPrimaryContact && (
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                    )}
                  </div>

                  {/* Direct Inline Action Button */}
                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={isSubmitting || !foundParent}
                      className="w-full h-11 text-sm font-semibold gap-2 shadow-md shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer transition-all active:scale-[0.99]"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Linking Guardian...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Confirm & Link as {currentRelationshipLabel}</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Flow From Parent: Select Student ── */}
          {isFromParent && (
            <div className="space-y-3.5 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    Target Class <span className="text-destructive">*</span>
                  </Label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => {
                      setSelectedClassId(e.target.value);
                      setSelectedSectionId('');
                      setSelectedStudentId('');
                    }}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="">-- Select Class --</option>
                    {classesWithDetails.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    Target Section
                  </Label>
                  <select
                    value={selectedSectionId}
                    onChange={(e) => {
                      setSelectedSectionId(e.target.value);
                      setSelectedStudentId('');
                    }}
                    disabled={!selectedClassId}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 cursor-pointer"
                  >
                    <option value="ALL">All Sections</option>
                    {selectedClass?.sections.map((sec) => (
                      <option key={sec.id} value={sec.id}>Section {sec.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Enrolled Student <span className="text-destructive">*</span>
                </Label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  disabled={!selectedClassId || availableStudents.length === 0}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 cursor-pointer"
                >
                  <option value="">
                    {isLoadingClasses
                      ? 'Loading students...'
                      : !selectedClassId
                      ? '-- Choose a class first --'
                      : availableStudents.length === 0
                      ? 'No active students'
                      : '-- Select Student --'}
                  </option>
                  {availableStudents.map((st) => {
                    const fullName = [st.first_name, st.middle_name, st.last_name]
                      .filter(Boolean)
                      .join(' ');
                    return (
                      <option key={st.id} value={st.id}>{fullName}</option>
                    );
                  })}
                </select>
              </div>

              {/* Relationship Type Selector */}
              <div className="space-y-2 pt-1">
                <Label className="text-xs font-semibold text-foreground">
                  Relationship Type <span className="text-destructive">*</span>
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {RELATIONSHIP_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = relationshipType === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setRelationshipType(opt.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                          isSelected
                            ? 'border-primary bg-primary/10 ring-1 ring-primary shadow-xs'
                            : 'border-border/70 hover:border-border hover:bg-muted/30'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                        </div>
                        <span className="text-xs font-bold text-foreground">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Primary Contact */}
              <div
                onClick={() => setIsPrimaryContact(!isPrimaryContact)}
                className="p-3 rounded-xl border border-border/70 bg-card hover:bg-muted/20 cursor-pointer transition-colors flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5">
                  <Checkbox
                    id="parent-primary-contact"
                    checked={isPrimaryContact}
                    onCheckedChange={(c) => setIsPrimaryContact(Boolean(c))}
                  />
                  <Label htmlFor="parent-primary-contact" className="text-xs font-semibold text-foreground cursor-pointer">
                    Primary Contact for Attendance & Reports
                  </Label>
                </div>
                {isPrimaryContact && (
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                )}
              </div>

              {/* Inline Action Button for from-parent flow */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting || !selectedStudentId}
                  className="w-full h-11 text-sm font-semibold gap-2 shadow-md shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer transition-all active:scale-[0.99]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Linking Student...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm & Link Student</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
};
