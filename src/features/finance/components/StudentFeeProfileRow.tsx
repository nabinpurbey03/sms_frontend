import React, { useMemo } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bus,
  Building2,
  Utensils,
  BookOpen,
  FlaskConical,
  Trophy,
  Sparkles,
  ChevronRight,
  User,
  Layers,
  Tag,
} from 'lucide-react';
import type { AcademicStudent } from '@/features/academic/types';
import type { StudentTransportProfile, StudentFeeAssignment, FeeCategory } from '../types';
import {
  calculateEffectiveTransportFee,
  calculateStudentNetMonthlyTotal,
  getFacilityCategoryMeta,
} from '../utils/studentFacilityUtils';

export interface StudentFeeProfileRowProps {
  student: AcademicStudent;
  assignedFees?: StudentFeeAssignment[];
  transportProfile?: StudentTransportProfile | null;
  baseTuition: number;
  classDefaultTransportRate?: number;
  onManageFacilities: (student: AcademicStudent) => void;
  sectionName?: string;
  rollNumber?: number;
}

export const StudentFeeProfileRow: React.FC<StudentFeeProfileRowProps> = ({
  student,
  assignedFees = [],
  transportProfile,
  baseTuition,
  classDefaultTransportRate = 0,
  onManageFacilities,
  sectionName,
  rollNumber,
}) => {
  const fullName = [student.first_name, student.middle_name, student.last_name]
    .filter(Boolean)
    .join(' ');

  const isTransport = Boolean(transportProfile?.is_transport_applicable);
  const effectiveTransportRate = useMemo(() => {
    return calculateEffectiveTransportFee(transportProfile, classDefaultTransportRate);
  }, [transportProfile, classDefaultTransportRate]);

  // Active facility assignments
  const activeAssignments = useMemo(() => {
    return assignedFees.filter((fee) => fee.is_active !== false);
  }, [assignedFees]);

  // Net monthly sum calculated real-time
  const netMonthlyTotal = useMemo(() => {
    return calculateStudentNetMonthlyTotal({
      baseTuition,
      transportProfile,
      classDefaultTransportRate,
      assignedFees: activeAssignments,
    });
  }, [baseTuition, transportProfile, classDefaultTransportRate, activeAssignments]);

  const hasAnyFacilities = isTransport || activeAssignments.length > 0;

  // Facility badge renderer by category
  const renderCategoryBadge = (fee: StudentFeeAssignment) => {
    const cat = fee.fee_category as FeeCategory;
    const amountNum = Number(fee.amount) || 0;
    const formattedAmount = amountNum.toLocaleString('en-US');

    switch (cat) {
      case 'HOSTEL':
        return (
          <Badge
            key={fee.id}
            variant="outline"
            className="bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800 gap-1 text-[11px] font-medium"
          >
            <Building2 className="w-3 h-3 shrink-0" />
            <span>Hostel (NPR {formattedAmount})</span>
          </Badge>
        );
      case 'CANTEEN':
        return (
          <Badge
            key={fee.id}
            variant="outline"
            className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800 gap-1 text-[11px] font-medium"
          >
            <Utensils className="w-3 h-3 shrink-0" />
            <span>Canteen (NPR {formattedAmount})</span>
          </Badge>
        );
      case 'COACHING':
        return (
          <Badge
            key={fee.id}
            variant="outline"
            className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 gap-1 text-[11px] font-medium"
          >
            <BookOpen className="w-3 h-3 shrink-0" />
            <span>Coaching (NPR {formattedAmount})</span>
          </Badge>
        );
      case 'LAB':
        return (
          <Badge
            key={fee.id}
            variant="outline"
            className="bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800 gap-1 text-[11px] font-medium"
          >
            <FlaskConical className="w-3 h-3 shrink-0" />
            <span>Lab (NPR {formattedAmount})</span>
          </Badge>
        );
      case 'ACTIVITY':
        return (
          <Badge
            key={fee.id}
            variant="outline"
            className="bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800 gap-1 text-[11px] font-medium"
          >
            <Trophy className="w-3 h-3 shrink-0" />
            <span>Activity (NPR {formattedAmount})</span>
          </Badge>
        );
      case 'SCHOLARSHIP':
        return (
          <Badge
            key={fee.id}
            variant="outline"
            className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 gap-1 text-[11px] font-medium"
          >
            <Tag className="w-3 h-3 shrink-0" />
            <span>Scholarship (-NPR {formattedAmount})</span>
          </Badge>
        );
      default: {
        const meta = getFacilityCategoryMeta(cat);
        return (
          <Badge
            key={fee.id}
            variant="outline"
            className={`gap-1 text-[11px] font-medium ${meta.colorClass}`}
          >
            <Layers className="w-3 h-3 shrink-0" />
            <span>
              {fee.fee_name || meta.label} (NPR {formattedAmount})
            </span>
          </Badge>
        );
      }
    }
  };

  const studentAny = student as unknown as { roll_number?: number | string; admission_number?: string };
  const effectiveRoll = studentAny.roll_number ?? rollNumber;
  const admissionNumber = studentAny.admission_number || student.id.slice(0, 8);

  return (
    <TableRow className="hover:bg-muted/40 transition-colors">
      {/* Student Identity */}
      <TableCell className="py-3 font-medium">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
            {effectiveRoll !== undefined && effectiveRoll !== null ? (
              <span>{effectiveRoll}</span>
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
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <span>Adm: {admissionNumber}</span>
              <span>•</span>
              <span className="font-medium text-foreground">{student.status}</span>
            </p>
          </div>
        </div>
      </TableCell>

      {/* Base Tuition */}
      <TableCell className="py-3">
        <div className="font-mono font-semibold text-xs text-foreground">
          NPR {baseTuition.toLocaleString()}
        </div>
        <span className="text-[10px] text-muted-foreground">Class Standard</span>
      </TableCell>

      {/* Active Facility Badges */}
      <TableCell className="py-3">
        <div className="flex flex-wrap items-center gap-1.5 max-w-md">
          {isTransport && (
            <Badge
              variant="outline"
              className="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800 gap-1 text-[11px] font-medium"
            >
              <Bus className="w-3 h-3 shrink-0" />
              <span>Bus (NPR {effectiveTransportRate.toLocaleString()})</span>
            </Badge>
          )}

          {activeAssignments.map(renderCategoryBadge)}

          {!hasAnyFacilities && (
            <span className="text-xs text-muted-foreground italic">
              None (Standard)
            </span>
          )}
        </div>
      </TableCell>

      {/* Net Monthly Total */}
      <TableCell className="py-3">
        <div className="space-y-0.5">
          <div className="font-mono font-bold text-sm text-foreground">
            NPR {netMonthlyTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Monthly projected bill
          </p>
        </div>
      </TableCell>

      {/* Manage Action */}
      <TableCell className="py-3 text-right">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onManageFacilities(student)}
          className="h-8 px-3 text-xs gap-1.5 cursor-pointer font-medium hover:bg-primary/5 hover:text-primary transition-colors shadow-2xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>Manage Facilities</span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        </Button>
      </TableCell>
    </TableRow>
  );
};
