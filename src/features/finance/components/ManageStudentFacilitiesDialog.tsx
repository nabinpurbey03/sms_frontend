import React, { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  User,
  Bus,
  Building2,
  Utensils,
  Trophy,
  BookOpen,
  FlaskConical,
  Tag,
  Plus,
  Trash2,
  Coins,
  CheckCircle2,
  Loader2,
  Layers,
  Sparkles,
  Save,
  Pencil,
  PowerOff,
} from 'lucide-react';
import {
  useStudentFeeAssignments,
  useAssignStudentFee,
  useRemoveStudentFee,
  useFeeStructures,
  useSetStudentTransport,
  STUDENT_FEE_ASSIGNMENTS_KEY,
  STUDENT_TRANSPORTS_KEY,
  FINANCE_CLASS_OVERVIEW_KEY,
  STUDENT_LEDGER_KEY,
} from '../hooks';
import {
  calculateEffectiveTransportFee,
  calculateStudentFacilitiesMonthlyTotal,
  calculateStudentConcessionsMonthlyTotal,
  calculateStudentNetMonthlyTotal,
  getFacilityCategoryMeta,
  getTransportDisplayMeta,
} from '../utils/studentFacilityUtils';
import type { AcademicStudent } from '@/features/academic/types';
import type { FeeCategory, FeeFrequency, StudentTransportProfile } from '../types';
import { cn } from '@/lib/utils';

export interface ManageStudentFacilitiesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  student: AcademicStudent | null;
  tenantId: string;
  classMonthlyTuition?: number;
  baseTuition?: number;
  schoolMonthlyTotal?: number;
  transportProfile?: StudentTransportProfile | null;
  classDefaultTransportRate?: number;
  onSaveTransport?: (
    studentId: string,
    isTransport: boolean,
    transportFee?: number | null,
    reason?: string
  ) => Promise<void>;
  isSavingTransport?: boolean;
}

