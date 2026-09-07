import React, { useState, useMemo, useEffect } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
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
  { id: 'FATHER', label: 'Father' },
  { id: 'MOTHER', label: 'Mother' },
  { id: 'GUARDIAN', label: 'Guardian' },
  { id: 'OTHER', label: 'Other' },
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

  // 'search' | 'verifying' | 'found' | 'linking' | 'idle'
  // Controls which search sub-state we're in
  const [searchState, setSearchState] = useState<'idle' | 'verifying' | 'found'>('idle');

  // The parent account found via phone search
  const [foundParent, setFoundParent] = useState<RegisteredUserSearchResult | null>(null);

  // Form fields for the "search parent by phone" flow
  const [parentPhone, setParentPhone] = useState<string>(parent?.phone || '');
  const [relationshipType, setRelationshipType] = useState<string>('GUARDIAN');
  const [isPrimaryContact, setIsPrimaryContact] = useState<boolean>(true);

  // Re-linking mode: when a linked parent is being replaced
  const [isRelinking, setIsRelinking] = useState<boolean>(false);

  // Class/section/student select (for the "from parent" flow)
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(student?.id || '');

  // ─── Queries ─────────────────────────────────────────────────────────────

  const { data: classesWithDetails = [], isLoading: isLoadingClasses } =
    useAllClassesWithDetails(tenantId);

  // The single currently-linked parent for this student
  const {
    data: linkedParent,
    isLoading: isLoadingLinkedParent,
    refetch: refetchLinkedParent,
    isFetching: isFetchingLinkedParent,
  } = useStudentParent(tenantId, student?.id || null);

  const searchPhoneMutation = useSearchUserByPhone();
  const linkParentMutation = useLinkParentToStudent();
  const unlinkParentMutation = useUnlinkStudentParent();

  // ─── Reset form when dialog opens ───────────────────────────────────────

  // Detect when the dialog's target (student/parent) changes and reset
  const [activeStudentId, setActiveStudentId] = useState<string | null>(
    student?.id || null
  );

  useEffect(() => {
    if (!isOpen) {
      // Reset everything on close
      setSearchState('idle');
      setFoundParent(null);
      setParentPhone('');
      setRelationshipType('GUARDIAN');
      setIsPrimaryContact(true);
      setIsRelinking(false);
      setSelectedClassId('');
      setSelectedSectionId('');
      setSelectedStudentId(student?.id || '');
    } else {
      // Track which student this dialog was opened for
      if (student?.id && student.id !== activeStudentId) {
        setActiveStudentId(student.id);
      }
      setSearchState('idle');
      setFoundParent(null);
      setRelationshipType('GUARDIAN');
      setIsPrimaryContact(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Auto-enter re-linking mode once the linked parent query resolves
  // and a link attempt just failed with 409 (handled via mutation error)
  // We also show the search section if there's no linked parent.
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

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleSearchPhone = async () => {
    const cleanPhone = parentPhone.trim().replace(/[^0-9]/g, '');
    if (!cleanPhone || !/^(98|97)\d{8}$/.test(cleanPhone)) {
      toast.error('Invalid Mobile Number', {
        description: 'Please enter a 10-digit mobile number starting with 98 or 97.',
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
        description: `No registered account found with phone +977 ${cleanPhone}. The parent must register first.`,
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
      // Immediately enter re-linking mode so the search form appears
      setIsRelinking(true);
      setFoundParent(null);
      setParentPhone('');
      setSearchState('idle');
      refetchLinkedParent();
    } catch {
      // Toast handled by mutation
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      // Success: close dialog, notify parent
      handleClose();
      refetchLinkedParent();
      if (onSuccess) onSuccess();
    } catch {
      // 409 is handled inside the mutation hook
      // For other errors, nothing extra needed (hook shows toast)
    }
  };

  const handleClose = () => {
    setSearchState('idle');
    setFoundParent(null);
    setParentPhone('');
    setRelationshipType('GUARDIAN');
    setIsPrimaryContact(true);
    setIsRelinking(false);
    setSelectedClassId('');
    setSelectedSectionId('');
    setSelectedStudentId(student?.id || '');
    onClose();
  };

  // ─── Render helpers ───────────────────────────────────────────────────────

  const isSubmitting = linkParentMutation.isPending;
  const isSearching = searchPhoneMutation.isPending || searchState === 'verifying';
  const isUnlinking = unlinkParentMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* ── Header ── */}
        <div className="p-6 border-b border-border/70 bg-muted/20 shrink-0">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <HeartHandshake className="w-4 h-4" />
              </span>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Parent-Student ReBAC
              </span>
            </div>
            <DialogTitle className="text-xl font-bold text-foreground">
              {isFromParent
                ? `Link Student to ${parent?.name}`
                : isFromStudent
                ? `Manage Parent for ${student?.name}`
                : 'Link Parent & Student'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {isFromStudent
                ? 'Each student can have one parent guardian. Search and link a parent by their registered phone number.'
                : 'Establish a relationship so the parent can monitor attendance, notices, and grade reports.'}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* ── Body ── */}
        <form
          id="parent-link-form"
          onSubmit={handleSubmit}
          className="overflow-y-auto flex-1"
        >
          <div className="p-6 space-y-4">

            {/* Context badge */}
            {isFromParent && parent && (
              <div className="p-3 rounded-xl border border-border/70 bg-muted/30 flex items-center justify-between text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Guardian:</span>
                  <strong className="text-foreground text-sm">{parent.name}</strong>
                </div>
                {parent.phone && (
                  <span className="font-mono text-muted-foreground">+977 {parent.phone}</span>
                )}
              </div>
            )}

            {isFromStudent && student && (
              <div className="p-3 rounded-xl border border-border/70 bg-muted/30 flex items-center justify-between text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Student:</span>
                  <strong className="text-foreground text-sm">{student.name}</strong>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">
                  {student.className || 'Class'}{student.sectionName ? ` · Sec ${student.sectionName}` : ''}
                </span>
              </div>
            )}

            {/* ── Linked Parent Slot (from-student flow only) ── */}
            {isFromStudent && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground">Linked Parent</span>
                  {isFetchingLinkedParent && !linkedParent && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                  )}
                </div>

                {isLoadingLinkedParent ? (
                  <div className="p-4 rounded-xl border border-dashed border-border/80 flex items-center justify-center text-xs text-muted-foreground gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </div>
                ) : linkedParent ? (
                  /* ── Active linked parent ── */
                  <div className="space-y-2">
                    <div className="flex items-start justify-between p-3 rounded-xl border border-border/70 bg-card gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold">
                            {linkedParent.first_name?.[0]?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-foreground truncate">
                              {linkedParent.first_name} {linkedParent.last_name}
                            </span>
                            {linkedParent.is_primary_contact && (
                              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                            )}
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {getRelationshipLabel(linkedParent.relationship_type)}
                            {linkedParent.phone && ` · +977 ${linkedParent.phone}`}
                          </span>
                        </div>
                      </div>

                      {/* Replace button — visible when NOT already in re-linking mode */}
                      {!isRelinking && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsRelinking(true)}
                          className="h-7 text-xs shrink-0 gap-1 text-muted-foreground hover:text-foreground"
                        >
                          Replace
                        </Button>
                      )}
                    </div>

                    {/* Unlink + re-link inline form — visible in re-linking mode */}
                    {isRelinking && (
                      <div className="p-3 rounded-xl border border-amber-300/50 bg-amber-50 dark:bg-amber-950/20 space-y-3">
                        <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
                          <Unlink2 className="w-4 h-4" />
                          <span className="font-medium">
                            Replacing: {linkedParent.first_name} {linkedParent.last_name}
                          </span>
                        </div>

                        {/* Phone search */}
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-foreground">
                            New Parent Phone <span className="text-destructive">*</span>
                          </Label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-muted-foreground pointer-events-none">
                                <Smartphone className="w-3.5 h-3.5" />
                                <span className="text-xs font-medium border-r border-border pr-1.5">+977</span>
                              </div>
                              <Input
                                type="tel"
                                placeholder="98XXXXXXXX / 97XXXXXXXX"
                                value={parentPhone}
                                onChange={(e) => {
                                  setParentPhone(e.target.value);
                                  setFoundParent(null);
                                  setSearchState('idle');
                                }}
                                className="pl-20 text-xs"
                                disabled={isSearching || isSubmitting}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleSearchPhone}
                              disabled={!parentPhone.trim() || isSearching}
                              className="shrink-0 gap-1.5 text-xs h-9"
                            >
                              {isSearching ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Search className="w-3.5 h-3.5" />
                              )}
                              Search
                            </Button>
                          </div>
                        </div>

                        {searchState === 'found' && foundParent && (
                          <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-start justify-between gap-2 text-xs animate-in fade-in-50">
                            <div className="flex items-center gap-2">
                              <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                              <div>
                                <strong className="text-foreground">
                                  {foundParent.first_name} {foundParent.last_name}
                                </strong>
                                <span className="text-muted-foreground text-[11px] block">
                                  {foundParent.email}
                                </span>
                              </div>
                            </div>
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] shrink-0">
                              Verified
                            </span>
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-foreground">
                            Relationship <span className="text-destructive">*</span>
                          </Label>
                          <select
                            value={relationshipType}
                            onChange={(e) => setRelationshipType(e.target.value)}
                            disabled={isSubmitting}
                            className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            {RELATIONSHIP_OPTIONS.map((opt) => (
                              <option key={opt.id} value={opt.id}>{opt.label}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center space-x-2.5">
                          <Checkbox
                            id="replace-primary-contact"
                            checked={isPrimaryContact}
                            onCheckedChange={(c) => setIsPrimaryContact(Boolean(c))}
                            disabled={isSubmitting}
                          />
                          <Label htmlFor="replace-primary-contact" className="text-xs text-muted-foreground cursor-pointer select-none font-normal">
                            Primary Contact
                          </Label>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setIsRelinking(false);
                              setFoundParent(null);
                              setParentPhone('');
                              setSearchState('idle');
                            }}
                            disabled={isSubmitting}
                            className="text-xs h-8"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            size="sm"
                            disabled={isSubmitting || !foundParent}
                            className="text-xs h-8 gap-1.5 font-semibold shadow-md shadow-primary/20"
                          >
                            {isSubmitting ? (
                              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Replacing...</>
                            ) : (
                              <><CheckCircle2 className="w-3.5 h-3.5" /> Replace & Link</>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Unlink button — shown when NOT in re-linking mode */}
                    {!isRelinking && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleUnlinkParent}
                        disabled={isUnlinking}
                        className="w-full h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                      >
                        {isUnlinking ? (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Unlinking...</>
                        ) : (
                          <><Unlink2 className="w-3.5 h-3.5" /> Unlink Parent</>
                        )}
                      </Button>
                    )}
                  </div>
                ) : (
                  /* ── No parent linked yet ── */
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl border border-dashed border-border/80 text-center text-xs text-muted-foreground">
                      <UserRoundSearch className="w-6 h-6 mx-auto mb-1.5 opacity-40" />
                      No parent linked yet.<br />
                      Search and link a parent below.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Search form — from student (no linked parent) ── */}
            {isFromStudent && !linkedParent && showSearchSection && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/60" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-2 text-[10px] text-muted-foreground bg-background">
                      Link New Parent
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">
                    Parent / Guardian Phone <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-muted-foreground pointer-events-none">
                        <Smartphone className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium border-r border-border pr-1.5">+977</span>
                      </div>
                      <Input
                        type="tel"
                        placeholder="98XXXXXXXX / 97XXXXXXXX"
                        value={parentPhone}
                        onChange={(e) => {
                          setParentPhone(e.target.value);
                          setFoundParent(null);
                          setSearchState('idle');
                        }}
                        className="pl-20 text-xs"
                        disabled={isSearching || isSubmitting}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSearchPhone}
                      disabled={!parentPhone.trim() || isSearching}
                      className="shrink-0 gap-1.5 text-xs h-9"
                    >
                      {isSearching ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Search className="w-3.5 h-3.5" />
                      )}
                      Search
                    </Button>
                  </div>

                  {searchState === 'found' && foundParent && (
                    <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-start justify-between gap-2 text-xs animate-in fade-in-50">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-foreground">
                            {foundParent.first_name} {foundParent.last_name}
                          </strong>
                          <span className="text-muted-foreground text-[11px] block">
                            {foundParent.email}
                          </span>
                        </div>
                      </div>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] shrink-0">
                        Verified
                      </span>
                    </div>
                  )}

                  {searchState !== 'found' && (
                    <p className="text-[11px] text-muted-foreground">
                      Search for a registered parent by their 10-digit mobile number. Linking grants the Parent role automatically.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    Relationship Type <span className="text-destructive">*</span>
                  </Label>
                  <select
                    value={relationshipType}
                    onChange={(e) => setRelationshipType(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {RELATIONSHIP_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-2.5">
                  <Checkbox
                    id="primary-contact-new"
                    checked={isPrimaryContact}
                    onCheckedChange={(c) => setIsPrimaryContact(Boolean(c))}
                    disabled={isSubmitting}
                  />
                  <Label htmlFor="primary-contact-new" className="text-xs text-muted-foreground cursor-pointer select-none font-normal">
                    Primary Contact for SMS and school notices
                  </Label>
                </div>
              </>
            )}

            {/* ── Select Student — from parent flow ── */}
            {isFromParent && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
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
                      className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">-- Select Class --</option>
                      {classesWithDetails.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
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
                      className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                    >
                      <option value="ALL">All Sections</option>
                      {selectedClass?.sections.map((sec) => (
                        <option key={sec.id} value={sec.id}>Section {sec.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">
                    Enrolled Student <span className="text-destructive">*</span>
                  </Label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    disabled={!selectedClassId || availableStudents.length === 0}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
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

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    Relationship Type <span className="text-destructive">*</span>
                  </Label>
                  <select
                    value={relationshipType}
                    onChange={(e) => setRelationshipType(e.target.value)}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {RELATIONSHIP_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-2.5">
                  <Checkbox
                    id="parent-primary-contact"
                    checked={isPrimaryContact}
                    onCheckedChange={(c) => setIsPrimaryContact(Boolean(c))}
                  />
                  <Label htmlFor="parent-primary-contact" className="text-xs text-muted-foreground cursor-pointer select-none font-normal">
                    Primary Contact
                  </Label>
                </div>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="p-4 sm:p-6 border-t border-border/70 bg-muted/10 shrink-0">
            <DialogFooter className="flex-row items-center justify-between sm:justify-between w-full">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting || isUnlinking}
                className="text-xs"
              >
                {isFromStudent ? 'Done' : 'Cancel'}
              </Button>

              {!isFromParent && !showSearchSection && !linkedParent && (
                <Button
                  type="button"
                  onClick={() => setIsRelinking(true)}
                  className="gap-1.5 text-xs font-semibold"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Link Parent
                </Button>
              )}

              {!isFromParent && !linkedParent && showSearchSection && (
                <Button
                  type="submit"
                  form="parent-link-form"
                  disabled={isSubmitting || isSearching || (!foundParent && !parentPhone.trim())}
                  className="gap-1.5 text-xs font-semibold shadow-md shadow-primary/20"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Linking...</>
                  ) : (
                    <><CheckCircle2 className="w-3.5 h-3.5" /> Link Parent</>
                  )}
                </Button>
              )}
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
