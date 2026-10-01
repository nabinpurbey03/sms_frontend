import React, { useState, useEffect, useMemo } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bus,
  Check,
  CheckCircle2,
  Loader2,
  User,
} from 'lucide-react';
import type { AcademicStudent } from '@/features/academic/types';
import type { StudentTransportProfile } from '../types';

export interface StudentFeeProfileRowProps {
  student: AcademicStudent;
  transportProfile?: StudentTransportProfile | null;
  baseTuition: number;
  transportFee: number;
  onSave: (
    studentId: string,
    isTransport: boolean,
    transportFee?: number | null,
    reason?: string
  ) => Promise<void>;
  isSaving: boolean;
  sectionName?: string;
  rollNumber?: number;
}

export const StudentFeeProfileRow: React.FC<StudentFeeProfileRowProps> = ({
  student,
  transportProfile,
  baseTuition,
  transportFee,
  onSave,
  isSaving,
  sectionName,
  rollNumber,
}) => {
  const initialTransport = transportProfile?.is_transport_applicable ?? false;
  const initialTransportFee = transportProfile?.transport_fee != null ? Number(transportProfile.transport_fee) : null;
  const initialReason = transportProfile?.reason ?? '';

  const [isTransport, setIsTransport] = useState<boolean>(initialTransport);
  const [customTransportFee, setCustomTransportFee] = useState<number | null>(initialTransportFee);
  const [reason, setReason] = useState<string>(initialReason);
  const [justSaved, setJustSaved] = useState<boolean>(false);

  // Sync state if transportProfile prop changes from parent
  useEffect(() => {
    const nextTransport = transportProfile?.is_transport_applicable ?? false;
    const nextTransportFee = transportProfile?.transport_fee != null ? Number(transportProfile.transport_fee) : null;
    const nextReason = transportProfile?.reason ?? '';

    setIsTransport(nextTransport);
    setCustomTransportFee(nextTransportFee);
    setReason(nextReason);
  }, [transportProfile]);

  const fullName = [student.first_name, student.middle_name, student.last_name]
    .filter(Boolean)
    .join(' ');

  // Calculate dirty status
  const effectiveCustomTransport = isTransport ? customTransportFee : null;
  const isDirty = useMemo(() => {
    return (
      isTransport !== initialTransport ||
      effectiveCustomTransport !== initialTransportFee ||
      reason.trim() !== initialReason.trim()
    );
  }, [isTransport, initialTransport, effectiveCustomTransport, initialTransportFee, reason, initialReason]);

  // Real-time calculated transport rate for this student
  const studentTransportRate = useMemo(() => {
    if (!isTransport) return 0;
    return customTransportFee != null && customTransportFee >= 0 ? customTransportFee : transportFee;
  }, [isTransport, customTransportFee, transportFee]);

  // Real-time calculated net monthly fee preview
  const netFee = useMemo(() => {
    return baseTuition + studentTransportRate;
  }, [baseTuition, studentTransportRate]);

  const handleTransportToggle = (checked: boolean) => {
    setIsTransport(checked);
    if (!checked) {
      setCustomTransportFee(null);
    } else if (customTransportFee == null && transportFee > 0) {
      setCustomTransportFee(transportFee);
    }
  };

  const handleSave = async () => {
    try {
      await onSave(
        student.id,
        isTransport,
        isTransport ? customTransportFee : null,
        reason.trim() || undefined
      );
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
    } catch {
      // Handled by parent mutation onError
    }
  };

  return (
    <TableRow className="hover:bg-muted/40 transition-colors">
      {/* Student Identity */}
      <TableCell className="py-3 font-medium">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
            {rollNumber !== undefined ? (
              <span>{rollNumber}</span>
            ) : (
              <User className="w-4 h-4" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-sm text-foreground">{fullName}</span>
              {sectionName && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 font-semibold bg-muted/60"
                >
                  Sec {sectionName}
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
              <span>Status: <span className="font-medium text-foreground">{student.status}</span></span>
              {student.gender && (
                <>
                  <span>•</span>
                  <span>{student.gender}</span>
                </>
              )}
            </p>
          </div>
        </div>
      </TableCell>

      {/* Transportation Checkbox, Custom Fee Input & Route Info */}
      <TableCell className="py-3">
        <div className="space-y-2 max-w-sm">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <Checkbox
                checked={isTransport}
                onCheckedChange={(checked) => handleTransportToggle(Boolean(checked))}
                className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
              />
              <span className="text-xs font-semibold text-foreground">Transport Applicable</span>
            </label>

            {isTransport && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                <Bus className="w-2.5 h-2.5" />
                NPR {studentTransportRate.toLocaleString('en-US')}/mo
              </span>
            )}
          </div>

          {isTransport ? (
            <div className="space-y-1.5 pl-6">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground font-mono">NPR</span>
                <Input
                  type="number"
                  min="0"
                  step="50"
                  placeholder={transportFee > 0 ? String(transportFee) : '0'}
                  value={customTransportFee ?? ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : Math.max(0, Number(e.target.value));
                    setCustomTransportFee(val);
                  }}
                  className="h-7 w-28 text-xs font-mono px-2"
                />
                <span className="text-[10px] text-muted-foreground">/ month</span>
              </div>
              <Input
                type="text"
                placeholder="Route / Stop details (optional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="h-6 text-[11px] placeholder:text-[11px] text-muted-foreground max-w-xs"
              />
            </div>
          ) : (
            <div className="pl-6">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border/50">
                No Transport
              </span>
            </div>
          )}
        </div>
      </TableCell>

      {/* Estimated Net Monthly Fee Preview */}
      <TableCell className="py-3">
        <div className="space-y-0.5">
          <div className="font-mono font-bold text-sm text-foreground">
            NPR {netFee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-muted-foreground flex items-center gap-1 flex-wrap">
            <span>Base: NPR {baseTuition.toLocaleString()}</span>
            {isTransport && studentTransportRate > 0 && (
              <>
                <span>+</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  Bus: NPR {studentTransportRate.toLocaleString()}
                </span>
              </>
            )}
          </div>
        </div>
      </TableCell>

      {/* Save Action */}
      <TableCell className="py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          {justSaved && !isDirty && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Saved
            </span>
          )}

          <Button
            size="sm"
            variant={isDirty ? 'default' : 'outline'}
            disabled={(!isDirty && !justSaved) || isSaving}
            onClick={handleSave}
            className={`h-7 px-3 text-xs gap-1.5 transition-all ${
              isDirty
                ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                : 'text-muted-foreground'
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Saving...</span>
              </>
            ) : isDirty ? (
              <>
                <Check className="w-3 h-3" />
                <span>Save</span>
              </>
            ) : (
              <>
                <Check className="w-3 h-3 opacity-60" />
                <span>Saved</span>
              </>
            )}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};
