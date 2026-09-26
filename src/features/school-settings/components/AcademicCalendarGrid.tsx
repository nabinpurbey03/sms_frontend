import React, { useMemo, useState, useEffect } from 'react';
import { Calendar, dayjsLocalizer, type View, type ToolbarProps } from 'react-big-calendar';
import dayjs from 'dayjs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, CalendarDays, Sparkles } from 'lucide-react';
import { getNepaliDateFromAd } from '../utils/nepaliDate';
import { useCalendarPreferenceStore } from '@/stores/calendarPreferenceStore';
import type { AcademicCalendarEvent, CalendarEventType } from '../types';
import '../styles/calendar.css';

const localizer = dayjsLocalizer(dayjs);

export interface AcademicCalendarGridProps {
  events: AcademicCalendarEvent[];
  canManage: boolean;
  onSelectDate: (adDateStr: string) => void;
  onSelectEvent: (event: AcademicCalendarEvent) => void;
  initialDate?: Date;
  minDate?: string; // Academic year start_date (YYYY-MM-DD)
  maxDate?: string; // Academic year end_date (YYYY-MM-DD)
  academicYearName?: string;
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
    return 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/80 dark:text-rose-100 dark:border-rose-800 border-l-[4px] border-l-rose-600';
  }
  switch (type) {
    case 'EXAM':
      return 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/80 dark:text-purple-100 dark:border-purple-800 border-l-[4px] border-l-purple-600';
    case 'VACATION':
      return 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-100 dark:border-amber-800 border-l-[4px] border-l-amber-600';
    case 'EVENT':
      return 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-100 dark:border-emerald-800 border-l-[4px] border-l-emerald-600';
    case 'OTHER':
    default:
      return 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/80 dark:text-blue-100 dark:border-blue-800 border-l-[4px] border-l-blue-600';
  }
};

/**
 * Custom Date Header component displaying date in user's preferred calendar system (BS or AD)
 */
const CustomDateHeader: React.FC<{
  date: Date;
  label: string;
  calendarSystem: 'BS' | 'AD';
  minDate?: string;
  maxDate?: string;
}> = ({ date, label, calendarSystem, minDate, maxDate }) => {
  const npInfo = useMemo(() => {
    return getNepaliDateFromAd(date);
  }, [date]);

  const pad = (n: number) => String(n).padStart(2, '0');
  const adStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const isOutOfSession = (minDate && adStr < minDate) || (maxDate && adStr > maxDate);

  const primaryNumber = calendarSystem === 'BS' ? (npInfo ? npInfo.date : label) : label;
  const secondaryText =
    calendarSystem === 'BS'
      ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : npInfo
      ? `${npInfo.monthNameEn.slice(0, 3)} ${npInfo.date}`
      : '';

  return (
    <div
      className={`flex flex-col items-end pr-1.5 pt-1 select-none transition-opacity ${
        isOutOfSession ? 'opacity-30' : ''
      }`}
    >
      <span className="text-sm font-bold text-foreground leading-none">
        {primaryNumber}
      </span>
      {secondaryText && (
        <span
          className="text-[10px] text-muted-foreground font-medium mt-0.5"
          title={
            npInfo
              ? `${npInfo.monthNameEn} ${npInfo.date}, ${npInfo.year} BS / ${adStr}`
              : adStr
          }
        >
          {secondaryText}
        </span>
      )}
    </div>
  );
};

/**
 * Custom Event Item component with status indicator dot and bold visible title
 */
const CustomEventComponent: React.FC<{ event: CalendarItem }> = ({ event }) => {
  const ev = event.resource;
  return (
    <div
      className="flex items-center gap-1.5 w-full min-w-0 py-0.5 px-1 leading-tight select-none"
      title={`${ev.title} (${ev.event_type}${ev.is_holiday ? ' - School Closed' : ''})`}
    >
      {ev.is_holiday ? (
        <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0 ring-1 ring-white dark:ring-black" />
      ) : (
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 shrink-0" />
      )}
      <span className="truncate font-semibold text-[11px] sm:text-xs tracking-tight">
        {ev.title}
      </span>
    </div>
  );
};

