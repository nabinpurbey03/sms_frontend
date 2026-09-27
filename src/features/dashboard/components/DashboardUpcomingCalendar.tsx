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
} from 'lucide-react';
import { useCalendarEvents } from '@/features/school-settings/hooks';
import { useCalendarPreferenceStore } from '@/stores/calendarPreferenceStore';
import { formatDualDateRange } from '@/features/school-settings/utils/nepaliDate';
import type { CalendarEventType } from '@/features/school-settings/types';

interface DashboardUpcomingCalendarProps {
  tenantId: string;
  academicYearId?: string | null;
}

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

  const getEventBadgeColor = (type: CalendarEventType, isHoliday: boolean) => {
    if (isHoliday || type === 'HOLIDAY') {
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900';
    }
    switch (type) {
      case 'EXAM':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900';
      case 'VACATION':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900';
      case 'EVENT':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900';
      case 'OTHER':
      default:
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900';
    }
  };

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

  const getRelativeTimeLabel = (startDateStr: string, endDateStr: string) => {
    if (todayStr >= startDateStr && todayStr <= endDateStr) {
      return { label: 'Ongoing', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-300 dark:border-emerald-800' };
    }
    const today = new Date(todayStr);
    const start = new Date(startDateStr);
    const diffTime = start.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      return { label: 'Tomorrow', color: 'bg-amber-500/10 text-amber-600 border-amber-300 dark:border-amber-800' };
    }
    if (diffDays > 1 && diffDays <= 7) {
      return { label: `In ${diffDays} days`, color: 'bg-blue-500/10 text-blue-600 border-blue-300 dark:border-blue-800' };
    }
    if (diffDays > 7) {
      return { label: `In ${diffDays} days`, color: 'bg-muted text-muted-foreground border-border' };
    }
    return null;
  };

  return (
    <Card className="rounded-2xl border-border/70 shadow-xs overflow-hidden">
      <CardHeader className="p-5 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
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
            className="h-8 text-xs gap-1.5 font-semibold self-start sm:self-auto shrink-0 border-border/80 hover:bg-primary/5 hover:text-primary"
          >
            <Link to="/academic-calendar">
              <span>View Full Calendar</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-2">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 py-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-32 rounded-xl bg-muted/40 animate-pulse border border-border/40"
              />
            ))}
          </div>
        ) : upcomingEvents.length === 0 ? (
          <div className="py-8 text-center border rounded-xl border-dashed border-border/70 bg-muted/20">
            <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <h4 className="text-sm font-semibold text-foreground">No upcoming events scheduled</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              There are no upcoming holidays, examinations, or events recorded for this session.
            </p>
            <Button variant="outline" size="sm" asChild className="mt-3 text-xs h-8">
              <Link to="/academic-calendar">Explore Academic Calendar</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {upcomingEvents.map((event) => {
              const duration = calculateDaysDuration(event.start_date, event.end_date);
              const relative = getRelativeTimeLabel(event.start_date, event.end_date);

              return (
                <div
                  key={event.id}
                  className="p-4 rounded-xl border border-border/70 bg-card hover:border-primary/50 hover:shadow-xs transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`text-[11px] px-2 py-0.5 font-semibold ${getEventBadgeColor(
                            event.event_type,
                            event.is_holiday
                          )}`}
                        >
                          {event.event_type}
                        </Badge>
                        {event.is_holiday && (
                          <Badge
                            variant="destructive"
                            className="text-[9px] px-1.5 py-0 h-4 uppercase tracking-wider font-bold"
                          >
                            Off
                          </Badge>
                        )}
                      </div>
                      {relative && (
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${relative.color}`}
                        >
                          {relative.label}
                        </span>
                      )}
                    </div>

                    {/* Title & Description */}
                    <h4 className="font-bold text-sm text-foreground mt-2.5 line-clamp-1">
                      {event.title}
                    </h4>

                    {event.description ? (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {event.description}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground/60 italic mt-1">
                        No additional details
                      </p>
                    )}
                  </div>

                  {/* Bottom Date & Duration */}
                  <div className="mt-4 pt-2.5 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground gap-2">
                    <div className="flex items-center gap-1.5 min-w-0 font-medium text-foreground">
                      <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate text-[11px]">
                        {formatDualDateRange(event.start_date, event.end_date, calendarSystem)}
                      </span>
                    </div>
                    {duration && (
                      <span className="text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded shrink-0">
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
