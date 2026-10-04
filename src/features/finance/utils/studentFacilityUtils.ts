import type { StudentTransportProfile, StudentFeeAssignment } from '../types';

export interface StudentFacilityCalculationOptions {
  baseTuition: number;
  transportProfile?: Pick<StudentTransportProfile, 'is_transport_applicable' | 'transport_fee'> | null;
  classDefaultTransportRate?: number;
  assignedFees?: Array<Pick<StudentFeeAssignment, 'amount' | 'fee_category' | 'frequency' | 'is_active'>>;
}

/**
 * Computes the effective transport fee for a student.
 * If transport is applicable:
 *   - returns custom transport fee if specified (>= 0),
 *   - otherwise falls back to the class default rate.
 * If transport is not applicable, returns 0.
 */
export function calculateEffectiveTransportFee(
  transportProfile?: Pick<StudentTransportProfile, 'is_transport_applicable' | 'transport_fee'> | null,
  defaultClassRate: number = 0
): number {
  if (!transportProfile?.is_transport_applicable) {
    return 0;
  }
  if (
    transportProfile.transport_fee !== undefined &&
    transportProfile.transport_fee !== null &&
    !isNaN(Number(transportProfile.transport_fee)) &&
    Number(transportProfile.transport_fee) >= 0
  ) {
    return Number(transportProfile.transport_fee);
  }
  return defaultClassRate;
}

/**
 * Computes the sum of all monthly active facility fees (excluding scholarships/concessions).
 */
export function calculateStudentFacilitiesMonthlyTotal(
  assignedFees: Array<Pick<StudentFeeAssignment, 'amount' | 'fee_category' | 'frequency' | 'is_active'>> = []
): number {
  return assignedFees
    .filter(
      (f) =>
        f.is_active !== false &&
        (f.frequency === 'MONTHLY' || !f.frequency) &&
        f.fee_category !== 'SCHOLARSHIP'
    )
    .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
}

/**
 * Computes the sum of all monthly active scholarship/concession discounts.
 */
export function calculateStudentConcessionsMonthlyTotal(
  assignedFees: Array<Pick<StudentFeeAssignment, 'amount' | 'fee_category' | 'frequency' | 'is_active'>> = []
): number {
  return assignedFees
    .filter(
      (f) =>
        f.is_active !== false &&
        (f.frequency === 'MONTHLY' || !f.frequency) &&
        f.fee_category === 'SCHOLARSHIP'
    )
    .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
}

/**
 * Computes the net monthly total fee for a student:
 * Base Tuition + Effective Transport + Monthly Facilities - Monthly Concessions.
 * Guaranteed to never be less than 0.
 */
export function calculateStudentNetMonthlyTotal(options: StudentFacilityCalculationOptions): number {
  const {
    baseTuition = 0,
    transportProfile,
    classDefaultTransportRate = 0,
    assignedFees = [],
  } = options;

  const effectiveTransport = calculateEffectiveTransportFee(transportProfile, classDefaultTransportRate);
  const facilitiesTotal = calculateStudentFacilitiesMonthlyTotal(assignedFees);
  const concessionsTotal = calculateStudentConcessionsMonthlyTotal(assignedFees);

  return Math.max(0, baseTuition + effectiveTransport + facilitiesTotal - concessionsTotal);
}

export interface FacilityCategoryMeta {
  category: string;
  label: string;
  colorClass: string;
  iconName: string;
}

/**
 * Maps a fee category to UI display tokens including badge label, color classes, and icon identifiers.
 */
export function getFacilityCategoryMeta(category: string): FacilityCategoryMeta {
  const cat = String(category).toUpperCase();
  switch (cat) {
    case 'TRANSPORT':
      return {
        category: 'TRANSPORT',
        label: 'Bus',
        colorClass:
          'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        iconName: 'Bus',
      };
    case 'HOSTEL':
      return {
        category: 'HOSTEL',
        label: 'Hostel',
        colorClass:
          'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        iconName: 'Building2',
      };
    case 'CANTEEN':
      return {
        category: 'CANTEEN',
        label: 'Canteen',
        colorClass:
          'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        iconName: 'Utensils',
      };
    case 'COACHING':
      return {
        category: 'COACHING',
        label: 'Coaching',
        colorClass:
          'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        iconName: 'BookOpen',
      };
    case 'LAB':
      return {
        category: 'LAB',
        label: 'Lab',
        colorClass:
          'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
        iconName: 'FlaskConical',
      };
    case 'ACTIVITY':
      return {
        category: 'ACTIVITY',
        label: 'Activity',
        colorClass:
          'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        iconName: 'Trophy',
      };
    case 'SCHOLARSHIP':
      return {
        category: 'SCHOLARSHIP',
        label: 'Scholarship',
        colorClass:
          'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
        iconName: 'Tag',
      };
    case 'TUITION':
      return {
        category: 'TUITION',
        label: 'Tuition',
        colorClass: 'bg-blue-600/10 text-blue-800 dark:text-blue-300 border-blue-600/20',
        iconName: 'GraduationCap',
      };
    case 'MISC':
      return {
        category: 'MISC',
        label: 'Misc',
        colorClass:
          'bg-slate-50 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300 border-slate-200 dark:border-slate-800',
        iconName: 'Layers',
      };
    default:
      return {
        category: cat,
        label: 'Facility',
        colorClass:
          'bg-slate-50 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300 border-slate-200 dark:border-slate-800',
        iconName: 'Layers',
      };
  }
}

/**
 * Formats a clean badge label string for facility display, e.g. "Bus (NPR 1,200)", "Hostel (NPR 4,500)".
 */
export function formatFacilityBadgeLabel(
  category: string,
  _name: string,
  amount?: number | string | null
): string {
  const meta = getFacilityCategoryMeta(category);
  const amtNum = amount !== undefined && amount !== null ? Number(amount) : null;
  if (amtNum !== null && !isNaN(amtNum)) {
    return `${meta.label} (NPR ${amtNum.toLocaleString('en-US')})`;
  }
  return meta.label;
}

export interface TransportDisplayMeta {
  isEnrolled: boolean;
  monthlyFee: number;
  isCustomRate: boolean;
  rateBadgeLabel: string;
  routeDescription: string;
}

/**
 * Returns structured presentation metadata for student transportation status,
 * differentiating unenrolled, class standard rates, and custom route rates.
 */
export function getTransportDisplayMeta(
  profile: { is_transport_applicable?: boolean; transport_fee?: number | string | null; reason?: string | null } | null | undefined,
  classDefaultRate: number = 0
): TransportDisplayMeta {
  const isEnrolled = Boolean(profile?.is_transport_applicable);
  if (!isEnrolled) {
    return {
      isEnrolled: false,
      monthlyFee: 0,
      isCustomRate: false,
      rateBadgeLabel: 'Not Enrolled',
      routeDescription: 'No bus facility requested',
    };
  }

  const hasCustomFee = profile?.transport_fee !== null && profile?.transport_fee !== undefined;
  const monthlyFee = hasCustomFee ? Number(profile!.transport_fee) : classDefaultRate;
  const isCustomRate = hasCustomFee && Number(profile!.transport_fee) !== classDefaultRate;

  const rawReason = typeof profile?.reason === 'string' ? profile.reason.trim() : '';
  const routeDescription = rawReason.length > 0 ? rawReason : 'Standard school bus route';

  return {
    isEnrolled: true,
    monthlyFee,
    isCustomRate,
    rateBadgeLabel: isCustomRate ? 'Custom Rate' : 'Class Standard',
    routeDescription,
  };
}

