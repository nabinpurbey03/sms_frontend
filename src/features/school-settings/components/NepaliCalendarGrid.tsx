import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  NEPALI_MONTHS,
  NEPALI_DAYS_OF_WEEK,
  bsToAd,
  getNepaliDateFromAd,
  getBsDaysInMonth,
  getBsMonthStartDayOfWeek,
  getBsMonthDateRangeAd,
  isBsMonthWithinBounds,
  isAdDateWithinSession,
  formatDualDateRange,
} from '../utils/nepaliDate';
import { getCategoryBlockClass, getCategoryDotColor } from './AcademicCalendarGrid';
import type { AcademicCalendarEvent } from '../types';

export interface NepaliCalendarGridProps {
  events: AcademicCalendarEvent[];
  canManage: boolean;
  onSelectDate: (adDateStr: string) => void;
  onSelectEvent: (event: AcademicCalendarEvent) => void;
  initialDate?: Date;
  minDate?: string; // Academic year start_date (YYYY-MM-DD)
  maxDate?: string; // Academic year end_date (YYYY-MM-DD)
  academicYearName?: string;
  viewAdDate?: Date;
  onViewAdDateChange?: (d: Date) => void;
}

export const NepaliCalendarGrid: React.FC<NepaliCalendarGridProps> = ({
  events,
  canManage,
  onSelectDate,
  onSelectEvent,
  initialDate,
  minDate,
  maxDate,
  academicYearName,
  viewAdDate,
  onViewAdDateChange,
}) => {
  // Determine initial BS Year and Month
  const initialBs = useMemo(() => {
    const d = viewAdDate ?? initialDate ?? new Date();
    const info = getNepaliDateFromAd(d);
    return {
      year: info?.year ?? 2082,
      month: info?.month ?? 5,
    };
  }, [viewAdDate, initialDate]);

  const [viewYear, setViewYear] = useState<number>(initialBs.year);
  const [viewMonth, setViewMonth] = useState<number>(initialBs.month);
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month');

  // Sync BS view position when viewAdDate changes (e.g. from Gregorian grid navigation)
  useEffect(() => {
    if (viewAdDate) {
      const info = getNepaliDateFromAd(viewAdDate);
      if (info) {
        setViewYear(info.year);
        setViewMonth(info.month);
      }
    }
  }, [viewAdDate]);

  const syncAdDate = (year: number, monthIndex: number) => {
    if (!onViewAdDateChange) return;
    const pad = (n: number) => String(n).padStart(2, '0');
    const adStr = bsToAd(`${year}-${pad(monthIndex + 1)}-01`);
    if (adStr) {
      const [y, m, d] = adStr.split('-').map(Number);
      onViewAdDateChange(new Date(y, m - 1, d));
    }
  };

  // Days in viewed BS month and starting day of week
  const daysInMonth = useMemo(() => {
    return getBsDaysInMonth(viewYear, viewMonth);
  }, [viewYear, viewMonth]);

  const startDayOfWeek = useMemo(() => {
    return getBsMonthStartDayOfWeek(viewYear, viewMonth);
  }, [viewYear, viewMonth]);

  const monthRangeAd = useMemo(() => {
    return getBsMonthDateRangeAd(viewYear, viewMonth);
  }, [viewYear, viewMonth]);

  // Session bounds check for Prev and Next navigation
  const canPrev = useMemo(() => {
    const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
    const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
    return isBsMonthWithinBounds(prevYear, prevMonth, minDate, maxDate);
  }, [viewYear, viewMonth, minDate, maxDate]);

  const canNext = useMemo(() => {
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    return isBsMonthWithinBounds(nextYear, nextMonth, minDate, maxDate);
  }, [viewYear, viewMonth, minDate, maxDate]);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (!canPrev) return;
    const newMonth = viewMonth === 0 ? 11 : viewMonth - 1;
    const newYear = viewMonth === 0 ? viewYear - 1 : viewYear;
    setViewYear(newYear);
    setViewMonth(newMonth);
    syncAdDate(newYear, newMonth);
  };

  const handleNextMonth = () => {
    if (!canNext) return;
    const newMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    const newYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    setViewYear(newYear);
    setViewMonth(newMonth);
    syncAdDate(newYear, newMonth);
  };

  const handleToday = () => {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayAdStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

    if (isAdDateWithinSession(todayAdStr, minDate, maxDate)) {
      const todayInfo = getNepaliDateFromAd(today);
      if (todayInfo) {
        setViewYear(todayInfo.year);
        setViewMonth(todayInfo.month);
        syncAdDate(todayInfo.year, todayInfo.month);
      }
    } else if (minDate) {
      const minInfo = getNepaliDateFromAd(minDate);
      if (minInfo) {
        setViewYear(minInfo.year);
        setViewMonth(minInfo.month);
        syncAdDate(minInfo.year, minInfo.month);
      }
    }
  };

  // Build list of valid BS years based on minDate/maxDate
  const availableYears = useMemo(() => {
    let minYear = 2070;
    let maxYear = 2090;
    if (minDate) {
      const minInfo = getNepaliDateFromAd(minDate);
      if (minInfo) minYear = minInfo.year;
    }
    if (maxDate) {
      const maxInfo = getNepaliDateFromAd(maxDate);
      if (maxInfo) maxYear = maxInfo.year;
    }
    const years: number[] = [];
    for (let y = minYear; y <= maxYear; y++) {
      years.push(y);
    }
    return years.length > 0 ? years : [2082];
  }, [minDate, maxDate]);

  // Map events to BS days for fast lookup
  const eventsByDay = useMemo(() => {
    const map = new Map<number, AcademicCalendarEvent[]>();
    const pad = (n: number) => String(n).padStart(2, '0');

    for (let d = 1; d <= daysInMonth; d++) {
      const bsStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(d)}`;
      const adStr = bsToAd(bsStr);
      if (!adStr) continue;

      const matching = events.filter((ev) => ev.start_date <= adStr && adStr <= ev.end_date);
      if (matching.length > 0) {
        map.set(d, matching);
      }
    }
    return map;
  }, [events, daysInMonth, viewYear, viewMonth]);

  // Gregorian today
  const todayAdStr = useMemo(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }, []);

  const currentMonthInfo = NEPALI_MONTHS[viewMonth];

  // Month Events for Agenda View
  const monthEvents = useMemo(() => {
    return events.filter(
      (e) => e.start_date <= monthRangeAd.endAd && e.end_date >= monthRangeAd.startAd
    );
  }, [events, monthRangeAd]);

  return (
    <div className="space-y-3">
      {/* Calendar Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 border border-border rounded-xl bg-card shadow-xs">
        {/* Navigation & Jump to Today */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canPrev}
            onClick={handlePrevMonth}
            className="h-8 w-8 p-0 cursor-pointer"
            title={canPrev ? 'Previous BS Month' : 'Session start reached'}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="h-8 px-2.5 text-xs font-semibold cursor-pointer"
          >
            Today
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canNext}
            onClick={handleNextMonth}
            className="h-8 w-8 p-0 cursor-pointer"
            title={canNext ? 'Next BS Month' : 'Session end reached'}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Month & Year Selectors & Academic Session Title */}
        <div className="flex flex-col items-center md:items-start">
          <div className="flex items-center gap-2">
            <select
              value={viewMonth}
              onChange={(e) => {
                const m = Number(e.target.value);
                setViewMonth(m);
                syncAdDate(viewYear, m);
              }}
              className="rounded-md border border-input bg-background px-2.5 py-1 text-sm sm:text-base font-bold text-foreground shadow-2xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {NEPALI_MONTHS.map((m) => {
                const disabled = !isBsMonthWithinBounds(viewYear, m.index, minDate, maxDate);
                return (
                  <option key={m.index} value={m.index} disabled={disabled}>
                    {m.nameNp} ({m.nameEn})
                  </option>
                );
              })}
            </select>

            <select
              value={viewYear}
              onChange={(e) => {
                const y = Number(e.target.value);
                setViewYear(y);
                syncAdDate(y, viewMonth);
              }}
              className="rounded-md border border-input bg-background px-2.5 py-1 text-sm sm:text-base font-bold text-foreground shadow-2xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y} BS
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mt-1">
            <span>
              {monthRangeAd.startAd} to {monthRangeAd.endAd} AD
            </span>
            {academicYearName && (
              <>
                <span>•</span>
                <span className="font-semibold text-foreground">{academicYearName}</span>
              </>
            )}
          </div>
        </div>

        {/* View Switchers: Month Grid vs Agenda */}
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
          <button
            type="button"
            onClick={() => setViewMode('month')}
            className={`h-7 px-3 text-xs rounded-md font-medium transition-colors cursor-pointer ${
              viewMode === 'month'
                ? 'bg-background text-foreground font-bold shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Month Grid
          </button>
          <button
            type="button"
            onClick={() => setViewMode('agenda')}
            className={`h-7 px-3 text-xs rounded-md font-medium transition-colors cursor-pointer ${
              viewMode === 'agenda'
                ? 'bg-background text-foreground font-bold shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Agenda ({monthEvents.length})
          </button>
        </div>
      </div>

      {/* Legend & Help Banner — matches Gregorian grid */}
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

      {/* Main Grid View */}
      {viewMode === 'month' ? (
        <div className="border border-border rounded-xl bg-card shadow-xs overflow-hidden">
          {/* Weekday Column Headers */}
          <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center">
            {NEPALI_DAYS_OF_WEEK.map((day) => (
              <div
                key={day.index}
                className={`py-2 px-1 text-xs font-bold border-r border-border last:border-r-0 ${
                  day.index === 6
                    ? 'text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20'
                    : 'text-muted-foreground'
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <span>{day.short}</span>
                  <span className="text-[10px] font-normal opacity-75">({day.nepaliShort})</span>
                </div>
              </div>
            ))}
          </div>

          {/* Days Cells */}
          <div className="grid grid-cols-7">
            {/* Empty padding slots before 1st of month */}
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="min-h-[90px] sm:min-h-[110px] p-1.5 border-b border-r border-border bg-muted/15 last:border-r-0"
              />
            ))}

            {/* Month Day Cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const pad = (n: number) => String(n).padStart(2, '0');
              const bsStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(dayNum)}`;
              const adStr = bsToAd(bsStr);

              const isSaturday = (startDayOfWeek + i) % 7 === 6;
              const isToday = adStr === todayAdStr;
              const isOutOfSession = !isAdDateWithinSession(adStr, minDate, maxDate);
              const dayEvents = eventsByDay.get(dayNum) || [];

              // Secondary AD label (e.g. "Sep 17")
              const [ay, am, ad] = adStr.split('-').map(Number);
              const adDateObj = new Date(ay, am - 1, ad);
              const adLabel = adDateObj.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              });

              return (
                <div
                  key={dayNum}
                  onClick={() => {
                    if (isOutOfSession || !canManage) return;
                    onSelectDate(adStr);
                  }}
                  className={`min-h-[95px] sm:min-h-[115px] p-1.5 border-b border-r border-border transition-colors flex flex-col justify-between group ${
                    isOutOfSession
                      ? 'bg-muted/30 opacity-30 cursor-not-allowed'
                      : canManage
                      ? 'hover:bg-muted/30 cursor-pointer'
                      : ''
                  } ${
                    isSaturday
                      ? 'bg-rose-50/20 dark:bg-rose-950/10'
                      : ''
                  } ${
                    isToday
                      ? 'ring-2 ring-primary ring-inset bg-primary/5'
                      : ''
                  }`}
                >
                  {/* Cell Header: BS Day number + AD subtitle */}
                  <div className="flex items-start justify-between">
                    <span
                      className={`text-sm sm:text-base font-bold leading-none ${
                        isSaturday
                          ? 'text-rose-600 dark:text-rose-400'
                          : isToday
                          ? 'text-primary'
                          : 'text-foreground'
                      }`}
                    >
                      {dayNum}
                    </span>

                    <span
                      className="text-[10px] text-muted-foreground font-medium select-none"
                      title={`${bsStr} BS / ${adStr} AD`}
                    >
                      {adLabel}
                    </span>
                  </div>

                  {/* Event Pills List */}
                  <div className="flex-1 space-y-1 mt-1 overflow-hidden">
                    {dayEvents.slice(0, 3).map((ev) => {
                      const colorClass = getCategoryBlockClass(ev.event_type, ev.is_holiday);
                      return (
                        <div
                          key={ev.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectEvent(ev);
                          }}
                          className={`${colorClass} px-1.5 py-0.5 rounded text-[11px] font-medium truncate flex items-center gap-1 shadow-2xs hover:opacity-90 cursor-pointer`}
                          title={`${ev.title} (${ev.event_type}${ev.is_holiday ? ' - School Closed' : ''})`}
                        >
                          {ev.is_holiday ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0 ring-1 ring-white" />
                          ) : (
                            <span className="w-1 h-1 rounded-full bg-current opacity-70 shrink-0" />
                          )}
                          <span className="truncate">{ev.title}</span>
                        </div>
                      );
                    })}

                    {dayEvents.length > 3 && (
                      <span className="text-[10px] text-muted-foreground font-semibold block px-1">
                        +{dayEvents.length - 3} more
                      </span>
                    )}
                  </div>

                  {/* Saturday Tag or Today Tag */}
                  {isToday && (
                    <div className="mt-1">
                      <span className="text-[9px] px-1 py-0.2 rounded bg-primary text-primary-foreground font-semibold">
                        Today
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Agenda Mode */
        <div className="border border-border rounded-xl bg-card p-4 shadow-xs space-y-3">
          <h4 className="text-sm font-bold text-foreground">
            Schedule for {currentMonthInfo.nameNp} ({currentMonthInfo.nameEn}) {viewYear} BS
          </h4>
          {monthEvents.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              No events scheduled in this Bikram Sambat month.
            </p>
          ) : (
            <div className="space-y-2">
              {monthEvents.map((ev) => {
                const colorClass = getCategoryBlockClass(ev.event_type, ev.is_holiday);
                return (
                  <div
                    key={ev.id}
                    onClick={() => onSelectEvent(ev)}
                    className="p-3 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors flex items-center justify-between gap-3 cursor-pointer shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-3 h-3 rounded-full shrink-0 ${getCategoryDotColor(
                          ev.event_type,
                          ev.is_holiday
                        )}`}
                      />
                      <div className="min-w-0">
                        <span className="text-sm font-semibold text-foreground block truncate">
                          {ev.title}
                        </span>
                        <span className="text-xs text-muted-foreground block truncate">
                          {formatDualDateRange(ev.start_date, ev.end_date, 'BS')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-semibold ${colorClass}`}
                      >
                        {ev.event_type}
                      </span>
                      {ev.is_holiday && (
                        <Badge variant="destructive" className="text-[10px] uppercase">
                          Closed
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