export const AcademicCalendarGrid: React.FC<AcademicCalendarGridProps> = ({
  events,
  canManage,
  onSelectDate,
  onSelectEvent,
  initialDate,
  minDate,
  maxDate,
  academicYearName,
}) => {
  const { calendarSystem } = useCalendarPreferenceStore();
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

    if (minDate && adDateStr < minDate) {
      alert(`Selected date is before academic session start (${minDate}).`);
      return;
    }
    if (maxDate && adDateStr > maxDate) {
      alert(`Selected date is after academic session end (${maxDate}).`);
      return;
    }

    onSelectDate(adDateStr);
  };

  // Clamped navigation bounded strictly by minDate and maxDate
  const handleNavigate = (newDate: Date) => {
    if (minDate) {
      const [minY, minM] = minDate.split('-').map(Number);
      const minMonthDate = new Date(minY, minM - 1, 1);
      if (newDate < minMonthDate) {
        setCurrentDate(minMonthDate);
        return;
      }
    }
    if (maxDate) {
      const [maxY, maxM] = maxDate.split('-').map(Number);
      const maxMonthDate = new Date(maxY, maxM - 1, 1);
      if (newDate > maxMonthDate) {
        setCurrentDate(maxMonthDate);
        return;
      }
    }
    setCurrentDate(newDate);
  };

  // Custom Bounded Toolbar
  const CustomToolbar: React.FC<ToolbarProps<CalendarItem>> = (props) => {
    const { date, label, onNavigate, onView, view } = props;

    // Check bounds for Prev button
    let canPrev = true;
    if (minDate) {
      const [minY, minM] = minDate.split('-').map(Number);
      if (
        date.getFullYear() < minY ||
        (date.getFullYear() === minY && date.getMonth() <= minM - 1)
      ) {
        canPrev = false;
      }
    }

    // Check bounds for Next button
    let canNext = true;
    if (maxDate) {
      const [maxY, maxM] = maxDate.split('-').map(Number);
      if (
        date.getFullYear() > maxY ||
        (date.getFullYear() === maxY && date.getMonth() >= maxM - 1)
      ) {
        canNext = false;
      }
    }

    // Check if today is in session
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    const todayInSession =
      (!minDate || todayStr >= minDate) && (!maxDate || todayStr <= maxDate);

    // Compute Nepali header title for month
    const midMonthDate = new Date(date.getFullYear(), date.getMonth(), 15);
    const npInfo = getNepaliDateFromAd(midMonthDate);

    const monthTitle =
      calendarSystem === 'BS' && npInfo
        ? `${npInfo.monthNameEn} ${npInfo.year} BS`
        : label;

    const subtitle =
      calendarSystem === 'BS'
        ? label
        : npInfo
        ? `${npInfo.monthNameEn} ${npInfo.year} BS`
        : '';

    return (
      <div className="rbc-toolbar flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 border-b border-border bg-card">
        {/* Navigation & Today Controls */}
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canPrev}
            onClick={() => onNavigate('PREV')}
            className="h-8 w-8 p-0"
            title={canPrev ? 'Previous Month' : 'Reached start of academic session'}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!todayInSession}
            onClick={() => {
              if (todayInSession) {
                onNavigate('TODAY');
              } else if (minDate) {
                const [minY, minM, minD] = minDate.split('-').map(Number);
                onNavigate('DATE', new Date(minY, minM - 1, minD));
              }
            }}
            className="h-8 px-2.5 text-xs font-semibold"
            title={
              todayInSession
                ? 'Jump to today'
                : 'Today is outside active session. Click to jump to session start.'
            }
          >
            Today
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canNext}
            onClick={() => onNavigate('NEXT')}
            className="h-8 w-8 p-0"
            title={canNext ? 'Next Month' : 'Reached end of academic session'}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Month & Year Title Header */}
        <div className="flex flex-col items-center md:items-start">
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg font-bold text-foreground">
              {monthTitle}
            </span>
            {subtitle && (
              <span className="text-xs text-muted-foreground font-medium">
                ({subtitle})
              </span>
            )}
          </div>
          {academicYearName && (
            <span className="text-[11px] text-muted-foreground font-medium">
              Academic Session: <strong className="text-foreground">{academicYearName}</strong>
              {minDate && maxDate ? ` (${minDate} to ${maxDate})` : ''}
            </span>
          )}
        </div>

        {/* View Switchers */}
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
          <button
            type="button"
            onClick={() => onView('month')}
            className={`h-7 px-3 text-xs rounded-md font-medium transition-colors cursor-pointer ${
              view === 'month'
                ? 'bg-background text-foreground font-bold shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Month Grid
          </button>
          <button
            type="button"
            onClick={() => onView('agenda')}
            className={`h-7 px-3 text-xs rounded-md font-medium transition-colors cursor-pointer ${
              view === 'agenda'
                ? 'bg-background text-foreground font-bold shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Agenda
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Legend & Help Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="text-muted-foreground font-medium">Categories:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
            <span className="text-foreground font-medium">Holiday / Closed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
            <span className="text-foreground font-medium">Examinations</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
            <span className="text-foreground font-medium">Vacations</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <span className="text-foreground font-medium">Events</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            <span className="text-foreground font-medium">Other</span>
          </div>
        </div>

        {canManage && (
          <span className="text-xs text-muted-foreground italic">
            Tip: Click any calendar date within the session to schedule an event.
          </span>
        )}
      </div>

      {/* Calendar Month Grid */}
      <div className="h-[700px] w-full">
        <Calendar
          localizer={localizer}
          events={calendarItems}
          startAccessor="start"
          endAccessor="end"
          views={['month', 'agenda']}
          view={currentView}
          onView={(view) => setCurrentView(view)}
          date={currentDate}
          onNavigate={handleNavigate}
          selectable={canManage}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={(item) => onSelectEvent(item.resource)}
          eventPropGetter={eventPropGetter}
          components={{
            toolbar: CustomToolbar,
            month: {
              dateHeader: (props) => (
                <CustomDateHeader
                  {...props}
                  calendarSystem={calendarSystem}
                  minDate={minDate}
                  maxDate={maxDate}
                />
              ),
            },
            event: CustomEventComponent,
          }}
          className="shadow-xs"
        />
      </div>
    </div>
  );
};
