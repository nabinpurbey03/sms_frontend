import { useMemo } from 'react';
import { useAcademicYears } from '../hooks';
import type { AcademicYearResponse } from '../types';

export interface UseCurrentAcademicYearReturn {
  currentYear: AcademicYearResponse | null;
  currentYearId: string | null;
  years: AcademicYearResponse[];
  isLoading: boolean;
  isError: boolean;
}

export const useCurrentAcademicYear = (
  tenantId: string | null
): UseCurrentAcademicYearReturn => {
  const { data: years = [], isLoading, isError } = useAcademicYears(tenantId);

  const currentYear = useMemo(() => {
    if (!years || years.length === 0) return null;
    return years.find((y) => y.is_current) || years[0] || null;
  }, [years]);

  return {
    currentYear,
    currentYearId: currentYear?.id || null,
    years,
    isLoading,
    isError,
  };
};
