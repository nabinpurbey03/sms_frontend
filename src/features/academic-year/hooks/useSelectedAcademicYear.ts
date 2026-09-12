import { useEffect } from 'react';
import { useAcademicYearStore } from '@/stores/academicYearStore';
import { useAcademicYears } from '../hooks';
import { useAuth } from '@/auth/useAuth';

export const useSelectedAcademicYear = () => {
  const { activeTenantId } = useAuth();
  const { data: years = [], isLoading, isError } = useAcademicYears(activeTenantId);
  
  const selectedYearId = useAcademicYearStore((state) => state.selectedYearId);
  const setSelectedYearId = useAcademicYearStore((state) => state.setSelectedYearId);

  // Automatically select the current year if none is selected, or if selected is not in the list
  useEffect(() => {
    if (!isLoading && years.length > 0) {
      if (!selectedYearId || !years.find((y) => y.id === selectedYearId)) {
        const currentYear = years.find((y) => y.is_current);
        if (currentYear) {
          setSelectedYearId(currentYear.id);
        } else {
          // fallback to first one if no current year is set
          setSelectedYearId(years[0].id);
        }
      }
    }
  }, [years, selectedYearId, isLoading, setSelectedYearId]);

  const selectedYear = years.find(y => y.id === selectedYearId);
  
  return {
    years,
    selectedYearId,
    selectedYear,
    setSelectedYearId,
    isLoading,
    isError,
  };
};
