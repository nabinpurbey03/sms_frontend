import React, { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CalendarDays,
  Calendar,
  ArrowRight,
  Clock,
  Sparkles,
  GraduationCap,
  Sun,
  CalendarCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCalendarEvents } from '@/features/school-settings/hooks';
import { useCalendarPreferenceStore } from '@/stores/calendarPreferenceStore';
import {
  formatDualDateRange,
  getNepaliDateFromAd,
} from '@/features/school-settings/utils/nepaliDate';
import type { CalendarEventType } from '@/features/school-settings/types';

interface DashboardUpcomingCalendarProps {
  tenantId: string;
  academicYearId?: string | null;
}

interface EventTypeMeta {
  label: string;
  icon: React.ElementType;
  badgeStyle: string;
  topAccent: string;
  dateBadgeBg: string;
  dateBadgeText: string;
}

const EVENT_TYPE_CONFIG: Record<CalendarEventType, EventTypeMeta> = {
  HOLIDAY: {
    label: 'Holiday',
    icon: Sparkles,
    badgeStyle: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-300/60 dark:border-rose-800/60',
    topAccent: 'bg-rose-500',
    dateBadgeBg: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
    dateBadgeText: 'text-rose-600 dark:text-rose-400',
  },
  EXAM: {
    label: 'Exam',
    icon: GraduationCap,
    badgeStyle: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300/60 dark:border-purple-800/60',
    topAccent: 'bg-purple-500',
    dateBadgeBg: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
    dateBadgeText: 'text-purple-600 dark:text-purple-400',
  },
  VACATION: {
    label: 'Vacation',
    icon: Sun,
    badgeStyle: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300/60 dark:border-amber-800/60',
    topAccent: 'bg-amber-500',
    dateBadgeBg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    dateBadgeText: 'text-amber-600 dark:text-amber-400',
  },
  EVENT: {
    label: 'Event',
    icon: CalendarCheck,
    badgeStyle: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300/60 dark:border-emerald-800/60',
    topAccent: 'bg-emerald-500',
    dateBadgeBg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    dateBadgeText: 'text-emerald-600 dark:text-emerald-400',
  },
  OTHER: {
    label: 'Other',
    icon: CalendarDays,
    badgeStyle: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-300/60 dark:border-blue-800/60',
    topAccent: 'bg-blue-500',
    dateBadgeBg: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
    dateBadgeText: 'text-blue-600 dark:text-blue-400',
  },
};

