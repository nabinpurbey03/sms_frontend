import React, { useState, useEffect, useMemo } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bus,
  Percent,
  Check,
  CheckCircle2,
  Loader2,
  User,
  Sparkles,
} from 'lucide-react';
import type { AcademicStudent } from '@/features/academic/types';
import type { StudentDiscount } from '../types';

export interface StudentFeeProfileRowProps {
  student: AcademicStudent;
  discount?: StudentDiscount | null;
  baseTuition: number;
  transportFee: number;
  onSave: (
    studentId: string,
    isTransport: boolean,
    discountPercent: number,
    reason?: string
  ) => Promise<void>;
  isSaving: boolean;
  sectionName?: string;
  rollNumber?: number;
}

export const StudentFeeProfileRow: React.FC<StudentFeeProfileRowProps> = ({
  student,
  discount,
  baseTuition,
  transportFee,
  onSave,
  isSaving,
  sectionName,
  rollNumber,
}) => {
  const initialTransport = discount?.is_transport_applicable ?? false;
  const initialPercent = Number(discount?.discount_percent ?? 0);
  const initialReason = discount?.reason ?? '';

  const [isTransport, setIsTransport] = useState<boolean>(initialTransport);
  const [hasScholarship, setHasScholarship] = useState<boolean>(initialPercent > 0);
  const [discountPercent, setDiscountPercent] = useState<number>(initialPercent);
  const [reason, setReason] = useState<string>(initialReason);
  const [justSaved, setJustSaved] = useState<boolean>(false);

  // Sync state if discount prop changes from parent
  useEffect(() => {
    const nextTransport = discount?.is_transport_applicable ?? false;
    const nextPercent = Number(discount?.discount_percent ?? 0);
    const nextReason = discount?.reason ?? '';

    setIsTransport(nextTransport);
    setHasScholarship(nextPercent > 0);
    setDiscountPercent(nextPercent);
    setReason(nextReason);
  }, [discount]);

  const fullName = [student.first_name, student.middle_name, student.last_name]
    .filter(Boolean)
    .join(' ');

  // Calculate dirty status
  const effectivePercent = hasScholarship ? discountPercent : 0;
  const isDirty = useMemo(() => {
    return (
      isTransport !== initialTransport ||
      effectivePercent !== initialPercent ||
      reason.trim() !== initialReason.trim()
    );
  }, [isTransport, initialTransport, effectivePercent, initialPercent, reason, initialReason]);

  // Real-time calculated net monthly fee preview
  const netFee = useMemo(() => {
    const applicableDiscount = hasScholarship ? Math.min(100, Math.max(0, discountPercent)) : 0;
    const gross = baseTuition + (isTransport ? transportFee : 0);
    const calculated = gross * (1 - applicableDiscount / 100);
    return Math.max(0, calculated);
  }, [baseTuition, transportFee, isTransport, hasScholarship, discountPercent]);

  const handlePresetClick = (percent: number) => {
    setHasScholarship(true);
    setDiscountPercent(percent);
  };

  const handleScholarshipToggle = (checked: boolean) => {
    setHasScholarship(checked);
    if (checked && discountPercent === 0) {
      setDiscountPercent(25); // Default to 25% if previously zero
    }
  };

  const handleSave = async () => {
    try {
      await onSave(
        student.id,
        isTransport,
        hasScholarship ? Math.min(100, Math.max(0, discountPercent)) : 0,
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

      {/* Transportation Checkbox & Badge */}
      <TableCell className="py-3">
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <Checkbox
              checked={isTransport}
              onCheckedChange={(checked) => setIsTransport(Boolean(checked))}
              className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
            />
            <span className="text-xs font-semibold text-foreground">Transport</span>
          </label>
          <div>
            {isTransport ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                <Bus className="w-3 h-3" />
                Transport (Active)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border/50">
                No Transport
              </span>
            )}
          </div>
        </div>
      </TableCell>

      {/* Scholarship / Concession Toggle & Percent Input */}
      <TableCell className="py-3">
        <div className="space-y-2 max-w-xs">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <Checkbox
                checked={hasScholarship}
                onCheckedChange={(checked) => handleScholarshipToggle(Boolean(checked))}
                className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <span className="text-xs font-semibold text-foreground">Scholarship</span>
            </label>

            {hasScholarship && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                <Percent className="w-2.5 h-2.5" />
                {discountPercent}% Concession
              </span>
            )}
          </div>

          {hasScholarship && (
            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center gap-2">
                <div className="relative w-24">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                    className="h-7 text-xs font-mono pr-6"
                  />
                  <span className="absolute right-2 top-1.5 text-xs text-muted-foreground pointer-events-none">
                    %
                  </span>
                </div>

                {/* Preset quick buttons */}
                <div className="flex items-center gap-1">
                  {[10, 25, 50, 100].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handlePresetClick(preset)}
                      className={`px-1.5 py-0.5 text-[10px] font-semibold rounded border transition-colors cursor-pointer ${
                        discountPercent === preset
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-muted/80 hover:bg-muted border-border text-muted-foreground'
                      }`}
                    >
                      {preset}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Reason */}
              <Input
                type="text"
                placeholder="Reason (e.g. Merit, Sibling, Staff)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="h-6 text-[11px] placeholder:text-[11px] text-muted-foreground"
              />
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
            {isTransport && transportFee > 0 && (
              <>
                <span>+</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  Bus: NPR {transportFee.toLocaleString()}
                </span>
              </>
            )}
            {hasScholarship && discountPercent > 0 && (
              <>
                <span>-</span>
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  {discountPercent}%
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
