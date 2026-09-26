import React, { useMemo, useState, useEffect } from 'react';
import { Calendar, dayjsLocalizer, type View } from 'react-big-calendar';
import dayjs from 'dayjs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getNepaliDateFromAd } from '../utils/nepaliDate';
import type { AcademicCalendarEvent, CalendarEventType } from '../types';
import '../styles/calendar.css';

const localizer = dayjsLocalizer(dayjs);

export interface AcademicCalendarGridProps {
  events: AcademicCalendarEvent[];
  canManage: boolean;
  onSelectDate: (adDateStr: string) => void;
  onSelectEvent: (event: AcademicCalendarEvent) => void;
  initialDate?: Date;
}

interface CalendarItem {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: AcademicCalendarEvent;
}

export const getCategoryBlockClass = (type: CalendarEventType, isHoliday: boolean): string => {
  if (isHoliday || type === 'HOLIDAY') {
    return 'border-rose-300 dark:border-rose-900 bg-rose-500/15 text-rose-700 dark:text-rose-300';
  }
  switch (type) {
    case 'EXAM':
      return 'border-purple-300 dark:border-purple-900 bg-purple-500/15 text-purple-700 dark:text-purple-300';
    case 'VACATION':
      return 'border-amber-300 dark:border-amber-900 bg-amber-500/15 text-amber-700 dark:text-amber-300';
    case 'EVENT':
      return 'border-emerald-300 dark:border-emerald-900 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
    case 'OTHER':
    default:
      return 'border-slate-300 dark:border-slate-800 bg-slate-500/15 text-slate-700 dark:text-slate-300';
  }
};

/**
 * Custom Date Header component displaying Gregorian day number + small Nepali (BS) date overlay
 */
const CustomDateHeader: React.FC<{ date: Date; label: string }> = ({ date, label }) => {
  const npInfo = useMemo(() => {
    return getNepaliDateFromAd(date);
  }, [date]);

  return (
    <div className="flex flex-col items-end pr-1.5 pt-1 select-none">
      <span className="text-sm font-semibold text-foreground leading-none">{label}</span>
      {npInfo && (
        <span
          className="text-[10px] text-muted-foreground font-medium mt-0.5"
          title={`${npInfo.monthNameEn} ${npInfo.date}, ${npInfo.year} BS`}
        >
          {npInfo.monthNameEn.slice(0, 3)} {npInfo.date}
        </span>
      )}
    </div>
  );
};

/**
 * Custom Event Item component with status indicator dot
 */
const CustomEventComponent: React.FC<{ event: CalendarItem }> = ({ event }) => {
  const ev = event.resource;
  return (
    <div
      className="flex items-center gap-1 w-full overflow-hidden px-1 text-xs"
      title={`${ev.title} (${ev.event_type}${ev.is_holiday ? ' - School Closed' : ''})`}
    >
      {ev.is_holiday && (
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
      )}
      <span className="truncate font-medium">{ev.title}</span>
    </div>
  );
};

export const AcademicCalendarGrid: React.FC<AcademicCalendarGridProps> = ({
  events,
  canManage,
  onSelectDate,
  onSelectEvent,
  initialDate,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(initialDate || new Date());
  const [currentView, setCurrentView] = useState<View>('month');

  useEffect(() => {
    if (initialDate) {
      setCurrentDate(initialDate);
    }
  }, [initialDate]);

  // Map events to react-big-calendar items
  const calendarItems = useMemo<CalendarItem[]>(() => {
    return events.map((event) => {
      const [sy, sm, sd] = event.start_date.split('-').map(Number);
      const [ey, em, ed] = event.end_date.split('-').map(Number);

      const start = new Date(sy, sm - 1, sd, 0, 0, 0);
      const end = new Date(ey, em - 1, ed, 23, 59, 59);

      return {
        id: event.id,
        title: event.title,
        start,
        end,
        allDay: true,
        resource: event,
      };
    });
  }, [events]);

  const eventPropGetter = (item: CalendarItem) => {
    const ev = item.resource;
    const colorClasses = getCategoryBlockClass(ev.event_type, ev.is_holiday);
    return {
      className: `${colorClasses} border rounded-md shadow-2xs transition-transform hover:scale-[1.01] cursor-pointer`,
    };
  };

  const handleSelectSlot = (slotInfo: { start: Date; end: Date; action: string }) => {
    if (!canManage) return;
    const pad = (n: number) => String(n).padStart(2, '0');
    const d = slotInfo.start;
    const adDateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    onSelectDate(adDateStr);
  };

  return (
    <div className="space-y-3">
      {/* Legend & Help Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="text-muted-foreground font-medium">Categories:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-foreground">Holiday / School Closed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span className="text-foreground">Examinations</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-foreground">Vacations</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-foreground">Events</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
            <span className="text-foreground">Other</span>
          </div>
        </div>

        {canManage && (
          <span className="text-xs text-muted-foreground italic">
            Tip: Click any calendar date to schedule an event.
          </span>
        )}
      </div>

      {/* Calendar Month Grid */}
      <div className="h-[680px] w-full">
        <Calendar
          localizer={localizer}
          events={calendarItems}
          startAccessor="start"
          endAccessor="end"
          views={['month', 'agenda']}
          view={currentView}
          onView={(view) => setCurrentView(view)}
          date={currentDate}
          onNavigate={(newDate) => setCurrentDate(newDate)}
          selectable={canManage}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={(item) => onSelectEvent(item.resource)}
          eventPropGetter={eventPropGetter}
          components={{
            month: {
              dateHeader: CustomDateHeader,
            },
            event: CustomEventComponent,
          }}
          className="shadow-xs"
        />
      </div>
    </div>
  );
};