export const ManageStudentFacilitiesDialog: React.FC<ManageStudentFacilitiesDialogProps> = ({
  isOpen,
  onClose,
  student,
  tenantId,
  classMonthlyTuition,
  baseTuition,
  schoolMonthlyTotal = 0,
  transportProfile,
  classDefaultTransportRate = 0,
  onSaveTransport,
  isSavingTransport = false,
}) => {
  const queryClient = useQueryClient();
  const effectiveBaseTuition = baseTuition ?? classMonthlyTuition ?? 0;

  // Active student fee assignments query
  const { data: assignments = [], isLoading: isLoadingAssignments } = useStudentFeeAssignments(
    tenantId,
    student ? { student_id: student.id } : undefined
  );

  // School-level facility presets (fee_level = 'STUDENT')
  const { data: facilityPresets = [] } = useFeeStructures(tenantId, { fee_level: 'STUDENT', is_active: true });

  // Mutations
  const assignFeeMutation = useAssignStudentFee(tenantId);
  const removeFeeMutation = useRemoveStudentFee(tenantId);
  const internalSetTransportMutation = useSetStudentTransport(tenantId);

  // --- Transport Local State ---
  const initialTransportApplicable = Boolean(transportProfile?.is_transport_applicable);
  const initialTransportFee =
    transportProfile?.transport_fee !== undefined && transportProfile?.transport_fee !== null
      ? Number(transportProfile.transport_fee)
      : null;
  const initialTransportReason = transportProfile?.reason ?? '';

  const [isTransport, setIsTransport] = useState<boolean>(initialTransportApplicable);
  const [customTransportFee, setCustomTransportFee] = useState<number | null>(initialTransportFee);
  const [transportReason, setTransportReason] = useState<string>(initialTransportReason);
  const [isEditingTransport, setIsEditingTransport] = useState<boolean>(false);
  const [isSavingTransportLocal, setIsSavingTransportLocal] = useState<boolean>(false);
  const [justSavedTransport, setJustSavedTransport] = useState<boolean>(false);

  // Sync transport state when student/transportProfile changes
  useEffect(() => {
    setIsTransport(Boolean(transportProfile?.is_transport_applicable));
    setCustomTransportFee(
      transportProfile?.transport_fee !== undefined && transportProfile?.transport_fee !== null
        ? Number(transportProfile.transport_fee)
        : null
    );
    setTransportReason(transportProfile?.reason ?? '');
    setIsEditingTransport(false);
    setJustSavedTransport(false);
  }, [transportProfile, student?.id]);

  // --- Add Facility Form State ---
  const [enrollMode, setEnrollMode] = useState<'PRESET' | 'CUSTOM'>('PRESET');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState<FeeCategory>('HOSTEL');
  const [customFrequency, setCustomFrequency] = useState<FeeFrequency>('MONTHLY');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [customNotes, setCustomNotes] = useState('');
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  // Invalidate query caches helper
  const invalidateRelevantCaches = () => {
    queryClient.invalidateQueries({ queryKey: [STUDENT_FEE_ASSIGNMENTS_KEY, tenantId] });
    queryClient.invalidateQueries({ queryKey: [STUDENT_TRANSPORTS_KEY, tenantId] });
    queryClient.invalidateQueries({ queryKey: [FINANCE_CLASS_OVERVIEW_KEY, tenantId] });
    queryClient.invalidateQueries({ queryKey: [STUDENT_LEDGER_KEY, tenantId] });
  };

  // Preset Selection Handler
  const handlePresetChange = (presetId: string) => {
    setSelectedPresetId(presetId);
    const found = facilityPresets.find((p) => p.id === presetId);
    if (found) {
      setCustomName(found.name);
      setCustomCategory(found.fee_category);
      setCustomFrequency(found.frequency);
      setCustomAmount(String(found.amount));
    }
  };

  // Real-time calculations
  const effectiveTransportRate = calculateEffectiveTransportFee(
    { is_transport_applicable: isTransport, transport_fee: customTransportFee },
    classDefaultTransportRate
  );

  const transportMeta = useMemo(() => {
    return getTransportDisplayMeta(
      {
        is_transport_applicable: isTransport,
        transport_fee: customTransportFee,
        reason: transportReason,
      },
      classDefaultTransportRate
    );
  }, [isTransport, customTransportFee, transportReason, classDefaultTransportRate]);

  const customFacilitiesMonthlyTotal = calculateStudentFacilitiesMonthlyTotal(assignments);
  const concessionsMonthlyTotal = calculateStudentConcessionsMonthlyTotal(assignments);

  const totalEstimatedMonthly = calculateStudentNetMonthlyTotal({
    baseTuition: schoolMonthlyTotal + effectiveBaseTuition,
    transportProfile: { is_transport_applicable: isTransport, transport_fee: customTransportFee },
    classDefaultTransportRate,
    assignedFees: assignments,
  });

  // Save Transport settings handler
  const handleSaveTransport = async () => {
    if (!student) return;
    setIsSavingTransportLocal(true);
    try {
      const targetFee = isTransport
        ? (customTransportFee === classDefaultTransportRate ? null : customTransportFee)
        : null;
      const targetReason = transportReason.trim() || undefined;

      if (onSaveTransport) {
        await onSaveTransport(student.id, isTransport, targetFee, targetReason);
      } else {
        await internalSetTransportMutation.mutateAsync({
          student_id: student.id,
          is_transport_applicable: isTransport,
          transport_fee: targetFee,
          reason: targetReason,
        });
      }
      invalidateRelevantCaches();
      setJustSavedTransport(true);
      setIsEditingTransport(false);
      setTimeout(() => setJustSavedTransport(false), 2500);
    } finally {
      setIsSavingTransportLocal(false);
    }
  };

  const handleCancelEditTransport = () => {
    if (!initialTransportApplicable) {
      setIsTransport(false);
    }
    setCustomTransportFee(initialTransportFee);
    setTransportReason(initialTransportReason);
    setIsEditingTransport(false);
  };

  const handleDisableTransport = async () => {
    if (!student) return;
    setIsSavingTransportLocal(true);
    try {
      if (onSaveTransport) {
        await onSaveTransport(student.id, false, null, undefined);
      } else {
        await internalSetTransportMutation.mutateAsync({
          student_id: student.id,
          is_transport_applicable: false,
          transport_fee: null,
          reason: undefined,
        });
      }
      invalidateRelevantCaches();
      setIsTransport(false);
      setCustomTransportFee(null);
      setTransportReason('');
      setIsEditingTransport(false);
    } finally {
      setIsSavingTransportLocal(false);
    }
  };

  const handleStartEditTransport = () => {
    setIsEditingTransport(true);
  };

  const handleStartEnrollTransport = () => {
    setIsTransport(true);
    setIsEditingTransport(true);
    if (customTransportFee == null && classDefaultTransportRate > 0) {
      setCustomTransportFee(classDefaultTransportRate);
    }
  };

  // Add Facility handler
  const handleAddFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;

    const amountNum = parseFloat(customAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;
    if (!customName.trim()) return;

    setIsSubmittingNew(true);
    try {
      await assignFeeMutation.mutateAsync({
        student_id: student.id,
        fee_structure_id: selectedPresetId || null,
        fee_name: customName.trim(),
        fee_category: customCategory,
        frequency: customFrequency,
        amount: amountNum,
        notes: customNotes.trim() || undefined,
      });

      invalidateRelevantCaches();

      // Reset form
      setSelectedPresetId('');
      setCustomName('');
      setCustomAmount('');
      setCustomNotes('');
    } finally {
      setIsSubmittingNew(false);
    }
  };

  // Remove Facility handler
  const handleDeleteFacility = async (assignmentId: string) => {
    await removeFeeMutation.mutateAsync(assignmentId);
    invalidateRelevantCaches();
  };

  if (!student) return null;

  const fullName = [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(' ');

  const getCategoryIcon = (category: FeeCategory) => {
    switch (category) {
      case 'HOSTEL':
        return <Building2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case 'CANTEEN':
        return <Utensils className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'TRANSPORT':
        return <Bus className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'COACHING':
        return <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'LAB':
        return <FlaskConical className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />;
      case 'ACTIVITY':
        return <Trophy className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
      case 'SCHOLARSHIP':
        return <Tag className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      default:
        return <Layers className="w-4 h-4 text-slate-600 dark:text-slate-400" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl sm:max-w-3xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl gap-0 border-border/80 shadow-2xl bg-background">
        {/* Header */}
        <DialogHeader className="p-6 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0">
              <User className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-xl font-bold tracking-tight text-foreground truncate">
                  {fullName}
                </DialogTitle>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium bg-muted/60">
                  {student.status}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                <span>Admission: <span className="font-mono text-foreground font-semibold">{(student as any).admission_number || student.id.slice(0, 8)}</span></span>
                {(student as any).roll_number !== undefined && (student as any).roll_number !== null && (
                  <>
                    <span>•</span>
                    <span>Roll #{(student as any).roll_number}</span>
                  </>
                )}
                <span>•</span>
                <span>Manage Level-3 Student Facilities</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Dialog Body */}
        <div className="p-6 space-y-6">
          {/* Live Summary Bento Box */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-card via-card to-primary/5 border border-primary/20 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-primary/10 text-primary">
                  <Coins className="w-4 h-4" />
                </span>
                <h4 className="text-sm font-bold text-foreground">Projected Monthly Total</h4>
              </div>
              <span className="text-xs font-mono font-extrabold text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                NPR {totalEstimatedMonthly.toLocaleString('en-IN')}/mo
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50">
                <span className="text-[11px] text-muted-foreground block">Base Tuition</span>
                <span className="font-mono font-bold text-foreground">
                  NPR {effectiveBaseTuition.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50">
                <span className="text-[11px] text-muted-foreground block">Transport</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  {isTransport ? `+NPR ${effectiveTransportRate.toLocaleString('en-IN')}` : 'None'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50">
                <span className="text-[11px] text-muted-foreground block">Active Facilities</span>
                <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                  +NPR {customFacilitiesMonthlyTotal.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50">
                <span className="text-[11px] text-muted-foreground block">Concessions</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {concessionsMonthlyTotal > 0 ? `-NPR ${concessionsMonthlyTotal.toLocaleString('en-IN')}` : 'None'}
                </span>
              </div>
            </div>
          </div>

          {/* Transportation Section */}
          {isTransport && !isEditingTransport ? (
            /* State A: Enrolled & Saved */
            <div className="p-4 rounded-2xl border border-blue-500/25 bg-blue-500/5 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Bus className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Transportation Service
                      </h4>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 font-medium bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
                      >
                        Active Service
                      </Badge>
                      {justSavedTransport && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 flex items-center gap-1 animate-pulse"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>Saved</span>
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      School bus service enrollment and custom stop billing
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleStartEditTransport}
                    className="h-7 text-xs gap-1.5 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit Details</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleDisableTransport}
                    disabled={isSavingTransportLocal || isSavingTransport}
                    className="h-7 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer gap-1"
                    title="Disable bus service"
                  >
                    <PowerOff className="w-3.5 h-3.5" />
                    <span>Disable</span>
                  </Button>
                </div>
              </div>

              <div className="pt-2 border-t border-blue-500/10 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-card/60 border border-blue-500/15 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Monthly Rate</span>
                    <span className="font-mono font-bold text-foreground">
                      NPR {transportMeta.monthlyFee.toLocaleString('en-IN')}/mo
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium">
                    {transportMeta.rateBadgeLabel}
                  </Badge>
                </div>

                <div className="p-2.5 rounded-xl bg-card/60 border border-blue-500/15">
                  <span className="text-[11px] text-muted-foreground block">Route / Pickup Stop</span>
                  <span className="font-medium text-foreground text-xs truncate block" title={transportMeta.routeDescription}>
                    Stop / Route: {transportMeta.routeDescription}
                  </span>
                </div>
              </div>
            </div>
          ) : isTransport && isEditingTransport ? (
            /* State B: Editing / Enrolling */
            <div className="p-4 rounded-2xl border border-blue-500/25 bg-blue-500/5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Bus className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      {initialTransportApplicable ? 'Edit Transportation Details' : 'Enroll Transportation Service'}
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Configure monthly bus rate and pickup stop
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-blue-500/10 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-muted-foreground">
                        Monthly Bus Fee (NPR)
                      </label>
                      {classDefaultTransportRate > 0 && customTransportFee !== classDefaultTransportRate && (
                        <button
                          type="button"
                          onClick={() => setCustomTransportFee(classDefaultTransportRate)}
                          className="text-[10px] text-primary hover:underline font-medium cursor-pointer rounded-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          Use Class Default (NPR {classDefaultTransportRate.toLocaleString('en-IN')})
                        </button>
                      )}
                    </div>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      placeholder={classDefaultTransportRate > 0 ? String(classDefaultTransportRate) : '0'}
                      value={customTransportFee ?? ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? null : Math.max(0, Number(e.target.value));
                        setCustomTransportFee(val);
                      }}
                      className="text-xs h-8 font-mono bg-card"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Default class rate: NPR {classDefaultTransportRate.toLocaleString('en-IN')}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Route / Pickup Stop Remarks
                    </label>
                    <Input
                      placeholder="e.g. Bus Route 3, Koteshwor Chowk"
                      value={transportReason}
                      onChange={(e) => setTransportReason(e.target.value)}
                      className="text-xs h-8 bg-card"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEditTransport}
                    disabled={isSavingTransportLocal || isSavingTransport}
                    className="h-8 text-xs cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="default"
                    disabled={isSavingTransportLocal || isSavingTransport}
                    onClick={handleSaveTransport}
                    className="h-8 text-xs gap-1.5 cursor-pointer"
                  >
                    {isSavingTransportLocal || isSavingTransport ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Transport Settings</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* State C: Not Enrolled */
            <div className="p-4 rounded-2xl border border-border/70 bg-muted/20 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                  <Bus className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Transportation Service
                    </h4>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium text-muted-foreground bg-muted/40">
                      Not Enrolled
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    No bus service enrolled. Class standard rate: NPR {classDefaultTransportRate.toLocaleString('en-IN')}/mo
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleStartEnrollTransport}
                className="h-8 text-xs gap-1.5 cursor-pointer font-semibold"
              >
                <Plus className="w-3.5 h-3.5 text-primary" />
                <span>Enroll in Bus Service</span>
              </Button>
            </div>
          )}

          {/* Active Facilities Table / List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Active Student Facilities ({assignments.length})
              </h4>
            </div>

            {isLoadingAssignments ? (
              <div className="flex items-center justify-center p-6">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : assignments.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-border rounded-xl">
                <p className="text-xs text-muted-foreground">No custom facilities assigned to this student yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {assignments.map((assignment) => {
                  const meta = getFacilityCategoryMeta(assignment.fee_category);
                  return (
                    <div
                      key={assignment.id}
                      className="p-3.5 rounded-xl border border-border/70 bg-card flex items-center justify-between gap-3 group transition-colors hover:border-primary/40 shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          {getCategoryIcon(assignment.fee_category)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-foreground truncate">
                              {assignment.fee_name}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 font-medium ${meta.colorClass}`}
                            >
                              {meta.label}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {assignment.frequency}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Amount: <span className="font-mono font-bold text-foreground">NPR {Number(assignment.amount).toLocaleString('en-IN')}</span>
                            {assignment.notes ? ` • ${assignment.notes}` : ''}
                          </p>
                        </div>
                      </div>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteFacility(assignment.id)}
                        disabled={removeFeeMutation.isPending}
                        className="w-7 h-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer shrink-0"
                        title="Remove facility"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add New Facility Form */}
          <div className="p-4 rounded-2xl border border-border/70 bg-muted/20 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-primary" />
                <span>Add New Facility</span>
              </h4>

              {/* Mode switch */}
              <div
                role="tablist"
                aria-label="Facility enrollment mode"
                className="inline-flex items-center p-1 rounded-xl bg-muted/60 dark:bg-muted/30 border border-border/80 text-xs shadow-2xs gap-1"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={enrollMode === 'PRESET'}
                  onClick={() => setEnrollMode('PRESET')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg font-semibold text-xs transition-all duration-150 cursor-pointer select-none',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                    enrollMode === 'PRESET'
                      ? 'bg-background text-foreground font-bold shadow-xs border border-border/90 dark:bg-card dark:border-primary/40 dark:shadow-md'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/60 hover:border-border/40 border border-transparent'
                  )}
                >
                  From Presets
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={enrollMode === 'CUSTOM'}
                  onClick={() => setEnrollMode('CUSTOM')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg font-semibold text-xs transition-all duration-150 cursor-pointer select-none',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                    enrollMode === 'CUSTOM'
                      ? 'bg-background text-foreground font-bold shadow-xs border border-border/90 dark:bg-card dark:border-primary/40 dark:shadow-md'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/60 hover:border-border/40 border border-transparent'
                  )}
                >
                  Custom
                </button>
              </div>
            </div>

            <form onSubmit={handleAddFacility} className="space-y-3">
              {enrollMode === 'PRESET' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Select Facility Preset</label>
                  <Select value={selectedPresetId} onValueChange={handlePresetChange}>
                    <SelectTrigger className="text-xs h-8 bg-card">
                      <SelectValue placeholder="Choose predefined facility (Hostel, Canteen, Lab, Coaching...)" />
                    </SelectTrigger>
                    <SelectContent>
                      {facilityPresets.length === 0 ? (
                        <div className="p-2 text-xs text-muted-foreground text-center">
                          No student facility presets found. Switch to Custom mode.
                        </div>
                      ) : (
                        facilityPresets.map((preset) => (
                          <SelectItem key={preset.id} value={preset.id} className="text-xs">
                            <span className="font-semibold">{preset.name}</span>
                            <span className="text-muted-foreground ml-2">
                              (NPR {Number(preset.amount).toLocaleString('en-IN')} / {preset.frequency.toLowerCase()})
                            </span>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Facility Name</label>
                  <Input
                    required
                    placeholder="e.g. Boys Hostel Deluxe or Canteen Lunch"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="text-xs h-8 bg-card"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Category</label>
                  <Select
                    value={customCategory}
                    onValueChange={(val) => setCustomCategory(val as FeeCategory)}
                  >
                    <SelectTrigger className="text-xs h-8 bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HOSTEL" className="text-xs">Hostel / Boarding</SelectItem>
                      <SelectItem value="CANTEEN" className="text-xs">Canteen / Meals</SelectItem>
                      <SelectItem value="COACHING" className="text-xs">Coaching / Tutoring</SelectItem>
                      <SelectItem value="LAB" className="text-xs">Lab & Practical</SelectItem>
                      <SelectItem value="ACTIVITY" className="text-xs">Activity / Club</SelectItem>
                      <SelectItem value="MISC" className="text-xs">Miscellaneous</SelectItem>
                      <SelectItem value="SCHOLARSHIP" className="text-xs">Concession / Waiver</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Amount (NPR)</label>
                  <Input
                    type="number"
                    min="0.01"
                    step="any"
                    required
                    placeholder="4500"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="text-xs h-8 font-mono bg-card"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Frequency</label>
                  <Select
                    value={customFrequency}
                    onValueChange={(val) => setCustomFrequency(val as FeeFrequency)}
                  >
                    <SelectTrigger className="text-xs h-8 bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MONTHLY" className="text-xs">Monthly</SelectItem>
                      <SelectItem value="YEARLY" className="text-xs">Yearly</SelectItem>
                      <SelectItem value="ONE_TIME" className="text-xs">One Time</SelectItem>
                      <SelectItem value="TERMWISE" className="text-xs">Termwise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Notes / Remarks (Optional)</label>
                <Input
                  placeholder="e.g. Room 204, Bed B, or special diet"
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  className="text-xs h-8 bg-card"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmittingNew || !customName.trim() || !customAmount}
                className="w-full text-xs h-8 gap-1.5 shadow-xs cursor-pointer font-semibold mt-1"
              >
                {isSubmittingNew ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Assigning Facility...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Assign Facility to Student</span>
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
