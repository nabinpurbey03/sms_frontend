import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  SIMULATED_DATE_STORAGE_KEY,
  calculateShiftedDate,
  getBsDateFromGregorian,
  getGregorianFromBs,
  formatDateToIso,
} from './timeTravelUtils';

export interface TimeTravelContextType {
  simulatedDate: string | null;
  effectiveDate: Date;
  isSimulated: boolean;
  setSimulatedDate: (dateString: string | null) => void;
  addDays: (days: number) => void;
  addMonths: (months: number) => void;
  addYears: (years: number) => void;
  setBsMonth: (monthIndex: number) => void;
  resetToLive: () => void;
}

export const TimeTravelContext = createContext<TimeTravelContextType | null>(null);

export interface TimeTravelProviderProps {
  children: React.ReactNode;
}

export const TimeTravelProvider: React.FC<TimeTravelProviderProps> = ({ children }) => {
  let queryClient: ReturnType<typeof useQueryClient> | null = null;
  try {
    queryClient = useQueryClient();
  } catch {
    queryClient = null;
  }

  const [simulatedDate, setSimulatedDateState] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return sessionStorage.getItem(SIMULATED_DATE_STORAGE_KEY);
    }
    return null;
  });

  const effectiveDate = useMemo(() => {
    return simulatedDate ? new Date(`${simulatedDate}T12:00:00Z`) : new Date();
  }, [simulatedDate]);

  const isSimulated = simulatedDate !== null;

  const setSimulatedDate = useCallback(
    (dateString: string | null) => {
      setSimulatedDateState(dateString);
      if (typeof window !== 'undefined' && window.sessionStorage) {
        if (dateString) {
          sessionStorage.setItem(SIMULATED_DATE_STORAGE_KEY, dateString);
        } else {
          sessionStorage.removeItem(SIMULATED_DATE_STORAGE_KEY);
        }
      }
      queryClient?.invalidateQueries();
    },
    [queryClient]
  );

  const addDays = useCallback(
    (days: number) => {
      const next = calculateShiftedDate(effectiveDate, { days });
      setSimulatedDate(formatDateToIso(next));
    },
    [effectiveDate, setSimulatedDate]
  );

  const addMonths = useCallback(
    (months: number) => {
      const next = calculateShiftedDate(effectiveDate, { months });
      setSimulatedDate(formatDateToIso(next));
    },
    [effectiveDate, setSimulatedDate]
  );

  const addYears = useCallback(
    (years: number) => {
      const next = calculateShiftedDate(effectiveDate, { years });
      setSimulatedDate(formatDateToIso(next));
    },
    [effectiveDate, setSimulatedDate]
  );

  const setBsMonth = useCallback(
    (monthIndex: number) => {
      const { year } = getBsDateFromGregorian(effectiveDate);
      const targetGregorian = getGregorianFromBs(year, monthIndex, 1);
      setSimulatedDate(formatDateToIso(targetGregorian));
    },
    [effectiveDate, setSimulatedDate]
  );

  const resetToLive = useCallback(() => {
    setSimulatedDate(null);
  }, [setSimulatedDate]);

  const contextValue = useMemo<TimeTravelContextType>(
    () => ({
      simulatedDate,
      effectiveDate,
      isSimulated,
      setSimulatedDate,
      addDays,
      addMonths,
      addYears,
      setBsMonth,
      resetToLive,
    }),
    [
      simulatedDate,
      effectiveDate,
      isSimulated,
      setSimulatedDate,
      addDays,
      addMonths,
      addYears,
      setBsMonth,
      resetToLive,
    ]
  );

  return (
    <TimeTravelContext.Provider value={contextValue}>
      {children}
    </TimeTravelContext.Provider>
  );
};

export function useTimeTravel(): TimeTravelContextType {
  const context = useContext(TimeTravelContext);
  if (!context) {
    throw new Error('useTimeTravel must be used within a TimeTravelProvider');
  }
  return context;
}
