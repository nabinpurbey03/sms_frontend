export interface AcademicYearCandidate {
  id: string;
  name: string;
  start_date?: string;
  end_date?: string;
  is_current?: boolean;
}

export interface CloneScope {
  includeSchoolFees: boolean;
  includeClassFees: boolean;
  includeStudentPresets: boolean;
}

export const PERCENTAGE_PRESETS = [
  { label: '0% (Exact)', value: 0 },
  { label: '+5%', value: 5 },
  { label: '+10%', value: 10 },
  { label: '+15%', value: 15 },
] as const;

export const ROUNDING_OPTIONS = [
  { label: 'Exact (0)', value: 0, description: 'No rounding (2 decimals)' },
  { label: 'Nearest Re 1 (1)', value: 1, description: 'Round to nearest Rupee' },
  { label: 'Nearest NPR 10 (10)', value: 10, description: 'Standard school rounding' },
] as const;

/**
 * Calculates adjusted amount based on percentage increase and rounding interval.
 */
export function calculateAdjustedAmount(
  baseAmount: number,
  percentageIncrease: number = 0,
  roundToNearest: number = 10
): number {
  const raw = baseAmount * (1 + percentageIncrease / 100);
  if (!roundToNearest || roundToNearest <= 0) {
    return Math.round(raw * 100) / 100;
  }
  return Math.round(raw / roundToNearest) * roundToNearest;
}

/**
 * Filter out currentYearId and sort past academic years descending by start date or name.
 */
export function filterAndSortCandidateAcademicYears<T extends AcademicYearCandidate>(
  years: T[] = [],
  currentYearId?: string
): T[] {
  return (years || [])
    .filter((y) => !currentYearId || y.id !== currentYearId)
    .sort((a, b) => {
      const dateA = a.start_date || '';
      const dateB = b.start_date || '';
      if (dateB !== dateA) {
        return dateB.localeCompare(dateA);
      }
      return (b.name || '').localeCompare(a.name || '');
    });
}

/**
 * Validates that at least one scope checkbox is active.
 */
export function isCloneScopeValid(scope: CloneScope): boolean {
  return scope.includeSchoolFees || scope.includeClassFees || scope.includeStudentPresets;
}

/**
 * Generates an interactive preview text describing the base fee adjustment.
 */
export function formatCloneSampleText(
  baseAmount: number,
  percentageIncrease: number = 0,
  roundToNearest: number = 10
): string {
  const adjusted = calculateAdjustedAmount(baseAmount, percentageIncrease, roundToNearest);
  const sign = percentageIncrease >= 0 ? `+${percentageIncrease}%` : `${percentageIncrease}%`;
  const roundingDesc =
    roundToNearest === 0
      ? 'exact'
      : roundToNearest === 1
      ? 'nearest Re 1'
      : `nearest ${roundToNearest} NPR`;
  return `Base fee of NPR ${baseAmount.toLocaleString()} with ${sign} rounded to ${roundingDesc} → NPR ${adjusted.toLocaleString()}`;
}

export interface SessionCloneBannerState {
  shouldShowBanner: boolean;
  hasPreviousSessions: boolean;
  latestPreviousYearName?: string;
  totalFeeHeadsCount: number;
}

export function computeSessionCloneBannerState(params: {
  totalFeeHeadsCount: number;
  candidateYears: Array<{ id: string; name: string }>;
  isLoading: boolean;
}): SessionCloneBannerState {
  if (params.isLoading) {
    return {
      shouldShowBanner: false,
      hasPreviousSessions: false,
      totalFeeHeadsCount: params.totalFeeHeadsCount,
    };
  }

  const candidateYears = params.candidateYears || [];
  const hasPreviousSessions = candidateYears.length > 0;
  const shouldShowBanner = params.totalFeeHeadsCount === 0;
  const latestPreviousYearName = candidateYears[0]?.name;

  return {
    shouldShowBanner,
    hasPreviousSessions,
    latestPreviousYearName,
    totalFeeHeadsCount: params.totalFeeHeadsCount,
  };
}