export const DashboardUpcomingCalendar: React.FC<DashboardUpcomingCalendarProps> = ({
  tenantId,
  academicYearId,
}) => {
  const { calendarSystem } = useCalendarPreferenceStore();
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const { data: events = [], isLoading } = useCalendarEvents(
    tenantId,
    academicYearId ? { academic_year_id: academicYearId } : undefined
  );

  // Filter for upcoming events (start_date >= today OR end_date >= today)
  // Sort ascending by start_date, then take top 4
  const upcomingEvents = useMemo(() => {
    return events
      .filter((e) => e.end_date >= todayStr || e.start_date >= todayStr)
      .sort((a, b) => a.start_date.localeCompare(b.start_date))
      .slice(0, 4);
  }, [events, todayStr]);

  const calculateDaysDuration = (start: string, end: string) => {
    try {
      const s = new Date(start);
      const e = new Date(end);
      const diffTime = Math.abs(e.getTime() - s.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays === 1 ? '1 day' : `${diffDays} days`;
    } catch {
      return null;
    }
  };

  const getRelativeTimeInfo = (startDateStr: string, endDateStr: string) => {
    if (todayStr >= startDateStr && todayStr <= endDateStr) {
      return {
        type: 'ongoing' as const,
        label: 'Ongoing',
        className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      };
    }
    const today = new Date(todayStr);
    const start = new Date(startDateStr);
    const diffTime = start.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return {
        type: 'tomorrow' as const,
        label: 'Tomorrow',
        className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
      };
    }
    if (diffDays > 1 && diffDays <= 7) {
      return {
        type: 'soon' as const,
        label: `In ${diffDays}d`,
        className: 'bg-primary/10 text-primary border-primary/25',
      };
    }
    if (diffDays > 7) {
      return {
        type: 'later' as const,
        label: `In ${diffDays}d`,
        className: 'bg-muted/70 text-muted-foreground border-border/60',
      };
    }
    return null;
  };

  const getDateTileInfo = (startDateStr: string, endDateStr: string) => {
    try {
      const isMultiDay = startDateStr !== endDateStr;
      if (calendarSystem === 'BS') {
        const npStart = getNepaliDateFromAd(startDateStr);
        const npEnd = isMultiDay ? getNepaliDateFromAd(endDateStr) : null;
        if (npStart) {
          const month = npStart.monthNameEn.slice(0, 3).toUpperCase();
          const day =
            isMultiDay && npEnd && npStart.month === npEnd.month
              ? `${npStart.date}–${npEnd.date}`
              : `${npStart.date}`;
          return { month, day };
        }
      }

      const sDate = new Date(startDateStr);
      const eDate = new Date(endDateStr);
      const month = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(sDate).toUpperCase();
      const startDay = sDate.getDate();
      const endDay = eDate.getDate();
      const day =
        isMultiDay && sDate.getMonth() === eDate.getMonth()
          ? `${startDay}–${endDay}`
          : `${startDay}`;
      return { month, day };
    } catch {
      return { month: 'DATE', day: '--' };
    }
  };

  return (
    <Card className="rounded-2xl border-border/70 shadow-xs overflow-hidden">
      <CardHeader className="p-5 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-2xs">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-foreground">
                  Upcoming Academic Events & Holidays
                </CardTitle>
                {upcomingEvents.length > 0 && (
                  <Badge variant="secondary" className="text-[11px] px-2 py-0 h-5 font-semibold">
                    {upcomingEvents.length} Upcoming
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs mt-0.5">
                Key dates, holidays, and school milestones scheduled for this session.
              </CardDescription>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-8 text-xs gap-1.5 font-semibold self-start sm:self-auto shrink-0 border-border/80 hover:bg-primary/5 hover:text-primary group"
          >
            <Link to="/academic-calendar">
              <span>View Full Calendar</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-2">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 py-1">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-card border border-border/60 space-y-3.5 animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <div className="h-5 w-16 bg-muted rounded-md" />
                  <div className="h-4 w-12 bg-muted rounded-full" />
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 bg-muted rounded-xl shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-4/5 bg-muted rounded" />
                    <div className="h-3 w-full bg-muted rounded" />
                  </div>
                </div>
                <div className="pt-2.5 border-t border-border/40 flex justify-between items-center">
                  <div className="h-3 w-28 bg-muted rounded" />
                  <div className="h-3 w-10 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : upcomingEvents.length === 0 ? (
          <div className="py-10 text-center border rounded-2xl border-dashed border-border/70 bg-muted/20 flex flex-col items-center justify-center">
            <div className="h-12 w-12 rounded-2xl bg-muted/50 border border-border/60 flex items-center justify-center mb-2.5 text-muted-foreground">
              <Calendar className="w-6 h-6 opacity-60" />
            </div>
            <h4 className="text-sm font-semibold text-foreground">No upcoming events scheduled</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto px-4">
              There are no upcoming holidays, examinations, or events recorded for this session.
            </p>
            <Button variant="outline" size="sm" asChild className="mt-3.5 text-xs h-8 gap-1.5 font-medium rounded-lg">
              <Link to="/academic-calendar">
                <CalendarDays className="h-3.5 w-3.5 text-primary" />
                <span>Explore Academic Calendar</span>
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {upcomingEvents.map((event) => {
              const meta =
                event.is_holiday || event.event_type === 'HOLIDAY'
                  ? EVENT_TYPE_CONFIG.HOLIDAY
                  : EVENT_TYPE_CONFIG[event.event_type] || EVENT_TYPE_CONFIG.OTHER;
              const IconComponent = meta.icon;
              const duration = calculateDaysDuration(event.start_date, event.end_date);
              const relative = getRelativeTimeInfo(event.start_date, event.end_date);
              const dateTile = getDateTileInfo(event.start_date, event.end_date);

              return (
                <div
                  key={event.id}
                  className="group relative p-4 rounded-xl border border-border/70 bg-card hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between overflow-hidden"
                >
                  {/* Subtle Top Ribbon Accent */}
                  <div className={cn('absolute inset-x-0 top-0 h-1', meta.topAccent)} />

                  <div>
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[11px] px-2 py-0.5 font-semibold gap-1 items-center',
                            meta.badgeStyle
                          )}
                        >
                          <IconComponent className="h-3 w-3 shrink-0" />
                          <span>{meta.label}</span>
                        </Badge>
                        {event.is_holiday && (
                          <Badge
                            variant="destructive"
                            className="text-[9px] px-1.5 py-0 h-4 uppercase tracking-wider font-bold bg-rose-600 hover:bg-rose-600 text-white"
                          >
                            Off
                          </Badge>
                        )}
                      </div>

                      {relative && (
                        <span
                          className={cn(
                            'inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                            relative.className
                          )}
                        >
                          {relative.type === 'ongoing' && (
                            <span className="relative flex h-1.5 w-1.5 mr-1">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                            </span>
                          )}
                          {relative.label}
                        </span>
                      )}
                    </div>

                    {/* Middle: Mini Calendar Date Tile + Event Title */}
                    <div className="flex items-start gap-3 mt-3">
                      {/* Date Badge Tile */}
                      <div className="shrink-0 flex flex-col items-center justify-center w-12 rounded-lg bg-muted/60 border border-border/80 overflow-hidden shadow-2xs group-hover:border-primary/40 group-hover:bg-primary/5 transition-colors">
                        <div className="w-full text-[9px] font-bold uppercase tracking-wider text-center py-0.5 bg-muted group-hover:bg-primary/10 text-muted-foreground group-hover:text-primary transition-colors">
                          {dateTile.month}
                        </div>
                        <div className="text-sm font-extrabold tracking-tight text-foreground py-1 px-1 text-center leading-none">
                          {dateTile.day}
                        </div>
                      </div>

                      {/* Title & Description */}
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                          {event.title}
                        </h4>
                        {event.description ? (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                            {event.description}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground/60 italic mt-0.5">
                            No additional details
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Date & Duration */}
                  <div className="mt-3.5 pt-2.5 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground gap-2">
                    <div className="flex items-center gap-1.5 min-w-0 font-medium text-foreground/80">
                      <Clock className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                      <span className="truncate text-[11px]">
                        {formatDualDateRange(event.start_date, event.end_date, calendarSystem)}
                      </span>
                    </div>
                    {duration && (
                      <span className="text-[10px] font-medium bg-muted/80 text-muted-foreground px-2 py-0.5 rounded-full shrink-0 border border-border/40">
                        {duration}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
