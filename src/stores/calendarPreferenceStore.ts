import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CalendarSystem = 'BS' | 'AD';

interface CalendarPreferenceState {
  calendarSystem: CalendarSystem;
  setCalendarSystem: (calendarSystem: CalendarSystem) => void;
  toggleCalendarSystem: () => void;
}

export const useCalendarPreferenceStore = create<CalendarPreferenceState>()(
  persist(
    (set, get) => ({
      calendarSystem: 'BS', // default to BS for Nepali school context
      setCalendarSystem: (calendarSystem: CalendarSystem) => set({ calendarSystem }),
      toggleCalendarSystem: () => {
        const next = get().calendarSystem === 'BS' ? 'AD' : 'BS';
        set({ calendarSystem: next });
      },
    }),
    {
      name: 'schools_up_calendar_system',
    }
  )
);
