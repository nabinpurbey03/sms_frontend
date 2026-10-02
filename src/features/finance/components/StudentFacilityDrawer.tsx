import React, { useState, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  Tag,
  Sparkles,
  Plus,
  Trash2,
  Coins,
  CheckCircle2,
  Loader2,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  useStudentFeeAssignments,
  useAssignStudentFee,
  useRemoveStudentFee,
  useFeeStructures,
} from '../hooks';
import type { AcademicStudent } from '@/features/academic/types';
import type { FeeCategory, FeeFrequency, StudentTransportProfile } from '../types';

interface StudentFacilityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  student: AcademicStudent | null;
  tenantId: string;
  schoolMonthlyTotal: number;
  classMonthlyTuition: number;
  transportProfile?: StudentTransportProfile | null;
  classDefaultTransportRate: number;
  onSaveTransport: (
    studentId: string,
    isTransport: boolean,
    transportFee?: number | null,
    reason?: string
  ) => Promise<void>;
  isSavingTransport?: boolean;
}

export const StudentFacilityDrawer: React.FC<StudentFacilityDrawerProps> = ({
  isOpen,
  onClose,
  student,
  tenantId,
  schoolMonthlyTotal,
  classMonthlyTuition,
  transportProfile,
  classDefaultTransportRate,
  onSaveTransport,
  isSavingTransport = false,
}) => {
  // Query active assignments for this student
  const { data: assignments = [], isLoading: isLoadingAssignments } = useStudentFeeAssignments(
    tenantId,
    student ? { student_id: student.id } : undefined
  );

  // Query school-level facility presets (fee_level = 'STUDENT')
  const { data: facilityPresets = [] } = useFeeStructures(tenantId, { fee_level: 'STUDENT' });

  // Mutations
  const assignFeeMutation = useAssignStudentFee(tenantId);
  const removeFeeMutation = useRemoveStudentFee(tenantId);

  // Local Form State for adding a new facility
  const [enrollMode, setEnrollMode] = useState<'PRESET' | 'CUSTOM'>('PRESET');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState<FeeCategory>('HOSTEL');
  const [customFrequency, setCustomFrequency] = useState<FeeFrequency>('MONTHLY');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [customNotes, setCustomNotes] = useState('');
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  // Transportation local edit state
  const isTransport = Boolean(transportProfile?.is_transport_applicable);
  const customTransportFee =
    transportProfile?.transport_fee !== undefined && transportProfile?.transport_fee !== null
      ? Number(transportProfile.transport_fee)
      : null;
  const transportRate = isTransport
    ? customTransportFee !== null && customTransportFee >= 0
      ? customTransportFee
      : classDefaultTransportRate
    : 0;

  // Real-time Arithmetic Calculations
  const customFacilitiesMonthlyTotal = useMemo(() => {
    return assignments
      .filter((a) => a.frequency === 'MONTHLY' && a.fee_category !== 'SCHOLARSHIP')
      .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  }, [assignments]);

  const concessionsMonthlyTotal = useMemo(() => {
    return assignments
      .filter((a) => a.frequency === 'MONTHLY' && a.fee_category === 'SCHOLARSHIP')
      .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  }, [assignments]);

  const totalEstimatedMonthly = Math.max(
    0,
    schoolMonthlyTotal + classMonthlyTuition + transportRate + customFacilitiesMonthlyTotal - concessionsMonthlyTotal
  );

  // Auto-fill when preset changes
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

      // Reset form
      setSelectedPresetId('');
      setCustomName('');
      setCustomAmount('');
      setCustomNotes('');
    } finally {
      setIsSubmittingNew(false);
    }
  };

  const handleDeleteFacility = async (assignmentId: string) => {
    await removeFeeMutation.mutateAsync(assignmentId);
  };

  if (!student) return null;

  const fullName = [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(' ');

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl p-0 flex flex-col h-full bg-background overflow-hidden border-l border-border/80 shadow-2xl"
      >
        {/* Drawer Header */}
        <SheetHeader className="p-6 border-b border-border/60 bg-muted/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0">
              <User className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-xl font-bold tracking-tight text-foreground truncate">
                {fullName}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                <span>Student ID: <span className="font-mono text-foreground font-semibold">{student.id.slice(0, 8)}</span></span>
                <span>•</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium bg-muted/60">
                  {student.status}
                </Badge>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Live Fee Simulator Bento Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-card via-card to-primary/5 border border-primary/20 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-primary/10 text-primary">
                  <Coins className="w-4 h-4" />
                </span>
                <h4 className="text-sm font-bold text-foreground">Projected Monthly Bill</h4>
              </div>
              <span className="text-xs font-mono font-extrabold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                NPR {totalEstimatedMonthly.toLocaleString()}/mo
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50">
                <span className="text-[11px] text-muted-foreground block">School Baseline</span>
                <span className="font-mono font-bold text-foreground">
                  NPR {schoolMonthlyTotal.toLocaleString()}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50">
                <span className="text-[11px] text-muted-foreground block">Class Tuition</span>
                <span className="font-mono font-bold text-foreground">
                  NPR {classMonthlyTuition.toLocaleString()}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50">
                <span className="text-[11px] text-muted-foreground block">Transportation</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {isTransport ? `+NPR ${transportRate.toLocaleString()}` : 'None'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50">
                <span className="text-[11px] text-muted-foreground block">Facilities & Add-ons</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  +NPR {customFacilitiesMonthlyTotal.toLocaleString()}
                </span>
              </div>
            </div>

            {concessionsMonthlyTotal > 0 && (
              <div className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300 flex items-center justify-between font-medium">
                <span>Applied Concessions / Waiver</span>
                <span className="font-mono font-bold">-NPR {concessionsMonthlyTotal.toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Active Subscriptions Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Active Facilities & Opt-ins ({assignments.length + (isTransport ? 1 : 0)})
              </h4>
            </div>

            {/* Transport Card */}
            <div className="p-3.5 rounded-xl border border-border/70 bg-card/60 flex items-start justify-between gap-3 transition-colors hover:border-emerald-500/40">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Bus className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">Transportation Service</span>
                    <Badge variant={isTransport ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                      {isTransport ? 'Opted In' : 'Not Opted'}
                    </Badge>
                  </div>
                  {isTransport ? (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Fee: <span className="font-mono font-bold text-foreground">NPR {transportRate.toLocaleString()}/mo</span>
                      {transportProfile?.reason ? ` • ${transportProfile.reason}` : ''}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-0.5">No bus facility requested</p>
                  )}
                </div>
              </div>

              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-muted-foreground select-none shrink-0 mt-1">
                <Checkbox
                  checked={isTransport}
                  disabled={isSavingTransport}
                  onCheckedChange={async (checked) => {
                    await onSaveTransport(
                      student.id,
                      Boolean(checked),
                      Boolean(checked) ? (customTransportFee || classDefaultTransportRate || null) : null,
                      transportProfile?.reason || undefined
                    );
                  }}
                  className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                />
                <span>Enable</span>
              </label>
            </div>

            {/* List of Custom Assignments (Hostel, Canteen, Coaching, etc.) */}
            {isLoadingAssignments ? (
              <div className="flex items-center justify-center p-6">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : assignments.length === 0 && !isTransport ? (
              <div className="p-6 text-center border border-dashed border-border rounded-xl">
                <p className="text-xs text-muted-foreground">No facilities or add-ons subscribed yet.</p>
              </div>
            ) : (
              assignments.map((assignment) => {
                const cat = assignment.fee_category;
                let icon = <Layers className="w-4 h-4" />;
                let iconColor = 'bg-slate-500/10 text-slate-600 dark:text-slate-400';

                if (cat === 'HOSTEL') {
                  icon = <Building2 className="w-4 h-4" />;
                  iconColor = 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400';
                } else if (cat === 'CANTEEN') {
                  icon = <Utensils className="w-4 h-4" />;
                  iconColor = 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
                } else if (cat === 'COACHING' || cat === 'ACTIVITY') {
                  icon = <Trophy className="w-4 h-4" />;
                  iconColor = 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
                } else if (cat === 'SCHOLARSHIP') {
                  icon = <Tag className="w-4 h-4" />;
                  iconColor = 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
                }

                return (
                  <div
                    key={assignment.id}
                    className="p-3.5 rounded-xl border border-border/70 bg-card/60 flex items-start justify-between gap-3 group transition-colors hover:border-primary/40"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg ${iconColor} flex items-center justify-center shrink-0 mt-0.5`}>
                        {icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-foreground">{assignment.fee_name}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium">
                            {assignment.fee_category}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Rate: <span className="font-mono font-bold text-foreground">NPR {Number(assignment.amount).toLocaleString()}</span>
                          <span className="text-[11px] opacity-75"> ({assignment.frequency.toLowerCase()})</span>
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
                      title="Remove subscription"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>

          {/* Subscribe New Facility Form */}
          <div className="p-4 rounded-2xl border border-border/70 bg-muted/20 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-primary" />
                <span>Subscribe New Facility</span>
              </h4>

              {/* Mode switch */}
              <div className="inline-flex items-center p-0.5 rounded-lg bg-muted text-xs">
                <button
                  type="button"
                  onClick={() => setEnrollMode('PRESET')}
                  className={`px-2 py-0.5 rounded-md font-semibold text-[11px] transition-all cursor-pointer ${
                    enrollMode === 'PRESET' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground'
                  }`}
                >
                  From Presets
                </button>
                <button
                  type="button"
                  onClick={() => setEnrollMode('CUSTOM')}
                  className={`px-2 py-0.5 rounded-md font-semibold text-[11px] transition-all cursor-pointer ${
                    enrollMode === 'CUSTOM' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground'
                  }`}
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
                    <SelectTrigger className="text-xs h-9 bg-card">
                      <SelectValue placeholder="Choose predefined facility (Hostel, Meals, Clubs...)" />
                    </SelectTrigger>
                    <SelectContent>
                      {facilityPresets.length === 0 ? (
                        <div className="p-2 text-xs text-muted-foreground text-center">
                          No student facility presets found. Create one under School-Wide Fees or use Custom.
                        </div>
                      ) : (
                        facilityPresets.map((preset) => (
                          <SelectItem key={preset.id} value={preset.id} className="text-xs">
                            <span className="font-semibold">{preset.name}</span>
                            <span className="text-muted-foreground ml-2">
                              (NPR {Number(preset.amount).toLocaleString()} / {preset.frequency.toLowerCase()})
                            </span>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Facility / Add-on Name</label>
                  <Input
                    required
                    placeholder="e.g. Boys Hostel Deluxe"
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
                      <SelectItem value="TRANSPORT" className="text-xs">Transport</SelectItem>
                      <SelectItem value="COACHING" className="text-xs">Coaching / Tutoring</SelectItem>
                      <SelectItem value="ACTIVITY" className="text-xs">Activity / Club</SelectItem>
                      <SelectItem value="SCHOLARSHIP" className="text-xs">Concession / Waiver</SelectItem>
                      <SelectItem value="MISC" className="text-xs">Miscellaneous</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Amount (NPR)</label>
                  <Input
                    type="number"
                    min="1"
                    step="50"
                    required
                    placeholder="4500"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="text-xs h-8 font-mono bg-card"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Billing Frequency</label>
                  <Select
                    value={customFrequency}
                    onValueChange={(val) => setCustomFrequency(val as FeeFrequency)}
                  >
                    <SelectTrigger className="text-xs h-8 bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MONTHLY" className="text-xs">Monthly</SelectItem>
                      <SelectItem value="TERMWISE" className="text-xs">Termwise</SelectItem>
                      <SelectItem value="ONE_TIME" className="text-xs">One Time</SelectItem>
                      <SelectItem value="YEARLY" className="text-xs">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Remarks / Specifics (Optional)</label>
                <Input
                  placeholder="e.g. Room 204, Bed B, or Route 4 stop"
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
                    <span>Subscribing...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Subscribe Facility</span>
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
